import { useState } from 'react';
import type { FormEvent } from 'react';
import SocialWrapper from '../../components/social/SocialWrapper';
import CanvasParticles from '../../components/social/CanvasParticles';
import { buildPqrWhatsAppMessage, buildWhatsAppLink } from '../../utils/whatsapp';

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

function WhatsAppIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12.004 2C6.486 2 2 6.486 2 12.004a9.96 9.96 0 001.334 4.986L2 22l5.146-1.312a9.98 9.98 0 004.858 1.237h.004c5.518 0 10.004-4.486 10.004-10.004C22.012 6.486 17.526 2 12.004 2zm0 18.163h-.003a8.15 8.15 0 01-4.153-1.137l-.298-.177-3.055.779.815-2.978-.194-.306a8.135 8.135 0 01-1.248-4.34c0-4.5 3.663-8.163 8.166-8.163 2.18 0 4.229.85 5.77 2.393a8.106 8.106 0 012.393 5.777c-.001 4.502-3.664 8.152-8.193 8.152z" />
    </svg>
  );
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
  const [waLink, setWaLink] = useState('');

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
    const mensaje = buildPqrWhatsAppMessage({
      tipo: current.label,
      radicado: code,
      nombre: cleanNombre,
      apellido: cleanApellido,
      evento,
      fecha,
      asunto: asunto.trim(),
      descripcion: desc.trim(),
    });
    const link = buildWhatsAppLink(mensaje);

    setRadicado(code);
    setWaLink(link);
    setSubmitted(true);
    window.setTimeout(() => {
      document.getElementById('pqrConfirm')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);

    // Intento de apertura automática — sigue siendo el mismo evento de clic
    // del usuario, así que la mayoría de navegadores no lo bloquea. El botón
    // "Enviar por WhatsApp" en la confirmación queda como respaldo si el
    // navegador sí lo bloquea.
    window.open(link, '_blank', 'noopener,noreferrer');
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
    setWaLink('');
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

                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pqr-whatsapp-btn"
                  >
                    <WhatsAppIcon /> Enviar por WhatsApp
                  </a>
                  <p className="pqr-whatsapp-hint">
                    Te abrimos WhatsApp con tu solicitud ya escrita — solo confírmala para
                    que le llegue directo al equipo de SkyedSocial. Si no se abrió sola,
                    usa el botón de arriba.
                  </p>

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