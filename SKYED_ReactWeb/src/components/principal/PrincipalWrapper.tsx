import { useState } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import AccessibilityWidget, { FONT_SIZES } from '../shared/AccessibilityWidget';

const DEFAULT_ACCENT = '#8827f0'; // color de marca SKYED Principal
const DEFAULT_SIZE = FONT_SIZES[1];

export default function PrincipalWrapper({ children }: { children: ReactNode }) {
  const [darkMode, setDarkMode] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [fontSize, setFontSize] = useState(DEFAULT_SIZE);
  const [dyslexia, setDyslexia] = useState(false);
  const [accent, setAccent] = useState(DEFAULT_ACCENT);

  function reset() {
    setFontSize(DEFAULT_SIZE);
    setDyslexia(false);
    setAccent(DEFAULT_ACCENT);
    setDarkMode(false);
  }

  return (
    <div
      className={`mod-principal${darkMode ? ' dark-mode' : ''}`}
      style={{
        '--accent': accent,
        '--accent-2': accent,
        fontSize,
        fontFamily: dyslexia ? "'Comic Sans MS', 'Comic Sans', cursive" : undefined,
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
        onToggleDark={() => setDarkMode((d) => !d)}
        onReset={reset}
      />
    </div>
  );
}
