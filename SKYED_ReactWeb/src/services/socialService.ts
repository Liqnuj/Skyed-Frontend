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



/* ---- Gestión administrativa de reservas (Administrador Social) ---- */

export type EstadoRese = 'pendiente' | 'confirmada' | 'cancelada' | 'completada';

/** Etapa interna de gestión: solo la ve el administrador. */
export type EtapaGestion =
  | 'nueva'
  | 'en_revision'
  | 'contactando_usuario'
  | 'pendiente_informacion'
  | 'en_planificacion'
  | 'pendiente_confirmacion'
  | 'reprogramada'
  | 'en_ejecucion';

/** Estado "visual" que el backend calcula para colorear lista y calendario. */
export type EstadoVisualReserva =
  | 'nueva'
  | 'en_planificacion'
  | 'confirmada'
  | 'reprogramada'
  | 'cancelada'
  | 'finalizada';

/** De dónde sale la fecha que se muestra: confirmada > propuesta > solicitada por el cliente. */
export type FechaTipoReserva = 'confirmada' | 'propuesta' | 'solicitada';

export interface ReservaAlerta {
  tipo: 'sin_revisar' | 'contacto_vencido' | 'preparacion_vencida' | 'preparacion_proxima';
  nivel: 'alta' | 'media';
  id_rese: number;
  mensaje: string;
}

export interface ReservaProximo {
  id_rese: number;
  titulo: string;
  fecha_inicio: string;
  fecha_tipo: FechaTipoReserva;
  estado_rese: EstadoRese;
  estado_visual: EstadoVisualReserva;
}

/** KPIs reales del panel (GET /reservas/resumen). */
export interface ResumenReservas {
  nuevas: number;
  por_contactar: number;
  eventos_hoy: number;
  eventos_semana: number;
  confirmadas: number;
  en_planificacion: number;
  por_estado: Partial<Record<EstadoRese, number>>;
  proximos: ReservaProximo[];
  alertas: ReservaAlerta[];
}

/** Evento del calendario (GET /reservas/calendario). */
export interface EventoCalendario {
  id_rese: number;
  titulo: string;
  fecha_inicio: string;
  fecha_fin: string;
  fecha_tipo: FechaTipoReserva;
  aproximada: boolean;
  hora_inicio: string | null;
  hora_fin: string | null;
  estado_rese: EstadoRese;
  etapa_gestion: EtapaGestion | null;
  estado_visual: EstadoVisualReserva;
  tipo_evento: { id_tipo_eves: number; nombre: string } | null;
  lugar: string | null;
  usuario: string;
  invitados: number | null;
  responsable: string | null;
}

/** Filtros del listado del administrador (GET /reservas). */
export interface FiltrosReservasAdmin {
  q?: string;
  estado?: EstadoRese | '';
  etapa?: EtapaGestion | '';
  id_tipo_eves?: number | '';
  id_responsable?: number | '';
  id_a?: number | '';
  lugar?: string;
  desde?: string;
  hasta?: string;
  orden?: 'recientes' | 'fecha' | 'fecha_desc' | 'estado';
  page?: number;
  per_page?: number;
  ocultas?: boolean;
}

/** Fila del listado del administrador: la reserva con su ficha de gestión. */
export interface ReservaAdmin extends Reserva {
  usuario?: { id_u?: number; nombre_u?: string; apellido_u?: string; correo_u?: string };
  tipo_evento?: { id_tipo_eves: number; nombre_tipo_eves: string } | null;
  gestion?: {
    etapa_gestion: EtapaGestion;
    fecha_propuesta: string | null;
    fecha_confirmada: string | null;
    hora_inicio: string | null;
    hora_fin: string | null;
    contactado: boolean;
    responsable?: { id_u: number; nombre_u: string; apellido_u: string } | null;
    ambiente?: { id_a: number; nombre_a: string; capacidad_a?: number | null } | null;
  } | null;
}

export interface ResponsableReserva {
  id_u: number;
  nombre_u: string;
  apellido_u: string;
}


/* ---- Detalle de una reserva para el Administrador Social ---- */

export type TipoCampo = 'texto' | 'textarea' | 'numero' | 'booleano' | 'seleccion';

/** Campo propio del tipo de evento. La API lo define; el formulario se dibuja con esto. */
export interface CampoTipo {
  clave: string;
  etiqueta: string;
  tipo: TipoCampo;
  opciones: string[];
  requerido_para_confirmar: boolean;
}

