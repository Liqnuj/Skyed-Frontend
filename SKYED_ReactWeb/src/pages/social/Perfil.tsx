import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import Protected from '../../components/Protected';
import SocialWrapper from '../../components/social/SocialWrapper';
import { useAuth } from '../../context/AuthContext';
import { pqrService, reservaService } from '../../services/socialService';
import type { Pqr, Reserva, TipoPqr } from '../../services/socialService';
import '../../styles/social/perfil.css';

type TabId = 'resumen' | 'pqr' | 'reservas' | 'ajustes';

function tipoDocumentoLabel(tipo: string | null | undefined) {
  const map: Record<string, string> = {
    CC: 'C.C.', cedula: 'C.C.',
    TI: 'T.I.', tarjeta_identidad: 'T.I.',
    CE: 'C.E.', cedula_extranjeria: 'C.E.',
    PA: 'Pasaporte', pasaporte: 'Pasaporte',
  };
  return tipo ? (map[tipo] || tipo) : '';
}

function fmtFecha(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

function fmtMoney(n: string | number | null | undefined) {
  return '$' + (Number(n) || 0).toLocaleString('es-CO');
}

const pqrTipoLabel: Record<TipoPqr, string> = {
  peticion: 'Petición',
  queja: 'Queja',
  reclamo: 'Reclamo',
  sugerencia: 'Sugerencia',
  felicitacion: 'Felicitación',
};

function pqrEstadoPill(estado: Pqr['estado_pqr']) {
  if (estado === 'abierto') return { cls: 'pending', txt: 'Abierto' };
  if (estado === 'en_proceso') return { cls: 'pending', txt: 'En proceso' };
  if (estado === 'cerrado') return { cls: 'warn', txt: 'Cerrado' };
  return { cls: 'ok', txt: 'Resuelto' };
}

function reservaEstadoPill(estado: Reserva['estado_rese']) {
  if (estado === 'pendiente') return { cls: 'pending', txt: 'Pendiente' };
  if (estado === 'cancelada') return { cls: 'warn', txt: 'Cancelada' };
  if (estado === 'completada') return { cls: 'ok', txt: 'Completada' };
  return { cls: 'ok', txt: 'Confirmada' };
}

export default function Perfil() {
  return (
    <Protected>
      <SocialWrapper>
        <PerfilPanel />
      </SocialWrapper>
    </Protected>
  );
}

function PerfilPanel() {
  const { user, updateFotoUrl, updateProfile } = useAuth();
  const [tab, setTab] = useState<TabId>('resumen');

  const [pqrs, setPqrs] = useState<Pqr[] | null>(null);
  const [reservas, setReservas] = useState<Reserva[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [detallePqr, setDetallePqr] = useState<Pqr | null>(null);

  useEffect(() => {
    pqrService.misPqr().then((res) => setPqrs(res.data)).catch(() => setLoadError('No se pudieron cargar tus PQR.'));
    reservaService.misReservas().then((res) => setReservas(res.data)).catch(() => setLoadError('No se pudieron cargar tus reservas.'));
  }, []);

  const initials = (user?.name || 'SK').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const handleFotoClick = () => fileInputRef.current?.click();
  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 3 * 1024 * 1024) return;

    setSubiendoFoto(true);
    const formData = new FormData();
    formData.append('foto', file);
    try {
      const { apiFetch } = await import('../../services/api');
      const data = await apiFetch('/perfil/foto', { method: 'POST', body: formData });
      if (data?.foto_url) updateFotoUrl(data.foto_url);
    } catch (err) {
      console.error(err);
    } finally {
      setSubiendoFoto(false);
    }
  };

  const pendientesPqr = useMemo(
    () => (pqrs ?? []).filter((p) => p.estado_pqr !== 'resuelto' && p.estado_pqr !== 'cerrado').length,
    [pqrs]
  );
  const reservasActivas = useMemo(
    () => (reservas ?? []).filter((r) => r.estado_rese === 'pendiente' || r.estado_rese === 'confirmada').length,
    [reservas]
  );

  return (
    <>
      <div className="pf-header">
        <div className="pf-header-inner">
          <div className="pf-avatar-wrap">
            {user?.foto_url ? (
              <img src={user.foto_url} alt="Foto de perfil" className="pf-avatar" style={{ objectFit: 'cover' }} />
            ) : (
              <div className="pf-avatar">{initials}</div>
            )}
            <button
              type="button"
              className="pf-avatar-edit"
              onClick={handleFotoClick}
              disabled={subiendoFoto}
              aria-label="Cambiar foto de perfil"
            >
              <i className="ti ti-camera" aria-hidden="true" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFotoChange} />
          </div>

          <div className="pf-meta">
            <div className="pf-badge"><i className="ti ti-user-circle" aria-hidden="true" />Cliente SkyedSocial</div>
            <h1>{user?.name || 'Tu perfil'}</h1>
            <p className="pf-handle">{user?.email}</p>
          </div>

          <div className="pf-actions">
            <Link to="/social/pqr" className="btn-sm-outline">Nueva PQR</Link>
            <Link to="/social/eventos" className="btn-sm-outline">Ver eventos</Link>
          </div>
        </div>

        <div className="pf-tabs" role="tablist">
          <button className={tab === 'resumen' ? 'active' : ''} onClick={() => setTab('resumen')}>Resumen</button>
          <button className={tab === 'pqr' ? 'active' : ''} onClick={() => setTab('pqr')}>
            Mis PQR{pendientesPqr > 0 && <span className="pf-tab-count">{pendientesPqr}</span>}
          </button>
          <button className={tab === 'reservas' ? 'active' : ''} onClick={() => setTab('reservas')}>
            Mis reservas{reservasActivas > 0 && <span className="pf-tab-count">{reservasActivas}</span>}
          </button>
          <button className={tab === 'ajustes' ? 'active' : ''} onClick={() => setTab('ajustes')}>Ajustes</button>
        </div>
      </div>

      <div className="pf-body">
        {loadError && <p className="form-error error">{loadError}</p>}

        {tab === 'resumen' && (
          <div className="pf-grid">
            <div className="pf-card">
              <div className="pf-card-head"><h3>Información</h3></div>
              <div className="pf-card-body">
                <div className="pf-stat-row"><span className="pf-label">Correo</span><span>{user?.email || '—'}</span></div>
                <div className="pf-stat-row"><span className="pf-label">Teléfono</span><span>{user?.telefono || '—'}</span></div>
                <div className="pf-stat-row"><span className="pf-label">Ciudad</span><span>{user?.ciudad || '—'}</span></div>
                <div className="pf-stat-row"><span className="pf-label">Documento</span><span>{user?.documento ? `${tipoDocumentoLabel(user.tipo_documento)} ${user.documento}` : '—'}</span></div>
                <div className="pf-stat-row"><span className="pf-label">Fecha de nacimiento</span><span>{fmtFecha(user?.fecha_nacimiento)}</span></div>
              </div>
            </div>

            <div className="pf-card">
              <div className="pf-card-head"><h3>Actividad</h3></div>
              <div className="pf-card-body">
                <div className="pf-stats-strip">
                  <div className="pf-strip-stat"><span className="pf-num">{pqrs?.length ?? 0}</span><span className="pf-lbl">PQR enviadas</span></div>
                  <div className="pf-strip-stat accent"><span className="pf-num">{pendientesPqr}</span><span className="pf-lbl">PQR en curso</span></div>
                  <div className="pf-strip-stat"><span className="pf-num">{reservas?.length ?? 0}</span><span className="pf-lbl">Reservas totales</span></div>
                </div>
                {(pqrs ?? []).length === 0 && (reservas ?? []).length === 0 && pqrs !== null && reservas !== null && (
                  <p className="pf-empty-hint">Aún no tienes PQR ni reservas. Cuando radiques una PQR o hagas una reserva, aparecerán aquí.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'pqr' && (
          <div className="pf-list">
            {pqrs === null && <p className="pf-loading">Cargando tus PQR…</p>}
            {pqrs?.length === 0 && <p className="pf-empty">Todavía no has radicado ninguna PQR.</p>}
            {pqrs?.map((p) => {
              const pill = pqrEstadoPill(p.estado_pqr);
              return (
                <button key={p.id_pqr} className="pf-list-item" onClick={() => setDetallePqr(p)}>
                  <div className="pf-list-item-main">
                    <span className="pf-list-item-title">{p.asunto_pqr}</span>
                    <span className="pf-list-item-sub">{pqrTipoLabel[p.tipo_pqr]} · Radicado SS-PQR-{p.id_pqr} · {fmtFecha(p.creado_en_pqr)}</span>
                  </div>
                  <span className={`pf-pill ${pill.cls}`}>{pill.txt}</span>
                </button>
              );
            })}
          </div>
        )}

        {tab === 'reservas' && (
          <div className="pf-list">
            {reservas === null && <p className="pf-loading">Cargando tus reservas…</p>}
            {reservas?.length === 0 && <p className="pf-empty">Todavía no tienes reservas registradas.</p>}
            {reservas?.map((r) => {
              const pill = reservaEstadoPill(r.estado_rese);
              return (
                <div key={r.id_rese} className="pf-list-item" style={{ cursor: 'default' }}>
                  <div className="pf-list-item-main">
                    <span className="pf-list-item-title">{r.evento?.nombre_er || `Reserva #${r.id_rese}`}</span>
                    <span className="pf-list-item-sub">{fmtFecha(r.fecha_evento_rese)} · {r.invitados_rese} invitados · {fmtMoney(r.total_rese)}</span>
                  </div>
                  <span className={`pf-pill ${pill.cls}`}>{pill.txt}</span>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'ajustes' && <AjustesForm user={user} updateProfile={updateProfile} />}
      </div>

      {detallePqr && (
        <div className="pf-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setDetallePqr(null); }}>
          <div className="pf-modal">
            <div className="pf-modal-head">
              <h3>PQR #{detallePqr.id_pqr}</h3>
              <button className="pf-modal-close" onClick={() => setDetallePqr(null)} aria-label="Cerrar">×</button>
            </div>
            <p className="pf-list-item-sub">{pqrTipoLabel[detallePqr.tipo_pqr]} · {fmtFecha(detallePqr.creado_en_pqr)}</p>
            <div className="pf-message-box"><span>Tu mensaje</span><p>{detallePqr.mensaje_pqr}</p></div>
            {detallePqr.respuesta_pqr ? (
              <div className="pf-message-box accent">
                <span>Respuesta{detallePqr.respondido_en_pqr ? ` · ${fmtFecha(detallePqr.respondido_en_pqr)}` : ''}</span>
                <p>{detallePqr.respuesta_pqr}</p>
              </div>
            ) : (
              <p className="pf-empty-hint">Aún sin respuesta. Te avisaremos aquí y por notificación cuando la tengamos.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function AjustesForm({
  user,
  updateProfile,
}: {
  user: ReturnType<typeof useAuth>['user'];
  updateProfile: ReturnType<typeof useAuth>['updateProfile'];
}) {
  const [nombre, setNombre] = useState(user?.name?.split(' ')[0] ?? '');
  const [apellido, setApellido] = useState(user?.name?.split(' ').slice(1).join(' ') ?? '');
  const [telefono, setTelefono] = useState(user?.telefono ?? '');
  const [ciudad, setCiudad] = useState(user?.ciudad ?? '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await updateProfile({
        nombre_u: nombre.trim(),
        apellido_u: apellido.trim(),
        telefono_u: telefono.trim(),
        ciudad_u: ciudad.trim(),
      });
      setMsg({ tipo: 'ok', texto: 'Tus datos se actualizaron correctamente.' });
    } catch (err) {
      setMsg({ tipo: 'error', texto: err instanceof Error ? err.message : 'No se pudieron guardar los cambios.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pf-card" style={{ maxWidth: 520 }}>
      <div className="pf-card-head"><h3>Editar mis datos</h3></div>
      <form className="modal-form" onSubmit={submit} style={{ padding: '1.25rem 1.5rem' }}>
        {msg && <p className={msg.tipo === 'ok' ? 'form-success' : 'form-error error'}>{msg.texto}</p>}
        <div className="form-grid">
          <label>Nombre<input value={nombre} onChange={(e) => setNombre(e.target.value)} required /></label>
          <label>Apellido<input value={apellido} onChange={(e) => setApellido(e.target.value)} required /></label>
        </div>
        <label>Teléfono<input value={telefono} onChange={(e) => setTelefono(e.target.value)} /></label>
        <label>Ciudad<input value={ciudad} onChange={(e) => setCiudad(e.target.value)} /></label>
        <div className="modal-actions">
          <button className="primary-btn" disabled={saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
        </div>
      </form>
    </div>
  );
}
