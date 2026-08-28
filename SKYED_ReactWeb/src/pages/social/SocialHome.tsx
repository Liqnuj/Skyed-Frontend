import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import SocialWrapper from '../../components/social/SocialWrapper';
import { heroSlides, socialEvents, socialGallery, socialTestimonials } from '../../data/socialData';
import HeroParticles from '../../components/social/HeroParticles';

const SERVICES = [
  { icon: '🌸', title: 'Decoración & Florería', desc: 'Transformamos cada espacio en una obra de arte con arreglos florales, centros de mesa y ambientaciones únicas.', features: ['Arcos florales naturales y artificiales', 'Centros de mesa personalizados', 'Decoración temática a medida', 'Iluminación de atmósfera'] },
  { icon: '🍽️', title: 'Catering Gourmet', desc: 'Menús creados por chefs de alta cocina, adaptados a todos los gustos y restricciones dietéticas.', features: ['Cocina colombiana e internacional', 'Buffet y servicio a la mesa', 'Barra de cócteles y mocktails', 'Pastelería artesanal'] },
  { icon: '📸', title: 'Fotografía & Video', desc: 'Capturamos cada instante con equipos profesionales y edición cinematográfica de primer nivel.', features: ['Sesión fotográfica pre-evento', 'Cobertura total del evento', 'Video cinematográfico 4K', 'Álbum digital y físico premium'] },
  { icon: '🎵', title: 'Música & Entretenimiento', desc: 'Desde bandas en vivo hasta DJs de talla internacional y shows especiales que sorprenden.', features: ['DJ profesional con equipo premium', 'Bandas en vivo y solistas', 'Shows de magia y animación', 'Zona de actividades interactivas'] },
  { icon: '🏛️', title: 'Gestión de Lugares', desc: 'Acceso exclusivo a los venues más exclusivos de la ciudad y alrededores para tu evento.', features: ['Haciendas y hoteles boutique', 'Salones de eventos premium', 'Espacios al aire libre', 'Negociación y contratos incluidos'] },
  { icon: '✨', title: 'Efectos Especiales', desc: 'Crea momentos mágicos con nuestros efectos visuales de vanguardia que dejan sin palabras.', features: ['Fuentes de luz y lásers', 'Máquina de niebla y burbujas', 'Mapping proyectado', 'Fuegos fríos de pista'] },
];

const STEPS = [
  { num: 1, title: 'Consulta inicial', desc: 'Conversamos sobre tu visión, necesidades, presupuesto y fecha para entender exactamente lo que sueñas.' },
  { num: 2, title: 'Propuesta a medida', desc: 'Diseñamos una propuesta detallada con opciones de personalización, proveedores y presupuesto desglosado.' },
  { num: 3, title: 'Coordinación total', desc: 'Gestionamos cada proveedor, confirmamos detalles y hacemos visitas previas para garantizar que todo esté perfecto.' },
  { num: 4, title: '¡El día perfecto!', desc: 'Nuestro equipo está presente de principio a fin para que tú solo te preocupes por vivir el momento.' },
];

const PARTICLES = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  size: 2 + Math.random() * 6,
  duration: 10 + Math.random() * 15,
  delay: Math.random() * 10,
  color: Math.random() > 0.5 ? 'rgba(201,168,76,0.6)' : 'rgba(245,230,239,0.4)',
}));

