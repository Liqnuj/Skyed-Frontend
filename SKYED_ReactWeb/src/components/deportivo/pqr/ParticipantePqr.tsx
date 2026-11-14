import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useBloquearScroll } from '../../../hooks/useBloquearScroll';
import { pqrService } from '../../../services/socialService';
import type { Pqr, PqrSeguimiento, TipoPqr } from '../../../services/socialService';
import { PqrEstadoPill, PqrPlazoChip, PqrStepper, PqrTimeline } from '../../social/pqr/PqrTracker';
import { ESTADO_COLOR, TIPO_LABEL, esFinal, fmtFechaHora } from '../../../utils/pqr';
import '../../../styles/deportivo/pqrDeportivo.css';

const TIPOS = Object.keys(TIPO_LABEL) as TipoPqr[];

interface Msg { key: string; de: 'yo' | 'equipo'; texto: string; fecha: string | null; oficial?: boolean }

/** Chat: lo que escribe el usuario y lo que responde el equipo. Los cambios de fase van al historial. */
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

export default function ParticipantePqr() {
  const [lista, setLista] = useState<Pqr[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [nueva, setNueva] = useState(false);
  const [abierta, setAbierta] = useState<Pqr | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const r = await pqrService.misPqr(1, 'deportivo');
      setLista(r.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar tus PQR.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  const abrir = async (id: number) => {
    try {
      setAbierta(await pqrService.obtener(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo abrir la PQR.');
    }
  };

  return (
    <div className="dpq">
      <div className="dpq-top">
        <div>
          <h3>Mis PQR</h3>
          <p>Peticiones, quejas, reclamos y sugerencias sobre tus eventos, pagos o kits.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setNueva(true)}>
          + Nueva PQR
        </button>
      </div>

      {error && (
        <p className="dpq-error">
          {error} <button type="button" onClick={() => void cargar()}>Reintentar</button>
        </p>
      )}
      {cargando && <p className="dpq-muted">Cargando…</p>}
      {!cargando && !error && lista.length === 0 && (
        <p className="dpq-muted">Aún no has radicado ninguna solicitud.</p>
      )}

      <ul className="dpq-list">
        {lista.map((p) => (
          <li key={p.id_pqr}>
            <button type="button" className="dpq-item" onClick={() => void abrir(p.id_pqr)}>
              <span className="dpq-item-main">
                <small>{p.radicado} · {TIPO_LABEL[p.tipo_pqr]}</small>
                <strong>{p.asunto_pqr}</strong>
                <em>{fmtFechaHora(p.creado_en_pqr)}</em>
              </span>
              <span className="pqrx"><PqrEstadoPill estado={p.estado_pqr} /></span>
            </button>
          </li>
        ))}
      </ul>

      {nueva && (
        <NuevaPqr
          onClose={() => setNueva(false)}
          onCreada={async (p) => { setNueva(false); await cargar(); setAbierta(p); }}
        />
      )}
      {abierta && (
        <DetallePqr
          pqr={abierta}
          onClose={() => setAbierta(null)}
          onCambio={(p) => { setAbierta(p); void cargar(); }}
        />
      )}
    </div>
  );
}

function NuevaPqr({ onClose, onCreada }: { onClose: () => void; onCreada: (p: Pqr) => void | Promise<void> }) {
  useBloquearScroll(true);
  const [tipo, setTipo] = useState<TipoPqr>('peticion');
  const [asunto, setAsunto] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!asunto.trim() || !mensaje.trim()) {
      setError('Completa el asunto y la descripción.');
      return;
    }
    setEnviando(true);
    setError('');
    try {
      const p = await pqrService.crear({
        tipo_pqr: tipo,
        asunto_pqr: asunto.trim(),
        mensaje_pqr: mensaje.trim(),
        contexto: 'deportivo',
      });
      await onCreada(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo radicar la solicitud.');
      setEnviando(false);
    }
  };

  return (
    <div className="dpq-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="dpq-modal" onSubmit={enviar} role="dialog" aria-modal="true" aria-label="Nueva PQR">
        <header className="dpq-head">
          <h3>Nueva solicitud</h3>
          <button type="button" className="dpq-x" onClick={onClose} aria-label="Cerrar">×</button>
        </header>
        <div className="dpq-body">
          <label>Tipo
            <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoPqr)}>
              {TIPOS.map((t) => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
            </select>
          </label>
          <label>Asunto
            <input value={asunto} maxLength={150} onChange={(e) => setAsunto(e.target.value)} placeholder="Ej. No me llegó mi QR" />
          </label>
          <label>Descripción
            <textarea value={mensaje} maxLength={1000} rows={5} onChange={(e) => setMensaje(e.target.value)} placeholder="Cuéntanos qué pasó…" />
            <small>{mensaje.length}/1000</small>
          </label>
          {error && <p className="dpq-error">{error}</p>}
        </div>
        <footer className="dpq-foot">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={enviando}>
            {enviando ? 'Enviando…' : 'Radicar solicitud'}
          </button>
        </footer>
      </form>
    </div>
  );
}

function DetallePqr({ pqr, onClose, onCambio }: { pqr: Pqr; onClose: () => void; onCambio: (p: Pqr) => void }) {
  useBloquearScroll(true);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const chat = useMemo(() => conversacion(pqr), [pqr]);
  // Solo una PQR cerrada deja de recibir mensajes: el usuario puede escribir hasta que él la cierre.
  const final = pqr.estado_pqr === 'cerrado';

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  const [confirmandoCierre, setConfirmandoCierre] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  // El usuario decide cuándo su caso quedó resuelto: cierra la PQR.
  const cerrarComoResuelta = async () => {
    setCerrando(true);
    setError('');
    try {
      await pqrService.conforme(pqr.id_pqr);
      setConfirmandoCierre(false);
      onCambio(await pqrService.obtener(pqr.id_pqr));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cerrar la solicitud.');
    } finally {
      setCerrando(false);
    }
  };

  const responder = async (e: FormEvent) => {
    e.preventDefault();
    const m = texto.trim();
    if (!m || enviando) return;
    setEnviando(true);
    setError('');
    try {
      await pqrService.responder(pqr.id_pqr, m);
      setTexto('');
      onCambio(await pqrService.obtener(pqr.id_pqr)); // refresca chat e historial
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el mensaje.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="dpq-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dpq-modal" role="dialog" aria-modal="true" aria-label={pqr.asunto_pqr}>
        <header className="dpq-head">
          <div>
            <small>{pqr.radicado} · {TIPO_LABEL[pqr.tipo_pqr]}</small>
            <h3>{pqr.asunto_pqr}</h3>
          </div>
          <button type="button" className="dpq-x" onClick={onClose} aria-label="Cerrar">×</button>
        </header>

        <div className="dpq-body">
          <section className="pqrx dpq-status" style={{ '--fase': ESTADO_COLOR[pqr.estado_pqr] } as CSSProperties}>
            <div className="dpq-status-top">
              <PqrEstadoPill estado={pqr.estado_pqr} />
              <PqrPlazoChip pqr={pqr} />
            </div>
            <PqrStepper estado={pqr.estado_pqr} />
          </section>

          <h4 className="dpq-sec">Historial</h4>
          <div className="pqrx"><PqrTimeline seguimientos={pqr.seguimientos ?? []} soloEstados /></div>

          <h4 className="dpq-sec">Conversación</h4>
          <div className="dpq-chat">
            {chat.map((m) => (
              <div key={m.key} className={`dpq-msg ${m.de}${m.oficial ? ' oficial' : ''}`}>
                <b>{m.de === 'yo' ? 'Tú' : m.oficial ? 'Respuesta oficial' : 'Equipo SKYED'}</b>
                <p>{m.texto}</p>
                <time>{fmtFechaHora(m.fecha)}</time>
              </div>
            ))}
          </div>
        </div>

        {final ? (
          <footer className="dpq-closed">Esta solicitud ya está cerrada. Si necesitas algo más, radica una nueva PQR.</footer>
        ) : (
          <form className="dpq-reply" onSubmit={responder}>
            <textarea value={texto} maxLength={1000} rows={2} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe un mensaje al equipo…" />
            <button type="submit" className="btn btn-primary" disabled={!texto.trim() || enviando}>
              {enviando ? '…' : 'Enviar'}
            </button>
            {error && <p className="dpq-error">{error}</p>}
            <div className="dpq-conforme">
              {!confirmandoCierre ? (
                <>
                  <span>{pqr.estado_pqr === 'resuelto' ? '¿Quedó solucionado tu caso?' : '¿Ya se solucionó tu caso?'}</span>
                  <button type="button" className="dpq-conforme-btn" onClick={() => setConfirmandoCierre(true)} disabled={cerrando}>
                    <i className="ti ti-circle-check" aria-hidden="true" /> Mi solicitud quedó resuelta
                  </button>
                </>
              ) : (
                <>
                  <span>Se cerrará y ya no podrás escribir en ella. ¿Confirmas?</span>
                  <span className="dpq-conforme-acciones">
                    <button type="button" className="dpq-conforme-no" onClick={() => setConfirmandoCierre(false)} disabled={cerrando}>Cancelar</button>
                    <button type="button" className="dpq-conforme-btn" onClick={cerrarComoResuelta} disabled={cerrando}>
                      {cerrando ? 'Cerrando…' : 'Sí, quedó resuelta'}
                    </button>
                  </span>
                </>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}