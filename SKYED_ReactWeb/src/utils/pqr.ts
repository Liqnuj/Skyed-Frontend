import type { EstadoPqr, Pqr, PqrSeguimiento, TipoPqr } from '../services/socialService';

/** Fases en el orden en que avanza una PQR. */
export const FASES: { key: EstadoPqr; label: string; corto: string }[] = [
  { key: 'abierto', label: 'Radicada', corto: 'Radicada' },
  { key: 'en_revision', label: 'En revisión', corto: 'Revisión' },
  { key: 'en_proceso', label: 'En proceso', corto: 'Proceso' },
  { key: 'resuelto', label: 'Resuelta', corto: 'Resuelta' },
  { key: 'cerrado', label: 'Cerrada', corto: 'Cerrada' },
];

export const ESTADO_LABEL: Record<EstadoPqr, string> = Object.fromEntries(
  FASES.map((f) => [f.key, f.label]),
) as Record<EstadoPqr, string>;

export const ESTADO_COLOR: Record<EstadoPqr, string> = {
  abierto: '#64748b',
  en_revision: '#2563eb',
  en_proceso: '#d97706',
  resuelto: '#16a34a',
  cerrado: '#475569',
};

export const TIPO_LABEL: Record<TipoPqr, string> = {
  peticion: 'Petición',
  queja: 'Queja',
  reclamo: 'Reclamo',
  sugerencia: 'Sugerencia',
  felicitacion: 'Felicitación',
};

export const indiceFase = (estado: EstadoPqr) =>
  Math.max(0, FASES.findIndex((f) => f.key === estado));

export const esFinal = (estado: EstadoPqr) => estado === 'resuelto' || estado === 'cerrado';

const fechaHora = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});
const soloFecha = new Intl.DateTimeFormat('es-CO', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
});

export function fmtFechaHora(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : fechaHora.format(d);
}

export function fmtDia(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : soloFecha.format(d);
}

const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

/** "hace 5 minutos", "ayer", "hace 3 días"… */
export function hace(iso: string | null | undefined): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const seg = Math.round((t - Date.now()) / 1000);
  const abs = Math.abs(seg);
  if (abs < 45) return 'hace un momento';
  if (abs < 3600) return rtf.format(Math.round(seg / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(seg / 3600), 'hour');
  if (abs < 86400 * 30) return rtf.format(Math.round(seg / 86400), 'day');
  return fmtFechaHora(iso);
}

export type Plazo = { texto: string; tono: 'ok' | 'pronto' | 'vencida' | 'neutro' };

/** Estado del plazo de respuesta, listo para mostrar en una etiqueta. */
export function plazoInfo(pqr: Pick<Pqr, 'estado_pqr' | 'fecha_limite' | 'vencida'>): Plazo | null {
  if (!pqr.fecha_limite) return null;
  if (esFinal(pqr.estado_pqr)) return null;

  const limite = new Date(pqr.fecha_limite);
  if (Number.isNaN(limite.getTime())) return null;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const finLimite = new Date(limite);
  finLimite.setHours(0, 0, 0, 0);
  const dias = Math.round((finLimite.getTime() - hoy.getTime()) / 86400000);

  if (pqr.vencida || dias < 0) {
    const atraso = Math.max(1, Math.abs(dias));
    return { texto: `Vencida hace ${atraso} ${atraso === 1 ? 'día' : 'días'}`, tono: 'vencida' };
  }
  if (dias === 0) return { texto: 'Vence hoy', tono: 'pronto' };
  if (dias === 1) return { texto: 'Vence mañana', tono: 'pronto' };
  return { texto: `Vence ${fmtDia(pqr.fecha_limite)}`, tono: 'ok' };
}

/** Título legible de un paso del seguimiento. */
export function tituloEvento(ev: PqrSeguimiento): string {
  switch (ev.tipo_evento) {
    case 'radicacion':
      return 'Solicitud radicada';
    case 'migracion':
      return 'Seguimiento habilitado';
    case 'cambio_estado':
      return `Pasó a «${ESTADO_LABEL[ev.estado_nuevo] ?? ev.estado_nuevo}»`;
    case 'respuesta':
      return 'Respuesta del equipo';
    case 'comentario':
      return 'Mensaje del equipo';
    case 'nota_interna':
      return 'Nota interna';
    default:
      return 'Actualización';
  }
}

/** Texto sugerido para el mensaje al usuario según la fase elegida. */
export const SUGERENCIA_MENSAJE: Partial<Record<EstadoPqr, string>> = {
  en_revision: 'Estamos revisando tu solicitud con el área encargada. Te avisaremos cuando tengamos novedades.',
  en_proceso: 'Ya estamos trabajando en tu solicitud. Te mantendremos informado de cada avance.',
  resuelto: 'Gracias por escribirnos. Revisamos tu caso y esta es nuestra respuesta: ',
  cerrado: 'Damos por cerrada tu solicitud. Si necesitas algo más, puedes radicar una nueva PQR.',
};