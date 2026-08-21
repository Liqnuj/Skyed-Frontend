import { useRef, useState } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import AccessibilityWidget, { FONT_SIZES } from '../shared/AccessibilityWidget';
import SocialNav from './SocialNav';
import SocialFooter from './SocialFooter';
import { useRevealObserver } from '../../hooks/useRevealObserver';

const DEFAULT_ACCENT = '#9c02ae'; // color de marca SkyedSocial
const DEFAULT_SIZE = FONT_SIZES[1];

export default function SocialWrapper({ children }: { children: ReactNode }) {
  const [darkMode, setDarkMode] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [fontSize, setFontSize] = useState(DEFAULT_SIZE);
  const [dyslexia, setDyslexia] = useState(false);
  const [accent, setAccent] = useState(DEFAULT_ACCENT);
  const rootRef = useRef<HTMLDivElement>(null);
  useRevealObserver(rootRef);

  function reset() {
    setFontSize(DEFAULT_SIZE);
    setDyslexia(false);
    setAccent(DEFAULT_ACCENT);
    setDarkMode(false);
  }

  return (
    <div
      ref={rootRef}
      className={`mod-social${darkMode ? ' dark-mode' : ''}`}
      style={{
        '--accent': accent,
        '--accent-2': accent,
        fontSize,
        fontFamily: dyslexia ? "'Comic Sans MS', 'Comic Sans', cursive" : undefined,
      } as CSSProperties}
    >
      <SocialNav />
      {children}
      <SocialFooter />
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
