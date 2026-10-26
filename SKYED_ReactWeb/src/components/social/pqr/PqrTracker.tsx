import {
  Archive,
  CheckCircle2,
  Clock3,
  FileText,
  Lock,
  MessageSquareText,
  Search,
  Send,
  Wrench,
} from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import type { EstadoPqr, Pqr, PqrSeguimiento } from '../../../services/socialService';
import {
  ESTADO_COLOR,
  ESTADO_LABEL,
  FASES,
  fmtFechaHora,
  hace,
  plazoInfo,
  tituloEvento,
} from '../../../utils/pqr';
import '../../../styles/social/pqrTracking.css';

/**
 * Fases que se muestran al usuario: Radicada → En proceso → Resuelta.
 * "En revisión" y "Cerrada" ya no se usan; una PQR vieja en "En revisión"
 * se muestra como "En proceso" y una "Cerrada" como "Resuelta".
 */
export const FASES_VISIBLES = FASES.filter((f) => f.key !== 'en_revision' && f.key !== 'cerrado');

export const indiceFaseVisible = (estado: EstadoPqr) => {
  const efectivo =
    estado === 'en_revision' ? 'en_proceso' : estado === 'cerrado' ? 'resuelto' : estado;
  const i = FASES_VISIBLES.findIndex((f) => f.key === efectivo);
  return i < 0 ? 0 : i;
};

const colorVar = (estado: EstadoPqr) => ({ '--fase': ESTADO_COLOR[estado] }) as CSSProperties;

const ICONO_FASE: Record<EstadoPqr, ReactNode> = {
  abierto: <FileText size={15} />,
  en_revision: <Search size={15} />,
  en_proceso: <Wrench size={15} />,
  resuelto: <CheckCircle2 size={15} />,
  cerrado: <Archive size={15} />,
};

/** Etiqueta con el color de la fase. */
export function PqrEstadoPill({ estado }: { estado: EstadoPqr }) {
  return (
    <span className="pqrx-pill" style={colorVar(estado)}>
      <i aria-hidden="true" />
      {ESTADO_LABEL[estado] ?? estado}
    </span>
  );
}

/** "Vence mañana" / "Vencida hace 2 días". No muestra nada si no aplica. */
export function PqrPlazoChip({ pqr }: { pqr: Pick<Pqr, 'estado_pqr' | 'fecha_limite' | 'vencida'> }) {
  const plazo = plazoInfo(pqr);
  if (!plazo) return null;
  return (
    <span className={`pqrx-plazo ${plazo.tono}`}>
      <Clock3 size={13} aria-hidden="true" />
      {plazo.texto}
    </span>
  );
}

/**
 * Ruta de la PQR: una línea continua con una parada por fase.
 * Las fases ya recorridas quedan llenas, la actual late suavemente.
 */
export function PqrStepper({ estado }: { estado: EstadoPqr }) {
  const actual = indiceFaseVisible(estado);
  const avance = (actual / (FASES_VISIBLES.length - 1)) * 100;

  return (
    <ol
      className="pqrx-stepper"
      aria-label={`Fase actual: ${ESTADO_LABEL[estado]}`}
      style={{ '--avance': `${avance}%` } as CSSProperties}
    >
      {FASES_VISIBLES.map((fase, i) => {
        const clase = i < actual ? 'done' : i === actual ? 'current' : 'todo';
        return (
          <li key={fase.key} className={`pqrx-stop ${clase}`} style={colorVar(fase.key)}>
            <span className="pqrx-stop-dot">
              {i < actual ? <CheckCircle2 size={15} /> : ICONO_FASE[fase.key]}
            </span>
            <span className="pqrx-stop-label">{fase.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function iconoEvento(ev: PqrSeguimiento) {
  switch (ev.tipo_evento) {
    case 'nota_interna':
      return <Lock size={14} />;
    case 'comentario':
      return <MessageSquareText size={14} />;
    case 'respuesta':
      return <Send size={14} />;
    default:
      return ICONO_FASE[ev.estado_nuevo] ?? <FileText size={14} />;
  }
}

/**
 * Historial de la PQR, lo más reciente arriba.
 * `admin` muestra las notas internas y el nombre de quien actuó.
 */
export function PqrTimeline({
  seguimientos,
  admin = false,
}: {
  seguimientos: PqrSeguimiento[];
  admin?: boolean;
}) {
  if (!seguimientos.length) {
    return <p className="pqrx-empty">Todavía no hay movimientos registrados.</p>;
  }

  const eventos = [...seguimientos].reverse();

  return (
    <ol className="pqrx-timeline">
      {eventos.map((ev, i) => {
        const cambioFase = ev.estado_anterior && ev.estado_anterior !== ev.estado_nuevo;
        const esNota = ev.tipo_evento === 'nota_interna';
        return (
          <li
            key={ev.id_seguimiento}
            className={`pqrx-event${i === 0 ? ' latest' : ''}${esNota ? ' note' : ''}`}
            style={colorVar(ev.estado_nuevo)}
          >
            <span className="pqrx-event-dot" aria-hidden="true">
              {iconoEvento(ev)}
            </span>
            <div className="pqrx-event-body">
              <div className="pqrx-event-head">
                <strong>{tituloEvento(ev)}</strong>
                {cambioFase && ev.tipo_evento !== 'cambio_estado' && (
                  <span className="pqrx-event-move">pasó a {ESTADO_LABEL[ev.estado_nuevo]}</span>
                )}
                {cambioFase && ev.tipo_evento === 'cambio_estado' && ev.estado_anterior && (
                  <span className="pqrx-event-move">
                    antes: {ESTADO_LABEL[ev.estado_anterior]}
                  </span>
                )}
              </div>
              <time dateTime={ev.created_at} title={fmtFechaHora(ev.created_at)}>
                {hace(ev.created_at)} · {fmtFechaHora(ev.created_at)}
                {admin && ev.autor ? ` · ${ev.autor}` : ''}
              </time>

              {ev.comentario_publico && (
                <p className={`pqrx-bubble${ev.tipo_evento === 'respuesta' ? ' answer' : ''}`}>
                  {ev.comentario_publico}
                </p>
              )}

              {admin && ev.nota_interna && (
                <p className="pqrx-internal">
                  <Lock size={13} aria-hidden="true" />
                  <span>
                    <b>Nota interna</b> — solo la ve el equipo
                    <br />
                    {ev.nota_interna}
                  </span>
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}