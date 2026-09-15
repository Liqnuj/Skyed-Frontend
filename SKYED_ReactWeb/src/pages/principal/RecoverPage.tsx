import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import PrincipalWrapper from '../../components/principal/PrincipalWrapper';
import AuthTopbar from '../../components/principal/AuthTopbar';

export default function RecoverPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    setSent(true);
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
          <form className="auth-form" onSubmit={submit}>
            {sent ? (
              <div>
                <h1>Revisa tu correo</h1>
                <p className="lead">Si el correo existe en nuestro sistema, recibirás un código de 6 dígitos para restablecer tu contraseña.</p>
                <div className="auth-footer">
                  <Link to="/login">← Volver a iniciar sesión</Link>
                </div>
              </div>
            ) : (
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

                <button type="submit" className="form-submit">Enviar código</button>

                <div className="auth-footer">
                  <Link to="/login">← Volver a iniciar sesión</Link>
                </div>
              </div>
            )}
          </form>
        </section>
      </div>
    </PrincipalWrapper>
  );
}
