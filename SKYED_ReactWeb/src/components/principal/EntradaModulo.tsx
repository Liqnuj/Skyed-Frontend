import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { heroSlides } from '../../data/socialData';
import { sportHeroSlides } from '../../data/sportHomeData';
import '../../styles/principal/entradaModulo.css';

/**
 * Pantalla de entrada a SKYED Social o SKYED Deportivo desde la página principal.
 *
 * - Navega dentro de la app (sin recargar): antes los botones eran <a href> y
 *   recargaban todo, por eso se veía la pantalla en blanco.
 * - Los clics repetidos se ignoran mientras se entra.
 * - Para que no haya saltos: la página nueva se monta DETRÁS de la animación
 *   apenas esta tapa la pantalla; mientras tanto se precargan la foto del
 *   carrusel y las imágenes visibles, y solo cuando todo está pintado la
 *   animación se desvanece. No se bloquea el scroll (quitar la barra de
 *   desplazamiento corría la página unos píxeles).
 */
export type ModuloEntrada = 'social' | 'deportivo';

type Etapa = 'entrando' | 'saliendo';

interface EntradaCtx {
  /** Inicia la entrada al módulo. Devuelve false si ya hay una entrada en curso. */
  entrar: (modulo: ModuloEntrada) => boolean;
  /** Módulo al que se está entrando (o null). */
  entrando: ModuloEntrada | null;
}

const Contexto = createContext<EntradaCtx>({ entrar: () => false, entrando: null });

const RUTA: Record<ModuloEntrada, string> = { social: '/social', deportivo: '/deportivo' };
const LOGO: Record<ModuloEntrada, string> = {
  social: '/assets/social/logo_social.png',
  deportivo: '/assets/deportivo/logo_deportivo.png',
};
/** Imagen grande que la página destino muestra primero (se precarga). */
const PRIMERA_FOTO: Record<ModuloEntrada, string | undefined> = {
  social: heroSlides[0]?.image,
  deportivo: sportHeroSlides[0],
};

/** Hasta que la pantalla tapa todo (coincide con la aparición en el CSS). */
const TAPA_MS = 380;
/** Tiempo mínimo total con la animación (para que se vea y no parpadee). */
const MINIMO_MS = 1700;
/** Máximo que se espera a las imágenes: con internet lento se entra igual. */
const MAXIMO_ESPERA_MS = 3500;
/** Duración del desvanecido final (coincide con el CSS). */
const SALIDA_MS = 500;

const espera = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
/**
 * Espera dos cuadros de pintado (la página nueva ya se ve debajo). Con tope de
 * tiempo: si la pestaña queda en segundo plano el navegador pausa
 * requestAnimationFrame y la animación no debe quedarse pegada.
 */
const dosCuadros = () => new Promise<void>((r) => {
  const tope = window.setTimeout(r, 150);
  requestAnimationFrame(() => requestAnimationFrame(() => { window.clearTimeout(tope); r(); }));
});

/** Descarga y decodifica una imagen (si falla, no detiene la entrada). */
function precargar(src: string | undefined) {
  if (!src) return Promise.resolve();
  return new Promise<void>((r) => {
    const img = new Image();
    img.onload = img.onerror = () => r();
    img.src = src;
    img.decode?.().then(() => r(), () => r());
  });
}

/** Espera a que terminen de cargar las imágenes que ya se ven en pantalla. */
function imagenesVisibles() {
  const alto = window.innerHeight;
  const pendientes = Array.from(document.images).filter((img) => {
    if (img.complete) return false;
    const r = img.getBoundingClientRect();
    return r.bottom > 0 && r.top < alto && r.width > 0;
  });
  return Promise.all(pendientes.map((img) => new Promise<void>((r) => {
    img.addEventListener('load', () => r(), { once: true });
    img.addEventListener('error', () => r(), { once: true });
  })));
}

export function EntradaModuloProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [estado, setEstado] = useState<{ modulo: ModuloEntrada; etapa: Etapa } | null>(null);
  const enCurso = useRef(false);
  const vivo = useRef(true);

  useEffect(() => {
    vivo.current = true;
    return () => { vivo.current = false; };
  }, []);

  const entrar = useCallback((modulo: ModuloEntrada) => {
    if (enCurso.current) return false;
    enCurso.current = true;
    setEstado({ modulo, etapa: 'entrando' });

    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const inicio = performance.now();
    // Empieza a bajar las imágenes desde ya, en paralelo con la animación.
    const fotos = Promise.all([precargar(PRIMERA_FOTO[modulo]), precargar(LOGO[modulo])]);

    (async () => {
      // 1) Cuando la pantalla ya tapa todo, se monta la página nueva debajo.
      await espera(TAPA_MS);
      if (!vivo.current) return;
      navigate(RUTA[modulo]);
      await dosCuadros();

      // 2) Se espera a las fotos y a lo visible, con un tope por si la red es lenta.
      await Promise.race([
        Promise.all([fotos, imagenesVisibles()]),
        espera(MAXIMO_ESPERA_MS),
      ]);
      const falta = (reducido ? 600 : MINIMO_MS) - (performance.now() - inicio);
      if (falta > 0) await espera(falta);
      await dosCuadros();
      if (!vivo.current) return;

      // 3) Desvanecido suave y listo.
      setEstado({ modulo, etapa: 'saliendo' });
      await espera(SALIDA_MS);
      if (!vivo.current) return;
      setEstado(null);
      enCurso.current = false;
    })();
    return true;
  }, [navigate]);

  return (
    <Contexto.Provider value={{ entrar, entrando: estado?.modulo ?? null }}>
      {children}
      {estado && createPortal(<PantallaEntrada modulo={estado.modulo} etapa={estado.etapa} />, document.body)}
    </Contexto.Provider>
  );
}

