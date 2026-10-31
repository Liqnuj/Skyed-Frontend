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
  imagen_er?: string | null;
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

/** Entrada del historial de una reserva (tabla de seguimientos). */
export interface SeguimientoReserva {
  fecha_actualizacion: string | null;
  comentario: string | null;
}

export interface Reserva {
  id_rese: number;
  /** Nombre que el cliente le pone a su reserva (opcional). */
  nombre_rese?: string | null;
  fecha_evento_rese: string;
  invitados_rese: number;
  presupuesto_rese: string;
  ubicacion_rese: string;
  Observaciones_rese: string;
  total_rese: string;
  estado_rese: 'pendiente' | 'confirmada' | 'cancelada' | 'completada';
  creado_en_rese?: string | null;
  id_u: number;
  id_er: number;
  /** Tipo de evento que el cliente eligió al reservar (Boda, Cumpleaños, ...). */
  id_tipo_eves?: number | null;
  tipoEvento?: { id_tipo_eves: number; nombre_tipo_eves: string } | null;
  evento?: EventoSocial;
  seguimientos?: SeguimientoReserva[];
}

export interface CrearReservaPayload {
  nombre_rese?: string;
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

  /** El cliente le pone (o quita, con texto vacío) el nombre a su reserva. */
  async renombrar(id: number, nombre: string): Promise<Pick<Reserva, 'id_rese' | 'nombre_rese'>> {
    const data = await apiFetch(`/reservas/${id}/nombre`, {
      method: 'PATCH',
      body: JSON.stringify({ nombre_rese: nombre }),
    });
    return data.reserva;
  },


    /** El cliente cancela su propia reserva (pendiente o confirmada). Motivo opcional. */
  async cancelar(id: number, motivo?: string): Promise<Reserva> {
    const data = await apiFetch(`/reservas/${id}/cancelar`, {
      method: 'POST',
      body: JSON.stringify({ motivo: motivo || null }),
    });
    return data.reserva;
  },
  
};

/* ---------------------------------------------------------------- */
/*  PQR                                                                */
/* ---------------------------------------------------------------- */

export type TipoPqr = 'peticion' | 'queja' | 'reclamo' | 'sugerencia' | 'felicitacion';

/** Fases de una PQR, en orden. "abierto" se muestra como "Radicada". */
export type EstadoPqr = 'abierto' | 'en_revision' | 'en_proceso' | 'resuelto' | 'cerrado';

export type TipoEventoPqr =
  | 'radicacion'
  | 'cambio_estado'
  | 'comentario'
  | 'respuesta'
  | 'nota_interna'
  | 'migracion'
  | 'respuesta_cliente'
  | 'solicitud_informacion';

/** Un paso del seguimiento. `nota_interna` solo llega a administradores. */
export interface PqrSeguimiento {
  id_seguimiento: number;
  tipo_evento: TipoEventoPqr;
  estado_anterior: EstadoPqr | null;
  estado_nuevo: EstadoPqr;
  comentario_publico: string | null;
  nota_interna?: string | null;
  autor: string;
  created_at: string;
}

export interface PqrUsuario {
  id_u: number;
  nombre_u?: string;
  apellido_u?: string;
  correo_u?: string;
  telefono_u?: string | null;
}

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
  radicado: string;
  estado_etiqueta: string;
  /** ISO. Null en las felicitaciones (no tienen plazo). */
  fecha_limite: string | null;
  vencida: boolean;
  /** ISO de la última actuación visible para quien consulta. */
  ultima_actuacion_en?: string | null;
  usuario?: PqrUsuario;
  /** Solo viene al consultar una PQR puntual (GET /pqr/{id}). */
  seguimientos?: PqrSeguimiento[];
}

export interface CrearPqrPayload {
  tipo_pqr: TipoPqr;
  asunto_pqr: string;
  mensaje_pqr: string;
}

