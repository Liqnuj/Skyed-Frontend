import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, Lock, Send, X } from 'lucide-react';
import { pqrService } from '../../../services/socialService';
import type {
  EstadoPqr,
  Pqr,
  RegistrarSeguimientoPayload,
  TipoPqr,
} from '../../../services/socialService';
import {
  ESTADO_COLOR,
  ESTADO_LABEL,
  FASES,
  SUGERENCIA_MENSAJE,
  TIPO_LABEL,
  esFinal,
  fmtFechaHora,
  hace,
} from '../../../utils/pqr';
import { PqrEstadoPill, PqrPlazoChip, PqrStepper, PqrTimeline } from './PqrTracker';
import type { CSSProperties } from 'react';

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
          <button
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

type Eleccion = EstadoPqr | 'mantener';

function CasoPqr({
  id,
  onClose,
  onChanged,
  notify,
}: {
  id: number;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
  notify: (mensaje: string) => void;
}) {
  const [pqr, setPqr] = useState<Pqr | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [eleccion, setEleccion] = useState<Eleccion>('mantener');
  const [mensaje, setMensaje] = useState('');
  const [nota, setNota] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const cerrarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let vivo = true;
    pqrService
      .obtener(id)
      .then((p) => vivo && setPqr(p))
      .catch((e) => vivo && setErrorCarga(e instanceof Error ? e.message : 'No se pudo cargar la PQR.'));
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

  const cerrada = pqr?.estado_pqr === 'cerrado';
  const resolviendo = eleccion === 'resuelto';
  const sugerencia = eleccion !== 'mantener' ? SUGERENCIA_MENSAJE[eleccion] : undefined;

  const hayAlgo = eleccion !== 'mantener' || mensaje.trim() !== '' || nota.trim() !== '';
  const avisaAlUsuario = !cerrada && (eleccion !== 'mantener' || mensaje.trim() !== '');

  const opciones = pqr
    ? FASES.filter((f) => f.key !== 'abierto' && f.key !== pqr.estado_pqr)
    : [];

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!pqr || enviando || !hayAlgo) return;
    setErrorForm(null);

    const texto = mensaje.trim();
    if (resolviendo && !texto && !pqr.respuesta_pqr) {
      setErrorForm('Para marcar la PQR como resuelta escribe la respuesta que recibirá el usuario.');
      return;
    }

    const payload: RegistrarSeguimientoPayload = {};
    if (eleccion !== 'mantener') payload.estado_pqr = eleccion;
    if (texto) {
      if (resolviendo) payload.respuesta_pqr = texto;
      else payload.comentario_publico = texto;
    }
    if (nota.trim()) payload.nota_interna = nota.trim();

    setEnviando(true);
    try {
      const actualizada = await pqrService.registrarSeguimiento(pqr.id_pqr, payload);
      setPqr(actualizada);
      setEleccion('mantener');
      setMensaje('');
      setNota('');
      notify(
        avisaAlUsuario
          ? 'Seguimiento registrado. El usuario ya lo ve en su perfil.'
          : 'Nota interna guardada.',
      );
      await onChanged();
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : 'No se pudo registrar el seguimiento.');
    } finally {
      setEnviando(false);
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
          <button ref={cerrarRef} className="icon-btn" onClick={onClose} aria-label="Cerrar">
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
                  <span className="pqrx-plazo">{TIPO_LABEL[pqr.tipo_pqr]}</span>
                  <PqrPlazoChip pqr={pqr} />
                </span>
              </div>

              <PqrStepper estado={pqr.estado_pqr} />

              <div className="pqrx-box">
                <span>Lo que escribió el usuario</span>
                <p>{pqr.mensaje_pqr}</p>
              </div>

              <form className="pqrx-form" onSubmit={enviar}>
                <h3>{cerrada ? 'Agregar nota interna' : 'Registrar avance'}</h3>
                <p>
                  {cerrada
                    ? 'La PQR está cerrada: solo puedes dejar notas para el equipo.'
                    : 'Cada avance queda en el historial y el usuario lo ve en su perfil.'}
                </p>

                {!cerrada && (
                  <div className="pqrx-choices" role="radiogroup" aria-label="Fase">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={eleccion === 'mantener'}
                      className={`pqrx-choice${eleccion === 'mantener' ? ' on' : ''}`}
                      style={color(pqr.estado_pqr)}
                      onClick={() => setEleccion('mantener')}
                    >
                      <i />
                      Seguir en «{ESTADO_LABEL[pqr.estado_pqr]}»
                    </button>
                    {opciones.map((f) => (
                      <button
                        key={f.key}
                        type="button"
                        role="radio"
                        aria-checked={eleccion === f.key}
                        className={`pqrx-choice${eleccion === f.key ? ' on' : ''}`}
                        style={color(f.key)}
                        onClick={() => setEleccion(f.key)}
                      >
                        <i />
                        Pasar a «{f.label}»
                      </button>
                    ))}
                  </div>
                )}

                {!cerrada && (
                  <label className="pqrx-field">
                    <span>
                      {resolviendo ? 'Respuesta para el usuario' : 'Mensaje para el usuario (opcional)'}
                      {sugerencia && !mensaje.trim() && (
                        <button type="button" onClick={() => setMensaje(sugerencia)}>
                          Usar texto sugerido
                        </button>
                      )}
                    </span>
                    <textarea
                      rows={resolviendo ? 6 : 4}
                      maxLength={resolviendo ? 2000 : 1000}
                      value={mensaje}
                      onChange={(e) => setMensaje(e.target.value)}
                      placeholder={
                        resolviendo
                          ? 'Escribe la respuesta oficial. El usuario la verá completa.'
                          : 'Ej. Ya contactamos al área encargada y te escribimos mañana.'
                      }
                    />
                    <small>
                      {mensaje.length}/{resolviendo ? 2000 : 1000} caracteres
                    </small>
                  </label>
                )}

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
                  />
                </label>

                {errorForm && <p className="pqrx-error">{errorForm}</p>}

                <div className="pqrx-form-actions">
                  <small>
                    {avisaAlUsuario
                      ? 'El usuario recibirá una notificación.'
                      : 'Las notas internas nunca se muestran al usuario.'}
                  </small>
                  <button className="primary-btn" disabled={!hayAlgo || enviando}>
                    <Send size={15} />
                    {enviando ? 'Guardando…' : cerrada ? 'Guardar nota' : 'Registrar avance'}
                  </button>
                </div>
              </form>

              <h3 className="pqrx-section-title">Historial</h3>
              <PqrTimeline seguimientos={pqr.seguimientos ?? []} admin />

              {esFinal(pqr.estado_pqr) && pqr.estado_pqr === 'resuelto' && (
                <p className="pqrx-closed-note">
                  Resuelta. Cuando confirmes que el caso terminó, pásala a «Cerrada».
                </p>
              )}
            </>
          )}
        </div>
      </aside>
    </div>,
    raiz,
  );
}