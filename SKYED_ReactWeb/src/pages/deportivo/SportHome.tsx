import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SportWrapper from '../../components/deportivo/SportWrapper';
import { sportHeroSlides, sportHomeEvents } from '../../data/sportHomeData';

const FEATURES = [
  { cls: 'purple', title: 'Encuentra eventos cerca', desc: 'Mapa interactivo con jugadores y canchas disponibles en tiempo real', icon: <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" /> },
  { cls: 'amber', title: 'Match instantáneo', desc: 'Conecta con ciclistas de tu nivel y disponibilidad al instante', icon: <path d="m13 2-2 2.5h3L12 7M10 14v-3M14 14v-3M11 19H6.5a3.5 3.5 0 0 1 0-7h.085M13 19h4.5a3.5 3.5 0 0 0 0-7h-.085" /> },
  { cls: 'teal', title: 'Organización rápida', desc: 'Crea y gestiona eventos en segundos con chat integrado', icon: <><rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" /></> },
  { cls: 'pink', title: 'Sistema de reputación', desc: 'Rankings, logros y valoraciones para la mejor experiencia', icon: <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z" /> },
  { cls: 'blue', title: 'Comunidad segura', desc: 'Perfiles verificados y sistema de reportes para tu tranquilidad', icon: <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /> },
  { cls: 'green', title: 'Reservas con créditos', desc: 'Sistema flexible de créditos para gestionar tus eventos', icon: <><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></> },
];

const STEPS = [
  { num: 1, title: 'Crea tu perfil', desc: 'Registra tu disciplina favorita, nivel y zonas donde entrenas', icon: <><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></> },
  { num: 2, title: 'Encuentra eventos', desc: 'Explora el mapa o recibe sugerencias personalizadas según tu perfil', icon: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></> },
  { num: 3, title: '¡A pedalear!', desc: 'Confirma tu inscripción y disfruta del evento con tu comunidad', icon: <><circle cx="18.5" cy="17.5" r="3.5" /><circle cx="5.5" cy="17.5" r="3.5" /><circle cx="15" cy="5" r="1" /><path d="M12 17.5V14l-3-3 4-3 2 3h2" /></> },
];

const STATS = [
  { target: 120, suffix: '+', label: 'Eventos al año' },
  { target: 25, suffix: ' K', label: 'Ciclistas activos' },
  { target: 72, suffix: '%', label: 'Ciclistas que repiten' },
  { target: 98, suffix: '%', label: 'Satisfacción' },
];

function useCountUp(target: number, active: boolean) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf: number;
    const start = performance.now();
    const duration = 1400;
    function tick(now: number) {
      const p = Math.min(1, (now - start) / duration);
      setValue(Math.floor(p * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target]);
  return value;
}

function StatItem({ target, suffix, label }: { target: number; suffix: string; label: string }) {
  const value = useCountUp(target, true);
  return (
    <div className="stat-item">
      <span className="stat-num">{value}{suffix}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

export default function SportHome() {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % sportHeroSlides.length), 6000);
    return () => clearInterval(t);
  }, []);

  return (
    <SportWrapper>
      {/* HERO */}
      <section className="hero" aria-label="Galería principal">
        <div className="slides">
          {sportHeroSlides.map((src, i) => (
            <div key={src} className={`slide ${i === slide ? 'active' : ''}`} style={{ backgroundImage: `url('${src}')` }} />
          ))}
        </div>
        <button className="carousel-arrow prev" aria-label="Slide anterior" onClick={() => setSlide((s) => (s - 1 + sportHeroSlides.length) % sportHeroSlides.length)}>‹</button>
        <button className="carousel-arrow next" aria-label="Slide siguiente" onClick={() => setSlide((s) => (s + 1) % sportHeroSlides.length)}>›</button>
        <div className="hero-content">
          <span className="eyebrow">Temporada 2026 abierta</span>
          <h1>Vive el <em>ciclismo</em> como nunca antes</h1>
          <p>Inscríbete en los mejores eventos de ruta, MTB, gravel, pista y BMX. Una plataforma, miles de pedaladas.</p>
          <div className="hero-actions">
            <Link to="/deportivo/eventos" className="btn btn-primary">Ver eventos</Link>
          </div>
        </div>
        <div className="carousel-dots" role="tablist" aria-label="Navegación del carrusel">
          {sportHeroSlides.map((src, i) => (
            <button key={src} className={i === slide ? 'active' : ''} onClick={() => setSlide(i)} aria-label={`Ir a la diapositiva ${i + 1}`} />
          ))}
        </div>
      </section>

      {/* STATS */}
      <section className="stats" aria-label="Cifras de la comunidad">
        <div className="stats-grid">
          {STATS.map((s) => <StatItem key={s.label} {...s} />)}
        </div>
      </section>

      {/* FEATURES */}
      <section className="skyed-features" aria-label="Características de SKYED">
        <h2 className="skyed-features__title">Todo lo que necesitas para participar</h2>
        <p className="skyed-features__sub">Descubre todo lo que ofrecemos para que puedas disfrutar al máximo de tu experiencia en SKYED.</p>
        <div className="skyed-features__grid">
          {FEATURES.map((f) => (
            <div key={f.title} className={`skyed-card skyed-card--${f.cls}`}>
              <div className="skyed-card__glow" />
              <div className="skyed-card__icon">
                <svg viewBox="0 0 24 24">{f.icon}</svg>
              </div>
              <h3 className="skyed-card__title">{f.title}</h3>
              <p className="skyed-card__desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* STEPS */}
      <section className="skyed-steps" aria-label="Cómo funciona SKYED">
        <h2 className="skyed-steps__title">Así de fácil es participar</h2>
        <p className="skyed-steps__sub">En solo 3 pasos estarás disfrutando de tu evento favorito</p>
        <div className="skyed-steps__grid">
          {STEPS.map((s) => (
            <div key={s.num} className="skyed-step">
              <div className="skyed-step__bubble">
                <span className="skyed-step__num">{s.num}</span>
                <svg viewBox="0 0 24 24">{s.icon}</svg>
              </div>
              <h3 className="skyed-step__title">{s.title}</h3>
              <p className="skyed-step__desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* EVENTOS DESTACADOS */}
      <section className="section events-preview" aria-label="Eventos destacados">
        <div className="container">
          <h2 className="section-title">Próximos eventos</h2>
          <p className="section-sub">Una selección de las competencias más esperadas de la temporada.</p>
          <div className="events-grid">
            {sportHomeEvents.map((e) => (
              <article key={e.id} className="event-card">
                <div className="img" style={{ backgroundImage: `url('${e.image}')` }} role="img" aria-label={e.title}>
                  <span className="badge" style={e.badgeColor ? { background: e.badgeColor } : undefined}>{e.badge}</span>
                </div>
                <div className="body">
                  <h3>{e.title}</h3>
                  <div className="meta">{e.meta}</div>
                  <p className="desc">{e.desc}</p>
                  <div className="footer">
                    <span className="price">{e.price}</span>
                    <Link to="/deportivo/eventos" className="btn-ghost">Ver más</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <Link to="/deportivo/eventos" className="btn btn-primary">Ver todos los eventos →</Link>
          </div>
        </div>
      </section>
    </SportWrapper>
  );
}
