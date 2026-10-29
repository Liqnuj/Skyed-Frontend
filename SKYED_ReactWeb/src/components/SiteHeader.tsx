import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type Brand = 'main' | 'sport' | 'social';

export default function SiteHeader({ brand = 'main' }: { brand?: Brand }) {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const links = brand === 'sport'
    ? [['Inicio', '/deportivo'], ['Eventos', '/deportivo/eventos'], ['Nosotros', '/deportivo/nosotros'], ['Resultados', '/deportivo/resultados']]
    : brand === 'social'
      ? [['Inicio', '/social'], ['Eventos', '/social/eventos'], ['Lugares', '/social/lugares'], ['Nosotros', '/social/nosotros'], ['PQRS', '/social/pqr']]
      : [['Inicio', '/'], ['Deportivo', '/deportivo'], ['Social', '/social']];

  const brandName = brand === 'sport' ? 'SKYED DEPORTIVO' : brand === 'social' ? 'SKYED SOCIAL' : 'SKYED';

  return (
    <header className={`site-header ${brand}`}>
      <div className="nav-shell">
        <Link title="Ir al inicio" className="brand" to={brand === 'sport' ? '/deportivo' : brand === 'social' ? '/social' : '/'}>
          <img
            src={brand === 'sport' ? '/assets/deportivo/logo_deportivo_nav.png' : brand === 'social' ? '/assets/social/logo_social.png' : '/assets/principal/logoP.png'}
            alt={brandName}
          />
          <span>{brandName}</span>
        </Link>

        <button title={open ? 'Cerrar el menú' : 'Abrir el menú'} className="mobile-menu" aria-label="Abrir menú" onClick={() => setOpen(!open)}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>

        <nav className={`nav-links ${open ? 'open' : ''}`}>
          {links.map(([label, path]) => (
            <NavLink title={`Ir a ${label}`} key={path} to={path} onClick={() => setOpen(false)}>{label}</NavLink>
          ))}
          {brand === 'sport' && <NavLink title="Ver mi entrada" to="/deportivo/mi-entrada" onClick={() => setOpen(false)}>Mi entrada</NavLink>}
          {brand === 'social' && <NavLink title="Reservar un evento" to="/social/reservar" onClick={() => setOpen(false)}>Reservar</NavLink>}
          {user ? (
            <>
              <NavLink title="Ir a mi perfil" to="/perfil" onClick={() => setOpen(false)}>{user.name}</NavLink>
              <button title="Cerrar tu sesión" className="nav-button" onClick={() => { logout(); navigate('/'); setOpen(false); }}><LogOut size={16}/> Salir</button>
            </>
          ) : (
            <Link title="Iniciar sesión o crear una cuenta" className="nav-button primary" to="/login" onClick={() => setOpen(false)}><LogIn size={16}/> Iniciar sesión</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
