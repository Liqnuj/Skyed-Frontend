/**
 * Cada panel de administración solo debe ver a los usuarios de su propio
 * módulo. La API (/users) devuelve a todos, con sus roles y el `contexto`
 * de cada rol en `pivot` ('social' | 'deportivo' | 'general'), así que se
 * filtra aquí por ese contexto.
 */
export type Modulo = 'social' | 'deportivo';

export interface UserConRoles {
  roles?: Array<{ nombre_rol: string; pivot?: { contexto?: string } }>;
}

/** ¿El usuario tiene algún rol dentro de este módulo? */
export function perteneceAlModulo(u: UserConRoles, modulo: Modulo): boolean {
  return (u.roles ?? []).some((r) => r.pivot?.contexto === modulo);
}

/** Módulos que puede administrar alguien según sus roles (adminSocial / adminDeportivo). */
export function modulosAdministrables(roles: string[] = []): Modulo[] {
  const m: Modulo[] = [];
  if (roles.includes('adminSocial')) m.push('social');
  if (roles.includes('adminDeportivo')) m.push('deportivo');
  return m;
}
