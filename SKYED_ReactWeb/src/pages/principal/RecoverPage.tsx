import { useState, useRef, type FormEvent, type ChangeEvent, type KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../services/api';


export default function RecuperarPage() {
  const navigate = useNavigate();
  
  // Estados para manejar el flujo
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Referencias para los 6 inputs del código
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Función Paso 1: Enviar el correo
  async function handleSendEmail(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Asegúrate de apuntar a la ruta correcta de tu AuthController
      await apiFetch('/enviar-codigo-recuperacion', {
        method: 'POST',
        body: JSON.stringify({ correo_u: email }),
      });
      setStep(2); // Cambia la pantalla al Paso 2 (Ingresar Código)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar el correo');
    } finally {
      setLoading(false);
    }
  }

  // Manejo de los 6 inputs para que salten automáticamente
  const handleChangeCode = (index: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return; // Solo permite números
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Salto automático al siguiente input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Borrar y retroceder con Backspace
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Función Paso 2: Verificar el código
  async function handleVerifyCode(e: FormEvent) {
    e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length < 6) {
      setError('Debes ingresar los 6 dígitos');
      return;
    }
    
    // Aquí puedes redirigir a la página de "Nueva Contraseña"
    // Pasando el token y el email por la URL o estado
    navigate(`/reset-password?token=${fullCode}&email=${email}`);
  }

  return (
    <div className="auth-grid">
      {/* ... Tu aside (lado izquierdo) ... */}

      <main className="auth-main">
        <div className="auth-card">
          {step === 1 ? (
            /* ================= PASO 1: PEDIR CORREO ================= */
            <form onSubmit={handleSendEmail}>
              <h2>Recupera tu ACCESO</h2>
              <p>Te enviaremos un código de 6 dígitos a tu correo...</p>
              
              {error && <div className="error">{error}</div>}

              <div className="form-group">
                <label htmlFor="email">Correo electrónico</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <button type="submit" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar código'}
              </button>
            </form>
          ) : (
            /* ================= PASO 2: INGRESAR CÓDIGO ================= */
            <form onSubmit={handleVerifyCode}>
              <h2>Verifica el código</h2>
              <p>Enviamos un código a <strong>{email}</strong></p>

              {error && <div className="error">{error}</div>}

              <div style={{ display: 'flex', gap: '10px', margin: '20px 0' }}>
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
                  style={{
                    width: '40px', height: '50px', textAlign: 'center', 
                    fontSize: '1.5rem', borderRadius: '8px', border: '1px solid #ccc'
                  }}
                />
                ))}
              </div>

              <button type="submit">Verificar código</button>
              
              <button type="button" onClick={() => setStep(1)} style={{ marginTop: '15px' }}>
                Volver
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}