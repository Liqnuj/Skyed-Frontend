import { useState } from 'react';
import type { FormEvent } from 'react';
import SocialWrapper from '../../components/social/SocialWrapper';
import CanvasParticles from '../../components/social/CanvasParticles';

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

export default function Reserve() {
  const [fname, setFname] = useState('');
  const [lname, setLname] = useState('');
  const [fphone, setFphone] = useState('');
  const [femail, setFemail] = useState('');
  const [ftype, setFtype] = useState('');
  const [fdate, setFdate] = useState('');
  const [fguests, setFguests] = useState('');
  const [fbudget, setFbudget] = useState('');
  const [fmessage, setFmessage] = useState('');

  const [toast, setToast] = useState<{ msg: string; icon: string; show: boolean }>({
    msg: '',
    icon: '✓',
    show: false,
  });

  function showToast(msg: string, icon = '✓') {
    setToast({ msg, icon, show: true });
    window.setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 4000);
  }

  function submitForm(e: FormEvent) {
    e.preventDefault();

    const n = capitalizeName(fname);
    const a = capitalizeName(lname);
    if (n !== fname) setFname(n);
    if (a !== lname) setLname(a);

    const phone = fphone.trim();
    const email = femail.trim();
    const guests = fguests.trim();

    if (!n || !a || !email || !ftype || !guests) {
      showToast('Por favor completa los campos requeridos', '⚠️');
      return;
    }
    if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]{1,20}$/.test(n) || !/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]{1,20}$/.test(a)) {
      showToast('Nombre y apellido solo pueden tener letras y máximo 20 caracteres', '⚠️');
      return;
    }
    if (phone && !/^\d+$/.test(phone)) {
      showToast('El teléfono solo puede contener números', '⚠️');
      return;
    }
    if (!/^\d+$/.test(guests) || Number(guests) < 0) {
      showToast('El número de invitados solo puede contener números y no puede ser negativo', '⚠️');
      return;
    }
    if (!validateEmail(email)) {
      showToast('Ingresa un correo electrónico válido', '⚠️');
      return;
    }

    showToast('¡Solicitud enviada! Te contactamos en 24h 🎉', '✦');

    setFname('');
    setLname('');
    setFphone('');
    setFemail('');
    setFtype('');
    setFdate('');
    setFguests('');
    setFbudget('');
    setFmessage('');
  }

  return (
    <SocialWrapper>
      <div className="page-hero" id="nsHero">
        <CanvasParticles id="nsHeroParticles" />
        <div className="hero-overlay"></div>
        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <h1 className="page-hero-title reveal">
            Hagamos realidad
            <br />
            <em>tu evento soñado</em>
          </h1>
          <p className="page-hero-sub reveal">
            Cuéntanos tu idea y te enviamos una propuesta personalizada en menos de 24 horas.
          </p>
        </div>
      </div>

      {/* CONTACT */}
      <section className="booking-section" id="contacto">
        <div className="container">
          <div className="booking-grid">
            <div className="booking-info reveal">
              <span className="section-label">Contáctanos</span>

              <h2 className="section-title">
                Estamos listos
                <br />
                <em className="section-title-highlight">para ayudarte</em>
              </h2>

              <p className="section-sub">
                Cuéntanos tu idea y nuestro equipo de expertos te enviará una propuesta personalizada en menos de
                24 horas.
              </p>
              <ul className="booking-features">
                <li className="booking-feat">
                  <div className="booking-feat-icon">📍</div>
                  <div className="booking-feat-text">
                    <strong>Bogotá, Colombia</strong>
                    <span>Servicio en toda Colombia y el exterior</span>
                  </div>
                </li>
                <li className="booking-feat">
                  <div className="booking-feat-icon">📞</div>
                  <div className="booking-feat-text">
                    <strong>+57 317 703 7517</strong>
                    <span>Lunes a sábado, 8am – 8pm</span>
                  </div>
                </li>
                <li className="booking-feat">
                  <div className="booking-feat-icon">✉️</div>
                  <div className="booking-feat-text">
                    <strong>hola@skyedsocial.co</strong>
                    <span>Respuesta en menos de 24 horas</span>
                  </div>
                </li>
                <li className="booking-feat">
                  <div className="booking-feat-icon">💬</div>
                  <div className="booking-feat-text">
                    <strong>WhatsApp directo</strong>
                    <span>Consultas rápidas por chat</span>
                  </div>
                </li>
              </ul>
            </div>

            <div className="booking-form reveal" id="contactForm">
              <div className="form-title">Solicita tu cotización gratuita</div>
              <form onSubmit={submitForm}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Nombre</label>
                    <input
                      type="text"
                      id="fname"
                      placeholder="Ej: María"
                      maxLength={20}
                      value={fname}
                      onChange={(e) => setFname(capitalizeName(e.target.value))}
                      onBlur={(e) => setFname(capitalizeName(e.target.value))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Apellido</label>
                    <input
                      type="text"
                      id="lname"
                      placeholder="Ej: García"
                      maxLength={20}
                      value={lname}
                      onChange={(e) => setLname(capitalizeName(e.target.value))}
                      onBlur={(e) => setLname(capitalizeName(e.target.value))}
                    />
                  </div>
                  <div className="form-group span-two">
                    <label>Teléfono / WhatsApp</label>
                    <input
                      type="text"
                      id="fphone"
                      placeholder="3000000000"
                      inputMode="numeric"
                      value={fphone}
                      onChange={(e) => setFphone(sanitizeNumeric(e.target.value))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Correo electrónico</label>
                  <input
                    type="email"
                    id="femail"
                    placeholder="tu@correo.com"
                    value={femail}
                    onChange={(e) => setFemail(e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Tipo de evento</label>
                    <select id="ftype" value={ftype} onChange={(e) => setFtype(e.target.value)}>
                      <option value="">Seleccionar...</option>
                      <option>Boda</option>
                      <option>Quinceañera</option>
                      <option>Cumpleaños</option>
                      <option>Corporativo</option>
                      <option>Baby shower</option>
                      <option>Otro</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Fecha estimada</label>
                    <input type="date" id="fdate" value={fdate} onChange={(e) => setFdate(e.target.value)} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>N° de invitados</label>
                    <input
                      type="text"
                      id="fguests"
                      placeholder="Ej: 150"
                      inputMode="numeric"
                      value={fguests}
                      onChange={(e) => setFguests(sanitizeNumeric(e.target.value))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Presupuesto aprox.</label>
                    <select id="fbudget" value={fbudget} onChange={(e) => setFbudget(e.target.value)}>
                      <option value="">Seleccionar...</option>
                      <option>Menos de $10M COP</option>
                      <option>$10M – $20M COP</option>
                      <option>$20M – $40M COP</option>
                      <option>Más de $40M COP</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Cuéntanos tu visión</label>
                  <textarea
                    id="fmessage"
                    placeholder="¿Qué imaginas para tu evento? Tema, estilo, detalles especiales..."
                    value={fmessage}
                    onChange={(e) => setFmessage(e.target.value)}
                  />
                </div>

                <button className="form-submit" type="submit">
                  ✦ Enviar solicitud
                </button>
              </form>
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