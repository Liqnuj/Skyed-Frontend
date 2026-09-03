import { useState } from 'react';
import type { FormEvent } from 'react';
import SocialWrapper from '../../components/social/SocialWrapper';
import CanvasParticles from '../../components/social/CanvasParticles';

type PqrTypeKey = 'peticion' | 'queja' | 'reclamo' | 'sugerencia' | 'felicitacion';

interface PqrType {
  type: PqrTypeKey;
  label: string;
  icon: string;
  name: string;
  desc: string;
}

const pqrTypes: PqrType[] = [
  {
    type: 'peticion',
    label: 'Petición',
    icon: '📋',
    name: 'Petición',
    desc: 'Solicitud de información, documentos o aclaración sobre tu evento.',
  },
  {
    type: 'queja',
    label: 'Queja',
    icon: '⚠️',
    name: 'Queja',
    desc: 'Inconformidad con la atención, coordinación o proceso de tu evento.',
  },
  {
    type: 'reclamo',
    label: 'Reclamo',
    icon: '🔴',
    name: 'Reclamo',
    desc: 'Inconformidad con el servicio prestado que requiere solución o compensación.',
  },
  {
    type: 'sugerencia',
    label: 'Sugerencia',
    icon: '💡',
    name: 'Sugerencia',
    desc: 'Propuesta para mejorar nuestros servicios o procesos.',
  },
  {
    type: 'felicitacion',
    label: 'Felicitación',
    icon: '🌟',
    name: 'Felicitación',
    desc: 'Reconocimiento al equipo o a un servicio que superó tus expectativas.',
  },
];

const NAME_REGEX = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]{1,20}$/;

function capitalizeName(raw: string) {
  const cleaned = raw
    .replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ\s]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 20);
  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
}

