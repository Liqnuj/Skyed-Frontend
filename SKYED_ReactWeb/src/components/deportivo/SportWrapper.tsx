import { useState } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import AccessibilityWidget from '../shared/AccessibilityWidget';
import { useAccessibility } from '../../context/AccessibilityContext';
import SportNav from './SportNav';
import SportFooter from './SportFooter';

const DEFAULT_ACCENT = '#2c9caf'; // color de marca SkyedDeportivo

export default function SportWrapper({ children }: { children: ReactNode }) {
  const [panelOpen, setPanelOpen] = useState(false);
  const {
    darkMode, toggleDark,
    fontSize, setFontSize,
    dyslexia, setDyslexia,
    accentOverride, setAccent,
    reset,
  } = useAccessibility();

  const accent = accentOverride ?? DEFAULT_ACCENT;

  // fontSize sigue siendo '14px' | '16px' | '19px' | '22px' — lo convertimos
  // a un factor de escala relativo a 16px base
  const fsScale = parseInt(fontSize, 10) / 16;

  return (
    <div
      className={`mod-deportivo${darkMode ? ' dark-mode' : ''}${dyslexia ? ' dyslexia' : ''}`}
      style={{
        '--accent': accent,
        '--accent-2': accent,
        '--fs-scale': fsScale,
      } as CSSProperties}
    >
      <SportNav />
      {children}
      <SportFooter />
      <AccessibilityWidget
        open={panelOpen}
        onToggleOpen={() => setPanelOpen((o) => !o)}
        fontSize={fontSize}
        onFontSize={setFontSize}
        dyslexia={dyslexia}
        onDyslexia={setDyslexia}
        accent={accent}
        onAccent={setAccent}
        darkMode={darkMode}
        onToggleDark={toggleDark}
        onReset={reset}
      />
    </div>
  );
}