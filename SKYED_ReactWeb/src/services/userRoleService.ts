import { apiFetch } from './api';
import type { Paginated } from './socialService';

export interface UserWithRoles {
  id_u: number;
  nombre_u: string;
  apellido_u: string;
  correo_u: string;
  estado_u?: string;
  roles: {
    id_rol: number;
    nombre_rol: string;
    pivot: { contexto: string };
  }[];
}

/** Datos del formulario "Nuevo usuario" del panel de administración. */
export interface NuevoUsuario {
  tipo_documento_u: string;
  documento_u: number;
  nombre_u: string;
  apellido_u: string;
  telefono_u: string;
  correo_u: string;
  fecha_nacimiento_u: string;
  contrasena_u: string;
  contexto: 'deportivo' | 'social';
}

/** Datos completos de un usuario (GET /users/{id}). */
export interface UsuarioDetalle extends UserWithRoles {
  tipo_documento_u?: string | null;
  documento_u?: number | string | null;
  telefono_u?: string | null;
  fecha_nacimiento_u?: string | null;
  rh_u?: string | null;
}

export const userService = {
  async listar(page = 1): Promise<Paginated<UserWithRoles>> {
    return apiFetch(`/users?page=${page}`);
  },

  /**
   * Crea una cuenta usando el mismo endpoint del registro público. Se llama
   * con apiFetch directo (no con AuthContext.register) para que el token
   * de la cuenta nueva NO reemplace la sesión del administrador.
   */
  async crear(datos: NuevoUsuario): Promise<{ user?: { id_u: number } }> {
    return apiFetch('/register', {
      method: 'POST',
      body: JSON.stringify({ ...datos, contrasena_u_confirmation: datos.contrasena_u }),
    });
  },

  async obtener(userId: number): Promise<{ user: UsuarioDetalle }> {
    return apiFetch(`/users/${userId}`);
  },

  /** Solo se envían los campos que cambiaron. */
  async actualizar(userId: number, datos: Record<string, unknown>) {
    return apiFetch(`/users/${userId}`, { method: 'PUT', body: JSON.stringify(datos) });
  },

  async asignarRol(userId: number, nombre_rol: string, contexto: string) {
    return apiFetch(`/users/${userId}/roles`, {
      method: 'POST',
      body: JSON.stringify({ nombre_rol, contexto }),
    });
  },

  async quitarRol(userId: number, rolId: number, contexto: string) {
    return apiFetch(`/users/${userId}/roles/${rolId}?contexto=${contexto}`, {
      method: 'DELETE',
    });
  },
};
