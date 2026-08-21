import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PrincipalWrapper from '../../components/principal/PrincipalWrapper';
import AuthTopbar from '../../components/principal/AuthTopbar';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const from = (location.state as { from?: string } | null)?.from || '/';

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!(await login(email, password))) {
      setError('Completa correo y contraseña.');
      return;
    }
    navigate(from, { replace: true });
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
            <h1 className="aside-title">Bienvenido de vuelta a <span className="hl">SKYED</span></h1>
            <p className="aside-subtitle">
              Accede a tu cuenta para inscribirte en eventos, gestionar tus entradas
              y consultar el estado de tus resultados.
            </p>
            <ul className="aside-features">
              <li><span className="feat-ico"><i className="ti ti-calendar" /></span> Calendario completo de eventos en tiempo real</li>
              <li><span className="feat-ico"><i className="ti ti-ticket" /></span> Historial de inscripciones y facturas</li>
              <li><span className="feat-ico"><i className="ti ti-users" /></span> Comunidad de más de 25.000 ciclistas</li>
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

        <main className="auth-main">
          <div className="auth-card">
            <h2 className="auth-heading">Iniciar sesión</h2>
            <p className="auth-subheading">Ingresa tus credenciales para continuar.</p>

            {error && <div className="form-error error">{error}</div>}

            <form onSubmit={submit} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="email">Correo electrónico<span className="req">*</span></label>
                <div className="input-wrap">
                  <input
                    type="email" id="email" className="form-input" placeholder="tucorreo@gmail.com"
                    autoComplete="email" maxLength={80} required
                    value={email} onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="password">Contraseña<span className="req">*</span></label>
                <div className="input-wrap">
                  <input
                    type={showPass ? 'text' : 'password'} id="password" className="form-input" placeholder="••••••••"
                    autoComplete="current-password" maxLength={50}
                    value={password} onChange={(e) => setPassword(e.target.value)}
                  />
                  <button type="button" className="toggle-pass" aria-label="Mostrar contraseña" onClick={() => setShowPass((s) => !s)}>👁</button>
                </div>
              </div>

              <div className="row-between">
                <label className="remember-row">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  Recordarme
                </label>
                <Link to="/recuperar" className="link-accent">¿Olvidaste tu contraseña?</Link>
              </div>

              <button type="submit" className="form-submit">
                Iniciar sesión <i className="ti ti-arrow-right" />
              </button>

              <div className="form-divider">o</div>

              <p className="form-footer">¿No tienes cuenta? <Link to="/registro" className="link-accent">Regístrate gratis</Link></p>
              <p className="form-footer"><Link to="/" className="link-accent">Volver al inicio</Link></p>
            </form>
          </div>
        </main>
      </div>

      <footer className="footer">
        <span>© 2026 SKYED · Sogamoso, Boyacá, Colombia</span>
        <div className="footer-links">
          <a href="#">Términos</a>
          <a href="#">Privacidad</a>
          <a href="#">Soporte</a>
        </div>
      </footer>
    </PrincipalWrapper>
  );
}
