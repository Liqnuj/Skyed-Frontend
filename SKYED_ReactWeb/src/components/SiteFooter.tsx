import { Link } from 'react-router-dom';

export default function SiteFooter({ variant = 'main' }: { variant?: 'main' | 'sport' | 'social' }) {
  const email = variant === 'sport' ? 'skyeddeportivo@gmail.com' : variant === 'social' ? 'skyedsocial@gmail.com' : 'contacto@skyed.com';
  const phone = variant === 'sport' ? '+57 313 201 3573' : variant === 'social' ? '+57 317 703 7517' : '+57 300 000 0000';
  return (
    <footer className={`site-footer ${variant}`}>
      <div className="footer-grid">
        <div>
          <div className="footer-brand">SKYED</div>
          <p>La plataforma profesional para eventos deportivos y sociales en Boyacá.</p>
        </div>
        <div>
          <h3>Explora</h3>
          <Link to="/">Inicio</Link>
          <Link to="/deportivo">SKYED Deportivo</Link>
          <Link to="/social">SKYED Social</Link>
        </div>
        <div>
          <h3>Contacto</h3>
          <span>{email}</span>
          <span>{phone}</span>
          <span>Sogamoso, Boyacá</span>
        </div>
      </div>
      <div className="footer-bottom">© 2026 SKYED. Todos los derechos reservados.</div>
    </footer>
  );
}
