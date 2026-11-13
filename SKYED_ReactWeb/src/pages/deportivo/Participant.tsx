import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import Protected from '../../components/Protected';
import SportWrapper from '../../components/deportivo/SportWrapper';
import CodigoCopiable from '../../components/deportivo/CodigoCopiable';
import { useAuth } from '../../context/AuthContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useBloquearScroll } from '../../hooks/useBloquearScroll';
import ParticipantePqr from '../../components/deportivo/pqr/ParticipantePqr';
import { apiFetch } from '../../services/api';
import { prepararImagen } from '../../utils/prepararImagen';
import { errorContrasena } from '../../utils/validaciones';
import { validarFormularioDeportivo } from '../../utils/validarFormularioDeportivo';
import '../../styles/deportivo/participante.css';
import '../../styles/shared/nosotrosMotion.css';
import '../../styles/deportivo/headerHero.css';
// import '../../styles/deportivo/filtros-participante.css';
import { createPortal } from 'react-dom';


type TabId = 'resumen' | 'historial' | 'inscripciones' | 'resultados' | 'pqr' | 'ajustes';

interface EventoInscrito {
  id: number;
  nombre: string;
  categoria: string;
  fecha: string;
  hora: string;
  ubicacion: string;
  imagen_url: string | null;
  kit?: {
    nombre: string | null;
    precio: number | null;
    fecha_entrega?: string | null;
    lugar_entrega?: string | null;
  } | null;
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
  /** QR para retirar el kit ("KIT-…"); null si nadie de la inscripción pidió kit. */
  codigo_kit?: string | null;
  estado: string | null;
  fecha_uso?: string | null;
  usos_permitidos?: number | null;
  usos_realizados?: number | null;
}

// No se ofrece cancelar si el pago ya fue validado (inscripción confirmada)
// o si el QR ya se escaneó (la persona ya entró al evento).
function qrYaUsado(insc: { qr: Qr | null; estado?: string | null; pago?: { estado?: string | null } | null }) {
  if (insc.estado === 'confirmada' || insc.pago?.estado === 'confirmado') return true;
  const qr = insc.qr;
  if (!qr) return false;
  return qr.estado === 'usado' || !!qr.fecha_uso || (qr.usos_realizados ?? 0) > 0;
}

interface CategoriaInsc {
  id: number;
  nombre: string | null;
  distancia?: string | null;
}

interface InvitadoInsc {
  id?: number;
  nombre: string | null;
  apellido: string | null;
  documento?: number | string | null;
  numero_dorsal?: number | null;
  desea_kit?: boolean;
  talla_kit?: string | null;
}

// Estado de entrega de un kit (el del participante o el de su invitado).
interface EntregaKitEstado {
  estado: 'pendiente' | 'entregado' | 'devolucion' | string;
  fecha_entrega_real?: string | null;
}

// Resultado oficial del participante en el evento (si ya se publicó).
interface ResultadoInsc {
  tiempo_final: string | null;
  posicion_general: number | null;
  estado: string | null;
  posicion_categoria: number | null;
  estado_categoria?: string | null;
  premios: Array<{ nombre: string; descripcion?: string | null; posicion: number; valor?: number | string | null }>;
}

interface Inscripcion {
  id: number;
  estado: string;
  resultado?: ResultadoInsc | null;
  entrega_kit?: EntregaKitEstado | null;
  entrega_kit_invitado?: EntregaKitEstado | null;
  fecha: string;
  precio_pagado: number | null;
  talla_camiseta?: string | null;
  numero_dorsal?: number | null;
  desea_kit?: boolean;
  categoria?: CategoriaInsc | null;
  desglose_precios?: {
    inscripcion: number | null;
    kit: number | null;
    invitado: number | null;
    kit_invitado: number | null;
  } | null;
  invitado?: InvitadoInsc | null;
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
    // Fechas sin hora (2008-07-29): se arman en hora local para que el día no se corra por la zona horaria.
    const partes = /^(\d{4})-(\d{2})-(\d{2})(?:T00:00:00(?:\.0+)?Z)?$/.exec(iso);
    const fecha = partes
      ? new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]))
      : new Date(iso);
    return fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

function fmtMoney(n: number | null | undefined) {
  return '$' + (Number(n) || 0).toLocaleString('es-CO');
}

/** Fecha del evento como día local (sin correrse por la zona horaria). */
function fechaLocal(iso: string | null | undefined) {
  if (!iso) return null;
  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  const f = partes ? new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3])) : new Date(iso);
  return Number.isNaN(f.getTime()) ? null : f;
}

/** Días que faltan para la fecha (0 = hoy). null si no hay fecha. */
function diasParaEvento(iso: string | null | undefined) {
  const f = fechaLocal(iso);
  if (!f) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.round((f.getTime() - hoy.getTime()) / 86400000);
}

function textoCuentaRegresiva(dias: number | null) {
  if (dias == null) return 'Fecha por confirmar';
  if (dias <= 0) return '¡Es hoy!';
  if (dias === 1) return 'Mañana';
  return `Faltan ${dias} días`;
}

/** Bloque pequeño con el día y el mes, como el de un dorsal o un calendario. */
function FechaBloque({ iso }: { iso: string | null | undefined }) {
  const f = fechaLocal(iso);
  if (!f) return null;
  const mes = f.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '');
  return (
    <span className="perfil-fecha" aria-hidden="true">
      <strong>{f.getDate()}</strong>
      <small>{mes}</small>
    </span>
  );
}

const EDAD_MINIMA = 10;
const EDAD_MAXIMA = 100;

/** Fecha local (no UTC) en formato YYYY-MM-DD. */
function fechaLocalISO(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Fecha máxima de nacimiento permitida: hoy menos EDAD_MINIMA años. */
function maxFechaNacimiento() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - EDAD_MINIMA);
  return fechaLocalISO(d);
}

/** Fecha mínima de nacimiento permitida: hoy menos EDAD_MAXIMA años. */
function minFechaNacimiento() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - EDAD_MAXIMA);
  return fechaLocalISO(d);
}

/** Devuelve el mensaje de error si la fecha de nacimiento no es válida, o null si está bien. */
function validarFechaNacimiento(valor: string) {
  if (!valor) return null;
  if (valor > fechaLocalISO(new Date())) {
    return 'La fecha de nacimiento no puede ser posterior a hoy.';
  }
  if (valor > maxFechaNacimiento()) {
    return `Debes tener al menos ${EDAD_MINIMA} años para usar la plataforma.`;
  }
  if (valor < minFechaNacimiento()) {
    return `La fecha de nacimiento no puede ser de hace más de ${EDAD_MAXIMA} años.`;
  }
  return null;
}

/** Normaliza el tipo de documento que llega de la base ("cedula_ciudadania" -> "CC"). */
function tipoDocumentoCodigo(tipo: string | null | undefined) {
  const map: Record<string, string> = {
    cedula_ciudadania: 'CC', tarjeta_identidad: 'TI', cedula_extranjeria: 'CE', pasaporte: 'PA',
  };
  return tipo ? (map[tipo] || tipo) : '';
}