export type EstadoServicioReserva = 'pendiente' | 'confirmado' | 'no_disponible';

export interface ServicioReserva {
  id_rs: number;
  id_s: number | null;
  nombre_servicio: string;
  cantidad: number;
  origen: 'cliente' | 'admin';
  estado: EstadoServicioReserva;
  id_responsable: number | null;
  observaciones: string | null;
  servicio?: { id_s: number; nombre_s: string } | null;
  responsable?: { id_u: number; nombre_u: string; apellido_u: string } | null;
}

export type TipoSeguimiento =
  | 'creacion' | 'cambio_estado' | 'cambio_etapa' | 'cambio_fecha'
  | 'contacto' | 'edicion' | 'servicio' | 'nota_interna' | 'actualizacion';

/** Entrada de la línea de tiempo. `visible_usuario = false` es interna: el cliente no la ve. */
export interface SeguimientoAdmin {
  id_seguimiento: number;
  fecha_actualizacion: string | null;
  comentario: string | null;
  id_admin: number | null;
  tipo_evento: TipoSeguimiento;
  estado_anterior: string | null;
  estado_nuevo: string | null;
  visible_usuario: boolean;
  administrador?: { id_u: number; nombre_u: string; apellido_u: string } | null;
}

export interface DecoracionReserva {
  requiere?: boolean | null;
  tipo?: string | null;
  tematica?: string | null;
  colores?: string | null;
  elementos?: string | null;
  montaje?: string | null;
  observaciones?: string | null;
  estado?: 'pendiente' | 'en_proceso' | 'listo' | 'no_aplica' | null;
}

export interface LogisticaReserva {
  montaje?: string | null;
  desmontaje?: string | null;
  personal?: string | null;
  equipos?: string | null;
  materiales?: string | null;
  transporte?: string | null;
  especiales?: string | null;
}

export interface GestionReserva {
  etapa_gestion: EtapaGestion;
  id_responsable: number | null;
  fecha_propuesta: string | null;
  fecha_confirmada: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  fecha_limite_preparacion: string | null;
  id_a: number | null;
  asistentes_final: number | null;
  distribucion_espacio: string | null;
  necesidades_especiales: string | null;
  requerimientos_adicionales: string | null;
  decoracion: DecoracionReserva | null;
  logistica: LogisticaReserva | null;
  datos_tipo: Record<string, string | number | boolean | null> | null;
  contactado: boolean;
  ultimo_contacto_en: string | null;
  medio_ultimo_contacto: string | null;
  proximo_contacto_en: string | null;
  compromisos: string | null;
  responsable?: { id_u: number; nombre_u: string; apellido_u: string } | null;
  ambiente?: { id_a: number; nombre_a: string; capacidad_a?: number | null } | null;
}

export interface ReservaDetalle extends Omit<Reserva, 'seguimientos'> {
  fecha_hasta_rese?: string | null;
  hora_aprox_rese?: string | null;
  duracion_horas_rese?: number | null;
  usuario?: {
    id_u: number;
    nombre_u: string;
    apellido_u: string;
    correo_u: string;
    telefono_u?: string | null;
    ciudad_u?: string | null;
    tipo_documento_u?: string | null;
    documento_u?: string | null;
  };
  tipo_evento?: { id_tipo_eves: number; nombre_tipo_eves: string } | null;
  gestion: GestionReserva | null;
  servicios: ServicioReserva[];
  seguimientos: SeguimientoAdmin[];
}

export interface MetaReserva {
  grupo_tipo: string;
  campos_tipo: CampoTipo[];
  etapas: Record<EtapaGestion, string>;
  etapas_permitidas: EtapaGestion[];
  estados_permitidos: Array<'confirmada' | 'completada' | 'cancelada'>;
  medios_contacto: string[];
  estado_visual: EstadoVisualReserva;
  fecha_efectiva: {
    inicio: string;
    fin: string;
    tipo: FechaTipoReserva;
    aproximada: boolean;
    hora_inicio: string | null;
    hora_fin: string | null;
  };
}

export interface RespuestaDetalleReserva {
  message?: string;
  reserva: ReservaDetalle;
  meta: MetaReserva;
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

  /* ---- Panel del Administrador Social ---- */

