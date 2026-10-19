import { useState } from 'react';
import type { FormEvent } from 'react';
import SocialWrapper from '../../components/social/SocialWrapper';
import CanvasParticles from '../../components/social/CanvasParticles';
import Protected from '../../components/Protected';
import { apiFetch } from '../../services/api';

type PqrTypeKey = 'peticion' | 'queja' | 'reclamo' | 'sugerencia' | 'felicitacion';

interface PqrType {
  type: PqrTypeKey;
  label: string;
  icon: string;
  name: string;
  desc: string;
}

const pqrTypes: PqrType[] = [
  { type: 'peticion', label: 'Petición', icon: '📋', name: 'Petición', desc: 'Solicitud de información, documentos o aclaración sobre tu evento.' },
  { type: 'queja', label: 'Queja', icon: '⚠️', name: 'Queja', desc: 'Inconformidad con la atención, coordinación o proceso de tu evento.' },
  { type: 'reclamo', label: 'Reclamo', icon: '🔴', name: 'Reclamo', desc: 'Inconformidad con el servicio prestado que requiere solución o compensación.' },
  { type: 'sugerencia', label: 'Sugerencia', icon: '💡', name: 'Sugerencia', desc: 'Propuesta para mejorar nuestros servicios o procesos.' },
  { type: 'felicitacion', label: 'Felicitación', icon: '🌟', name: 'Felicitación', desc: 'Reconocimiento al equipo o a un servicio que superó tus expectativas.' },
];

