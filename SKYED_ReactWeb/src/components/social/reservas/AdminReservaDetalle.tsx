import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ArrowLeft, CalendarClock, Info, Layers, Loader2, Lock, Package, Pencil, Phone, Plus, RefreshCw, Save, Trash2,
} from 'lucide-react';
import { apiFetch } from '../../../services/api';
import { reservaService } from '../../../services/socialService';
import type {
  EtapaGestion,
  MetaReserva,
  ReservaDetalle,
  ResponsableReserva,
  ServicioReserva,
  TipoSeguimiento,
} from '../../../services/socialService';
import {
  ESTADO_RESE_LABEL,
  ESTADO_VISUAL_LABEL,
  ETAPA_LABEL,
  FECHA_TIPO_LABEL,
  fechaCorta,
} from '../../../utils/reservasAdmin';
import '../../../styles/social/reservasDetalle.css';

interface Props {
  id: number;
  onBack: () => void;
  /** Avisa al panel que algo cambió (para refrescar KPIs y lista). */
  onChanged: () => Promise<void> | void;
  notify: (mensaje: string) => void;
  confirmar: (o: { titulo: string; mensaje: string; confirmar: string }) => Promise<boolean>;
}

/* ------------------------------ formulario ------------------------------ */

interface Form {
  id_responsable: string;
  fecha_propuesta: string;
  fecha_confirmada: string;
  hora_inicio: string;
  hora_fin: string;
  fecha_limite_preparacion: string;
  id_a: string;
  asistentes_final: string;
  distribucion_espacio: string;
  necesidades_especiales: string;
  requerimientos_adicionales: string;
  decoracion: Record<'requiere' | 'tipo' | 'tematica' | 'colores' | 'elementos' | 'montaje' | 'observaciones' | 'estado', string | boolean>;
  logistica: Record<'montaje' | 'desmontaje' | 'personal' | 'equipos' | 'materiales' | 'transporte' | 'especiales', string>;
  datos_tipo: Record<string, string | boolean>;
}

const d10 = (v?: string | null) => (v ? v.slice(0, 10) : '');
const h5 = (v?: string | null) => (v ? v.slice(0, 5) : '');
const txt = (v?: string | null) => v ?? '';

function formDesde(r: ReservaDetalle, meta: MetaReserva): Form {
  const g = r.gestion;
  const dec = g?.decoracion ?? {};
  const log = g?.logistica ?? {};
  const datos: Record<string, string | boolean> = {};
  meta.campos_tipo.forEach((c) => {
    const v = g?.datos_tipo?.[c.clave];
    datos[c.clave] = c.tipo === 'booleano' ? Boolean(v) : v === null || v === undefined ? '' : String(v);
  });
  return {
    id_responsable: g?.id_responsable ? String(g.id_responsable) : '',
    fecha_propuesta: d10(g?.fecha_propuesta),
    fecha_confirmada: d10(g?.fecha_confirmada),
    hora_inicio: h5(g?.hora_inicio),
    hora_fin: h5(g?.hora_fin),
    fecha_limite_preparacion: d10(g?.fecha_limite_preparacion),
    id_a: g?.id_a ? String(g.id_a) : '',
    asistentes_final: g?.asistentes_final ? String(g.asistentes_final) : '',
    distribucion_espacio: txt(g?.distribucion_espacio),
    necesidades_especiales: txt(g?.necesidades_especiales),
    requerimientos_adicionales: txt(g?.requerimientos_adicionales),
    decoracion: {
      requiere: Boolean(dec.requiere),
      tipo: txt(dec.tipo), tematica: txt(dec.tematica), colores: txt(dec.colores),
      elementos: txt(dec.elementos), montaje: txt(dec.montaje), observaciones: txt(dec.observaciones),
      estado: dec.estado ?? '',
    },
    logistica: {
      montaje: txt(log.montaje), desmontaje: txt(log.desmontaje), personal: txt(log.personal),
      equipos: txt(log.equipos), materiales: txt(log.materiales), transporte: txt(log.transporte),
      especiales: txt(log.especiales),
    },
    datos_tipo: datos,
  };
}

const nulo = (v: string) => (v.trim() === '' ? null : v.trim());