export function useEntradaModulo() {
  return useContext(Contexto);
}

/**
 * Props para un enlace de entrada: conserva el href (clic central / abrir en
 * otra pestaña siguen funcionando) y en el clic normal usa la animación.
 */
export function useEnlaceEntrada(modulo: ModuloEntrada) {
  const { entrar, entrando } = useEntradaModulo();
  return {
    href: RUTA[modulo],
    'aria-disabled': entrando ? true : undefined,
    'data-entrando': entrando === modulo ? 'true' : undefined,
    onClick: (e: MouseEvent<HTMLAnchorElement>) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      entrar(modulo);
    },
  };
}

const TEXTOS: Record<ModuloEntrada, { titulo: string; frase: string }> = {
  social: { titulo: 'SKYED Social', frase: 'Preparando tu celebración…' },
  deportivo: { titulo: 'SKYED Deportivo', frase: 'Preparando tu ruta…' },
};

function PantallaEntrada({ modulo, etapa }: { modulo: ModuloEntrada; etapa: Etapa }) {
  const t = TEXTOS[modulo];
  return (
    <div
      className={`ent ent--${modulo}${etapa === 'saliendo' ? ' ent--saliendo' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={`Entrando a ${t.titulo}. ${t.frase}`}
    >
      <div className="ent-fondo" aria-hidden="true">
        {Array.from({ length: 18 }, (_, i) => <span key={i} className="ent-chispa" style={{ ['--i' as string]: i }} />)}
      </div>

      {modulo === 'social' ? (
        <div className="ent-centro">
          <EscenaSocial logo={LOGO.social} />
          <p className="ent-titulo">{t.titulo}</p>
          <p className="ent-frase">{t.frase}</p>
          <div className="ent-barra" aria-hidden="true"><span /></div>
        </div>
      ) : (
        <div className="ent-centro">
          <span className="ent-logo ent-logo--dep" aria-hidden="true"><img src={LOGO.deportivo} alt="" /></span>
          <p className="ent-titulo">{t.titulo}</p>
          <EscenaDeportivo />
          <p className="ent-frase">{t.frase}</p>
        </div>
      )}
    </div>
  );
}

/** Social: el logo dentro de anillos dorados que laten, con confeti girando alrededor. */
function EscenaSocial({ logo }: { logo: string }) {
  return (
    <div className="ent-escena" aria-hidden="true">
      <span className="ent-anillo a" />
      <span className="ent-anillo b" />
      <span className="ent-anillo c" />
      <div className="ent-orbita">
        <i className="ti ti-confetti" />
        <i className="ti ti-sparkles" />
        <i className="ti ti-heart" />
        <i className="ti ti-music" />
      </div>
      <span className="ent-logo"><img src={logo} alt="" /></span>
    </div>
  );
}

/**
 * Deportivo: un perfil de ruta (altimetría) que se dibuja de la salida a la
 * meta mientras un ciclista lo recorre. El trazado y el ciclista usan el mismo
 * camino (offset-path), así que van siempre juntos.
 */
const RUTA_SVG = 'M8 92 C40 90 52 70 82 66 C110 62 122 84 150 80 C178 76 190 36 222 30 C246 26 262 50 284 46 C298 44 306 40 312 38';

function EscenaDeportivo() {
  return (
    <div className="ent-ruta" aria-hidden="true">
      <svg viewBox="0 0 320 110" width="320" height="110">
        <defs>
          <linearGradient id="ent-ruta-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7fe3ee" stopOpacity=".2" />
            <stop offset="1" stopColor="#7fe3ee" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className="ent-ruta-relleno" d={`${RUTA_SVG} L312 110 L8 110 Z`} fill="url(#ent-ruta-grad)" />
        <path className="ent-ruta-base" d={RUTA_SVG} />
        <path className="ent-ruta-trazo" d={RUTA_SVG} pathLength={100} />
      </svg>
      <span className="ent-ruta-salida"><i className="ti ti-map-pin" /></span>
      <span className="ent-ruta-meta"><i className="ti ti-flag-3" /></span>
      <span className="ent-ruta-ciclista" style={{ offsetPath: `path('${RUTA_SVG}')` }}>
        <i className="ti ti-bike" />
      </span>
    </div>
  );
}