function estadoResultadoLabel(estado: string | null | undefined) {
  const map: Record<string, string> = {
    oficial: 'Oficial', 'en revision': 'En revisión', descalificado: 'Descalificado',
  };
  return estado ? (map[estado] || estado) : '—';
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

function estadoEntregaKit(e: EntregaKitEstado | null | undefined) {
  if (!e) return null;
  if (e.estado === 'entregado') {
    return { cls: 'ok', txt: e.fecha_entrega_real ? `Entregado · ${fmtFechaLarga(e.fecha_entrega_real)}` : 'Entregado' };
  }
  if (e.estado === 'devolucion') return { cls: 'warn', txt: 'Devuelto' };
  return { cls: 'pending', txt: 'Pendiente de entrega' };
}

// Dibuja el QR en el propio navegador (sin servicios externos, así carga siempre
// y el código de entrada no sale de la aplicación).
function QrImagen({ codigo, tamano = 230 }: { codigo: string; tamano?: number }) {
  const [src, setSrc] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    let activo = true;
    setSrc('');
    setError(false);
    QRCode.toDataURL(codigo, { width: tamano * 2, margin: 1, errorCorrectionLevel: 'M' })
      .then((url) => { if (activo) setSrc(url); })
      .catch(() => { if (activo) setError(true); });
    return () => { activo = false; };
  }, [codigo, tamano]);

  if (error) return <p style={{ color: '#111', padding: '1rem', margin: 0 }}>No se pudo generar el QR. Usa el código de abajo.</p>;
  if (!src) return <div style={{ width: tamano, height: tamano }} aria-busy="true" />;
  return <img src={src} alt="Código QR de la inscripción" width={tamano} height={tamano} />;
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

const FILTROS_RES: Filtros = { q: '', rango: 'todas', desde: '', hasta: '', orden: 'recientes', estado: 'todos' };

const ESTADOS_RES = [
  { value: 'todos', label: 'Todos' },
  { value: 'oficial', label: 'Oficial' },
  { value: 'en revision', label: 'En revisión' },
  { value: 'descalificado', label: 'Descalificado' },
];