  /** Listado con búsqueda y filtros. Los filtros vacíos no se envían. */
  async listarAdmin(filtros: FiltrosReservasAdmin = {}): Promise<Paginated<ReservaAdmin>> {
    const qs = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '' || v === false) return;
      qs.set(k, v === true ? '1' : String(v));
    });
    const texto = qs.toString();
    return apiFetch(`/reservas${texto ? `?${texto}` : ''}`);
  },

  /** KPIs, próximos eventos y alertas del inicio del panel. */
  async resumen(): Promise<ResumenReservas> {
    const data = await apiFetch('/reservas/resumen');
    return data.resumen;
  },

  /** Eventos que tocan el rango (máx. 100 días). Fechas en formato Y-m-d. */
  async calendario(
    desde: string,
    hasta: string,
    extra: { estado?: EstadoRese; id_tipo_eves?: number } = {},
  ): Promise<EventoCalendario[]> {
    const qs = new URLSearchParams({ desde, hasta });
    if (extra.estado) qs.set('estado', extra.estado);
    if (extra.id_tipo_eves) qs.set('id_tipo_eves', String(extra.id_tipo_eves));
    const data = await apiFetch(`/reservas/calendario?${qs.toString()}`);
    return data.eventos ?? [];
  },

  /** Administradores sociales a quienes se puede asignar una reserva. */
  async responsables(): Promise<ResponsableReserva[]> {
    const data = await apiFetch('/reservas/responsables');
    return data.responsables ?? data.data ?? [];
  },

  /** El admin abre la reserva: si era "nueva" pasa a "en revisión". */
  async abrir(id: number): Promise<void> {
    await apiFetch(`/reservas/${id}/abrir`, { method: 'POST' });
  },

  /** Cambia el estado oficial respetando las transiciones del backend. */
  async cambiarEstadoAdmin(
    id: number,
    estado: 'confirmada' | 'completada' | 'cancelada',
    comentarios: { comentario_publico?: string; nota_interna?: string } = {},
  ): Promise<RespuestaDetalleReserva> {
    return apiFetch(`/reservas/${id}/estado`, {
      method: 'POST',
      body: JSON.stringify({ estado, ...comentarios }),
    });
  },

  /** Detalle completo (solo administrador): reserva + ficha de gestión + historial + meta. */
  async detalle(id: number): Promise<RespuestaDetalleReserva> {
    return apiFetch(`/reservas/${id}`);
  },

  /** Guarda la planificación administrativa (el cliente nunca ve estos datos como suyos). */
  async guardarGestion(id: number, payload: Record<string, unknown>): Promise<RespuestaDetalleReserva> {
    return apiFetch(`/reservas/${id}/gestion`, { method: 'PUT', body: JSON.stringify(payload) });
  },

  async cambiarEtapa(id: number, etapa: EtapaGestion, nota_interna?: string): Promise<RespuestaDetalleReserva> {
    return apiFetch(`/reservas/${id}/etapa`, {
      method: 'POST',
      body: JSON.stringify({ etapa, ...(nota_interna ? { nota_interna } : {}) }),
    });
  },

  async registrarContacto(
    id: number,
    datos: { medio: string; observaciones?: string; compromisos?: string; proximo_contacto_en?: string },
  ): Promise<RespuestaDetalleReserva> {
    return apiFetch(`/reservas/${id}/contacto`, { method: 'POST', body: JSON.stringify(datos) });
  },

  /** Nota interna: solo la ven administradores. */
  async agregarNota(id: number, nota: string): Promise<RespuestaDetalleReserva> {
    return apiFetch(`/reservas/${id}/nota`, { method: 'POST', body: JSON.stringify({ nota }) });
  },

  async agregarServicio(
    id: number,
    datos: { id_s?: number; nombre_servicio?: string; cantidad?: number; observaciones?: string },
  ): Promise<RespuestaDetalleReserva> {
    return apiFetch(`/reservas/${id}/servicios`, { method: 'POST', body: JSON.stringify(datos) });
  },

  async actualizarServicio(
    id: number,
    servicioId: number,
    datos: Partial<Pick<ServicioReserva, 'nombre_servicio' | 'cantidad' | 'estado' | 'id_responsable' | 'observaciones'>>,
  ): Promise<RespuestaDetalleReserva> {
    return apiFetch(`/reservas/${id}/servicios/${servicioId}`, { method: 'PUT', body: JSON.stringify(datos) });
  },

  async quitarServicio(id: number, servicioId: number): Promise<RespuestaDetalleReserva> {
    return apiFetch(`/reservas/${id}/servicios/${servicioId}`, { method: 'DELETE' });
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
