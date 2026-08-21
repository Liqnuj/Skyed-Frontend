/* Paleta fija de swatches — idéntica en los 3 módulos originales.
   El color de MARCA de cada módulo (morado social #9c02ae, azul deportivo
   #2c9caf, morado principal #8827f0) es aparte: es el valor inicial de
   --accent pero no es uno de estos swatches seleccionables. */
export const ACCENT_COLORS = [
  { hex: '#c8432b', title: 'Rojo Lumara' },
  { hex: '#c9a84c', title: 'Dorado' },
  { hex: '#2e6da4', title: 'Azul' },
  { hex: '#2e7d32', title: 'Verde' },
  { hex: '#6a1b9a', title: 'Morado' },
  { hex: '#37474f', title: 'Gris oscuro' },
];

export const FONT_SIZES = ['14px', '16px', '19px', '22px'];

type Props = {
  open: boolean;
  onToggleOpen: () => void;
  fontSize: string;
  onFontSize: (s: string) => void;
  dyslexia: boolean;
  onDyslexia: (v: boolean) => void;
  accent: string;
  onAccent: (hex: string) => void;
  darkMode: boolean;
  onToggleDark: () => void;
  onReset: () => void;
};

export default function AccessibilityWidget({
  open, onToggleOpen, fontSize, onFontSize, dyslexia, onDyslexia,
  accent, onAccent, darkMode, onToggleDark, onReset,
}: Props) {
  return (
    <>
      <button className="acc-toggle" aria-label="Opciones de accesibilidad" onClick={onToggleOpen}>
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm0 6c1.1 0 2 .9 2 2v5h-1v5h-2v-5H9v-5c0-1.1.9-2 2-2z" />
        </svg>
      </button>

      <div
        className={`acc-panel ${open ? 'open' : ''}`}
        style={{ fontFamily: dyslexia ? "'Comic Sans MS', 'Comic Sans', cursive" : undefined }}
      >
        <div className="acc-panel-title">Accesibilidad</div>

        <div className="acc-section">
          <span className="acc-label">Tamaño de texto</span>
          <div className="font-size-row">
            {FONT_SIZES.map((s) => (
              <button
                key={s}
                className={`size-btn ${fontSize === s ? 'active' : ''}`}
                onClick={() => onFontSize(s)}
              >
                {s === '14px' ? 'A-' : s === '16px' ? 'A' : s === '19px' ? 'A+' : 'A++'}
              </button>
            ))}
          </div>
        </div>

        <div className="acc-section">
          <span className="acc-label">Dislexia</span>
          <div className="mode-row">
            <button className={`mode-btn ${!dyslexia ? 'active' : ''}`} onClick={() => onDyslexia(false)}>Normal</button>
            <button className={`mode-btn ${dyslexia ? 'active' : ''}`} onClick={() => onDyslexia(true)}>Activar</button>
          </div>
        </div>

        <div className="acc-section">
          <span className="acc-label">Color de acento</span>
          <div className="color-grid">
            {ACCENT_COLORS.map((c) => (
              <div
                key={c.hex}
                className={`color-swatch ${accent === c.hex ? 'active' : ''}`}
                style={{ background: c.hex }}
                title={c.title}
                onClick={() => onAccent(c.hex)}
              />
            ))}
          </div>
        </div>

        <div className="acc-section">
          <span className="acc-label">Modo</span>
          <div className="mode-row">
            <button className={`mode-btn ${!darkMode ? 'active' : ''}`} onClick={() => { if (darkMode) onToggleDark(); }}>☀️ Claro</button>
            <button className={`mode-btn ${darkMode ? 'active' : ''}`} onClick={() => { if (!darkMode) onToggleDark(); }}>🌙 Oscuro</button>
          </div>
        </div>

        <button className="acc-reset" onClick={onReset}>Restablecer todo</button>
      </div>
    </>
  );
}
