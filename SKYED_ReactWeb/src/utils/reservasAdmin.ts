import type {
  EstadoRese,
  EstadoVisualReserva,
  EtapaGestion,
  FechaTipoReserva,
} from '../services/socialService';

/** Textos del estado visual que calcula el backend. */
export const ESTADO_VISUAL_LABEL: Record<EstadoVisualReserva, string> = {
  nueva: 'Nueva',
  en_planificacion: 'En planificación',
  confirmada: 'Confirmada',
  reprogramada: 'Reprogramada',
  cancelada: 'Cancelada',
  finalizada: 'Finalizada',
};

/** Color de cada estado visual (misma paleta de los badges del panel). */
export const ESTADO_VISUAL_COLOR: Record<EstadoVisualReserva, string> = {
  nueva: '#2563eb',
  en_planificacion: '#d97706',
  confirmada: '#16a34a',
  reprogramada: '#0d9488',
  cancelada: '#e11d48',
  finalizada: '#7c4dcc',
};

export const ETAPA_LABEL: Record<EtapaGestion, string> = {
  nueva: 'Nueva',
  en_revision: 'En revisión',
  contactando_usuario: 'Contactando usuario',
  pendiente_informacion: 'Pendiente de información',
  en_planificacion: 'En planificación',
  pendiente_confirmacion: 'Pendiente de confirmación',
  reprogramada: 'Reprogramada',
  en_ejecucion: 'En ejecución',
};

export const ESTADO_RESE_LABEL: Record<EstadoRese, string> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  cancelada: 'Cancelada',
  completada: 'Completada',
};

/** Etiqueta para distinguir fecha aproximada, propuesta y confirmada. */
export const FECHA_TIPO_LABEL: Record<FechaTipoReserva, string> = {
  confirmada: 'Confirmada',
  propuesta: 'Propuesta',
  solicitada: 'Solicitada por el cliente',
};

/** Mismas transiciones que valida el backend (ReservaFlujo::TRANSICIONES_ESTADO). */
export const SIGUIENTES_ESTADOS: Record<EstadoRese, Array<'confirmada' | 'completada' | 'cancelada'>> = {
  pendiente: ['confirmada', 'cancelada'],
  confirmada: ['completada', 'cancelada'],
  completada: [],
  cancelada: [],
};

/** Y-m-d de una fecha local (sin pasar por UTC, para no correr el día). */
export function aYmd(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** "2026-11-05" → "05 nov 2026" (con mediodía local para no cambiar de día). */
export function fechaCorta(valor?: string | null): string {
  if (!valor) return '—';
  const d = new Date(`${valor.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return valor;
  return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
    .format(d)
    .replace('.', '');
}