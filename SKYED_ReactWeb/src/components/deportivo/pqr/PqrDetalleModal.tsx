import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useBloquearScroll } from '../../../hooks/useBloquearScroll';
import { pqrService } from '../../../services/socialService';
import type { EstadoPqr, Pqr, PqrSeguimiento } from '../../../services/socialService';
import { PqrEstadoPill, PqrPlazoChip, PqrStepper, PqrTimeline } from '../../social/pqr/PqrTracker';
import { ESTADO_COLOR, esFinal, fmtFechaHora } from '../../../utils/pqr';
import { TIPOS_META } from './pqrMeta';
import '../../../styles/deportivo/pqrDeportivoPagina.css';

interface Msg {
  key: string;
  de: 'yo' | 'equipo';
  texto: string;
  fecha: string | null;
  oficial?: boolean;
}

/** Chat: lo que escribe el participante y lo que responde el equipo. Los cambios de fase van al historial. */
function conversacion(p: Pqr): Msg[] {
  const msgs: Msg[] = [{ key: 'inicio', de: 'yo', texto: p.mensaje_pqr, fecha: p.creado_en_pqr }];
  (p.seguimientos ?? []).forEach((s: PqrSeguimiento) => {
    const texto = (s.comentario_publico ?? '').trim();
    const tipo = s.tipo_evento as string;
    if (tipo === 'respuesta_cliente' && texto) {
      msgs.push({ key: `s${s.id_seguimiento}`, de: 'yo', texto, fecha: s.created_at });
    } else if (['respuesta', 'comentario', 'solicitud_informacion'].includes(tipo)) {
      msgs.push({
        key: `s${s.id_seguimiento}`,
        de: 'equipo',
        texto: texto || p.respuesta_pqr || 'El equipo respondió tu solicitud.',
        fecha: s.created_at,
        oficial: tipo === 'respuesta',
      });
    }
  });
  return msgs;
}

const TEXTO_ESTADO: Record<EstadoPqr, string> = {
  abierto: 'Recibimos tu solicitud. Pronto una persona del equipo la revisará.',
  en_revision: 'Una persona del equipo está revisando tu solicitud.',
  en_proceso: 'Estamos gestionando tu solicitud. Te avisaremos cuando haya respuesta.',
  resuelto: 'Tu solicitud fue resuelta. Revisa la respuesta oficial en la conversación.',
  cerrado: 'Esta solicitud fue cerrada.',
};

interface Props {
  pqr: Pqr;
  onClose: () => void;
  /** Se llama con la PQR actualizada (tras enviar un mensaje). */
  onCambio: (p: Pqr) => void;
}

export default function PqrDetalleModal({ pqr, onClose, onCambio }: Props) {
  useBloquearScroll(true);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const bajarRef = useRef(false);

  const meta = TIPOS_META[pqr.tipo_pqr];
  const chat = useMemo(() => conversacion(pqr), [pqr]);
  const final = esFinal(pqr.estado_pqr);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', tecla);
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', tecla);
      document.body.style.overflow = anterior;
    };
  }, [onClose]);

  // Al abrir se ve el estado arriba; solo al enviar se baja al final del chat.
  useEffect(() => {
    if (!bajarRef.current) return;
    bajarRef.current = false;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [chat.length]);

  const responder = async (e: FormEvent) => {
    e.preventDefault();
    const mensaje = texto.trim();
    if (!mensaje || enviando) return;
    setEnviando(true);
    setError('');
    try {
      await pqrService.responder(pqr.id_pqr, mensaje);
      bajarRef.current = true;
      setTexto('');
      onCambio(await pqrService.obtener(pqr.id_pqr));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el mensaje.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      className="pqd-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pqd-modal" role="dialog" aria-modal="true" aria-label={pqr.asunto_pqr}>
        <header className="pqd-modal-head">
          <span className="pqd-modal-ico">
            <i className={`ti ${meta.icono}`} aria-hidden="true" />
          </span>
          <div className="pqd-modal-title">
            <p className="pqd-kicker">
              {pqr.radicado} · {meta.nombre}
            </p>
            <h3>{pqr.asunto_pqr}</h3>
            <p className="pqd-date">Enviada el {fmtFechaHora(pqr.creado_en_pqr)}</p>
          </div>
          <button type="button" className="pqd-x" onClick={onClose} aria-label="Cerrar">
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </header>

        <div className="pqd-scroll" ref={scrollRef}>
          <section
            className="pqrx pqd-status"
            style={{ '--fase': ESTADO_COLOR[pqr.estado_pqr] } as CSSProperties}
          >
            <div className="pqd-status-top">
              <PqrEstadoPill estado={pqr.estado_pqr} />
              <PqrPlazoChip pqr={pqr} />
            </div>
            <p className="pqd-status-text">{TEXTO_ESTADO[pqr.estado_pqr]}</p>
            <PqrStepper estado={pqr.estado_pqr} />
          </section>

          <h4 className="pqd-sec">Historial de estados</h4>
          <div className="pqrx pqd-history">
            <PqrTimeline seguimientos={pqr.seguimientos ?? []} soloEstados />
          </div>

          <h4 className="pqd-sec">Conversación</h4>
          <div className="pqd-chat">
            {chat.map((m) => (
              <div key={m.key} className={`pqd-msg ${m.de}${m.oficial ? ' oficial' : ''}`}>
                <span className="pqd-avatar" aria-hidden="true">
                  {m.de === 'yo' ? 'TÚ' : 'SK'}
                </span>
                <div className="pqd-bubble">
                  <div className="pqd-who">
                    <b>{m.de === 'yo' ? 'Tú' : 'Equipo SKYED Deportivo'}</b>
                    {m.oficial && (
                      <span className="pqd-badge">
                        <i className="ti ti-circle-check" aria-hidden="true" /> Respuesta oficial
                      </span>
                    )}
                    <time>{fmtFechaHora(m.fecha)}</time>
                  </div>
                  <p>{m.texto}</p>
                </div>
              </div>
            ))}
            {!chat.some((m) => m.de === 'equipo') && !final && (
              <p className="pqd-wait">
                <i className="ti ti-clock" aria-hidden="true" /> Aún no hay respuesta del equipo. Te avisaremos en
                tus notificaciones.
              </p>
            )}
          </div>
        </div>

        {final ? (
          <footer className="pqd-closed">
            <i className="ti ti-circle-check" aria-hidden="true" />
            <span>Esta solicitud ya fue resuelta. Si necesitas algo más, radica una nueva.</span>
          </footer>
        ) : (
          <form className="pqd-composer" onSubmit={responder}>
            <div className="pqd-composer-box">
              <textarea
                value={texto}
                maxLength={1000}
                rows={2}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Escribe un mensaje al equipo…"
                aria-label="Mensaje para el equipo"
              />
              <button type="submit" className="pqd-send" disabled={!texto.trim() || enviando} aria-label="Enviar mensaje">
                <i className={`ti ${enviando ? 'ti-loader-2 pqd-spin' : 'ti-send'}`} aria-hidden="true" />
              </button>
            </div>
            {error && <p className="pqd-alert">{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
}