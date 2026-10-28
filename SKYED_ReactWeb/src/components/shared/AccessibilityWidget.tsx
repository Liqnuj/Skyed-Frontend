import { useEffect } from 'react';
import { useAccessibility, VELOCIDADES_LECTOR, type Daltonismo } from '../../context/AccessibilityContext';
import '../../styles/shared/accesibilidad.css';

export const FONT_SIZES = ['14px', '16px', '19px', '22px'];

const ETIQUETAS_TAMANO: Record<string, string> = {
  '14px': 'Pequeño',
  '16px': 'Normal',
  '19px': 'Grande',
  '22px': 'Muy grande',
};

const OPCIONES_DALTONISMO: { valor: Daltonismo; titulo: string; detalle: string }[] = [
  { valor: 'ninguno', titulo: 'Ninguno', detalle: 'Colores originales' },
  { valor: 'protanopia', titulo: 'Protanopía', detalle: 'Dificultad con el rojo' },
  { valor: 'deuteranopia', titulo: 'Deuteranopía', detalle: 'Dificultad con el verde' },
  { valor: 'tritanopia', titulo: 'Tritanopía', detalle: 'Dificultad con el azul' },
];

const NOMBRES_VELOCIDAD: Record<number, string> = { 0.8: 'Lenta', 1: 'Normal', 1.25: 'Rápida' };

type Props = {
  open: boolean;
  onToggleOpen: () => void;
  fontSize: string;
  onFontSize: (s: string) => void;
  dyslexia: boolean;
  onDyslexia: (v: boolean) => void;
  darkMode: boolean;
  onToggleDark: () => void;
  onReset: () => void;
};

/** Interruptor accesible (role="switch") con icono, título y explicación. */
function Interruptor({
  icono, titulo, detalle, activo, onCambio,
}: { icono: string; titulo: string; detalle: string; activo: boolean; onCambio: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      className={`ax-opcion ${activo ? 'is-on' : ''}`}
      onClick={() => onCambio(!activo)}
    >
      <span className="ax-opcion-icono" aria-hidden="true"><i className={`ti ${icono}`} /></span>
      <span className="ax-opcion-texto">
        <strong>{titulo}</strong>
        <small>{detalle}</small>
      </span>
      <span className="ax-switch" aria-hidden="true"><span /></span>
    </button>
  );
}

/**
 * Panel de accesibilidad (el mismo en Principal, Social, Deportivo y los
 * paneles admin). Tamaño de texto, modo oscuro, alto contraste, corrección
 * para daltonismo, letra para dislexia y lector en voz alta.
 * Las opciones nuevas se guardan en AccessibilityContext.
 */
