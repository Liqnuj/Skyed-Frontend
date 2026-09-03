import { Link } from 'react-router-dom';
import SocialWrapper from '../../components/social/SocialWrapper';
import NsHeroParticles from '../../components/social/HeroParticles';

const TIMELINE = [
  {
    year: '2014',
    title: 'Los primeros pasos',
    text: 'SkyedSocial nace en Sogamoso con un objetivo simple: que organizar un evento dejara de ser estresante y se convirtiera en parte de la celebración misma.',
  },
  {
    year: '2017',
    title: 'Crecimos con nuestros clientes',
    text: 'Ampliamos nuestro equipo y sumamos alianzas con proveedores de decoración, catering y entretenimiento para ofrecer una coordinación verdaderamente integral.',
  },
  {
    year: '2020',
    title: 'Innovamos en plena pandemia',
    text: 'Reinventamos nuestros formatos con eventos híbridos y protocolos de bioseguridad, sin perder la calidez que nos caracteriza.',
  },
  {
    year: '2026',
    title: '850+ eventos y contando',
    text: 'Hoy seguimos creciendo con la misma pasión del primer día, acompañando bodas, quinceañeras, cumpleaños y eventos corporativos en toda la región.',
  },
];

const VALUES = [
  {
    icon: 'ti-heart',
    title: 'Pasión',
    text: 'Vivimos cada evento como si fuera el nuestro, con el mismo entusiasmo desde la primera reunión hasta el último brindis.',
  },
  {
    icon: 'ti-checklist',
    title: 'Compromiso',
    text: 'Cumplimos lo prometido, con un equipo disponible antes, durante y después de tu celebración.',
  },
  {
    icon: 'ti-bulb',
    title: 'Creatividad',
    text: 'Ningún evento es igual a otro: diseñamos cada propuesta pensando en lo que te hace único.',
  },
  {
    icon: 'ti-shield-check',
    title: 'Confianza',
    text: 'Construimos relaciones a largo plazo basadas en transparencia y comunicación constante con cada cliente.',
  },
];

export default function About() {
  return (
    <SocialWrapper>
      <main>
        {/* HERO NOSOTROS */}
        <section className="ns-hero" id="nsHero">
          <NsHeroParticles />
          <div className="hero-overlay" />
          <div className="container" style={{ position: 'relative', zIndex: 2 }}>
            <span className="section-label">Nuestra esencia</span>
            <h1>
              Doce años convirtiendo ideas en <em>momentos inolvidables</em>
            </h1>
            <p>
              Somos un equipo de diseñadores, coordinadores y creativos que cree que cada celebración merece su
              propia historia. Esta es la nuestra.
            </p>
          </div>
        </section>

        {/* HISTORIA */}
        <section className="about-strip">
          <div className="container">
            <div className="text-center">
              <span className="section-label">Nuestra historia</span>
              <h2 className="section-title">
                El camino hasta <em>hoy</em>
              </h2>
              <p className="section-sub">
                De una idea pequeña a la plataforma de eventos en la que cientos de familias confían cada año.
              </p>
            </div>

            <div className="ns-timeline">
              {TIMELINE.map((t) => (
                <div className="ns-timeline-item" key={t.year}>
                  <span className="ns-timeline-year">{t.year}</span>
                  <h3>{t.title}</h3>
                  <p>{t.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* MISION Y VISION */}
        <section className="events-section">
          <div className="container">
            <div className="text-center">
              <span className="section-label">Lo que nos mueve</span>
              <h2 className="section-title">
                Misión y <em>visión</em>
              </h2>
            </div>

            <div className="ns-mission-grid">
              <div className="ns-mission-card">
                <span className="ns-eyebrow">Misión</span>
                <h3>Crear experiencias a la medida de cada historia</h3>
                <p>
                  Diseñar y coordinar eventos memorables, cuidando cada detalle para que nuestros clientes vivan su
                  celebración en lugar de organizarla.
                </p>
              </div>
              <div className="ns-mission-card">
                <span className="ns-eyebrow">Visión</span>
                <h3>Ser referentes de eventos en Latinoamérica</h3>
                <p>
                  Consolidarnos como la plataforma líder en planeación de eventos, reconocida por la calidad, la
                  creatividad y la cercanía con cada cliente.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* VALORES */}
        <section className="gallery-section">
          <div className="container">
            <div className="text-center">
              <span className="section-label">Nuestros valores</span>
              <h2 className="section-title">
                Lo que nos <em>define</em>
              </h2>
            </div>

            <div className="ns-values-grid">
              {VALUES.map((v) => (
                <div className="ns-value-card" key={v.title}>
                  <div className="ns-value-icon">
                    <i className={`ti ${v.icon}`} />
                  </div>
                  <h3>{v.title}</h3>
                  <p>{v.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="conocenos-section">
          <div className="container">
            <div className="conocenos-box">
              <span className="section-label">¿Listo para empezar?</span>
              <h2 className="section-title">
                Hagamos realidad <em>tu próximo evento</em>
              </h2>
              <p className="section-sub">
                Cuéntanos tu idea y te ayudamos a convertirla en una experiencia inolvidable.
              </p>
              <a href="#contacto" className="btn-primary">
                Hablar con un asesor →
              </a>
            </div>
          </div>
        </section>

        {/* MAPA */}
        <div className="ns-map-section">
          <div className="ns-map-wrap">
            <div className="ns-map-top">
              <div className="ns-map-top-left">
                <div className="ns-map-eyebrow">Nuestra ubicación</div>
                <h2 className="ns-map-title">Encuéntranos en Sogamoso</h2>
                <p className="ns-map-sub">Boyacá, Colombia · Sede principal SKYED</p>
              </div>
              <div className="ns-map-badge">
                <div className="ns-map-dot" /> Encuéntranos aquí
              </div>
            </div>

            <div className="ns-map-shell">
              <iframe
                className="ns-map-frame"
                src="https://maps.google.com/maps?q=Sogamoso,Boyaca,Colombia&output=embed&z=14"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Ubicación SKYED Social"
              />

              <div className="ns-map-info-row">
                <div className="ns-map-info-cell">
                  <div className="ns-map-info-icon">
                    <i className="ti ti-building" />
                  </div>
                  <div>
                    <div className="ns-map-info-label">Dirección</div>
                    <div className="ns-map-info-val">Sogamoso, Boyacá</div>
                  </div>
                </div>
                <div className="ns-map-info-cell">
                  <div className="ns-map-info-icon">
                    <i className="ti ti-clock" />
                  </div>
                  <div>
                    <div className="ns-map-info-label">Horario</div>
                    <div className="ns-map-info-val">Lun – Vie · 8 am – 6 pm</div>
                  </div>
                </div>
                <div className="ns-map-info-cell">
                  <div className="ns-map-info-icon">
                    <i className="ti ti-phone" />
                  </div>
                  <div>
                    <div className="ns-map-info-label">Teléfono</div>
                    <div className="ns-map-info-val">+57 317 703 7517</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </SocialWrapper>
  );
}