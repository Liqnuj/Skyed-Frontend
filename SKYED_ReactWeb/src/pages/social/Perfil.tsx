import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Protected from '../../components/Protected';
import SocialWrapper from '../../components/social/SocialWrapper';
import HeroParticles from '../../components/social/HeroParticles';
import Toast from '../../components/social/Toast';
import type { ToastMsg } from '../../components/social/Toast';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/api';
import { pqrService, reservaService } from '../../services/socialService';
import type { Pqr, PqrSeguimiento, Reserva, TipoPqr } from '../../services/socialService';
import { FASES_VISIBLES, PqrEstadoPill, PqrPlazoChip, PqrStepper, PqrTimeline, indiceFaseVisible } from '../../components/social/pqr/PqrTracker';
import { ESTADO_COLOR, ESTADO_LABEL, TIPO_LABEL } from '../../utils/pqr';
import { prepararImagen } from '../../utils/prepararImagen';
import { errorContrasena } from '../../utils/validaciones';
import '../../styles/social/perfil.css';
import '../../styles/social/pqrDetalle.css';

type TabId = 'resumen' | 'pqr' | 'reservas' | 'ajustes';
const TABS: TabId[] = ['resumen', 'pqr', 'reservas', 'ajustes'];

function tipoDocumentoLabel(tipo: string | null | undefined) {
  const map: Record<string, string> = {
    CC: 'C.C.', cedula: 'C.C.', cedula_ciudadania: 'C.C.',
    TI: 'T.I.', tarjeta_identidad: 'T.I.',
    CE: 'C.E.', cedula_extranjeria: 'C.E.',
    PA: 'Pasaporte', pasaporte: 'Pasaporte',
  };
  return tipo ? (map[tipo] || tipo) : '';
}

/** Las fechas sin hora ("1995-03-10") se leen como UTC y en Colombia (UTC-5)
 *  se mostraban un día antes. Se arman por partes para evitarlo. */
function soloFecha(iso: string | null | undefined) {
  return iso ? String(iso).slice(0, 10) : '';
}

