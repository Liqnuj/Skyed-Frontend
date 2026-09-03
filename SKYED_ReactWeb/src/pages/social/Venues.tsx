import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SocialWrapper from '../../components/social/SocialWrapper';
import CanvasParticles from '../../components/social/CanvasParticles';
import { ambienteService, type Ambiente } from '../../services/socialService';

interface GalleryItem {
  emoji: string;
  image: string;
  bg: string;
  title: string;
  sub: string;
}

// La galería es contenido de vitrina/marketing, no viene de la base de
// datos (el backend no guarda fotos de eventos pasados), así que se
// mantiene igual que antes.
const galleryItems: GalleryItem[] = [
  { emoji: '💐', image: '/assets/social/boda_cesped.png', bg: 'img-p-wedding', title: 'Boda en jardín', sub: '150 invitados' },
  { emoji: '👑', image: '/assets/social/xv_dorados.png', bg: 'img-p-quince', title: 'XV años dorados', sub: '200 invitados' },
  { emoji: '🎂', image: '/assets/social/cumple_30.png', bg: 'img-p-birthday', title: 'Cumpleaños 30', sub: '80 invitados' },
  { emoji: '🏢', image: '/assets/social/gala_coorporativa.png', bg: 'img-p-corporate', title: 'Gala corporativa', sub: '300 invitados' },
  { emoji: '🍼', image: '/assets/social/baby.png', bg: 'img-p-baby', title: 'Baby shower', sub: '60 invitados' },
  { emoji: '🌺', image: '/assets/social/boda_playa.png', bg: 'img-p-reception', title: 'Boda de destino', sub: '90 invitados' },
  { emoji: '💐', image: '/assets/social/salon.png', bg: 'img-p-wedding', title: 'Boda de salón', sub: '200 invitados' },
  { emoji: '🎓', image: '/assets/social/fiesta_grado.png', bg: 'img-p-birthday', title: 'Fiesta de grado', sub: '120 invitados' },
];

function formatPrecio(precio: string | null) {
  if (!precio) return 'Consultar';
  const numero = Number(precio);
  if (Number.isNaN(numero)) return 'Consultar';
  return numero.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });
}

export default function Venues() {
  const navigate = useNavigate();
  const openBooking = () => navigate('/social/reservar');

  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    ambienteService
      .listar()
      .then((res) => setAmbientes(res.data))
      .catch(() => setError('No se pudieron cargar los espacios. Intenta más tarde.'))
      .finally(() => setLoading(false));
  }, []);

  // La galería se duplica para el efecto de scroll infinito, igual que renderGallery() en shared.js
  const trackItems = [...galleryItems, ...galleryItems];

  return (
    <SocialWrapper>
      <main>
        <section className="page-hero">
          <CanvasParticles id="pageParticles" />
          <div className="hero-overlay"></div>
          <div className="container" style={{ position: 'relative', zIndex: 2 }}>
            <h1 className="page-hero-title">
              Los mejores <em>escenarios</em>
              <br />
              para tu evento
            </h1>
            <p className="page-hero-sub">
              Trabajamos con una red de venues seleccionados por su elegancia, infraestructura y servicio.
            </p>
          </div>
        </section>

        {/* VENUES */}
        <section className="venue-section">
          <div className="container">
            {loading && <p className="text-center">Cargando espacios...</p>}
            {error && <p className="text-center form-error error">{error}</p>}

            {!loading && !error && ambientes.length === 0 && (
              <p className="text-center">Todavía no hay espacios publicados.</p>
            )}

            <div className="venue-grid">
              {ambientes.map((a) => (
                <div className="venue-card reveal" key={a.id_a}>
                  <div className="venue-img">
                    <div className="img-placeholder media-fill">
                      <img
                        src={a.imagen_principal_a ?? '/assets/social/salon.png'}
                        alt={a.nombre_a}
                        className="media-fill-img"
                      />
                    </div>
                    <div className="venue-capacity">👥 hasta {a.capacidad_a} personas</div>
                  </div>
                  <div className="venue-body">
                    <div className="venue-name">{a.nombre_a}</div>
                    {a.descripcion_a && <div className="venue-location">{a.descripcion_a}</div>}
                    {a.servicios && a.servicios.length > 0 && (
                      <div className="venue-tags">
                        {a.servicios.map((s) => (
                          <span className="venue-tag" key={s.id_s}>
                            {s.nombre_s}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="venue-price-row">
                      <div className="venue-price">
                        {formatPrecio(a.precio_referencia_a)} <span>arriendo / evento</span>
                      </div>
                      <button className="btn-sm-outline btn-nowrap" onClick={openBooking}>
                        Reservar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* GALLERY */}
        <section className="gallery-section">
          <div className="container">
            <div className="text-center reveal">
              <span className="section-label gallery-label">Galería de espacios</span>

              <h2 className="section-title gallery-title">
                Ambientes que
                <br />
                <em className="gallery-title-highlight">inspiran</em>
              </h2>
            </div>
          </div>

          <div className="gallery-wrapper">
            <div className="gallery-track">
              {trackItems.map((g, i) => (
                <div className="gallery-item" key={`${g.title}-${i}`}>
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
      </main>
    </SocialWrapper>
  );
}
