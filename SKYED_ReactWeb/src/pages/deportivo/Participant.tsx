import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Protected from '../../components/Protected';
import SportWrapper from '../../components/deportivo/SportWrapper';
import { useAuth } from '../../context/AuthContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { apiFetch } from '../../services/api';
import { prepararImagen } from '../../utils/prepararImagen';
import { errorContrasena } from '../../utils/validaciones';
import '../../styles/deportivo/participante.css';
import '../../styles/shared/nosotrosMotion.css';
// import '../../styles/deportivo/filtros-participante.css';
import { createPortal } from 'react-dom';


type TabId = 'resumen' | 'historial' | 'inscripciones' | 'ajustes';

interface EventoInscrito {
  id: number;
  nombre: string;
  categoria: string;
  fecha: string;
  hora: string;
  ubicacion: string;
  imagen_url: string | null;
}

interface Pago {
  metodo_pago: string | null;
  referencia: string | null;
  comprobante: string | null;
  monto: number | null;
  fecha: string | null;
  estado: string | null;
}

interface Qr {
  codigo: string | null;
  estado: string | null;
  fecha_uso?: string | null;
}

interface Inscripcion {
  id: number;
  estado: string;
  fecha: string;
  precio_pagado: number | null;
  talla_camiseta?: string | null;
  evento: EventoInscrito | null;
  pago: Pago | null;
  qr: Qr | null;
}

interface HistorialItem {
  id_hp: number;
  fecha_hp: string;
  estado_hp: 'inscrito' | 'finalizado' | 'asistio' | 'abandono';
  observaciones_hp: string | null;
  evento: EventoInscrito | null;
}

function tipoDocumentoLabel(tipo: string | null | undefined) {
  const map: Record<string, string> = {
    CC: 'C.C.', cedula_ciudadania: 'C.C.',
    TI: 'T.I.', tarjeta_identidad: 'T.I.',
    CE: 'C.E.', cedula_extranjeria: 'C.E.',
    PA: 'Pasaporte', pasaporte: 'Pasaporte',
  };
  return tipo ? (map[tipo] || tipo) : '';
}