function sanitizeNumeric(raw: string) {
  return raw.replace(/\D/g, '').slice(0, 15);
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function PQR() {
  const [selectedType, setSelectedType] = useState<PqrTypeKey>('peticion');

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [tel, setTel] = useState('');
  const [contrato, setContrato] = useState('');
  const [evento, setEvento] = useState('');
  const [fecha, setFecha] = useState('');
  const [asunto, setAsunto] = useState('');
  const [desc, setDesc] = useState('');
  const [fileName, setFileName] = useState('');

  const [submitted, setSubmitted] = useState(false);
  const [radicado, setRadicado] = useState('');

  const [toast, setToast] = useState<{ msg: string; icon: string; show: boolean }>({
    msg: '',
    icon: '✓',
    show: false,
  });

  const current = pqrTypes.find((t) => t.type === selectedType) ?? pqrTypes[0];

  function showToast(msg: string, icon = '✓') {
    setToast({ msg, icon, show: true });
    window.setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 4000);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setFileName(file ? file.name : '');
  }

  function submitPQR(e: FormEvent) {
    e.preventDefault();

    const cleanNombre = capitalizeName(nombre);
    const cleanApellido = capitalizeName(apellido);
    if (cleanNombre !== nombre) setNombre(cleanNombre);
    if (cleanApellido !== apellido) setApellido(cleanApellido);

    if (!cleanNombre || !cleanApellido || !email.trim() || !evento || !asunto.trim() || !desc.trim()) {
      showToast('Por favor completa todos los campos obligatorios', '⚠️');
      return;
    }
    if (!NAME_REGEX.test(cleanNombre) || !NAME_REGEX.test(cleanApellido)) {
      showToast('Nombre y apellido solo pueden tener letras y máximo 20 caracteres', '⚠️');
      return;
    }
    if (tel && !/^\d+$/.test(tel)) {
      showToast('El teléfono solo puede contener números', '⚠️');
      return;
    }
    if (!validateEmail(email.trim())) {
      showToast('Ingresa un correo electrónico válido', '⚠️');
      return;
    }

    const code = 'SS-PQR-' + Date.now().toString().slice(-6);
    setRadicado(code);
    setSubmitted(true);
    window.setTimeout(() => {
      document.getElementById('pqrConfirm')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }

  function resetPQR() {
    setSubmitted(false);
    setSelectedType('peticion');
    setNombre('');
    setApellido('');
    setEmail('');
    setTel('');
    setContrato('');
    setEvento('');
    setFecha('');
    setAsunto('');
    setDesc('');
    setFileName('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const counterWarn = desc.length > 1000 * 0.85;

  return (
    <SocialWrapper>
      {/* PAGE HERO */}
      <section className="page-hero" id="pHero">
        <CanvasParticles id="pageParticles" />
        <div className="hero-overlay"></div>
        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <h1 className="page-hero-title">
            Peticiones, Quejas,
            <br /> <em>Reclamos</em> y Sugerencias
          </h1>
          <p className="page-hero-sub">
            Tu experiencia importa. Cada solicitud es atendida por nuestro equipo en un plazo máximo de 5 días
            hábiles.
          </p>
        </div>
      </section>

      {/* PQR SECTION */}
      <section className="pqr-section">
        <div className="container">
          <div className="pqr-grid">
            {/* Columna izquierda: tipo + info */}
            <div>
              <span className="section-label">¿Qué deseas reportar?</span>
              <p style={{ fontSize: '.88rem', color: 'var(--text-muted)', margin: '.75rem 0 1.5rem', lineHeight: 1.6 }}>
                Selecciona la categoría que mejor describe tu solicitud para que podamos darte la respuesta
                adecuada.
              </p>

              <div className="pqr-types" id="pqrTypes">
                {pqrTypes.map((t) => (
                  <div
                    key={t.type}
                    className={`pqr-type-card${selectedType === t.type ? ' selected' : ''}`}
                    data-type={t.type}
                    onClick={() => setSelectedType(t.type)}
                  >
                    <div className="pqr-type-icon">{t.icon}</div>
                    <div>
                      <div className="pqr-type-name">{t.name}</div>
                      <div className="pqr-type-desc">{t.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pqr-info-box">
                <div className="pqr-info-title">📅 Tiempos de respuesta</div>
                <ul className="pqr-info-list">
                  <li>
                    Petición — respuesta en <strong>3 días hábiles</strong>
                  </li>
                  <li>
                    Queja — respuesta en <strong>5 días hábiles</strong>
                  </li>
                  <li>
                    Reclamo — respuesta en <strong>5 días hábiles</strong>
                  </li>
                  <li>
                    Sugerencia — acuse de recibo en <strong>2 días hábiles</strong>
                  </li>
                  <li>Felicitación — siempre bien recibida ✦</li>
                </ul>
              </div>
            </div>

            {/* Columna derecha: formulario */}
            <div className="pqr-form-wrap">
              {!submitted && (
                <div id="pqrFormView">
                  <div className="pqr-form-title">Cuéntanos qué pasó</div>
                  <p className="pqr-form-subtitle">
                    Todos los campos marcados con * son obligatorios. Tu solicitud quedará registrada y recibirás
                    un número de radicado.
                  </p>

                  <div id="selectedBadge" className="pqr-selected-badge">
                    <span>{current.icon}</span> {current.label}
                  </div>

                  <form onSubmit={submitPQR}>
                    <div className="pf-row">
                      <div className="pf-group required">
                        <label>Nombre</label>
                        <input
                          type="text"
                          id="pqrNombre"
                          placeholder="Ej: María"
                          maxLength={20}
                          value={nombre}
                          onChange={(e) => setNombre(capitalizeName(e.target.value))}
                          onBlur={(e) => setNombre(capitalizeName(e.target.value))}
                        />
                      </div>
                      <div className="pf-group required">
                        <label>Apellido</label>
                        <input
                          type="text"
                          id="pqrApellido"
                          placeholder="Ej: García"
                          maxLength={20}
                          value={apellido}
                          onChange={(e) => setApellido(capitalizeName(e.target.value))}
                          onBlur={(e) => setApellido(capitalizeName(e.target.value))}
                        />
                      </div>
                      <div className="pf-group required span-two">
                        <label>Correo electrónico</label>
                        <input
                          type="email"
                          id="pqrEmail"
                          placeholder="tu@correo.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="pf-row">
                      <div className="pf-group">
                        <label>Teléfono / WhatsApp</label>
                        <input
                          type="text"
                          id="pqrTel"
                          placeholder="3000000000"
                          inputMode="numeric"
                          value={tel}
                          onChange={(e) => setTel(sanitizeNumeric(e.target.value))}
                        />
                      </div>
                      <div className="pf-group">
                        <label>N° de contrato / evento</label>
                        <input
                          type="text"
                          id="pqrContrato"
                          placeholder="Ej: SS-2024-0312"
                          value={contrato}
                          onChange={(e) => setContrato(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="pf-row">
                      <div className="pf-group required">
                        <label>Tipo de evento</label>
                        <select id="pqrEvento" value={evento} onChange={(e) => setEvento(e.target.value)}>
                          <option value="">Seleccionar...</option>
                          <option>Boda</option>
                          <option>Quinceañera</option>
                          <option>Cumpleaños</option>
                          <option>Corporativo</option>
                          <option>Baby shower</option>
                          <option>Otro</option>
                        </select>
                      </div>
                      <div className="pf-group">
                        <label>Fecha del evento</label>
                        <input type="date" id="pqrFecha" value={fecha} onChange={(e) => setFecha(e.target.value)} />
                      </div>
                    </div>

                    <div className="pf-group required">
                      <label>Asunto</label>
                      <input
                        type="text"
                        id="pqrAsunto"
                        placeholder="Resumen breve de tu solicitud"
                        maxLength={100}
                        value={asunto}
                        onChange={(e) => setAsunto(e.target.value)}
                      />
                    </div>

                    <div className="pf-group required">
                      <label>Descripción detallada</label>
                      <textarea
                        id="pqrDesc"
                        placeholder="Describe con el mayor detalle posible lo ocurrido: qué pasó, cuándo, cómo afectó tu evento y qué esperas como solución..."
                        maxLength={1000}
                        rows={7}
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                      />
                      <div className={`pf-counter${counterWarn ? ' warn' : ''}`} id="pqrCounter">
                        {desc.length} / 1000 caracteres
                      </div>
                    </div>

                    {/* Adjunto */}
                    <label className="pf-upload" htmlFor="pqrFile" id="uploadZone">
                      <div className="pf-upload-icon">📎</div>
                      <div className="pf-upload-text">
                        <strong>Adjuntar archivo</strong> (opcional)
                        <br />
                        Fotos, videos o documentos de soporte — máx. 10 MB
                      </div>
                      {fileName && (
                        <div className="pf-file-name" id="fileName" style={{ display: 'block' }}>
                          📎 {fileName}
                        </div>
                      )}
                      <input
                        type="file"
                        id="pqrFile"
                        accept="image/*,video/*,.pdf,.doc,.docx"
                        onChange={handleFile}
                      />
                    </label>

                    <div className="privacy-notice">
                      🔒 Tu información es tratada con confidencialidad conforme a nuestra{' '}
                      <a href="#" className="privacy-link">
                        Política de privacidad
                      </a>
                      . No compartimos tus datos con terceros.
                    </div>

                    <button className="pf-submit" id="pqrSubmitBtn" type="submit">
                      ✦ Radicar solicitud
                    </button>
                  </form>
                </div>
              )}

              {/* Confirmación */}
              {submitted && (
                <div className="pqr-confirm" id="pqrConfirm" style={{ display: 'block' }}>
                  <div className="pqr-confirm-icon">✓</div>
                  <div className="pqr-confirm-title">¡Solicitud radicada!</div>
                  <p className="pqr-confirm-sub">
                    Tu solicitud fue recibida exitosamente. Recibirás una copia por correo electrónico con todos
                    los detalles.
                  </p>
                  <div className="pqr-confirm-code" id="pqrCode">
                    Radicado: {radicado}
                  </div>

                  <div className="status-track">
                    <div className="status-step">
                      <div className="status-dot done">✓</div>
                      <div className="status-label active">Radicada</div>
                    </div>
                    <div className="status-step">
                      <div className="status-dot active">2</div>
                      <div className="status-label active">En revisión</div>
                    </div>
                    <div className="status-step">
                      <div className="status-dot">3</div>
                      <div className="status-label">En proceso</div>
                    </div>
                    <div className="status-step">
                      <div className="status-dot">4</div>
                      <div className="status-label">Resuelta</div>
                    </div>
                  </div>

                  <p style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                    Puedes hacer seguimiento escribiendo a <strong>pqr@skyedsocial.co</strong> con tu número de
                    radicado.
                  </p>
                  <button className="btn-primary" onClick={resetPQR} style={{ fontSize: '.88rem' }}>
                    Radicar otra solicitud
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Toast */}
      <div className={`toast${toast.show ? ' show' : ''}`} id="toast">
        <span className="toast-icon" id="toastIcon">
          {toast.icon}
        </span>
        <span id="toastMsg">{toast.msg}</span>
      </div>
    </SocialWrapper>
  );
}