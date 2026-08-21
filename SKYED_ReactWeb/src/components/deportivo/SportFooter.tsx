export default function SportFooter() {
  return (
    <footer className="sky-footer" id="contacto">
      <div className="sky-accent-bar"></div>
      <div className="sky-footer-top">
        <div className="sky-footer-col">
          <div className="sky-logo-row">
            <img src="/assets/deportivo/logo_deportivo.png" alt="SKYED" className="sky-logo-icon" />
            <div className="sky-logo-text">SKY<span>ED</span></div>
          </div>
          <p className="sky-tagline">La plataforma profesional para eventos de ciclismo en Boyacá.</p>
          <div className="sky-social-row">
            <a className="sky-social-btn" href="https://www.facebook.com/?locale=es_LA" target="_blank" rel="noopener noreferrer" aria-label="Facebook">F</a>
            <a className="sky-social-btn" href="https://www.instagram.com/?hl=es" target="_blank" rel="noopener noreferrer" aria-label="Instagram">IG</a>
            <a className="sky-social-btn" href="https://twitter.com/?lang=es" target="_blank" rel="noopener noreferrer" aria-label="X / Twitter">X</a>
          </div>
        </div>

        <div className="sky-footer-col">
          <p className="sky-col-title">Contacto</p>
          <ul className="sky-contact-list">
            <li className="sky-contact-item">
              <div className="sky-contact-icon"><i className="ti ti-mail" /></div>
              <div className="sky-contact-text"><strong>Email</strong>skyeddeportivo@gmail.com</div>
            </li>
            <li className="sky-contact-item">
              <div className="sky-contact-icon"><i className="ti ti-phone" /></div>
              <div className="sky-contact-text"><strong>Teléfono</strong>+57 313 201 3573</div>
            </li>
            <li className="sky-contact-item">
              <div className="sky-contact-icon"><i className="ti ti-map-pin" /></div>
              <div className="sky-contact-text"><strong>Ubicación</strong>Sogamoso, Boyacá</div>
            </li>
          </ul>
        </div>
      </div>

      <div className="sky-footer-bottom">
        <p className="sky-copy">© 2026 <span>SKYED</span>. Todos los derechos reservados.</p>
        <div className="sky-bottom-links">
          <a href="#">Términos de uso</a>
          <a href="#">Privacidad</a>
        </div>
      </div>
    </footer>
  );
}