const RANGOS_RES: { value: RangoFecha; label: string }[] = [
  { value: 'todas', label: 'Todas las fechas' },
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

function FotoPerfilMenu({
  fotoUrl,
  nombre,
  subiendo,
  onCambiar,
  className,
}: {
  fotoUrl?: string | null;
  nombre?: string;
  subiendo: boolean;
  onCambiar: () => void;
  className: string;
}) {
  const { darkMode } = useAccessibility();
  const [menu, setMenu] = useState(false);
  const [viendo, setViendo] = useState(false);
  useBloquearScroll(viendo);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);

  // El menú va en <body> (la tarjeta tiene overflow: hidden), por eso se ubica con coordenadas.
  const alternar = () => {
    const r = botonRef.current?.getBoundingClientRect();
    if (r) {
      setPos({
        top: r.bottom + 8,
        left: Math.max(8, Math.min(r.left, window.innerWidth - 200)),
      });
    }
    setMenu((abierto) => !abierto);
  };

  useEffect(() => {
    if (!menu && !viendo) return;
    const alClickFuera = (e: MouseEvent) => {
      const objetivo = e.target as Node;
      if (botonRef.current?.contains(objetivo) || listaRef.current?.contains(objetivo)) return;
      setMenu(false);
    };
    const alTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenu(false);
        setViendo(false);
      }
    };
    const cerrarMenu = () => setMenu(false);
    document.addEventListener('mousedown', alClickFuera);
    document.addEventListener('keydown', alTecla);
    window.addEventListener('resize', cerrarMenu);
    window.addEventListener('scroll', cerrarMenu, true);
    return () => {
      document.removeEventListener('mousedown', alClickFuera);
      document.removeEventListener('keydown', alTecla);
      window.removeEventListener('resize', cerrarMenu);
      window.removeEventListener('scroll', cerrarMenu, true);
    };
  }, [menu, viendo]);

  const modo = darkMode ? ' dark-mode' : '';

  return (
    <>
      <button
        ref={botonRef}
        type="button"
        className={className}
        aria-label="Opciones de foto de perfil"
        aria-haspopup="menu"
        aria-expanded={menu}
        title="Foto de perfil"
        onClick={alternar}
        disabled={subiendo}
      >
        <i className={`ti ${subiendo ? 'ti-loader-2' : 'ti-camera'}`} aria-hidden="true" />
      </button>

      {menu && pos && createPortal(
        <div
          ref={listaRef}
          className={`mod-deportivo part-foto-menu${modo}`}
          role="menu"
          style={{ top: pos.top, left: pos.left }}
        >
          {fotoUrl && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenu(false);
                setViendo(true);
              }}
            >
              <i className="ti ti-eye" aria-hidden="true" /> Ver foto
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenu(false);
              onCambiar();
            }}
          >
            <i className="ti ti-photo-edit" aria-hidden="true" /> {fotoUrl ? 'Cambiar foto' : 'Subir foto'}
          </button>
        </div>,
        document.body,
      )}

      {viendo && fotoUrl && createPortal(
        <div
          className={`mod-deportivo part-qr-overlay part-foto-overlay${modo}`}
          role="dialog"
          aria-modal="true"
          aria-label="Foto de perfil"
          onClick={() => setViendo(false)}
        >
          <div className="part-foto-caja" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              title="Cerrar"
              className="part-qr-close part-foto-cerrar"
              aria-label="Cerrar"
              onClick={() => setViendo(false)}
            >
              <i className="ti ti-x" aria-hidden="true" />
            </button>
            <img
              className="part-foto-img"
              src={fotoUrl}
              alt={`Foto de perfil de ${nombre ?? 'tu cuenta'}`}
            />
            <button
              type="button"
              className="part-foto-cambiar"
              onClick={() => {
                setViendo(false);
                onCambiar();
              }}
            >
              <i className="ti ti-upload" aria-hidden="true" /> Cambiar foto
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

/** Filas por página en las listas del perfil. */
const POR_PAGINA = 10;

/** Botones Anterior / números / Siguiente. No se muestra si todo cabe en una página. */
function PaginadorPart({ actual, ultima, total, onCambiar }: {
  actual: number;
  ultima: number;
  total: number;
  onCambiar: (pagina: number) => void;
}) {
  if (ultima <= 1) return null;
  const desde = (actual - 1) * POR_PAGINA + 1;
  const hasta = Math.min(actual * POR_PAGINA, total);
  const numeros: Array<number | '…'> = [];
  for (let n = 1; n <= ultima; n++) {
    if (n === 1 || n === ultima || Math.abs(n - actual) <= 1) numeros.push(n);
    else if (numeros[numeros.length - 1] !== '…') numeros.push('…');
  }
  return (
    <div role="navigation" aria-label="Paginación" className="ppg-barra">
      <button type="button" className="ppg-btn" disabled={actual <= 1} onClick={() => onCambiar(actual - 1)}>Anterior</button>
      {numeros.map((n, i) => n === '…'
        ? <span key={`p${i}`} className="ppg-puntos" aria-hidden="true">…</span>
        : (
          <button
            key={n}
            type="button"
            className={`ppg-btn${n === actual ? ' ppg-activo' : ''}`}
            aria-current={n === actual ? 'page' : undefined}
            aria-label={`Ir a la página ${n}`}
            onClick={() => onCambiar(n)}
          >{n}</button>
        ))}
      <button type="button" className="ppg-btn" disabled={actual >= ultima} onClick={() => onCambiar(actual + 1)}>Siguiente</button>
      <span className="ppg-resumen">Mostrando {desde}–{hasta} de {total}</span>
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

const TABS: TabId[] = ['resumen', 'historial', 'inscripciones', 'resultados', 'pqr', 'ajustes'];

// Secciones del perfil: las usan la barra de pestañas (escritorio) y el menú vertical (móvil).
const PERFIL_TABS: Array<{ id: TabId; label: string; title: string; icono: string }> = [
  { id: 'resumen', label: 'Resumen', title: 'Ver el resumen', icono: 'ti-layout-dashboard' },
  { id: 'historial', label: 'Historial', title: 'Ver el historial', icono: 'ti-history' },
  { id: 'inscripciones', label: 'Inscripciones', title: 'Ver mis inscripciones', icono: 'ti-ticket' },
  { id: 'resultados', label: 'Resultados', title: 'Ver mis resultados', icono: 'ti-trophy' },
  { id: 'pqr', label: 'PQR', title: 'Ver mis PQR', icono: 'ti-message-report' },
  { id: 'ajustes', label: 'Ajustes', title: 'Ver los ajustes de tu cuenta', icono: 'ti-settings' },
];

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
  useBloquearScroll(!!cancelarInsc);

  // Menú vertical de secciones (móvil): se cierra con clic afuera o con Escape.
  const [menuTabs, setMenuTabs] = useState(false);
  const menuTabsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuTabs) return;
    const alHacerClic = (e: MouseEvent | TouchEvent) => {
      if (!menuTabsRef.current?.contains(e.target as Node)) setMenuTabs(false);
    };
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuTabs(false); };
    document.addEventListener('mousedown', alHacerClic);
    document.addEventListener('touchstart', alHacerClic);
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('mousedown', alHacerClic);
      document.removeEventListener('touchstart', alHacerClic);
      document.removeEventListener('keydown', alTeclear);
    };
  }, [menuTabs]);
  const [cancelando, setCancelando] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [filtrosInsc, setFiltrosInsc] = useState<Filtros>(FILTROS_INSC);
  const [filtrosHist, setFiltrosHist] = useState<Filtros>(FILTROS_HIST);
  const [filtrosRes, setFiltrosRes] = useState<Filtros>(FILTROS_RES);
  const [soloPremio, setSoloPremio] = useState(false);
  const [paginas, setPaginas] = useState<Record<string, number>>({});

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

  // ----- Resultados: inscripciones que ya tienen resultado publicado -----
  const filasRes = useMemo(
    () => (inscripciones ?? []).filter((i) => !!i.resultado),
    [inscripciones],
  );
  const textoRes = (i: Inscripcion) =>
    `${i.evento?.nombre ?? ''} ${i.evento?.categoria ?? ''} ${i.evento?.ubicacion ?? ''} ${estadoResultadoLabel(i.resultado?.estado)} ${(i.resultado?.premios ?? []).map((p) => p.nombre).join(' ')}`;
  const conteosRes = useMemo(() => contarPor(filasRes, (i) => i.resultado?.estado ?? ''), [filasRes]);
  const filasResFiltradas = useMemo(
    () =>
      filtrarLista(filasRes, filtrosRes, (i) => i.evento?.fecha, textoRes, (i) => i.resultado?.estado ?? '')
        .filter((i) => !soloPremio || (i.resultado?.premios.length ?? 0) > 0),
    [filasRes, filtrosRes, soloPremio],
  );
  const mejorPosicion = filasRes.reduce<number | null>((min, i) => {
    const p = i.resultado?.posicion_general;
    return p != null && (min === null || p < min) ? p : min;
  }, null);
  const totalPremios = filasRes.reduce((n, i) => n + (i.resultado?.premios.length ?? 0), 0);

  // ----- Paginación: corta cada lista en páginas de POR_PAGINA -----
  const paginar = <T,>(clave: string, lista: T[]) => {
    const ultima = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
    const actual = Math.min(Math.max(1, paginas[clave] ?? 1), ultima);
    const desde = (actual - 1) * POR_PAGINA;
    return { items: lista.slice(desde, desde + POR_PAGINA), actual, ultima, total: lista.length };
  };
  const irAPagina = (clave: string) => (n: number) => setPaginas((p) => ({ ...p, [clave]: n }));
  const pagHist = paginar('historial', filasHistFiltradas);
  const pagRes = paginar('resultados', filasResFiltradas);
  const pagInsc = paginar<{ i: Inscripcion; pasada: boolean }>('inscripciones', [
    ...proximasFiltradas.map((i) => ({ i, pasada: false })),
    ...pasadasFiltradas.map((i) => ({ i, pasada: true })),
  ]);
  const pagProximas = pagInsc.items.filter((x) => !x.pasada).map((x) => x.i);
  const pagPasadas = pagInsc.items.filter((x) => x.pasada).map((x) => x.i);
  useEffect(() => { setPaginas({}); }, [filtrosInsc, filtrosHist, filtrosRes, soloPremio, tab]);

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

  const siguiente = proximas[0];
  const diasSiguiente = diasParaEvento(siguiente?.evento?.fecha);
  const completados = pasadas.filter((i) => i.estado !== 'pendiente').length;
  const totalActivas = inscripciones?.filter((i) => i.estado !== 'cancelada').length ?? 0;
  const totalInvertido = inscripciones?.filter((i) => i.estado !== 'cancelada' && i.estado !== 'pendiente').reduce((s, i) => s + (Number(i.precio_pagado) || 0), 0);
  const chipSiguiente = diasSiguiente == null
    ? 'Próxima salida por confirmar'
    : diasSiguiente <= 0 ? 'Hoy es tu próxima salida'
      : diasSiguiente === 1 ? 'Tu próxima salida es mañana'
        : `Próxima salida en ${diasSiguiente} días`;

  return (
    <div className="perfil">
      <div className="part-header part-header--hero perfil-hero">
        {/* Perfil de altimetría de una ruta: solo decoración */}
        <svg className="perfil-hero-ruta" viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path className="relleno" d="M0 120 L0 92 C60 88 90 70 140 74 C190 78 210 50 260 46 C310 42 330 66 380 64 C430 62 450 28 510 22 C570 16 590 52 640 58 C690 64 720 40 770 38 C820 36 850 70 900 72 C950 74 980 44 1030 40 C1080 36 1120 62 1200 58 L1200 120 Z" />
          <path className="linea" d="M0 92 C60 88 90 70 140 74 C190 78 210 50 260 46 C310 42 330 66 380 64 C430 62 450 28 510 22 C570 16 590 52 640 58 C690 64 720 40 770 38 C820 36 850 70 900 72 C950 74 980 44 1030 40 C1080 36 1120 62 1200 58" />
        </svg>
        <div className="part-header-inner">
          <div className="part-avatar-wrap perfil-avatar-anillo">
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
            <FotoPerfilMenu
              className="part-avatar-edit"
              fotoUrl={user?.foto_url}
              nombre={user?.name}
              subiendo={subiendoFoto}
              onCambiar={handleFotoClick}
            />
          </div>
          <div className="part-meta">
            <div className="part-badge"><i className="ti ti-medal" aria-hidden="true" />Ciclista verificado</div>
            <h1>{user?.name || 'Ciclista'}</h1>
            <p className="part-handle">@{(user?.email || '').split('@')[0]}</p>
            <ul className="perfil-hero-chips" aria-label="Tu actividad">
              <li><i className="ti ti-bike" aria-hidden="true" /> Ruta</li>
              {user?.ciudad && <li><i className="ti ti-map-pin" aria-hidden="true" /> {user.ciudad}</li>}
              <li><i className="ti ti-flag-check" aria-hidden="true" /> {completados} {completados === 1 ? 'evento completado' : 'eventos completados'}</li>
              {siguiente && (
                <li className="perfil-hero-chip-vivo">
                  <span className="perfil-punto" aria-hidden="true" /> {chipSiguiente}
                </li>
              )}
            </ul>
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
          {PERFIL_TABS.map((t) => (
            <button title={t.title}
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={`part-tab-btn${tab === t.id ? ' active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <i className={`ti ${t.icono}`} aria-hidden="true" /> {t.label}
            </button>
          ))}
        </div>

        {/* Móvil: las secciones se despliegan como lista vertical, igual que el menú de navegación. */}
        <div className="part-tabs-movil" ref={menuTabsRef}>
          <button
            type="button"
            className="part-tabs-movil-btn"
            aria-expanded={menuTabs}
            aria-controls="part-tabs-lista"
            title={menuTabs ? 'Cerrar el menú de secciones' : 'Abrir el menú de secciones'}
            onClick={() => setMenuTabs((v) => !v)}
          >
            <i className={`ti ${(PERFIL_TABS.find((t) => t.id === tab) ?? PERFIL_TABS[0]).icono}`} aria-hidden="true" />
            <span>{(PERFIL_TABS.find((t) => t.id === tab) ?? PERFIL_TABS[0]).label}</span>
            <i className={`ti ${menuTabs ? 'ti-x' : 'ti-menu-2'} part-tabs-movil-ico`} aria-hidden="true" />
          </button>
          {menuTabs && (
            <div id="part-tabs-lista" className="part-tabs-movil-lista" role="group" aria-label="Secciones del perfil">
              {PERFIL_TABS.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  title={t.title}
                  aria-current={tab === t.id ? 'page' : undefined}
                  className={tab === t.id ? 'active' : ''}
                  onClick={() => { setTab(t.id); setMenuTabs(false); }}
                >
                  <i className={`ti ${t.icono}`} aria-hidden="true" /> {t.label}
                </button>
              ))}
            </div>
          )}
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
              <div className="part-card perfil-ficha">
                <div className="part-card-head">
                  <span className="part-card-head-icon"><i className="ti ti-id-badge-2" aria-hidden="true" /></span>
                  <h3>Información</h3>
                </div>
                <div className="part-card-body">
                  <div className="part-info-row"><span className="part-info-label"><i className="ti ti-user-star" aria-hidden="true" />Rol</span><span className="part-info-value">{user?.role === 'admin' ? 'Administrador' : 'Participante'}</span></div>
                  <div className="part-info-row"><span className="part-info-label"><i className="ti ti-mail" aria-hidden="true" />Correo</span><span className="part-info-value">{user?.email || '—'}</span></div>
                  <div className="part-info-row"><span className="part-info-label"><i className="ti ti-phone" aria-hidden="true" />Teléfono</span><span className="part-info-value">{user?.telefono || '—'}</span></div>
                  <div className="part-info-row"><span className="part-info-label"><i className="ti ti-map-pin" aria-hidden="true" />Ciudad</span><span className="part-info-value">{user?.ciudad || '—'}</span></div>
                  <div className="part-info-row"><span className="part-info-label"><i className="ti ti-id" aria-hidden="true" />Documento</span><span className="part-info-value">{user?.documento ? `${tipoDocumentoLabel(user.tipo_documento)} ${user.documento}` : '—'}</span></div>
                  <div className="part-info-row"><span className="part-info-label"><i className="ti ti-cake" aria-hidden="true" />Nacimiento</span><span className="part-info-value">{fmtFechaLarga(user?.fecha_nacimiento)}</span></div>
                </div>
              </div>
              <div className="part-card perfil-disciplinas">
                <div className="part-card-head">
                  <span className="part-card-head-icon"><i className="ti ti-route" aria-hidden="true" /></span>
                  <h3>Disciplinas</h3>
                </div>
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
                <div className="part-strip-stat">
                  <span className="perfil-stat-ico" aria-hidden="true"><i className="ti ti-flag-check" /></span>
                  <span className="part-num">{completados}</span><span className="part-lbl">Eventos completados</span>
                </div>
                <div className="part-strip-stat accent">
                  <span className="perfil-stat-ico" aria-hidden="true"><i className="ti ti-calendar-event" /></span>
                  <span className="part-num">{proximas.length}</span><span className="part-lbl">Próximos eventos</span>
                </div>
                <div className="part-strip-stat">
                  <span className="perfil-stat-ico" aria-hidden="true"><i className="ti ti-ticket" /></span>
                  <span className="part-num">{totalActivas}</span><span className="part-lbl">Inscripciones totales</span>
                </div>
                <div className="part-strip-stat accent">
                  <span className="perfil-stat-ico" aria-hidden="true"><i className="ti ti-wallet" /></span>
                  <span className="part-num">{fmtMoney(totalInvertido)}</span><span className="part-lbl">Total invertido</span>
                </div>
              </div>

              {loadError && <div className="part-empty-row">{loadError}</div>}

              {!loadError && siguiente && (
                <section className="perfil-siguiente" aria-label="Tu próxima salida">
                  <div
                    className="perfil-siguiente-foto"
                    style={siguiente.evento?.imagen_url ? { backgroundImage: `url(${siguiente.evento.imagen_url})` } : undefined}
                    aria-hidden="true"
                  />
                  <div className="perfil-siguiente-cuerpo">
                    <span className="perfil-siguiente-etiqueta"><i className="ti ti-bike" aria-hidden="true" /> Tu próxima salida</span>
                    <h2>{siguiente.evento?.nombre || 'Evento'}</h2>
                    <ul className="perfil-siguiente-datos">
                      <li><i className="ti ti-calendar" aria-hidden="true" /> {fmtFechaLarga(siguiente.evento?.fecha)}{siguiente.evento?.hora ? ` · ${fmtHoraCorta(siguiente.evento.hora)}` : ''}</li>
                      {siguiente.evento?.ubicacion && <li><i className="ti ti-map-pin" aria-hidden="true" /> {siguiente.evento.ubicacion}</li>}
                      {(siguiente.categoria?.nombre || siguiente.evento?.categoria) && (
                        <li><i className="ti ti-route" aria-hidden="true" /> {siguiente.categoria?.nombre || siguiente.evento?.categoria}</li>
                      )}
                    </ul>
                    <div className="perfil-siguiente-acciones">
                      <button type="button" className="btn btn-primary" title="Ver los detalles de la inscripción" onClick={() => abrirDetalle(siguiente)}>
                        Ver detalles <i className="ti ti-arrow-right" aria-hidden="true" />
                      </button>
                      {siguiente.qr?.codigo && (
                        <button
                          type="button"
                          className="btn btn-outline"
                          title={siguiente.qr?.codigo_kit ? 'Ver mis códigos QR' : 'Ver mi código QR de entrada'}
                          onClick={() => { abrirDetalle(siguiente); setVerQr(true); }}
                        >
                          <i className="ti ti-qrcode" aria-hidden="true" /> {siguiente.qr?.codigo_kit ? 'Mis QR' : 'Mi QR'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className={`perfil-cuenta${diasSiguiente != null && diasSiguiente <= 1 ? ' ya' : ''}`}>
                    {diasSiguiente != null && diasSiguiente > 1 ? (
                      <>
                        <small>Faltan</small>
                        <strong>{diasSiguiente}</strong>
                        <small>días</small>
                      </>
                    ) : (
                      <strong className="perfil-cuenta-texto">{textoCuentaRegresiva(diasSiguiente)}</strong>
                    )}
                    <span className={`part-status-pill ${estadoPill(siguiente.estado).cls}`}>{estadoPill(siguiente.estado).txt}</span>
                  </div>
                </section>
              )}

              {(proximas.length !== 1 || loadError) && (
                <p className="part-section-label">
                  <span><i className="ti ti-calendar-event" aria-hidden="true" /> {siguiente ? 'También te esperan' : 'Próximas inscripciones'}</span>
                  <button title="Ver todas mis inscripciones" onClick={() => setTab('inscripciones')}>Ver todo →</button>
                </p>
              )}
              {!loadError && proximas.length === 0 && (
                <div className="part-empty-row">Sin eventos próximos. <Link title="Explorar los eventos disponibles" to="/deportivo/eventos">Explora eventos →</Link></div>
              )}
              {proximas.slice(1, 4).map((i) => (
                <EventRow key={i.id} insc={i} onVerDetalle={() => abrirDetalle(i)} onCancelar={qrYaUsado(i) ? undefined : () => pedirCancelacion(i)} />
              ))}
            </>
          )}

          {tab === 'historial' && (
            <>
              <p className="part-section-label"><span><i className="ti ti-history" aria-hidden="true" /> Mi historial</span></p>
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
              <div className="perfil-linea">
                {pagHist.items.map((f) =>
                  f.h ? (
                    <div className="part-event-row" key={f.key}>
                      <div className="part-event-row-img">
                        {(f.h.evento?.nombre || '?')[0].toUpperCase()}
                        <FechaBloque iso={f.h.fecha_hp} />
                      </div>
                      <div className="part-event-row-info">
                        <h4>{f.h.evento?.nombre || 'Evento'}</h4>
                        <div className="part-event-meta">
                          <span><i className="ti ti-calendar" aria-hidden="true" /> {fmtFechaLarga(f.h.fecha_hp)}</span>
                          {f.h.evento?.ubicacion && <span><i className="ti ti-map-pin" aria-hidden="true" /> {f.h.evento.ubicacion}</span>}
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
              </div>
              <PaginadorPart actual={pagHist.actual} ultima={pagHist.ultima} total={pagHist.total} onCambiar={irAPagina('historial')} />
            </>
          )}

          {tab === 'resultados' && (
            <>
              <p className="part-section-label"><span><i className="ti ti-trophy" aria-hidden="true" /> Mis resultados</span></p>
              {!inscripciones && !loadError && <div className="part-empty-row">Cargando resultados…</div>}
              {loadError && <div className="part-empty-row">{loadError}</div>}
              {inscripciones && filasRes.length === 0 && (
                <div className="part-empty-row">
                  Todavía no tienes resultados publicados. Cuando termine un evento en el que participaste, tu tiempo y tu posición aparecerán aquí.
                </div>
              )}
              {filasRes.length > 0 && (
                <>
                  <div className="part-detail-info-grid perfil-podio" style={{ marginBottom: '1rem' }}>
                    <div className="part-detail-info-item">
                      <span className="part-detail-icon"><i className="ti ti-flag-check" aria-hidden="true" /></span>
                      <div>
                        <span className="part-label">Eventos con resultado</span>
                        <strong>{filasRes.length}</strong>
                      </div>
                    </div>
                    <div className="part-detail-info-item">
                      <span className="part-detail-icon"><i className="ti ti-medal" aria-hidden="true" /></span>
                      <div>
                        <span className="part-label">Mejor posición general</span>
                        <strong>{mejorPosicion != null ? `${mejorPosicion}.º` : '—'}</strong>
                      </div>
                    </div>
                    <div className="part-detail-info-item">
                      <span className="part-detail-icon"><i className="ti ti-award" aria-hidden="true" /></span>
                      <div>
                        <span className="part-label">Premios obtenidos</span>
                        <strong>{totalPremios}</strong>
                      </div>
                    </div>
                  </div>

                  <ListToolbar
                    filtros={filtrosRes}
                    base={FILTROS_RES}
                    onChange={setFiltrosRes}
                    rangos={RANGOS_RES}
                    estados={ESTADOS_RES}
                    conteos={conteosRes}
                    placeholder="Buscar por evento, lugar, categoría o premio"
                    ordenLabels={{ recientes: 'Más recientes primero', antiguos: 'Más antiguos primero' }}
                    total={filasRes.length}
                    mostrando={filasResFiltradas.length}
                    singular="resultado"
                    plural="resultados"
                  />
                  <label className="perfil-check">
                    <input type="checkbox" checked={soloPremio} onChange={(e) => setSoloPremio(e.target.checked)} />
                    <i className="ti ti-award" aria-hidden="true" /> Solo los que tuvieron premio
                  </label>
                  {filasResFiltradas.length === 0 && (
                    <div className="part-empty-row">
                      No encontramos resultados con estos filtros.{' '}
                      <button title="Quitar todos los filtros" type="button" className="part-tool-clear" onClick={() => { setFiltrosRes({ ...FILTROS_RES, orden: filtrosRes.orden }); setSoloPremio(false); }}>
                        Limpiar filtros
                      </button>
                    </div>
                  )}
                  {pagRes.items.map((i) => {
                    const r = i.resultado!;
                    const pillCls = r.estado === 'oficial' ? 'ok' : r.estado === 'descalificado' ? 'warn' : 'pending';
                    const bg = i.evento?.imagen_url ? { backgroundImage: `url(${i.evento.imagen_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined;
                    return (
                      <div className="part-event-row perfil-resultado" key={i.id}>
                        <div className="part-event-row-img" style={bg}>
                          {!i.evento?.imagen_url && (i.evento?.nombre || '?')[0].toUpperCase()}
                          {r.posicion_general != null && (
                            <span className={`perfil-puesto${r.posicion_general <= 3 ? ` top top-${r.posicion_general}` : ''}`} aria-hidden="true">
                              {r.posicion_general}.º
                            </span>
                          )}
                        </div>
                        <div className="part-event-row-info">
                          <h4>{i.evento?.nombre || 'Evento'}</h4>
                          <div className="part-event-meta">
                            <span><i className="ti ti-calendar" aria-hidden="true" /> {fmtFechaLarga(i.evento?.fecha)}</span>
                            {i.evento?.ubicacion && <span><i className="ti ti-map-pin" aria-hidden="true" /> {i.evento.ubicacion}</span>}
                            {i.categoria?.nombre && <span><i className="ti ti-route" aria-hidden="true" /> {i.categoria.nombre}</span>}
                          </div>
                          <div className="part-event-meta perfil-marcas">
                            {r.tiempo_final && <span><i className="ti ti-stopwatch" aria-hidden="true" /> {r.tiempo_final}</span>}
                            {r.posicion_general != null && <span><i className="ti ti-medal" aria-hidden="true" /> {r.posicion_general}.º general</span>}
                            {r.posicion_categoria != null && <span><i className="ti ti-trophy" aria-hidden="true" /> {r.posicion_categoria}.º en {i.categoria?.nombre || 'categoría'}</span>}
                            {r.premios.length > 0 && <span><i className="ti ti-award" aria-hidden="true" /> {r.premios.map((p) => p.nombre).join(', ')}</span>}
                          </div>
                          <div className="perfil-acciones">
                            <button title="Ver los detalles de la inscripción" className="part-btn-link-detail" onClick={() => abrirDetalle(i)}>
                              Ver detalles <i className="ti ti-arrow-right" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                        <span className={`part-status-pill ${pillCls}`}>{estadoResultadoLabel(r.estado)}</span>
                      </div>
                    );
                  })}
                  <PaginadorPart actual={pagRes.actual} ultima={pagRes.ultima} total={pagRes.total} onCambiar={irAPagina('resultados')} />
                </>
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
              {(pagProximas.length > 0 || proximas.length === 0) && (
                <p className="part-section-label"><span><i className="ti ti-calendar-event" aria-hidden="true" /> Eventos confirmados</span></p>
              )}
              {!loadError && proximas.length === 0 && (
                <div className="part-empty-row">No tienes inscripciones activas.</div>
              )}
              {pagProximas.map((i) => (
                <EventRow key={i.id} insc={i} onVerDetalle={() => abrirDetalle(i)} onCancelar={qrYaUsado(i) ? undefined : () => pedirCancelacion(i)} />
              ))}
              {pagPasadas.length > 0 && (
                <>
                  <p className="part-section-label"><span><i className="ti ti-history" aria-hidden="true" /> Eventos pasados</span></p>
                  {pagPasadas.map((i) => (
                    <EventRow key={i.id} insc={i} onVerDetalle={() => abrirDetalle(i)} />
                  ))}
                </>
              )}
              <PaginadorPart actual={pagInsc.actual} ultima={pagInsc.ultima} total={pagInsc.total} onCambiar={irAPagina('inscripciones')} />
              <div className="perfil-cta">
                <span className="perfil-cta-ico" aria-hidden="true"><i className="ti ti-bike" /></span>
                <div>
                  <strong>¿Listo para la próxima rodada?</strong>
                  <p>Mira el calendario y reserva tu cupo antes de que se agoten.</p>
                </div>
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
              onCancelar={proximas.some((p) => p.id === detalle.id) && !qrYaUsado(detalle) ? () => pedirCancelacion(detalle) : undefined}
            />
          )}

          {tab === 'pqr' && <ParticipantePqr />}
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
    </div>
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
    <div className={`part-event-row perfil-evento perfil-evento--${pill.cls}`}>
      <div className="part-event-row-img" style={bg}>
        {!insc.evento?.imagen_url && (insc.evento?.nombre || '?')[0].toUpperCase()}
        <FechaBloque iso={insc.evento?.fecha} />
      </div>
      <div className="part-event-row-info">
        <h4>{insc.evento?.nombre || 'Evento'}</h4>
        <div className="part-event-meta">
          <span><i className="ti ti-calendar" aria-hidden="true" /> {fmtFechaLarga(insc.evento?.fecha)}</span>
          {insc.evento?.ubicacion && <span><i className="ti ti-map-pin" aria-hidden="true" /> {insc.evento.ubicacion}</span>}
          {insc.evento?.categoria && <span><i className="ti ti-route" aria-hidden="true" /> {insc.evento.categoria}</span>}
        </div>
        <div className="perfil-acciones">
          <button title="Ver los detalles de la inscripción" className="part-btn-link-detail" onClick={onVerDetalle}>
            Ver detalles <i className="ti ti-arrow-right" aria-hidden="true" />
          </button>
          {onCancelar && (
            <button title="Cancelar esta inscripción"
              className="part-btn-link-detail perfil-cancelar"
              onClick={onCancelar}
            >
              <i className="ti ti-circle-x" aria-hidden="true" /> Cancelar inscripción
            </button>
          )}
        </div>
      </div>
      <span className={`part-status-pill ${pill.cls}`}>{pill.txt}</span>
    </div>
  );
}

