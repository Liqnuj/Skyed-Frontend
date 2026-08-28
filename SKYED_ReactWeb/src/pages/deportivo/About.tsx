import '../../styles/deportivo/deportivo.css';
import SportWrapper from '../../components/deportivo/SportWrapper';

export default function About() {
  return (
    <SportWrapper>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css" />
      <main id="main" className="about-page">
        <section className="page-header">
          <h1>Sobre nosotros</h1>
          <p>
            En SKYED, somos apasionados por el ciclismo y estamos comprometidos a
            ofrecer la mejor experiencia para ciclistas de todos los niveles en
            Sogamoso, Boyacá.
          </p>
        </section>

        <section className="section about" id="nosotros">
          <div className="container">
            <div className="about-content">
              <div className="about-text">
                <h2 className="about-title">Historia</h2>
                <p>
                  Fundada en 2020, SKYED nació de la visión de crear una plataforma
                  integral que conectara a ciclistas con eventos profesionales de
                  ruta, MTB, gravel, pista y BMX. Nuestro equipo está formado por
                  expertos en ciclismo, tecnología y organización de eventos,
                  dedicados a brindar un servicio excepcional.
                </p>
                <p>
                  Creemos que el ciclismo es más que un deporte; es una comunidad
                  vibrante que une a personas de todas las edades y habilidades.
                  Por eso, nos esforzamos por ofrecer eventos seguros, emocionantes
                  y accesibles para todos los ciclistas en Sogamoso, Boyacá.
                </p>
              </div>
              <div
                className="about-img"
                style={{ backgroundImage: "url('/assets/deportivo/imagen_nosotros.png')" }}
                role="img"
                aria-label="Ciclistas disfrutando de un evento organizado por SKYED"
              ></div>
            </div>
          </div>
        </section>

        <section className="section mv-section">
          <div className="container">
            <div className="mv-grid">
              <div className="mv-card">
                <div className="mv-icon">🎯</div>
                <h3>Nuestra misión</h3>
                <p>
                  Organizar y desarrollar eventos deportivos de ciclismo de alta
                  calidad, promoviendo la disciplina, el trabajo en equipo y la
                  pasión por el deporte. Nos enfocamos en brindar experiencias
                  seguras, innovadoras y memorables para ciclistas, patrocinadores
                  y espectadores, contribuyendo al crecimiento de la comunidad
                  deportiva.
                </p>
              </div>

              <div className="mv-card mv-card--vision">
                <div className="mv-icon">🔭</div>
                <h3>Nuestra visión</h3>
                <p>
                  Para el 2030, queremos ser reconocidos como un referente en la
                  organización de eventos de ciclismo, reconocida por su
                  profesionalismo, innovación y compromiso con el desarrollo del
                  deporte, creando experiencias que unan a la comunidad ciclista y
                  promuevan un estilo de vida activo y saludable.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="section tl-section">
          <div className="container">
            <h2 className="section-title">Linea del tiempo SKYED</h2>
            <p className="section-sub">
              Los momentos que nos han hecho crecer como comunidad ciclista.
            </p>

            <div className="tl-outer">
              <div className="tl-line"></div>
              <div className="tl-items">
                <div className="tl-item">
                  <div className="tl-card tl-card--top">
                    <i className="ti ti-rocket" aria-hidden="true"></i>
                    <h4>Fundación</h4>
                    <p>Nació SKYED en Sogamoso, Boyacá.</p>
                  </div>
                  <div className="tl-pin"></div>
                  <div className="tl-year tl-year--bottom">2020</div>
                </div>

                <div className="tl-item">
                  <div className="tl-year tl-year--top">2021</div>
                  <div className="tl-pin"></div>
                  <div className="tl-card tl-card--bottom">
                    <i className="ti ti-trophy" aria-hidden="true"></i>
                    <h4>Primer evento</h4>
                    <p>200+ ciclistas en el Gran Fondo.</p>
                  </div>
                </div>

                <div className="tl-item">
                  <div className="tl-card tl-card--top">
                    <i className="ti ti-mountain" aria-hidden="true"></i>
                    <h4>MTB y Gravel</h4>
                    <p>Nuevas disciplinas en la región andina.</p>
                  </div>
                  <div className="tl-pin"></div>
                  <div className="tl-year tl-year--bottom">2022</div>
                </div>

                <div className="tl-item">
                  <div className="tl-year tl-year--top">2023</div>
                  <div className="tl-pin"></div>
                  <div className="tl-card tl-card--bottom">
                    <i className="ti ti-users" aria-hidden="true"></i>
                    <h4>10.000 ciclistas</h4>
                    <p>Hito histórico en la plataforma.</p>
                  </div>
                </div>

                <div className="tl-item tl-item--active">
                  <div className="tl-card tl-card--top">
                    <i className="ti ti-medal" aria-hidden="true"></i>
                    <h4>Temporada récord</h4>
                    <p>120+ eventos, líderes en LATAM.</p>
                  </div>
                  <div className="tl-pin"></div>
                  <div className="tl-year tl-year--bottom">2026</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <h2 className="section-title">¿Por qué SKYED?</h2>
            <p className="section-sub">
              Una experiencia completa para descubrir, inscribirte y vivir cada evento.
            </p>
            <div className="features-grid">
              <div className="flip-card">
                <div className="flip-card-inner">
                  <div className="flip-card-front">
                    <div className="feature-icon" aria-hidden="true">🚴</div>
                    <h3>Eventos certificados</h3>
                    <p>
                      Trabajamos para ofrecerte una buena seguridad en tu recorrido.
                      Te ayudamos a calcular tus tiempos y posiciones.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flip-card">
                <div className="flip-card-inner">
                  <div className="flip-card-front">
                    <div className="feature-icon" aria-hidden="true">🏆</div>
                    <h3>Soporte permanente</h3>
                    <p>
                      Contamos con un equipo listo para resolver cualquier
                      inconveniente durante tu inscripción, en cada paso del camino.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flip-card">
                <div className="flip-card-inner">
                  <div className="flip-card-front">
                    <div className="feature-icon" aria-hidden="true">🔒</div>
                    <h3>Pago seguro</h3>
                    <p>
                      Usamos los más altos estándares de seguridad para proteger tu
                      información personal y financiera en cada transacción.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section ev-section">
          <div className="container">
            <h2 className="section-title">Nuestros eventos mas destacados</h2>
            <p className="section-sub">Los eventos que han marcado la historia de SKYED.</p>
          </div>
          <div>
            <div className="cards-grid">
              <div className="event-card">
                <img className="card-bg-img" src="/assets/deportivo/img_even1.png" alt="Primer Gran Fondo" />
                <div className="card-overlay"></div>
                <div className="card-border-glow"></div>
                <div className="card-year-badge">2021</div>
                <div className="card-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 17l5-5-5-5" /><path d="M11 17l5-5-5-5" /><line x1="18" y1="7" x2="18" y2="17" />
                  </svg>
                </div>
                <div className="number-accent">21</div>
                <div className="card-content">
                  <h3 className="title">Primer Gran Fondo</h3>
                  <p className="card-description">
                    El inicio de todo. Una salida épica que marcó el comienzo de
                    nuestra historia en las vías de Boyacá.
                  </p>
                  <div className="card-meta">
                    <span className="meta-dot"></span>
                    200 ciclistas · Sogamoso
                  </div>
                </div>
              </div>

              <div className="event-card">
                <img className="card-bg-img" src="/assets/deportivo/img_event2.png" alt="Debut MTB Boyacá" />
                <div className="card-overlay"></div>
                <div className="card-border-glow"></div>
                <div className="card-year-badge">2022</div>
                <div className="card-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3l4 8 5-5 5 15H2L8 3z" />
                  </svg>
                </div>
                <div className="number-accent">22</div>
                <div className="card-content">
                  <h3 className="title">Debut MTB Boyacá</h3>
                  <p className="card-description">
                    La expansión al mundo del MTB. Rutas técnicas y terreno salvaje
                    para los más aventureros.
                  </p>
                  <div className="card-meta">
                    <span className="meta-dot"></span>
                    450 ciclistas · Tunja
                  </div>
                </div>
              </div>

              <div className="event-card">
                <img className="card-bg-img" src="/assets/deportivo/img_event3.png" alt="Gran Tour Andino" />
                <div className="card-overlay"></div>
                <div className="card-border-glow"></div>
                <div className="card-year-badge">2023</div>
                <div className="card-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
                <div className="number-accent">23</div>
                <div className="card-content">
                  <h3 className="title">Gran Tour Andino</h3>
                  <p className="card-description">
                    La edición más grande, con más de 800 ciclistas recorriendo los
                    caminos más icónicos de los Andes.
                  </p>
                  <div className="card-meta">
                    <span className="meta-dot"></span>
                    800 ciclistas · Villa de Leyva
                  </div>
                </div>
              </div>
              <br />
            </div>
          </div>
        </section>

        <div className="skyed-map-wrap">
          <div className="top-bar">
            <div className="top-left">
              <div className="eyebrow">Nuestra ubicación</div>
              <h2>Encuéntranos en Sogamoso</h2>
              <p>Boyacá, Colombia · Sede principal SKYED</p>
            </div>
            <div className="badge-online">
              <div className="dot"></div> Encuentranos aqui
            </div>
          </div>

          <div className="map-shell">
            <iframe
              className="map-frame"
              title="Ubicación SKYED en Sogamoso"
              src="https://maps.google.com/maps?q=Sogamoso,Boyaca,Colombia&output=embed&z=14"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>

            <div className="info-row">
              <div className="info-cell">
                <div className="info-icon"><i className="ti ti-building"></i></div>
                <div>
                  <div className="info-label">Dirección</div>
                  <div className="info-val">Sogamoso, Boyacá</div>
                </div>
              </div>
              <div className="info-cell">
                <div className="info-icon"><i className="ti ti-clock"></i></div>
                <div>
                  <div className="info-label">Horario</div>
                  <div className="info-val">Lun – Vie · 8 am – 6 pm</div>
                </div>
              </div>
              <div className="info-cell">
                <div className="info-icon"><i className="ti ti-phone"></i></div>
                <div>
                  <div className="info-label">Teléfono</div>
                  <div className="info-val">+57 313 201 3573</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </SportWrapper>
  );
}