function fmtFechaLarga(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

function fmtMoney(n: number | null | undefined) {
  return '$' + (Number(n) || 0).toLocaleString('es-CO');
}

/** Normaliza el tipo de documento que llega de la base ("cedula_ciudadania" -> "CC"). */
function tipoDocumentoCodigo(tipo: string | null | undefined) {
  const map: Record<string, string> = {
    cedula_ciudadania: 'CC', tarjeta_identidad: 'TI', cedula_extranjeria: 'CE', pasaporte: 'PA',
  };
  return tipo ? (map[tipo] || tipo) : '';
}

function estadoQrLabel(estado: string | null | undefined) {
  const map: Record<string, string> = {
    activo: 'Válida', usado: 'Ya usada', cancelado: 'Cancelada', pendiente: 'Pendiente de pago',
  };
  return estado ? (map[estado] || estado) : '—';
}

function estadoPagoLabel(estado: string | null | undefined) {
  if (!estado) return '—';
  const map: Record<string, string> = { pendiente: 'Pendiente de verificación', cancelado: 'Cancelado' };
  return map[estado] || estado.charAt(0).toUpperCase() + estado.slice(1);
}

function estadoPill(estado: string) {
  if (estado === 'pendiente') return { cls: 'pending', txt: 'Pago pendiente' };
  if (estado === 'cancelada') return { cls: 'warn', txt: 'Cancelada' };
  return { cls: 'ok', txt: 'Confirmada' };
}

/* ---------- Búsqueda y filtros de las listas (Inscripciones / Historial) ---------- */
type RangoFecha = 'todas' | '7d' | '30d' | 'mes' | 'anio' | 'proximas' | 'pasadas' | 'custom';

interface Filtros {
  q: string;
  rango: RangoFecha;
  desde: string;
  hasta: string;
  orden: 'recientes' | 'antiguos';
  estado: string; // 'todos' o el valor del estado
}

const FILTROS_INSC: Filtros = { q: '', rango: 'todas', desde: '', hasta: '', orden: 'antiguos', estado: 'todos' };
const FILTROS_HIST: Filtros = { q: '', rango: 'todas', desde: '', hasta: '', orden: 'recientes', estado: 'todos' };

const ESTADOS_INSC = [
  { value: 'todos', label: 'Todas' },
  { value: 'confirmada', label: 'Confirmada' },
  { value: 'pendiente', label: 'Pago pendiente' },
];

const ESTADO_HP_LABEL: Record<string, string> = {
  asistio: 'Asistió',
  finalizado: 'Finalizado',
  inscrito: 'Inscrito',
  abandono: 'Abandonó',
};

const ESTADOS_HIST = [
  { value: 'todos', label: 'Todos' },
  { value: 'asistio', label: ESTADO_HP_LABEL.asistio },
  { value: 'finalizado', label: ESTADO_HP_LABEL.finalizado },
  { value: 'inscrito', label: ESTADO_HP_LABEL.inscrito },
  { value: 'abandono', label: ESTADO_HP_LABEL.abandono },
];

const RANGOS_INSC: { value: RangoFecha; label: string }[] = [
  { value: 'todas', label: 'Todas las fechas' },
  { value: 'proximas', label: 'Próximas' },
  { value: 'pasadas', label: 'Pasadas' },
  { value: 'mes', label: 'Este mes' },
  { value: 'anio', label: 'Este año' },
  { value: 'custom', label: 'Rango personalizado' },
];

const RANGOS_HIST: { value: RangoFecha; label: string }[] = [
  { value: 'todas', label: 'Todas las fechas' },
  { value: '7d', label: 'Últimos 7 días' },
  { value: '30d', label: 'Últimos 30 días' },
  { value: 'mes', label: 'Este mes' },
  { value: 'anio', label: 'Este año' },
  { value: 'custom', label: 'Rango personalizado' },
];

function soloFecha(iso: string | null | undefined) {
  return iso ? String(iso).slice(0, 10) : '';
}

/** Minúsculas y sin tildes, para que "carrera" encuentre "Cárrera". */
function normalizar(t: string) {
  return t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function isoLocal(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function contarPor<T>(items: T[] | null, get: (x: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  (items ?? []).forEach((it) => {
    const k = get(it);
    out[k] = (out[k] ?? 0) + 1;
  });
  return out;
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
  items: T[],
  f: Filtros,
  getFecha: (x: T) => string | null | undefined,
  getTexto: (x: T) => string,
  getEstado: (x: T) => string,
): T[] {
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
  base: Filtros;
  onChange: (f: Filtros) => void;
  rangos: { value: RangoFecha; label: string }[];
  estados: { value: string; label: string }[];
  conteos: Record<string, number>;
  placeholder: string;
  ordenLabels: { recientes: string; antiguos: string };
  total: number;
  mostrando: number;
  singular: string;
  plural: string;
}

function ListToolbar({ filtros, base, onChange, rangos, estados, conteos, placeholder, ordenLabels, total, mostrando, singular, plural }: ListToolbarProps) {
  const set = (parcial: Partial<Filtros>) => onChange({ ...filtros, ...parcial });
  const activo = filtros.q.trim() !== '' || filtros.rango !== 'todas' || filtros.estado !== 'todos';
  const unidad = (n: number) => (n === 1 ? singular : plural);

  return (
    <div className="part-toolbar">
      <div className="part-toolbar-row">
        <label className="part-search">
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
          className="part-tool-select"
          value={filtros.rango}
          onChange={(e) => set({ rango: e.target.value as RangoFecha })}
          aria-label="Filtrar por fecha"
        >
          {rangos.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <select
          className="part-tool-select"
          value={filtros.orden}
          onChange={(e) => set({ orden: e.target.value as Filtros['orden'] })}
          aria-label="Ordenar"
        >
          <option value="recientes">{ordenLabels.recientes}</option>
          <option value="antiguos">{ordenLabels.antiguos}</option>
        </select>
      </div>

      <div className="part-chips" role="group" aria-label="Filtrar por estado">
        {estados.map((e) => {
          const n = e.value === 'todos' ? total : (conteos[e.value] ?? 0);
          const sel = filtros.estado === e.value;
          return (
            <button title={`Filtrar por estado: ${e.label}`}
              key={e.value}
              type="button"
              className={`part-chip${sel ? ' active' : ''}`}
              aria-pressed={sel}
              onClick={() => set({ estado: e.value })}
            >
              {e.label} <span className="part-chip-count">{n}</span>
            </button>
          );
        })}
      </div>

      {filtros.rango === 'custom' && (
        <div className="part-toolbar-row part-toolbar-dates">
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

      <div className="part-toolbar-foot">
        <span>
          {activo ? `Mostrando ${mostrando} de ${total}` : `${total} ${unidad(total)}`}
        </span>
        {activo && (
          <button title="Quitar todos los filtros"
            type="button"
            className="part-tool-clear"
            onClick={() => onChange({ ...base, orden: filtros.orden })}
          >
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  );
}

export default function Participant() {
  return (
    <Protected>
      <SportWrapper>
        <ParticipantPanel />
      </SportWrapper>
    </Protected>
  );
}

const TABS: TabId[] = ['resumen', 'historial', 'inscripciones', 'ajustes'];

function ParticipantPanel() {
  const { user, updateFotoUrl } = useAuth();
  const { darkMode } = useAccessibility();

  // La pestaña vive en la URL (/deportivo/perfil?tab=inscripciones) para que
  // las opciones del menú de la cuenta abran directamente la sección elegida.
  const [searchParams, setSearchParams] = useSearchParams();
  const entradaId = Number(searchParams.get('entrada')) || null;
  const tabUrl = searchParams.get('tab') as TabId | null;
  const tab: TabId = tabUrl && TABS.includes(tabUrl) ? tabUrl : 'resumen';
  const setTab = (nueva: TabId) =>
    setSearchParams(nueva === 'resumen' ? {} : { tab: nueva }, { replace: true });
  const [inscripciones, setInscripciones] = useState<Inscripcion[] | null>(null);
  const [historial, setHistorial] = useState<HistorialItem[] | null>(null);
  const [detalle, setDetalle] = useState<Inscripcion | null>(null);
  const [verQr, setVerQr] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cancelarInsc, setCancelarInsc] = useState<Inscripcion | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [filtrosInsc, setFiltrosInsc] = useState<Filtros>(FILTROS_INSC);
  const [filtrosHist, setFiltrosHist] = useState<Filtros>(FILTROS_HIST);

  const [infoOpen, setInfoOpen] = useState(false);

useEffect(() => {
  const mq = window.matchMedia('(min-width: 901px)');
  const sync = () => setInfoOpen(mq.matches);
  sync();
  mq.addEventListener('change', sync);
  return () => mq.removeEventListener('change', sync);
}, []);

  useEffect(() => {
    apiFetch('/mis-inscripciones')
      .then((data) => setInscripciones(data.inscripciones ?? []))
      .catch(() => setLoadError('No se pudieron cargar tus inscripciones.'));
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    apiFetch(`/usuarios/${user.id}/historial`)
      .then((data) => setHistorial(data.historial ?? []))
      .catch(() => {});
  }, [user?.id]);

  // Abre directamente el detalle (y el QR) de una inscripción cuando llega
  // ?entrada=<id evento> en la URL, por ejemplo desde "Ver mi entrada".
  // Una sola actualización de la URL: cambia a la pestaña y quita ?entrada=.
  useEffect(() => {
    if (!entradaId || !inscripciones) return;
    const insc = inscripciones.find((i) => i.evento?.id === entradaId && i.estado !== 'cancelada');
    if (insc) {
      setDetalle(insc);
      setVerQr(!!insc.qr?.codigo);
      setSearchParams({ tab: 'inscripciones' }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [entradaId, inscripciones]);

  const hoy = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const { proximas, pasadas } = useMemo(() => {
    const list = inscripciones ?? [];
    const proximas: Inscripcion[] = [];
    const pasadas: Inscripcion[] = [];
    list.forEach((i) => {
      if (i.estado === 'cancelada') return;
      const f = i.evento?.fecha ? new Date(i.evento.fecha) : null;
      if (f && f >= hoy) proximas.push(i);
      else pasadas.push(i);
    });
    proximas.sort((a, b) => new Date(a.evento?.fecha || 0).getTime() - new Date(b.evento?.fecha || 0).getTime());
    return { proximas, pasadas };
  }, [inscripciones, hoy]);

  // ----- Filtros de Inscripciones -----
  const estadoInsc = (i: Inscripcion) => (i.estado === 'pendiente' ? 'pendiente' : 'confirmada');
  const textoInsc = (i: Inscripcion) =>
    `${i.evento?.nombre ?? ''} ${i.evento?.categoria ?? ''} ${i.evento?.ubicacion ?? ''} ${estadoPill(i.estado).txt}`;
  const totalInsc = proximas.length + pasadas.length;
  const conteosInsc = useMemo(() => contarPor([...proximas, ...pasadas], estadoInsc), [proximas, pasadas]);
  // Próximas y pasadas se ordenan en sentido contrario: con "Más cercanas primero"
  // las próximas van de la más cercana a la más lejana y las pasadas de la más reciente hacia atrás.
  const proximasFiltradas = useMemo(
    () => filtrarLista(proximas, filtrosInsc, (i) => i.evento?.fecha, textoInsc, estadoInsc),
    [proximas, filtrosInsc],
  );
  const pasadasFiltradas = useMemo(
    () =>
      filtrarLista(
        pasadas,
        { ...filtrosInsc, orden: filtrosInsc.orden === 'antiguos' ? 'recientes' : 'antiguos' },
        (i) => i.evento?.fecha,
        textoInsc,
        estadoInsc,
      ),
    [pasadas, filtrosInsc],
  );
  const mostrandoInsc = proximasFiltradas.length + pasadasFiltradas.length;

  // ----- Filtros de Historial (registros del historial + pasadas sin registro) -----
  type FilaHist = {
    key: string;
    fecha: string | null | undefined;
    estado: string;
    texto: string;
    h?: HistorialItem;
    insc?: Inscripcion;
  };
  const filasHist = useMemo<FilaHist[]>(() => {
    const deHistorial: FilaHist[] = (historial ?? []).map((h) => ({
      key: `h${h.id_hp}`,
      fecha: h.fecha_hp,
      estado: h.estado_hp,
      texto: `${h.evento?.nombre ?? ''} ${h.evento?.ubicacion ?? ''} ${ESTADO_HP_LABEL[h.estado_hp] ?? h.estado_hp}`,
      h,
    }));
    const deInscripciones: FilaHist[] = pasadas
      .filter((i) => !historial?.some((h) => h.evento?.id === i.evento?.id))
      .map((i) => ({
        key: `i${i.id}`,
        fecha: i.evento?.fecha,
        estado: 'inscrito',
        texto: `${i.evento?.nombre ?? ''} ${i.evento?.categoria ?? ''} ${i.evento?.ubicacion ?? ''} ${estadoPill(i.estado).txt}`,
        insc: i,
      }));
    return [...deHistorial, ...deInscripciones];
  }, [historial, pasadas]);
  const conteosHist = useMemo(() => contarPor(filasHist, (f) => f.estado), [filasHist]);
  const filasHistFiltradas = useMemo(
    () => filtrarLista(filasHist, filtrosHist, (f) => f.fecha, (f) => f.texto, (f) => f.estado),
    [filasHist, filtrosHist],
  );

  const initials = (user?.name || 'SK').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

const fileInputRef = useRef<HTMLInputElement>(null);
const [subiendoFoto, setSubiendoFoto] = useState(false);

const handleFotoClick = () => fileInputRef.current?.click();

const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const original = e.target.files?.[0];
  e.target.value = '';
  if (!original) return;
  if (!original.type.startsWith('image/')) return;
  // Se reduce antes de subir: PHP acepta solo 2 MB por defecto.
  const file = await prepararImagen(original);
  if (file.size > 3 * 1024 * 1024) return;

  setSubiendoFoto(true);
  const formData = new FormData();
  formData.append('foto', file);

  try {
    const data = await apiFetch('/perfil/foto', { method: 'POST', body: formData });
    if (data?.foto_url) updateFotoUrl(data.foto_url);
  } catch (err) {
    console.error(err);
  } finally {
    setSubiendoFoto(false);
  }
};

  const abrirDetalle = (insc: Inscripcion) => {
    setDetalle(insc);
    setVerQr(false);
    setTab('inscripciones');
  };

  const pedirCancelacion = (insc: Inscripcion) => {
    setCancelError(null);
    setCancelarInsc(insc);
  };

  const cerrarCancelacion = () => {
    if (cancelando) return;
    setCancelarInsc(null);
    setCancelError(null);
  };

  // DELETE /inscripciones/{id}: el backend marca la inscripción como cancelada,
  // devuelve el cupo y cancela el QR y el pago pendiente.
  const confirmarCancelacion = async () => {
    if (!cancelarInsc) return;
    const id = cancelarInsc.id;
    setCancelando(true);
    setCancelError(null);
    try {
      await apiFetch(`/inscripciones/${id}`, { method: 'DELETE' });
      setInscripciones((prev) =>
        (prev ?? []).map((i) => (i.id === id ? { ...i, estado: 'cancelada' } : i)),
      );
      if (detalle?.id === id) {
        setDetalle(null);
        setVerQr(false);
      }
      setCancelarInsc(null);
    } catch (err: any) {
      setCancelError(err.message || 'No se pudo cancelar la inscripción. Intenta de nuevo.');
    } finally {
      setCancelando(false);
    }
  };

  return (
    <>
      <div className="part-header">
        <div className="part-header-inner">
          <div className="part-avatar-wrap">
            {user?.foto_url ? (
              <img src={user.foto_url} alt="Foto de perfil" className="part-avatar" style={{ objectFit: 'cover' }} />
            ) : (
              <div className="part-avatar">{initials}</div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFotoChange}
              style={{ display: 'none' }}
            />
            <button
              className="part-avatar-edit"
              aria-label="Cambiar foto de perfil"
              title="Cambiar foto de perfil"
              onClick={handleFotoClick}
              disabled={subiendoFoto}
            >
              <i className={`ti ${subiendoFoto ? 'ti-loader-2' : 'ti-camera'}`} aria-hidden="true" />
            </button>
          </div>
          <div className="part-meta">
            <div className="part-badge"><i className="ti ti-medal" aria-hidden="true" />Ciclista verificado</div>
            <h1>{user?.name || 'Ciclista'}</h1>
            <p className="part-handle">@{(user?.email || '').split('@')[0]}</p>
          </div>
          <div className="part-actions">
            <button
              type="button"
              className="btn btn-outline"
              title="Editar perfil"
              onClick={() => setTab('ajustes')}
            >
              <i className="ti ti-edit" aria-hidden="true" /> Editar perfil
            </button>
            <Link title="Inscribirme a un evento" to="/deportivo/eventos" className="btn btn-primary">+ Inscribirme</Link>
          </div>
        </div>

        <div className="part-tabs" role="tablist">
          {(['resumen', 'historial', 'inscripciones', 'ajustes'] as TabId[]).map((t) => (
            <button title={t === 'resumen' ? 'Ver el resumen' : t === 'historial' ? 'Ver el historial' : t === 'inscripciones' ? 'Ver mis inscripciones' : 'Ver los ajustes de tu cuenta'}
              key={t}
              role="tab"
              className={`part-tab-btn${tab === t ? ' active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'resumen' ? 'Resumen' : t === 'historial' ? 'Historial' : t === 'inscripciones' ? 'Inscripciones' : 'Ajustes'}
            </button>
          ))}
        </div>
      </div>

      <div className="part-body">
        <aside className="part-info-aside">
          <details
            className="part-info-details"
            open={infoOpen}
            onToggle={(e) => setInfoOpen((e.currentTarget as HTMLDetailsElement).open)}
          >
            <summary className="part-info-summary">
              <i className="ti ti-info-circle" aria-hidden="true" /> Ver información del perfil
              <i className="ti ti-chevron-down part-info-chevron" aria-hidden="true" />
            </summary>
            
            <div className="part-info-content">
              <div className="part-card">
                <div className="part-card-head"><h3>Información</h3></div>
                <div className="part-card-body">
                  <div className="part-info-row"><span className="part-info-label">Rol</span><span className="part-info-value">{user?.role === 'admin' ? 'Administrador' : 'Participante'}</span></div>
                  <div className="part-info-row"><span className="part-info-label">Correo</span><span className="part-info-value">{user?.email || '—'}</span></div>
                  <div className="part-info-row"><span className="part-info-label">Teléfono</span><span className="part-info-value">{user?.telefono || '—'}</span></div>
                  <div className="part-info-row"><span className="part-info-label">Ciudad</span><span className="part-info-value">{user?.ciudad || '—'}</span></div>
                  <div className="part-info-row"><span className="part-info-label">Documento</span><span className="part-info-value">{user?.documento ? `${tipoDocumentoLabel(user.tipo_documento)} ${user.documento}` : '—'}</span></div>
                  <div className="part-info-row"><span className="part-info-label">Nacimiento</span><span className="part-info-value">{fmtFechaLarga(user?.fecha_nacimiento)}</span></div>
                </div>
              </div>
              <div className="part-card">
                <div className="part-card-head"><h3>Disciplinas</h3></div>
                <div className="part-card-body">
                  <div className="part-tags">
                    <span className="part-tag"><i className="ti ti-bike" aria-hidden="true" /> Ruta</span>
                  </div>
                </div>
              </div>
            </div>
          </details>
        </aside>

        <div>
          {tab === 'resumen' && (
            <>
              <div className="part-stats-strip">
                <div className="part-strip-stat"><span className="part-num">{pasadas.filter((i) => i.estado !== 'pendiente').length}</span><span className="part-lbl">Eventos completados</span></div>
                <div className="part-strip-stat accent"><span className="part-num">{proximas.length}</span><span className="part-lbl">Próximos eventos</span></div>
                <div className="part-strip-stat"><span className="part-num">{inscripciones?.filter((i) => i.estado !== 'cancelada').length ?? 0}</span><span className="part-lbl">Inscripciones totales</span></div>
                <div className="part-strip-stat accent"><span className="part-num">{fmtMoney(inscripciones?.filter((i) => i.estado !== 'cancelada' && i.estado !== 'pendiente').reduce((s, i) => s + (Number(i.precio_pagado) || 0), 0))}</span><span className="part-lbl">Total invertido</span></div>
              </div>

              <p className="part-section-label">
                Próximas inscripciones
                <button title="Ver todas mis inscripciones" onClick={() => setTab('inscripciones')}>Ver todo →</button>
              </p>
              {loadError && <div className="part-empty-row">{loadError}</div>}
              {!loadError && proximas.length === 0 && (
                <div className="part-empty-row">Sin eventos próximos. <Link title="Explorar los eventos disponibles" to="/deportivo/eventos">Explora eventos →</Link></div>
              )}
              {proximas.slice(0, 3).map((i) => (
                <EventRow key={i.id} insc={i} onVerDetalle={() => abrirDetalle(i)} onCancelar={() => pedirCancelacion(i)} />
              ))}
            </>
          )}

          {tab === 'historial' && (
            <>
              <p className="part-section-label">Mi historial</p>
              {!historial && <div className="part-empty-row">Cargando historial…</div>}
              {historial && filasHist.length === 0 && (
                <div className="part-empty-row">Sin historial todavía.</div>
              )}
              {filasHist.length > 0 && (
                <ListToolbar
                  filtros={filtrosHist}
                  base={FILTROS_HIST}
                  onChange={setFiltrosHist}
                  rangos={RANGOS_HIST}
                  estados={ESTADOS_HIST}
                  conteos={conteosHist}
                  placeholder="Buscar por evento, lugar o estado"
                  ordenLabels={{ recientes: 'Más recientes primero', antiguos: 'Más antiguos primero' }}
                  total={filasHist.length}
                  mostrando={filasHistFiltradas.length}
                  singular="resultado"
                  plural="resultados"
                />
              )}
              {filasHist.length > 0 && filasHistFiltradas.length === 0 && (
                <div className="part-empty-row">
                  No encontramos resultados. Prueba con otra palabra, otro estado u otro rango de fechas.{' '}
                  <button title="Quitar todos los filtros" type="button" className="part-tool-clear" onClick={() => setFiltrosHist({ ...FILTROS_HIST, orden: filtrosHist.orden })}>
                    Limpiar filtros
                  </button>
                </div>
              )}
              {filasHistFiltradas.map((f) =>
                f.h ? (
                  <div className="part-event-row" key={f.key}>
                    <div className="part-event-row-img">{(f.h.evento?.nombre || '?')[0].toUpperCase()}</div>
                    <div className="part-event-row-info">
                      <h4>{f.h.evento?.nombre || 'Evento'}</h4>
                      <div className="part-event-meta">
                        <span>{fmtFechaLarga(f.h.fecha_hp)}</span>
                        {f.h.evento?.ubicacion && <span>{f.h.evento.ubicacion}</span>}
                      </div>
                    </div>
                    <span className={`part-status-pill ${f.h.estado_hp === 'abandono' ? 'warn' : f.h.estado_hp === 'inscrito' ? 'pending' : 'ok'}`}>
                      {ESTADO_HP_LABEL[f.h.estado_hp] ?? f.h.estado_hp}
                    </span>
                  </div>
                ) : (
                  <EventRow key={f.key} insc={f.insc!} onVerDetalle={() => abrirDetalle(f.insc!)} />
                ),
              )}
            </>
          )}

          {tab === 'inscripciones' && !detalle && (
            <>
              {loadError && <div className="part-empty-row">{loadError}</div>}
              {!loadError && totalInsc > 0 && (
                <ListToolbar
                  filtros={filtrosInsc}
                  base={FILTROS_INSC}
                  onChange={setFiltrosInsc}
                  rangos={RANGOS_INSC}
                  estados={ESTADOS_INSC}
                  conteos={conteosInsc}
                  placeholder="Buscar por evento, lugar o categoría"
                  ordenLabels={{ recientes: 'Más lejanas primero', antiguos: 'Más cercanas primero' }}
                  total={totalInsc}
                  mostrando={mostrandoInsc}
                  singular="inscripción"
                  plural="inscripciones"
                />
              )}
              {!loadError && totalInsc > 0 && mostrandoInsc === 0 && (
                <div className="part-empty-row">
                  No encontramos resultados. Prueba con otra palabra, otro estado u otro rango de fechas.{' '}
                  <button title="Quitar todos los filtros" type="button" className="part-tool-clear" onClick={() => setFiltrosInsc({ ...FILTROS_INSC, orden: filtrosInsc.orden })}>
                    Limpiar filtros
                  </button>
                </div>
              )}
              {(proximasFiltradas.length > 0 || proximas.length === 0) && (
                <p className="part-section-label">Eventos confirmados</p>
              )}
              {!loadError && proximas.length === 0 && (
                <div className="part-empty-row">No tienes inscripciones activas.</div>
              )}
              {proximasFiltradas.map((i) => (
                <EventRow key={i.id} insc={i} onVerDetalle={() => abrirDetalle(i)} onCancelar={() => pedirCancelacion(i)} />
              ))}
              {pasadasFiltradas.length > 0 && (
                <>
                  <p className="part-section-label">Eventos pasados</p>
                  {pasadasFiltradas.map((i) => (
                    <EventRow key={i.id} insc={i} onVerDetalle={() => abrirDetalle(i)} />
                  ))}
                </>
              )}
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <Link title="Explorar más eventos" to="/deportivo/eventos" className="btn btn-primary">Explorar más eventos →</Link>
              </div>
            </>
          )}

          {tab === 'inscripciones' && detalle && (
            <DetalleInscripcion
              insc={detalle}
              verQr={verQr}
              onVerQr={() => setVerQr(true)}
              onCerrarQr={() => setVerQr(false)}
              onVolver={() => setDetalle(null)}
              onCancelar={proximas.some((p) => p.id === detalle.id) ? () => pedirCancelacion(detalle) : undefined}
            />
          )}

          {tab === 'ajustes' && <AjustesTab />}
        </div>
      </div>

      {cancelarInsc && createPortal(
        <div className={`mod-deportivo part-qr-overlay${darkMode ? ' dark-mode' : ''}`} onClick={cerrarCancelacion}>
          <div className="part-qr-modal" onClick={(e) => e.stopPropagation()}>
            <button title="Cerrar"
              className="part-qr-close"
              onClick={cerrarCancelacion}
              aria-label="Cerrar"
              disabled={cancelando}
            >
              <i className="ti ti-x" aria-hidden="true" />
            </button>
            <div
              aria-hidden="true"
              style={{
                width: 56,
                height: 56,
                margin: '0 auto 1rem',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.6rem',
                background: 'color-mix(in srgb, #dc2626 16%, transparent)',
                color: '#ef4444',
              }}
            >
              <i className="ti ti-calendar-x" />
            </div>
            <h3 style={{ textAlign: 'center', marginBottom: '.5rem' }}>¿Cancelar inscripción?</h3>
            <p style={{ textAlign: 'center', lineHeight: 1.6, marginBottom: '1.5rem', opacity: 0.85 }}>
              Vas a cancelar tu inscripción a <strong>{cancelarInsc.evento?.nombre || 'este evento'}</strong>.
              Tu cupo quedará libre y tu código QR dejará de ser válido.
            </p>
            {cancelError && (
              <div className="part-form-alert error" style={{ marginBottom: '1rem' }}>
                <span className="part-alert-icon">⚠️</span>
                {cancelError}
              </div>
            )}
            <div style={{ display: 'flex', gap: '.75rem' }}>
              <button title="Volver sin cancelar"
                type="button"
                className="btn btn-outline"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={cerrarCancelacion}
                disabled={cancelando}
              >
                Volver
              </button>
              <button title={cancelando ? 'Cancelando…' : 'Confirmar la cancelación de la inscripción'}
                type="button"
                className="btn btn-primary"
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  background: '#dc2626',
                  border: 'none',
                  whiteSpace: 'nowrap',
                }}
                onClick={confirmarCancelacion}
                disabled={cancelando}
              >
                {cancelando ? 'Cancelando…' : 'Sí, cancelar'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

function EventRow({
  insc, onVerDetalle, onCancelar,
}: {
  insc: Inscripcion;
  onVerDetalle: () => void;
  onCancelar?: () => void;
}) {
  const pill = estadoPill(insc.estado);
  const bg = insc.evento?.imagen_url ? { backgroundImage: `url(${insc.evento.imagen_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined;
  return (
    <div className="part-event-row">
      <div className="part-event-row-img" style={bg}>{!insc.evento?.imagen_url && (insc.evento?.nombre || '?')[0].toUpperCase()}</div>
      <div className="part-event-row-info">
        <h4>{insc.evento?.nombre || 'Evento'}</h4>
        <div className="part-event-meta">
          <span>{fmtFechaLarga(insc.evento?.fecha)}</span>
          {insc.evento?.ubicacion && <span>{insc.evento.ubicacion}</span>}
          {insc.evento?.categoria && <span>{insc.evento.categoria}</span>}
        </div>
        <button title="Ver los detalles de la inscripción" className="part-btn-link-detail" onClick={onVerDetalle}>Ver detalles</button>
        {onCancelar && (
          <button title="Cancelar esta inscripción"
            className="part-btn-link-detail"
            style={{ marginLeft: '1rem', color: '#dc2626' }}
            onClick={onCancelar}
          >
            Cancelar inscripción
          </button>
        )}
      </div>
      <span className={`part-status-pill ${pill.cls}`}>{pill.txt}</span>
    </div>
  );
}

function DetalleInscripcion({
  insc, verQr, onVerQr, onCerrarQr, onVolver, onCancelar,
}: {
  insc: Inscripcion;
  verQr: boolean;
  onVerQr: () => void;
  onCerrarQr: () => void;
  onVolver: () => void;
  onCancelar?: () => void;
}) {
  const { darkMode } = useAccessibility();
  const metodo = insc.pago?.metodo_pago
    ?.replace('transferencia', 'Transferencia bancaria')
    .replace('nequi', 'Nequi / Daviplata')
    .replace('efectivo', 'Efectivo en punto autorizado');

  const pill = estadoPill(insc.estado);
  const isPending = insc.estado === 'pendiente';

  return (
    <div className="part-card part-detail-card part-detail-anim">
      <div className="part-detail-hero">
        <div className="part-detail-hero-blob a" aria-hidden="true" />
        <div className="part-detail-hero-blob b" aria-hidden="true" />

        <button title="Volver a la lista de inscripciones" className="part-btn-link-detail part-detail-back" onClick={onVolver}>← Volver a inscripciones</button>
        <span className={`part-status-pill ${pill.cls} part-detail-pill ${isPending ? 'part-pulse' : ''}`}>{pill.txt}</span>
        <h2>{insc.evento?.nombre || 'Inscripción'}</h2>
        <p className="part-detail-meta">
          <i className="ti ti-calendar" aria-hidden="true" /> {fmtFechaLarga(insc.evento?.fecha)}
          {insc.evento?.ubicacion && <> · <i className="ti ti-map-pin" aria-hidden="true" /> {insc.evento.ubicacion}</>}
        </p>
      </div>

      <div className="part-card-body">
        <div className="part-detail-info-grid">
          <div className="part-detail-info-item">
            <span className="part-detail-icon"><i className="ti ti-credit-card" aria-hidden="true" /></span>
            <div>
              <span className="part-label">Método de pago</span>
              <strong>{metodo || '—'}</strong>
            </div>
          </div>
          <div className="part-detail-info-item">
            <span className="part-detail-icon"><i className="ti ti-cash" aria-hidden="true" /></span>
            <div>
              <span className="part-label">Total</span>
              <strong>{fmtMoney(insc.precio_pagado)}</strong>
            </div>
          </div>
          <div className="part-detail-info-item">
            <span className="part-detail-icon"><i className="ti ti-receipt-2" aria-hidden="true" /></span>
            <div>
              <span className="part-label">Referencia de pago</span>
              <strong>{insc.pago?.referencia || '—'}</strong>
            </div>
          </div>
          <div className="part-detail-info-item">
            <span className="part-detail-icon"><i className="ti ti-calendar-event" aria-hidden="true" /></span>
            <div>
              <span className="part-label">Fecha de pago</span>
              <strong>{insc.pago?.fecha ? fmtFechaLarga(insc.pago.fecha) : '—'}</strong>
            </div>
          </div>
          <div className="part-detail-info-item">
            <span className="part-detail-icon"><i className="ti ti-shield-check" aria-hidden="true" /></span>
            <div>
              <span className="part-label">Estado del pago</span>
              <strong>{estadoPagoLabel(insc.pago?.estado)}</strong>
            </div>
          </div>
          <div className="part-detail-info-item">
            <span className="part-detail-icon"><i className="ti ti-ticket" aria-hidden="true" /></span>
            <div>
              <span className="part-label">Entrada (QR)</span>
              <strong>{estadoQrLabel(insc.qr?.estado)}</strong>
              {insc.qr?.estado === 'usado' && insc.qr.fecha_uso && (
                <span className="part-label"> {fmtFechaLarga(insc.qr.fecha_uso)}</span>
              )}
            </div>
          </div>
          {insc.talla_camiseta && (
            <div className="part-detail-info-item">
              <span className="part-detail-icon"><i className="ti ti-shirt" aria-hidden="true" /></span>
              <div>
                <span className="part-label">Talla</span>
                <strong>{insc.talla_camiseta}</strong>
              </div>
            </div>
          )}
        </div>
        {((insc.qr?.codigo && !verQr) || onCancelar) && (
          <div
            style={{
              marginTop: '1.5rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid color-mix(in srgb, currentColor 12%, transparent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '.75rem',
            }}
          >
            {insc.qr?.codigo && !verQr && (
              <button title="Ver mi código QR de entrada"
                className="btn btn-primary part-detail-qr-btn"
                style={{ margin: 0 }}
                onClick={onVerQr}
              >
                <i className="ti ti-qrcode" aria-hidden="true" /> Ver mi QR
              </button>
            )}
            {onCancelar && (
              <button title="Cancelar esta inscripción"
                type="button"
                onClick={onCancelar}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '.5rem',
                  padding: '.7rem 1.1rem',
                  border: 'none',
                  borderRadius: '12px',
                  background: 'color-mix(in srgb, #dc2626 14%, transparent)',
                  color: '#ef4444',
                  fontWeight: 700,
                  fontSize: '.9rem',
                  cursor: 'pointer',
                }}
              >
                <i className="ti ti-circle-x" aria-hidden="true" /> Cancelar inscripción
              </button>
            )}
          </div>
        )}

        {insc.qr?.codigo && verQr && createPortal(
                    <div className={`mod-deportivo part-qr-overlay${darkMode ? ' dark-mode' : ''}`} onClick={onCerrarQr}>
            <div className="part-qr-modal" onClick={(e) => e.stopPropagation()}>
              <button title="Cerrar" className="part-qr-close" onClick={onCerrarQr} aria-label="Cerrar">
                <i className="ti ti-x" aria-hidden="true" />
              </button>
              <div className="part-qr-glow">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(insc.qr.codigo)}`}
                  alt="Código QR de la inscripción"
                  width={230}
                  height={240}
                />
              </div>
              <div className="part-qr-code-text">{insc.qr.codigo}</div>
              <p className="part-qr-hint">
                {insc.qr.estado === 'usado'
                  ? 'Este QR ya fue escaneado y no sirve para volver a ingresar.'
                  : 'Muestra este código en el punto de control el día del evento.'}
              </p>
            </div>
          </div>,
          document.body,
        )}
      </div>
    </div>
  );
}

function AjustesTab() {
  const { user, updateProfile, updateFotoUrl, deleteAccount } = useAuth();
  const { darkMode } = useAccessibility();
  const navigate = useNavigate();
  const [eliminandoCuenta, setEliminandoCuenta] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const initials = (user?.name || 'SK').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  
  // Estados de contraseñas
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string; id: number } | null>(null);
  
  // Estados para el flujo de dos pasos
  const [verModal, setVerModal] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  
  const [verActual, setVerActual] = useState(false);
  const [verNueva, setVerNueva] = useState(false);
  const [verConfirmar, setVerConfirmar] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>((user as any)?.foto_url ?? null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const nombreApellido = (user?.name || '').split(' ');
  const [nombre, setNombre] = useState(nombreApellido[0] || '');
  const [apellido, setApellido] = useState(nombreApellido.slice(1).join(' ') || '');
  const [correo, setCorreo] = useState(user?.email || '');
  const [telefono, setTelefono] = useState(user?.telefono || '');
  const [ciudad, setCiudad] = useState(user?.ciudad || '');
  const [tipoDocumento, setTipoDocumento] = useState(tipoDocumentoCodigo(user?.tipo_documento));
  const [documento, setDocumento] = useState(user?.documento || '');
  const [fechaNacimiento, setFechaNacimiento] = useState(user?.fecha_nacimiento || '');
  const [rh, setRh] = useState(user?.rh && user.rh !== 'N/A' ? user.rh : '');

  // Efecto para borrar mensajes
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 4000);
    return () => clearTimeout(t);
  }, [msg]);

  // EFECTO: Bloquear el scroll de la página cuando el modal se abre
  useEffect(() => {
    if (verModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      // Ocultar las contraseñas al cerrar el modal
      setVerNueva(false);
      setVerConfirmar(false);
    }
    return () => { document.body.style.overflow = ''; };
  }, [verModal]);

  const confirmarEliminarCuenta = async () => {
    setEliminandoCuenta(true);
    try {
      await deleteAccount();
      navigate('/login');
    } catch (err: any) {
      setMsg({ tipo: 'error', texto: err.message || 'No se pudo eliminar la cuenta. Intenta de nuevo.', id: Date.now() });
      setEliminandoCuenta(false);
      setConfirmarEliminar(false);
    }
  };

  const handleFotoClick = () => fileInputRef.current?.click();

  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const original = e.target.files?.[0];
    e.target.value = '';
    if (!original) return;

    if (!original.type.startsWith('image/')) {
      setDatosMsg({ tipo: 'error', texto: 'El archivo debe ser una imagen.', id: Date.now() });
      return;
    }
    const file = await prepararImagen(original);
    if (file.size > 3 * 1024 * 1024) {
      setDatosMsg({ tipo: 'error', texto: 'La imagen no debe superar 3MB.', id: Date.now() });
      return;
    }

    const preview = URL.createObjectURL(file);
    setFotoUrl(preview);
    setSubiendoFoto(true);

    const formData = new FormData();
    formData.append('foto', file);

    try {
      const data = await apiFetch('/perfil/foto', { method: 'POST', body: formData });
      if (data?.foto_url) {
        setFotoUrl(data.foto_url);
        updateFotoUrl(data.foto_url);
      }
      setDatosMsg({ tipo: 'ok', texto: 'Foto de perfil actualizada.', id: Date.now() });
    } catch (err: any) {
      setDatosMsg({ tipo: 'error', texto: err.message || 'No se pudo subir la foto.', id: Date.now() });
    } finally {
      setSubiendoFoto(false);
    }
  };

  const [datosMsg, setDatosMsg] = useState<{ tipo: 'ok' | 'error'; texto: string; id: number } | null>(null);
  const [guardandoDatos, setGuardandoDatos] = useState(false);

  useEffect(() => {
    if (!datosMsg) return;
    const t = setTimeout(() => setDatosMsg(null), 4000);
    return () => clearTimeout(t);
  }, [datosMsg]);

  const submitDatosPersonales = async (e: React.FormEvent) => {
    e.preventDefault();
    setDatosMsg(null);
    setGuardandoDatos(true);
    try {
      await updateProfile({
        nombre_u: nombre || undefined,
        apellido_u: apellido || undefined,
        correo_u: correo || undefined,
        telefono_u: telefono || undefined,
        ciudad_u: ciudad || undefined,
        tipo_documento_u: tipoDocumento || undefined,
        documento_u: documento ? Number(documento) : undefined,
        rh_u: rh || undefined,
        fecha_nacimiento_u: fechaNacimiento || undefined,
      });
      setDatosMsg({ tipo: 'ok', texto: 'Datos actualizados correctamente.', id: Date.now() });
    } catch (err: any) {
      setDatosMsg({ tipo: 'error', texto: err.message || 'No se pudieron actualizar los datos.', id: Date.now() });
    } finally {
      setGuardandoDatos(false);
    }
  };

  const [notifPrefs, setNotifPrefs] = useState(() => {
    const raw = localStorage.getItem('skyed_notif_prefs');
    return raw ? JSON.parse(raw) : { eventos: true, recordatorios: true, resultados: true, boletin: false };
  });

  const notifDefs = [
    { key: 'eventos', title: 'Nuevos eventos', desc: 'Alertas cuando se publique un evento en tu disciplina' },
    { key: 'recordatorios', title: 'Recordatorios de inscripción', desc: '7 y 1 día antes del cierre de inscripciones' },
    { key: 'resultados', title: 'Resultados publicados', desc: 'Cuando estén disponibles tus tiempos oficiales' },
    { key: 'boletin', title: 'Boletín semanal', desc: 'Resumen de eventos y novedades de la comunidad' },
  ];

  const toggleNotif = (key: string) => {
    const next = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(next);
    localStorage.setItem('skyed_notif_prefs', JSON.stringify(next));
  };

  // Acción 1: Validar contraseña actual
  const verificarActual = async (e: React.FormEvent) => {
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

  // Acción 2: Guardar nueva contraseña (Modal)
  const submitCambio = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    
    const motivo = errorContrasena(nueva);
    if (motivo) {
      setMsg({ tipo: 'error', texto: motivo, id: Date.now() });
      return;
    }
    if (nueva === actual) {
      setMsg({ tipo: 'error', texto: 'La nueva contraseña no puede ser igual a la actual.', id: Date.now() });
      return;
    }
    if (nueva !== confirmar) {
      setMsg({ tipo: 'error', texto: 'Las contraseñas no coinciden.', id: Date.now() });
      return;
    }
    
    setEnviando(true);
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
      setVerActual(false);
    } catch (err: any) {
      setMsg({ tipo: 'error', texto: err.message || 'No se pudo actualizar la contraseña.', id: Date.now() });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <div className="part-settings-grid">
        <div className="part-card part-profile-card">
          <div className="part-profile-main">
            <div className="part-profile-avatar-wrap">
              {fotoUrl ? (
                <img src={fotoUrl} alt="Foto de perfil" className="part-profile-avatar part-profile-avatar-img" />
              ) : (
                <div className="part-profile-avatar">{initials}</div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFotoChange}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="part-profile-avatar-edit"
                onClick={handleFotoClick}
                disabled={subiendoFoto}
                aria-label="Cambiar foto de perfil"
                title="Cambiar foto de perfil"
              >
                <i className={`ti ${subiendoFoto ? 'ti-loader-2' : 'ti-camera'}`} aria-hidden="true" />
              </button>
            </div>
            <div className="part-profile-info">
              <p className="part-profile-name">{user?.name || 'Ciclista'}</p>
              <span className="part-profile-role-pill">
                <i className="ti ti-medal" aria-hidden="true" />
                {user?.role === 'admin' ? 'Administrador' : 'Participante'}
              </span>
            </div>
          </div>
        </div>

        <div className="part-settings-main">
          <div className="part-card">
            <div className="part-card-head">
              <span className="part-card-head-icon"><i className="ti ti-id-badge-2" aria-hidden="true" /></span>
              <h3>Datos personales</h3>
            </div>
            <div className="part-card-body">
              <form onSubmit={submitDatosPersonales}>
                <div className="part-form-group">
                  <label htmlFor="d-nombre">Nombre</label>
                  <input id="d-nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
                </div>
                <div className="part-form-group">
                  <label htmlFor="d-apellido">Apellido</label>
                  <input id="d-apellido" type="text" value={apellido} onChange={(e) => setApellido(e.target.value)} required />
                </div>
                <div className="part-form-group">
                  <label htmlFor="d-tipo-doc">Tipo de documento</label>
                  <select id="d-tipo-doc" value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)}>
                    <option value="">Seleccionar...</option>
                    <option value="CC">Cédula de ciudadanía</option>
                    <option value="TI">Tarjeta de identidad</option>
                    <option value="CE">Cédula de extranjería</option>
                    <option value="PA">Pasaporte</option>
                  </select>
                </div>
                <div className="part-form-group">
                  <label htmlFor="d-documento">Número de documento</label>
                  <input id="d-documento" type="text" inputMode="numeric" value={documento} onChange={(e) => setDocumento(e.target.value.replace(/\D/g, ''))} />
                </div>
                <div className="part-form-group">
                  <label htmlFor="d-rh">Tipo de sangre (RH)</label>
                  <select id="d-rh" value={rh} onChange={(e) => setRh(e.target.value)}>
                    <option value="">Seleccionar...</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
                <div className="part-form-group">
                  <label htmlFor="d-telefono">Teléfono</label>
                  <input id="d-telefono" type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Ej: 3001234567" />
                </div>
                <div className="part-form-group">
                  <label htmlFor="d-fecha-nac">Fecha de nacimiento</label>
                  <input id="d-fecha-nac" type="date" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} />
                </div>
                <div className="part-form-group">
                  <label htmlFor="d-ciudad">Ciudad</label>
                  <input id="d-ciudad" type="text" value={ciudad} onChange={(e) => setCiudad(e.target.value)} placeholder="Ej: Sogamoso" />
                </div>
                {datosMsg && (
                  <div className={`part-form-alert ${datosMsg.tipo}`} key={datosMsg.id}>
                    <span className="part-alert-icon">{datosMsg.tipo === 'ok' ? '✅' : '⚠️'}</span>
                    {datosMsg.texto}
                    <div className="part-alert-timer" />
                  </div>
                )}
                <button title={guardandoDatos ? 'Guardando…' : 'Guardar los cambios de tu perfil'} type="submit" className="btn btn-primary" disabled={guardandoDatos}>
                  {guardandoDatos ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </form>
            </div>
          </div>

          <div className="part-card">
            <div className="part-card-head">
              <span className="part-card-head-icon"><i className="ti ti-bell" aria-hidden="true" /></span>
              <h3>Notificaciones</h3>
            </div>
            <div className="part-card-body">
              {notifDefs.map((n) => (
                <div className="part-toggle-row" key={n.key}>
                  <div className="part-toggle-label">{n.title}<small>{n.desc}</small></div>
                  <div
                    className={`part-toggle${notifPrefs[n.key] ? ' on' : ''}`}
                    role="switch"
                    aria-checked={notifPrefs[n.key]}
                    tabIndex={0}
                    onClick={() => toggleNotif(n.key)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleNotif(n.key); }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="part-settings-pair">
            <div className="part-card">
              <div className="part-card-head">
                <span className="part-card-head-icon"><i className="ti ti-lock" aria-hidden="true" /></span>
                <h3>Seguridad</h3>
              </div>
              <div className="part-card-body">
                <form onSubmit={verificarActual}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--page-muted)', marginBottom: '1rem' }}>
                    Digita tu contraseña actual para poder actualizarla.
                  </p>
                  <div className="part-form-group">
                    <label htmlFor="p-actual">Contraseña actual</label>
                    <div className="part-pass-field">
                      <input
                        id="p-actual"
                        type={verActual ? 'text' : 'password'}
                        value={actual}
                        onChange={(e) => setActual(e.target.value)}
                        required
                      />
                      <button title={verActual ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        type="button"
                        className="part-pass-toggle"
                        onClick={() => setVerActual((v) => !v)}
                        aria-label={verActual ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        tabIndex={-1}
                      >
                        <i className={`ti ${verActual ? 'ti-eye-off' : 'ti-eye'}`} aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {/* Mostrar error/éxito si el modal NO está abierto */}
                  {msg && !verModal && (
                    <div className={`part-form-alert ${msg.tipo}`} key={msg.id} style={{ marginTop: '1rem' }}>
                      <span className="part-alert-icon">{msg.tipo === 'ok' ? '✅' : '⚠️'}</span>
                      {msg.texto}
                      <div className="part-alert-timer" />
                    </div>
                  )}

                  <button title={verificando ? 'Validando…' : 'Validar tu contraseña actual para cambiarla'} type="submit" className="btn btn-outline" disabled={verificando || !actual}>
                    {verificando ? 'Validando…' : 'Validar y cambiar'}
                  </button>
                </form>
              </div>
            </div>

            <div className="part-card part-card-danger">
              <div className="part-card-head">
                <span className="part-card-head-icon"><i className="ti ti-alert-triangle" aria-hidden="true" /></span>
                <h3>Cuenta</h3>
              </div>
              <div className="part-card-body">
                <div className="part-stat-row"><span className="part-label">Rol</span><span>{user?.role === 'admin' ? 'Administrador' : 'Participante'}</span></div>
                <button title={eliminandoCuenta ? 'Eliminando…' : 'Eliminar tu cuenta'}
                  type="button"
                  className="btn btn-outline"
                  style={{ marginTop: '1rem', color: '#dc2626' }}
                  onClick={() => setConfirmarEliminar(true)}
                  disabled={eliminandoCuenta}
                >
                  {eliminandoCuenta ? 'Eliminando…' : 'Eliminar cuenta'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal para la nueva contraseña */}
      {verModal && createPortal(
        <div 
          className={`mod-deportivo part-qr-overlay${darkMode ? ' dark-mode' : ''}`} 
          style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
          onClick={() => setVerModal(false)}
        >
          <div 
            className="part-qr-modal part-card" 
            onClick={(e) => e.stopPropagation()}
            style={{
               width: '100%',
               maxWidth: '420px', 
               padding: '0', 
               backgroundColor: 'var(--surface)', /* CORRECCIÓN: Esta es la variable correcta */
               border: '1px solid var(--border)',
               textAlign: 'left'
            }}
          >
            <div className="part-card-head" style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: 'var(--text)' }}>Nueva contraseña</h3>
              <button title="Cerrar"
                type="button"
                className="part-qr-close"
                onClick={() => setVerModal(false)}
                aria-label="Cerrar"
                style={{ position: 'static', transform: 'none', background: 'transparent' }}
              >
                <i className="ti ti-x" aria-hidden="true" style={{ color: 'var(--text)' }} />
              </button>
            </div>
            
            <div className="part-card-body" style={{ padding: '1.5rem' }}>
              <form onSubmit={submitCambio}>
                <div className="part-form-group">
                  <label htmlFor="p-nueva">Nueva contraseña</label>
                  <div className="part-pass-field">
                    <input
                      id="p-nueva"
                      type={verNueva ? 'text' : 'password'}
                      value={nueva}
                      onChange={(e) => setNueva(e.target.value)}
                      required
                      minLength={8}
                      autoFocus
                    />
                    <button title={verNueva ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      type="button"
                      className="part-pass-toggle"
                      onClick={() => setVerNueva((v) => !v)}
                      tabIndex={-1}
                    >
                      <i className={`ti ${verNueva ? 'ti-eye-off' : 'ti-eye'}`} aria-hidden="true" />
                    </button>
                  </div>
                  <small style={{ color: 'var(--muted)', display: 'block', marginTop: '0.4rem', fontSize: '0.75rem' }}>
                    Mínimo 8 caracteres, con mayúscula, minúscula y número.
                  </small>
                </div>

                <div className="part-form-group" style={{ marginTop: '1.2rem' }}>
                  <label htmlFor="p-confirm">Confirmar nueva contraseña</label>
                  <div className="part-pass-field">
                    <input
                      id="p-confirm"
                      type={verConfirmar ? 'text' : 'password'}
                      value={confirmar}
                      onChange={(e) => setConfirmar(e.target.value)}
                      required
                    />
                    <button title={verConfirmar ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      type="button"
                      className="part-pass-toggle"
                      onClick={() => setVerConfirmar((v) => !v)}
                      tabIndex={-1}
                    >
                      <i className={`ti ${verConfirmar ? 'ti-eye-off' : 'ti-eye'}`} aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {msg && verModal && (
                  <div className={`part-form-alert ${msg.tipo}`} key={msg.id} style={{ marginTop: '1rem' }}>
                    <span className="part-alert-icon">{msg.tipo === 'ok' ? '✅' : '⚠️'}</span>
                    {msg.texto}
                    <div className="part-alert-timer" />
                  </div>
                )}

                <div style={{ marginTop: '1.75rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button title="Cancelar y cerrar esta ventana" type="button" className="btn btn-outline" onClick={() => setVerModal(false)} disabled={enviando}>
                    Cancelar
                  </button>
                  <button title={enviando ? 'Guardando…' : 'Guardar la nueva contraseña'} type="submit" className="btn btn-primary" disabled={enviando || !nueva || !confirmar}>
                    {enviando ? 'Guardando…' : 'Guardar contraseña'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Eliminar Cuenta (ya existía) */}
      {confirmarEliminar && createPortal(
        <div className={`mod-deportivo part-qr-overlay${darkMode ? ' dark-mode' : ''}`} onClick={() => !eliminandoCuenta && setConfirmarEliminar(false)}>
          <div className="part-qr-modal" onClick={(e) => e.stopPropagation()}>
            <button title="Cerrar"
              className="part-qr-close"
              onClick={() => setConfirmarEliminar(false)}
              aria-label="Cerrar"
              disabled={eliminandoCuenta}
            >
              <i className="ti ti-x" aria-hidden="true" />
            </button>
            <h3 style={{ color: '#dc2626', marginBottom: '.75rem' }}>
              <i className="ti ti-alert-triangle" aria-hidden="true" /> Desactivar cuenta
            </h3>
            <p style={{ marginBottom: '1.5rem', lineHeight: 1.6 }}>
              Vas a desactivar tu cuenta. Se cerrará tu sesión y no podrás iniciar sesión de nuevo hasta que un administrador la reactive.
            </p>
            <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'flex-end' }}>
              <button title="Cancelar y conservar tu cuenta" type="button" className="btn btn-outline" onClick={() => setConfirmarEliminar(false)} disabled={eliminandoCuenta}>
                Cancelar
              </button>
              <button title={eliminandoCuenta ? 'Eliminando…' : 'Confirmar y eliminar tu cuenta'}
                type="button"
                className="btn btn-primary"
                style={{ background: '#dc2626' }}
                onClick={confirmarEliminarCuenta}
                disabled={eliminandoCuenta}
              >
                {eliminandoCuenta ? 'Eliminando…' : 'Sí, eliminar cuenta'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}