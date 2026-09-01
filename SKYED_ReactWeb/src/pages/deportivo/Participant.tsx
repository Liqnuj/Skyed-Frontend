import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Protected from '../../components/Protected';
import SportWrapper from '../../components/deportivo/SportWrapper';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/api';
import '../../styles/deportivo/participante.css';

type TabId = 'resumen' | 'historial' | 'inscripciones' | 'ajustes';

interface EventoInscrito {
  id: number;
  nombre: string;
  categoria: string;
  fecha: string;
  hora: string;
  ubicacion: string;
  imagen_url: string | null;
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
  estado: string | null;
}

interface Inscripcion {
  id: number;
  estado: string;
  fecha: string;
  precio_pagado: number | null;
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

function fmtFechaLarga(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

function fmtMoney(n: number | null | undefined) {
  return '$' + (Number(n) || 0).toLocaleString('es-CO');
}

function estadoPill(estado: string) {
  if (estado === 'pendiente') return { cls: 'pending', txt: 'Pago pendiente' };
  if (estado === 'cancelada') return { cls: 'warn', txt: 'Cancelada' };
  return { cls: 'ok', txt: 'Confirmada' };
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

function ParticipantPanel() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabId>('resumen');
  const [inscripciones, setInscripciones] = useState<Inscripcion[] | null>(null);
  const [historial, setHistorial] = useState<HistorialItem[] | null>(null);
  const [detalle, setDetalle] = useState<Inscripcion | null>(null);
  const [verQr, setVerQr] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

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

  const initials = (user?.name || 'SK').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  const abrirDetalle = (insc: Inscripcion) => {
    setDetalle(insc);
    setVerQr(false);
    setTab('inscripciones');
  };

  return (
    <>
      <div className="part-header">
        <div className="part-header-inner">
          <div className="part-avatar-wrap">
            <div className="part-avatar">{initials}</div>
            <button className="part-avatar-edit" aria-label="Cambiar foto de perfil (próximamente)" title="Próximamente" disabled>
              <i className="ti ti-camera" aria-hidden="true" />
            </button>
          </div>
          <div className="part-meta">
            <div className="part-badge"><i className="ti ti-medal" aria-hidden="true" />Ciclista verificado</div>
            <h1>{user?.name || 'Ciclista'}</h1>
            <p className="part-handle">@{(user?.email || '').split('@')[0]}</p>
          </div>
          <div className="part-actions">
            <button
              type="button"
              className="part-btn-disabled"
              title="Próximamente"
              disabled
              onClick={() => setTab('ajustes')}
            >
              <i className="ti ti-edit" aria-hidden="true" /> Editar perfil
            </button>
            <Link to="/deportivo/eventos" className="btn btn-primary">+ Inscribirme</Link>
          </div>
        </div>

        <div className="part-tabs" role="tablist">
          {(['resumen', 'historial', 'inscripciones', 'ajustes'] as TabId[]).map((t) => (
            <button
              key={t}
              role="tab"
              className={`part-tab-btn${tab === t ? ' active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'resumen' ? 'Resumen' : t === 'historial' ? 'Historial' : t === 'inscripciones' ? 'Inscripciones' : 'Ajustes'}
            </button>
          ))}
        </div>
      </div>

      <div className="part-body">
        <aside>
          <div className="part-card">
            <div className="part-card-head"><h3>Información</h3></div>
            <div className="part-card-body">
              <div className="part-stat-row"><span className="part-label">Rol</span><span>{user?.role === 'admin' ? 'Administrador' : 'Participante'}</span></div>
              <div className="part-stat-row"><span className="part-label">Correo</span><span>{user?.email || '—'}</span></div>
              <div className="part-stat-row"><span className="part-label">Categoría</span><span>—</span></div>
              <div className="part-stat-row"><span className="part-label">Teléfono</span><span>—</span></div>
            </div>
          </div>
          <div className="part-card">
            <div className="part-card-head"><h3>Disciplinas</h3></div>
            <div className="part-card-body">
              <div className="part-tags">
                <span className="part-tag"><i className="ti ti-bike" aria-hidden="true" /> Ruta</span>
              </div>
            </div>
          </div>
        </aside>

        <div>
          {tab === 'resumen' && (
            <>
              <div className="part-stats-strip">
                <div className="part-strip-stat"><span className="part-num">{pasadas.length}</span><span className="part-lbl">Eventos completados</span></div>
                <div className="part-strip-stat accent"><span className="part-num">{proximas.length}</span><span className="part-lbl">Próximos eventos</span></div>
                <div className="part-strip-stat"><span className="part-num">{inscripciones?.length ?? 0}</span><span className="part-lbl">Inscripciones totales</span></div>
                <div className="part-strip-stat accent"><span className="part-num">{fmtMoney(inscripciones?.reduce((s, i) => s + (i.precio_pagado || 0), 0))}</span><span className="part-lbl">Total invertido</span></div>
              </div>

              <p className="part-section-label">
                Próximas inscripciones
                <button onClick={() => setTab('inscripciones')}>Ver todo →</button>
              </p>
              {loadError && <div className="part-empty-row">{loadError}</div>}
              {!loadError && proximas.length === 0 && (
                <div className="part-empty-row">Sin eventos próximos. <Link to="/deportivo/eventos">Explora eventos →</Link></div>
              )}
              {proximas.slice(0, 3).map((i) => (
                <EventRow key={i.id} insc={i} onVerDetalle={() => abrirDetalle(i)} />
              ))}
            </>
          )}

          {tab === 'historial' && (
            <>
              <p className="part-section-label">Todos los resultados</p>
              {!historial && <div className="part-empty-row">Cargando historial…</div>}
              {historial && historial.length === 0 && <div className="part-empty-row">Sin historial todavía.</div>}
              {historial?.map((h) => (
                <div className="part-event-row" key={h.id_hp}>
                  <div className="part-event-row-img">{(h.evento?.nombre || '?')[0].toUpperCase()}</div>
                  <div className="part-event-row-info">
                    <h4>{h.evento?.nombre || 'Evento'}</h4>
                    <div className="part-event-meta">
                      <span>{fmtFechaLarga(h.fecha_hp)}</span>
                      {h.evento?.ubicacion && <span>{h.evento.ubicacion}</span>}
                    </div>
                  </div>
                  <span className={`part-status-pill ${h.estado_hp === 'abandono' ? 'warn' : h.estado_hp === 'inscrito' ? 'pending' : 'ok'}`}>
                    {h.estado_hp}
                  </span>
                </div>
              ))}
            </>
          )}

          {tab === 'inscripciones' && !detalle && (
            <>
              <p className="part-section-label">Eventos confirmados</p>
              {loadError && <div className="part-empty-row">{loadError}</div>}
              {!loadError && proximas.length === 0 && (
                <div className="part-empty-row">No tienes inscripciones activas.</div>
              )}
              {proximas.map((i) => (
                <EventRow key={i.id} insc={i} onVerDetalle={() => abrirDetalle(i)} />
              ))}
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <Link to="/deportivo/eventos" className="btn btn-primary">Explorar más eventos →</Link>
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
            />
          )}

          {tab === 'ajustes' && <AjustesTab />}
        </div>
      </div>
    </>
  );
}

function EventRow({ insc, onVerDetalle }: { insc: Inscripcion; onVerDetalle: () => void }) {
  const pill = estadoPill(insc.estado);
  const bg = insc.evento?.imagen_url ? { backgroundImage: `url(${insc.evento.imagen_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined;
  return (
    <div className="part-event-row">
      <div className="part-event-row-img" style={bg}>{!insc.evento?.imagen_url && (insc.evento?.nombre || '?')[0].toUpperCase()}</div>
      <div className="part-event-row-info">
        <h4>{insc.evento?.nombre || 'Evento'}</h4>
        <div className="part-event-meta">
          <span>{fmtFechaLarga(insc.evento?.fecha)}</span>
          {insc.evento?.ubicacion && <span>{insc.evento.ubicacion}</span>}
          {insc.evento?.categoria && <span>{insc.evento.categoria}</span>}
        </div>
        <button className="part-btn-link-detail" onClick={onVerDetalle}>Ver detalles</button>
      </div>
      <span className={`part-status-pill ${pill.cls}`}>{pill.txt}</span>
    </div>
  );
}

function DetalleInscripcion({
  insc, verQr, onVerQr, onCerrarQr, onVolver,
}: {
  insc: Inscripcion;
  verQr: boolean;
  onVerQr: () => void;
  onCerrarQr: () => void;
  onVolver: () => void;
}) {
  const metodo = insc.pago?.metodo_pago
    ?.replace('transferencia', 'Transferencia bancaria')
    .replace('nequi', 'Nequi / Daviplata')
    .replace('efectivo', 'Efectivo en punto autorizado');

  return (
    <div className="part-card">
      <div className="part-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Detalles de la inscripción</h3>
        <button className="part-btn-link-detail" onClick={onVolver}>← Volver a inscripciones</button>
      </div>
      <div className="part-card-body">
        <h2 style={{ marginTop: 0 }}>{insc.evento?.nombre || 'Inscripción'}</h2>
        <p style={{ color: 'var(--muted)', marginTop: -8 }}>
          {fmtFechaLarga(insc.evento?.fecha)}{insc.evento?.ubicacion ? ` · ${insc.evento.ubicacion}` : ''}
        </p>

        <div className="part-stat-row"><span className="part-label">Estado</span><span>{estadoPill(insc.estado).txt}</span></div>
        <div className="part-stat-row"><span className="part-label">Método de pago</span><span>{metodo || '—'}</span></div>
        <div className="part-stat-row"><span className="part-label">Total</span><span>{fmtMoney(insc.precio_pagado)}</span></div>
        <div className="part-stat-row"><span className="part-label">Referencia de pago</span><span>{insc.pago?.referencia || '—'}</span></div>
        <div className="part-stat-row"><span className="part-label">Fecha de pago</span><span>{insc.pago?.fecha ? fmtFechaLarga(insc.pago.fecha) : '—'}</span></div>

        {insc.qr?.codigo && !verQr && (
          <div style={{ marginTop: '1rem' }}>
            <button className="btn btn-primary" onClick={onVerQr}>
              <i className="ti ti-qrcode" aria-hidden="true" /> Ver mi QR
            </button>
          </div>
        )}

        {insc.qr?.codigo && verQr && (
          <div className="part-qr-block">
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <strong>Tu entrada QR</strong>
              <button className="part-btn-link-detail" onClick={onCerrarQr}>Volver</button>
            </div>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(insc.qr.codigo)}`}
              alt="Código QR de la inscripción"
              width={240}
              height={240}
            />
            <div style={{ fontWeight: 700, wordBreak: 'break-all', textAlign: 'center' }}>{insc.qr.codigo}</div>
            <p style={{ color: 'var(--muted)', textAlign: 'center', margin: 0 }}>Muestra este código en el punto de control el día del evento.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AjustesTab() {
  const { user } = useAuth();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

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

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (nueva.length < 8) {
      setMsg({ tipo: 'error', texto: 'La nueva contraseña debe tener mínimo 8 caracteres.' });
      return;
    }
    if (nueva !== confirmar) {
      setMsg({ tipo: 'error', texto: 'Las contraseñas no coinciden.' });
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
      setMsg({ tipo: 'ok', texto: 'Contraseña actualizada correctamente.' });
      setActual('');
      setNueva('');
      setConfirmar('');
    } catch (err: any) {
      setMsg({ tipo: 'error', texto: err.message || 'No se pudo actualizar la contraseña.' });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="part-settings-grid">
      <div className="part-card">
        <div className="part-card-head"><h3>Datos personales</h3></div>
        <div className="part-card-body">
          <p className="part-form-hint">Próximamente podrás editar estos datos. Por ahora solo se muestran los que ya tenemos de tu cuenta.</p>
          <div className="part-form-group">
            <label>Nombre completo</label>
            <input type="text" defaultValue={user?.name || ''} disabled />
          </div>
          <div className="part-form-group">
            <label>Correo electrónico</label>
            <input type="email" defaultValue={user?.email || ''} disabled />
          </div>
          <div className="part-form-group">
            <label>Teléfono</label>
            <input type="tel" placeholder="Aún no disponible" disabled />
          </div>
          <div className="part-form-group">
            <label>Ciudad</label>
            <input type="text" placeholder="Aún no disponible" disabled />
          </div>
          <button type="button" className="btn btn-primary part-btn-disabled" disabled>Guardar cambios</button>
        </div>
      </div>

      <div className="part-card">
        <div className="part-card-head"><h3>Notificaciones</h3></div>
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

      <div className="part-card">
        <div className="part-card-head"><h3>Seguridad</h3></div>
        <div className="part-card-body">
          <form onSubmit={submitPassword}>
            <div className="part-form-group">
              <label htmlFor="p-actual">Contraseña actual</label>
              <input id="p-actual" type="password" value={actual} onChange={(e) => setActual(e.target.value)} required />
            </div>
            <div className="part-form-group">
              <label htmlFor="p-nueva">Nueva contraseña</label>
              <input id="p-nueva" type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} required minLength={8} />
            </div>
            <div className="part-form-group">
              <label htmlFor="p-confirm">Confirmar nueva contraseña</label>
              <input id="p-confirm" type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} required />
            </div>
            {msg && <p className={`part-error show`} style={{ color: msg.tipo === 'ok' ? '#15803d' : '#dc2626' }}>{msg.texto}</p>}
            <button type="submit" className="btn btn-outline" disabled={enviando}>
              {enviando ? 'Actualizando…' : 'Actualizar contraseña'}
            </button>
          </form>
        </div>
      </div>

      <div className="part-card">
        <div className="part-card-head"><h3>Cuenta</h3></div>
        <div className="part-card-body">
          <div className="part-stat-row"><span className="part-label">Rol</span><span>{user?.role === 'admin' ? 'Administrador' : 'Participante'}</span></div>
          <button type="button" className="btn btn-outline part-btn-disabled" style={{ marginTop: '1rem', color: '#dc2626' }} disabled title="Próximamente">
            Eliminar cuenta
          </button>
        </div>
      </div>
    </div>
  );
}