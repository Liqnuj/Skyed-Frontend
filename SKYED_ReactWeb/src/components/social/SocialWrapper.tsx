import { useRef } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import AccessibilityWidget from '../shared/AccessibilityWidget';
import { useAccessibility } from '../../context/AccessibilityContext';
import SocialNav from './SocialNav';
import SocialFooter from './SocialFooter';
import { useRevealObserver } from '../../hooks/useRevealObserver';
import { useEffect, } from 'react'; // agrega useEffect
import { setSiteContext } from '../../utils/siteContext';

const DEFAULT_ACCENT = '#9c02ae'; // color de marca SKYED Social

export default function SocialWrapper({ children }: { children: ReactNode }) {
  useEffect(() => {
    setSiteContext('social');
  }, []);
  const {
    darkMode, toggleDark,
    fontSize, setFontSize,
    dyslexia, setDyslexia,
    reset,
  } = useAccessibility();
  const rootRef = useRef<HTMLDivElement>(null);
  useRevealObserver(rootRef);

  // Color de marca del módulo (el selector de color se quitó del panel de accesibilidad).
  const accent = DEFAULT_ACCENT;

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
        fontSize={fontSize}
        onFontSize={setFontSize}
        dyslexia={dyslexia}
        onDyslexia={setDyslexia}
        darkMode={darkMode}
        onToggleDark={toggleDark}
        onReset={reset}
      />
    </div>
  );
}