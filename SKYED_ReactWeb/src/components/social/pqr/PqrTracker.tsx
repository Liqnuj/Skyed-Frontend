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
  esFinal,
  fmtFechaHora,
  hace,
  indiceFase,
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
  // "Cerrada" solo aparece como paso cuando el caso realmente se cerró.
  const fases = estado === 'cerrado' ? FASES : FASES.filter((f) => f.key !== 'cerrado');
  const actual = indiceFase(estado);
  const avance = (actual / (fases.length - 1)) * 100;

  return (
    <ol
      className="pqrx-stepper"
      aria-label={`Fase actual: ${ESTADO_LABEL[estado]}`}
      style={{ '--avance': `${avance}%`, '--pasos': fases.length } as CSSProperties}
    >
      {fases.map((fase, i) => {
        // La última fase alcanzada de un caso terminado se ve como completada.
        const completada = i < actual || (i === actual && esFinal(estado));
        const clase = completada ? 'done' : i === actual ? 'current' : 'todo';
        return (
          <li key={fase.key} className={`pqrx-stop ${clase}`} style={colorVar(fase.key)}>
            <span className="pqrx-stop-dot">
              {completada ? <CheckCircle2 size={15} /> : ICONO_FASE[fase.key]}
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
 * ¿Este paso es parte del historial de estados? (radicación y cambios de fase).
 * Los mensajes del chat (lo que escribe el usuario o el equipo) no lo son.
 */
const esPasoDeEstado = (ev: PqrSeguimiento) =>
  ev.tipo_evento === 'radicacion' ||
  ev.tipo_evento === 'migracion' ||
  (ev.tipo_evento !== 'respuesta_cliente' &&
    ev.tipo_evento !== 'nota_interna' &&
    !!ev.estado_anterior &&
    ev.estado_anterior !== ev.estado_nuevo);

/**
 * Historial de la PQR, lo más reciente arriba.
 * `admin` muestra las notas internas y el nombre de quien actuó.
 * `soloEstados` (vista del usuario) deja únicamente la radicación y los
 * cambios de fase; los mensajes y la respuesta oficial viven en el chat.
 */
export function PqrTimeline({
  seguimientos,
  admin = false,
  soloEstados = false,
}: {
  seguimientos: PqrSeguimiento[];
  admin?: boolean;
  soloEstados?: boolean;
}) {
  const lista = soloEstados ? seguimientos.filter(esPasoDeEstado) : seguimientos;

  if (!lista.length) {
    return <p className="pqrx-empty">Todavía no hay movimientos registrados.</p>;
  }

  const eventos = [...lista].reverse();

  return (
    <ol className="pqrx-timeline">
      {eventos.map((ev, i) => {
        const cambioFase = ev.estado_anterior && ev.estado_anterior !== ev.estado_nuevo;
        const esNota = ev.tipo_evento === 'nota_interna';
        // La respuesta oficial se lee en el chat: aquí solo queda el paso de fase.
        const respuestaEnChat = soloEstados && ev.tipo_evento === 'respuesta';
        const titulo = respuestaEnChat
          ? `Pasó a «${ESTADO_LABEL[ev.estado_nuevo] ?? ev.estado_nuevo}»`
          : tituloEvento(ev);
        const muestraAntes = ev.tipo_evento === 'cambio_estado' || respuestaEnChat;
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
                <strong>{titulo}</strong>
                {cambioFase && !muestraAntes && (
                  <span className="pqrx-event-move">pasó a {ESTADO_LABEL[ev.estado_nuevo]}</span>
                )}
                {cambioFase && muestraAntes && ev.estado_anterior && (
                  <span className="pqrx-event-move">
                    antes: {ESTADO_LABEL[ev.estado_anterior]}
                  </span>
                )}
              </div>
              <time dateTime={ev.created_at} title={fmtFechaHora(ev.created_at)}>
                {hace(ev.created_at)} · {fmtFechaHora(ev.created_at)}
                {admin && ev.autor ? ` · ${ev.autor}` : ''}
              </time>

              {ev.comentario_publico && !respuestaEnChat && (
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