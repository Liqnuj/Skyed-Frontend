import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PrincipalWrapper from '../../components/principal/PrincipalWrapper';
import AuthTopbar from '../../components/principal/AuthTopbar';
import TermsModal from '../../components/TermsModal';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [tipoDocumento, setTipoDocumento] = useState('');
  const [documento, setDocumento] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [fechaNac, setFechaNac] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Indica si el usuario aceptó los términos
  const [terms, setTerms] = useState(false);

  // Indica si la ventana de términos está abierta
  const [termsOpen, setTermsOpen] = useState(false);

  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (!terms) {
      setError('Debes aceptar los términos y condiciones.');
      return;
    }

    try {
      await register(
        `${nombre} ${apellido}`.trim(),
        email,
        password
      );

      navigate('/');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo crear la cuenta.'
      );
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
              <i className="ti ti-sparkles" />
              &nbsp; Únete gratis
            </span>

            <h1 className="aside-title">
              Únete a la{' '}
              <span className="hl">
                comunidad SKYED
              </span>
            </h1>

            <p className="aside-subtitle">
              Crea tu cuenta gratis y obtén acceso a todos
              los beneficios de la plataforma de eventos
              de ciclismo.
            </p>

            <ul className="aside-features">
              <li>
                <span className="feat-ico">
                  <i className="ti ti-bolt" />
                </span>
                Inscripción rápida en eventos
              </li>

              <li>
                <span className="feat-ico">
                  <i className="ti ti-discount-2" />
                </span>
                Descuentos exclusivos para miembros
              </li>

              <li>
                <span className="feat-ico">
                  <i className="ti ti-bell" />
                </span>
                Notificaciones de nuevos eventos
              </li>
            </ul>
          </div>
        </aside>

        <main className="auth-main">
          <div className="auth-card">
            <Link
              to="/login"
              className="auth-back"
            >
              <i className="ti ti-arrow-left" />
              Volver
            </Link>

            <h2 className="auth-heading">
              Crear cuenta
            </h2>

            <p className="auth-subheading">
              Solo te tomará un minuto.
            </p>

            {error && (
              <div className="form-error error">
                {error}
              </div>
            )}

            <form
              onSubmit={submit}
              noValidate
            >
              {/* =========================
                  DOCUMENTO
              ========================== */}

              <div className="form-row">
                <div className="form-group">
                  <label
                    className="form-label"
                    htmlFor="tipoDocumento"
                  >
                    Tipo de documento
                    <span className="req">*</span>
                  </label>

                  <select
                    id="tipoDocumento"
                    className="form-select"
                    required
                    value={tipoDocumento}
                    onChange={(e) =>
                      setTipoDocumento(e.target.value)
                    }
                  >
                    <option value="">
                      Selecciona
                    </option>

                    <option value="cedula_ciudadania">
                      Cédula de ciudadanía
                    </option>

                    <option value="tarjeta_identidad">
                      Tarjeta de identidad
                    </option>

                    <option value="cedula_extranjeria">
                      Cédula de extranjería
                    </option>

                    <option value="pasaporte">
                      Pasaporte
                    </option>
                  </select>
                </div>

                <div className="form-group">
                  <label
                    className="form-label"
                    htmlFor="documento"
                  >
                    Número de documento
                    <span className="req">*</span>
                  </label>

                  <input
                    type="text"
                    id="documento"
                    className="form-input"
                    placeholder={
                      tipoDocumento
                        ? 'Escribe tu número'
                        : 'Selecciona primero el tipo'
                    }
                    maxLength={20}
                    disabled={!tipoDocumento}
                    required
                    value={documento}
                    onChange={(e) =>
                      setDocumento(e.target.value)
                    }
                  />
                </div>
              </div>

              {/* =========================
                  NOMBRE
              ========================== */}

              <div className="form-row">
                <div className="form-group">
                  <label
                    className="form-label"
                    htmlFor="nombre"
                  >
                    Nombre
                    <span className="req">*</span>
                  </label>

                  <input
                    type="text"
                    id="nombre"
                    className="form-input"
                    placeholder="Juan"
                    autoComplete="given-name"
                    required
                    value={nombre}
                    onChange={(e) =>
                      setNombre(e.target.value)
                    }
                  />
                </div>

                <div className="form-group">
                  <label
                    className="form-label"
                    htmlFor="apellido"
                  >
                    Apellido
                    <span className="req">*</span>
                  </label>

                  <input
                    type="text"
                    id="apellido"
                    className="form-input"
                    placeholder="Pérez"
                    autoComplete="family-name"
                    required
                    value={apellido}
                    onChange={(e) =>
                      setApellido(e.target.value)
                    }
                  />
                </div>
              </div>

              <p
                className="form-hint"
                style={{
                  margin: '-0.75rem 0 1.25rem',
                }}
              >
                Solo letras y espacios.
              </p>

              {/* =========================
                  EMAIL
              ========================== */}

              <div className="form-group">
                <label
                  className="form-label"
                  htmlFor="email"
                >
                  Correo electrónico
                  <span className="req">*</span>
                </label>

                <input
                  type="email"
                  id="email"
                  className="form-input"
                  placeholder="tucorreo@ejemplo.com"
                  autoComplete="email"
                  maxLength={80}
                  required
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                />
              </div>

              {/* =========================
                  TELÉFONO Y FECHA
              ========================== */}

              <div className="form-row">
                <div className="form-group">
                  <label
                    className="form-label"
                    htmlFor="telefono"
                  >
                    Teléfono
                    <span className="req">*</span>
                  </label>

                  <input
                    type="text"
                    id="telefono"
                    className="form-input"
                    placeholder="3001234567"
                    inputMode="numeric"
                    maxLength={15}
                    required
                    value={telefono}
                    onChange={(e) =>
                      setTelefono(e.target.value)
                    }
                  />

                  <div className="form-hint">
                    Solo números (7-15)
                  </div>
                </div>

                <div className="form-group">
                  <label
                    className="form-label"
                    htmlFor="fechaNac"
                  >
                    Fecha de nacimiento
                    <span className="req">*</span>
                  </label>

                  <input
                    type="date"
                    id="fechaNac"
                    className="form-input"
                    required
                    value={fechaNac}
                    onChange={(e) =>
                      setFechaNac(e.target.value)
                    }
                  />

                  <div className="form-hint">
                    Debes tener al menos 10 años
                    para registrarte.
                  </div>
                </div>
              </div>

              {/* =========================
                  CONTRASEÑA
              ========================== */}

              <div className="form-group">
                <label
                  className="form-label"
                  htmlFor="password"
                >
                  Contraseña
                  <span className="req">*</span>
                </label>

                <div className="input-wrap">
                  <input
                    type={
                      showPass
                        ? 'text'
                        : 'password'
                    }
                    id="password"
                    className="form-input"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    maxLength={50}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                  />

                  <button
                    type="button"
                    className="toggle-pass"
                    aria-label="Mostrar contraseña"
                    onClick={() =>
                      setShowPass((s) => !s)
                    }
                  >
                    👁
                  </button>
                </div>

                <div className="password-strength">
                  <div
                    className="bar"
                    style={{
                      width: `${Math.min(
                        100,
                        password.length * 12
                      )}%`,
                    }}
                  />
                </div>

                <div className="form-hint">
                  Mínimo 8 caracteres, una mayúscula,
                  una minúscula y un número.
                </div>
              </div>

              {/* =========================
                  CONFIRMAR CONTRASEÑA
              ========================== */}

              <div className="form-group">
                <label
                  className="form-label"
                  htmlFor="password-confirm"
                >
                  Confirmar contraseña
                  <span className="req">*</span>
                </label>

                <div className="input-wrap">
                  <input
                    type={
                      showConfirm
                        ? 'text'
                        : 'password'
                    }
                    id="password-confirm"
                    className="form-input"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    maxLength={50}
                    required
                    value={confirm}
                    onChange={(e) =>
                      setConfirm(e.target.value)
                    }
                  />

                  <button
                    type="button"
                    className="toggle-pass"
                    aria-label="Mostrar contraseña"
                    onClick={() =>
                      setShowConfirm(
                        (s) => !s
                      )
                    }
                  >
                    👁
                  </button>
                </div>
              </div>

              {/* =========================
                  TÉRMINOS
              ========================== */}

              <div className="checkbox-row">
                <input
                  type="checkbox"
                  id="terms"
                  checked={terms}
                  onChange={(e) =>
                    setTerms(e.target.checked)
                  }
                />

                <label htmlFor="terms">
                  Acepto los{' '}

                  <button
                    type="button"
                    className="link-terminos"
                    onClick={() =>
                      setTermsOpen(true)
                    }
                  >
                    términos y condiciones
                  </button>

                  {' '}y la{' '}

                  <button
                    type="button"
                    className="link-terminos"
                    onClick={() =>
                      setTermsOpen(true)
                    }
                  >
                    política de privacidad
                  </button>

                  <span className="req">
                    *
                  </span>
                </label>
              </div>

              {/* =========================
                  BOTÓN REGISTRO
              ========================== */}

              <button
                type="submit"
                className="form-submit"
              >
                Crear cuenta
                <i className="ti ti-arrow-right" />
              </button>

              <p
                className="form-footer"
                style={{
                  marginTop: '1.5rem',
                }}
              >
                ¿Ya tienes cuenta?{' '}

                <Link
                  to="/login"
                  className="link-accent"
                >
                  Inicia sesión
                </Link>
              </p>
            </form>
          </div>
        </main>
      </div>

      {/* =========================
          MODAL DE TÉRMINOS
      ========================== */}

      <TermsModal
        isOpen={termsOpen}
        onClose={() =>
          setTermsOpen(false)
        }
        onAccept={() => {
          setTerms(true);
          setTermsOpen(false);
        }}
      />

      {/* =========================
          FOOTER
      ========================== */}

      <footer className="footer">
        <span>
          © 2026 SKYED · Sogamoso, Boyacá,
          Colombia
        </span>

        <div className="footer-links">
          <button
            type="button"
            onClick={() =>
              setTermsOpen(true)
            }
          >
            Términos
          </button>

          <button
            type="button"
            onClick={() =>
              setTermsOpen(true)
            }
          >
            Privacidad
          </button>

          <a href="#">
            Soporte
          </a>
        </div>
      </footer>
    </PrincipalWrapper>
  );
}