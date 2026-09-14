import { useState, useRef, type FormEvent, type ChangeEvent, type KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import PrincipalWrapper from '../../components/principal/PrincipalWrapper';
import AuthTopbar from '../../components/principal/AuthTopbar';

export default function RecoverPage() {
  const navigate = useNavigate();
  
  // Estados para manejar el flujo (Ahora son 3 pasos)
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  
  // Estados para las contraseñas (Paso 3)
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Estados de interfaz
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState(''); // Para mostrar éxito al final

  // Referencias para los 6 inputs del código
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ==========================================
  // PASO 1: Enviar el correo
  // ==========================================
  async function handleSendEmail(e: FormEvent) {
    e.preventDefault();
    if (!email) {
      setError('Por favor, ingresa tu correo electrónico.');
      setTimeout(() => setError(''), 4000);
      return;
    }

    setError('');
    setLoading(true);

    try {
      await apiFetch('/enviar-codigo-recuperacion', {
        method: 'POST',
        body: JSON.stringify({ correo_u: email }),
      });
      setStep(2); // Avanza al Paso 2
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar el correo');
      setTimeout(() => setError(''), 4000);
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // PASO 2: Manejo de los 6 inputs y Verificación
  // ==========================================
  const handleChangeCode = (index: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  async function handleVerifyCode(e: FormEvent) {
    e.preventDefault();
    const fullCode = code.join('');
    
    if (fullCode.length < 6) {
      setError('Debes ingresar los 6 dígitos completos.');
      setTimeout(() => setError(''), 4000);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Le preguntamos al backend si el código es real
      await apiFetch('/verificar-codigo', {
        method: 'POST',
        body: JSON.stringify({ 
          correo_u: email, 
          token: fullCode 
        }),
      });
      
      // Si no hay error (código 200), avanzamos al Paso 3
      setStep(3);
      
    } catch (err) {
      // Si el backend dice que es incorrecto, mostramos el Toast rojo
      setError(err instanceof Error ? err.message : 'El código ingresado es incorrecto');
      setTimeout(() => setError(''), 4000);
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // PASO 3: Enviar la Nueva Contraseña
  // ==========================================
  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      setTimeout(() => setError(''), 4000);
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      setTimeout(() => setError(''), 4000);
      return;
    }

    setLoading(true);
    try {
      await apiFetch('/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          correo_u: email,
          token: code.join(''),
          contrasena_u: password,
          contrasena_u_confirmation: confirmPassword
        }),
      });
      
      // Mostrar éxito y redirigir al login después de un momento
      setSuccessMsg('¡Contraseña actualizada con éxito! Redirigiendo...');
      setTimeout(() => {
        navigate('/login');
      }, 2500);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al restablecer la contraseña');
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
          <div className="aside-blob aside-blob--purple" />
          <div className="aside-blob aside-blob--blue" />
          <div className="aside-blob aside-blob--gold" />

          <div className="aside-content">
            <span className="aside-eyebrow">
              <i className="ti ti-calendar" />
              &nbsp; EVENTOS
            </span>

            <h1 className="aside-title">
              Recupera tu <span className="hl">ACCESO</span>
            </h1>

            <p className="aside-subtitle">
              Te enviaremos un código de 6 dígitos a tu correo para restablecer
              tu contraseña de forma segura.
            </p>

            <ul className="aside-features">
              <li>
                <span className="feat-ico"><i className="ti ti-mail" /></span>
                Verificación por código.
              </li>
              <li>
                <span className="feat-ico"><i className="ti ti-refresh" /></span>
                Cambio de contraseña inmediato.
              </li>
              <li>
                <span className="feat-ico"><i className="ti ti-shield-check" /></span>
                Tu cuenta siempre protegida.
              </li>
            </ul>

            <div style={{ marginTop: 'auto', backgroundColor: '#fff', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden' }}>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#eab308', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                  Tu próximo evento
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#1e293b' }}>
                  Feria SKYED
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                  Acceso general · Válido con tu cuenta
                </div>
              </div>
              <div style={{ transform: 'rotate(-90deg)', fontSize: '0.8rem', fontWeight: 'bold', color: '#3b82f6', letterSpacing: '2px' }}>
                #SKYED
              </div>
            </div>
          </div>
        </aside>

        <main className="auth-main">
          <div className="auth-card">
            
            {step === 1 && (
              <form onSubmit={handleSendEmail} noValidate>
                <h2 className="auth-heading" style={{ textAlign: 'left', marginBottom: '8px' }}>
                  Olvidé mi contraseña
                </h2>
                <p className="auth-subheading" style={{ textAlign: 'left', marginBottom: '30px' }}>
                  Ingresa el correo asociado a tu cuenta y te enviaremos un código.
                </p>

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

                <button type="submit" className="form-submit" disabled={loading} style={{ width: '100%', marginTop: '10px' }}>
                  {loading ? 'Enviando código...' : 'Enviar código'}
                </button>

                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                  <Link to="/login" className="link-accent">
                    ← Volver a iniciar sesión
                  </Link>
                </div>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleVerifyCode} noValidate>
                <h2 className="auth-heading" style={{ textAlign: 'left', marginBottom: '8px' }}>
                  Verifica el código
                </h2>
                <p className="auth-subheading" style={{ textAlign: 'left', marginBottom: '30px' }}>
                  Enviamos un código a <strong>{email}</strong>
                </p>

                <div className="form-group">
                  <label className="form-label">
                    Ingresa el código de 6 dígitos <span className="req">*</span>
                  </label>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', margin: '20px 0' }}>
                    {code.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el: HTMLInputElement | null) => { inputRefs.current[index] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => handleChangeCode(index, e.target.value)}
                        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => handleKeyDown(index, e)}
                        className="form-input code-input"
                        style={{
                          width: '50px',
                          height: '60px',
                          textAlign: 'center',
                          fontSize: '1.5rem',
                          padding: '0',
                          borderRadius: '8px',
                          backgroundColor: '#ffffff'
                        }}
                      />
                    ))}
                  </div>
                </div>

                <button type="submit" className="form-submit" disabled={loading} style={{ width: '100%', marginTop: '10px' }}>
                  {loading ? 'Verificando...' : 'Verificar código'}
                </button>
                
                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                  <button type="button" onClick={() => setStep(1)} className="link-accent" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.95rem' }}>
                    ← Volver a intentar
                  </button>
                </div>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={handleResetPassword} noValidate>
                <h2 className="auth-heading" style={{ textAlign: 'left', marginBottom: '8px' }}>
                  Nueva contraseña
                </h2>
                <p className="auth-subheading" style={{ textAlign: 'left', marginBottom: '30px' }}>
                  Crea una contraseña segura que no hayas usado antes.
                </p>

                <div className="form-group" style={{ position: 'relative' }}>
                  <label className="form-label" htmlFor="password">
                    Nueva contraseña <span className="req">*</span>
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    className="form-input"
                    placeholder="••••••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '12px', top: '38px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                  >
                    <i className={showPassword ? 'ti ti-eye-off' : 'ti ti-eye'} />
                  </button>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                    Mínimo 8 caracteres, una mayúscula, una minúscula y un número.
                  </p>
                </div>

                <div className="form-group" style={{ position: 'relative' }}>
                  <label className="form-label" htmlFor="confirmPassword">
                    Confirmar contraseña <span className="req">*</span>
                  </label>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    className="form-input"
                    placeholder="••••••••••••"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{ position: 'absolute', right: '12px', top: '38px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                  >
                    <i className={showConfirmPassword ? 'ti ti-eye-off' : 'ti ti-eye'} />
                  </button>
                </div>

                <button type="submit" className="form-submit" disabled={loading} style={{ width: '100%', marginTop: '10px' }}>
                  {loading ? 'Guardando...' : 'Guardar contraseña'}
                </button>
                
                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                  <button type="button" onClick={() => setStep(2)} className="link-accent" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.95rem' }}>
                    ← Volver al código
                  </button>
                </div>
              </form>
            )}

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
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '16px 24px', 
              borderLeft: `4px solid ${error ? '#ef4444' : '#22c55e'}` 
            }}>
              <span style={{ fontSize: '1.2rem' }}>{error ? '⚠️' : '✅'}</span>
              <span style={{ color: '#1e293b', fontSize: '0.95rem', fontWeight: '500' }}>
                {error || successMsg}
              </span>
            </div>
            <div style={{ 
              height: '4px', 
              backgroundColor: error ? '#ef4444' : '#22c55e', 
              animation: `shrinkBar ${error ? '4s' : '2.5s'} linear forwards` 
            }} />
          </div>
        </>
      )}

    </PrincipalWrapper>
  );
}