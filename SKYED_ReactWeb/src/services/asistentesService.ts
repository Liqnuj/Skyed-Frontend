import { apiFetch } from './api';
import type { Asistente, MisPermisos, Modulo, Permisos } from '../types/permisos';

export interface DatosAsistente {
  nombre_u: string;
  apellido_u: string;
  correo_u: string;
  telefono_u: string;
  permisos: Permisos;
}

export interface NuevoAsistente extends DatosAsistente {
  tipo_documento_u: string;
  documento_u: number;
  fecha_nacimiento_u: string;
  contrasena_u: string;
  contrasena_u_confirmation: string;
}

export interface ListadoAsistentes {
  data: Asistente[];
  /** Límite vigente en el backend (si no viene, se usa MAX_ASISTENTES). */
  limite?: number;
}

/**
 * Todas las rutas cuelgan del administrador que inició sesión: el backend
 * toma su id del token, nunca del cuerpo de la petición. Por eso aquí no se
 * envía ningún "id_admin".
 */
export const asistentesService = {
  listar: (modulo: Modulo): Promise<ListadoAsistentes> =>
    apiFetch(`/asistentes?modulo=${modulo}`),

  crear: (modulo: Modulo, datos: NuevoAsistente): Promise<{ data: Asistente }> =>
    apiFetch(`/asistentes?modulo=${modulo}`, { method: 'POST', body: JSON.stringify(datos) }),

  actualizar: (modulo: Modulo, id: number, datos: DatosAsistente): Promise<{ data: Asistente }> =>
    apiFetch(`/asistentes/${id}?modulo=${modulo}`, { method: 'PUT', body: JSON.stringify(datos) }),

  /** Idempotente: pedir "activo: false" a uno ya desactivado responde 200 igual. */
  cambiarEstado: (modulo: Modulo, id: number, activo: boolean): Promise<{ data: Asistente }> =>
    apiFetch(`/asistentes/${id}/estado?modulo=${modulo}`, { method: 'PATCH', body: JSON.stringify({ activo }) }),

  /** Baja lógica: revoca tokens, quita el rol y borra permisos; la cuenta se conserva. */
  eliminar: (modulo: Modulo, id: number): Promise<void> =>
    apiFetch(`/asistentes/${id}?modulo=${modulo}`, { method: 'DELETE' }).then(() => undefined),

  misPermisos: (): Promise<MisPermisos> => apiFetch('/mis-permisos'),
};
