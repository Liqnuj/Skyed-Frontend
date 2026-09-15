import { apiFetch } from './api';

/**
 * Estructura de una respuesta paginada de Laravel
 * (la que devuelve ->paginate()).
 */
export interface Paginated<T> {
  current_page: number;
  data: T[];
  per_page: number;
  total: number;
  last_page: number;
}

/* ---------------------------------------------------------------- */
/*  Ambientes (Venues)                                                */
/* ---------------------------------------------------------------- */

export interface Servicio {
  id_s: number;
  nombre_s: string;
  descripcion_s: string | null;
}

export interface Ambiente {
  id_a: number;
  nombre_a: string;
  descripcion_a: string | null;
  capacidad_a: number;
  precio_referencia_a: string | null;
  imagen_principal_a: string | null;
  servicios?: Servicio[];
}

export interface CrearAmbientePayload {
  nombre_a: string;
  descripcion_a?: string;
  capacidad_a: number;
  precio_referencia_a?: number;
  imagen_principal_a?: string;
}

export const ambienteService = {
  async listar(page = 1): Promise<Paginated<Ambiente>> {
    return apiFetch(`/ambientes?page=${page}`);
  },

  async obtener(id: number): Promise<Ambiente> {
    const data = await apiFetch(`/ambientes/${id}`);
    return data.ambiente;
  },

  async crear(payload: CrearAmbientePayload): Promise<Ambiente> {
    const data = await apiFetch('/ambientes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return data.ambiente;
  },
};

/* ---------------------------------------------------------------- */
/*  Tipos de evento (para el selector al crear un evento social)     */
/* ---------------------------------------------------------------- */

export interface TipoEvento {
  id_tipo_eves: number;
  nombre_tipo_eves: string;
  descripcion_eves: string | null;
}

export const tipoEventoService = {
  async listar(): Promise<Paginated<TipoEvento>> {
    return apiFetch('/tipos-evento');
  },
};

/* ---------------------------------------------------------------- */
/*  Eventos sociales                                                  */
/* ---------------------------------------------------------------- */

export interface EventoSocial {
  id_er: number;
  nombre_er: string;
  descripcion_er: string | null;
  fecha_er: string | null;
  estado_er: 'activo' | 'inactivo';
  id_tipo_eves: number;
  id_a: number;
  id_u: number | null;
  tipoEvento?: { id_tipo_eves: number; nombre_tipo_eves: string };
  ambiente?: Ambiente;
}

export interface CrearEventoSocialPayload {
  nombre_er: string;
  descripcion_er?: string;
  fecha_er?: string;
  id_tipo_eves: number;
  id_a: number;
}

export const eventoSocialService = {
  async listar(page = 1): Promise<Paginated<EventoSocial>> {
    return apiFetch(`/eventos-sociales?page=${page}`);
  },

  async obtener(id: number): Promise<EventoSocial> {
    const data = await apiFetch(`/eventos-sociales/${id}`);
    return data.evento;
  },

  async crear(payload: CrearEventoSocialPayload): Promise<EventoSocial> {
    const data = await apiFetch('/eventos-sociales', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return data.evento;
  },

  async cambiarEstado(id: number, estado_er: 'activo' | 'inactivo'): Promise<EventoSocial> {
    const data = await apiFetch(`/eventos-sociales/${id}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ estado_er }),
    });
    return data.evento;
  },
};

/* ---------------------------------------------------------------- */
/*  Reservas                                                          */
/* ---------------------------------------------------------------- */

export interface Reserva {
  id_rese: number;
  fecha_evento_rese: string;
  invitados_rese: number;
  presupuesto_rese: string;
  ubicacion_rese: string;
  Observaciones_rese: string;
  total_rese: string;
  estado_rese: 'pendiente' | 'confirmada' | 'cancelada' | 'completada';
  id_u: number;
  id_er: number;
  evento?: EventoSocial;
}

export interface CrearReservaPayload {
  fecha_evento_rese: string;
  invitados_rese: number;
  presupuesto_rese: number;
  ubicacion_rese: string;
  Observaciones_rese: string;
  id_er: number;
}

export const reservaService = {
  async misReservas(page = 1): Promise<Paginated<Reserva>> {
    return apiFetch(`/reservas?page=${page}`);
  },

  async crear(payload: CrearReservaPayload): Promise<Reserva> {
    const data = await apiFetch('/reservas', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return data.reserva;
  },
};

/* ---------------------------------------------------------------- */
/*  PQR                                                                */
/* ---------------------------------------------------------------- */

export type TipoPqr = 'peticion' | 'queja' | 'reclamo' | 'sugerencia' | 'felicitacion';

export interface Pqr {
  id_pqr: number;
  tipo_pqr: TipoPqr;
  asunto_pqr: string;
  mensaje_pqr: string;
  estado_pqr: 'abierto' | 'en_proceso' | 'resuelto' | 'cerrado';
  respuesta_pqr: string | null;
  respondido_en_pqr: string | null;
  creado_en_pqr: string;
  id_u: number;
}

export interface CrearPqrPayload {
  tipo_pqr: TipoPqr;
  asunto_pqr: string;
  mensaje_pqr: string;
}

export const pqrService = {
  async misPqr(page = 1): Promise<Paginated<Pqr>> {
    return apiFetch(`/pqr?page=${page}`);
  },

  async crear(payload: CrearPqrPayload): Promise<Pqr> {
    const data = await apiFetch('/pqr', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return data.pqr;
  },
};
