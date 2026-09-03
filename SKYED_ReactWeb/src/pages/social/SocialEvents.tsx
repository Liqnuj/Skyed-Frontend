import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SocialWrapper from '../../components/social/SocialWrapper';
import CanvasParticles from '../../components/social/CanvasParticles';
import { socialEvents } from '../../data/mock';
import { SocialEventCard } from '../../components/EventCard';

const PAGE_SIZE = 6;

const FILTERS = [
  { label: 'Todos', value: 'Todos' },
  { label: 'Bodas', value: 'Bodas' },
  { label: 'Quinceañeras', value: 'Quinceañeras' },
  { label: 'Cumpleaños', value: 'Cumpleaños' },
  { label: 'Corporativos', value: 'Corporativos' },
  { label: 'Baby shower', value: 'Baby shower' },
];

export default function SocialEvents() {
  const [filter, setFilter] = useState('Todos');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [modalEvent, setModalEvent] = useState<number | null>(null);

  const filtered = useMemo(
    () => (filter === 'Todos' ? socialEvents : socialEvents.filter((e) => e.category === filter)),
    [filter]
  );
  const items = filtered.slice(0, visible);
  const hasMore = visible < filtered.length;
  const ev = socialEvents.find((e) => e.id === modalEvent);

  function handleFilter(value: string) {
    setFilter(value);
    setVisible(PAGE_SIZE);
  }

  return (
    <SocialWrapper>
      <main>
        {/* PAGE HERO */}
        <section className="page-hero" id="pHero">
          <CanvasParticles id="pageParticles" />
          <div className="hero-overlay" />
          <div className="container" style={{ position: 'relative', zIndex: 2 }}>
            <h1 className="page-hero-title">
              Nuestros <em>eventos</em>
            </h1>
            <p className="page-hero-sub">
              Desde bodas íntimas hasta recepciones espectaculares — personalizamos cada detalle a tu medida.
            </p>
          </div>
        </section>

        {/* EVENTS */}
        <section className="events-section">
          <div className="container">
            <div className="filter-bar">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  className={`filter-btn ${filter === f.value ? 'active' : ''}`}
                  onClick={() => handleFilter(f.value)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="events-grid">
              {items.map((e) => (
                <SocialEventCard key={e.id} event={e} onViewDetails={setModalEvent} />
              ))}
            </div>
            {hasMore && (
              <div className="events-load">
                <button className="btn-primary" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                  Ver más eventos →
                </button>
              </div>
            )}
          </div>
        </section>

        {/* EVENT MODAL */}
        {ev && (
          <div
            className="modal-overlay open"
            onClick={(e) => {
              if (e.target === e.currentTarget) setModalEvent(null);
            }}
          >
            <div className="modal-box">
              <div className="modal-img">
                <div className="img-placeholder media-fill icon-size" style={{ '--icon-size': '8rem' } as React.CSSProperties}>
                  <img src={ev.image} alt={ev.title} className="media-fill-img" />
                </div>
              </div>
              <button className="modal-close" onClick={() => setModalEvent(null)} aria-label="Cerrar">
                ✕
              </button>
              <div className="modal-body">
                <span className="modal-tag">{ev.tag}</span>
                <div className="modal-title">{ev.title}</div>
                <div className="modal-meta">
                  <div className="modal-meta-item">
                    <strong>{ev.guests}</strong>
                    <span>Invitados</span>
                  </div>
                  <div className="modal-meta-item">
                    <strong>{ev.hours}h</strong>
                    <span>Duración</span>
                  </div>
                  <div className="modal-meta-item">
                    <strong>{ev.price}</strong>
                    <span>Desde</span>
                  </div>
                </div>
                <p className="modal-desc">{ev.description}</p>
                <div className="modal-includes">
                  <h4>¿Qué incluye?</h4>
                  <ul>
                    {ev.includes.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                </div>
                <div className="modal-price-row">
                  <div>
                    <div className="modal-price">{ev.price}</div>
                    <div className="modal-price-note">Precio base · Personalizable</div>
                  </div>
                  <Link
                    to="/social/reservar"
                    className="btn-primary modal-cta-btn"
                    onClick={() => setModalEvent(null)}
                  >
                    Cotizar ahora →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </SocialWrapper>
  );
}