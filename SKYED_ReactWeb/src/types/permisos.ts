/**
 * Modelo de permisos del rol "asistente".
 *
 * Cada sección delegable tiene un permiso de lectura y una acción exclusiva:
 * ver solo consulta, editar permite crear/modificar y eliminar permite borrar.
 *
 *   - sección ausente en `Permisos`  → sin acceso (no aparece en el menú)
 *   - 'ver'                          → solo lectura
 *   - 'editar'                       → consulta + crear/modificar
 *   - 'eliminar'                     → consulta + borrar (sin editar)
 *
 * El backend guarda lo mismo (ver/editar/eliminar por sección) y es quien
 * decide de verdad; esto solo sirve para pintar la interfaz.
 */

export type Modulo = 'social' | 'deportivo';
export type Nivel = 'ver' | 'editar' | 'eliminar';

export type SeccionSocial = 'inicio' | 'eventos' | 'reservas' | 'usuarios' | 'pqr' | 'lugares' | 'servicios';
export type SeccionDeportivo = 'inicio' | 'eventos' | 'inscripciones' | 'acceso' | 'resultados' | 'kits' | 'usuarios';
export type SeccionDelegable = SeccionSocial | SeccionDeportivo;

/** Secciones que NUNCA se delegan: el asistente no las ve ni puede llamarlas. */
export const SECCIONES_NO_DELEGABLES = ['asistentes', 'ajustes', 'copias'] as const;

export type Permisos = Partial<Record<SeccionDelegable, Nivel>>;

export const NIVELES: Nivel[] = ['ver', 'editar', 'eliminar'];

export const NIVEL_INFO: Record<Nivel, { etiqueta: string; corta: string; descripcion: string }> = {
  ver: { etiqueta: 'Solo ver', corta: 'ver', descripcion: 'Puede consultar la información, sin modificar nada.' },
  editar: { etiqueta: 'Editar', corta: 'editar', descripcion: 'Puede consultar, crear y modificar registros.' },
  eliminar: { etiqueta: 'Eliminar', corta: 'eliminar', descripcion: 'Puede consultar y borrar registros, sin modificarlos.' },
};

/** Orden = el del menú del panel de cada módulo. */
export const SECCIONES_DELEGABLES: Record<Modulo, Array<{ clave: SeccionDelegable; etiqueta: string }>> = {
  social: [
    { clave: 'inicio', etiqueta: 'Inicio' },
    { clave: 'eventos', etiqueta: 'Eventos' },
    { clave: 'reservas', etiqueta: 'Reservas' },
    { clave: 'usuarios', etiqueta: 'Usuarios' },
    { clave: 'pqr', etiqueta: 'PQRS' },
    { clave: 'lugares', etiqueta: 'Lugares' },
    { clave: 'servicios', etiqueta: 'Servicios' },
  ],
  deportivo: [
    { clave: 'inicio', etiqueta: 'Inicio' },
    { clave: 'eventos', etiqueta: 'Eventos' },
    { clave: 'inscripciones', etiqueta: 'Inscripciones y pagos' },
    { clave: 'acceso', etiqueta: 'Control de acceso' },
    { clave: 'resultados', etiqueta: 'Resultados' },
    { clave: 'kits', etiqueta: 'Kits' },
    { clave: 'usuarios', etiqueta: 'Usuarios' },
  ],
};

/** La lectura se concede al habilitar cualquier nivel; editar y borrar son exclusivos. */
export const nivelCubre = (concedido: Nivel | undefined, pedido: Nivel): boolean =>
  pedido === 'ver' ? !!concedido : concedido === pedido;

export const etiquetaSeccion = (modulo: Modulo, clave: string): string =>
  SECCIONES_DELEGABLES[modulo].find((s) => s.clave === clave)?.etiqueta ?? clave;

/** Cantidad de secciones con acceso. El backend exige al menos una. */
export const contarSecciones = (permisos: Permisos): number =>
  Object.values(permisos).filter(Boolean).length;

/** Resumen corto para chips: [{ seccion: 'Eventos', nivel: 'editar' }, ...] en el orden del menú. */
export function resumenPermisos(modulo: Modulo, permisos: Permisos) {
  return SECCIONES_DELEGABLES[modulo]
    .filter((s) => permisos[s.clave])
    .map((s) => ({ clave: s.clave, seccion: s.etiqueta, nivel: permisos[s.clave] as Nivel }));
}

/**
 * Quita lo que no se puede delegar o no es de este módulo. Se usa con lo que
 * llega del servidor y antes de enviar, por si el estado local se contaminó.
 */
export function limpiarPermisos(modulo: Modulo, permisos: Permisos): Permisos {
  const validas = new Set(SECCIONES_DELEGABLES[modulo].map((s) => s.clave));
  const salida: Permisos = {};
  (Object.keys(permisos) as SeccionDelegable[]).forEach((k) => {
    const nivel = permisos[k];
    if (validas.has(k) && nivel && NIVELES.includes(nivel)) salida[k] = nivel;
  });
  return salida;
}

/** Primera sección (en orden de menú) a la que el asistente puede entrar, o null. */
export const primeraSeccionPermitida = (modulo: Modulo, permisos: Permisos): SeccionDelegable | null =>
  SECCIONES_DELEGABLES[modulo].find((s) => permisos[s.clave])?.clave ?? null;

/** Asistente tal como lo devuelve GET /asistentes. */
export interface Asistente {
  id: number;
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
  foto_url: string | null;
  activo: boolean;
  modulo: Modulo;
  permisos: Permisos;
  creado_en?: string;
}

/** Lo que devuelve GET /mis-permisos (admin: todo permitido; asistente: los suyos). */
export interface MisPermisos {
  es_admin: boolean;
  es_asistente: boolean;
  modulo: Modulo | null;
  permisos: Permisos;
}
