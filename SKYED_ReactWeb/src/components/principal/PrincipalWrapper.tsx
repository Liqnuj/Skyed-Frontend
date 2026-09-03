import { useState } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import AccessibilityWidget from '../shared/AccessibilityWidget';
import { useAccessibility } from '../../context/AccessibilityContext';

const DEFAULT_ACCENT = '#8827f0'; // color de marca SKYED Principal

export default function PrincipalWrapper({ children }: { children: ReactNode }) {
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
      className={`mod-principal${darkMode ? ' dark-mode' : ''}${dyslexia ? ' dyslexia' : ''}`}
      style={{
        '--accent': accent,
        '--accent-2': accent,
        '--fs-scale': fsScale,
      } as CSSProperties}
    >
      {children}
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