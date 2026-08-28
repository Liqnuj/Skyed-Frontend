import { useEffect, useState } from 'react';
import { FONT_SIZES } from '../components/shared/AccessibilityWidget';

export type AccessibilityScope = 'principal' | 'social' | 'deportivo';

const GLOBAL_KEYS = {
  dark: 'skyed-accessibility-dark',
  size: 'skyed-accessibility-size',
  dyslexia: 'skyed-accessibility-dyslexia',
};

const ACCENT_KEYS: Record<AccessibilityScope, string> = {
  principal: 'skyed-accessibility-accent-principal',
  social: 'skyed-accessibility-accent-social',
  deportivo: 'skyed-accessibility-accent-deportivo',
};

const LEGACY_KEYS = {
  dark: 'lumara-dark',
  size: 'lumara-size',
  dyslexia: 'lumara-dyslexia',
  deportivoAccent: 'lumara-accent-deportivo',
};

function read(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function getScale(size: string) {
  switch (size) {
    case '14px':
      return 0.875;
    case '19px':
      return 1.1875;
    case '22px':
      return 1.375;
    case '16px':
    default:
      return 1;
  }
}

export function useAccessibilitySettings(
  scope: AccessibilityScope,
  defaultAccent: string
) {
  const initialDark =
    read(GLOBAL_KEYS.dark, read(LEGACY_KEYS.dark, 'false')) === 'true';

  const initialSize = read(
    GLOBAL_KEYS.size,
    read(LEGACY_KEYS.size, FONT_SIZES[1])
  );

  const initialDyslexia =
    read(GLOBAL_KEYS.dyslexia, read(LEGACY_KEYS.dyslexia, 'false')) === 'true';

  const legacyAccent =
    scope === 'deportivo'
      ? read(LEGACY_KEYS.deportivoAccent, defaultAccent)
      : defaultAccent;

  const [darkMode, setDarkMode] = useState(initialDark);
  const [fontSize, setFontSize] = useState(initialSize);
  const [dyslexia, setDyslexia] = useState(initialDyslexia);
  const [accent, setAccent] = useState(() =>
    read(ACCENT_KEYS[scope], legacyAccent)
  );
  const [panelOpen, setPanelOpen] = useState(false);

  /*
   * Guardar preferencias
   */
  useEffect(() => {
    try {
      localStorage.setItem(GLOBAL_KEYS.dark, String(darkMode));
      localStorage.setItem(GLOBAL_KEYS.size, fontSize);
      localStorage.setItem(GLOBAL_KEYS.dyslexia, String(dyslexia));
      localStorage.setItem(ACCENT_KEYS[scope], accent);

      if (scope === 'deportivo') {
        localStorage.setItem(LEGACY_KEYS.dark, String(darkMode));
        localStorage.setItem(LEGACY_KEYS.size, fontSize);
        localStorage.setItem(LEGACY_KEYS.dyslexia, String(dyslexia));
        localStorage.setItem(LEGACY_KEYS.deportivoAccent, accent);
      }
    } catch {
      // Ignorar errores de localStorage
    }
  }, [scope, darkMode, fontSize, dyslexia, accent]);

  /*
   * Tamaño de texto
   *
   * En lugar de depender solamente de rem,
   * agregamos una variable global que será utilizada
   * por CSS para escalar textos.
   */
  useEffect(() => {
    const scale = getScale(fontSize);

    document.documentElement.style.setProperty(
      '--skyed-font-scale',
      String(scale)
    );

    document.documentElement.style.setProperty(
      '--skyed-font-size',
      fontSize
    );

    return () => {
      // No restauramos a 16px al cambiar de página.
      // Así la preferencia permanece activa en todo SKYED.
    };
  }, [fontSize]);

  /*
   * Modo oscuro global
   */
  useEffect(() => {
    document.documentElement.classList.toggle('skyed-dark-mode', darkMode);
  }, [darkMode]);

  /*
   * Dislexia global
   */
  useEffect(() => {
    document.documentElement.classList.toggle(
      'skyed-dyslexia',
      dyslexia
    );
  }, [dyslexia]);

  /*
   * Color global
   */
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accent);
    document.documentElement.style.setProperty('--accent-2', accent);
  }, [accent]);

  /*
   * Restablecer
   */
  function reset() {
    setDarkMode(false);
    setFontSize('16px');
    setDyslexia(false);
    setAccent(defaultAccent);
    setPanelOpen(false);

    try {
      localStorage.setItem(GLOBAL_KEYS.dark, 'false');
      localStorage.setItem(GLOBAL_KEYS.size, '16px');
      localStorage.setItem(GLOBAL_KEYS.dyslexia, 'false');
      localStorage.setItem(ACCENT_KEYS[scope], defaultAccent);

      if (scope === 'deportivo') {
        localStorage.setItem(LEGACY_KEYS.dark, 'false');
        localStorage.setItem(LEGACY_KEYS.size, '16px');
        localStorage.setItem(LEGACY_KEYS.dyslexia, 'false');
        localStorage.setItem(
          LEGACY_KEYS.deportivoAccent,
          defaultAccent
        );
      }
    } catch {
      // Ignorar errores
    }

    document.documentElement.style.setProperty(
      '--skyed-font-scale',
      '1'
    );
  }

  return {
    darkMode,
    setDarkMode,
    fontSize,
    setFontSize,
    dyslexia,
    setDyslexia,
    accent,
    setAccent,
    panelOpen,
    setPanelOpen,
    reset,
  };
}