/* ---------- Pases con código QR: entrada al evento y retiro del kit ---------- */

/** "07:00:00" -> "7:00 a. m." */
function fmtHoraCorta(hora: string | null | undefined) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(hora ?? ''));
  if (!m) return hora ?? '';
  return new Date(2000, 0, 1, Number(m[1]), Number(m[2])).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
}

/** Código del pase con botón de copiar (por si la cámara del staff no lo lee). */
function CodigoPase({ codigo }: { codigo: string }) {
  const [copiado, setCopiado] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(temporizador.current), []);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(codigo);
    } catch {
      const campo = document.createElement('textarea');
      campo.value = codigo;
      campo.style.position = 'fixed';
      campo.style.opacity = '0';
      document.body.appendChild(campo);
      campo.select();
      try { document.execCommand('copy'); } catch { /* sin soporte */ }
      document.body.removeChild(campo);
    }
    setCopiado(true);
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setCopiado(false), 1800);
  };

  return (
    <div className="pase-codigo">
      <span className="pase-codigo-etiqueta">Código</span>
      <code style={{ userSelect: 'all' }}>{codigo}</code>
      <button type="button" className={`pase-copiar${copiado ? ' ok' : ''}`} title="Copiar el código" onClick={copiar}>
        <i className={`ti ${copiado ? 'ti-check' : 'ti-copy'}`} aria-hidden="true" /> {copiado ? 'Copiado' : 'Copiar'}
      </button>
      <span role="status" aria-live="polite" className="pase-solo-lector">{copiado ? 'Código copiado' : ''}</span>
    </div>
  );
}

