import { useState, useRef, type FormEvent, type ChangeEvent, type KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import PrincipalWrapper from '../../components/principal/PrincipalWrapper';
import AuthTopbar from '../../components/principal/AuthTopbar';

export default function RecoverPage() {
  const navigate = useNavigate();
  
  // Estados para manejar el flujo
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  
  // Estados para las contraseñas
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Estados de interfaz
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ==========================================
  // LÓGICA DE FUERZA DE CONTRASEÑA
  // ==========================================
  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (!pass) return { score: 0, color: '#e2e8f0', width: '0%' }; // Gris por defecto
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;

    switch (score) {
      case 1: return { score, color: '#ef4444', width: '25%' }; // Rojo
      case 2: return { score, color: '#f97316', width: '50%' }; // Naranja
      case 3: return { score, color: '#eab308', width: '75%' }; // Amarillo
      case 4: return { score, color: '#0ea5e9', width: '100%' }; // Azul (como en la imagen)
      default: return { score: 0, color: '#e2e8f0', width: '0%' };
    }
  };

  const strengthInfo = getPasswordStrength(password);
  const isPasswordValid = strengthInfo.score === 4;
  const isConfirmDirty = confirmPassword.length > 0;
  const passwordsMatch = password === confirmPassword;
  const showMismatchError = isConfirmDirty && !passwordsMatch;

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
      setStep(2); 
    } catch (err) {
      let errorMessage = err instanceof Error ? err.message : 'Error al enviar el correo';
      if (
        errorMessage.includes('stream_socket_client') || 
        errorMessage.includes('smtp.gmail.com') || 
        errorMessage.includes('Connection could not be established') ||
        errorMessage.includes('Failed to fetch')
      ) {
        errorMessage = 'No hay conexión a internet o el servidor de correos no responde. Por favor, intenta de nuevo.';
      }

      setError(errorMessage);
      setTimeout(() => setError(''), 4000);
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // PASO 2: Manejo de código y Verificación
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
      await apiFetch('/verificar-codigo', {
        method: 'POST',
        body: JSON.stringify({ correo_u: email, token: fullCode }),
      });
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'El código ingresado es incorrecto');
      setTimeout(() => setError(''), 4000);
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // PASO 3: Restablecer Contraseña
  // ==========================================
  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    
    if (!isPasswordValid) {
      setError('La contraseña debe cumplir con todos los requisitos de seguridad.');
      setTimeout(() => setError(''), 4000);
      return;
    }

    if (!passwordsMatch) {
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
      
      setSuccessMsg('¡Contraseña actualizada con éxito! Redirigiendo...');
      setTimeout(() => {
        setCode(['', '', '', '', '', '']);
        setPassword('');
        setConfirmPassword('');
        navigate('/login');
      }, 2500);

    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error al restablecer la contraseña';
      setError(errMsg);
      if (errMsg.toLowerCase().includes('expir') || errMsg.toLowerCase().includes('incorrecto') || errMsg.toLowerCase().includes('inválido')) {
        setTimeout(() => {
          setCode(['', '', '', '', '', '']);
          setPassword('');
          setConfirmPassword('');
          navigate('/login');
        }, 3500); 
      } else {
        setTimeout(() => setError(''), 4000);
      }
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
              <li><span className="feat-ico"><i className="ti ti-mail" /></span>Verificación por código.</li>
              <li><span className="feat-ico"><i className="ti ti-refresh" /></span>Cambio de contraseña inmediato.</li>
              <li><span className="feat-ico"><i className="ti ti-shield-check" /></span>Tu cuenta siempre protegida.</li>
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
                  <Link to="/login" className="link-accent">← Volver a iniciar sesión</Link>
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
                        onFocus={(e) => e.target.select()}
                        className="form-input code-input"
                        style={{
                          width: '50px', height: '60px', textAlign: 'center', fontSize: '1.5rem',
                          padding: '0', borderRadius: '8px', backgroundColor: '#ffffff'
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
                  Cambia tu contraseña
                </h2>
                <p className="auth-subheading" style={{ textAlign: 'left', marginBottom: '30px' }}>
                  Ingresa una contraseña válida y segura para tu cuenta
                </p>

                {/* NUEVA CONTRASEÑA */}
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label" htmlFor="password">
                    Nueva contraseña <span className="req">*</span>
                  </label>
                  
                  {/* Contenedor relativo solo para el input y el botón */}
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      className="form-input"
                      placeholder="••••••••••••"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{
                        borderColor: password.length > 0 ? (isPasswordValid ? '#22c55e' : strengthInfo.color) : '',
                        borderWidth: password.length > 0 ? '2px' : '1px',
                        width: '100%',
                        paddingRight: '45px' // Espacio para que el texto no pise el ojito
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ 
                        position: 'absolute', 
                        right: '12px', 
                        top: '50%', // Lo baja a la mitad exacta del input
                        transform: 'translateY(-50%)', // Lo centra perfectamente
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
                  
                  {/* BARRA DE FUERZA DE CONTRASEÑA */}
                  <div style={{ height: '4px', width: '100%', backgroundColor: '#e2e8f0', marginTop: '10px', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      height: '100%', 
                      width: strengthInfo.width, 
                      backgroundColor: strengthInfo.color, 
                      transition: 'all 0.4s ease' 
                    }} />
                  </div>
                  
                  {!isPasswordValid && (
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>
                      Mínimo 8 caracteres, una mayúscula, una minúscula y un número.
                    </p>
                  )}
                </div>

                {/* CONFIRMAR CONTRASEÑA */}
                <div className="form-group">
                  <label className="form-label" htmlFor="confirmPassword">
                    Confirmar Contraseña <span className="req">*</span>
                  </label>
                  
                  {/* Contenedor relativo solo para el input y el botón */}
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      className="form-input"
                      placeholder="••••••••••••"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      style={{
                        borderColor: showMismatchError ? '#ef4444' : (isConfirmDirty && passwordsMatch && isPasswordValid ? '#22c55e' : ''),
                        borderWidth: isConfirmDirty ? '2px' : '1px',
                        width: '100%',
                        paddingRight: '45px' // Espacio para que el texto no pise el ojito
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{ 
                        position: 'absolute', 
                        right: '12px', 
                        top: '50%', // Lo baja a la mitad exacta del input
                        transform: 'translateY(-50%)', // Lo centra perfectamente
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
                      <i className={showConfirmPassword ? 'ti ti-eye-off' : 'ti ti-eye'} />
                    </button>
                  </div>
                  
                  {/* MENSAJE DE ERROR SI NO COINCIDEN */}
                  {showMismatchError && (
                    <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '8px', lineHeight: '1.4' }}>
                      <strong>⚠️ Las contraseñas no coinciden.</strong><br/>
                      Debe coincidir exactamente con la nueva contraseña.
                    </div>
                  )}
                </div>

                <button type="submit" className="form-submit" disabled={loading} style={{ width: '100%', marginTop: '15px' }}>
                  {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
                </button>
                
                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                  <Link 
                    to="/login" 
                    className="link-accent" 
                    onClick={() => {
                      setCode(['', '', '', '', '', '']);
                      setPassword('');
                      setConfirmPassword('');
                    }}
                    style={{ textDecoration: 'none', fontSize: '0.95rem' }}
                  >
                    ← Volver a iniciar sesión
                  </Link>
                </div>
              </form>
            )}

          </div>
        </main>
      </div>

      {/* TOAST DE ÉXITO Y ERROR ANIMADOS */}
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
              animation: `shrinkBar ${error ? '4s' : '2.5s'} linear forwards` 
            }} />
          </div>
        </>
      )}

    </PrincipalWrapper>
  );
}