export default function SocialHome() {
  const [slide, setSlide] = useState(0);
  const [modalEvent, setModalEvent] = useState<number | null>(null);

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % heroSlides.length), 6000);
    return () => clearInterval(t);
  }, []);

  const ev = socialEvents.find((e) => e.id === modalEvent);

  return (
    <SocialWrapper>
      {/* HERO */}
      <section className="hero" id="inicio">
        <div className="hero-particles">
          {PARTICLES.map((p) => (
            <span
              key={p.id}
              className="particle"
              style={{
                left: `${p.left}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                background: p.color,
                animationDuration: `${p.duration}s`,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
        </div>
        <div className="hero-slides">
          {heroSlides.map((s, i) => (
            <div
              key={s.image}
              className={`hero-slide ${i === slide ? 'active' : ''}`}
              style={{ '--slide-offset': i < slide ? '-100%' : i > slide ? '100%' : '0' } as CSSProperties}
            >
              <img src={s.image} alt={s.alt} />
            </div>
          ))}
        </div>
        <div className="hero-overlay" />

        <div className="hero-content">
          <div className="hero-badge">✦ Creamos momentos eternos</div>
          <h1 className="hero-title">Tu evento,<br /><em>nuestra</em> obra maestra</h1>
          <p className="hero-sub">Bodas de ensueño, quinceañeras que emocionan, cumpleaños que sorprenden y corporativos que inspiran. Cada detalle, perfectamente orquestado.</p>
          <div className="hero-actions">
            <Link to="/social/eventos" className="btn-primary">✦ Explorar eventos</Link>
            <a href="#contacto" className="btn-outline">Solicitar cotización</a>
          </div>
        </div>

        <button className="carousel-arrow carousel-prev" onClick={() => setSlide((s) => (s - 1 + heroSlides.length) % heroSlides.length)} aria-label="Anterior">←</button>
        <button className="carousel-arrow carousel-next" onClick={() => setSlide((s) => (s + 1) % heroSlides.length)} aria-label="Siguiente">→</button>
        <div className="carousel-dots">
          {heroSlides.map((s, i) => (
            <button key={s.image} className={`carousel-dot ${i === slide ? 'active' : ''}`} onClick={() => setSlide(i)} />
          ))}
        </div>

        <div className="hero-scroll">
          <span>Descubrir</span>
          <div className="scroll-line" />
        </div>
      </section>

      {/* STATS */}
      <div className="stats-bar">
        <div className="stat-item"><div className="stat-num">850+</div><div className="stat-label">Eventos realizados</div></div>
        <div className="stat-item"><div className="stat-num">98%</div><div className="stat-label">Clientes satisfechos</div></div>
        <div className="stat-item"><div className="stat-num">12</div><div className="stat-label">Años de experiencia</div></div>
      </div>

      {/* ABOUT */}
      <section className="about-strip" id="nosotros">
        <div className="container">
          <div className="about-grid">
            <div className="about-visual">
              <div className="about-img-wrap">
                <video autoPlay muted loop playsInline>
                  <source
                    src="/assets/social/video_general.mp4"
                    type="video/mp4"
                  />
                </video>
              </div>
            </div>
            <div className="about-content reveal">
              <span className="section-label">Sobre SkyedSocial</span>
              <h2 className="section-title">Donde los sueños se convierten en <em>realidad</em></h2>
              <p className="section-sub">Somos un equipo apasionado de diseñadores, coordinadores y creativos dedicados a transformar tus ideas más ambiciosas en experiencias inesperadas.</p>
              <ul className="about-list">
                <li>Coordinación integral de principio a fin — nosotros manejamos todo, tú solo disfrutas</li>
                <li>Alianzas con los mejores proveedores de decoración, catering y entretenimiento</li>
                <li>Diseño personalizado para cada cliente: ningún evento es igual</li>
                <li>Equipo disponible 24/7 los días previos y durante tu evento</li>
                <li>Tecnología de vanguardia: iluminación, sonido y efectos especiales de nivel premium</li>
              </ul>
              <div className="about-cta">
                <Link to="/social/eventos" className="btn-primary">Ver nuestros eventos</Link>
                <a href="#contacto" className="btn-asc">Hablar con un asesor</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* EVENTS PREVIEW */}
      <section className="events-section">
        <div className="container">
          <div className="text-center reveal">
            <span className="section-label">Nuestros eventos</span>
            <h2 className="section-title">Paquetes diseñados<br />para <em>cada celebración</em></h2>
            <p className="section-sub">Desde bodas íntimas hasta recepciones espectaculares — personalizamos cada detalle a tu medida.</p>
          </div>
          <div className="events-grid" style={{ marginTop: '3rem' }}>
            {socialEvents.slice(0, 3).map((e) => (
              <div key={e.id} className="event-card reveal">
                <div className="event-card-img">
                  <div className="img-placeholder media-fill">
                    <img src={e.image} alt={e.title} className="media-fill-img" />
                  </div>
                  <div className="event-price">{e.price}</div>
                  <div className="event-tag">{e.tag}</div>
                </div>
                <div className="event-card-body">
                  <div className="event-card-title">{e.title}</div>
                  <div className="event-card-meta">
                    <span className="event-meta-item">👥 {e.guests} invitados</span>
                    <span className="event-meta-item">⏱ {e.hours} horas</span>
                  </div>
                  <p className="event-card-desc">{e.desc}</p>
                  <div className="event-card-footer">
                    <button className="btn-sm-primary" onClick={() => setModalEvent(e.id)}>Ver detalles</button>
                    <Link to="/social/reservar" className="btn-sm-outline">Cotizar</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="events-load">
            <Link to="/social/eventos" className="btn-primary">Ver todos los eventos →</Link>
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section className="gallery-section">
        <div className="container">
          <div className="text-center reveal">
            <span className="section-label">Galería</span>
            <h2 className="section-title">Momentos que<br /><em>hemos creado</em></h2>
          </div>
        </div>
        <div style={{ overflow: 'hidden', marginTop: '3.5rem' }}>
          <div className="gallery-track">
            {[...socialGallery, ...socialGallery].map((g, i) => (
              <div key={`${g.image}-${i}`} className="gallery-item">
                <div className="img-placeholder media-fill">
                  <img src={g.image} alt={g.title} className="media-fill-img" />
                </div>
                <div className="gallery-item-overlay">
                  <div>
                    <div className="gallery-item-title">{g.title}</div>
                    <div className="gallery-item-sub">{g.sub}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="testimonials-section">
        <div className="container">
          <div className="text-center reveal">
            <span className="section-label">Testimonios</span>
            <h2 className="section-title">Lo que dicen<br />nuestros <em>clientes</em></h2>
            <p className="section-sub">Las mejores palabras vienen de quienes vivieron la experiencia.</p>
          </div>
          <div className="testimonials-grid">
            {socialTestimonials.map((t) => (
              <div key={t.name} className={`testimonial-card reveal ${t.featured ? 'featured' : ''}`}>
                <div className="t-event-tag">{t.event}</div>
                <div className="t-stars">{'★'.repeat(t.stars)}</div>
                <p className="t-text">"{t.text}"</p>
                <div className="t-author">
                  <div className="t-avatar">{t.initials}</div>
                  <div>
                    <div className="t-name">{t.name}</div>
                    <div className="t-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="services-section">
        <div className="container">
          <div className="text-center reveal">
            <span className="section-label">Nuestros servicios</span>
            <h2 className="section-title">Todo lo que tu evento<br /><em>necesita y más</em></h2>
            <p className="section-sub">Un ecosistema completo de servicios para que cada momento sea perfecto.</p>
          </div>
          <div className="services-grid" style={{ marginTop: '3rem' }}>
            {SERVICES.map((s) => (
              <div key={s.title} className="service-card reveal">
                <div className="service-icon">{s.icon}</div>
                <div className="service-title">{s.title}</div>
                <div className="service-desc">{s.desc}</div>
                <ul className="service-features">
                  {s.features.map((f) => <li key={f}>{f}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section className="process-section">
        <div className="container">
          <div className="text-center reveal">
            <span className="section-label">Cómo trabajamos</span>
            <h2 className="section-title">Tu evento en <em>4 pasos</em></h2>
            <p className="section-sub">Un proceso claro y transparente para que tengas total confianza desde el primer día.</p>
          </div>
          <div className="process-steps">
            {STEPS.map((s) => (
              <div key={s.num} className="process-step reveal">
                <div className="step-num">{s.num}</div>
                <div className="step-title">{s.title}</div>
                <div className="step-desc">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EVENT MODAL */}
      {ev && (
        <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) setModalEvent(null); }}>
          <div className="modal-box">
            <div className="modal-img">
              <div className="img-placeholder media-fill icon-size" style={{ '--icon-size': '8rem' } as React.CSSProperties}>
                <img src={ev.image} alt={ev.title} className="media-fill-img" />
              </div>
            </div>
            <button className="modal-close" onClick={() => setModalEvent(null)} aria-label="Cerrar">✕</button>
            <div className="modal-body">
              <span className="modal-tag">{ev.tag}</span>
              <div className="modal-title">{ev.title}</div>
              <div className="modal-meta">
                <div className="modal-meta-item"><strong>{ev.guests}</strong><span>Invitados</span></div>
                <div className="modal-meta-item"><strong>{ev.hours}h</strong><span>Duración</span></div>
                <div className="modal-meta-item"><strong>{ev.price}</strong><span>Desde</span></div>
              </div>
              <p className="modal-desc">{ev.desc}</p>
              <div className="modal-includes">
                <h4>¿Qué incluye?</h4>
                <ul>{ev.includes.map((i) => <li key={i}>{i}</li>)}</ul>
              </div>
              <div className="modal-price-row">
                <div>
                  <div className="modal-price">{ev.price}</div>
                  <div className="modal-price-note">Precio base · Personalizable</div>
                </div>
                <Link to="/social/reservar" className="btn-primary modal-cta-btn" onClick={() => setModalEvent(null)}>Cotizar ahora →</Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </SocialWrapper>
  );
}