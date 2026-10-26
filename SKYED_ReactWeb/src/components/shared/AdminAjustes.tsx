import { useEffect, useRef, useState } from 'react';
import { Camera, Check, Eye, EyeOff, Loader2, Moon, RotateCcw, Sun } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { FONT_SIZES, useAccessibility } from '../../context/AccessibilityContext';
import { apiFetch } from '../../services/api';
import { prepararImagen } from '../../utils/prepararImagen';
import { errorContrasena } from '../../utils/validaciones';
import '../../styles/shared/adminAjustes.css';

type Mensaje = { tipo: 'ok' | 'error'; texto: string; id: number };

const MODULOS = {
  deportivo: { nombre: 'SKYED Deportivo', rol: 'Administrador deportivo', rolTecnico: 'adminDeportivo' },
  social: { nombre: 'SkyedSocial', rol: 'Administrador social', rolTecnico: 'adminSocial' },
} as const;

/**
 * Sección "Ajustes" de los paneles de administración. La usan los dos
 * paneles (Deportivo y Social): cada uno la monta con su `modulo` y toma
 * su propia paleta (--admin-*), su etiqueta de rol y sus botones.
 * Guarda los datos del administrador con el mismo endpoint del perfil
 * de participante (PUT /perfil), así que no necesita backend nuevo.
 */
