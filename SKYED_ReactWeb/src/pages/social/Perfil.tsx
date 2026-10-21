import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Protected from '../../components/Protected';
import SocialWrapper from '../../components/social/SocialWrapper';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/api';
import { pqrService, reservaService } from '../../services/socialService';
import type { Pqr, Reserva, TipoPqr } from '../../services/socialService';
import { prepararImagen } from '../../utils/prepararImagen';
import { errorContrasena } from '../../utils/validaciones';
import '../../styles/social/perfil.css';

type TabId = 'resumen' | 'pqr' | 'reservas' | 'ajustes';
const TABS: TabId[] = ['resumen', 'pqr', 'reservas', 'ajustes'];

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

  // La pestaña vive en la URL (/social/perfil?tab=reservas) para que las
  // opciones del menú de la cuenta abran directamente la sección elegida.
  const [searchParams, setSearchParams] = useSearchParams();
  const tabUrl = searchParams.get('tab') as TabId | null;
  const tab: TabId = tabUrl && TABS.includes(tabUrl) ? tabUrl : 'resumen';
  const setTab = (nueva: TabId) =>
    setSearchParams(nueva === 'resumen' ? {} : { tab: nueva }, { replace: true });

  const esAdmin = user?.roles.includes('adminSocial') ?? false;

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
  const [fotoMsg, setFotoMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const handleFotoClick = () => fileInputRef.current?.click();
  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const original = e.target.files?.[0];
    e.target.value = '';
    if (!original) return;
    if (!original.type.startsWith('image/')) {
      setFotoMsg({ tipo: 'error', texto: 'El archivo debe ser una imagen (JPG, PNG o WEBP).' });
      return;
    }

    setSubiendoFoto(true);
    setFotoMsg(null);
    try {
      // Se reduce antes de subir: PHP acepta solo 2 MB por defecto y una
      // foto de celular pesa 3-6 MB (antes fallaba sin avisar).
      const file = await prepararImagen(original);
      if (file.size > 3 * 1024 * 1024) {
        setFotoMsg({ tipo: 'error', texto: 'La imagen no debe superar 3 MB.' });
        return;
      }
      const formData = new FormData();
      formData.append('foto', file);
      const data = await apiFetch('/perfil/foto', { method: 'POST', body: formData });
      if (data?.foto_url) updateFotoUrl(data.foto_url);
      setFotoMsg({ tipo: 'ok', texto: 'Foto de perfil actualizada.' });
    } catch (err) {
      setFotoMsg({ tipo: 'error', texto: err instanceof Error ? err.message : 'No se pudo subir la foto.' });
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
            <div className="pf-badge">
              <i className={`ti ${esAdmin ? 'ti-shield-check' : 'ti-user-circle'}`} aria-hidden="true" />
              {esAdmin ? 'Administrador SkyedSocial' : 'Cliente SkyedSocial'}
            </div>
            <h1>{user?.name || 'Tu perfil'}</h1>
            <p className="pf-handle">{user?.email}</p>
          </div>

          <div className="pf-actions">
            {esAdmin && (
              <Link to="/social/admin" className="btn-sm-outline pf-admin-link">
                <i className="ti ti-shield-check" aria-hidden="true" /> Panel de administración
              </Link>
            )}
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
        {loadError && <p className="pf-alert error">{loadError}</p>}
        {fotoMsg && <p className={`pf-alert ${fotoMsg.tipo}`}>{fotoMsg.texto}</p>}

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

        {tab === 'ajustes' && (
          <div className="pf-settings">
            <AjustesForm user={user} updateProfile={updateProfile} />
            <CambiarContrasena />
          </div>
        )}
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

/** Solo letras (con tildes y ñ) y espacios, igual que el registro. */
const soloLetras = (valor: string) => valor.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '').slice(0, 50);
const soloNumeros = (valor: string) => valor.replace(/\D/g, '').slice(0, 15);

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
    setMsg(null);
    if (telefono && (telefono.length < 7 || telefono.length > 15)) {
      setMsg({ tipo: 'error', texto: 'El teléfono debe tener entre 7 y 15 dígitos.' });
      return;
    }
    setSaving(true);
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
    <div className="pf-card">
      <div className="pf-card-head"><h3>Editar mis datos</h3></div>
      <form className="pf-form" onSubmit={submit}>
        {msg && <p className={`pf-alert ${msg.tipo}`}>{msg.texto}</p>}
        <div className="pf-form-row">
          <label className="pf-field">
            <span>Nombre</span>
            <input value={nombre} onChange={(e) => setNombre(soloLetras(e.target.value))} required maxLength={50} />
          </label>
          <label className="pf-field">
            <span>Apellido</span>
            <input value={apellido} onChange={(e) => setApellido(soloLetras(e.target.value))} required maxLength={50} />
          </label>
        </div>
        <label className="pf-field">
          <span>Teléfono</span>
          <input value={telefono} onChange={(e) => setTelefono(soloNumeros(e.target.value))} inputMode="numeric" placeholder="3001234567" />
        </label>
        <label className="pf-field">
          <span>Ciudad</span>
          <input value={ciudad} onChange={(e) => setCiudad(e.target.value.slice(0, 80))} placeholder="Ej. Sogamoso, Boyacá" />
        </label>
        <div className="pf-form-actions">
          <button className="pf-btn" disabled={saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
        </div>
      </form>
    </div>
  );
}

/** Igual que en el perfil de SKYED Deportivo: PUT /cambiar-contrasena. */
function CambiarContrasena() {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [ver, setVer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const motivo = errorContrasena(nueva);
    if (motivo) {
      setMsg({ tipo: 'error', texto: motivo });
      return;
    }
    if (nueva === actual) {
      setMsg({ tipo: 'error', texto: 'La nueva contraseña debe ser distinta a la actual.' });
      return;
    }
    if (nueva !== confirmar) {
      setMsg({ tipo: 'error', texto: 'Las contraseñas no coinciden.' });
      return;
    }
    setSaving(true);
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
    } catch (err) {
      setMsg({ tipo: 'error', texto: err instanceof Error ? err.message : 'No se pudo cambiar la contraseña.' });
    } finally {
      setSaving(false);
    }
  };

  const tipo = ver ? 'text' : 'password';

  return (
    <div className="pf-card">
      <div className="pf-card-head"><h3>Cambiar contraseña</h3></div>
      <form className="pf-form" onSubmit={submit}>
        {msg && <p className={`pf-alert ${msg.tipo}`}>{msg.texto}</p>}
        <label className="pf-field">
          <span>Contraseña actual</span>
          <input type={tipo} value={actual} onChange={(e) => setActual(e.target.value)} required autoComplete="current-password" />
        </label>
        <label className="pf-field">
          <span>Nueva contraseña</span>
          <input type={tipo} value={nueva} onChange={(e) => setNueva(e.target.value)} required autoComplete="new-password" maxLength={72} />
          <small>Mínimo 8 caracteres, con mayúscula, minúscula y número.</small>
        </label>
        <label className="pf-field">
          <span>Confirmar nueva contraseña</span>
          <input type={tipo} value={confirmar} onChange={(e) => setConfirmar(e.target.value)} required autoComplete="new-password" maxLength={72} />
        </label>
        <label className="pf-check">
          <input type="checkbox" checked={ver} onChange={(e) => setVer(e.target.checked)} />
          Mostrar contraseñas
        </label>
        <div className="pf-form-actions">
          <button className="pf-btn" disabled={saving}>{saving ? 'Guardando…' : 'Actualizar contraseña'}</button>
        </div>
      </form>
    </div>
  );
}