export default function AccessibilityWidget({
  open, onToggleOpen, fontSize, onFontSize, dyslexia, onDyslexia, darkMode, onToggleDark, onReset,
}: Props) {
  const {
    contraste, setContraste,
    daltonismo, setDaltonismo,
    lector, setLector, lectorDisponible,
    velocidadLector, setVelocidadLector,
    leerPagina, detenerLectura,
  } = useAccessibility();

  // Escape cierra el panel.
  useEffect(() => {
    if (!open) return;
    const alPresionar = (e: KeyboardEvent) => { if (e.key === 'Escape') onToggleOpen(); };
    document.addEventListener('keydown', alPresionar);
    return () => document.removeEventListener('keydown', alPresionar);
  }, [open, onToggleOpen]);

  return (
    <>
      <button
        className="acc-toggle"
        title="Accesibilidad"
        aria-label="Opciones de accesibilidad"
        aria-expanded={open}
        aria-controls="ax-panel"
        onClick={onToggleOpen}
      >
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M12 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm0 6c1.1 0 2 .9 2 2v5h-1v5h-2v-5H9v-5c0-1.1.9-2 2-2z" />
        </svg>
      </button>

      <div
        id="ax-panel"
        className={`ax-panel ${open ? 'is-open' : ''} ${dyslexia ? 'ax-dislexia' : ''}`}
        role="dialog"
        aria-label="Opciones de accesibilidad"
        aria-hidden={!open}
        inert={!open}
      >
        <header className="ax-head">
          <span className="ax-head-icono" aria-hidden="true"><i className="ti ti-accessible" /></span>
          <div>
            <h2>Accesibilidad</h2>
            <p>Ajusta la página a como te sea más cómoda</p>
          </div>
          <button type="button" className="ax-cerrar" aria-label="Cerrar opciones de accesibilidad" onClick={onToggleOpen}>
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </header>

        <div className="ax-cuerpo">
          {/* Tamaño del texto */}
          <section className="ax-grupo" aria-labelledby="ax-t-tamano">
            <h3 id="ax-t-tamano"><i className="ti ti-text-size" aria-hidden="true" /> Tamaño del texto</h3>
            <div className="ax-tamanos" role="radiogroup" aria-labelledby="ax-t-tamano">
              {FONT_SIZES.map((s, i) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={fontSize === s}
                  aria-label={ETIQUETAS_TAMANO[s]}
                  title={ETIQUETAS_TAMANO[s]}
                  className={fontSize === s ? 'is-on' : ''}
                  onClick={() => onFontSize(s)}
                >
                  <span style={{ fontSize: `${13 + i * 4}px` }}>A</span>
                </button>
              ))}
            </div>
          </section>

          {/* Visión */}
          <section className="ax-grupo" aria-labelledby="ax-t-vision">
            <h3 id="ax-t-vision"><i className="ti ti-eye" aria-hidden="true" /> Visión</h3>
            <Interruptor
              icono="ti-moon"
              titulo="Modo oscuro"
              detalle="Fondo oscuro que descansa la vista"
              activo={darkMode}
              onCambio={() => onToggleDark()}
            />
            <Interruptor
              icono="ti-contrast"
              titulo="Alto contraste"
              detalle="Colores más marcados y enlaces subrayados"
              activo={contraste}
              onCambio={setContraste}
            />

            <p className="ax-subtitulo" id="ax-t-daltonismo">Daltonismo</p>
            <div className="ax-daltonismo" role="radiogroup" aria-labelledby="ax-t-daltonismo">
              {OPCIONES_DALTONISMO.map((o) => (
                <button
                  key={o.valor}
                  type="button"
                  role="radio"
                  aria-checked={daltonismo === o.valor}
                  className={`ax-dalt ax-dalt-${o.valor} ${daltonismo === o.valor ? 'is-on' : ''}`}
                  onClick={() => setDaltonismo(o.valor)}
                >
                  <span className="ax-dalt-muestra" aria-hidden="true" />
                  <strong>{o.titulo}</strong>
                  <small>{o.detalle}</small>
                </button>
              ))}
            </div>
          </section>

          {/* Lectura */}
          <section className="ax-grupo" aria-labelledby="ax-t-lectura">
            <h3 id="ax-t-lectura"><i className="ti ti-book-2" aria-hidden="true" /> Lectura</h3>
            <Interruptor
              icono="ti-letter-case"
              titulo="Letra para dislexia"
              detalle="Letra más clara y más espacio entre líneas"
              activo={dyslexia}
              onCambio={onDyslexia}
            />
            {lectorDisponible ? (
              <>
                <Interruptor
                  icono="ti-volume"
                  titulo="Lector en voz alta"
                  detalle="Lee lo que toques o enfoques con Tab"
                  activo={lector}
                  onCambio={setLector}
                />
                {lector && (
                  <div className="ax-lector">
                    <div className="ax-lector-botones">
                      <button type="button" className="ax-btn ax-btn-principal" onClick={leerPagina}>
                        <i className="ti ti-player-play" aria-hidden="true" /> Leer esta página
                      </button>
                      <button type="button" className="ax-btn" onClick={detenerLectura}>
                        <i className="ti ti-player-stop" aria-hidden="true" /> Detener
                      </button>
                    </div>
                    <div className="ax-velocidad" role="radiogroup" aria-label="Velocidad de lectura">
                      <span>Velocidad</span>
                      {VELOCIDADES_LECTOR.map((v) => (
                        <button
                          key={v}
                          type="button"
                          role="radio"
                          aria-checked={velocidadLector === v}
                          className={velocidadLector === v ? 'is-on' : ''}
                          onClick={() => setVelocidadLector(v)}
                        >
                          {NOMBRES_VELOCIDAD[v]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="ax-nota">Tu navegador no tiene lector de voz. Prueba con Chrome o Edge.</p>
            )}
          </section>
        </div>

        <footer className="ax-pie">
          <button type="button" className="ax-btn ax-reset" onClick={onReset}>
            <i className="ti ti-refresh" aria-hidden="true" /> Restablecer todo
          </button>
        </footer>
      </div>
    </>
  );
}
