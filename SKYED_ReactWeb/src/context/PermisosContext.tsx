import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { PERMISO_DENEGADO } from '../services/api';
import { asistentesService } from '../services/asistentesService';
import {
  limpiarPermisos,
  nivelCubre,
  primeraSeccionPermitida,
  type Modulo,
  type Nivel,
  type Permisos,
  type SeccionDelegable,
} from '../types/permisos';

interface PermisosValue {
  /** true mientras llega la primera respuesta de /mis-permisos. */
  cargando: boolean;
  errorCarga: string | null;
  esAdmin: boolean;
  esAsistente: boolean;
  /** Módulo al que pertenece el asistente (el del administrador que lo creó). */
  modulo: Modulo | null;
  permisos: Permisos;
  /**
   * ¿Puede hacer `accion` en `seccion`? Para un administrador siempre true.
   * Ocultar botones con esto es solo comodidad: el backend vuelve a validar.
   */
  puede: (seccion: string, accion?: Nivel) => boolean;
  /** Secciones del menú a las que puede entrar (para un admin: todas las que pida el panel). */
  puedeVerSeccion: (seccion: string) => boolean;
  /** A dónde mandar al asistente si entra por URL a una sección que no tiene. */
  primeraSeccion: SeccionDelegable | null;
  refrescar: () => Promise<void>;
}

const Ctx = createContext<PermisosValue | undefined>(undefined);

const esRolAdmin = (roles: string[] = []) => roles.some((r) => r === 'adminSocial' || r === 'adminDeportivo');

/**
 * Carga GET /mis-permisos cuando hay sesión y lo expone con `usePermisos()`.
 *
 * Los permisos NO se guardan en localStorage (se pueden editar desde el
 * inspector): viven solo en memoria y se piden al servidor en cada sesión.
 * Si cualquier petición recibe 403, se vuelven a pedir, de modo que un
 * permiso retirado se nota en la siguiente acción del asistente.
 */
export function PermisosProvider({ children }: { children: ReactNode }) {
  const { user, verificando } = useAuth();
  const esAdmin = esRolAdmin(user?.roles);
  const esAsistente = !!user?.roles?.includes('asistente');

  const [cargando, setCargando] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [modulo, setModulo] = useState<Modulo | null>(null);
  const [permisos, setPermisos] = useState<Permisos>({});
  const usuarioId = useRef<number | null>(null);

  const refrescar = useCallback(async () => {
    if (!user || !esAsistente) {
      setErrorCarga(null);
      return; // el admin no necesita pedirlos
    }
    setErrorCarga(null);
    try {
      const r = await asistentesService.misPermisos();
      const mod = r.modulo;
      setModulo(mod);
      setPermisos(mod ? limpiarPermisos(mod, r.permisos ?? {}) : {});
    } catch (error) {
      setModulo(null);
      setPermisos({});
      setErrorCarga(error instanceof Error ? error.message : 'No se pudieron cargar tus permisos.');
    }
  }, [user, esAsistente]);

  // Al cambiar de usuario (login / logout) se parte de cero: nada del anterior se hereda.
  useEffect(() => {
    if (verificando) return;
    if (usuarioId.current !== (user?.id ?? null)) {
      usuarioId.current = user?.id ?? null;
      setModulo(null);
      setPermisos({});
      setErrorCarga(null);
    }
    if (!user || !esAsistente) { setCargando(false); return; }
    setCargando(true);
    refrescar().finally(() => setCargando(false));
  }, [user?.id, esAsistente, verificando]); // eslint-disable-line react-hooks/exhaustive-deps

  // 403 en cualquier petición: puede que le hayan quitado un permiso.
  useEffect(() => {
    if (!esAsistente) return;
    const alDenegar = () => { void refrescar(); };
    window.addEventListener(PERMISO_DENEGADO, alDenegar);
    return () => window.removeEventListener(PERMISO_DENEGADO, alDenegar);
  }, [esAsistente, refrescar]);

  const value = useMemo<PermisosValue>(() => {
    const puede = (seccion: string, accion: Nivel = 'ver') =>
      esAdmin ? true : esAsistente ? nivelCubre(permisos[seccion as SeccionDelegable], accion) : false;
    return {
      cargando,
      errorCarga,
      esAdmin,
      esAsistente,
      modulo,
      permisos,
      puede,
      puedeVerSeccion: (s) => puede(s, 'ver'),
      primeraSeccion: modulo ? primeraSeccionPermitida(modulo, permisos) : null,
      refrescar,
    };
  }, [cargando, errorCarga, esAdmin, esAsistente, modulo, permisos, refrescar]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePermisos() {
  const c = useContext(Ctx);
  if (!c) throw new Error('usePermisos debe usarse dentro de PermisosProvider');
  return c;
}

/** Atajo: `const { ver, editar, eliminar } = usePermisosDe('eventos')`. */
export function usePermisosDe(seccion: string) {
  const { puede } = usePermisos();
  return { ver: puede(seccion, 'ver'), editar: puede(seccion, 'editar'), eliminar: puede(seccion, 'eliminar') };
}