function fmtFecha(iso: string | null | undefined) {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** El backend puede devolver "CC", "cedula" o "cedula_ciudadania"; el selector
 *  usa siempre CC / TI / CE / PA (los mismos valores que Deportivo). */
function normalizarTipoDoc(tipo: string | null | undefined) {
  const map: Record<string, string> = {
    CC: 'CC', cedula: 'CC', cedula_ciudadania: 'CC',
    TI: 'TI', tarjeta_identidad: 'TI',
    CE: 'CE', cedula_extranjeria: 'CE',
    PA: 'PA', pasaporte: 'PA',
  };
  return tipo ? (map[tipo] ?? '') : '';
}

function fmtMoney(n: string | number | null | undefined) {
  return '$' + (Number(n) || 0).toLocaleString('es-CO');
}


/* Novedades: se recuerda hasta qué actuación vio el usuario cada PQR. */
const VISTO_KEY = 'skyed_pqr_visto';

function leerVistos(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(VISTO_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function guardarVisto(id: number, iso: string) {
  try {
    localStorage.setItem(VISTO_KEY, JSON.stringify({ ...leerVistos(), [id]: iso }));
  } catch {
    // Sin almacenamiento disponible: simplemente no se recuerda.
  }
}

/** El equipo actuó después de radicada y el usuario aún no lo ha visto. */
function hayNovedad(p: Pqr, vistos: Record<string, string>) {
  if (!p.ultima_actuacion_en) return false;
  const ultima = new Date(p.ultima_actuacion_en).getTime();
  const creada = new Date(p.creado_en_pqr).getTime();
  if (Number.isNaN(ultima) || ultima - creada < 5000) return false;
  const visto = vistos[p.id_pqr];
  return !visto || ultima > new Date(visto).getTime();
}

/** Nombre del tipo y etiqueta/color de la fase (vienen de utils/pqr). */
const pqrTipoLabel = TIPO_LABEL;

function pqrEstadoPill(estado: Pqr['estado_pqr']) {
  const cls = estado === 'resuelto' ? 'ok' : estado === 'cerrado' ? 'warn' : 'pending';
  return { cls, txt: ESTADO_LABEL[estado] ?? estado };
}

const pqrTipoIcon: Record<TipoPqr, string> = {
  peticion: 'ti-file-text',
  queja: 'ti-mood-sad',
  reclamo: 'ti-alert-triangle',
  sugerencia: 'ti-bulb',
  felicitacion: 'ti-heart',
};


/** Nombre que se muestra: el que puso el cliente, si no el del evento, si no el número. */
function nombreReserva(r: Reserva) {
  return (r.nombre_rese ?? '').trim() || r.evento?.nombre_er || `Reserva #${r.id_rese}`;
}

function reservaEstadoPill(estado: Reserva['estado_rese']) {
  if (estado === 'pendiente') return { cls: 'pending', txt: 'Pendiente' };
  if (estado === 'cancelada') return { cls: 'warn', txt: 'Cancelada' };
  if (estado === 'completada') return { cls: 'ok', txt: 'Completada' };
  return { cls: 'ok', txt: 'Confirmada' };
}

/* ---------- Búsqueda y filtros de las listas (Mis PQR / Mis reservas) ---------- */
type RangoFecha = 'todas' | '7d' | '30d' | 'mes' | 'anio' | 'proximas' | 'pasadas' | 'custom';

interface Filtros {
  q: string;
  rango: RangoFecha;
  desde: string;
  hasta: string;
  orden: 'recientes' | 'antiguos';
  estado: string; // 'todos' o el valor del estado (abierto, pendiente, ...)
}

const FILTROS_INICIALES: Filtros = { q: '', rango: 'todas', desde: '', hasta: '', orden: 'recientes', estado: 'todos' };

const ESTADOS_PQR: { value: string; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'abierto', label: 'Enviado' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'resuelto', label: 'Resuelto' },
  { value: 'ocultas', label: 'Ocultas' },
];

const ESTADOS_RESERVAS: { value: string; label: string }[] = [
  { value: 'todos', label: 'Todas' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'confirmada', label: 'Confirmada' },
  { value: 'completada', label: 'Completada' },
  { value: 'cancelada', label: 'Cancelada' },
  { value: 'ocultas', label: 'Ocultas' },
];

function contarPor<T>(items: T[] | null, get: (x: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  (items ?? []).forEach((it) => {
    const k = get(it);
    out[k] = (out[k] ?? 0) + 1;
  });
  return out;
}

const RANGOS_PQR: { value: RangoFecha; label: string }[] = [
  { value: 'todas', label: 'Todas las fechas' },
  { value: '7d', label: 'Últimos 7 días' },
  { value: '30d', label: 'Últimos 30 días' },
  { value: 'mes', label: 'Este mes' },
  { value: 'anio', label: 'Este año' },
  { value: 'custom', label: 'Rango personalizado' },
];

const RANGOS_RESERVAS: { value: RangoFecha; label: string }[] = [
  { value: 'todas', label: 'Todas las fechas' },
  { value: 'proximas', label: 'Próximas' },
  { value: 'pasadas', label: 'Pasadas' },
  { value: 'mes', label: 'Este mes' },
  { value: 'anio', label: 'Este año' },
  { value: 'custom', label: 'Rango personalizado' },
];

/** Minúsculas y sin tildes, para que "felicitacion" encuentre "Felicitación". */
function normalizar(t: string) {
  return t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function isoLocal(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Límites (AAAA-MM-DD) del rango elegido; '' significa "sin límite". */
function limitesRango(f: Filtros): { desde: string; hasta: string } {
  const hoy = new Date();
  const hoyIso = isoLocal(hoy);
  const atras = (n: number) => {
    const d = new Date(hoy);
    d.setDate(d.getDate() - n);
    return isoLocal(d);
  };
  switch (f.rango) {
    case '7d': return { desde: atras(7), hasta: hoyIso };
    case '30d': return { desde: atras(30), hasta: hoyIso };
    case 'mes':
      return {
        desde: isoLocal(new Date(hoy.getFullYear(), hoy.getMonth(), 1)),
        hasta: isoLocal(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)),
      };
    case 'anio': return { desde: `${hoy.getFullYear()}-01-01`, hasta: `${hoy.getFullYear()}-12-31` };
    case 'proximas': return { desde: hoyIso, hasta: '' };
    case 'pasadas': return { desde: '', hasta: atras(1) };
    case 'custom': return { desde: f.desde, hasta: f.hasta };
    default: return { desde: '', hasta: '' };
  }
}

function filtrarLista<T>(
  items: T[] | null,
  f: Filtros,
  getFecha: (x: T) => string | null | undefined,
  getTexto: (x: T) => string,
  getEstado: (x: T) => string,
): T[] | null {
  if (!items) return null;
  const q = normalizar(f.q.trim());
  const { desde, hasta } = limitesRango(f);

  const res = items.filter((it) => {
    if (q && !normalizar(getTexto(it)).includes(q)) return false;
    if (f.estado !== 'todos' && getEstado(it) !== f.estado) return false;
    if (desde || hasta) {
      const dia = soloFecha(getFecha(it));
      if (!dia) return false;
      if (desde && dia < desde) return false;
      if (hasta && dia > hasta) return false;
    }
    return true;
  });

  const marca = (it: T) => {
    const t = Date.parse(getFecha(it) ?? '');
    return Number.isNaN(t) ? 0 : t;
  };

  return res
    .map((it, i) => ({ it, t: marca(it), i }))
    .sort((a, b) => (f.orden === 'recientes' ? b.t - a.t : a.t - b.t) || a.i - b.i)
    .map((x) => x.it);
}

interface ListToolbarProps {
  filtros: Filtros;
  onChange: (f: Filtros) => void;
  rangos: { value: RangoFecha; label: string }[];
  estados: { value: string; label: string }[];
  conteos: Record<string, number>;
  placeholder: string;
  total: number;
  mostrando: number;
  singular: string;
  plural: string;
}

function ListToolbar({ filtros, onChange, rangos, estados, conteos, placeholder, total, mostrando, singular, plural }: ListToolbarProps) {
  const set = (parcial: Partial<Filtros>) => onChange({ ...filtros, ...parcial });
  const activo = filtros.q.trim() !== '' || filtros.rango !== 'todas' || filtros.estado !== 'todos';
  const unidad = (n: number) => (n === 1 ? singular : plural);

  return (
    <div className="pf-toolbar">
      <div className="pf-toolbar-row">
        <label className="pf-search">
          <i className="ti ti-search" aria-hidden="true" />
          <input
            type="search"
            value={filtros.q}
            onChange={(e) => set({ q: e.target.value })}
            placeholder={placeholder}
            aria-label="Buscar"
          />
        </label>
        <select
          className="pf-tool-select"
          value={filtros.rango}
          onChange={(e) => set({ rango: e.target.value as RangoFecha })}
          aria-label="Filtrar por fecha"
        >
          {rangos.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <select
          className="pf-tool-select"
          value={filtros.orden}
          onChange={(e) => set({ orden: e.target.value as Filtros['orden'] })}
          aria-label="Ordenar"
        >
          <option value="recientes">Más recientes primero</option>
          <option value="antiguos">Más antiguas primero</option>
        </select>
      </div>

      <div className="pf-chips" role="group" aria-label="Filtrar por estado">
        {estados.map((e) => {
          const n = e.value === 'todos' ? total : (conteos[e.value] ?? 0);
          const sel = filtros.estado === e.value;
          return (
            <button title={`Filtrar por estado: ${e.label}`}
              key={e.value}
              type="button"
              className={`pf-chip${sel ? ' active' : ''}`}
              aria-pressed={sel}
              onClick={() => set({ estado: e.value })}
            >
              {e.label} <span className="pf-chip-count">{n}</span>
            </button>
          );
        })}
      </div>

      {filtros.rango === 'custom' && (
        <div className="pf-toolbar-row pf-toolbar-dates">
          <label>
            Desde
            <input
              type="date"
              value={filtros.desde}
              max={filtros.hasta || undefined}
              onChange={(e) => set({ desde: e.target.value })}
            />
          </label>
          <label>
            Hasta
            <input
              type="date"
              value={filtros.hasta}
              min={filtros.desde || undefined}
              onChange={(e) => set({ hasta: e.target.value })}
            />
          </label>
        </div>
      )}

      <div className="pf-toolbar-foot">
        <span>
          {activo ? `Mostrando ${mostrando} de ${total}` : `${total} ${unidad(total)}`}
        </span>
        {activo && (
          <button title="Quitar todos los filtros"
            type="button"
            className="pf-tool-clear"
            onClick={() => onChange({ ...FILTROS_INICIALES, orden: filtros.orden })}
          >
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- Detalle de una PQR (modal con conversación) ---------- */
type PqrSeguimientoItem = PqrSeguimiento;
type PqrConSeguimientos = Pqr;

interface MensajePqr {
  key: string;
  de: 'yo' | 'equipo' ;
  texto: string;
  fecha: string | null | undefined;
  /** Es la respuesta oficial con la que se resolvió la PQR. */
  oficial?: boolean;
}

const MENSAJE_GENERICO = 'Se ha publicado una respuesta a tu solicitud.';
const ESTADOS_CON_RESPUESTA = ['abierto', 'en_revision', 'en_proceso'];

function agregarSeguimiento(p: Pqr, seg: PqrSeguimientoItem): Pqr {
  const actual = (p as PqrConSeguimientos).seguimientos ?? [];
  return { ...p, seguimientos: [...actual, seg] } as Pqr;
}

function fmtFechaHora(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' });
}

/** Une el mensaje inicial, el historial y la respuesta en una sola conversación. */
function construirConversacion(pqr: PqrConSeguimientos): MensajePqr[] {
  const segs = [...(pqr.seguimientos ?? [])].sort(
    (a, b) =>
      Date.parse(a.created_at) - Date.parse(b.created_at) ||
      a.id_seguimiento - b.id_seguimiento,
  );

  let ultimaRespuesta = -1;
  segs.forEach((sg, i) => { if (sg.tipo_evento === 'respuesta') ultimaRespuesta = i; });

  const msgs: MensajePqr[] = [
    { key: 'inicio', de: 'yo', texto: pqr.mensaje_pqr, fecha: pqr.creado_en_pqr },
  ];

  segs.forEach((sg, i) => {
    const key = `seg-${sg.id_seguimiento}`;
    let texto = (sg.comentario_publico ?? '').trim();

    if (sg.tipo_evento === 'respuesta_cliente') {
      msgs.push({ key, de: 'yo', texto, fecha: sg.created_at });
      return;
    }

    // El chat solo lleva lo que escribe el usuario y lo que responde el equipo.
    // La radicación y los cambios de fase van al Historial, no aquí.
    const esMensajeDelEquipo =
      sg.tipo_evento === 'respuesta' ||
      sg.tipo_evento === 'solicitud_informacion' ||
      sg.tipo_evento === 'comentario';

    if (!esMensajeDelEquipo) return;

    // Respuestas antiguas guardaban un texto genérico: la última se completa con la real.
    if (i === ultimaRespuesta && pqr.respuesta_pqr && (texto === '' || texto === MENSAJE_GENERICO)) {
      texto = pqr.respuesta_pqr;
    }
    msgs.push({
      key,
      de: 'equipo',
      texto: texto || MENSAJE_GENERICO,
      fecha: sg.created_at,
      oficial: sg.tipo_evento === 'respuesta',
    });
  });

  // PQR respondidas antes de que existiera el historial.
  if (ultimaRespuesta === -1 && pqr.respuesta_pqr) {
    msgs.push({
      key: 'respuesta-antigua',
      de: 'equipo',
      texto: pqr.respuesta_pqr,
      fecha: pqr.respondido_en_pqr,
      oficial: true,
    });
  }

  return msgs;
}

interface PfConfirmarProps {
  titulo: string;
  texto: string;
  confirmar: string;
  onConfirmar: () => void;
  onCancelar: () => void;
  /** Icono de tabler. Por defecto el de "ocultar". */
  icono?: string;
  /** Contenido extra bajo el texto (por ejemplo, un campo). */
  children?: ReactNode;
}

/** Ventana de confirmación con el estilo del sitio (reemplaza window.confirm). */
function PfConfirmar({ titulo, texto, confirmar, onConfirmar, onCancelar, icono = 'ti-eye-off', children }: PfConfirmarProps) {
  const cancelarRef = useRef<HTMLButtonElement>(null);

  // El foco va al botón "Cancelar" solo al abrir (no en cada render,
  // para no quitárselo a un campo mientras se escribe).
  useEffect(() => {
    cancelarRef.current?.focus();
  }, []);

  useEffect(() => {
    // En fase de captura: Escape cierra solo esta ventana y no el detalle de abajo.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onCancelar();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onCancelar]);

  return createPortal(
    <div className="pfc-backdrop" role="presentation" onClick={(e) => { e.stopPropagation(); onCancelar(); }}>
      <div
        className="pfc-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="pfc-titulo"
        aria-describedby="pfc-texto"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="pfc-icon" aria-hidden="true"><i className={`ti ${icono}`} /></span>
        <h3 id="pfc-titulo" className="pfc-title">{titulo}</h3>
        <p id="pfc-texto" className="pfc-text">{texto}</p>
        {children}
        <div className="pfc-actions">
          <button title="Cancelar y cerrar esta ventana" ref={cancelarRef} type="button" className="pfc-btn pfc-btn--ghost" onClick={onCancelar}>Cancelar</button>
          <button title={confirmar} type="button" className="pfc-btn pfc-btn--main" onClick={onConfirmar}>{confirmar}</button>
        </div>
      </div>
    </div>,
    document.querySelector('.mod-social') ?? document.body,
  );
}

interface PqrDetalleProps {
  pqr: PqrConSeguimientos;
  onClose: () => void;
  /** Envía el mensaje; devuelve true si se guardó. */
  onEnviar: (mensaje: string) => Promise<boolean>;
  /** Oculta la PQR de la lista del usuario (el equipo conserva el registro). */
  onOcultar: () => Promise<void>;
  /** true si la PQR está en "Ocultas": el botón pasa a "Mostrar en mi lista". */
  oculta: boolean;
}

/** Mensaje corto que explica en qué punto va la solicitud. */
const TEXTO_ESTADO: Record<Pqr['estado_pqr'], string> = {
  abierto: 'Recibimos tu solicitud. En breve alguien del equipo la revisará.',
  en_revision: 'Un integrante del equipo ya está revisando tu solicitud.',
  en_proceso: 'Ya estamos gestionando tu solicitud. Pronto tendrás una respuesta.',
  resuelto: 'Tu solicitud fue resuelta. Abajo encuentras la respuesta del equipo.',
  cerrado: 'Este caso fue cerrado.',
};

function PqrDetalle({ pqr, onClose, onEnviar }: PqrDetalleProps) {
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const cuerpoRef = useRef<HTMLDivElement>(null);
  const bajarRef = useRef(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const puedeResponder = ESTADOS_CON_RESPUESTA.includes(pqr.estado_pqr);

  const conversacion = useMemo(() => construirConversacion(pqr), [pqr]);
  const hayRespuestaEquipo = conversacion.some((m) => m.de === 'equipo');

  // Al abrir se ve el estado arriba. Solo cuando el usuario envía un
  // mensaje se baja al final de la conversación.
  useEffect(() => {
    if (!bajarRef.current) return;
    bajarRef.current = false;
    cuerpoRef.current?.scrollTo({ top: cuerpoRef.current.scrollHeight, behavior: 'smooth' });
  }, [conversacion.length]);

  const enviar = async (e?: FormEvent) => {
    e?.preventDefault();
    const mensaje = texto.trim();
    if (!mensaje || enviando) return;
    setEnviando(true);
    bajarRef.current = true;
    const ok = await onEnviar(mensaje);
    if (!ok) bajarRef.current = false;
    setEnviando(false);
    if (ok) setTexto('');
  };

  return (
    <div className="pf-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pf-modal pfd-modal" role="dialog" aria-modal="true" aria-labelledby="pf-pqr-title">
        <header className="pfd-head">
          <span className="pfd-icon" aria-hidden="true">
            <i className={`ti ${pqrTipoIcon[pqr.tipo_pqr] ?? 'ti-message-report'}`} />
          </span>
          <div className="pfd-title">
            <p className="pfd-kicker">{pqr.radicado ?? `SS-PQR-${pqr.id_pqr}`} · {pqrTipoLabel[pqr.tipo_pqr]}</p>
            <h3 id="pf-pqr-title">{pqr.asunto_pqr}</h3>
            <p className="pfd-date">Enviada el {fmtFecha(pqr.creado_en_pqr)}</p>
          </div>
          <button title="Cerrar" type="button" className="pfd-close" onClick={onClose} aria-label="Cerrar">
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </header>

        <div className="pfd-scroll" ref={cuerpoRef}>
          <section
            className="pfd-status pqrx"
            style={{ '--fase': ESTADO_COLOR[pqr.estado_pqr] } as CSSProperties}
            aria-label="Estado de tu solicitud"
          >
            <div className="pfd-status-top">
              <PqrEstadoPill estado={pqr.estado_pqr} />
              <PqrPlazoChip pqr={pqr} />
            </div>
            <p className="pfd-status-text">{TEXTO_ESTADO[pqr.estado_pqr]}</p>
            <PqrStepper estado={pqr.estado_pqr} />
          </section>

          <h4 className="pfd-section">Historial</h4>

          <div className="pqrx pfd-history">
            <PqrTimeline seguimientos={pqr.seguimientos ?? []} soloEstados />
          </div>

          <h4 className="pfd-section">Conversación</h4>

          <div className="pfd-thread">
            {conversacion.map((m) => (
              <div
                key={m.key}
                className={`pfd-msg ${m.de === 'yo' ? 'mine' : 'team'}${m.oficial ? ' official' : ''}`}
              >
                <span className="pfd-avatar" aria-hidden="true">{m.de === 'yo' ? 'Tú' : 'SS'}</span>
                <div className="pfd-bubble">
                  <div className="pfd-who">
                    <b>{m.de === 'yo' ? 'Tú' : 'Equipo SkyedSocial'}</b>
                    {m.oficial && (
                      <span className="pfd-badge">
                        <i className="ti ti-circle-check" aria-hidden="true" /> Respuesta oficial
                      </span>
                    )}
                    {m.fecha && <time>{fmtFechaHora(m.fecha)}</time>}
                  </div>
                  <p>{m.texto}</p>
                </div>
              </div>
            ))}
            
            {!hayRespuestaEquipo && puedeResponder && (
              <div className="pfd-wait">
                <i className="ti ti-clock" aria-hidden="true" />
                <span>Aún sin respuesta del equipo. Te avisaremos aquí y por notificación cuando la tengamos.</span>
              </div>
            )}
          </div>
        </div>

        {puedeResponder ? (
          <form className="pfd-composer" onSubmit={enviar}>
            <div className="pfd-composer-box">
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) enviar(); }}
                placeholder="Escribe un mensaje…"
                maxLength={2000}
                rows={1}
                aria-label="Tu mensaje"
                disabled={enviando}
              />
              <button title={enviando ? 'Enviando…' : 'Enviar mensaje'}
                type="submit"
                className="pfd-send"
                disabled={enviando || texto.trim() === ''}
                aria-label={enviando ? 'Enviando' : 'Enviar mensaje'}
              >
                <i className={`ti ${enviando ? 'ti-loader-2 pfd-spin' : 'ti-send'}`} aria-hidden="true" />
              </button>
            </div>
            <div className="pfd-composer-hint">
              <span>Ctrl + Enter para enviar</span>
              <span>{texto.length}/2000</span>
            </div>
          </form>
        ) : (
          <div className="pfd-closed">
            <i className="ti ti-circle-check" aria-hidden="true" />
            <span>Esta solicitud ya fue {pqr.estado_pqr === 'cerrado' ? 'cerrada' : 'resuelta'}.</span>
            <Link title="Radicar una nueva PQR" to="/social/pqr">Radicar una nueva PQR →</Link>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Detalle de una reserva (modal) ---------- */
function fmtFechaLarga(iso: string | null | undefined) {
  const f = soloFecha(iso);
  if (!f) return '—';
  const [y, m, d] = f.split('-').map(Number);
  const txt = new Date(y, m - 1, d).toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

/** Días que faltan para la fecha (negativo si ya pasó); null si no hay fecha válida. */
function diasPara(iso: string | null | undefined): number | null {
  const f = soloFecha(iso);
  if (!f) return null;
  const [y, m, d] = f.split('-').map(Number);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.round((new Date(y, m - 1, d).getTime() - hoy.getTime()) / 86400000);
}

const RESERVA_NOTA: Record<string, string> = {
  pendiente: 'Tu reserva está pendiente de confirmación por parte del equipo.',
  confirmada: '¡Tu reserva está confirmada! Nos vemos el día del evento.',
  completada: 'Este evento ya se realizó. ¡Gracias por elegir SkyedSocial!',
  cancelada: 'Esta reserva fue cancelada.',
};

type ReservaConDetalle = Reserva;

/** "Estado cambiado a: confirmada" -> "Estado cambiado a: Confirmada". */
function textoSeguimientoReserva(comentario: string) {
  const m = /^Estado cambiado a:\s*(\w+)/i.exec(comentario);
  if (!m) return comentario;
  return `Estado cambiado a: ${reservaEstadoPill(m[1].toLowerCase() as Reserva['estado_rese']).txt}`;
}

interface ReservaDetalleProps {
  reserva: Reserva;
  onClose: () => void;
  /** Guarda el nombre; devuelve true si se guardó. Texto vacío quita el nombre. */
  onRenombrar: (nombre: string) => Promise<boolean>;
  /** Oculta la reserva de la lista del usuario (el equipo conserva el registro). */
  onOcultar: () => Promise<void>;
  /** true si la reserva está en "Ocultas": el botón pasa a "Mostrar en mi lista". */
  oculta: boolean;
  /** Cancela la reserva; devuelve true si se canceló. El motivo es opcional. */
  onCancelar: (motivo: string) => Promise<boolean>;
}

function ReservaDetalle({ reserva, onClose, onRenombrar, onOcultar, oculta, onCancelar }: ReservaDetalleProps) {
  const puedeOcultar = ['cancelada', 'completada'].includes(reserva.estado_rese);
  const [confirmando, setConfirmando] = useState(false);
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const ocultar = () => {
    if (oculta) { onOcultar(); return; }
    setConfirmando(true);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const r = reserva as unknown as ReservaConDetalle;

  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(r.nombre_rese ?? '');
  const [guardando, setGuardando] = useState(false);

  const guardarNombre = async (e: FormEvent) => {
    e.preventDefault();
    if (guardando) return;
    setGuardando(true);
    const ok = await onRenombrar(nombre.trim());
    setGuardando(false);
    if (ok) setEditando(false);
  };

  const confirmarCancelacion = async () => {
    if (cancelando) return;
    setCancelando(true);
    const ok = await onCancelar(motivo.trim());
    setCancelando(false);
    if (ok) {
      setConfirmandoCancelar(false);
      setMotivo('');
    }
  };

  const estado = reserva.estado_rese as string;
  const pill = reservaEstadoPill(reserva.estado_rese);
  const cancelada = estado === 'cancelada';
  const paso = estado === 'completada' ? 3 : estado === 'confirmada' ? 2 : 1;
  const pasos = ['Solicitada', 'Confirmada', 'Completada'];

  const dias = diasPara(reserva.fecha_evento_rese);
  // Solo se cancela una reserva activa cuyo evento aún no pasó.
  const puedeCancelar = ['pendiente', 'confirmada'].includes(estado) && (dias === null || dias >= 0);
  let cuenta: string | null = null;
  if (!cancelada && estado !== 'completada' && dias !== null && dias >= 0) {
    cuenta = dias === 0 ? '¡Tu evento es hoy!' : dias === 1 ? 'Tu evento es mañana.' : `Faltan ${dias} días para tu evento.`;
  }

  // El total queda en 0 hasta que el equipo lo define.
  const totalPorDefinir = !(Number(reserva.total_rese) > 0);
  const observaciones = (r.Observaciones_rese ?? '').trim();
  const ubicacion = (r.ubicacion_rese ?? '').trim();

  const historial = useMemo(
    () =>
      [...(r.seguimientos ?? [])]
        .filter((sg) => (sg.comentario ?? '').trim() !== '')
        .sort((x, y) => (Date.parse(y.fecha_actualizacion ?? '') || 0) - (Date.parse(x.fecha_actualizacion ?? '') || 0))
        .map((sg) => ({ texto: textoSeguimientoReserva(String(sg.comentario)), fecha: sg.fecha_actualizacion })),
    [r.seguimientos],
  );

  return (
    <div className="pf-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pf-modal pf-pqr-modal pf-rese-modal" role="dialog" aria-modal="true" aria-labelledby="pf-rese-title">
        <div className="pf-modal-head">
          <span className="pf-item-icon" aria-hidden="true"><i className="ti ti-calendar-event" /></span>
          <div className="pf-pqr-heading">
            {editando ? (
              <form className="pf-rename" onSubmit={guardarNombre}>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      e.stopPropagation();
                      setEditando(false);
                      setNombre(r.nombre_rese ?? '');
                    }
                  }}
                  maxLength={80}
                  placeholder="Ej: Cumpleaños de Sofía"
                  aria-label="Nombre de tu reserva"
                  autoFocus
                  disabled={guardando}
                />
                <div className="pf-rename-actions">
                  <button title={guardando ? 'Guardando…' : 'Guardar el nombre'} type="submit" className="pf-reply-btn" disabled={guardando}>
                    {guardando ? 'Guardando…' : 'Guardar'}
                  </button>
                  <button title="Cancelar la edición del nombre"
                    type="button"
                    className="pf-tool-clear"
                    onClick={() => { setEditando(false); setNombre(r.nombre_rese ?? ''); }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <>
                <h3 id="pf-rese-title">{nombreReserva(reserva)}</h3>
                <p className="pf-list-item-sub">{fmtFecha(reserva.fecha_evento_rese)}</p>
                <button title="Ponerle o cambiarle el nombre a la reserva" type="button" className="pf-rename-btn" onClick={() => setEditando(true)}>
                  <i className="ti ti-pencil" aria-hidden="true" />
                  {(r.nombre_rese ?? '').trim() ? 'Cambiar nombre' : 'Ponle un nombre'}
                </button>
              </>
            )}
          </div>
          <button title="Cerrar" className="pf-modal-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>

        <div className="pf-pqr-meta">
          <span className="pf-item-code">Reserva #{reserva.id_rese}</span>
          <span className={`pf-pill ${pill.cls}`}>{pill.txt}</span>
        </div>

        {!cancelada && (
          <ol className="pf-steps" aria-label="Estado de la reserva">
            {pasos.map((txt, i) => {
              const cls = paso === 3 || i < paso - 1 ? 'done' : i === paso - 1 ? 'current' : '';
              return <li key={txt} className={cls}>{txt}</li>;
            })}
          </ol>
        )}

        <div className="pf-rese-body">
          <div className="pf-info-grid">
            <div className="pf-info-card wide">
              <span className="pf-info-label">Fecha del evento</span>
              <span className="pf-info-value">{fmtFechaLarga(reserva.fecha_evento_rese)}</span>
            </div>
            {ubicacion && (
              <div className="pf-info-card wide">
                <span className="pf-info-label">Ubicación</span>
                <span className="pf-info-value">{ubicacion}</span>
              </div>
            )}
            <div className="pf-info-card">
              <span className="pf-info-label">Invitados</span>
              <span className="pf-info-value">{reserva.invitados_rese}</span>
            </div>
            {r.presupuesto_rese != null && (
              <div className="pf-info-card">
                <span className="pf-info-label">Tu presupuesto</span>
                <span className="pf-info-value">{fmtMoney(Number(r.presupuesto_rese))}</span>
              </div>
            )}
            <div className="pf-info-card">
              <span className="pf-info-label">Total</span>
              <span className="pf-info-value">{totalPorDefinir ? 'Por definir' : fmtMoney(reserva.total_rese)}</span>
            </div>
            {r.creado_en_rese && (
              <div className="pf-info-card">
                <span className="pf-info-label">Reservada el</span>
                <span className="pf-info-value">{fmtFecha(r.creado_en_rese)}</span>
              </div>
            )}
          </div>

          {observaciones && (
            <div className="pf-bubble mine pf-rese-obs">
              <span className="pf-bubble-who">Tus observaciones</span>
              <p>{observaciones}</p>
            </div>
          )}

          {cuenta && (
            <div className="pf-rese-note">
              <i className="ti ti-hourglass" aria-hidden="true" />
              <span>{cuenta}</span>
            </div>
          )}
          <div className={`pf-rese-note${cancelada ? ' cancel' : ''}`}>
            <i className={`ti ${cancelada ? 'ti-circle-x' : 'ti-info-circle'}`} aria-hidden="true" />
            <span>{RESERVA_NOTA[estado] ?? ''}</span>
          </div>

          {historial.length > 0 && (
            <div className="pf-history">
              <h4 className="pf-history-title">Historial</h4>
              <ol>
                {historial.map((h, i) => (
                  <li key={`${h.fecha}-${i}`}>
                    <span>{h.texto}</span>
                    {h.fecha && <small>{fmtFechaHora(h.fecha)}</small>}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {(oculta || puedeOcultar) && (
            <button title={oculta ? 'Volver a mostrar la reserva en tu lista' : 'Ocultar la reserva de tu lista'} type="button" className="pf-hide-btn" onClick={ocultar}>
              <i className={`ti ${oculta ? 'ti-eye' : 'ti-eye-off'}`} aria-hidden="true" />
              {oculta ? ' Mostrar en mi lista' : ' Ocultar de mi lista'}
            </button>
          )}

          {puedeCancelar && (
            <button title="Cancelar esta reserva" type="button" className="pf-cancel-btn" onClick={() => setConfirmandoCancelar(true)}>
              <i className="ti ti-circle-x" aria-hidden="true" /> Cancelar reserva
            </button>
          )}

          {confirmando && (
            <PfConfirmar
              titulo="¿Ocultar esta reserva?"
              texto="Dejará de verse en tu lista, pero el equipo conserva el registro. La encuentras en “Ocultas”."
              confirmar="Sí, ocultar"
              onConfirmar={() => { setConfirmando(false); onOcultar(); }}
              onCancelar={() => setConfirmando(false)}
            />
          )}

          {confirmandoCancelar && (
            <PfConfirmar
              icono="ti-circle-x"
              titulo="¿Cancelar esta reserva?"
              texto="El equipo será informado y la reserva quedará como cancelada. Esta acción no se puede deshacer."
              confirmar={cancelando ? 'Cancelando…' : 'Sí, cancelar reserva'}
              onConfirmar={confirmarCancelacion}
              onCancelar={() => setConfirmandoCancelar(false)}
            >
              <textarea
                className="pfc-motivo"
                rows={3}
                maxLength={255}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Cuéntanos el motivo (opcional)"
                aria-label="Motivo de la cancelación"
              />
            </PfConfirmar>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Perfil() {
  return (
    <Protected>
      <SocialWrapper>
        <PerfilPanel />
      </SocialWrapper>
    </Protected>
  );
}

function PerfilPanel() {
  const { user, updateFotoUrl, updateProfile, deleteAccount } = useAuth();

  // La pestaña vive en la URL (/social/perfil?tab=reservas) para que las
  // opciones del menú de la cuenta abran directamente la sección elegida.
  const [searchParams, setSearchParams] = useSearchParams();
  const tabUrl = searchParams.get('tab') as TabId | null;
  const tab: TabId = tabUrl && TABS.includes(tabUrl) ? tabUrl : 'resumen';
  const setTab = (nueva: TabId) =>
    setSearchParams(nueva === 'resumen' ? {} : { tab: nueva }, { replace: true });

  const esAdmin = user?.roles.includes('adminSocial') ?? false;

  const [pqrs, setPqrs] = useState<Pqr[] | null>(null);
  const [reservas, setReservas] = useState<Reserva[] | null>(null);

  const [detallePqr, setDetallePqr] = useState<Pqr | null>(null);
  const [vistos, setVistos] = useState<Record<string, string>>(leerVistos);

  const [toast, setToast] = useState<ToastMsg | null>(null);
  const [filtrosPqr, setFiltrosPqr] = useState<Filtros>(FILTROS_INICIALES);
  const [filtrosReservas, setFiltrosReservas] = useState<Filtros>(FILTROS_INICIALES);
  const [detalleReserva, setDetalleReserva] = useState<Reserva | null>(null);
  // Lo que el usuario ocultó: se ve en el chip "Ocultas" y se puede volver a mostrar.
  const [pqrsOcultas, setPqrsOcultas] = useState<Pqr[] | null>(null);
  const [reservasOcultas, setReservasOcultas] = useState<Reserva[] | null>(null);

  const cargarPqrs = useCallback((inicial: boolean) => {
    pqrService
      .misPqr()
      .then((res) => setPqrs(res.data))
      .catch(() => {
        // Si ya hay datos en pantalla, un fallo al refrescar no los borra.
        if (inicial) setToast({ tipo: 'error', texto: 'No se pudieron cargar tus PQR.', id: Date.now() });
      });
  }, []);

  const pqrsFiltradas = useMemo(
    () =>
      filtrarLista(
        filtrosPqr.estado === 'ocultas' ? pqrsOcultas : pqrs,
        filtrosPqr.estado === 'ocultas' ? { ...filtrosPqr, estado: 'todos' } : filtrosPqr,
        (p) => p.creado_en_pqr,
        (p) => `${p.asunto_pqr} ${pqrTipoLabel[p.tipo_pqr] ?? ''} ${pqrEstadoPill(p.estado_pqr).txt} SS-PQR-${p.id_pqr}`,
        (p) => p.estado_pqr,
      ),
    [pqrs, pqrsOcultas, filtrosPqr],
  );
  const conteosPqr = useMemo(
    () => ({ ...contarPor(pqrs, (p) => p.estado_pqr), ocultas: pqrsOcultas?.length ?? 0 }),
    [pqrs, pqrsOcultas],
  );
  const hayPqr = (pqrs?.length ?? 0) + (pqrsOcultas?.length ?? 0) > 0;

  const reservasFiltradas = useMemo(
    () =>
      filtrarLista(
        filtrosReservas.estado === 'ocultas' ? reservasOcultas : reservas,
        filtrosReservas.estado === 'ocultas' ? { ...filtrosReservas, estado: 'todos' } : filtrosReservas,
        (r) => r.fecha_evento_rese,
        (r) => `${nombreReserva(r)} ${r.evento?.nombre_er ?? ''} Reserva #${r.id_rese} ${reservaEstadoPill(r.estado_rese).txt}`,
        (r) => r.estado_rese,
      ),
    [reservas, reservasOcultas, filtrosReservas],
  );
  const conteosReservas = useMemo(
    () => ({ ...contarPor(reservas, (r) => r.estado_rese), ocultas: reservasOcultas?.length ?? 0 }),
    [reservas, reservasOcultas],
  );
  const hayReservas = (reservas?.length ?? 0) + (reservasOcultas?.length ?? 0) > 0;

  const renombrarReserva = async (reserva: Reserva, nombre: string): Promise<boolean> => {
    try {
      const res = await reservaService.renombrar(reserva.id_rese, nombre);
      const nuevo = res.nombre_rese ?? null;
      setReservas((prev) => prev && prev.map((x) => (x.id_rese === reserva.id_rese ? { ...x, nombre_rese: nuevo } : x)));
      setDetalleReserva((prev) => (prev && prev.id_rese === reserva.id_rese ? { ...prev, nombre_rese: nuevo } : prev));
      setToast({ tipo: 'ok', texto: nuevo ? 'Nombre guardado.' : 'Nombre quitado.', id: Date.now() });
      return true;
    } catch (err) {
      setToast({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'No se pudo guardar el nombre. Intenta de nuevo.',
        id: Date.now(),
      });
      return false;
    }
  };

  const cancelarReserva = async (reserva: Reserva, motivo: string): Promise<boolean> => {
    try {
      const actualizada = await reservaService.cancelar(reserva.id_rese, motivo);
      setReservas((prev) => prev && prev.map((x) => (x.id_rese === reserva.id_rese ? { ...x, ...actualizada } : x)));
      setDetalleReserva((prev) => (prev && prev.id_rese === reserva.id_rese ? { ...prev, ...actualizada } : prev));
      setToast({ tipo: 'ok', texto: 'Tu reserva fue cancelada.', id: Date.now() });
      return true;
    } catch (err) {
      setToast({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'No se pudo cancelar la reserva. Intenta de nuevo.',
        id: Date.now(),
      });
      return false;
    }
  };

  // Carga las reservas; al refrescar, mantiene al día el detalle abierto.
  const cargarReservas = useCallback((inicial: boolean) => {
    reservaService
      .misReservas()
      .then((res) => {
        setReservas(res.data);
        setDetalleReserva((prev) => {
          const nueva = prev && res.data.find((x) => x.id_rese === prev.id_rese);
          return nueva && (nueva.estado_rese !== prev.estado_rese || nueva.total_rese !== prev.total_rese) ? nueva : prev;
        });
      })
      .catch(() => {
        if (inicial) setToast({ tipo: 'error', texto: 'No se pudieron cargar tus reservas.', id: Date.now() });
      });
  }, []);

  const cargarOcultas = useCallback(() => {
    apiFetch('/pqr?ocultas=1&mias=1&per_page=100')
      .then((res) => setPqrsOcultas(res.data ?? []))
      .catch(() => setPqrsOcultas([]));
    apiFetch('/reservas?ocultas=1&per_page=100')
      .then((res) => setReservasOcultas(res.data ?? []))
      .catch(() => setReservasOcultas([]));
  }, []);

  // Oculta o vuelve a mostrar una reserva en la lista del usuario.
  const alternarOcultaReserva = async (reserva: Reserva, ocultar: boolean) => {
    try {
      await apiFetch(`/reservas/${reserva.id_rese}/ocultar`, {
        method: 'POST',
        body: JSON.stringify({ vista: 'usuario', oculta: ocultar }),
      });
      if (ocultar) {
        setReservas((prev) => prev && prev.filter((x) => x.id_rese !== reserva.id_rese));
        setReservasOcultas((prev) => [reserva, ...(prev ?? [])]);
      } else {
        setReservasOcultas((prev) => prev && prev.filter((x) => x.id_rese !== reserva.id_rese));
        setReservas((prev) => [reserva, ...(prev ?? [])]);
      }
      setDetalleReserva(null);
      setToast({ tipo: 'ok', texto: ocultar ? 'Reserva oculta. La encuentras en "Ocultas".' : 'Reserva visible de nuevo.', id: Date.now() });
    } catch (err) {
      setToast({ tipo: 'error', texto: err instanceof Error ? err.message : 'No se pudo completar la acción.', id: Date.now() });
    }
  };

  // Oculta o vuelve a mostrar una PQR en la lista del usuario.
  const alternarOcultaPqr = async (pqr: Pqr, ocultar: boolean) => {
    try {
      await apiFetch(`/pqr/${pqr.id_pqr}/ocultar`, {
        method: 'POST',
        body: JSON.stringify({ vista: 'usuario', oculta: ocultar }),
      });
      if (ocultar) {
        setPqrs((prev) => prev && prev.filter((p) => p.id_pqr !== pqr.id_pqr));
        setPqrsOcultas((prev) => [pqr, ...(prev ?? [])]);
      } else {
        setPqrsOcultas((prev) => prev && prev.filter((p) => p.id_pqr !== pqr.id_pqr));
        setPqrs((prev) => [pqr, ...(prev ?? [])]);
      }
      setDetallePqr(null);
      setToast({ tipo: 'ok', texto: ocultar ? 'PQR oculta. La encuentras en "Ocultas".' : 'PQR visible de nuevo.', id: Date.now() });
    } catch (err) {
      setToast({ tipo: 'error', texto: err instanceof Error ? err.message : 'No se pudo completar la acción.', id: Date.now() });
    }
  };

  const enviarRespuestaPqr = async (pqr: Pqr, mensaje: string): Promise<boolean> => {
    try {
      const seg = await pqrService.responder(pqr.id_pqr, mensaje);
      setPqrs((prev) => prev && prev.map((p) => (p.id_pqr === pqr.id_pqr ? agregarSeguimiento(p, seg) : p)));
      setDetallePqr((prev) => (prev && prev.id_pqr === pqr.id_pqr ? agregarSeguimiento(prev, seg) : prev));
      setToast({ tipo: 'ok', texto: 'Tu mensaje fue enviado.', id: Date.now() });
      return true;
    } catch (err) {
      setToast({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'No se pudo enviar tu mensaje. Intenta de nuevo.',
        id: Date.now(),
      });
      return false;
    }
  };

  useEffect(() => {
    cargarPqrs(true);
    cargarOcultas();
    cargarReservas(true);

    // Cuando el equipo mueve tu PQR de fase, se refleja aquí sin recargar.
    const refrescar = () => {
      if (document.visibilityState === 'visible') {
        cargarPqrs(false);
        cargarReservas(false);
      }
    };
    const timer = window.setInterval(refrescar, 30000);
    document.addEventListener('visibilitychange', refrescar);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refrescar);
    };
  }, [cargarPqrs, cargarReservas, cargarOcultas]);

  const abrirPqr = (p: Pqr) => {
    setDetallePqr(p);
    if (p.ultima_actuacion_en) {
      guardarVisto(p.id_pqr, p.ultima_actuacion_en);
      setVistos(leerVistos());
    }
  };
  const cerrarPqr = () => {
    setDetallePqr(null);
    cargarPqrs(false);
  };

  // Al abrir una PQR se pide su seguimiento completo y se refresca solo
  // mientras esté abierta (así el usuario ve cuando el equipo avanza la fase).
  const detalleId = detallePqr?.id_pqr;
  useEffect(() => {
    if (detalleId === undefined) return;
    let vivo = true;
    const cargar = () =>
      pqrService
        .obtener(detalleId)
        .then((p) => {
          if (!vivo) return;
          setDetallePqr((prev) => (prev && prev.id_pqr === p.id_pqr ? p : prev));
          const ultimo = p.seguimientos?.[p.seguimientos.length - 1]?.created_at;
          if (ultimo) {
            guardarVisto(p.id_pqr, ultimo);
            setVistos(leerVistos());
          }
        })
        .catch(() => {
          // Si falla el refresco, se queda con lo que ya está en pantalla.
        });
    cargar();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') cargar();
    }, 20000);
    return () => {
      vivo = false;
      window.clearInterval(timer);
    };
  }, [detalleId]);

  const initials = (user?.name || 'SK').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const handleFotoClick = () => fileInputRef.current?.click();
  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const original = e.target.files?.[0];
    e.target.value = '';
    if (!original) return;
    if (!original.type.startsWith('image/')) {
      setToast({ tipo: 'error', texto: 'El archivo debe ser una imagen (JPG, PNG o WEBP).', id: Date.now() });
      return;
    }

    setSubiendoFoto(true);
    setToast(null);
    try {
      // Se reduce antes de subir: PHP acepta solo 2 MB por defecto y una
      // foto de celular pesa 3-6 MB (antes fallaba sin avisar).
      const file = await prepararImagen(original);
      if (file.size > 3 * 1024 * 1024) {
        setToast({ tipo: 'error', texto: 'La imagen no debe superar 3 MB.', id: Date.now() });
        return;
      }
      const formData = new FormData();
      formData.append('foto', file);
      const data = await apiFetch('/perfil/foto', { method: 'POST', body: formData });
      if (data?.foto_url) updateFotoUrl(data.foto_url);
      setToast({ tipo: 'ok', texto: 'Foto de perfil actualizada.', id: Date.now() });
    } catch (err) {
      setToast({ tipo: 'error', texto: err instanceof Error ? err.message : 'No se pudo subir la foto.', id: Date.now() });
    } finally {
      setSubiendoFoto(false);
    }
  };

  const pendientesPqr = useMemo(
    () => (pqrs ?? []).filter((p) => p.estado_pqr !== 'resuelto' && p.estado_pqr !== 'cerrado').length,
    [pqrs]
  );
  const reservasActivas = useMemo(
    () => (reservas ?? []).filter((r) => r.estado_rese === 'pendiente' || r.estado_rese === 'confirmada').length,
    [reservas]
  );

  // Qué tan completo está el perfil: solo cuenta lo que la persona puede
  // llenar ella misma (foto con la cámara; teléfono y ciudad en Ajustes).
  const perfilCampos = [
    { ok: !!user?.foto_url, label: 'foto' },
    { ok: !!user?.telefono, label: 'teléfono' },
    { ok: !!user?.ciudad, label: 'ciudad' },
  ];
  const faltantes = perfilCampos.filter((c) => !c.ok).map((c) => c.label);
  const perfilPct = Math.round(((perfilCampos.length - faltantes.length) / perfilCampos.length) * 100);
  const faltanDatos = !user?.telefono || !user?.ciudad;

  const filasInfo = [
    { label: 'Rol', value: esAdmin ? 'Administrador' : 'Cliente', editable: false },
    { label: 'Correo', value: user?.email, editable: false },
    { label: 'Teléfono', value: user?.telefono, editable: true },
    { label: 'Ciudad', value: user?.ciudad, editable: true },
    {
      label: 'Documento',
      value: user?.documento ? `${tipoDocumentoLabel(user.tipo_documento)} ${user.documento}` : null,
      editable: false,
    },
    { label: 'Nacimiento', value: user?.fecha_nacimiento ? fmtFecha(user.fecha_nacimiento) : null, editable: false },
  ];

  // Reservas futuras (la fecha viene como YYYY-MM-DD; se compara como texto
  // para que la zona horaria no mueva el día).
  const sidebar = (
    <aside className="pfx-side">
      <div className="pfx-card">
        <div className="pfx-card-head">
          <h3>Información</h3>
          <button title="Editar tus datos" type="button" className="pfx-link" onClick={() => setTab('ajustes')}>
            <i className="ti ti-edit" aria-hidden="true" /> Editar
          </button>
        </div>
        <div className="pfx-card-body">
          {filasInfo.map((f) => (
            <div className="pfx-row" key={f.label}>
              <span className="pfx-row-label">{f.label}</span>
              {f.value ? (
                <span className="pfx-row-value">{f.value}</span>
              ) : f.editable ? (
                <button title="Agregar este dato" type="button" className="pfx-link" onClick={() => setTab('ajustes')}>
                  + Agregar
                </button>
              ) : (
                <span className="pfx-row-value">—</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {perfilPct < 100 && (
        <div className="pfx-card">
          <div className="pfx-card-head">
            <h3>Perfil completo</h3>
            <span className="pfx-pct">{perfilPct} %</span>
          </div>
          <div className="pfx-card-body pfx-progress-body">
            <div
              className="pfx-bar"
              role="progressbar"
              aria-valuenow={perfilPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Perfil completado"
            >
              <span style={{ width: `${perfilPct}%` }} />
            </div>
            <p className="pfx-progress-hint">Te falta agregar: {faltantes.join(', ')}.</p>
            {faltanDatos && (
              <button title="Completar tus datos de perfil" type="button" className="pfx-btn pfx-btn-primary" onClick={() => setTab('ajustes')}>
                Completar datos
              </button>
            )}
          </div>
        </div>
      )}
    </aside>
  );

  const reservasProximas = useMemo(() => {
    const hoy = new Date().toLocaleDateString('en-CA');
    return (reservas ?? [])
      .filter(
        (r) =>
          (r.estado_rese === 'pendiente' || r.estado_rese === 'confirmada') &&
          String(r.fecha_evento_rese).slice(0, 10) >= hoy
      )
      .sort((x, y) => String(x.fecha_evento_rese).localeCompare(String(y.fecha_evento_rese)));
  }, [reservas]);

  const pqrEnCurso = useMemo(
    () => (pqrs ?? []).filter((p) => p.estado_pqr !== 'resuelto' && p.estado_pqr !== 'cerrado'),
    [pqrs]
  );

  return (
    <>
      <div className="pf-header">
        <HeroParticles />
        <div className="pf-header-inner">
          <div className="pf-avatar-wrap">
            {user?.foto_url ? (
              <img src={user.foto_url} alt="Foto de perfil" className="pf-avatar" style={{ objectFit: 'cover' }} />
            ) : (
              <div className="pf-avatar">{initials}</div>
            )}
            <button title="Cambiar tu foto de perfil"
              type="button"
              className="pf-avatar-edit"
              onClick={handleFotoClick}
              disabled={subiendoFoto}
              aria-label="Cambiar foto de perfil"
            >
              <i className="ti ti-camera" aria-hidden="true" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFotoChange} />
          </div>

          <div className="pf-meta">
            <div className="pf-badge">
              <i className={`ti ${esAdmin ? 'ti-shield-check' : 'ti-user-circle'}`} aria-hidden="true" />
              {esAdmin ? 'Administrador SkyedSocial' : 'Cliente SkyedSocial'}
            </div>
            <h1>{user?.name || 'Tu perfil'}</h1>
            <p className="pf-handle">@{(user?.email || '').split('@')[0]}</p>
          </div>

          <div className="pf-actions">
            {esAdmin && (
              <Link title="Ir al panel de administración social" to="/social/admin" className="btn-sm-outline pf-admin-link">
                <i className="ti ti-shield-check" aria-hidden="true" /> Panel de administración
              </Link>
            )}
            <Link title="Radicar una nueva PQR" to="/social/pqr" className="btn-sm-outline pfx-primary">
              <i className="ti ti-plus" aria-hidden="true" /> Nueva PQR
            </Link>
            <Link title="Ver los eventos" to="/social/eventos" className="btn-sm-outline">Ver eventos</Link>
          </div>
        </div>

        <div className="pf-tabs" role="tablist">
          <button title="Ver el resumen de tu cuenta" className={tab === 'resumen' ? 'active' : ''} onClick={() => setTab('resumen')}>Resumen</button>
          <button title="Ver mis PQR" className={tab === 'pqr' ? 'active' : ''} onClick={() => setTab('pqr')}>
            Mis PQR{pendientesPqr > 0 && <span className="pf-tab-count">{pendientesPqr}</span>}
          </button>
          <button title="Ver mis reservas" className={tab === 'reservas' ? 'active' : ''} onClick={() => setTab('reservas')}>
            Mis reservas{reservasActivas > 0 && <span className="pf-tab-count">{reservasActivas}</span>}
          </button>
          <button title="Ver los ajustes de tu cuenta" className={tab === 'ajustes' ? 'active' : ''} onClick={() => setTab('ajustes')}>Ajustes</button>
        </div>
      </div>

      <div className="pf-body">
        <Toast msg={toast} onClose={() => setToast(null)} />

        {tab === 'resumen' && (
          <div className="pfx-layout">
            {sidebar}

            <div className="pfx-main">
              <div className="pfx-strip">
                <div className="pfx-box accent">
                  <span className="pfx-num">{reservasActivas}</span>
                  <span className="pfx-lbl">Reservas activas</span>
                </div>
                <div className="pfx-box">
                  <span className="pfx-num">{reservas?.length ?? 0}</span>
                  <span className="pfx-lbl">Reservas totales</span>
                </div>
                <div className="pfx-box">
                  <span className="pfx-num">{pendientesPqr}</span>
                  <span className="pfx-lbl">PQR en curso</span>
                </div>
                <div className="pfx-box">
                  <span className="pfx-num">{pqrs?.length ?? 0}</span>
                  <span className="pfx-lbl">PQR enviadas</span>
                </div>
              </div>

              <div className="pfx-section-head">
                <h3>Próximas reservas</h3>
                <button title="Ver todas mis reservas" type="button" className="pfx-link" onClick={() => setTab('reservas')}>Ver todo →</button>
              </div>
              {reservasProximas.length === 0 ? (
                <div className="pfx-empty-line">
                  Sin reservas próximas. <Link title="Reservar tu evento" to="/social/reservar">reserva tu evento →</Link>
                </div>
              ) : (
                <div className="pfx-list">
                  {reservasProximas.slice(0, 3).map((r) => {
                    const pill = reservaEstadoPill(r.estado_rese);
                    return (
                      <div className="pfx-item" key={r.id_rese}>
                        <span className="pfx-chip"><i className="ti ti-calendar-event" aria-hidden="true" /></span>
                        <div className="pfx-item-main">
                          <span className="pfx-item-title">{nombreReserva(r)}</span>
                          <span className="pfx-item-sub">
                            {fmtFecha(r.fecha_evento_rese)} · {r.invitados_rese} invitados · {fmtMoney(r.total_rese)}
                          </span>
                        </div>
                        <span className={`pf-pill ${pill.cls}`}>{pill.txt}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="pfx-section-head">
                <h3>PQR en curso</h3>
                <button title="Ver todas mis PQR" type="button" className="pfx-link" onClick={() => setTab('pqr')}>Ver todo →</button>
              </div>
              {pqrEnCurso.length === 0 ? (
                <div className="pfx-empty-line">
                  Sin PQR en curso. <Link title="Radicar una PQR" to="/social/pqr">radicar una PQR →</Link>
                </div>
              ) : (
                <div className="pfx-list">
                  {pqrEnCurso.slice(0, 3).map((p) => (
                    <div className="pfx-item" key={p.id_pqr}>
                      <span className="pfx-chip"><i className={`ti ${pqrTipoIcon[p.tipo_pqr] ?? 'ti-message-report'}`} aria-hidden="true" /></span>
                      <div className="pfx-item-main">
                        <span className="pfx-item-title">{p.asunto_pqr}</span>
                        <span className="pfx-item-sub">{pqrTipoLabel[p.tipo_pqr]} · {p.radicado} · {fmtFecha(p.creado_en_pqr)}</span>
                      </div>
                      <PqrEstadoPill estado={p.estado_pqr} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'pqr' && (
          <div className="pf-list">
            {pqrs === null && <p className="pf-loading">Cargando tus PQR…</p>}
            {pqrs?.length === 0 && !pqrsOcultas?.length && (
              <div className="pfq-empty">
                <span className="pfq-empty-icon" aria-hidden="true"><i className="ti ti-message-report" /></span>
                <h3 className="pfq-empty-title">Aún no has radicado ninguna PQR</h3>
                <p className="pfq-empty-text">Preguntas, quejas o reclamos: te respondemos por este mismo perfil.</p>
                <Link title="Radicar una PQR" to="/social/pqr" className="pfx-btn pfx-btn-primary">
                  <i className="ti ti-plus" aria-hidden="true" /> Radicar una PQR
                </Link>
              </div>
            )}
            {hayPqr && (
              <>
                <div className="pf-list-head">
                  <h2>Mis PQR</h2>
                  <p>Toca una solicitud para ver su detalle.</p>
                </div>
                <ListToolbar
                  filtros={filtrosPqr}
                  onChange={setFiltrosPqr}
                  rangos={RANGOS_PQR}
                  estados={ESTADOS_PQR}
                  conteos={conteosPqr}
                  placeholder="Buscar por asunto, tipo, estado o radicado"
                  total={pqrs?.length ?? 0}
                  mostrando={pqrsFiltradas?.length ?? 0}
                  singular="solicitud"
                  plural="solicitudes"
                />
              </>
            )}
            {hayPqr && pqrsFiltradas?.length === 0 && (
              <div className="pfq-empty">
                <span className="pfq-empty-icon" aria-hidden="true"><i className="ti ti-search-off" /></span>
                <h3 className="pfq-empty-title">{filtrosPqr.estado === 'ocultas' ? 'No tienes nada oculto' : 'No encontramos resultados'}</h3>
                <p className="pfq-empty-text">{filtrosPqr.estado === 'ocultas' ? 'Lo que ocultes desde el detalle aparecerá aquí para que puedas volver a mostrarlo.' : 'Prueba con otra palabra, otro estado o cambia el rango de fechas.'}</p>
                <button title="Quitar todos los filtros" type="button" className="pfx-btn pfx-btn-primary" onClick={() => setFiltrosPqr(FILTROS_INICIALES)}>
                  Limpiar filtros
                </button>
              </div>
            )}
            {pqrsFiltradas?.map((p) => {
              const actual = indiceFaseVisible(p.estado_pqr);
              return (
                <button title="Ver el detalle de esta PQR" key={p.id_pqr} className="pf-list-item" onClick={() => abrirPqr(p)}>
                  <span className="pf-item-icon" aria-hidden="true"><i className={`ti ${pqrTipoIcon[p.tipo_pqr] ?? 'ti-message-report'}`} /></span>
                  <div className="pf-list-item-main">
                    <span className="pf-list-item-title">
                      {p.asunto_pqr}
                      {hayNovedad(p, vistos) && <span className="pqrx-updated">Novedad</span>}
                    </span>
                    <span className="pf-list-item-sub">{pqrTipoLabel[p.tipo_pqr]} · {fmtFecha(p.creado_en_pqr)}</span>
                    <span className="pqrx pqrx-mini" aria-hidden="true" style={{ '--fase': ESTADO_COLOR[p.estado_pqr] } as CSSProperties}>
                      {FASES_VISIBLES.map((f, i) => (
                        <span key={f.key} className={i < actual ? 'on' : i === actual ? 'now' : ''} />
                      ))}
                    </span>
                  </div>
                  <span className="pf-item-code">{p.radicado}</span>
                  <PqrEstadoPill estado={p.estado_pqr} />
                  <i className="ti ti-chevron-right pf-item-chevron" aria-hidden="true" />
                </button>
              );
            })}
          </div>
        )}

        {tab === 'reservas' && (
          <div className="pf-list">
            {reservas === null && <p className="pf-loading">Cargando tus reservas…</p>}
            {reservas?.length === 0 && !reservasOcultas?.length && (
              <div className="pfq-empty">
                <span className="pfq-empty-icon" aria-hidden="true"><i className="ti ti-calendar-event" /></span>
                <h3 className="pfq-empty-title">Aún no tienes reservas</h3>
                <p className="pfq-empty-text">Explora los eventos disponibles y reserva el tuyo en pocos pasos.</p>
                <Link title="Ver los eventos disponibles" to="/social/eventos" className="pfx-btn pfx-btn-primary">
                  <i className="ti ti-search" aria-hidden="true" /> Ver eventos
                </Link>
              </div>
            )}
            {hayReservas && (
              <>
                <div className="pf-list-head pf-list-head-row">
                  <div>
                    <h2>Mis reservas</h2>
                    <p>Aquí ves el estado de cada una de tus reservas.</p>
                  </div>
                  <Link title="Hacer una nueva reserva" to="/social/reservar" className="btn-sm-outline pfx-primary">
                    <i className="ti ti-plus" aria-hidden="true" /> Nueva reserva
                  </Link>
                </div>
                <ListToolbar
                  filtros={filtrosReservas}
                  onChange={setFiltrosReservas}
                  rangos={RANGOS_RESERVAS}
                  estados={ESTADOS_RESERVAS}
                  conteos={conteosReservas}
                  placeholder="Buscar por evento o estado"
                  total={reservas?.length ?? 0}
                  mostrando={reservasFiltradas?.length ?? 0}
                  singular="reserva"
                  plural="reservas"
                />
              </>
            )}
            {hayReservas && reservasFiltradas?.length === 0 && (
              <div className="pfq-empty">
                <span className="pfq-empty-icon" aria-hidden="true"><i className="ti ti-search-off" /></span>
                <h3 className="pfq-empty-title">{filtrosReservas.estado === 'ocultas' ? 'No tienes nada oculto' : 'No encontramos resultados'}</h3>
                <p className="pfq-empty-text">{filtrosReservas.estado === 'ocultas' ? 'Lo que ocultes desde el detalle aparecerá aquí para que puedas volver a mostrarlo.' : 'Prueba con otra palabra, otro estado o cambia el rango de fechas.'}</p>
                <button title="Quitar todos los filtros" type="button" className="pfx-btn pfx-btn-primary" onClick={() => setFiltrosReservas(FILTROS_INICIALES)}>
                  Limpiar filtros
                </button>
              </div>
            )}
            {reservasFiltradas?.map((r) => {
              const pill = reservaEstadoPill(r.estado_rese);
              return (
                <button title="Ver el detalle de esta reserva" key={r.id_rese} className="pf-list-item" onClick={() => setDetalleReserva(r)}>
                  <span className="pf-item-icon" aria-hidden="true"><i className="ti ti-calendar-event" /></span>
                  <div className="pf-list-item-main">
                    <span className="pf-list-item-title">{nombreReserva(r)}</span>
                    <span className="pf-list-item-sub">{fmtFecha(r.fecha_evento_rese)} · {r.invitados_rese} invitados · {Number(r.total_rese) > 0 ? fmtMoney(r.total_rese) : 'Total por definir'}</span>
                  </div>
                  <span className="pf-item-code">Reserva #{r.id_rese}</span>
                  <span className={`pf-pill ${pill.cls}`}>{pill.txt}</span>
                  <i className="ti ti-chevron-right pf-item-chevron" aria-hidden="true" />
                </button>
              );
            })}
          </div>
        )}

        {tab === 'ajustes' && (
          <div className="pfx-layout">
            {sidebar}
            <div className="pfx-main pfx-stack">
              <div className="pfx-me">
                <div className="pfx-me-avatar-wrap">
                  {user?.foto_url ? (
                    <img src={user.foto_url} alt="Foto de perfil" className="pfx-me-avatar" />
                  ) : (
                    <div className="pfx-me-avatar">{initials}</div>
                  )}
                  <button title="Cambiar tu foto de perfil"
                    type="button"
                    className="pfx-me-cam"
                    onClick={handleFotoClick}
                    disabled={subiendoFoto}
                    aria-label="Cambiar foto de perfil"
                  >
                    <i className="ti ti-camera" aria-hidden="true" />
                  </button>
                </div>
                <div className="pfx-me-info">
                  <strong>{user?.name || 'Tu perfil'}</strong>
                  <span className="pfx-tag">
                    <i className={`ti ${esAdmin ? 'ti-shield-check' : 'ti-user-circle'}`} aria-hidden="true" />
                    {esAdmin ? 'Administrador' : 'Cliente'}
                  </span>
                </div>
              </div>
              <AjustesForm user={user} updateProfile={updateProfile} />
              <div className="pfx-pair">
                <CambiarContrasena />
                <CuentaCard rol={esAdmin ? 'Administrador' : 'Cliente'} deleteAccount={deleteAccount} />
              </div>
            </div>
          </div>
        )}
      </div>

      {detalleReserva && (
        <ReservaDetalle
          reserva={detalleReserva}
          onClose={() => setDetalleReserva(null)}
          onRenombrar={(nombre) => renombrarReserva(detalleReserva, nombre)}
          onCancelar={(motivo) => cancelarReserva(detalleReserva, motivo)}
          oculta={!!reservasOcultas?.some((x) => x.id_rese === detalleReserva.id_rese)}
          onOcultar={() => alternarOcultaReserva(detalleReserva, !reservasOcultas?.some((x) => x.id_rese === detalleReserva.id_rese))}
        />
      )}
      {detallePqr && (
        <PqrDetalle
          pqr={detallePqr}
          onClose={cerrarPqr}
          onEnviar={(mensaje) => enviarRespuestaPqr(detallePqr, mensaje)}
          oculta={!!pqrsOcultas?.some((x) => x.id_pqr === detallePqr.id_pqr)}
          onOcultar={() => alternarOcultaPqr(detallePqr, !pqrsOcultas?.some((x) => x.id_pqr === detallePqr.id_pqr))}
        />
      )}
    </>
  );
}

/** Solo letras (con tildes y ñ) y espacios, igual que el registro. */
const soloLetras = (valor: string) => valor.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '').slice(0, 50);
const soloNumeros = (valor: string) => valor.replace(/\D/g, '').slice(0, 15);

function AjustesForm({
  user,
  updateProfile,
}: {
  user: ReturnType<typeof useAuth>['user'];
  updateProfile: ReturnType<typeof useAuth>['updateProfile'];
}) {
  const [nombre, setNombre] = useState(user?.name?.split(' ')[0] ?? '');
  const [apellido, setApellido] = useState(user?.name?.split(' ').slice(1).join(' ') ?? '');
  const [telefono, setTelefono] = useState(user?.telefono ?? '');
  const [ciudad, setCiudad] = useState(user?.ciudad ?? '');
  const [tipoDocumento, setTipoDocumento] = useState(normalizarTipoDoc(user?.tipo_documento));
  const [documento, setDocumento] = useState(user?.documento ? String(user.documento) : '');
  const [fechaNacimiento, setFechaNacimiento] = useState(soloFecha(user?.fecha_nacimiento));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<ToastMsg | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (telefono && (telefono.length < 7 || telefono.length > 15)) {
      setMsg({ tipo: 'error', texto: 'El teléfono debe tener entre 7 y 15 dígitos.', id: Date.now() });
      return;
    }
    if (documento && (documento.length < 5 || documento.length > 15)) {
      setMsg({ tipo: 'error', texto: 'El número de documento debe tener entre 5 y 15 dígitos.', id: Date.now() });
      return;
    }
    if (fechaNacimiento && fechaNacimiento > new Date().toLocaleDateString('en-CA')) {
      setMsg({ tipo: 'error', texto: 'La fecha de nacimiento no puede ser futura.', id: Date.now() });
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        nombre_u: nombre.trim(),
        apellido_u: apellido.trim(),
        telefono_u: telefono.trim(),
        ciudad_u: ciudad.trim(),
        tipo_documento_u: tipoDocumento || undefined,
        documento_u: documento ? Number(documento) : undefined,
        fecha_nacimiento_u: fechaNacimiento || undefined,
      });
      setMsg({ tipo: 'ok', texto: 'Tus datos se actualizaron correctamente.', id: Date.now() });
    } catch (err) {
      setMsg({ tipo: 'error', texto: err instanceof Error ? err.message : 'No se pudieron guardar los cambios.', id: Date.now() });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pfx-card">
      <div className="pfx-card-head pfx-head-icon">
        <span className="pfx-chip pfx-chip-sm"><i className="ti ti-id-badge-2" aria-hidden="true" /></span>
        <h3>Datos personales</h3>
      </div>
      <form className="pfx-form" onSubmit={submit}>
        <Toast msg={msg} onClose={() => setMsg(null)} />
        <div className="pfx-form-row">
          <label className="pfx-field">
            <span>Nombre</span>
            <input value={nombre} onChange={(e) => setNombre(soloLetras(e.target.value))} required maxLength={50} />
          </label>
          <label className="pfx-field">
            <span>Apellido</span>
            <input value={apellido} onChange={(e) => setApellido(soloLetras(e.target.value))} required maxLength={50} />
          </label>
        </div>
        <div className="pfx-form-row">
          <label className="pfx-field">
            <span>Tipo de documento</span>
            <select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)}>
              <option value="">Seleccionar...</option>
              <option value="CC">Cédula de ciudadanía</option>
              <option value="TI">Tarjeta de identidad</option>
              <option value="CE">Cédula de extranjería</option>
              <option value="PA">Pasaporte</option>
            </select>
          </label>
          <label className="pfx-field">
            <span>Número de documento</span>
            <input value={documento} onChange={(e) => setDocumento(soloNumeros(e.target.value))} inputMode="numeric" placeholder="1234567890" />
          </label>
        </div>
        <label className="pfx-field">
          <span>Teléfono</span>
          <input value={telefono} onChange={(e) => setTelefono(soloNumeros(e.target.value))} inputMode="numeric" placeholder="3001234567" />
        </label>
        <label className="pfx-field">
          <span>Ciudad</span>
          <input value={ciudad} onChange={(e) => setCiudad(e.target.value.slice(0, 80))} placeholder="Ej. Sogamoso, Boyacá" />
        </label>
        <label className="pfx-field">
          <span>Fecha de nacimiento</span>
          <input type="date" value={fechaNacimiento} max={new Date().toLocaleDateString('en-CA')} onChange={(e) => setFechaNacimiento(e.target.value)} />
        </label>
        <div className="pfx-form-actions">
          <button title={saving ? 'Guardando…' : 'Guardar los cambios de tu perfil'} className="pfx-btn pfx-btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
        </div>
      </form>
    </div>
  );
}

function CambiarContrasena() {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [ver, setVer] = useState(false);
  
  // Estados para controlar el modal y las cargas
  const [verModal, setVerModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [msg, setMsg] = useState<ToastMsg | null>(null);

  // EFECTO NUEVO: Bloquear el scroll de la página cuando el modal se abre
  useEffect(() => {
    if (verModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    // Limpieza en caso de que el componente se desmonte
    return () => {
      document.body.style.overflow = '';
    };
  }, [verModal]);

  // Acción 1: Validar la contraseña actual
  const verificarActual = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!actual) return;
    setVerificando(true);
    
    try {
      await apiFetch('/verificar-contrasena', {
        method: 'POST',
        body: JSON.stringify({ contrasena_actual: actual }),
      });
      setVerModal(true); 
    } catch (err) {
      setMsg({ tipo: 'error', texto: 'La contraseña actual es incorrecta.', id: Date.now() });
    } finally {
      setVerificando(false);
    }
  };

  // Acción 2: Guardar la nueva contraseña
  const submitCambio = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    
    const motivo = errorContrasena(nueva);
    if (motivo) {
      setMsg({ tipo: 'error', texto: motivo, id: Date.now() });
      return;
    }
    if (nueva === actual) {
      setMsg({ tipo: 'error', texto: 'La nueva contraseña debe ser distinta a la actual.', id: Date.now() });
      return;
    }
    if (nueva !== confirmar) {
      setMsg({ tipo: 'error', texto: 'Las contraseñas no coinciden.', id: Date.now() });
      return;
    }
    
    setSaving(true);
    try {
      await apiFetch('/cambiar-contrasena', {
        method: 'PUT',
        body: JSON.stringify({
          contrasena_actual: actual,
          nueva_contrasena: nueva,
          nueva_contrasena_confirmation: confirmar,
        }),
      });
      setMsg({ tipo: 'ok', texto: 'Contraseña actualizada correctamente.', id: Date.now() });
      setVerModal(false);
      setActual('');
      setNueva('');
      setConfirmar('');
      setVer(false);
    } catch (err) {
      setMsg({ tipo: 'error', texto: err instanceof Error ? err.message : 'No se pudo cambiar la contraseña. Asegúrate de no usar una contraseña reciente.', id: Date.now() });
    } finally {
      setSaving(false);
    }
  };

  const tipo = ver ? 'text' : 'password';

  return (
    <>
      <div className="pfx-card">
        <div className="pfx-card-head pfx-head-icon">
          <span className="pfx-chip pfx-chip-sm"><i className="ti ti-lock" aria-hidden="true" /></span>
          <h3>Seguridad</h3>
        </div>
        <form className="pfx-form" onSubmit={verificarActual}>
          <Toast msg={msg} onClose={() => setMsg(null)} />
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Digita tu contraseña actual para poder actualizarla.
          </p>
          <label className="pfx-field">
            <span>Contraseña actual</span>
            <input type={tipo} value={actual} onChange={(e) => setActual(e.target.value)} required autoComplete="current-password" />
          </label>
          <label className="pf-check">
            <input type="checkbox" checked={ver} onChange={(e) => setVer(e.target.checked)} />
            Mostrar contraseña
          </label>
          <div className="pfx-form-actions">
            <button type="submit" title="Validar la contraseña actual y continuar" className="pfx-btn pfx-btn-primary" disabled={verificando || !actual}>
              {verificando ? 'Validando…' : 'Validar y cambiar'}
            </button>
          </div>
        </form>
      </div>

      {/* Modal para la nueva contraseña */}
      {verModal && createPortal(
        <div className="pf-modal-backdrop pfp-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setVerModal(false); }}>
          <div 
            className="pf-modal" 
            style={{ 
              maxWidth: '420px', 
              padding: '0', 
              backgroundColor: 'var(--plum)', /* Se fuerza el fondo estático y sólido */
              border: '1px solid rgba(255,255,255,0.1)',
              position: 'relative'
            }} 
            role="dialog" 
            aria-modal="true"
          >
            <div className="pf-modal-head" style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#fff', margin: 0 }}>Nueva contraseña</h3>
              <button type="button" title="Cerrar ventana" className="pf-modal-close" onClick={() => setVerModal(false)} aria-label="Cerrar">×</button>
            </div>
            
            <form className="pfx-form" onSubmit={submitCambio} style={{ padding: '1.5rem' }}>
              <label className="pfx-field">
                <span>Nueva contraseña</span>
                <input type={tipo} value={nueva} onChange={(e) => setNueva(e.target.value)} required autoComplete="new-password" maxLength={72} autoFocus />
                <small style={{ color: 'var(--text-muted)' }}>Mínimo 8 caracteres, con mayúscula, minúscula y número.</small>
              </label>
              
              <label className="pfx-field" style={{ marginTop: '1rem' }}>
                <span>Confirmar nueva contraseña</span>
                <input type={tipo} value={confirmar} onChange={(e) => setConfirmar(e.target.value)} required autoComplete="new-password" maxLength={72} />
              </label>
              
              <label className="pf-check" style={{ marginTop: '1rem' }}>
                <input type="checkbox" checked={ver} onChange={(e) => setVer(e.target.checked)} />
                Mostrar contraseñas
              </label>
              
              <div className="pfx-modal-actions" style={{ marginTop: '1.75rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" title="Cancelar y cerrar" className="pfx-btn pfx-btn-outline" onClick={() => setVerModal(false)} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" title="Guardar la nueva contraseña" className="pfx-btn pfx-btn-primary pfx-btn-solid" disabled={saving || !nueva || !confirmar}>
                  {saving ? 'Guardando…' : 'Guardar contraseña'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.querySelector('.mod-social') ?? document.body,
      )}
    </>
  );
}

/** Igual que en SKYED Deportivo: desactiva la cuenta (deleteAccount) y cierra la sesión. */
function CuentaCard({
  rol,
  deleteAccount,
}: {
  rol: string;
  deleteAccount: ReturnType<typeof useAuth>['deleteAccount'];
}) {
  const navigate = useNavigate();
  const [confirmar, setConfirmar] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState<ToastMsg | null>(null);

  const eliminar = async () => {
    setEliminando(true);
    setError(null);
    try {
      await deleteAccount();
      navigate('/login');
    } catch (err) {
      setError({ tipo: 'error', texto: err instanceof Error ? err.message : 'No se pudo eliminar la cuenta. Intenta de nuevo.', id: Date.now() });
      setEliminando(false);
    }
  };

  const cerrar = () => {
    if (eliminando) return;
    setConfirmar(false);
    setError(null);
  };

  return (
    <>
      <div className="pfx-card pfx-card-danger">
        <div className="pfx-card-head pfx-head-icon">
          <span className="pfx-chip pfx-chip-sm"><i className="ti ti-alert-triangle" aria-hidden="true" /></span>
          <h3>Cuenta</h3>
        </div>
        <div className="pfx-form">
          <div className="pfx-row">
            <span className="pfx-row-label">Rol</span>
            <span className="pfx-row-value">{rol}</span>
          </div>
          <div className="pfx-form-actions">
            <button title={eliminando ? 'Eliminando…' : 'Eliminar tu cuenta'} type="button" className="pfx-btn pfx-btn-danger" onClick={() => setConfirmar(true)} disabled={eliminando}>
              {eliminando ? 'Eliminando…' : 'Eliminar cuenta'}
            </button>
          </div>
        </div>
      </div>

      {confirmar && (
        <div className="pf-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) cerrar(); }}>
          <div className="pf-modal">
            <div className="pf-modal-head">
              <h3 className="pfx-danger-title">
                <i className="ti ti-alert-triangle" aria-hidden="true" /> Desactivar cuenta
              </h3>
              <button title="Cerrar" className="pf-modal-close" onClick={cerrar} disabled={eliminando} aria-label="Cerrar">×</button>
            </div>
            <p className="pfx-danger-text">
              Vas a desactivar tu cuenta. Se cerrará tu sesión y no podrás iniciar sesión de nuevo hasta que un administrador la reactive.
            </p>
            <Toast msg={error} onClose={() => setError(null)} />
            <div className="pfx-modal-actions">
              <button title="Cancelar y conservar tu cuenta" type="button" className="pfx-btn pfx-btn-outline" onClick={cerrar} disabled={eliminando}>Cancelar</button>
              <button title={eliminando ? 'Eliminando…' : 'Confirmar y eliminar tu cuenta'} type="button" className="pfx-btn pfx-btn-danger pfx-btn-solid" onClick={eliminar} disabled={eliminando}>
                {eliminando ? 'Eliminando…' : 'Sí, eliminar cuenta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}