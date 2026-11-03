import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

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
  /** Lector en voz alta: lee lo que se toca o se enfoca con el teclado (Tab). */
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

/**
 * Voz en español. Primero las instaladas en el equipo (responden al instante;
 * las "Online" dependen de internet y tardan en arrancar) y, entre ellas,
 * Colombia, luego Latinoamérica, luego cualquiera.
 */
function vozEspanol(): SpeechSynthesisVoice | undefined {
  const voces = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('es'));
  const locales = voces.filter((v) => v.localService);
  const lista = locales.length ? locales : voces;
  return (
    lista.find((v) => v.lang === 'es-CO') ??
    lista.find((v) => /es-(MX|US|419)/i.test(v.lang)) ??
    lista[0]
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

const MAX_TEXTO = 1200;
const CAMPOS = 'input,select,textarea';
const INTERACTIVOS = 'a,button,label,summary,[role="button"],[role="switch"],[role="radio"],[role="tab"],[role="menuitem"]';
const BLOQUES = 'h1,h2,h3,h4,h5,h6,p,li,td,th,dt,dd,figcaption,blockquote,caption';
/** Hasta dónde se sube buscando texto, para no terminar leyendo otra sección. */
const MAX_NIVELES = 4;
/** Un recuadro sin texto propio (una tarjeta) se lee entero solo si es corto. */
const MAX_APARTADO = 500;

/** Texto que se lee de un elemento. Nunca el valor de un campo: podría ser una contraseña. */
function textoDe(el: Element): string {
  if (el.matches(CAMPOS)) {
    const campo = el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    const nombre = el.getAttribute('aria-label') || campo.labels?.[0]?.innerText || el.getAttribute('placeholder') || 'Campo de texto';
    const opcion = el instanceof HTMLSelectElement ? el.selectedOptions[0]?.text : '';
    return `${nombre} ${opcion ?? ''}`.trim().slice(0, MAX_TEXTO);
  }
  const texto = (el as HTMLElement).innerText?.trim();
  const etiqueta = el.getAttribute('aria-label') || el.getAttribute('title') || (el as HTMLImageElement).alt;
  return (texto || etiqueta || '').slice(0, MAX_TEXTO);
}

const tieneTextoPropio = (el: Element) =>
  Array.from(el.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim());

/**
 * El elemento que se lee al tocar `origen`: el botón o enlace que lo contiene,
 * el párrafo o título completo, cualquier otro texto (div, span...) o, si se
 * tocó el recuadro de un apartado sin texto propio, ese apartado si es corto.
 */
function bloqueLeible(origen: EventTarget | null): Element | null {
  if (!(origen instanceof Element)) return null;

  const directo = origen.closest(`${CAMPOS},img[alt]`) ?? origen.closest(INTERACTIVOS);
  if (directo && textoDe(directo)) return directo;

  let n: Element | null = origen;
  for (let i = 0; n && n !== document.body && i < MAX_NIVELES; i++, n = n.parentElement) {
    if (tieneTextoPropio(n)) return n.closest(BLOQUES) ?? n;
  }

  const apartado = (origen as HTMLElement).innerText?.trim();
  return apartado && apartado.length <= MAX_APARTADO ? origen : null;
}

/** Marca un único elemento con la clase (quita la marca del anterior). */
function marcador(clase: string) {
  let actual: Element | null = null;
  return (el: Element | null) => {
    if (el === actual) return;
    actual?.classList.remove(clase);
    el?.classList.add(clase);
    actual = el;
  };
}

const marcarObjetivo = marcador('ax-objetivo');
const marcarLectura = marcador('ax-leyendo');

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

  // En refs para que cambiar la velocidad no reinicie la lectura en curso.
  const velocidad = useRef(state.velocidadLector);
  velocidad.current = state.velocidadLector;
  const voz = useRef<SpeechSynthesisVoice | undefined>(undefined);
  const lecturaActual = useRef(0);

  // Las voces cargan aparte: se dejan listas para no buscarlas en cada clic.
  useEffect(() => {
    if (!hayVoz()) return;
    const cargar = () => { voz.current = vozEspanol(); };
    cargar();
    window.speechSynthesis.addEventListener('voiceschanged', cargar);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', cargar);
  }, []);

  const detenerLectura = useCallback(() => {
    lecturaActual.current++;
    marcarLectura(null);
    if (hayVoz()) window.speechSynthesis.cancel();
  }, []);

  /** Lee el texto de inmediato, cortando lo que se estuviera leyendo. */
  const leerTexto = useCallback((texto: string, elemento: Element | null = null) => {
    if (!hayVoz() || !texto.trim()) return;
    const sintesis = window.speechSynthesis;
    const lectura = ++lecturaActual.current;
    sintesis.cancel();
    sintesis.resume(); // Chrome a veces queda en pausa y no vuelve a hablar
    marcarLectura(elemento);

    // Cancelar dispara el fin de la lectura anterior: solo la vigente quita la marca.
    const alTerminar = () => { if (lecturaActual.current === lectura) marcarLectura(null); };
    const frases = enFrases(texto);
    frases.forEach((frase, i) => {
      const u = new SpeechSynthesisUtterance(frase);
      u.lang = voz.current?.lang ?? 'es-CO';
      if (voz.current) u.voice = voz.current;
      u.rate = velocidad.current;
      if (i === frases.length - 1) { u.onend = alTerminar; u.onerror = alTerminar; }
      sintesis.speak(u);
    });
  }, []);

  const leerPagina = useCallback(() => {
    const zona = document.querySelector('main, .admin-main') ?? document.body;
    leerTexto((zona as HTMLElement).innerText);
  }, [leerTexto]);

  // Lector activado: al pasar el mouse se marca lo que se va a leer y al hacer
  // clic se lee. Con el teclado, lee lo que se enfoca con Tab.
  useEffect(() => {
    if (!state.lector || !hayVoz()) return;

    const alPasar = (e: MouseEvent) => {
      const el = bloqueLeible(e.target);
      marcarObjetivo(el && !el.closest('[data-no-leer]') ? el : null);
    };
    const alSalir = (e: MouseEvent) => { if (!e.relatedTarget) marcarObjetivo(null); };
    const alTocar = (e: MouseEvent) => {
      if ((e.target as Element | null)?.closest?.('[data-no-leer]')) return;
      // Si seleccionó un pedazo de texto, lee solo ese pedazo.
      const seleccion = window.getSelection()?.toString().trim();
      if (seleccion) { leerTexto(seleccion.slice(0, MAX_TEXTO)); return; }
      const el = bloqueLeible(e.target);
      if (el) leerTexto(textoDe(el), el);
    };
    // Solo teclado: con el mouse el foco llega justo antes del clic y la voz
    // arrancaría dos veces (de ahí venía la demora).
    const alEnfocar = (e: FocusEvent) => {
      const el = e.target;
      if (el instanceof Element && el.matches(':focus-visible') && !el.closest('[data-no-leer]')) {
        leerTexto(textoDe(el), el);
      }
    };

    document.addEventListener('mouseover', alPasar);
    document.addEventListener('mouseout', alSalir);
    document.addEventListener('click', alTocar, true);
    document.addEventListener('focusin', alEnfocar);
    return () => {
      document.removeEventListener('mouseover', alPasar);
      document.removeEventListener('mouseout', alSalir);
      document.removeEventListener('click', alTocar, true);
      document.removeEventListener('focusin', alEnfocar);
      marcarObjetivo(null);
      detenerLectura();
    };
  }, [state.lector, leerTexto, detenerLectura]);

  const value = useMemo<AccessibilityContextValue>(() => ({
    ...state,
    toggleDark: () => setState((s) => ({ ...s, darkMode: !s.darkMode })),
    setFontSize: (fontSize) => setState((s) => ({ ...s, fontSize })),
    setDyslexia: (dyslexia) => setState((s) => ({ ...s, dyslexia })),
    setContraste: (contraste) => setState((s) => ({ ...s, contraste })),
    setDaltonismo: (daltonismo) => setState((s) => ({ ...s, daltonismo })),
    setLector: (lector) => {
      setState((s) => ({ ...s, lector }));
      // Confirma con voz, y deja el motor de voz listo para el primer clic.
      if (lector) leerTexto('Lector activado. Haz clic en cualquier texto para escucharlo.');
    },
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