function payloadDesde(f: Form, meta: MetaReserva): Record<string, unknown> {
  const dec: Record<string, unknown> = {};
  (Object.keys(f.decoracion) as Array<keyof Form['decoracion']>).forEach((k) => {
    const v = f.decoracion[k];
    dec[k] = typeof v === 'boolean' ? v : nulo(v);
  });
  const log: Record<string, unknown> = {};
  (Object.keys(f.logistica) as Array<keyof Form['logistica']>).forEach((k) => { log[k] = nulo(f.logistica[k]); });
  const datos: Record<string, unknown> = {};
  meta.campos_tipo.forEach((c) => {
    const v = f.datos_tipo[c.clave];
    if (c.tipo === 'booleano') datos[c.clave] = Boolean(v);
    else if (c.tipo === 'numero') datos[c.clave] = typeof v === 'string' && v.trim() !== '' ? Number(v) : null;
    else datos[c.clave] = typeof v === 'string' ? nulo(v) : null;
  });
  return {
    id_responsable: f.id_responsable ? Number(f.id_responsable) : null,
    fecha_propuesta: f.fecha_propuesta || null,
    fecha_confirmada: f.fecha_confirmada || null,
    hora_inicio: f.hora_inicio || null,
    hora_fin: f.hora_fin || null,
    fecha_limite_preparacion: f.fecha_limite_preparacion || null,
    id_a: f.id_a ? Number(f.id_a) : null,
    asistentes_final: f.asistentes_final ? Number(f.asistentes_final) : null,
    distribucion_espacio: nulo(f.distribucion_espacio),
    necesidades_especiales: nulo(f.necesidades_especiales),
    requerimientos_adicionales: nulo(f.requerimientos_adicionales),
    decoracion: dec,
    logistica: log,
    datos_tipo: datos,
  };
}

/* ------------------------------ utilidades UI ------------------------------ */

const ICONO_TIPO: Record<TipoSeguimiento, ReactNode> = {
  creacion: <Plus size={14} />,
  cambio_estado: <RefreshCw size={14} />,
  cambio_etapa: <Layers size={14} />,
  cambio_fecha: <CalendarClock size={14} />,
  contacto: <Phone size={14} />,
  edicion: <Pencil size={14} />,
  servicio: <Package size={14} />,
  nota_interna: <Lock size={14} />,
  actualizacion: <Info size={14} />,
};

const MEDIO_LABEL: Record<string, string> = {
  telefono: 'Teléfono', whatsapp: 'WhatsApp', correo: 'Correo', presencial: 'Presencial', otro: 'Otro',
};

const SERVICIO_ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Pendiente', confirmado: 'Confirmado', no_disponible: 'No disponible',
};

const DEC_ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Pendiente', en_proceso: 'En proceso', listo: 'Listo', no_aplica: 'No aplica',
};

const humano = (v: string) => v.replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase());

function fechaHora(v?: string | null) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    .format(d).replace('.', '');
}

function Tarjeta({ titulo, etiqueta, tono, children }: { titulo: string; etiqueta?: string; tono?: 'cliente' | 'admin' | 'interno'; children: ReactNode }) {
  return (
    <section className="admin-card det-card">
      <header className="det-card-head">
        <h3>{titulo}</h3>
        {etiqueta && <span className={`det-tag ${tono ?? ''}`}>{tono === 'interno' && <Lock size={11} />} {etiqueta}</span>}
      </header>
      {children}
    </section>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: ReactNode }) {
  return (
    <div className="det-dato">
      <span>{etiqueta}</span>
      <strong>{valor === null || valor === undefined || valor === '' ? '—' : valor}</strong>
    </div>
  );
}

function Campo({ etiqueta, ayuda, children, ancho }: { etiqueta: string; ayuda?: string; children: ReactNode; ancho?: boolean }) {
  return (
    <label className={`det-campo${ancho ? ' ancho' : ''}`}>
      <span>{etiqueta}</span>
      {children}
      {ayuda && <small>{ayuda}</small>}
    </label>
  );
}

/* ------------------------------ componente ------------------------------ */

