import { useEffect, useState } from "react";

/**
 * Borradores de formularios del panel admin (recargar la página no debe borrar lo que se escribe).
 * Los usan Admin.tsx, AdminCatalogos.tsx y UsuariosAdmin.tsx.
 */

export const DRAFT_PREFIX = "admin_draft:";

/** Igual que useState, pero guarda el valor en sessionStorage bajo `key`. */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = sessionStorage.getItem(key);
      return saved !== null ? (JSON.parse(saved) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Sin almacenamiento disponible: el formulario sigue funcionando, solo no se recupera.
    }
  }, [key, value]);

  return [value, setValue] as const;
}

/** Borra los borradores cuya clave empieza por `prefijo` (por defecto, todos). */
export const clearDrafts = (prefijo: string = DRAFT_PREFIX) => {
  try {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(prefijo))
      .forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // nada que limpiar
  }
};

/** Borra un solo borrador (clave exacta). */
export const clearDraft = (key: string) => {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // nada que limpiar
  }
};

/** Primera letra en mayúscula (solo para campos de texto libre). Ignora espacios al inicio. */
export const capitalizeFirst = (value: string) => {
  const limpio = value.replace(/^\s+/, "");
  return limpio.length ? limpio.charAt(0).toUpperCase() + limpio.slice(1) : limpio;
};