export default function AdminAjustes({ modulo }: { modulo: 'deportivo' | 'social' }) {
  const { user, updateProfile, updateFotoUrl } = useAuth();
  const { darkMode, toggleDark, fontSize, setFontSize, dyslexia, setDyslexia, reset } = useAccessibility();
  const info = MODULOS[modulo];

  const partes = (user?.name || '').split(' ');
  const iniciales = partes.filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || 'AD';

  // ---- Datos personales ----
  const [nombre, setNombre] = useState(partes[0] || '');
  const [apellido, setApellido] = useState(partes.slice(1).join(' ') || '');
  const [correo, setCorreo] = useState(user?.email || '');
  const [telefono, setTelefono] = useState(user?.telefono || '');
  const [ciudad, setCiudad] = useState(user?.ciudad || '');
  const [tipoDocumento, setTipoDocumento] = useState(user?.tipo_documento || '');
  const [documento, setDocumento] = useState(user?.documento || '');
  const [rh, setRh] = useState(user?.rh || '');
  const [fechaNacimiento, setFechaNacimiento] = useState((user?.fecha_nacimiento || '').slice(0, 10));
  const [datosMsg, setDatosMsg] = useState<Mensaje | null>(null);
  const [guardandoDatos, setGuardandoDatos] = useState(false);

  // ---- Foto ----
  const fileRef = useRef<HTMLInputElement>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(user?.foto_url ?? null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  // ---- Contraseña ----
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [ver, setVer] = useState({ actual: false, nueva: false, confirmar: false });
  const [passMsg, setPassMsg] = useState<Mensaje | null>(null);
  const [enviandoPass, setEnviandoPass] = useState(false);

  // Los avisos se apagan solos a los 4 s.
  useEffect(() => {
    if (!datosMsg) return;
    const t = setTimeout(() => setDatosMsg(null), 4000);
    return () => clearTimeout(t);
  }, [datosMsg]);
  useEffect(() => {
    if (!passMsg) return;
    const t = setTimeout(() => setPassMsg(null), 4000);
    return () => clearTimeout(t);
  }, [passMsg]);

  const aviso = (tipo: Mensaje['tipo'], texto: string): Mensaje => ({ tipo, texto, id: Date.now() });

  const cambiarFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const original = e.target.files?.[0];
    e.target.value = '';
    if (!original) return;
    if (!original.type.startsWith('image/')) {
      setDatosMsg(aviso('error', 'El archivo debe ser una imagen.'));
      return;
    }
    const file = await prepararImagen(original);
    if (file.size > 3 * 1024 * 1024) {
      setDatosMsg(aviso('error', 'La imagen no debe superar 3MB.'));
      return;
    }
    const anterior = fotoUrl;
    setFotoUrl(URL.createObjectURL(file));
    setSubiendoFoto(true);
    try {
      const formData = new FormData();
      formData.append('foto', file);
      const data = await apiFetch('/perfil/foto', { method: 'POST', body: formData });
      if (data?.foto_url) {
        setFotoUrl(data.foto_url);
        updateFotoUrl(data.foto_url);
      }
      setDatosMsg(aviso('ok', 'Foto de perfil actualizada.'));
    } catch (err: any) {
      setFotoUrl(anterior);
      setDatosMsg(aviso('error', err.message || 'No se pudo subir la foto.'));
    } finally {
      setSubiendoFoto(false);
    }
  };

  const guardarDatos = async (e: React.FormEvent) => {
    e.preventDefault();
    setDatosMsg(null);
    setGuardandoDatos(true);
    try {
      await updateProfile({
        nombre_u: nombre || undefined,
        apellido_u: apellido || undefined,
        correo_u: correo || undefined,
        telefono_u: telefono || undefined,
        ciudad_u: ciudad || undefined,
        tipo_documento_u: tipoDocumento || undefined,
        documento_u: documento ? Number(documento) : undefined,
        rh_u: rh || undefined,
        fecha_nacimiento_u: fechaNacimiento || undefined,
      });
      setDatosMsg(aviso('ok', 'Datos actualizados correctamente.'));
    } catch (err: any) {
      setDatosMsg(aviso('error', err.message || 'No se pudieron actualizar los datos.'));
    } finally {
      setGuardandoDatos(false);
    }
  };

  const cambiarContrasena = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);
    const motivo = errorContrasena(nueva);
    if (motivo) return setPassMsg(aviso('error', motivo));
    if (nueva === actual) return setPassMsg(aviso('error', 'La nueva contraseña no puede ser igual a la actual.'));
    if (nueva !== confirmar) return setPassMsg(aviso('error', 'Las contraseñas no coinciden.'));
    setEnviandoPass(true);
    try {
      await apiFetch('/cambiar-contrasena', {
        method: 'PUT',
        body: JSON.stringify({
          contrasena_actual: actual,
          nueva_contrasena: nueva,
          nueva_contrasena_confirmation: confirmar,
        }),
      });
      setPassMsg(aviso('ok', 'Contraseña actualizada correctamente.'));
      setActual('');
      setNueva('');
      setConfirmar('');
    } catch (err: any) {
      setPassMsg(aviso('error', err.message || 'No se pudo actualizar la contraseña.'));
    } finally {
      setEnviandoPass(false);
    }
  };

  const campoClave = (
    id: 'actual' | 'nueva' | 'confirmar',
    etiqueta: string,
    valor: string,
    set: (v: string) => void,
  ) => (
    <label className="adm-set-field">
      <span>{etiqueta}</span>
      <div className="adm-set-pass">
        <input
          type={ver[id] ? 'text' : 'password'}
          value={valor}
          onChange={(e) => set(e.target.value)}
          required
          autoComplete={id === 'actual' ? 'current-password' : 'new-password'}
        />
        <button
          type="button"
          onClick={() => setVer((v) => ({ ...v, [id]: !v[id] }))}
          aria-label={ver[id] ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          tabIndex={-1}
        >
          {ver[id] ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </label>
  );

  const alerta = (m: Mensaje | null) =>
    m && (
      <div className={`adm-set-alert ${m.tipo}`} key={m.id} role="status">
        {m.texto}
      </div>
    );

  return (
    <section className={`adm-set adm-set-${modulo}`}>
      <div className="adm-set-col adm-set-side">
        <div className="admin-card adm-set-profile">
          <div className="adm-set-avatar-wrap">
            {fotoUrl ? (
              <img src={fotoUrl} alt="Foto de perfil" className="adm-set-avatar" />
            ) : (
              <div className="adm-set-avatar">{iniciales}</div>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={cambiarFoto} hidden />
            <button
              type="button"
              className="adm-set-avatar-edit"
              onClick={() => fileRef.current?.click()}
              disabled={subiendoFoto}
              aria-label="Cambiar foto de perfil"
              title="Cambiar foto de perfil"
            >
              {subiendoFoto ? <Loader2 size={15} className="admin-spin" /> : <Camera size={15} />}
            </button>
          </div>
          <strong className="adm-set-name">{user?.name}</strong>
          <span className="adm-set-pill">{info.rol}</span>
          <span className="adm-set-mail">{user?.email}</span>
        </div>

        <div className="admin-card adm-set-card">
          <h3 className="adm-set-title">Cuenta</h3>
          <dl className="adm-set-facts">
            <div><dt>Panel</dt><dd>{info.nombre}</dd></div>
            <div><dt>Rol</dt><dd>{info.rolTecnico}</dd></div>
            <div><dt>Documento</dt><dd>{user?.documento ? `${user.tipo_documento || ''} ${user.documento}`.trim() : '—'}</dd></div>
            <div><dt>Teléfono</dt><dd>{user?.telefono || '—'}</dd></div>
            <div><dt>Ciudad</dt><dd>{user?.ciudad || '—'}</dd></div>
          </dl>
        </div>
      </div>

      <div className="adm-set-col adm-set-main">
        <form className="admin-card adm-set-card" onSubmit={guardarDatos}>
          <h3 className="adm-set-title">Datos personales</h3>
          <div className="adm-set-grid">
            <label className="adm-set-field">
              <span>Nombre</span>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            </label>
            <label className="adm-set-field">
              <span>Apellido</span>
              <input value={apellido} onChange={(e) => setApellido(e.target.value)} required />
            </label>
            <label className="adm-set-field adm-set-wide">
              <span>Correo</span>
              <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
            </label>
            <label className="adm-set-field">
              <span>Tipo de documento</span>
              <select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)}>
                <option value="">Seleccionar...</option>
                <option value="CC">Cédula de ciudadanía</option>
                <option value="TI">Tarjeta de identidad</option>
                <option value="CE">Cédula de extranjería</option>
                <option value="PA">Pasaporte</option>
              </select>
            </label>
            <label className="adm-set-field">
              <span>Número de documento</span>
              <input
                inputMode="numeric"
                value={documento}
                onChange={(e) => setDocumento(e.target.value.replace(/\D/g, ''))}
              />
            </label>
            <label className="adm-set-field">
              <span>Teléfono</span>
              <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Ej: 3001234567" />
            </label>
            <label className="adm-set-field">
              <span>Ciudad</span>
              <input value={ciudad} onChange={(e) => setCiudad(e.target.value)} placeholder="Ej: Sogamoso" />
            </label>
            <label className="adm-set-field">
              <span>Fecha de nacimiento</span>
              <input type="date" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} />
            </label>
            <label className="adm-set-field">
              <span>Tipo de sangre (RH)</span>
              <select value={rh} onChange={(e) => setRh(e.target.value)}>
                <option value="">Seleccionar...</option>
                {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
          </div>
          {alerta(datosMsg)}
          <div className="adm-set-actions">
            <button className="primary-btn" disabled={guardandoDatos}>
              {guardandoDatos ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>

        <form className="admin-card adm-set-card" onSubmit={cambiarContrasena}>
          <h3 className="adm-set-title">Seguridad</h3>
          <div className="adm-set-grid">
            <div className="adm-set-wide">{campoClave('actual', 'Contraseña actual', actual, setActual)}</div>
            {campoClave('nueva', 'Nueva contraseña', nueva, setNueva)}
            {campoClave('confirmar', 'Confirmar nueva contraseña', confirmar, setConfirmar)}
          </div>
          <p className="adm-set-hint">Mínimo 8 caracteres, con mayúscula, minúscula y número.</p>
          {alerta(passMsg)}
          <div className="adm-set-actions">
            <button className="secondary-btn" disabled={enviandoPass}>
              {enviandoPass ? 'Actualizando…' : 'Actualizar contraseña'}
            </button>
          </div>
        </form>

        
      </div>
    </section>
  );
}
