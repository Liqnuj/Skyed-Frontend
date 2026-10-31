import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export const FONT_SIZES = ['14px', '16px', '19px', '22px'];
const DEFAULT_SIZE = FONT_SIZES[1];

export type Daltonismo = 'ninguno' | 'protanopia' | 'deuteranopia' | 'tritanopia';
export const VELOCIDADES_LECTOR = [0.8, 1, 1.25];

interface AccessibilityState {
  darkMode: boolean;
  fontSize: string;
  dyslexia: boolean;
  /** Más contraste en toda la página, enlaces subrayados y foco bien visible. */
  contraste: boolean;
  /** Corrección de color para el tipo de daltonismo elegido. */
  daltonismo: Daltonismo;
  /** Lector en voz alta: lee lo que se toca o se enfoca con el teclado. */
  lector: boolean;
  velocidadLector: number;
}

interface AccessibilityContextValue extends AccessibilityState {
  toggleDark: () => void;
  setFontSize: (s: string) => void;
  setDyslexia: (v: boolean) => void;
  setContraste: (v: boolean) => void;
  setDaltonismo: (d: Daltonismo) => void;
  setLector: (v: boolean) => void;
  setVelocidadLector: (v: number) => void;
  /** false si el navegador no trae voz (Web Speech API). */
  lectorDisponible: boolean;
  leerTexto: (texto: string) => void;
  leerPagina: () => void;
  detenerLectura: () => void;
  reset: () => void;
}

const DEFAULT_STATE: AccessibilityState = {
  darkMode: false,
  fontSize: DEFAULT_SIZE,
  dyslexia: false,
  contraste: false,
  daltonismo: 'ninguno',
  lector: false,
  velocidadLector: 1,
};

const STORAGE_KEY = 'skyed_accessibility';

/*
 * Corrección de color ("daltonize"): lo que la persona no distingue se pasa
 * a los colores que sí percibe. Matrices calculadas como I + E·(I − S), con S
 * la simulación de cada tipo de daltonismo y E el desplazamiento del error.
 */
const MATRICES_DALTONISMO: Record<Exclude<Daltonismo, 'ninguno'>, string> = {
  protanopia: '1 0 0 0 0  -0.255 1.255 0 0 0  0.303 -0.545 1.242 0 0  0 0 0 1 0',
  deuteranopia: '1 0 0 0 0  -0.438 1.438 0 0 0  0.262 -0.563 1.3 0 0  0 0 0 1 0',
  tritanopia: '1.05 -0.382 0.332 0 0  0 1.234 -0.234 0 0  0 0 1 0 0  0 0 0 1 0',
};

const hayVoz = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

/** Voz en español (prefiere Colombia, luego Latinoamérica, luego cualquiera). */
function vozEspanol(): SpeechSynthesisVoice | undefined {
  const voces = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('es'));
  return (
    voces.find((v) => v.lang === 'es-CO') ??
    voces.find((v) => /es-(MX|US|419)/i.test(v.lang)) ??
    voces[0]
  );
}

/** Corta el texto en frases cortas: Chrome deja de hablar con textos muy largos. */
function enFrases(texto: string): string[] {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  const frases = limpio.match(/[^.!?¡¿]+[.!?]*/g) ?? [limpio];
  const partes: string[] = [];
  let actual = '';
  for (const f of frases) {
    if ((actual + f).length > 220 && actual) {
      partes.push(actual.trim());
      actual = '';
    }
    actual += f + ' ';
  }
  if (actual.trim()) partes.push(actual.trim());
  return partes;
}

/** Texto que se lee de un elemento (aria-label, alt o su contenido). */
function textoDe(el: Element): string {
  const etiqueta = el.getAttribute('aria-label') || el.getAttribute('title') || (el as HTMLImageElement).alt;
  const texto = (el as HTMLElement).innerText?.trim();
  return (texto || etiqueta || '').slice(0, 600);
}

const LEIBLES = 'h1,h2,h3,h4,h5,h6,p,li,a,button,label,td,th,figcaption,blockquote,input,select,textarea,[role="button"],img[alt]';