/** Cualquier combinación; el backend exige al menos una. */
export interface RegistrarSeguimientoPayload {
  estado_pqr?: EstadoPqr;
  /** Mensaje que ve el usuario en su seguimiento. */
  comentario_publico?: string;
  /** Respuesta oficial; obligatoria al pasar a "resuelto". */
  respuesta_pqr?: string;
  /** Solo la ven los administradores. */
  nota_interna?: string;
}

export const pqrService = {
  /** Las PQR que radicó el usuario actual (aunque sea administrador). */
  async misPqr(page = 1): Promise<Paginated<Pqr>> {
    return apiFetch(`/pqr?mias=1&per_page=50&page=${page}`);
  },

  /** Una PQR con su seguimiento completo. */
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

  /** El dueño de la PQR escribe un mensaje más en su seguimiento. */
  async responder(id: number, mensaje: string): Promise<PqrSeguimiento> {
    const data = await apiFetch(`/pqr/${id}/responder`, {
      method: 'POST',
      body: JSON.stringify({ mensaje }),
    });
    return data.seguimiento;
  },



  /**
   * Solo adminSocial: el administrador abrió el detalle. Si la PQR estaba
   * "abierto", el backend la pasa a "en_revision" (cambio = true).
   */
  async abrir(id: number): Promise<{ pqr: Pqr; cambio: boolean }> {
    const data = await apiFetch(`/pqr/${id}/abrir`, { method: 'POST' });
    return { pqr: data.pqr, cambio: Boolean(data.cambio) };
  },

  /** Solo adminSocial: "en_revision" → "en_proceso". */
  async iniciarGestion(id: number): Promise<Pqr> {
    const data = await apiFetch(`/pqr/${id}/iniciar-gestion`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    return data.pqr;
  },

  /** Solo adminSocial: guarda la respuesta y pasa "en_proceso" → "resuelto". */
  async resolver(id: number, respuesta: string, notaInterna?: string): Promise<Pqr> {
    const data = await apiFetch(`/pqr/${id}/resolver`, {
      method: 'POST',
      body: JSON.stringify({
        respuesta,
        ...(notaInterna ? { nota_interna: notaInterna } : {}),
      }),
    });
    return data.pqr;
  },


  /** Solo adminSocial: cambia de fase y/o escribe al usuario. */
  async registrarSeguimiento(id: number, payload: RegistrarSeguimientoPayload): Promise<Pqr> {
    const data = await apiFetch(`/pqr/${id}/seguimiento`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return data.pqr;
  },
};

/* ---------- Testimonios ---------- */

/** Tarjeta pública de la página principal de SkyedSocial. */
export interface TestimonioPublico {
  id_tes: number;
  /** "María R." (nunca el apellido completo). */
  nombre: string;
  iniciales: string;
  /** "Boda · Bogotá" */
  rol: string;
  /** Nombre del evento ("Boda en jardín"). */
  evento: string;
  calificacion: number;
  comentario: string;
  fecha: string | null;
}

/** La reseña tal como la ve quien la escribió. */
export interface MiTestimonio {
  id_tes: number;
  id_rese: number;
  calificacion: number;
  comentario: string;
  estado: string;
  fecha: string | null;
}

export interface TestimonioPayload {
  calificacion_tes: number;
  comentario_tes: string;
}

export const testimonioService = {
  /** Público: no necesita sesión. */
  async publicos(limite = 9): Promise<{ data: TestimonioPublico[]; total: number }> {
    return apiFetch(`/testimonios?limite=${limite}`);
  },

  /** La reseña que dejé en esa reserva, o null si todavía no escribí ninguna. */
  async deReserva(idRese: number): Promise<MiTestimonio | null> {
    const res = await apiFetch(`/reservas/${idRese}/testimonio`);
    return res.data ?? null;
  },

  async crear(idRese: number, payload: TestimonioPayload): Promise<MiTestimonio> {
    const res = await apiFetch(`/reservas/${idRese}/testimonio`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async editar(id: number, payload: TestimonioPayload): Promise<MiTestimonio> {
    const res = await apiFetch(`/testimonios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async eliminar(id: number): Promise<void> {
    await apiFetch(`/testimonios/${id}`, { method: 'DELETE' });
  },
};
