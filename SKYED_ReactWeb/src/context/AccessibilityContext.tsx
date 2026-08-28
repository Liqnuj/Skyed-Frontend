import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export const FONT_SIZES = ['14px', '16px', '19px', '22px'];
const DEFAULT_SIZE = FONT_SIZES[1];

interface AccessibilityState {
  darkMode: boolean;
  fontSize: string;
  dyslexia: boolean;
  /** null = usar el color de marca por defecto del módulo actual */
  accentOverride: string | null;
}

interface AccessibilityContextValue extends AccessibilityState {
  toggleDark: () => void;
  setFontSize: (s: string) => void;
  setDyslexia: (v: boolean) => void;
  setAccent: (hex: string) => void;
  reset: () => void;
}

const DEFAULT_STATE: AccessibilityState = {
  darkMode: false,
  fontSize: DEFAULT_SIZE,
  dyslexia: false,
  accentOverride: null,
};

const STORAGE_KEY = 'skyed_accessibility';

const AccessibilityContext = createContext<AccessibilityContextValue | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AccessibilityState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : DEFAULT_STATE;
    } catch {
      return DEFAULT_STATE;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const value = useMemo<AccessibilityContextValue>(() => ({
    ...state,
    toggleDark: () => setState((s) => ({ ...s, darkMode: !s.darkMode })),
    setFontSize: (fontSize) => setState((s) => ({ ...s, fontSize })),
    setDyslexia: (dyslexia) => setState((s) => ({ ...s, dyslexia })),
    setAccent: (hex) => setState((s) => ({ ...s, accentOverride: hex })),
    reset: () => setState(DEFAULT_STATE),
  }), [state]);

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error('useAccessibility debe usarse dentro de <AccessibilityProvider>');
  return ctx;
}