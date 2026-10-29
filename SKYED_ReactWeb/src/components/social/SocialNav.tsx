import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import SocialUserMenu from './SocialUserMenu';
import NotificationBell from './NotificationBell';

export default function SocialNav() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const esAdmin = !!user && (user.roles.includes('adminSocial') || user.roles.includes('adminDeportivo'));

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const close = () => setOpen(false);

  return (
    <nav id="navbar" className={`${scrolled ? 'scrolled' : ''} ${open ? 'menu-open' : ''}`}>
      <div className="nav-inner">
        <Link title="Ir al inicio de SKYED Social" className="brand" to="/social" aria-label="Inicio SKYED">
          <img src="/assets/social/logo_social.png" alt="logo social" />
          <span>SKYED<em>SOCIAL</em></span>
        </Link>

        <Link to="/" className="home-btn" title="Volver a SKYED Principal" aria-label="Volver al inicio principal">
          <i className="ti ti-home" aria-hidden="true" />
        </Link>

        <div className={`nav-links ${open ? 'open' : ''}`} id="navLinks">
          <NavLink title="Ir al inicio" to="/social" end onClick={close}>Inicio</NavLink>
          <NavLink title="Ver los eventos sociales" to="/social/eventos" onClick={close}>Eventos</NavLink>
          <NavLink title="Ver los lugares disponibles" to="/social/lugares" onClick={close}>Lugares</NavLink>
          <NavLink title="Conocer SKYED Social" to="/social/nosotros" onClick={close}>Nosotros</NavLink>
          <NavLink title="Ir a peticiones, quejas, reclamos y sugerencias" to="/social/pqr" onClick={close}>PQRS</NavLink>
          <Link title="Ir a la sección de contacto" to="/social/nosotros#contactanos" onClick={close}>Contacto</Link>
        </div>

        {/* Si hay usuario, muestra el menú desplegable. Si NO hay, muestra el botón que envía al login con redirección */}
{user ? (
  <div className="nav-user-group">
    <SocialUserMenu />
    {!esAdmin && <NotificationBell />}
  </div>
) : (
          <Link title="Iniciar sesión para reservar" 
            to="/login?redirect=/social/reservar" 
            className="nav-cta" 
            onClick={close}
          >
            Reservar ahora
          </Link>
        )}

        <button title={open ? 'Cerrar el menú' : 'Abrir el menú'} className={`hamburger ${open ? 'active' : ''}`} id="hamburger" onClick={() => setOpen((o) => !o)} aria-label="Menú">
          <span></span><span></span><span></span>
        </button>
      </div>
    </nav>
  );
}