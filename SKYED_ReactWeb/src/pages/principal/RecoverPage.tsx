import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PrincipalWrapper from '../../components/principal/PrincipalWrapper';
import AuthTopbar from '../../components/principal/AuthTopbar';
import { apiFetch } from '../../services/api';

/**
 * FIX: esta página era puro maquetado — el formulario nunca llamaba
 * al backend, solo mostraba "Revisa tu correo" sin enviar nada. Ahora
 * sí llama a /enviar-codigo y, con el código de 6 dígitos que llega
 * por correo, a /reset-password (los mismos endpoints que ya existían
 * en Laravel, simplemente no estaban conectados desde aquí).
 */
type Paso = 'pedir-correo' | 'pedir-codigo' | 'listo';

export default function RecoverPage() {
  const navigate = useNavigate();

  const [paso, setPaso] = useState<Paso>('pedir-correo');
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function pedirCodigo(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // El backend siempre responde igual exista o no el correo (así
      // no se puede usar esta pantalla para averiguar qué correos
      // están registrados), así que aquí simplemente avanzamos.
      await apiFetch('/enviar-codigo', {
        method: 'POST',
        body: JSON.stringify({ correo_u: email }),
      });
      setPaso('pedir-codigo');
    } catch {
      // Aun si falla la petición, no revelamos si el correo existe;
      // solo pedimos que revise su bandeja de entrada.
      setPaso('pedir-codigo');
    } finally {
      setLoading(false);
    }
  }

  async function restablecer(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (nuevaContrasena !== confirmarContrasena) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await apiFetch('/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          correo_u: email,
          token: codigo,
          contrasena_u: nuevaContrasena,
          contrasena_u_confirmation: confirmarContrasena,
        }),
      });
      setPaso('listo');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'El código ingresado es incorrecto o expiró.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <PrincipalWrapper>
      <AuthTopbar />

      <div className="auth-grid" id="main">
        <aside className="auth-aside">
          <div className="aside-blob aside-blob--blue" />
          <div className="aside-blob aside-blob--purple" />
          <div className="aside-blob aside-blob--gold" />

          <div className="aside-content">
            <span className="aside-eyebrow"><i className="ti ti-calendar-event" />&nbsp; Eventos</span>
            <h1 className="aside-title">Recupera tu <span className="hl">ACCESO</span></h1>
            <p className="aside-subtitle">
              Te enviaremos un código de 6 dígitos a tu correo para restablecer tu contraseña de forma segura.
            </p>
            <ul className="aside-features">
              <li><span className="feat-ico"><i className="ti ti-calendar" /></span>Verificación por código.</li>
              <li><span className="feat-ico"><i className="ti ti-ticket" /></span>Cambio de contraseña inmediato.</li>
              <li><span className="feat-ico"><i className="ti ti-users" /></span> Tu cuenta siempre protegida.</li>
            </ul>
            <div className="ticket-card">
              <div className="ticket-main">
                <div className="ticket-kicker">Tu próximo evento</div>
                <div className="ticket-title">Feria SKYED</div>
                <div className="ticket-meta">Acceso general · Válido con tu cuenta</div>
              </div>
              <div className="ticket-stub">
                <span>PASE</span>
                <strong>#00 SKYED</strong>
              </div>
            </div>
          </div>
        </aside>

        <section className="auth-form-box">
          <form className="auth-form" onSubmit={paso === 'pedir-correo' ? pedirCodigo : restablecer}>
            {error && <div className="form-error error">{error}</div>}

            {paso === 'pedir-correo' && (
              <div>
                <h1>Olvidé mi contraseña</h1>
                <p className="lead">Ingresa el correo asociado a tu cuenta y te enviaremos un código.</p>

                <div className="form-group">
                  <label htmlFor="email">Correo electrónico <span className="req">*</span></label>
                  <input
                    id="email" type="email" required maxLength={80}
                    placeholder="tucorreo@ejemplo.com" autoComplete="email"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <button type="submit" className="form-submit" disabled={loading}>
                  {loading ? 'Enviando...' : 'Enviar código'}
                </button>

                <div className="auth-footer">
                  <Link to="/login">← Volver a iniciar sesión</Link>
                </div>
              </div>
            )}

            {paso === 'pedir-codigo' && (
              <div>
                <h1>Revisa tu correo</h1>
                <p className="lead">Si el correo existe en nuestro sistema, recibirás un código de 6 dígitos. Ingrésalo junto con tu nueva contraseña.</p>

                <div className="form-group">
                  <label htmlFor="codigo">Código de verificación <span className="req">*</span></label>
                  <input
                    id="codigo" type="text" required maxLength={6} inputMode="numeric"
                    placeholder="123456" autoComplete="one-time-code"
                    value={codigo} onChange={(e) => setCodigo(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="nueva">Nueva contraseña <span className="req">*</span></label>
                  <input
                    id="nueva" type="password" required minLength={8} maxLength={50}
                    placeholder="••••••••" autoComplete="new-password"
                    value={nuevaContrasena} onChange={(e) => setNuevaContrasena(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirmar">Confirmar contraseña <span className="req">*</span></label>
                  <input
                    id="confirmar" type="password" required minLength={8} maxLength={50}
                    placeholder="••••••••" autoComplete="new-password"
                    value={confirmarContrasena} onChange={(e) => setConfirmarContrasena(e.target.value)}
                  />
                </div>

                <button type="submit" className="form-submit" disabled={loading}>
                  {loading ? 'Guardando...' : 'Restablecer contraseña'}
                </button>

                <div className="auth-footer">
                  <Link to="/login">← Volver a iniciar sesión</Link>
                </div>
              </div>
            )}

            {paso === 'listo' && (
              <div>
                <h1>¡Contraseña actualizada!</h1>
                <p className="lead">Ya puedes iniciar sesión con tu nueva contraseña.</p>
                <button type="button" className="form-submit" onClick={() => navigate('/login')}>
                  Ir a iniciar sesión
                </button>
              </div>
            )}
          </form>
        </section>
      </div>
    </PrincipalWrapper>
  );
}
