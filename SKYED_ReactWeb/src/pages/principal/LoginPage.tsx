import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PrincipalWrapper from '../../components/principal/PrincipalWrapper';
import AuthTopbar from '../../components/principal/AuthTopbar';
import TermsModal from '../../components/shared/TermsModal';

const CLAVE_RECORDADO = 'skyed_identificacion_recordada';

function leerRecordado(): string {
  try { return localStorage.getItem(CLAVE_RECORDADO) ?? ''; } catch { return ''; }
}

function guardarRecordado(valor: string | null) {
  try {
    if (valor) localStorage.setItem(CLAVE_RECORDADO, valor);
    else localStorage.removeItem(CLAVE_RECORDADO);
  } catch {}
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [termsOpen, setTermsOpen] = useState(false);

  const valorRecordado = leerRecordado();
  const [identificacion, setIdentificacion] = useState(valorRecordado);
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(Boolean(valorRecordado));
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const from = (location.state as { from?: string } | null)?.from || '/';

  async function submit(e: FormEvent) {
    e.preventDefault();

    if (!identificacion) {
      setError('Por favor, ingresa tu correo o documento.');
      setTimeout(() => setError(''), 4000); return;
    }
    
    if (!password) {
      setError('Por favor, ingresa tu contraseña.');
      setTimeout(() => setError(''), 4000); return;
    }

    setError('');
    setLoading(true);

    try {
      // Pasamos los dos campos al AuthContext
      const success = await login(identificacion, password);

      if (!success) {
        throw new Error('Credenciales incorrectas. Verifica tus datos.');
      }

      guardarRecordado(remember ? identificacion : null);

      setSuccessMsg('¡Inicio de sesión exitoso! Redirigiendo...');
      const queryParams = new URLSearchParams(location.search);
      const redirectUrl = queryParams.get('redirect');
      const finalDestination = redirectUrl ? redirectUrl : from;

      // Redirige mientras la animación muestra "¡Hola, …!"; al desvanecerse
      // ya se ve la página de destino (ver TransicionSesion).
      setTimeout(() => {
        navigate(finalDestination, { replace: true });
      }, 550);

    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error al iniciar sesión';
      if (errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError')) {
        setError('No hay conexión a internet. Por favor, intenta de nuevo.');
      } else {
        setError(errMsg);
      }
      setTimeout(() => setError(''), 4000);
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
            <h1 className="aside-title">Bienvenido de vuelta a <span className="hl">SKYED</span></h1>
            <p className="aside-subtitle">Accede a tu cuenta para inscribirte en eventos, gestionar tus entradas y consultar el estado de tus resultados.</p>
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
              <div className="ticket-stub"><span>PASE</span><strong>#00 SKYED</strong></div>
            </div>
          </div>
        </aside>

        <main className="auth-main">
          <div className="auth-card">
            <h2 className="auth-heading">Iniciar sesión</h2>
            <p className="auth-subheading">Ingresa tus credenciales para continuar.</p>

            <form onSubmit={submit} noValidate>
              
              <div className="form-group">
                <label className="form-label" htmlFor="identificacion">Correo o Documento<span className="req">*</span></label>
                <div className="input-wrap">
                  <input
                    type="text" id="identificacion" className="form-input" placeholder="tucorreo@ejemplo.com o 10000000"
                    maxLength={80} required
                    value={identificacion} onChange={(e) => setIdentificacion(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="password">Contraseña<span className="req">*</span></label>
                <div className="input-wrap" style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'} id="password" className="form-input" placeholder="••••••••"
                    autoComplete="current-password" maxLength={50} required
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    style={{ paddingRight: '45px' }}
                  />
                  <button 
                    type="button" 
                    className="toggle-pass" 
                    onClick={() => setShowPass((s) => !s)}
                    style={{ 
                      position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', 
                      background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', 
                      fontSize: '1.4rem', display: 'flex', alignItems: 'center', padding: 0
                    }}
                  >
                    <i className={showPass ? 'ti ti-eye-off' : 'ti ti-eye'} />
                  </button>
                </div>
              </div>

              <div className="row-between">
                <label className="remember-row">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  Recordarme
                </label>
                <Link to="/recuperar" className="link-accent">¿Olvidaste tu contraseña?</Link>
              </div>

              <button type="submit" className="form-submit" disabled={loading}>
                {loading ? 'Iniciando sesión...' : <>Iniciar sesión <i className="ti ti-arrow-right" /></>}
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
          <button type="button" onClick={() => setTermsOpen(true)}>Términos</button>
          <button type="button" onClick={() => setTermsOpen(true)}>Privacidad</button>
          <a href="#">Soporte</a>
        </div>
      </footer>

      <TermsModal isOpen={termsOpen} onClose={() => setTermsOpen(false)} variant="principal" />

      {(error || successMsg) && (
        <>
          <style>
            {`
              @keyframes shrinkBar { from { width: 100%; } to { width: 0%; } }
              @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            `}
          </style>
          <div style={{
            position: 'fixed', top: '24px', right: '24px', backgroundColor: '#ffffff',
            borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 9999,
            overflow: 'hidden', minWidth: '300px', animation: 'slideIn 0.3s ease-out forwards'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 24px', borderLeft: `4px solid ${error ? '#ef4444' : '#22c55e'}` }}>
              <span style={{ fontSize: '1.2rem' }}>{error ? '⚠️' : '✅'}</span>
              <span style={{ color: '#1e293b', fontSize: '0.95rem', fontWeight: '500' }}>{error || successMsg}</span>
            </div>
            <div style={{ height: '4px', backgroundColor: error ? '#ef4444' : '#22c55e', animation: `shrinkBar ${error ? '4s' : '2s'} linear forwards` }} />
          </div>
        </>
      )}

    </PrincipalWrapper>
  );
}