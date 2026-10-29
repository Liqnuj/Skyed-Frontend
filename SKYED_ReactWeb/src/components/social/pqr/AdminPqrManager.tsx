import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, ChevronRight, Loader2, Lock, Play, Send, X } from 'lucide-react';
import { pqrService } from '../../../services/socialService';
import type { EstadoPqr, Pqr, TipoPqr } from '../../../services/socialService';
import {
  ESTADO_COLOR,
  FASES,
  TIPO_LABEL,
  esFinal,
  fmtFechaHora,
  hace,
} from '../../../utils/pqr';
import { PqrEstadoPill, PqrPlazoChip, PqrStepper, PqrTimeline } from './PqrTracker';


type Filtro = EstadoPqr | 'todas' | 'vencidas';

interface Props {
  pqrs: Pqr[];
  /** Conteo por fase de todas las PQR (viene del backend). */
  resumen: Partial<Record<EstadoPqr, number>>;
  total: number;
  search: string;
  /** Vuelve a cargar la lista del panel después de un cambio. */
  onChanged: () => Promise<void> | void;
  notify: (mensaje: string) => void;
}

const color = (estado: EstadoPqr) => ({ '--fase': ESTADO_COLOR[estado] }) as CSSProperties;

const iniciales = (nombre?: string, apellido?: string) =>
  `${nombre?.[0] ?? ''}${apellido?.[0] ?? ''}`.toUpperCase() || 'U';

const nombreCompleto = (p: Pqr) =>
  `${p.usuario?.nombre_u ?? ''} ${p.usuario?.apellido_u ?? ''}`.trim() || 'Usuario';

