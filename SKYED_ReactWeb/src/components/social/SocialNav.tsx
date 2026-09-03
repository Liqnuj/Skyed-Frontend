import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function SocialNav() {
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!userMenuOpen) return;
    const timer = setTimeout(() => setUserMenuOpen(false), 5000);
    return () => clearTimeout(timer);
  }, [userMenuOpen]);

  const close = () => setOpen(false);

  return (
    <nav id="navbar" className={scrolled ? 'scrolled' : ''}>
      <div className="nav-inner">
        <Link className="brand" to="/social" aria-label="Inicio SKYED">
          <img src="/assets/social/logo_social.png" alt="logo social" />
          <span>SKYED<em>SOCIAL</em></span>
        </Link>

        <Link to="/" className="home-btn" title="Volver a SKYED Principal" aria-label="Volver al inicio principal">
          <i className="ti ti-home" aria-hidden="true" />
        </Link>

        <div className={`nav-links ${open ? 'open' : ''}`} id="navLinks">
          <NavLink to="/social" end onClick={close}>Inicio</NavLink>
          <NavLink to="/social/eventos" onClick={close}>Eventos</NavLink>
          <NavLink to="/social/lugares" onClick={close}>Lugares</NavLink>
          <NavLink to="/social/nosotros" onClick={close}>Nosotros</NavLink>
          <NavLink to="/social/pqr" onClick={close}>PQRS</NavLink>
          <a href="#contacto" onClick={close}>Contacto</a>
        </div>

        {user ? (
          <button
            className={`nav-cta${userMenuOpen ? ' nav-cta--logout' : ''}`}
            onClick={() => (userMenuOpen ? logout() : setUserMenuOpen(true))}
          >
            {userMenuOpen ? 'Cerrar sesión?' : user.name}
          </button>
        ) : (
          <Link to="/social/reservar" className="nav-cta" onClick={close}>Reservar ahora</Link>
        )}

        <button className={`hamburger ${open ? 'active' : ''}`} id="hamburger" onClick={() => setOpen((o) => !o)} aria-label="Menú">
          <span></span><span></span><span></span>
        </button>
      </div>
    </nav>
  );
}