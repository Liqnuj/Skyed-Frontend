import { apiFetch } from './api';

export interface EventoDeportivo {
  id: number;
  nombre: string;
  categoria: string;
  precio: number;
  distancia: string | null;
  desnivel: string | null;
  fecha: string;
  hora: string;
  ubicacion: string;
  descripcion: string;
  requisitos: string;
  imagen: string;
  imagen_url: string | null;
  cupos_disponibles: number;
  estado: string;
}

export interface PaginatedResource<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export const eventoDeportivoService = {
  async listar(page = 1): Promise<PaginatedResource<EventoDeportivo>> {
    return apiFetch(`/eventos?page=${page}`);
  },

  async obtener(id: number): Promise<{ evento: EventoDeportivo }> {
    return apiFetch(`/eventos/${id}`);
  },
};