export default function AdminPqrManager({ pqrs, resumen, total, search, onChanged, notify }: Props) {
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [tipo, setTipo] = useState<TipoPqr | ''>('');
  const [abierta, setAbierta] = useState<number | null>(null);

  const vencidas = useMemo(() => pqrs.filter((p) => p.vencida).length, [pqrs]);

  const conteo = (f: Filtro): number => {
    if (f === 'todas') return total || pqrs.length;
    if (f === 'vencidas') return vencidas;
    return resumen[f] ?? pqrs.filter((p) => p.estado_pqr === f).length;
  };

  const visibles = useMemo(() => {
    const q = search.trim().toLowerCase();
    const lista = pqrs.filter((p) => {
      if (filtro === 'vencidas' && !p.vencida) return false;
      if (filtro !== 'todas' && filtro !== 'vencidas' && p.estado_pqr !== filtro) return false;
      if (tipo && p.tipo_pqr !== tipo) return false;
      if (!q) return true;
      return `${p.radicado} ${p.asunto_pqr} ${TIPO_LABEL[p.tipo_pqr]} ${nombreCompleto(p)} ${p.usuario?.correo_u ?? ''}`
        .toLowerCase()
        .includes(q);
    });
    // Primero lo que corre contra el reloj, luego lo demás; las terminadas al final.
    const peso = (p: Pqr) => (esFinal(p.estado_pqr) ? 2 : p.vencida ? 0 : 1);
    return [...lista].sort((a, b) => peso(a) - peso(b));
  }, [pqrs, filtro, tipo, search]);

  const tarjetas: { key: Filtro; label: string; estado: EstadoPqr; alerta?: boolean }[] = [
    { key: 'todas', label: 'Todas', estado: 'abierto' },
    ...FASES.map((f) => ({ key: f.key as Filtro, label: f.label, estado: f.key })),
    { key: 'vencidas', label: 'Vencidas', estado: 'abierto', alerta: true },
  ];

  return (
    <section className="section-view pqrx">
      <div className="section-header">
        <div>
          <span className="card-kicker">GESTIÓN</span>
          <h2>Gestión de PQRS</h2>
        </div>
      </div>

      <div className="pqrx-summary" role="group" aria-label="Filtrar por fase">
        {tarjetas.map((t) => (
          <button title={`Filtrar PQR: ${t.label}`}
            key={t.key}
            type="button"
            className={`pqrx-filter${filtro === t.key ? ' active' : ''}${t.alerta ? ' alert' : ''}`}
            style={t.alerta ? undefined : color(t.estado)}
            onClick={() => setFiltro(t.key)}
            aria-pressed={filtro === t.key}
          >
            <strong>{conteo(t.key)}</strong>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="pqrx-toolbar">
        <label>
          Tipo{' '}
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoPqr | '')}>
            <option value="">Todos</option>
            {(Object.keys(TIPO_LABEL) as TipoPqr[]).map((t) => (
              <option key={t} value={t}>
                {TIPO_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
        <span className="pqrx-count">
          {visibles.length} {visibles.length === 1 ? 'solicitud' : 'solicitudes'}
          {total > pqrs.length && ` (se cargaron las ${pqrs.length} más recientes de ${total})`}
        </span>
      </div>

      <div className="admin-card table-card">
        <div className="table-scroll">
          <table className="admin-table pqrx-table">
            <thead>
              <tr>
                <th>Solicitante</th>
                <th>Asunto</th>
                <th>Fase</th>
                <th>Plazo</th>
                <th>Última actuación</th>
                <th aria-label="Abrir" />
              </tr>
            </thead>
            <tbody>
              {visibles.map((p) => (
                <tr
                  key={p.id_pqr}
                  className="pqrx-row"
                  tabIndex={0}
                  onClick={() => setAbierta(p.id_pqr)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setAbierta(p.id_pqr);
                    }
                  }}
                >
                  <td>
                    <div className="pqrx-who">
                      <span className="pqrx-avatar">
                        {iniciales(p.usuario?.nombre_u, p.usuario?.apellido_u)}
                      </span>
                      <span>
                        <b>{nombreCompleto(p)}</b>
                        <small>{p.radicado}</small>
                      </span>
                    </div>
                  </td>
                  <td className="pqrx-subject">
                    <b title={p.asunto_pqr}>{p.asunto_pqr}</b>
                    <small>{TIPO_LABEL[p.tipo_pqr]}</small>
                  </td>
                  <td>
                    <PqrEstadoPill estado={p.estado_pqr} />
                  </td>
                  <td>
                    <PqrPlazoChip pqr={p} />
                  </td>
                  <td className="pqrx-sub-dim">{hace(p.ultima_actuacion_en ?? p.creado_en_pqr)}</td>
                  <td>
                    <ChevronRight size={17} aria-hidden="true" />
                  </td>
                </tr>
              ))}
              {!visibles.length && (
                <tr>
                  <td colSpan={6}>
                    {pqrs.length
                      ? 'Ninguna solicitud coincide con los filtros.'
                      : 'Aún no hay PQRS radicadas.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {abierta !== null && (
        <CasoPqr
          id={abierta}
          onClose={() => setAbierta(null)}
          onChanged={onChanged}
          notify={notify}
        />
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Panel lateral de un caso                                           */
/* ------------------------------------------------------------------ */

const MIN_RESPUESTA = 10;
const MAX_RESPUESTA = 2000;

function CasoPqr({
  id,
  onClose,
  onChanged,
  notify,
}: {
  id: number;
  onClose: () => void;
  onChanged: () => Promise<unknown> | void;
  notify: (mensaje: string) => void;
}) {
  const [pqr, setPqr] = useState<Pqr | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [respuesta, setRespuesta] = useState('');
  const [nota, setNota] = useState('');
  const [accion, setAccion] = useState<'iniciar' | 'resolver' | null>(null);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const cerrarRef = useRef<HTMLButtonElement>(null);
  // Protección contra doble clic: el ref se actualiza al instante,
  // el estado de React no.
  const ocupadoRef = useRef(false);

  // Abrir el detalle = avisarle al backend. Si la PQR estaba "Radicada",
  // el backend la pasa a "En revisión" y guarda el cambio.
  useEffect(() => {
    let vivo = true;
    pqrService
      .abrir(id)
      .then(({ pqr: p, cambio }) => {
        if (cambio) void onChanged();
        if (vivo) setPqr(p);
      })
      .catch((e) => {
        if (vivo) setErrorCarga(e instanceof Error ? e.message : 'No se pudo cargar la PQR.');
      });
    return () => {
      vivo = false;
    };
  }, [id]);

  useEffect(() => {
    cerrarRef.current?.focus();
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [onClose]);

  const estado = pqr?.estado_pqr;
  const textoRespuesta = respuesta.trim();
  const respuestaValida = textoRespuesta.length >= MIN_RESPUESTA;
  const ocupado = accion !== null;

  // Quién respondió (lo registra el backend en el seguimiento).
  const eventoRespuesta = pqr
    ? [...(pqr.seguimientos ?? [])].reverse().find((s) => s.tipo_evento === 'respuesta')
    : undefined;
  const detalleRespuesta = [
    pqr?.respondido_en_pqr ? `Respondida el ${fmtFechaHora(pqr.respondido_en_pqr)}` : '',
    eventoRespuesta?.autor ? `Por ${eventoRespuesta.autor}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  /** Si otra persona ya movió la PQR, se vuelve a pedir el estado real. */
  function resincronizar() {
    pqrService
      .obtener(id)
      .then(setPqr)
      .catch(() => {
        // Se queda con lo que ya está en pantalla.
      });
  }

  async function comenzarGestion() {
    if (!pqr || ocupadoRef.current) return;
    ocupadoRef.current = true;
    setAccion('iniciar');
    setErrorForm(null);
    try {
      const actualizada = await pqrService.iniciarGestion(pqr.id_pqr);
      setPqr(actualizada);
      notify('La PQR pasó a «En proceso». El usuario ya lo ve en su perfil.');
      void onChanged();
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : 'No se pudo comenzar la gestión.');
      resincronizar();
    } finally {
      ocupadoRef.current = false;
      setAccion(null);
    }
  }

  async function enviarRespuesta(e: FormEvent) {
    e.preventDefault();
    if (!pqr || ocupadoRef.current) return;

    if (!respuestaValida) {
      setErrorForm(`La respuesta debe tener al menos ${MIN_RESPUESTA} caracteres.`);
      return;
    }

    ocupadoRef.current = true;
    setAccion('resolver');
    setErrorForm(null);
    try {
      const actualizada = await pqrService.resolver(
        pqr.id_pqr,
        textoRespuesta,
        nota.trim() || undefined,
      );
      setPqr(actualizada);
      setRespuesta('');
      setNota('');
      notify('Respuesta enviada. La PQR quedó «Resuelta» y el usuario ya puede verla.');
      void onChanged();
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : 'No se pudo enviar la respuesta.');
      resincronizar();
    } finally {
      ocupadoRef.current = false;
      setAccion(null);
    }
  }

  // Se monta en la raíz del panel (como los demás modales) para quedar por
  // encima de la cabecera y conservar las variables de tema del admin.
  const raiz = document.querySelector('.social-admin') ?? document.body;

  return createPortal(
    <div
      className="pqrx-drawer-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside className="pqrx-drawer pqrx" role="dialog" aria-modal="true" aria-label="Detalle de la PQR">
        <header className="pqrx-drawer-head">
          <div>
            <p>{pqr ? pqr.radicado : `PQR #${id}`}</p>
            <h2>{pqr?.asunto_pqr ?? 'Cargando…'}</h2>
            {pqr && <p>Radicada el {fmtFechaHora(pqr.creado_en_pqr)}</p>}
          </div>
          <button title="Cerrar" ref={cerrarRef} className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <X size={19} />
          </button>
        </header>

        <div className="pqrx-drawer-body">
          {errorCarga && <p className="pqrx-error">{errorCarga}</p>}

          {!pqr && !errorCarga && (
            <>
              <div className="pqrx-skeleton" style={{ width: '60%' }} />
              <div className="pqrx-skeleton" />
              <div className="pqrx-skeleton" style={{ width: '80%' }} />
            </>
          )}

          {pqr && (
            <>
              {/* ---------- 1. Información del PQR ---------- */}
              <section className="pqrx-panel" aria-labelledby="pqrx-info-title">
                <div className="pqrx-panel-head">
                  <h3 id="pqrx-info-title">Información de la solicitud</h3>
                </div>
                <div className="pqrx-panel-body">
                  <div className="pqrx-person">
                    <span className="pqrx-avatar">
                      {iniciales(pqr.usuario?.nombre_u, pqr.usuario?.apellido_u)}
                    </span>
                    <span>
                      <b>{nombreCompleto(pqr)}</b>
                      <small>
                        {pqr.usuario?.correo_u}
                        {pqr.usuario?.telefono_u ? ` · ${pqr.usuario.telefono_u}` : ''}
                      </small>
                    </span>
                    <span className="pqrx-chips">
                      <PqrPlazoChip pqr={pqr} />
                    </span>
                  </div>

                  <dl className="pqrx-info-grid">
                    <div>
                      <dt>Tipo</dt>
                      <dd>{TIPO_LABEL[pqr.tipo_pqr]}</dd>
                    </div>
                    <div>
                      <dt>Radicado</dt>
                      <dd>{pqr.radicado}</dd>
                    </div>
                    <div>
                      <dt>Fecha</dt>
                      <dd>{fmtFechaHora(pqr.creado_en_pqr)}</dd>
                    </div>
                    <div>
                      <dt>Estado</dt>
                      <dd>
                        <PqrEstadoPill estado={pqr.estado_pqr} />
                      </dd>
                    </div>
                  </dl>

                  <PqrStepper estado={pqr.estado_pqr} />

                  <div className="pqrx-box">
                    <span>Lo que escribió el usuario</span>
                    <p>{pqr.mensaje_pqr}</p>
                  </div>
                </div>
              </section>

              {/* ---------- 2. Gestión / respuesta del administrador ---------- */}
              <section className="pqrx-panel manage" aria-labelledby="pqrx-gestion-title">
                <div className="pqrx-panel-head">
                  <h3 id="pqrx-gestion-title">Gestión y respuesta</h3>
                </div>
                <div className="pqrx-panel-body">
                  {estado === 'en_revision' && (
                    <div className="pqrx-cta">
                      <p>
                        Esta solicitud está <b>en revisión</b>. Cuando hayas revisado el caso, comienza la
                        gestión formal: el usuario verá en su perfil que ya la estás atendiendo.
                      </p>
                      <button title="Comenzar a gestionar esta PQR"
                        type="button"
                        className="primary-btn"
                        onClick={comenzarGestion}
                        disabled={ocupado}
                      >
                        {accion === 'iniciar' ? (
                          <Loader2 size={15} className="pqrx-spin" />
                        ) : (
                          <Play size={15} />
                        )}
                        {accion === 'iniciar' ? 'Iniciando…' : 'Comenzar gestión'}
                      </button>
                    </div>
                  )}

                  {estado === 'en_proceso' && (
                    <form className="pqrx-reply" onSubmit={enviarRespuesta} noValidate>
                      <label className="pqrx-field">
                        <span>Respuesta para el usuario</span>
                        <textarea
                          rows={7}
                          maxLength={MAX_RESPUESTA}
                          value={respuesta}
                          onChange={(e) => setRespuesta(e.target.value)}
                          placeholder="Escribe la respuesta oficial. El usuario la verá completa en su perfil."
                          disabled={ocupado}
                        />
                        <small className={respuesta.length > 0 && !respuestaValida ? 'warn' : undefined}>
                          {respuesta.length}/{MAX_RESPUESTA} caracteres · mínimo {MIN_RESPUESTA}
                        </small>
                      </label>

                      <label className="pqrx-field internal">
                        <span>
                          <b style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <Lock size={13} aria-hidden="true" /> Nota interna (opcional)
                          </b>
                        </span>
                        <textarea
                          rows={3}
                          maxLength={1000}
                          value={nota}
                          onChange={(e) => setNota(e.target.value)}
                          placeholder="Solo la ve el equipo administrador."
                          disabled={ocupado}
                        />
                      </label>

                      {errorForm && (
                        <p className="pqrx-error" role="alert">
                          {errorForm}
                        </p>
                      )}

                      <div className="pqrx-form-actions">
                        <small>
                          Al enviar, la PQR quedará «Resuelta» y el usuario recibirá una notificación. La
                          respuesta no se puede editar después.
                        </small>
                        <button title={accion === 'resolver' ? 'Enviando…' : 'Enviar la respuesta y resolver la PQR'} className="primary-btn" type="submit" disabled={ocupado || !respuestaValida}>
                          {accion === 'resolver' ? (
                            <Loader2 size={15} className="pqrx-spin" />
                          ) : (
                            <Send size={15} />
                          )}
                          {accion === 'resolver' ? 'Enviando…' : 'Enviar respuesta'}
                        </button>
                      </div>
                    </form>
                  )}

                  {esFinal(pqr.estado_pqr) && (
                    <div className="pqrx-done">
                      <header>
                        <CheckCircle2 size={17} aria-hidden="true" />
                        {pqr.estado_pqr === 'cerrado' ? 'Caso cerrado' : 'Respuesta enviada'}
                      </header>
                      <p>{pqr.respuesta_pqr ?? 'Esta solicitud no tiene una respuesta registrada.'}</p>
                      {detalleRespuesta && <small>{detalleRespuesta}</small>}
                    </div>
                  )}

                  {errorForm && estado !== 'en_proceso' && (
                    <p className="pqrx-error" role="alert">
                      {errorForm}
                    </p>
                  )}
                </div>
              </section>

              <h3 className="pqrx-section-title">Historial</h3>
              <PqrTimeline seguimientos={pqr.seguimientos ?? []} admin />
            </>
          )}
        </div>
      </aside>
    </div>,
    raiz,
  );
}