import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SocialWrapper from '../../components/social/SocialWrapper';
import CanvasParticles from '../../components/social/CanvasParticles';
import { eventoSocialService, type EventoSocial } from '../../services/socialService';

const PAGE_SIZE = 6;
const FALLBACK_IMG = '/assets/social/salon.png';

function formatPrecio(precio: string | null | undefined) {
  if (!precio) return null;
  const numero = Number(precio);
  if (Number.isNaN(numero) || numero <= 0) return null;
  return numero.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });
}

/** Adapta un evento social del backend a lo que necesita esta vista. */
function mapEvento(e: EventoSocial) {
  const categoria = e.tipoEvento?.nombre_tipo_eves ?? 'Evento';
  const desdePrecio = formatPrecio(e.ambiente?.precio_referencia_a ?? null);

  return {
    id: e.id_er,
    title: e.nombre_er,
    category: categoria,
    tag: categoria.toUpperCase(),
    image: e.imagen_er || e.ambiente?.imagen_principal_a || FALLBACK_IMG,
    location: e.ambiente?.nombre_a ?? 'Lugar por confirmar',
    description: e.descripcion_er ?? 'Evento organizado por el equipo de SKYED Social.',
    price: desdePrecio ? `Desde ${desdePrecio}` : 'Precio a cotizar',
    guests: e.ambiente?.capacidad_a ?? null,
    includes: e.ambiente?.servicios?.map((s) => s.nombre_s) ?? [],
  };
}

export default function SocialEvents() {
  const [eventos, setEventos] = useState<EventoSocial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filter, setFilter] = useState('Todos');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [modalEvent, setModalEvent] = useState<number | null>(null);

  useEffect(() => {
    eventoSocialService
      .listar()
      .then((res) => setEventos(res.data.filter((e) => e.estado_er === 'activo')))
      .catch(() => setError('No se pudieron cargar los eventos. Intenta más tarde.'))
      .finally(() => setLoading(false));
  }, []);

  const mapped = useMemo(() => eventos.map(mapEvento), [eventos]);

  // Las categorías del filtro salen de los tipos de evento que el admin
  // realmente haya creado, en vez de una lista fija.
  const categories = useMemo(() => {
    const unique = Array.from(new Set(mapped.map((e) => e.category)));
    return ['Todos', ...unique];
  }, [mapped]);

  const filtered = useMemo(
    () => (filter === 'Todos' ? mapped : mapped.filter((e) => e.category === filter)),
    [filter, mapped]
  );
  const items = filtered.slice(0, visible);
  const hasMore = visible < filtered.length;
  const ev = mapped.find((e) => e.id === modalEvent);

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
            {loading && <p className="text-center">Cargando eventos...</p>}
            {error && <p className="text-center form-error error">{error}</p>}

            {!loading && !error && (
              <>
                {mapped.length > 0 && (
                  <div className="filter-bar">
                    {categories.map((c) => (
                      <button
                        key={c}
                        className={`filter-btn ${filter === c ? 'active' : ''}`}
                        onClick={() => handleFilter(c)}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}

                {mapped.length === 0 && (
                  <p className="text-center">Todavía no hay eventos publicados.</p>
                )}

                <div className="events-grid">
                  {items.map((e) => (
                    <article className="event-card reveal" key={e.id}>
                      <div className="event-card-img">
                        <img src={e.image} alt={e.title} />
                        <div className="event-price">{e.price}</div>
                        <div className="event-tag">{e.category}</div>
                      </div>
                      <div className="event-card-body">
                        <div className="event-card-title">{e.title}</div>
                        <div className="event-card-meta">
                          <span className="event-meta-item">📍 {e.location}</span>
                        </div>
                        <p className="event-card-desc">{e.description}</p>
                        <div className="event-card-footer">
                          <button className="btn-sm-primary" onClick={() => setModalEvent(e.id)}>
                            Ver detalles
                          </button>
                          <Link className="btn-sm-outline" to="/social/reservar">
                            Cotizar
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                {hasMore && (
                  <div className="events-load">
                    <button className="btn-primary" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                      Ver más eventos →
                    </button>
                  </div>
                )}
              </>
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
                  {ev.guests !== null && (
                    <div className="modal-meta-item">
                      <strong>{ev.guests}</strong>
                      <span>Capacidad</span>
                    </div>
                  )}
                  <div className="modal-meta-item">
                    <strong>{ev.location}</strong>
                    <span>Lugar</span>
                  </div>
                </div>
                <p className="modal-desc">{ev.description}</p>
                {ev.includes.length > 0 && (
                  <div className="modal-includes">
                    <h4>¿Qué incluye el lugar?</h4>
                    <ul>
                      {ev.includes.map((i) => (
                        <li key={i}>{i}</li>
                      ))}
                    </ul>
                  </div>
                )}
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
