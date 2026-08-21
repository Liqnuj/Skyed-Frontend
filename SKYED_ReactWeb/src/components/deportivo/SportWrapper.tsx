import { useState } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import AccessibilityWidget, { FONT_SIZES } from '../shared/AccessibilityWidget';
import SportNav from './SportNav';
import SportFooter from './SportFooter';

const DEFAULT_ACCENT = '#2c9caf'; // color de marca SkyedDeportivo
const DEFAULT_SIZE = FONT_SIZES[1];

export default function SportWrapper({ children }: { children: ReactNode }) {
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
      className={`mod-deportivo${darkMode ? ' dark-mode' : ''}`}
      style={{
        '--accent': accent,
        '--accent-2': accent,
        fontSize,
        fontFamily: dyslexia ? "'Comic Sans MS', 'Comic Sans', cursive" : undefined,
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
        onToggleDark={() => setDarkMode((d) => !d)}
        onReset={reset}
      />
    </div>
  );
}
