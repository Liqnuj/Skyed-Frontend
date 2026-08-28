import { useNavigate } from 'react-router-dom';
import SocialWrapper from '../../components/social/SocialWrapper';
import CanvasParticles from '../../components/social/CanvasParticles';

interface Venue {
  name: string;
  location: string;
  capacity: string;
  emoji: string;
  image: string;
  bg: string;
  tags: string[];
  price: string;
  per: string;
}

interface GalleryItem {
  emoji: string;
  image: string;
  bg: string;
  title: string;
  sub: string;
}

const venues: Venue[] = [
  { name: 'Hacienda El Paraíso', location: 'Via Choachí, Cundinamarca', capacity: 'hasta 300', emoji: '🏡', image: '/assets/social/hacienda_paraiso.png', bg: 'img-p-wedding', tags: ['Jardines', 'Piscina', 'Cabaña'], price: '$4.500.000', per: 'arriendo / noche' },
  { name: 'Salón Cenit', location: 'Chapinero Alto, Bogotá', capacity: 'hasta 250', emoji: '✨', image: '/assets/social/salon_cenit.png', bg: 'img-p-corporate', tags: ['Vista 360°', 'Terraza', 'AV incluido'], price: '$3.200.000', per: 'arriendo / evento' },
  { name: 'Club de Jardines Rosaleda', location: 'La Calera, Cundinamarca', capacity: 'hasta 180', emoji: '🌿', image: '/assets/social/jardines.png', bg: 'img-p-baby', tags: ['Jardines', 'Íntimo', 'Exclusivo'], price: '$2.800.000', per: 'arriendo / evento' },
  { name: 'Gran Salón Imperial', location: 'Usaquén, Bogotá', capacity: 'hasta 400', emoji: '🏛️', image: '/assets/social/salon_imperial.png', bg: 'img-p-quince', tags: ['Chandeliers', 'Catering propio', 'Parking'], price: '$5.800.000', per: 'arriendo / evento' },
  { name: 'Finca La Esperanza', location: 'Sopó, Cundinamarca', capacity: 'hasta 150', emoji: '🌄', image: '/assets/social/finca_esperanza.png', bg: 'img-p-birthday', tags: ['Montaña', 'Aire libre', 'Alojamiento'], price: '$2.200.000', per: 'arriendo / evento' },
  { name: 'Terraza Sky Garden', location: 'Zona Rosa, Bogotá', capacity: 'hasta 120', emoji: '🌆', image: '/assets/social/sky_garden.png', bg: 'img-p-reception', tags: ['Rooftop', 'Vista ciudad', 'DJ booth'], price: '$3.500.000', per: 'arriendo / evento' },
];

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

export default function Venues() {
  const navigate = useNavigate();
  const openBooking = () => navigate('/social/reservar');

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
            <div className="venue-grid">
              {venues.map((v) => (
                <div className="venue-card reveal" key={v.name}>
                  <div className="venue-img">
                    <div className="img-placeholder media-fill">
                      <img src={v.image} alt={v.name} className="media-fill-img" />
                    </div>
                    <div className="venue-capacity">👥 {v.capacity} personas</div>
                  </div>
                  <div className="venue-body">
                    <div className="venue-name">{v.name}</div>
                    <div className="venue-location">📍 {v.location}</div>
                    <div className="venue-tags">
                      {v.tags.map((t) => (
                        <span className="venue-tag" key={t}>
                          {t}
                        </span>
                      ))}
                    </div>
                    <div className="venue-price-row">
                      <div className="venue-price">
                        {v.price} <span>{v.per}</span>
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