import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function SportNav() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="site-header" role="banner">
      <nav className="nav" aria-label="Navegación principal">
        <Link className="brand" to="/deportivo" aria-label="Inicio SKYED">
          <img src="/assets/deportivo/logo_deportivo.png" alt="" />
          <span>SKYED<em>DEPORTIVO</em></span>
        </Link>

        <Link to="/" className="home-btn" title="Volver a SKYED Principal" aria-label="Volver al inicio principal">
          <i className="ti ti-home" aria-hidden="true" />
        </Link>

        <button className="menu-toggle" aria-expanded={open} aria-controls="nav-list" aria-label="Abrir menú" onClick={() => setOpen((o) => !o)}>☰</button>
        <ul className={`nav-links ${open ? 'open' : ''}`} id="nav-list">
          <li><NavLink to="/deportivo" end onClick={close}>Inicio</NavLink></li>
          <li><NavLink to="/deportivo/eventos" onClick={close}>Eventos</NavLink></li>
          <li><NavLink to="/deportivo/nosotros" onClick={close}>Nosotros</NavLink></li>
          <li><a href="#contacto" onClick={close}>Contacto</a></li>
        </ul>
        <div className="nav-cta">
          {user ? (
            <>
              <span style={{ fontWeight: 600 }}>{user.name}</span>
              <button className="btn btn-primary" onClick={() => { logout(); navigate('/'); }}>Salir</button>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary">Iniciar sesión</Link>
          )}
        </div>
      </nav>
    </header>
  );
}
