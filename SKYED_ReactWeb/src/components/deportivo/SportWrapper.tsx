import type { ReactNode, CSSProperties } from 'react';
import AccessibilityWidget from '../shared/AccessibilityWidget';
import { useAccessibility } from '../../context/AccessibilityContext';
import SportNav from './SportNav';
import SportFooter from './SportFooter';
import { useEffect } from 'react'; // agrega useEffect al import existente
import { setSiteContext } from '../../utils/siteContext';

const DEFAULT_ACCENT = '#2c9caf'; // color de marca SkyedDeportivo

export default function SportWrapper({ children }: { children: ReactNode }) {
  useEffect(() => {
    setSiteContext('deportivo');
  }, []);
  const {
    darkMode, toggleDark,
    fontSize, setFontSize,
    dyslexia, setDyslexia,
    reset,
  } = useAccessibility();

  // Color de marca del módulo (el selector de color se quitó del panel de accesibilidad).
  const accent = DEFAULT_ACCENT;

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