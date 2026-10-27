import { useEffect, useRef, useState } from 'react';
import { Bell, Camera, IdCard, Loader2, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/api';
import { prepararImagen } from '../../utils/prepararImagen';
import { errorContrasena } from '../../utils/validaciones';
import '../../styles/shared/adminAjustes.css';

/**
 * Sección "Ajustes" de los paneles de administración (Social y Deportivo).
 * Es la misma que tiene el participante/cliente en su perfil, pero SIN la
 * opción de eliminar la cuenta. Toma los colores del panel que la contiene
 * (variables --admin-*), así se ve acorde en cada uno.
 */

interface Aviso {
  key: string;
  title: string;
  desc: string;
  /** Valor inicial si el admin nunca lo ha tocado. */
  defecto?: boolean;
}

interface Props {
  /** Avisos propios de cada panel (se guardan por administrador). */
  avisos: Aviso[];
  /** Muestra un mensaje en el toast del panel. */
  notify: (message: string) => void;
}

const TIPOS_DOC = [
  { v: 'CC', l: 'Cédula de ciudadanía' },
  { v: 'TI', l: 'Tarjeta de identidad' },
  { v: 'CE', l: 'Cédula de extranjería' },
  { v: 'PA', l: 'Pasaporte' },
];
const RH = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

/** El backend puede devolver "CC", "cedula" o "cedula_ciudadania". */
function normalizarTipoDoc(tipo: string | null | undefined) {
  const map: Record<string, string> = {
    CC: 'CC', cedula: 'CC', cedula_ciudadania: 'CC',
    TI: 'TI', tarjeta_identidad: 'TI',
    CE: 'CE', cedula_extranjeria: 'CE',
    PA: 'PA', pasaporte: 'PA',
  };
  return tipo ? (map[tipo] ?? '') : '';
}

function soloFecha(f: string | null | undefined) {
  return f ? String(f).slice(0, 10) : '';
}

export default function AdminAjustes({ avisos, notify }: Props) {
  const { user, updateProfile, updateFotoUrl } = useAuth();

  /* ---------- Foto ---------- */
  const fileRef = useRef<HTMLInputElement>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(user?.foto_url ?? null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const iniciales = (user?.name || 'AD').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  const cambiarFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const original = e.target.files?.[0];
    e.target.value = '';
    if (!original) return;
    if (!original.type.startsWith('image/')) {
      notify('El archivo debe ser una imagen.');
      return;
    }
    // Se reduce antes de subir: PHP acepta solo 2 MB por defecto.
    const file = await prepararImagen(original);
    if (file.size > 3 * 1024 * 1024) {
      notify('La imagen no debe superar 3MB.');
      return;
    }
    const anterior = fotoUrl;
    setFotoUrl(URL.createObjectURL(file));
    setSubiendoFoto(true);
    const fd = new FormData();
    fd.append('foto', file);
    try {
      const data = await apiFetch('/perfil/foto', { method: 'POST', body: fd });
      if (data?.foto_url) {
        setFotoUrl(data.foto_url);
        updateFotoUrl(data.foto_url);
      }
      notify('Foto de perfil actualizada');
    } catch (err) {
      setFotoUrl(anterior);
      notify(err instanceof Error ? err.message : 'No se pudo subir la foto.');
    } finally {
      setSubiendoFoto(false);
    }
  };

  /* ---------- Datos personales ---------- */
  const partes = (user?.name || '').split(' ');
  const [nombre, setNombre] = useState(partes[0] || '');
  const [apellido, setApellido] = useState(partes.slice(1).join(' ') || '');
  const [telefono, setTelefono] = useState(user?.telefono || '');
  const [ciudad, setCiudad] = useState(user?.ciudad || '');
  const [tipoDoc, setTipoDoc] = useState(normalizarTipoDoc(user?.tipo_documento));
  const [documento, setDocumento] = useState(user?.documento || '');
  const [rh, setRh] = useState(user?.rh || '');
  const [fechaNac, setFechaNac] = useState(soloFecha(user?.fecha_nacimiento));
  const [guardando, setGuardando] = useState(false);
  const [errDatos, setErrDatos] = useState<string | null>(null);

  const guardarDatos = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrDatos(null);
    setGuardando(true);
    try {
      await updateProfile({
        nombre_u: nombre || undefined,
        apellido_u: apellido || undefined,
        telefono_u: telefono || undefined,
        ciudad_u: ciudad || undefined,
        tipo_documento_u: tipoDoc || undefined,
        documento_u: documento ? Number(documento) : undefined,
        rh_u: rh || undefined,
        fecha_nacimiento_u: fechaNac || undefined,
      });
      notify('Datos actualizados correctamente');
    } catch (err) {
      setErrDatos(err instanceof Error ? err.message : 'No se pudieron actualizar los datos.');
    } finally {
      setGuardando(false);
    }
  };

  /* ---------- Avisos (por administrador, para no mezclar cuentas) ---------- */
  const prefsKey = `skyed_admin_avisos_${user?.id ?? 'anon'}`;
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(prefsKey);
      if (raw) return JSON.parse(raw);
    } catch { /* sin localStorage: se usan los valores por defecto */ }
    return {};
  });
  const activo = (a: Aviso) => prefs[a.key] ?? a.defecto ?? true;
  const alternar = (a: Aviso) => {
    const next = { ...prefs, [a.key]: !activo(a) };
    setPrefs(next);
    try { localStorage.setItem(prefsKey, JSON.stringify(next)); } catch { /* ignorar */ }
  };

  /* ---------- Contraseña ---------- */
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [ver, setVer] = useState({ actual: false, nueva: false, confirmar: false });
  const [enviando, setEnviando] = useState(false);
  const [errClave, setErrClave] = useState<string | null>(null);

  useEffect(() => { setErrClave(null); }, [actual, nueva, confirmar]);

  const cambiarClave = async (e: React.FormEvent) => {
    e.preventDefault();
    const motivo = errorContrasena(nueva);
    if (motivo) return setErrClave(motivo);
    if (nueva === actual) return setErrClave('La nueva contraseña no puede ser igual a la actual.');
    if (nueva !== confirmar) return setErrClave('Las contraseñas no coinciden.');
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
      notify('Contraseña actualizada correctamente');
      setActual(''); setNueva(''); setConfirmar('');
    } catch (err) {
      setErrClave(err instanceof Error ? err.message : 'No se pudo actualizar la contraseña.');
    } finally {
      setEnviando(false);
    }
  };

  const claveField = (
    id: 'actual' | 'nueva' | 'confirmar',
    label: string,
    value: string,
    set: (v: string) => void,
  ) => (
    <label className="admin-field">
      <span>{label}</span>
      <div className="aj-pass">
        <input
          type={ver[id] ? 'text' : 'password'}
          value={value}
          onChange={(e) => set(e.target.value)}
          required
          autoComplete={id === 'actual' ? 'current-password' : 'new-password'}
        />
        <button
          type="button"
          className="aj-pass-toggle"
          onClick={() => setVer((v) => ({ ...v, [id]: !v[id] }))}
          aria-label={ver[id] ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          tabIndex={-1}
        >
          {ver[id] ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </label>
  );

  return (
    <section className="aj">
      {/* Perfil */}
      <div className="admin-card aj-card aj-profile">
        <div className="aj-avatar-wrap">
          {fotoUrl
            ? <img src={fotoUrl} alt="Foto de perfil" className="aj-avatar" />
            : <div className="aj-avatar aj-avatar-ini">{iniciales}</div>}
          <input ref={fileRef} type="file" accept="image/*" onChange={cambiarFoto} hidden />
          <button
            type="button"
            className="aj-avatar-edit"
            onClick={() => fileRef.current?.click()}
            disabled={subiendoFoto}
            aria-label="Cambiar foto de perfil"
            title="Cambiar foto de perfil"
          >
            {subiendoFoto ? <Loader2 size={15} className="admin-spin" /> : <Camera size={15} />}
          </button>
        </div>
        <div className="aj-profile-info">
          <strong>{user?.name}</strong>
          <span>{user?.email}</span>
          <em>Administrador</em>
        </div>
      </div>

      <div className="aj-grid">
        {/* Datos personales */}
        <div className="admin-card aj-card">
          <div className="aj-head">
            <span className="aj-head-icon"><IdCard size={18} /></span>
            <h3>Datos personales</h3>
          </div>
          <form onSubmit={guardarDatos}>
            <div className="form-grid">
              <label className="admin-field">
                <span>Nombre</span>
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
              </label>
              <label className="admin-field">
                <span>Apellido</span>
                <input value={apellido} onChange={(e) => setApellido(e.target.value)} required />
              </label>
              <label className="admin-field">
                <span>Tipo de documento</span>
                <select value={tipoDoc} onChange={(e) => setTipoDoc(e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {TIPOS_DOC.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
                </select>
              </label>
              <label className="admin-field">
                <span>Número de documento</span>
                <input
                  inputMode="numeric"
                  value={documento}
                  onChange={(e) => setDocumento(e.target.value.replace(/\D/g, ''))}
                />
              </label>
              <label className="admin-field">
                <span>Correo</span>
                <input value={user?.email ?? ''} readOnly disabled title="El correo es tu identificador de acceso" />
              </label>
              <label className="admin-field">
                <span>Teléfono</span>
                <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Ej: 3001234567" />
              </label>
              <label className="admin-field">
                <span>Fecha de nacimiento</span>
                <input type="date" value={fechaNac} onChange={(e) => setFechaNac(e.target.value)} />
              </label>
              <label className="admin-field">
                <span>Tipo de sangre (RH)</span>
                <select value={rh} onChange={(e) => setRh(e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {RH.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>
              <label className="admin-field">
                <span>Ciudad</span>
                <input value={ciudad} onChange={(e) => setCiudad(e.target.value)} placeholder="Ej: Sogamoso" />
              </label>
            </div>
            {errDatos && <p className="aj-error" role="alert">{errDatos}</p>}
            <button className="primary-btn" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </form>
        </div>

        <div className="aj-col">
          {/* Avisos */}
          {avisos.length > 0 && (
            <div className="admin-card aj-card">
              <div className="aj-head">
                <span className="aj-head-icon"><Bell size={18} /></span>
                <h3>Avisos del panel</h3>
              </div>
              {avisos.map((a) => (
                <div className="aj-toggle-row" key={a.key}>
                  <div className="aj-toggle-label">{a.title}<small>{a.desc}</small></div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={activo(a)}
                    aria-label={a.title}
                    className={`aj-toggle${activo(a) ? ' on' : ''}`}
                    onClick={() => alternar(a)}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Seguridad */}
          <div className="admin-card aj-card">
            <div className="aj-head">
              <span className="aj-head-icon"><Lock size={18} /></span>
              <h3>Seguridad</h3>
            </div>
            <form onSubmit={cambiarClave}>
              <div className="aj-stack">
                {claveField('actual', 'Contraseña actual', actual, setActual)}
                {claveField('nueva', 'Nueva contraseña', nueva, setNueva)}
                {claveField('confirmar', 'Confirmar nueva contraseña', confirmar, setConfirmar)}
              </div>
              {errClave && <p className="aj-error" role="alert">{errClave}</p>}
              <button className="secondary-btn" disabled={enviando}>
                {enviando ? 'Actualizando…' : 'Actualizar contraseña'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