const AccessibilityContext = createContext<AccessibilityContextValue | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AccessibilityState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // El antiguo "color de acento" (accentOverride) ya no existe y se ignora.
      const { accentOverride: _ignorado, ...guardado } = raw ? JSON.parse(raw) : {};
      return { ...DEFAULT_STATE, ...guardado };
    } catch {
      return DEFAULT_STATE;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Contraste y daltonismo se aplican a toda la página (en <html>), así
  // funcionan igual en Principal, Social, Deportivo y los paneles admin.
  useEffect(() => {
    const raiz = document.documentElement;
    const filtros: string[] = [];
    if (state.daltonismo !== 'ninguno') filtros.push(`url(#ax-${state.daltonismo})`);
    if (state.contraste) filtros.push('contrast(1.35) saturate(1.1)');
    raiz.style.filter = filtros.join(' ');
    raiz.classList.toggle('ax-contraste', state.contraste);
    raiz.classList.toggle('ax-lector', state.lector);
  }, [state.daltonismo, state.contraste, state.lector]);

  const detenerLectura = useCallback(() => {
    if (hayVoz()) window.speechSynthesis.cancel();
  }, []);

  const leerTexto = useCallback((texto: string) => {
    if (!hayVoz() || !texto.trim()) return;
    window.speechSynthesis.cancel();
    const voz = vozEspanol();
    for (const frase of enFrases(texto)) {
      const u = new SpeechSynthesisUtterance(frase);
      u.lang = voz?.lang ?? 'es-CO';
      if (voz) u.voice = voz;
      u.rate = state.velocidadLector;
      window.speechSynthesis.speak(u);
    }
  }, [state.velocidadLector]);

  const leerPagina = useCallback(() => {
    const zona = document.querySelector('main, .admin-main') ?? document.body;
    leerTexto((zona as HTMLElement).innerText);
  }, [leerTexto]);

  // Lector activado: lee lo que se toca con el mouse o se enfoca con Tab.
  useEffect(() => {
    if (!state.lector || !hayVoz()) return;
    const alTocar = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest(LEIBLES);
      if (el) leerTexto(textoDe(el));
    };
    const alEnfocar = (e: FocusEvent) => {
      const el = e.target as Element | null;
      if (el && el.matches?.(LEIBLES)) leerTexto(textoDe(el));
    };
    document.addEventListener('click', alTocar, true);
    document.addEventListener('focusin', alEnfocar);
    return () => {
      document.removeEventListener('click', alTocar, true);
      document.removeEventListener('focusin', alEnfocar);
      window.speechSynthesis.cancel();
    };
  }, [state.lector, leerTexto]);

  const value = useMemo<AccessibilityContextValue>(() => ({
    ...state,
    toggleDark: () => setState((s) => ({ ...s, darkMode: !s.darkMode })),
    setFontSize: (fontSize) => setState((s) => ({ ...s, fontSize })),
    setDyslexia: (dyslexia) => setState((s) => ({ ...s, dyslexia })),
    setContraste: (contraste) => setState((s) => ({ ...s, contraste })),
    setDaltonismo: (daltonismo) => setState((s) => ({ ...s, daltonismo })),
    setLector: (lector) => setState((s) => ({ ...s, lector })),
    setVelocidadLector: (velocidadLector) => setState((s) => ({ ...s, velocidadLector })),
    lectorDisponible: hayVoz(),
    leerTexto,
    leerPagina,
    detenerLectura,
    reset: () => {
      detenerLectura();
      setState((s) => ({ ...DEFAULT_STATE, darkMode: true, velocidadLector: s.velocidadLector }));
    },
  }), [state, leerTexto, leerPagina, detenerLectura]);

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
      {/* Filtros de corrección de color que usa el modo daltonismo */}
      <svg aria-hidden="true" focusable="false" style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          {Object.entries(MATRICES_DALTONISMO).map(([tipo, valores]) => (
            <filter key={tipo} id={`ax-${tipo}`} colorInterpolationFilters="sRGB">
              <feColorMatrix type="matrix" values={valores} />
            </filter>
          ))}
        </defs>
      </svg>
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error('useAccessibility debe usarse dentro de <AccessibilityProvider>');
  return ctx;
}
