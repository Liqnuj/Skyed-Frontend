import { apiFetch } from './api';

/* ================================================================
   RESPUESTAS PAGINADAS DE LARAVEL
================================================================ */

export interface Paginated<T> {
  current_page: number;
  data: T[];
  per_page: number;
  total: number;
  last_page: number;
}

/* ================================================================
   SERVICIOS
================================================================ */

export interface Servicio {
  id_s: number;
  nombre_s: string;
  descripcion_s: string | null;
}

export interface CrearServicioPayload {
  nombre_s: string;
  descripcion_s?: string;
}

export interface ActualizarServicioPayload {
  nombre_s?: string;
  descripcion_s?: string;
}

export const servicioService = {
  async listar(page = 1): Promise<Paginated<Servicio>> {
    return apiFetch(`/servicios?page=${page}`);
  },

  async obtener(id: number): Promise<Servicio> {
    const data = await apiFetch(`/servicios/${id}`);
    return data.servicio;
  },

  async crear(payload: CrearServicioPayload): Promise<Servicio> {
    const data = await apiFetch('/servicios', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return data.servicio;
  },

  async actualizar(
    id: number,
    payload: ActualizarServicioPayload
  ): Promise<Servicio> {
    const data = await apiFetch(`/servicios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    return data.servicio;
  },

  async eliminar(id: number): Promise<void> {
    await apiFetch(`/servicios/${id}`, {
      method: 'DELETE',
    });
  },
};

/* ================================================================
   AMBIENTES
================================================================ */

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

export interface ActualizarAmbientePayload {
  nombre_a?: string;
  descripcion_a?: string;
  capacidad_a?: number;
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

  async actualizar(
    id: number,
    payload: ActualizarAmbientePayload
  ): Promise<Ambiente> {
    const data = await apiFetch(`/ambientes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    return data.ambiente;
  },

  async eliminar(id: number): Promise<void> {
    await apiFetch(`/ambientes/${id}`, {
      method: 'DELETE',
    });
  },

  async asignarServicio(
    idAmbiente: number,
    idServicio: number
  ): Promise<Ambiente> {
    const data = await apiFetch(
      `/ambientes/${idAmbiente}/servicios`,
      {
        method: 'POST',
        body: JSON.stringify({
          id_s: idServicio,
        }),
      }
    );

    return data.ambiente;
  },
};

/* ================================================================
   TIPOS DE EVENTO
================================================================ */

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

/* ================================================================
   EVENTOS SOCIALES
================================================================ */

export interface EventoSocial {
  id_er: number;
  nombre_er: string;
  descripcion_er: string | null;
  fecha_er: string | null;
  estado_er: 'activo' | 'inactivo';
  id_tipo_eves: number;
  id_a: number;
  id_u: number | null;

  tipoEvento?: {
    id_tipo_eves: number;
    nombre_tipo_eves: string;
  };

  ambiente?: Ambiente;
}

export interface CrearEventoSocialPayload {
  nombre_er: string;
  descripcion_er?: string;
  fecha_er?: string;
  id_tipo_eves: number;
  id_a: number;
}

export interface ActualizarEventoSocialPayload {
  nombre_er?: string;
  descripcion_er?: string;
  fecha_er?: string;
  id_tipo_eves?: number;
  id_a?: number;
}

export const eventoSocialService = {
  async listar(page = 1): Promise<Paginated<EventoSocial>> {
    return apiFetch(`/eventos-sociales?page=${page}`);
  },

  async obtener(id: number): Promise<EventoSocial> {
    const data = await apiFetch(`/eventos-sociales/${id}`);
    return data.evento;
  },

  async crear(
    payload: CrearEventoSocialPayload
  ): Promise<EventoSocial> {
    const data = await apiFetch('/eventos-sociales', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return data.evento;
  },

  async actualizar(
    id: number,
    payload: ActualizarEventoSocialPayload
  ): Promise<EventoSocial> {
    const data = await apiFetch(`/eventos-sociales/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    return data.evento;
  },

  async cambiarEstado(
    id: number,
    estado_er: 'activo' | 'inactivo'
  ): Promise<EventoSocial> {
    const data = await apiFetch(
      `/eventos-sociales/${id}/estado`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          estado_er,
        }),
      }
    );

    return data.evento;
  },

  async eliminar(id: number): Promise<void> {
    await apiFetch(`/eventos-sociales/${id}`, {
      method: 'DELETE',
    });
  },
};

/* ================================================================
   RESERVAS
================================================================ */

export type EstadoReserva =
  | 'pendiente'
  | 'confirmada'
  | 'cancelada'
  | 'completada';

export interface Reserva {
  id_rese: number;
  fecha_evento_rese: string;
  invitados_rese: number;
  presupuesto_rese: string;
  ubicacion_rese: string;
  Observaciones_rese: string;
  total_rese: string;
  estado_rese: EstadoReserva;
  id_u: number;
  id_er: number;

  usuario?: {
    id_u: number;
    nombre_u?: string;
    apellido_u?: string;
    correo_u?: string;
  };

  evento?: EventoSocial;

  seguimientos?: SeguimientoReserva[];
}

export interface CrearReservaPayload {
  fecha_evento_rese: string;
  invitados_rese: number;
  presupuesto_rese: number;
  ubicacion_rese: string;
  Observaciones_rese: string;
  id_er: number;
}

export interface ActualizarReservaPayload {
  fecha_evento_rese?: string;
  invitados_rese?: number;
  presupuesto_rese?: number;
  ubicacion_rese?: string;
  Observaciones_rese?: string;
  total_rese?: number;
  estado_rese?: EstadoReserva;
}

export interface SeguimientoReserva {
  id_seguimiento_rese?: number;
  comentario: string;
  creado_en_seguimiento_rese?: string;
}

export const reservaService = {
  async listar(page = 1): Promise<Paginated<Reserva>> {
    return apiFetch(`/reservas?page=${page}`);
  },

  async obtener(id: number): Promise<Reserva> {
    const data = await apiFetch(`/reservas/${id}`);
    return data.reserva;
  },

  async crear(
    payload: CrearReservaPayload
  ): Promise<Reserva> {
    const data = await apiFetch('/reservas', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return data.reserva;
  },

  async actualizar(
    id: number,
    payload: ActualizarReservaPayload
  ): Promise<Reserva> {
    const data = await apiFetch(`/reservas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    return data.reserva;
  },

  async eliminar(id: number): Promise<void> {
    await apiFetch(`/reservas/${id}`, {
      method: 'DELETE',
    });
  },

  async agregarSeguimiento(
    id: number,
    comentario: string
  ): Promise<SeguimientoReserva> {
    const data = await apiFetch(
      `/reservas/${id}/seguimiento`,
      {
        method: 'POST',
        body: JSON.stringify({
          comentario,
        }),
      }
    );

    return data.seguimiento;
  },
};

/* ================================================================
   PQR
================================================================ */

export type TipoPqr =
  | 'peticion'
  | 'queja'
  | 'reclamo'
  | 'sugerencia'
  | 'felicitacion';

export type EstadoPqr =
  | 'abierto'
  | 'en_proceso'
  | 'resuelto'
  | 'cerrado';

export interface Pqr {
  id_pqr: number;
  tipo_pqr: TipoPqr;
  asunto_pqr: string;
  mensaje_pqr: string;
  estado_pqr: EstadoPqr;
  respuesta_pqr: string | null;
  respondido_en_pqr: string | null;
  creado_en_pqr: string;
  id_u: number;

  usuario?: {
    id_u: number;
    nombre_u?: string;
    apellido_u?: string;
    correo_u?: string;
  };
}

export interface CrearPqrPayload {
  tipo_pqr: TipoPqr;
  asunto_pqr: string;
  mensaje_pqr: string;
}

export interface ActualizarPqrPayload {
  estado_pqr?: EstadoPqr;
  respuesta_pqr?: string | null;
}

export const pqrService = {
  async listar(page = 1): Promise<Paginated<Pqr>> {
    return apiFetch(`/pqr?page=${page}`);
  },

  async obtener(id: number): Promise<Pqr> {
    const data = await apiFetch(`/pqr/${id}`);
    return data.pqr;
  },

  async crear(payload: CrearPqrPayload): Promise<Pqr> {
    const data = await apiFetch('/pqr', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return data.pqr;
  },

  async actualizar(
    id: number,
    payload: ActualizarPqrPayload
  ): Promise<Pqr> {
    const data = await apiFetch(`/pqr/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    return data.pqr;
  },
};