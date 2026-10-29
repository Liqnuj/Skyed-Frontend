import { useCallback, useEffect, useState } from 'react';
import { AyudaError } from '../services/ayudaService';

interface Estado<T> {
  cargando: boolean;
  datos: T | null;
  error: AyudaError | null;
}

/** Carga datos del Centro de Ayuda y expone cargando / error / reintentar. */
export function useAyudaDatos<T>(cargar: () => Promise<T>, dependencias: unknown[]) {
  const [estado, setEstado] = useState<Estado<T>>({ cargando: true, datos: null, error: null });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    setEstado((e) => ({ ...e, cargando: true, error: null }));

    cargar()
      .then((datos) => {
        if (vigente) setEstado({ cargando: false, datos, error: null });
      })
      .catch((e: unknown) => {
        if (!vigente) return;
        const error =
          e instanceof AyudaError ? e : new AyudaError('No pudimos cargar la ayuda en este momento.', 0);
        setEstado({ cargando: false, datos: null, error });
      });

    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencias, intento]);

  const reintentar = useCallback(() => setIntento((i) => i + 1), []);

  return { ...estado, reintentar };
}