/**
 * Los pases de una inscripción en una sola ventana:
 *  - "Entrada al evento": el QR de asistencia del día del evento (siempre).
 *  - "Retiro del kit": solo si alguien de la inscripción pidió kit. Con él el
 *    staff ve las tallas y marca el kit como entregado (días antes del evento).
 */
function PasesQr({ insc, darkMode, onCerrar }: { insc: Inscripcion; darkMode: boolean; onCerrar: () => void }) {
  const { user } = useAuth();
  useBloquearScroll(true);
  const qr = insc.qr!;
  const inv = insc.invitado;
  const evento = insc.evento;
  const codigoKit = qr.codigo_kit ?? null;

  // Kits pedidos en la inscripción (el tuyo y/o el del invitado).
  const kits = [
    insc.desea_kit ? { quien: 'Tú', talla: insc.talla_camiseta, entrega: insc.entrega_kit } : null,
    inv?.desea_kit
      ? { quien: `${inv.nombre ?? ''} ${inv.apellido ?? ''}`.trim() || 'Invitado', talla: inv.talla_kit, entrega: insc.entrega_kit_invitado }
      : null,
  ].filter((k): k is { quien: string; talla: string | null | undefined; entrega: EntregaKitEstado | null | undefined } => k !== null);
  const kitsPendientes = kits.filter((k) => k.entrega?.estado !== 'entregado').length;

  // Si aún falta recoger el kit, se abre primero ese pase (es lo siguiente que debe hacer).
  const [pase, setPase] = useState<'entrada' | 'kit'>(codigoKit && kitsPendientes > 0 && qr.estado !== 'usado' ? 'kit' : 'entrada');

  // Escape cierra la ventana.
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [onCerrar]);

  const pagoPendiente = insc.estado === 'pendiente' || qr.estado === 'pendiente';
  const cancelada = insc.estado === 'cancelada' || qr.estado === 'cancelado';
  const usosPermitidos = Number(qr.usos_permitidos) || 1;
  const usosRealizados = Number(qr.usos_realizados) || 0;

  // Sello encima del QR cuando todavía no sirve o ya se usó.
  const selloEntrada = cancelada
    ? { icono: 'ti-ban', texto: 'Inscripción cancelada' }
    : pagoPendiente
      ? { icono: 'ti-hourglass-high', texto: 'Se activa cuando validemos tu pago' }
      : qr.estado === 'usado'
        ? { icono: 'ti-circle-check', texto: 'Ya ingresaste al evento' }
        : null;
  const selloKit = cancelada
    ? { icono: 'ti-ban', texto: 'Inscripción cancelada' }
    : pagoPendiente
      ? { icono: 'ti-hourglass-high', texto: 'Se activa cuando validemos tu pago' }
      : kitsPendientes === 0
        ? { icono: 'ti-circle-check', texto: kits.length > 1 ? 'Kits entregados' : 'Kit entregado' }
        : null;

  const estadoEntrada = cancelada
    ? { clase: 'error', texto: 'Cancelada' }
    : pagoPendiente
      ? { clase: 'espera', texto: 'Pago por validar' }
      : qr.estado === 'usado'
        ? { clase: 'usado', texto: 'Usada' }
        : { clase: 'ok', texto: usosPermitidos > 1 ? `Válida · ${usosRealizados} de ${usosPermitidos} ingresos` : 'Válida' };
  const estadoKit = cancelada
    ? { clase: 'error', texto: 'Cancelada' }
    : pagoPendiente
      ? { clase: 'espera', texto: 'Pago por validar' }
      : kitsPendientes === 0
        ? { clase: 'usado', texto: 'Entregado' }
        : { clase: 'ok', texto: kitsPendientes === 1 ? '1 kit por recoger' : `${kitsPendientes} kits por recoger` };

  const esKit = pase === 'kit' && !!codigoKit;
  const codigo = esKit ? codigoKit! : (qr.codigo ?? '');
  const sello = esKit ? selloKit : selloEntrada;
  const estado = esKit ? estadoKit : estadoEntrada;

  return (
    <div className={`mod-deportivo part-qr-overlay pase-fondo${darkMode ? ' dark-mode' : ''}`} onClick={onCerrar}>
      <div
        className={`pase${esKit ? ' pase-kit' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={esKit ? 'Código QR para retirar el kit' : 'Código QR de entrada al evento'}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="pase-cerrar" title="Cerrar" aria-label="Cerrar" onClick={onCerrar}>
          <i className="ti ti-x" aria-hidden="true" />
        </button>

        <header className="pase-cab">
          <span className="pase-marca"><i className="ti ti-bike" aria-hidden="true" /> SKYED Deportivo</span>
          <h3>{evento?.nombre || 'Tu evento'}</h3>
          <p>
            {evento?.fecha && <span><i className="ti ti-calendar-event" aria-hidden="true" /> {fmtFechaLarga(evento.fecha)}</span>}
            {evento?.hora && <span><i className="ti ti-clock" aria-hidden="true" /> {fmtHoraCorta(evento.hora)}</span>}
            {evento?.ubicacion && <span><i className="ti ti-map-pin" aria-hidden="true" /> {evento.ubicacion}</span>}
          </p>
        </header>

        {codigoKit && (
          <div className="pase-selector" role="tablist" aria-label="Elige el código QR">
            <button type="button" role="tab" aria-selected={!esKit} title="Ver el QR de entrada al evento" onClick={() => setPase('entrada')}>
              <i className="ti ti-ticket" aria-hidden="true" /> Entrada al evento
            </button>
            <button type="button" role="tab" aria-selected={esKit} title="Ver el QR para retirar el kit" onClick={() => setPase('kit')}>
              <i className="ti ti-shirt-sport" aria-hidden="true" /> Retiro del kit
              {kitsPendientes > 0 && !pagoPendiente && !cancelada && <span className="pase-punto" aria-label="Pendiente" />}
            </button>
          </div>
        )}

        <div className="pase-cuerpo" key={pase}>
          <div className="pase-titulo">
            <strong><i className={`ti ${esKit ? 'ti-shirt-sport' : 'ti-ticket'}`} aria-hidden="true" /> {esKit ? 'Retiro del kit' : 'Entrada al evento'}</strong>
            <span className={`pase-estado ${estado.clase}`}>{estado.texto}</span>
          </div>

          <div className="pase-layout">
          <div className="pase-col-qr">
          <div className={`pase-qr${sello ? ' inactivo' : ''}`}>
            <span className="pase-esquina a" aria-hidden="true" />
            <span className="pase-esquina b" aria-hidden="true" />
            <span className="pase-esquina c" aria-hidden="true" />
            <span className="pase-esquina d" aria-hidden="true" />
            <QrImagen codigo={codigo} tamano={240} />
            {sello && (
              <div className="pase-sello">
                <i className={`ti ${sello.icono}`} aria-hidden="true" />
                <span>{sello.texto}</span>
              </div>
            )}
          </div>
          </div>

          <div className="pase-col-info">
          <CodigoPase codigo={codigo} />

          {esKit ? (
            <>
              <ul className="pase-kits">
                {kits.map((k) => {
                  const entregado = k.entrega?.estado === 'entregado';
                  return (
                    <li key={k.quien}>
                      <span className="pase-kits-quien"><i className="ti ti-user" aria-hidden="true" /> {k.quien}</span>
                      <span className="pase-kits-talla">Talla <b>{k.talla || '—'}</b></span>
                      <span className={`pase-estado ${entregado ? 'usado' : 'ok'}`}>{entregado ? 'Entregado' : 'Por recoger'}</span>
                    </li>
                  );
                })}
              </ul>
              {(evento?.kit?.lugar_entrega || evento?.kit?.fecha_entrega) && (
                <dl className="pase-datos">
                  {evento?.kit?.lugar_entrega && <div><dt>Dónde</dt><dd>{evento.kit.lugar_entrega}</dd></div>}
                  {evento?.kit?.fecha_entrega && <div><dt>Cuándo</dt><dd>{fmtFechaLarga(evento.kit.fecha_entrega)}</dd></div>}
                </dl>
              )}
              <p className="pase-ayuda">
                <i className="ti ti-info-circle" aria-hidden="true" />
                Muestra este código en el punto de entrega del kit y lleva tu documento.
                {kits.length > 1 ? ' Con él se entregan los kits de las dos personas.' : ''}
              </p>
            </>
          ) : (
            <>
              <dl className="pase-datos">
                <div><dt>Participante</dt><dd>{user?.name || '—'}</dd></div>
                {insc.numero_dorsal != null && <div><dt>Dorsal</dt><dd className="pase-dorsal">#{insc.numero_dorsal}</dd></div>}
                {insc.categoria?.nombre && <div><dt>Categoría</dt><dd>{insc.categoria.nombre}</dd></div>}
                {inv && <div><dt>Invitado</dt><dd>{`${inv.nombre ?? ''} ${inv.apellido ?? ''}`.trim() || '—'}</dd></div>}
                <div><dt>Sirve para</dt><dd>{usosPermitidos > 1 ? `${usosPermitidos} ingresos (tú y tu invitado)` : '1 ingreso'}</dd></div>
              </dl>
              <p className="pase-ayuda">
                <i className="ti ti-info-circle" aria-hidden="true" />
                Muestra este código en el punto de control el día del evento.
              </p>
            </>
          )}
          </div>
          </div>
        </div>

        <footer className="pase-pie">
          <i className="ti ti-sun" aria-hidden="true" /> Sube el brillo de la pantalla para que lo lean más rápido.
        </footer>
      </div>
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
  const precioKit = Number(insc.desglose_precios?.kit) || 0;
  const precioKitInvitado = Number(insc.desglose_precios?.kit_invitado) || 0;
  const inv = insc.invitado;
  // Si pidió kit y la inscripción está confirmada pero aún no hay fila de entrega,
  // se muestra como pendiente (así el invitado no queda sin etiqueta).
  const kitPendiente: EntregaKitEstado = { estado: 'pendiente', fecha_entrega_real: null };
  const confirmada = insc.estado === 'confirmada';
  const res = insc.resultado;
  const entregaTitular = estadoEntregaKit(
    insc.entrega_kit ?? (confirmada && insc.desea_kit ? kitPendiente : null)
  );
  const entregaInvitado = estadoEntregaKit(
    insc.entrega_kit_invitado ?? (confirmada && inv?.desea_kit ? kitPendiente : null)
  );

  // Detalle de lo pagado: inscripción, kit, invitado y kit del invitado (solo lo que sí hubo).
  const desglose = insc.desglose_precios;
  const nombreInvitado = inv ? `${inv.nombre ?? ''} ${inv.apellido ?? ''}`.trim() : '';
  const filasPago: Array<{ concepto: string; detalle?: string; valor: number }> = [];
  if (desglose) {
    filasPago.push({ concepto: 'Inscripción', valor: Number(desglose.inscripcion) || 0 });
    if (insc.desea_kit) {
      filasPago.push({
        concepto: 'Kit de bienvenida',
        detalle: insc.talla_camiseta ? `Talla ${insc.talla_camiseta}` : undefined,
        valor: precioKit,
      });
    }
    if (inv) {
      filasPago.push({
        concepto: 'Inscripción del invitado',
        detalle: nombreInvitado || undefined,
        valor: Number(desglose.invitado) || 0,
      });
      if (inv.desea_kit) {
        filasPago.push({
          concepto: 'Kit del invitado',
          detalle: inv.talla_kit ? `Talla ${inv.talla_kit}` : undefined,
          valor: precioKitInvitado,
        });
      }
    }
  }
  const sumaFilas = filasPago.reduce((acc, f) => acc + f.valor, 0);
  // Si el servidor no trajo ningún valor por concepto (todo en 0), no se inventan montos:
  // se listan los conceptos y solo se muestra el total realmente pagado.
  const hayMontos = sumaFilas > 0;
  const ajustePago = hayMontos ? Math.round((Number(insc.precio_pagado) || 0) - sumaFilas) : 0;
  const lineaPago = '1px solid color-mix(in srgb, currentColor 12%, transparent)';

  return (
    <div className="part-card part-detail-card part-detail-anim">
      <div
        className={`part-detail-hero${insc.evento?.imagen_url ? ' perfil-con-foto' : ''}`}
        style={insc.evento?.imagen_url ? ({ '--perfil-foto': `url(${insc.evento.imagen_url})` } as React.CSSProperties) : undefined}
      >
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
          {insc.categoria?.nombre && (
            <div className="part-detail-info-item">
              <span className="part-detail-icon"><i className="ti ti-trophy" aria-hidden="true" /></span>
              <div>
                <span className="part-label">Categoría</span>
                <strong>{insc.categoria.nombre}</strong>
                {insc.categoria.distancia && <span className="part-label"> {insc.categoria.distancia}</span>}
              </div>
            </div>
          )}
          {insc.numero_dorsal != null && (
            <div className="part-detail-info-item">
              <span className="part-detail-icon"><i className="ti ti-hash" aria-hidden="true" /></span>
              <div>
                <span className="part-label">Mi dorsal</span>
                <strong>{insc.numero_dorsal}</strong>
              </div>
            </div>
          )}
          {(insc.desea_kit || insc.talla_camiseta) && (
            <div className="part-detail-info-item">
              <span className="part-detail-icon"><i className="ti ti-shirt" aria-hidden="true" /></span>
              <div>
                <span className="part-label">Kit</span>
                <strong>
                  {insc.evento?.kit?.nombre || 'Kit de bienvenida'}
                  {insc.talla_camiseta ? ` · Talla ${insc.talla_camiseta}` : ''}
                </strong>
                {precioKit > 0 && <span className="part-label"> {fmtMoney(precioKit)}</span>}
                {entregaTitular && (
                  <div style={{ marginTop: '.35rem' }}>
                    <span className={`part-status-pill ${entregaTitular.cls}`}>{entregaTitular.txt}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        {res && (
          <>
            <h3 className="perfil-subtitulo"><i className="ti ti-trophy" aria-hidden="true" /> Mi resultado</h3>
            <div className="part-detail-info-grid">
              {res.tiempo_final && (
                <div className="part-detail-info-item">
                  <span className="part-detail-icon"><i className="ti ti-clock" aria-hidden="true" /></span>
                  <div>
                    <span className="part-label">Tiempo final</span>
                    <strong>{res.tiempo_final}</strong>
                  </div>
                </div>
              )}
              {res.posicion_general != null && (
                <div className="part-detail-info-item">
                  <span className="part-detail-icon"><i className="ti ti-medal" aria-hidden="true" /></span>
                  <div>
                    <span className="part-label">Posición general</span>
                    <strong>{res.posicion_general}.º</strong>
                  </div>
                </div>
              )}
              {res.posicion_categoria != null && (
                <div className="part-detail-info-item">
                  <span className="part-detail-icon"><i className="ti ti-trophy" aria-hidden="true" /></span>
                  <div>
                    <span className="part-label">Posición en {insc.categoria?.nombre || 'tu categoría'}</span>
                    <strong>{res.posicion_categoria}.º</strong>
                  </div>
                </div>
              )}
              <div className="part-detail-info-item">
                <span className="part-detail-icon"><i className="ti ti-shield-check" aria-hidden="true" /></span>
                <div>
                  <span className="part-label">Estado del resultado</span>
                  <strong>{estadoResultadoLabel(res.estado)}</strong>
                </div>
              </div>
              {res.premios.map((p, i) => (
                <div className="part-detail-info-item" key={`${p.posicion}-${i}`}>
                  <span className="part-detail-icon"><i className="ti ti-award" aria-hidden="true" /></span>
                  <div>
                    <span className="part-label">Premio · puesto {p.posicion}</span>
                    <strong>{p.nombre}</strong>
                    {p.valor != null && Number(p.valor) > 0 && <span className="part-label"> {fmtMoney(Number(p.valor))}</span>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {inv && (
          <>
            <h3 className="perfil-subtitulo"><i className="ti ti-user-plus" aria-hidden="true" /> Invitado</h3>
            <div className="part-detail-info-grid">
              <div className="part-detail-info-item">
                <span className="part-detail-icon"><i className="ti ti-user-plus" aria-hidden="true" /></span>
                <div>
                  <span className="part-label">Nombre</span>
                  <strong>{`${inv.nombre ?? ''} ${inv.apellido ?? ''}`.trim() || '—'}</strong>
                </div>
              </div>
              {inv.documento != null && inv.documento !== '' && (
                <div className="part-detail-info-item">
                  <span className="part-detail-icon"><i className="ti ti-id" aria-hidden="true" /></span>
                  <div>
                    <span className="part-label">Documento</span>
                    <strong>{inv.documento}</strong>
                  </div>
                </div>
              )}
              {inv.numero_dorsal != null && (
                <div className="part-detail-info-item">
                  <span className="part-detail-icon"><i className="ti ti-hash" aria-hidden="true" /></span>
                  <div>
                    <span className="part-label">Dorsal del invitado</span>
                    <strong>{inv.numero_dorsal}</strong>
                  </div>
                </div>
              )}
              <div className="part-detail-info-item">
                <span className="part-detail-icon"><i className="ti ti-shirt" aria-hidden="true" /></span>
                <div>
                  <span className="part-label">Kit del invitado</span>
                  <strong>{inv.desea_kit ? `Talla ${inv.talla_kit ?? '—'}` : 'Sin kit'}</strong>
                  {inv.desea_kit && precioKitInvitado > 0 && <span className="part-label"> {fmtMoney(precioKitInvitado)}</span>}
                  {inv.desea_kit && entregaInvitado && (
                    <div style={{ marginTop: '.35rem' }}>
                      <span className={`part-status-pill ${entregaInvitado.cls}`}>{entregaInvitado.txt}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
        {filasPago.length > 0 && (
          <>
            <h3 className="perfil-subtitulo"><i className="ti ti-receipt" aria-hidden="true" /> Detalle de lo que pagaste</h3>
            <div className="part-detail-info-item" style={{ display: 'block' }}>
              {filasPago.map((f) => (
                <div
                  key={f.concepto}
                  style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '.55rem 0', borderBottom: lineaPago }}
                >
                  <span>
                    {f.concepto}
                    {f.detalle && <span className="part-label"> · {f.detalle}</span>}
                  </span>
                  {hayMontos && <strong>{fmtMoney(f.valor)}</strong>}
                </div>
              ))}
              {ajustePago !== 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '.55rem 0', borderBottom: lineaPago }}>
                  <span>{ajustePago < 0 ? 'Descuento' : 'Otros cargos'}</span>
                  <strong>{ajustePago < 0 ? '-' : ''}{fmtMoney(Math.abs(ajustePago))}</strong>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '.75rem 0 .15rem', fontSize: '1.05rem' }}>
                <strong>Total</strong>
                <strong>{fmtMoney(insc.precio_pagado)}</strong>
              </div>
            </div>
          </>
        )}
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
                <i className="ti ti-qrcode" aria-hidden="true" /> {insc.qr?.codigo_kit ? 'Ver mis códigos QR' : 'Ver mi QR'}
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
          <PasesQr insc={insc} darkMode={darkMode} onCerrar={onCerrarQr} />,
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
  useBloquearScroll(verModal || confirmarEliminar);
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
    if (!validarFormularioDeportivo(e, (texto) => setDatosMsg({ tipo: 'error', texto, id: Date.now() }))) return;
    setDatosMsg(null);
    const errorFecha = validarFechaNacimiento(fechaNacimiento);
    if (errorFecha) {
      setDatosMsg({ tipo: 'error', texto: errorFecha, id: Date.now() });
      return;
    }
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
    if (!validarFormularioDeportivo(e, (texto) => setMsg({ tipo: 'error', texto, id: Date.now() }))) return;
    setMsg(null);
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
    if (!validarFormularioDeportivo(e, (texto) => setMsg({ tipo: 'error', texto, id: Date.now() }))) return;
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
              <FotoPerfilMenu
                className="part-profile-avatar-edit"
                fotoUrl={fotoUrl}
                nombre={user?.name}
                subiendo={subiendoFoto}
                onCambiar={handleFotoClick}
              />
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
              <form onSubmit={submitDatosPersonales} noValidate>
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
                  <input id="d-fecha-nac" type="date" min={minFechaNacimiento()} max={maxFechaNacimiento()} value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} />
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
                <form onSubmit={verificarActual} noValidate>
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

                  <button title={verificando ? 'Validando…' : 'Validar tu contraseña actual para cambiarla'} type="submit" className="btn btn-outline" disabled={verificando}>
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
              <form onSubmit={submitCambio} noValidate>
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