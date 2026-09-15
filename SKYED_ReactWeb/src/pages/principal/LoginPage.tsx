import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import PrincipalWrapper from '../../components/principal/PrincipalWrapper';
import AuthTopbar from '../../components/principal/AuthTopbar';

export default function LoginPage() {
  const navigate = useNavigate();

  // Estados del formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Estados para alertas y carga
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ==========================================
  // FUNCIÓN DE LOGIN
  // ==========================================
  async function handleLogin(e: FormEvent) {
    e.preventDefault();

    // Pequeña validación antes de enviar
    if (!email || !password) {
      setError('Por favor, completa todos los campos.');
      setTimeout(() => setError(''), 4000);
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Llamada a tu API de login (Asegúrate de que la ruta sea '/login' en tu backend)
      const response = await apiFetch('/login', {
        method: 'POST',
        body: JSON.stringify({ 
          correo_u: email, 
          contrasena_u: password 
        }),
      });

      // AQUÍ: Si tu backend devuelve un token, deberías guardarlo (ej. localStorage.setItem('token', response.token))

      setSuccessMsg('¡Inicio de sesión exitoso! Redirigiendo...');
      
      // Redirigimos después de 2 segundos para que el usuario alcance a ver la alerta verde
      setTimeout(() => {
        navigate('/'); // Cambia '/' por la ruta a la que quieras enviarlo (ej. '/dashboard')
      }, 2000);

    } catch (err) {
      // Manejo de errores amigable
      const errMsg = err instanceof Error ? err.message : 'Error desconocido';
      
      if (errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError')) {
        setError('No hay conexión a internet. Por favor, intenta de nuevo.');
      } else {
        setError('Correo o contraseña incorrectos. Verifica tus datos.');
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
        {/* =========================================
            LADO IZQUIERDO (ASIDE) CON TU DISEÑO
        ========================================== */}
        <aside className="auth-aside">
          <div className="aside-blob aside-blob--purple" />
          <div className="aside-blob aside-blob--blue" />
          <div className="aside-blob aside-blob--gold" />

          <div className="aside-content">
            <span className="aside-eyebrow">
              <i className="ti ti-calendar" />
              &nbsp; EVENTOS
            </span>

            <h1 className="aside-title">
              Bienvenido de vuelta a <br />
              <span className="hl">SKYED</span>
            </h1>

            <p className="aside-subtitle">
              Accede a tu cuenta para inscribirte en eventos, gestionar tus
              entradas y consultar el estado de tus resultados.
            </p>

            <ul className="aside-features">
              <li>
                <span className="feat-ico"><i className="ti ti-calendar-event" /></span>
                Calendario completo de eventos en tiempo real
              </li>
              <li>
                <span className="feat-ico"><i className="ti ti-ticket" /></span>
                Historial de inscripciones y facturas
              </li>
              <li>
                <span className="feat-ico"><i className="ti ti-users" /></span>
                Comunidad de más de 25.000 ciclistas
              </li>
            </ul>
          </div>
        </aside>

        {/* =========================================
            LADO DERECHO (MAIN) FORMULARIO DE LOGIN
        ========================================== */}
        <main className="auth-main">
          <div className="auth-card">
            <form onSubmit={handleLogin} noValidate>
              <h2 className="auth-heading" style={{ textAlign: 'left', marginBottom: '8px' }}>
                Iniciar sesión
              </h2>
              <p className="auth-subheading" style={{ textAlign: 'left', marginBottom: '30px' }}>
                Ingresa tus credenciales para continuar.
              </p>

              {/* INPUT CORREO */}
              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  Correo electrónico <span className="req">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  className="form-input"
                  placeholder="tucorreo@ejemplo.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {/* INPUT CONTRASEÑA */}
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label" htmlFor="password">
                  Contraseña <span className="req">*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    className="form-input"
                    placeholder="••••••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ width: '100%', paddingRight: '45px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ 
                      position: 'absolute', 
                      right: '12px', 
                      top: '50%', 
                      transform: 'translateY(-50%)', 
                      background: 'none', 
                      border: 'none', 
                      cursor: 'pointer', 
                      color: '#64748b', 
                      fontSize: '1.4rem',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0
                    }}
                  >
                    <i className={showPassword ? 'ti ti-eye-off' : 'ti ti-eye'} />
                  </button>
                </div>
              </div>

              {/* RECORDARME & OLVIDÉ CONTRASEÑA */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', fontSize: '0.9rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#475569' }}>
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#a855f7' }}
                  />
                  Recordarme
                </label>
                <Link to="/recuperar" className="link-accent" style={{ textDecoration: 'none', fontWeight: '500' }}>
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              {/* BOTÓN SUBMIT */}
              <button type="submit" className="form-submit" disabled={loading} style={{ width: '100%', marginTop: '10px' }}>
                {loading ? 'Iniciando...' : 'Iniciar sesión →'}
              </button>
            </form>
          </div>
        </main>
      </div>

      {/* =========================================
          TOAST DE ÉXITO Y ERROR ANIMADOS
      ========================================== */}
      {(error || successMsg) && (
        <>
          <style>
            {`
              @keyframes shrinkBar { from { width: 100%; } to { width: 0%; } }
              @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            `}
          </style>
          <div style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            zIndex: 9999,
            overflow: 'hidden',
            minWidth: '300px',
            animation: 'slideIn 0.3s ease-out forwards'
          }}>
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 24px', 
              borderLeft: `4px solid ${error ? '#ef4444' : '#22c55e'}` 
            }}>
              <span style={{ fontSize: '1.2rem' }}>{error ? '⚠️' : '✅'}</span>
              <span style={{ color: '#1e293b', fontSize: '0.95rem', fontWeight: '500' }}>
                {error || successMsg}
              </span>
            </div>
            <div style={{ 
              height: '4px', backgroundColor: error ? '#ef4444' : '#22c55e', 
              animation: `shrinkBar ${error ? '4s' : '2s'} linear forwards` 
            }} />
          </div>
        </>
      )}

    </PrincipalWrapper>
  );
}