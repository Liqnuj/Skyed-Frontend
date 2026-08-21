import PrincipalWrapper from '../../components/principal/PrincipalWrapper';
import PrincipalNav from '../../components/principal/PrincipalNav';
import PrincipalFooter from '../../components/principal/PrincipalFooter';

const TICKER_ITEMS: [string, string, string][] = [
  ['g', 'ti-confetti', 'Bodas'],
  ['t', 'ti-bike', 'Ciclismo de ruta'],
  ['g', 'ti-star', 'Quinceañeras'],
  ['t', 'ti-mountain', 'MTB'],
  ['g', 'ti-building', 'Corporativos'],
  ['t', 'ti-trophy', 'Competencias Gravel'],
  ['g', 'ti-heart', 'Cumpleaños'],
  ['t', 'ti-flag', 'BMX'],
  ['g', 'ti-music', 'Lanzamientos'],
  ['t', 'ti-users', '25K ciclistas activos'],
];

export default function HomePage() {
  return (
    <PrincipalWrapper>
      <PrincipalNav />

      {/* ===== HERO ===== */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-badge">
          <div className="badge-pulse" />
          Colombia · Plataforma de eventos
        </div>
        <h1>
          Celebra la vida.<br />
          <em className="gold">Eventos sociales</em> &amp;<br />
          <span className="teal">deportivos</span> en un solo lugar.
        </h1>
        <p className="hero-sub">
          Un universo donde los sueños se convierten en momentos reales.
          Escoge tu mundo y empieza a vivir la experiencia.
        </p>
      </section>

      {/* ===== CHOOSE ===== */}
      <section className="choose-section" id="mundos">
        <br /><br />
        <p className="choose-label">Elige tu destino</p>
        <div className="choose-wrap">
          <div className="choose-half choose-social">
            <div className="choose-orb orb-s1" />
            <div className="choose-orb orb-s2" />
            <div className="choose-icon-wrap"><i className="ti ti-confetti" /></div>
            <div className="choose-tag">Eventos sociales</div>
            <div className="choose-name">SKYED<br />Social</div>
            <p className="choose-desc">
              Diseñamos experiencias que emocionan. Desde bodas íntimas hasta grandes
              corporativos, cada evento es único como tú.
            </p>
            <ul className="choose-features">
              <li><span className="feat-dot" />Bodas &amp; celebraciones de lujo</li>
              <li><span className="feat-dot" />Quinceañeras y cumpleaños temáticos</li>
              <li><span className="feat-dot" />Eventos corporativos y lanzamientos</li>
              <li><span className="feat-dot" />Cotización personalizada en línea</li>
              <li><span className="feat-dot" />Coordinación total del evento</li>
            </ul>
            <a href="/social" className="big-btn">
              <span>Ingresar a SKYEDSocial</span>
              <div className="big-btn-arrow"><i className="ti ti-arrow-right" /></div>
            </a>
            <div className="choose-stats">
              <div className="cs"><div className="cs-num">850+</div><div className="cs-lbl">Eventos</div></div>
              <div className="cs"><div className="cs-num">98%</div><div className="cs-lbl">Satisfacción</div></div>
              <div className="cs"><div className="cs-num">12</div><div className="cs-lbl">Años</div></div>
            </div>
          </div>

          <div className="choose-half choose-sport">
            <div className="choose-orb orb-d1" />
            <div className="choose-orb orb-d2" />
            <div className="choose-icon-wrap"><i className="ti ti-bike" /></div>
            <div className="choose-tag">Eventos deportivos</div>
            <div className="choose-name">SKYED<br />Deportivo</div>
            <p className="choose-desc">
              La plataforma número uno del ciclismo colombiano. Inscríbete, compite
              y forma parte de la comunidad más grande sobre dos ruedas.
            </p>
            <ul className="choose-features">
              <li><span className="feat-dot" />Eventos de ruta, MTB, gravel y BMX</li>
              <li><span className="feat-dot" />Inscripción 100% en línea</li>
              <li><span className="feat-dot" />Dashboard del participante</li>
              <li><span className="feat-dot" />Rankings y resultados en tiempo real</li>
              <li><span className="feat-dot" />Kits y dorsales personalizados</li>
            </ul>
            <a href="/deportivo" className="big-btn">
              <span>Ingresar a SKYEDDeportivo</span>
              <div className="big-btn-arrow"><i className="ti ti-arrow-right" /></div>
            </a>
            <div className="choose-stats">
              <div className="cs"><div className="cs-num">120+</div><div className="cs-lbl">Eventos</div></div>
              <div className="cs"><div className="cs-num">25K</div><div className="cs-lbl">Ciclistas</div></div>
              <div className="cs"><div className="cs-num">72%</div><div className="cs-lbl">Repiten</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== TICKER ===== */}
      <div className="ticker-wrap">
        <div className="ticker-track">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map(([cls, icon, label], i) => (
            <span className={`ticker-item ${cls}`} key={i}><i className={`ti ${icon}`} /><span>{label}</span></span>
          ))}
        </div>
      </div>

      {/* ===== QUÉ ENCONTRARÁS ===== */}
      <section className="section section-find">
        <p className="section-eyebrow muted">Qué encontrarás</p>
        <h2>Dos mundos, infinitas experiencias</h2>
        <p className="section-sub">Cada plataforma fue diseñada con un propósito claro: darte exactamente lo que necesitas.</p>

        <div className="find-grid">
          <div className="find-col">
            <div className="find-col-header fch-social"><i className="ti ti-confetti" /> SkyedSocial</div>
            <div className="find-card">
              <div className="find-ic gold-ic"><i className="ti ti-calendar-event" /></div>
              <div className="find-info"><h4>Explorador de eventos</h4><p>Navega por todos los eventos disponibles y encuentra el que se adapta a tu ocasión especial.</p></div>
            </div>
            <div className="find-card">
              <div className="find-ic gold-ic"><i className="ti ti-file-invoice" /></div>
              <div className="find-info"><h4>Cotizador instantáneo</h4><p>Recibe una propuesta personalizada en minutos con todos los detalles de tu evento.</p></div>
            </div>
            <div className="find-card">
              <div className="find-ic gold-ic"><i className="ti ti-photo" /></div>
              <div className="find-info"><h4>Galería de inspiración</h4><p>Explora fotos y videos de eventos anteriores para inspirar tu próxima celebración.</p></div>
            </div>
            <div className="find-card">
              <div className="find-ic gold-ic"><i className="ti ti-headset" /></div>
              <div className="find-info"><h4>Asistencia personalizada</h4><p>Un coordinador dedicado te acompaña desde la planeación hasta el último detalle.</p></div>
            </div>
          </div>

          <div className="find-col">
            <div className="find-col-header fch-sport"><i className="ti ti-bike" /> SKYED Deportivo</div>
            <div className="find-card_event">
              <div className="find-ic teal-ic"><i className="ti ti-map-2" /></div>
              <div className="find-info"><h4>Mapa de eventos</h4><p>Encuentra competencias cerca de ti: ruta, MTB, gravel, pista y BMX en toda Colombia.</p></div>
            </div>
            <div className="find-card_event">
              <div className="find-ic teal-ic"><i className="ti ti-id-badge" /></div>
              <div className="find-info"><h4>Inscripción y dorsal</h4><p>Regístrate en segundos y gestiona tu número de dorsal y kit desde tu panel personal.</p></div>
            </div>
            <div className="find-card_event">
              <div className="find-ic teal-ic"><i className="ti ti-chart-line" /></div>
              <div className="find-info"><h4>Rankings en tiempo real</h4><p>Sigue tu posición en el ranking general y por categoría durante y después del evento.</p></div>
            </div>
            <div className="find-card_event">
              <div className="find-ic teal-ic"><i className="ti ti-users-group" /></div>
              <div className="find-info"><h4>Comunidad ciclista</h4><p>Conecta con más de 25.000 ciclistas activos, comparte rutas y vive la pasión colectiva.</p></div>
            </div>
          </div>
        </div>
      </section>

      <div className="divider" />

      {/* ===== MISIÓN / VISIÓN / VALORES ===== */}
      <section className="section section-mv" id="quienes">
        <p className="section-eyebrow muted">Quiénes somos</p>
        <h2>Nuestra esencia</h2>
        <p className="section-sub">Somos más que una plataforma. Somos el puente entre lo que sueñas y lo que vives.</p>

        <div className="mv-grid">
          <div className="mv-card">
            <div className="mv-icon mv-purple"><i className="ti ti-eye" /></div>
            <h3>Visión</h3>
            <p>Ser la plataforma líder de eventos en Latinoamérica, conectando personas a través de experiencias sociales y deportivas que transformen vidas.</p>
          </div>
          <div className="mv-card">
            <div className="mv-icon mv-gold"><i className="ti ti-target" /></div>
            <h3>Misión</h3>
            <p>Crear y gestionar eventos de clase mundial con tecnología, pasión y atención al detalle, haciendo que cada momento sea único e inolvidable.</p>
          </div>
          <div className="mv-card">
            <div className="mv-icon mv-teal"><i className="ti ti-heart" /></div>
            <h3>Nuestros valores</h3>
            <p>Excelencia, pasión, innovación y compromiso con cada cliente. Creemos que los grandes momentos merecen grandes experiencias.</p>
          </div>
        </div>
      </section>

      <div className="divider" />

      {/* ===== QUOTE ===== */}
      <section className="quote-section">
        <span className="quote-mark">"</span>
        <p className="quote-text">Cada evento que organizamos es una historia que alguien contará por el resto de su vida. Eso es lo que nos mueve cada día.</p>
        <p className="quote-author">— Equipo SKYED Universe · Colombia</p>
      </section>

      {/* ===== CTA ===== */}
      <section className="cta-section">
        <div className="cta-blob cta-blob--left" />
        <div className="cta-blob cta-blob--right" />
        <div className="cta-inner">
          <span className="cta-badge">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            Únete a la comunidad
          </span>
          <h2 className="cta-title">¿Listo para tu <span className="cta-highlight">próximo evento</span>?</h2>
          <p className="cta-subtitle">Únete a miles de personas que ya están encontrando y disfrutando eventos con SKYED.</p>
          <a href="/login" className="cta-btn">
            Comenzar gratis
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </section>

      <PrincipalFooter />
    </PrincipalWrapper>
  );
}
