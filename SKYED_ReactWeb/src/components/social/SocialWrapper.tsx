import { useRef, useState } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import AccessibilityWidget from '../shared/AccessibilityWidget';
import { useAccessibility } from '../../context/AccessibilityContext';
import SocialNav from './SocialNav';
import SocialFooter from './SocialFooter';
import { useRevealObserver } from '../../hooks/useRevealObserver';

const DEFAULT_ACCENT = '#9c02ae'; // color de marca SKYED Social

export default function SocialWrapper({ children }: { children: ReactNode }) {
  const [panelOpen, setPanelOpen] = useState(false);
  const {
    darkMode, toggleDark,
    fontSize, setFontSize,
    dyslexia, setDyslexia,
    accentOverride, setAccent,
    reset,
  } = useAccessibility();
  const rootRef = useRef<HTMLDivElement>(null);
  useRevealObserver(rootRef);

  const accent = accentOverride ?? DEFAULT_ACCENT;

  // fontSize sigue siendo '14px' | '16px' | '19px' | '22px' — lo convertimos
  // a un factor de escala relativo a 16px base
  const fsScale = parseInt(fontSize, 10) / 16;

  return (
    <div
      ref={rootRef}
      className={`mod-social${darkMode ? ' dark-mode' : ''}${dyslexia ? ' dyslexia' : ''}`}
      style={{
        '--accent': accent,
        '--accent-2': accent,
        '--fs-scale': fsScale,
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
        onToggleDark={toggleDark}
        onReset={reset}
      />
    </div>
  );
}