import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Protected from '../../components/Protected';
import SportWrapper from '../../components/deportivo/SportWrapper';

import { TEMAS_PQR, TIPOS_META } from '../../components/deportivo/pqr/pqrMeta';
import { PqrStepper } from '../../components/social/pqr/PqrTracker';
import { pqrService } from '../../services/socialService';
import type { Pqr, TipoPqr } from '../../services/socialService';
import '../../styles/deportivo/participante.css';
import '../../styles/deportivo/headerHero.css';
import '../../styles/deportivo/pqrDeportivoPagina.css';

const TIPOS = Object.keys(TIPOS_META) as TipoPqr[];

export default function PqrDeportivo() {
  return (
    <Protected>
      <SportWrapper>
        <Contenido />
      </SportWrapper>
    </Protected>
  );
}

function Contenido() {
  const [params] = useSearchParams();
  const [tipo, setTipo] = useState<TipoPqr>('peticion');
  const [tema, setTema] = useState('');
  // Si llega desde el Centro de ayuda, el asunto viene precargado (editable).
  const [asunto, setAsunto] = useState(() =>
    params.get('desde') === 'ayuda' ? (params.get('asunto') ?? '').slice(0, 100) : '',
  );
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [creada, setCreada] = useState<Pqr | null>(null);
  const navigate = useNavigate();

  const meta = TIPOS_META[tipo];

  const elegirTema = (id: string) => {
    const nuevo = TEMAS_PQR.find((t) => t.id === id);
    if (!nuevo) return;
    const anterior = TEMAS_PQR.find((t) => t.id === tema);
    // Solo se rellena el asunto si está vacío o si era el texto del tema anterior.
    if (!asunto.trim() || asunto === anterior?.asunto) setAsunto(nuevo.asunto);
    setTema(id);
  };

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!asunto.trim() || !mensaje.trim()) {
      setError('Completa el asunto y la descripción para radicar tu solicitud.');
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
      setCreada(p);

      window.setTimeout(() => {
        document.getElementById('pqd-confirmacion')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo radicar la solicitud.');
    } finally {
      setEnviando(false);
    }
  };

  const otra = () => {
    setCreada(null);
    setTipo('peticion');
    setTema('');
    setAsunto('');
    setMensaje('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const verMias = () => navigate('/deportivo/perfil?tab=pqr');

  return (
    <>
      {/* ===== Encabezado (mismo estilo que Perfil y Notificaciones) ===== */}
      <div className="part-header part-header--hero">
        <div className="part-header-inner">
          <span className="pqd-hero-ico">
            <i className="ti ti-message-report" aria-hidden="true" />
          </span>
          <div className="part-meta">
            <h1>Peticiones, quejas y sugerencias</h1>
            <p className="part-handle">
              Tu experiencia en pista importa. Cuéntanos qué pasó con tu inscripción, pago, kit o evento y te
              respondemos.
            </p>
          </div>
          <div className="part-actions">
            <button type="button" className="btn btn-outline" onClick={verMias}>
              <i className="ti ti-list-details" aria-hidden="true" /> Mis solicitudes
            </button>
          </div>
        </div>
      </div>

      <div className="pqd-page">
        <div className="pqd-grid">
          {/* ===== Columna izquierda: tipo + tiempos ===== */}
          <aside className="pqd-side">
            <span className="pqd-label">¿Qué deseas reportar?</span>
            <p className="pqd-side-sub">Elige la categoría que mejor describe tu solicitud.</p>

            <div className="pqd-types" role="radiogroup" aria-label="Tipo de solicitud">
              {TIPOS.map((t) => {
                const m = TIPOS_META[t];
                return (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={tipo === t}
                    className={`pqd-type${tipo === t ? ' selected' : ''}`}
                    onClick={() => setTipo(t)}
                  >
                    <span className="pqd-type-ico">
                      <i className={`ti ${m.icono}`} aria-hidden="true" />
                    </span>
                    <span className="pqd-type-txt">
                      <strong>{m.nombre}</strong>
                      <small>{m.descripcion}</small>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pqd-info">
              <p className="pqd-info-title">
                <i className="ti ti-calendar-time" aria-hidden="true" /> Tiempos de respuesta
              </p>
              <ul>
                {TIPOS.map((t) => (
                  <li key={t}>
                    {TIPOS_META[t].nombre} — <b>{TIPOS_META[t].plazo}</b>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* ===== Columna derecha: formulario o confirmación ===== */}
          <section className="pqd-formcard" aria-live="polite">
            {!creada ? (
              <form onSubmit={enviar} noValidate>
                <h2>Cuéntanos qué pasó</h2>
                <p className="pqd-form-sub">
                  Tu solicitud queda asociada a tu cuenta y recibirás un número de radicado para seguirla.
                </p>

                <span className="pqd-selected">
                  <i className={`ti ${meta.icono}`} aria-hidden="true" /> {meta.nombre}
                </span>

                <span className="pqd-label pqd-label--sm">Tema (opcional)</span>
                <div className="pqd-temas" role="group" aria-label="Tema de la solicitud">
                  {TEMAS_PQR.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`pqd-tema${tema === t.id ? ' active' : ''}`}
                      aria-pressed={tema === t.id}
                      onClick={() => elegirTema(t.id)}
                    >
                      <i className={`ti ${t.icono}`} aria-hidden="true" /> {t.label}
                    </button>
                  ))}
                </div>

                <label className="pqd-field">
                  <span>
                    Asunto <em>*</em>
                  </span>
                  <input
                    type="text"
                    value={asunto}
                    maxLength={100}
                    placeholder="Resumen breve de tu solicitud"
                    onChange={(e) => setAsunto(e.target.value)}
                  />
                </label>

                <label className="pqd-field">
                  <span>
                    Descripción detallada <em>*</em>
                  </span>
                  <textarea
                    rows={7}
                    value={mensaje}
                    maxLength={1000}
                    placeholder="Cuéntanos qué pasó, en qué evento, cuándo y qué esperas como solución…"
                    onChange={(e) => setMensaje(e.target.value)}
                  />
                  <small className={mensaje.length > 850 ? 'warn' : ''}>{mensaje.length} / 1000 caracteres</small>
                </label>

                <p className="pqd-privacy">
                  <i className="ti ti-lock" aria-hidden="true" /> Tus datos se tratan con confidencialidad y solo los
                  usa el equipo de SKYED Deportivo para responderte.
                </p>

                {error && (
                  <p className="pqd-alert" role="alert">
                    {error}
                  </p>
                )}

                <button type="submit" className="btn btn-primary pqd-submit" disabled={enviando}>
                  {enviando ? (
                    <>
                      <i className="ti ti-loader-2 pqd-spin" aria-hidden="true" /> Enviando…
                    </>
                  ) : (
                    <>
                      <i className="ti ti-send" aria-hidden="true" /> Radicar solicitud
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="pqd-done" id="pqd-confirmacion">
                <span className="pqd-done-ico">
                  <i className="ti ti-check" aria-hidden="true" />
                </span>
                <h2>¡Solicitud radicada!</h2>
                <p>Recibimos tu solicitud y quedó asociada a tu cuenta.</p>
                <p className="pqd-code">Radicado: {creada.radicado}</p>
                <div className="pqrx pqd-done-steps">
                  <PqrStepper estado={creada.estado_pqr} />
                </div>
                <p className="pqd-done-hint">
                  Te avisaremos en tus notificaciones cada vez que cambie de fase o el equipo te escriba.
                </p>
                <div className="pqd-done-actions">
                  <button type="button" className="btn btn-primary" onClick={verMias}>
                    Ver mis PQR
                  </button>
                  <button type="button" className="btn btn-outline" onClick={otra}>
                    Radicar otra
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>



      </div>
    </>
  );
}