export default function AdminReservaDetalle({ id, onBack, onChanged, notify, confirmar }: Props) {
  const [reserva, setReserva] = useState<ReservaDetalle | null>(null);
  const [meta, setMeta] = useState<MetaReserva | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [inicial, setInicial] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [responsables, setResponsables] = useState<ResponsableReserva[]>([]);
  const [ambientes, setAmbientes] = useState<Array<{ id_a: number; nombre_a: string; capacidad_a?: number }>>([]);
  const [catalogo, setCatalogo] = useState<Array<{ id_s: number; nombre_s: string }>>([]);
  const [errorForm, setErrorForm] = useState('');

  // paneles secundarios
  const [cambioEstado, setCambioEstado] = useState<null | 'confirmada' | 'completada' | 'cancelada'>(null);
  const [comentarioPublico, setComentarioPublico] = useState('');
  const [notaEstado, setNotaEstado] = useState('');
  const [contacto, setContacto] = useState({ medio: 'telefono', observaciones: '', compromisos: '', proximo: '' });
  const [nota, setNota] = useState('');
  const [nuevoServicio, setNuevoServicio] = useState({ id_s: '', nombre: '', cantidad: '1' });
  const [ocupado, setOcupado] = useState(false);

  const aplicar = useCallback((r: ReservaDetalle, m: MetaReserva) => {
    setReserva(r);
    setMeta(m);
    const f = formDesde(r, m);
    setForm(f);
    setInicial(JSON.stringify(f));
  }, []);

  const cargar = useCallback(async () => {
    setError('');
    try {
      // Abrir la reserva la pasa de "Nueva" a "En revisión" (queda en el historial).
      try { await reservaService.abrir(id); } catch { /* si ya está cerrada o no aplica, se sigue */ }
      const res = await reservaService.detalle(id);
      aplicar(res.reserva, res.meta);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la reserva.');
    } finally {
      setCargando(false);
    }
  }, [id, aplicar]);

  useEffect(() => {
    setCargando(true);
    void cargar();
    reservaService.responsables().then(setResponsables).catch(() => setResponsables([]));
    apiFetch('/ambientes').then((r) => setAmbientes(r.data ?? [])).catch(() => setAmbientes([]));
    apiFetch('/servicios').then((r) => setCatalogo(
      (r.data ?? []).map((s: any) => ({ id_s: s.id_s, nombre_s: s.nombre_s ?? s.nombre })),
    )).catch(() => setCatalogo([]));
  }, [cargar]);

  const sucio = !!form && JSON.stringify(form) !== inicial;
  const cerrada = reserva ? reserva.estado_rese === 'cancelada' || reserva.estado_rese === 'completada' : false;

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  // Validaciones de coherencia en pantalla (el backend las repite).
  const problemas = useMemo(() => {
    if (!form) return [] as string[];
    const p: string[] = [];
    if (form.hora_inicio && form.hora_fin && form.hora_fin <= form.hora_inicio) p.push('La hora final debe ser posterior a la hora de inicio.');
    const fechaEvento = form.fecha_confirmada || form.fecha_propuesta;
    if (form.fecha_limite_preparacion && fechaEvento && form.fecha_limite_preparacion > fechaEvento) {
      p.push('La fecha límite de preparación no puede ser posterior a la fecha del evento.');
    }
    if (form.asistentes_final && Number(form.asistentes_final) < 1) p.push('Los asistentes deben ser al menos 1.');
    const amb = ambientes.find((a) => String(a.id_a) === form.id_a);
    if (amb?.capacidad_a && form.asistentes_final && Number(form.asistentes_final) > amb.capacidad_a) {
      p.push(`Los asistentes superan la capacidad de ${amb.nombre_a} (${amb.capacidad_a}).`);
    }
    return p;
  }, [form, ambientes]);

  const ejecutar = async (fn: () => Promise<{ reserva: ReservaDetalle; meta: MetaReserva; message?: string }>, ok?: string) => {
    setOcupado(true);
    try {
      const res = await fn();
      aplicar(res.reserva, res.meta);
      notify(ok ?? res.message ?? 'Listo');
      await onChanged();
      return true;
    } catch (e) {
      notify(e instanceof Error ? e.message : 'No se pudo completar la acción.');
      return false;
    } finally {
      setOcupado(false);
    }
  };

  const guardar = async () => {
    if (!form || !meta || problemas.length) return;
    setGuardando(true);
    setErrorForm('');
    try {
      const res = await reservaService.guardarGestion(id, payloadDesde(form, meta));
      aplicar(res.reserva, res.meta);
      notify(res.message ?? 'Cambios guardados');
      await onChanged();
    } catch (e) {
      setErrorForm(e instanceof Error ? e.message : 'No se pudieron guardar los cambios.');
    } finally {
      setGuardando(false);
    }
  };

  const volver = async () => {
    if (sucio && !(await confirmar({ titulo: 'Cambios sin guardar', mensaje: 'Tienes cambios sin guardar. ¿Salir sin guardarlos?', confirmar: 'Salir' }))) return;
    onBack();
  };

  const confirmarCambioEstado = async () => {
    if (!cambioEstado || !reserva) return;
    if (sucio) { notify('Guarda primero los cambios de la planificación.'); return; }
    const ok = await ejecutar(
      () => reservaService.cambiarEstadoAdmin(id, cambioEstado, {
        ...(comentarioPublico.trim() ? { comentario_publico: comentarioPublico.trim() } : {}),
        ...(notaEstado.trim() ? { nota_interna: notaEstado.trim() } : {}),
      }),
      `Reserva ${ESTADO_RESE_LABEL[cambioEstado].toLowerCase()}`,
    );
    if (ok) { setCambioEstado(null); setComentarioPublico(''); setNotaEstado(''); }
  };

  const guardarContacto = async () => {
    const proximo = contacto.proximo ? new Date(contacto.proximo).toISOString() : undefined;
    const ok = await ejecutar(() => reservaService.registrarContacto(id, {
      medio: contacto.medio,
      ...(contacto.observaciones.trim() ? { observaciones: contacto.observaciones.trim() } : {}),
      ...(contacto.compromisos.trim() ? { compromisos: contacto.compromisos.trim() } : {}),
      ...(proximo ? { proximo_contacto_en: proximo } : {}),
    }), 'Contacto registrado');
    if (ok) setContacto({ medio: 'telefono', observaciones: '', compromisos: '', proximo: '' });
  };

  const guardarNota = async () => {
    if (!nota.trim()) return;
    const ok = await ejecutar(() => reservaService.agregarNota(id, nota.trim()), 'Nota interna guardada');
    if (ok) setNota('');
  };

  const agregarServicio = async () => {
    const idS = nuevoServicio.id_s ? Number(nuevoServicio.id_s) : undefined;
    if (!idS && !nuevoServicio.nombre.trim()) { notify('Elige un servicio o escribe un nombre.'); return; }
    const ok = await ejecutar(() => reservaService.agregarServicio(id, {
      ...(idS ? { id_s: idS } : { nombre_servicio: nuevoServicio.nombre.trim() }),
      cantidad: Math.max(1, Number(nuevoServicio.cantidad) || 1),
    }), 'Servicio agregado');
    if (ok) setNuevoServicio({ id_s: '', nombre: '', cantidad: '1' });
  };

  const quitarServicio = async (s: ServicioReserva) => {
    if (!(await confirmar({ titulo: 'Quitar servicio', mensaje: `¿Quitar "${s.nombre_servicio}" de la reserva?`, confirmar: 'Quitar' }))) return;
    await ejecutar(() => reservaService.quitarServicio(id, s.id_rs), 'Servicio quitado');
  };

  /* ------------------------------ render ------------------------------ */

  if (cargando) return <div className="det-estado"><Loader2 size={18} className="resx-spin" /> Cargando reserva…</div>;

  if (error || !reserva || !meta || !form) {
    return (
      <div className="det-estado">
        <p className="resx-error">{error || 'No se encontró la reserva.'}</p>
        <button type="button" className="secondary-btn" onClick={onBack}><ArrowLeft size={15} /> Volver a reservas</button>
      </div>
    );
  }

  const g = reserva.gestion;
  const u = reserva.usuario;
  const nombreCliente = `${u?.nombre_u ?? ''} ${u?.apellido_u ?? ''}`.trim();
  const titulo = reserva.nombre_rese || `${reserva.tipo_evento?.nombre_tipo_eves ?? 'Evento'} de ${nombreCliente || 'cliente'}`;
  const fe = meta.fecha_efectiva;
  const serviciosCliente = reserva.servicios.filter((s) => s.origen === 'cliente');
  const dec = form.decoracion;
  const requiereDec = Boolean(dec.requiere);

  const entradas = [...reserva.seguimientos].sort((a, b) =>
    (b.fecha_actualizacion ?? '').localeCompare(a.fecha_actualizacion ?? '') || b.id_seguimiento - a.id_seguimiento);

  return (
    <div className="det">
      {/* ---------- encabezado ---------- */}
      <div className="det-top">
        <button type="button" className="secondary-btn" onClick={() => void volver()}><ArrowLeft size={15} /> Reservas</button>
        <div className="det-titulo">
          <span className="card-kicker">RESERVA #{reserva.id_rese}</span>
          <h2>{titulo}</h2>
          <div className="det-chips">
            <span className={`admin-badge ${meta.estado_visual}`}>{ESTADO_VISUAL_LABEL[meta.estado_visual]}</span>
            <span className="det-chip">Estado: {ESTADO_RESE_LABEL[reserva.estado_rese]}</span>
            {g && !cerrada && <span className="det-chip">Etapa: {ETAPA_LABEL[g.etapa_gestion]}</span>}
            <span className={`det-chip fecha-${fe.tipo}`}>
              {fechaCorta(fe.inicio)}{fe.fin !== fe.inicio ? ` – ${fechaCorta(fe.fin)}` : ''} · {FECHA_TIPO_LABEL[fe.tipo]}{fe.aproximada ? ' (aproximada)' : ''}
            </span>
          </div>
        </div>
      </div>

      {cerrada && <div className="det-aviso">Esta reserva está {reserva.estado_rese === 'cancelada' ? 'cancelada' : 'completada'}: ya no se puede modificar. Puedes consultar todo su historial.</div>}

      {!cerrada && (
        <div className="admin-card det-acciones">
          <label className="det-campo inline">
            <span>Etapa de gestión (interna)</span>
            <select
              className="admin-select"
              value={g?.etapa_gestion ?? 'nueva'}
              disabled={ocupado}
              onChange={(e) => void ejecutar(() => reservaService.cambiarEtapa(id, e.target.value as EtapaGestion), 'Etapa actualizada')}
            >
              {g && <option value={g.etapa_gestion}>{ETAPA_LABEL[g.etapa_gestion]}</option>}
              {meta.etapas_permitidas.filter((et) => et !== g?.etapa_gestion).map((et) => <option key={et} value={et}>{meta.etapas[et] ?? ETAPA_LABEL[et]}</option>)}
            </select>
          </label>
          <div className="det-botones">
            {meta.estados_permitidos.map((es) => (
              <button
                key={es}
                type="button"
                className={es === 'cancelada' ? 'secondary-btn danger' : es === 'confirmada' ? 'primary-btn' : 'secondary-btn'}
                disabled={ocupado}
                onClick={() => setCambioEstado(cambioEstado === es ? null : es)}
              >
                {es === 'confirmada' ? 'Confirmar reserva' : es === 'completada' ? 'Marcar completada' : 'Cancelar reserva'}
              </button>
            ))}
          </div>
          {cambioEstado && (
            <div className="det-panel">
              <p>
                {cambioEstado === 'confirmada' && 'Para confirmar deben estar guardados la fecha confirmada y los datos obligatorios del tipo de evento.'}
                {cambioEstado === 'cancelada' && 'El cliente recibirá una notificación de la cancelación.'}
                {cambioEstado === 'completada' && 'La reserva quedará finalizada.'}
              </p>
              <Campo etiqueta="Mensaje para el cliente (opcional, lo verá en su historial)" ancho>
                <textarea rows={2} maxLength={500} value={comentarioPublico} onChange={(e) => setComentarioPublico(e.target.value)} />
              </Campo>
              <Campo etiqueta="Nota interna (opcional, solo administración)" ancho>
                <textarea rows={2} maxLength={1000} value={notaEstado} onChange={(e) => setNotaEstado(e.target.value)} />
              </Campo>
              <div className="det-botones">
                <button type="button" className="secondary-btn" onClick={() => setCambioEstado(null)}>Cancelar</button>
                <button type="button" className={cambioEstado === 'cancelada' ? 'secondary-btn danger' : 'primary-btn'} disabled={ocupado} onClick={() => void confirmarCambioEstado()}>
                  {ocupado ? 'Procesando…' : 'Aplicar cambio'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="det-grid">
        {/* ---------- columna principal ---------- */}
        <div className="det-col">
          <Tarjeta titulo="Cliente" etiqueta="Solo lectura" tono="cliente">
            <div className="det-datos">
              <Dato etiqueta="Nombre" valor={nombreCliente} />
              <Dato etiqueta="Correo" valor={u?.correo_u} />
              <Dato etiqueta="Teléfono" valor={u?.telefono_u} />
              <Dato etiqueta="Ciudad" valor={u?.ciudad_u} />
              <Dato etiqueta="Documento" valor={u?.documento_u ? `${u.tipo_documento_u ?? ''} ${u.documento_u}`.trim() : null} />
            </div>
          </Tarjeta>

          <Tarjeta titulo="Lo que pidió el cliente" etiqueta="Solo lectura" tono="cliente">
            <div className="det-datos">
              <Dato etiqueta="Tipo de evento" valor={reserva.tipo_evento?.nombre_tipo_eves ?? reserva.evento?.nombre_er} />
              <Dato etiqueta="Fecha solicitada" valor={`${fechaCorta(reserva.fecha_evento_rese)}${reserva.fecha_hasta_rese ? ` – ${fechaCorta(reserva.fecha_hasta_rese)} (fecha aproximada)` : ''}`} />
              <Dato etiqueta="Hora aproximada" valor={h5(reserva.hora_aprox_rese)} />
              <Dato etiqueta="Duración" valor={reserva.duracion_horas_rese ? `${reserva.duracion_horas_rese} h` : null} />
              <Dato etiqueta="Invitados" valor={reserva.invitados_rese} />
              <Dato etiqueta="Presupuesto" valor={reserva.presupuesto_rese ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(reserva.presupuesto_rese)) : null} />
              <Dato etiqueta="Ubicación deseada" valor={reserva.ubicacion_rese} />
            </div>
            {reserva.Observaciones_rese && <p className="det-texto"><strong>Observaciones:</strong> {reserva.Observaciones_rese}</p>}
            {serviciosCliente.length > 0 && (
              <p className="det-texto"><strong>Servicios solicitados:</strong> {serviciosCliente.map((s) => `${s.nombre_servicio}${s.cantidad > 1 ? ` ×${s.cantidad}` : ''}`).join(', ')}</p>
            )}
          </Tarjeta>

          <fieldset className="det-fieldset" disabled={cerrada || guardando}>
            <Tarjeta titulo="Planificación administrativa" etiqueta="Definido por administración" tono="admin">
              <div className="det-form">
                <Campo etiqueta="Responsable">
                  <select value={form.id_responsable} onChange={(e) => set('id_responsable', e.target.value)}>
                    <option value="">Sin asignar</option>
                    {responsables.map((r) => <option key={r.id_u} value={r.id_u}>{r.nombre_u} {r.apellido_u}</option>)}
                  </select>
                </Campo>
                <Campo etiqueta="Lugar / ambiente">
                  <select value={form.id_a} onChange={(e) => set('id_a', e.target.value)}>
                    <option value="">Sin definir</option>
                    {ambientes.map((a) => <option key={a.id_a} value={a.id_a}>{a.nombre_a}{a.capacidad_a ? ` (cap. ${a.capacidad_a})` : ''}</option>)}
                  </select>
                </Campo>
                <Campo etiqueta="Fecha propuesta" ayuda="La que se le sugiere al cliente; aún no es definitiva.">
                  <input type="date" value={form.fecha_propuesta} onChange={(e) => set('fecha_propuesta', e.target.value)} />
                </Campo>
                <Campo etiqueta="Fecha confirmada" ayuda="Fecha definitiva del evento. Si cambia en una reserva confirmada, queda como reprogramada.">
                  <input type="date" value={form.fecha_confirmada} onChange={(e) => set('fecha_confirmada', e.target.value)} />
                </Campo>
                <Campo etiqueta="Hora de inicio"><input type="time" value={form.hora_inicio} onChange={(e) => set('hora_inicio', e.target.value)} /></Campo>
                <Campo etiqueta="Hora final"><input type="time" value={form.hora_fin} onChange={(e) => set('hora_fin', e.target.value)} /></Campo>
                <Campo etiqueta="Fecha límite de preparación"><input type="date" value={form.fecha_limite_preparacion} onChange={(e) => set('fecha_limite_preparacion', e.target.value)} /></Campo>
                <Campo etiqueta="Asistentes confirmados" ayuda={`El cliente indicó ${reserva.invitados_rese}.`}>
                  <input type="number" min={1} max={100000} value={form.asistentes_final} onChange={(e) => set('asistentes_final', e.target.value)} />
                </Campo>
                <Campo etiqueta="Distribución del espacio" ancho><textarea rows={2} maxLength={2000} value={form.distribucion_espacio} onChange={(e) => set('distribucion_espacio', e.target.value)} /></Campo>
                <Campo etiqueta="Necesidades especiales" ancho><textarea rows={2} maxLength={2000} value={form.necesidades_especiales} onChange={(e) => set('necesidades_especiales', e.target.value)} /></Campo>
                <Campo etiqueta="Requerimientos adicionales" ancho><textarea rows={2} maxLength={2000} value={form.requerimientos_adicionales} onChange={(e) => set('requerimientos_adicionales', e.target.value)} /></Campo>
              </div>
            </Tarjeta>

            <Tarjeta titulo={`Datos del evento · ${meta.grupo_tipo.replaceAll('_', ' ')}`} etiqueta="Definido por administración" tono="admin">
              <div className="det-form">
                {meta.campos_tipo.map((c) => {
                  const et = `${c.etiqueta}${c.requerido_para_confirmar ? ' *' : ''}`;
                  const v = form.datos_tipo[c.clave];
                  const cambiar = (nuevo: string | boolean) => set('datos_tipo', { ...form.datos_tipo, [c.clave]: nuevo });
                  if (c.tipo === 'booleano') {
                    return (
                      <label key={c.clave} className="det-check">
                        <input type="checkbox" checked={Boolean(v)} onChange={(e) => cambiar(e.target.checked)} /> {et}
                      </label>
                    );
                  }
                  if (c.tipo === 'seleccion') {
                    return (
                      <Campo key={c.clave} etiqueta={et}>
                        <select value={String(v ?? '')} onChange={(e) => cambiar(e.target.value)}>
                          <option value="">Sin definir</option>
                          {c.opciones.map((o) => <option key={o} value={o}>{humano(o)}</option>)}
                        </select>
                      </Campo>
                    );
                  }
                  if (c.tipo === 'textarea') {
                    return <Campo key={c.clave} etiqueta={et} ancho><textarea rows={2} maxLength={1000} value={String(v ?? '')} onChange={(e) => cambiar(e.target.value)} /></Campo>;
                  }
                  return (
                    <Campo key={c.clave} etiqueta={et}>
                      <input
                        type={c.tipo === 'numero' ? 'number' : 'text'}
                        min={c.tipo === 'numero' ? 0 : undefined}
                        maxLength={c.tipo === 'texto' ? 150 : undefined}
                        value={String(v ?? '')}
                        onChange={(e) => cambiar(e.target.value)}
                      />
                    </Campo>
                  );
                })}
              </div>
              <small className="det-nota">* Obligatorio para poder confirmar la reserva.</small>
            </Tarjeta>

            <Tarjeta titulo="Decoración" etiqueta="Definido por administración" tono="admin">
              <label className="det-check">
                <input type="checkbox" checked={requiereDec} onChange={(e) => set('decoracion', { ...dec, requiere: e.target.checked })} /> El evento requiere decoración
              </label>
              {requiereDec && (
                <div className="det-form">
                  {(['tipo', 'tematica', 'colores'] as const).map((k) => (
                    <Campo key={k} etiqueta={humano(k === 'tematica' ? 'temática' : k)}>
                      <input type="text" maxLength={100} value={String(dec[k])} onChange={(e) => set('decoracion', { ...dec, [k]: e.target.value })} />
                    </Campo>
                  ))}
                  <Campo etiqueta="Estado de la decoración">
                    <select value={String(dec.estado)} onChange={(e) => set('decoracion', { ...dec, estado: e.target.value })}>
                      <option value="">Sin definir</option>
                      {Object.entries(DEC_ESTADO_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                  </Campo>
                  <Campo etiqueta="Elementos" ancho><textarea rows={2} maxLength={500} value={String(dec.elementos)} onChange={(e) => set('decoracion', { ...dec, elementos: e.target.value })} /></Campo>
                  <Campo etiqueta="Montaje" ancho><input type="text" maxLength={255} value={String(dec.montaje)} onChange={(e) => set('decoracion', { ...dec, montaje: e.target.value })} /></Campo>
                  <Campo etiqueta="Observaciones" ancho><textarea rows={2} maxLength={500} value={String(dec.observaciones)} onChange={(e) => set('decoracion', { ...dec, observaciones: e.target.value })} /></Campo>
                </div>
              )}
            </Tarjeta>

            <Tarjeta titulo="Logística" etiqueta="Definido por administración" tono="admin">
              <div className="det-form">
                {(['montaje', 'desmontaje', 'personal', 'equipos', 'materiales', 'transporte', 'especiales'] as const).map((k) => (
                  <Campo key={k} etiqueta={k === 'especiales' ? 'Necesidades especiales' : humano(k)} ancho>
                    <textarea rows={2} maxLength={500} value={form.logistica[k]} onChange={(e) => set('logistica', { ...form.logistica, [k]: e.target.value })} />
                  </Campo>
                ))}
              </div>
            </Tarjeta>
          </fieldset>
        </div>

        {/* ---------- columna lateral ---------- */}
        <div className="det-col">
          <Tarjeta titulo="Contacto con el cliente" etiqueta="Interno" tono="interno">
            <div className="det-datos">
              <Dato etiqueta="Contactado" valor={g?.contactado ? 'Sí' : 'No'} />
              <Dato etiqueta="Último contacto" valor={fechaHora(g?.ultimo_contacto_en)} />
              <Dato etiqueta="Medio" valor={g?.medio_ultimo_contacto ? MEDIO_LABEL[g.medio_ultimo_contacto] ?? g.medio_ultimo_contacto : null} />
              <Dato etiqueta="Próximo contacto" valor={fechaHora(g?.proximo_contacto_en)} />
            </div>
            {g?.compromisos && <p className="det-texto"><strong>Compromisos:</strong> {g.compromisos}</p>}
            {!cerrada && (
              <div className="det-form una">
                <Campo etiqueta="Registrar contacto">
                  <select value={contacto.medio} onChange={(e) => setContacto({ ...contacto, medio: e.target.value })}>
                    {meta.medios_contacto.map((m) => <option key={m} value={m}>{MEDIO_LABEL[m] ?? humano(m)}</option>)}
                  </select>
                </Campo>
                <Campo etiqueta="¿Qué se habló?"><textarea rows={2} maxLength={1000} value={contacto.observaciones} onChange={(e) => setContacto({ ...contacto, observaciones: e.target.value })} /></Campo>
                <Campo etiqueta="Compromisos"><textarea rows={2} maxLength={1000} value={contacto.compromisos} onChange={(e) => setContacto({ ...contacto, compromisos: e.target.value })} /></Campo>
                <Campo etiqueta="Próximo contacto (opcional)"><input type="datetime-local" value={contacto.proximo} min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} onChange={(e) => setContacto({ ...contacto, proximo: e.target.value })} /></Campo>
                <button type="button" className="primary-btn" disabled={ocupado} onClick={() => void guardarContacto()}>Registrar contacto</button>
              </div>
            )}
          </Tarjeta>

          <Tarjeta titulo="Servicios" etiqueta="Cliente + administración" tono="admin">
            <ul className="det-servicios">
              {reserva.servicios.map((s) => (
                <li key={s.id_rs}>
                  <div>
                    <strong>{s.nombre_servicio}{s.cantidad > 1 ? ` ×${s.cantidad}` : ''}</strong>
                    <small>{s.origen === 'cliente' ? 'Pedido por el cliente' : 'Agregado por administración'}</small>
                  </div>
                  <select
                    className="admin-select resx-mini"
                    value={s.estado}
                    disabled={cerrada || ocupado}
                    aria-label={`Estado de ${s.nombre_servicio}`}
                    onChange={(e) => void ejecutar(() => reservaService.actualizarServicio(id, s.id_rs, { estado: e.target.value as ServicioReserva['estado'] }), 'Servicio actualizado')}
                  >
                    {Object.entries(SERVICIO_ESTADO_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                  {!cerrada && <button type="button" className="table-action" title="Quitar" disabled={ocupado} onClick={() => void quitarServicio(s)}><Trash2 size={14} /></button>}
                </li>
              ))}
              {!reserva.servicios.length && <li className="det-vacio">Sin servicios.</li>}
            </ul>
            {!cerrada && (
              <div className="det-form una">
                <Campo etiqueta="Agregar del catálogo">
                  <select value={nuevoServicio.id_s} onChange={(e) => setNuevoServicio({ ...nuevoServicio, id_s: e.target.value, nombre: '' })}>
                    <option value="">Otro (escribir nombre)</option>
                    {catalogo.map((c) => <option key={c.id_s} value={c.id_s}>{c.nombre_s}</option>)}
                  </select>
                </Campo>
                {!nuevoServicio.id_s && (
                  <Campo etiqueta="Nombre del servicio"><input type="text" maxLength={100} value={nuevoServicio.nombre} onChange={(e) => setNuevoServicio({ ...nuevoServicio, nombre: e.target.value })} /></Campo>
                )}
                <Campo etiqueta="Cantidad"><input type="number" min={1} max={100000} value={nuevoServicio.cantidad} onChange={(e) => setNuevoServicio({ ...nuevoServicio, cantidad: e.target.value })} /></Campo>
                <button type="button" className="secondary-btn" disabled={ocupado} onClick={() => void agregarServicio()}><Plus size={14} /> Agregar servicio</button>
              </div>
            )}
          </Tarjeta>

          <Tarjeta titulo="Notas internas" etiqueta="El cliente no las ve" tono="interno">
            {!cerrada && (
              <div className="det-form una">
                <textarea rows={3} maxLength={1000} placeholder="Escribe una nota solo para administración…" value={nota} onChange={(e) => setNota(e.target.value)} />
                <button type="button" className="secondary-btn" disabled={ocupado || !nota.trim()} onClick={() => void guardarNota()}><Lock size={14} /> Guardar nota</button>
              </div>
            )}
            <ul className="det-notas">
              {entradas.filter((x) => x.tipo_evento === 'nota_interna').map((x) => (
                <li key={x.id_seguimiento}>
                  <p>{x.comentario}</p>
                  <small>{x.administrador ? `${x.administrador.nombre_u} ${x.administrador.apellido_u}` : 'Administración'} · {fechaHora(x.fecha_actualizacion)}</small>
                </li>
              ))}
            </ul>
          </Tarjeta>

          <Tarjeta titulo="Historial" etiqueta="Trazabilidad">
            <ol className="det-timeline">
              {entradas.map((x) => (
                <li key={x.id_seguimiento} className={x.visible_usuario ? 'publico' : 'interno'}>
                  <span className="det-punto">{ICONO_TIPO[x.tipo_evento] ?? <Info size={14} />}</span>
                  <div>
                    <p>{x.comentario}</p>
                    <small>
                      {fechaHora(x.fecha_actualizacion)} · {x.administrador ? `${x.administrador.nombre_u} ${x.administrador.apellido_u}` : x.id_admin ? 'Administración' : 'Cliente'}
                      {' · '}{x.visible_usuario ? 'Visible para el cliente' : 'Solo administración'}
                    </small>
                  </div>
                </li>
              ))}
              {!entradas.length && <li className="det-vacio">Sin movimientos.</li>}
            </ol>
          </Tarjeta>
        </div>
      </div>

      {/* ---------- barra de guardado ---------- */}
      {!cerrada && (sucio || errorForm || problemas.length > 0) && (
        <div className="det-guardar" role="status">
          <div>
            {problemas.map((p) => <p key={p} className="resx-error">{p}</p>)}
            {errorForm && <p className="resx-error">{errorForm}</p>}
            {sucio && !problemas.length && !errorForm && <p>Tienes cambios sin guardar.</p>}
          </div>
          <div className="det-botones">
            {sucio && <button type="button" className="secondary-btn" disabled={guardando} onClick={() => { setForm(JSON.parse(inicial)); setErrorForm(''); }}>Descartar</button>}
            <button type="button" className="primary-btn" disabled={!sucio || guardando || problemas.length > 0} onClick={() => void guardar()}>
              {guardando ? <Loader2 size={15} className="resx-spin" /> : <Save size={15} />} Guardar cambios
            </button>
          </div>
        </div>
      )}
    </div>
  );
}