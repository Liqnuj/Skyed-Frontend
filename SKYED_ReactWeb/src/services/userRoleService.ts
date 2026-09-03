import { apiFetch } from './api';
import type { Paginated } from './socialService';

export interface UserWithRoles {
  id_u: number;
  nombre_u: string;
  apellido_u: string;
  correo_u: string;
  roles: {
    id_rol: number;
    nombre_rol: string;
    pivot: { contexto: string };
  }[];
}

export const userService = {
  async listar(page = 1): Promise<Paginated<UserWithRoles>> {
    return apiFetch(`/users?page=${page}`);
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