function PQRForm() {
  const [selectedType, setSelectedType] = useState<PqrTypeKey>('peticion');
  const [asunto, setAsunto] = useState('');
  const [desc, setDesc] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [radicado, setRadicado] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; icon: string; show: boolean }>({ msg: '', icon: '✓', show: false });

  const current = pqrTypes.find((t) => t.type === selectedType) ?? pqrTypes[0];

  function showToast(msg: string, icon = '✓') {
    setToast({ msg, icon, show: true });
    window.setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 4000);
  }

  async function submitPQR(e: FormEvent) {
    e.preventDefault();
    if (!asunto.trim() || !desc.trim()) {
      showToast('Por favor completa todos los campos obligatorios', '⚠️');
      return null;
    }
    setSaving(true);
    try {
      const res = await apiFetch('/pqr', {
        method: 'POST',
        body: JSON.stringify({
          tipo_pqr: selectedType,
          asunto_pqr: asunto.trim(),
          mensaje_pqr: desc.trim(),
        }),
      });
      setRadicado(`SS-PQR-${res.pqr.id_pqr ?? res.pqr.id}`);
      setSubmitted(true);
      window.setTimeout(() => {
        document.getElementById('pqrConfirm')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 0);
    } catch (err: any) {
      showToast(err.message ?? 'No se pudo radicar la solicitud', '⚠️');
    } finally {
      setSaving(false);
    }
  }

  function submitPQR(e: FormEvent) {
    e.preventDefault();
    const resultado = validarYPrepararEnvio();
    if (!resultado) return;
    mostrarConfirmacion(resultado.code, resultado.link);
    window.open(resultado.link, '_blank', 'noopener,noreferrer');
  }

  function resetPQR() {
    setSubmitted(false);
    setSelectedType('peticion');
    setAsunto('');
    setDesc('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const counterWarn = desc.length > 1000 * 0.85;

  return (
    <SocialWrapper>
      <section className="page-hero" id="pHero">
        <CanvasParticles id="pageParticles" />
        <div className="hero-overlay"></div>
        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <h1 className="page-hero-title">
            Peticiones, Quejas,
            <br /> <em>Reclamos</em> y Sugerencias
          </h1>
          <p className="page-hero-sub">
            Tu experiencia importa. Cada solicitud es atendida por nuestro equipo en un plazo máximo de 5 días hábiles.
          </p>
        </div>
      </section>

      <section className="pqr-section">
        <div className="container">
          <div className="pqr-grid">
            <div>
              <span className="section-label">¿Qué deseas reportar?</span>
              <p style={{ fontSize: '.88rem', color: 'var(--text-muted)', margin: '.75rem 0 1.5rem', lineHeight: 1.6 }}>
                Selecciona la categoría que mejor describe tu solicitud para que podamos darte la respuesta adecuada.
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
                  <li>Petición — respuesta en <strong>3 días hábiles</strong></li>
                  <li>Queja — respuesta en <strong>5 días hábiles</strong></li>
                  <li>Reclamo — respuesta en <strong>5 días hábiles</strong></li>
                  <li>Sugerencia — acuse de recibo en <strong>2 días hábiles</strong></li>
                  <li>Felicitación — siempre bien recibida ✦</li>
                </ul>
              </div>
            </div>

            <div className="pqr-form-wrap">
              {!submitted && (
                <div id="pqrFormView">
                  <div className="pqr-form-title">Cuéntanos qué pasó</div>
                  <p className="pqr-form-subtitle">
                    Tu solicitud queda asociada a tu cuenta y recibirás un número de radicado.
                  </p>
                  <div id="selectedBadge" className="pqr-selected-badge">
                    <span>{current.icon}</span> {current.label}
                  </div>
                  <form onSubmit={submitPQR}>
                    <div className="pf-group required">
                      <label>Asunto</label>
                      <input
                        type="text"
                        placeholder="Resumen breve de tu solicitud"
                        maxLength={100}
                        value={asunto}
                        onChange={(e) => setAsunto(e.target.value)}
                      />
                    </div>
                    <div className="pf-group required">
                      <label>Descripción detallada</label>
                      <textarea
                        placeholder="Describe con el mayor detalle posible lo ocurrido: qué pasó, cuándo, cómo afectó tu evento y qué esperas como solución..."
                        maxLength={1000}
                        rows={7}
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                      />
                      <div className={`pf-counter${counterWarn ? ' warn' : ''}`}>{desc.length} / 1000 caracteres</div>
                    </div>
                    <div className="privacy-notice">
                      🔒 Tu información es tratada con confidencialidad conforme a nuestra{' '}
                      <a href="#" className="privacy-link">Política de privacidad</a>. No compartimos tus datos con terceros.
                    </div>
                    <button className="pf-submit" type="submit" disabled={saving}>
                      {saving ? 'Enviando...' : '✦ Radicar solicitud'}
                    </button>
                  </form>
                </div>
              )}

              {submitted && (
                <div className="pqr-confirm" id="pqrConfirm" style={{ display: 'block' }}>
                  <div className="pqr-confirm-icon">✓</div>
                  <div className="pqr-confirm-title">¡Solicitud radicada!</div>
                  <p className="pqr-confirm-sub">Tu solicitud fue recibida exitosamente y quedó asociada a tu cuenta.</p>
                  <div className="pqr-confirm-code" id="pqrCode">Radicado: {radicado}</div>
                  <div className="status-track">
                    <div className="status-step"><div className="status-dot done">✓</div><div className="status-label active">Radicada</div></div>
                    <div className="status-step"><div className="status-dot">2</div><div className="status-label">En revisión</div></div>
                    <div className="status-step"><div className="status-dot">3</div><div className="status-label">En proceso</div></div>
                    <div className="status-step"><div className="status-dot">4</div><div className="status-label">Resuelta</div></div>
                  </div>
                  <button className="btn-primary" onClick={resetPQR} style={{ fontSize: '.88rem' }}>Radicar otra solicitud</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className={`toast${toast.show ? ' show' : ''}`}>
        <span className="toast-icon">{toast.icon}</span>
        <span>{toast.msg}</span>
      </div>
    </SocialWrapper>
  );
}

export default function PQR() {
  return (
    <Protected>
      <PQRForm />
    </Protected>
  );
}