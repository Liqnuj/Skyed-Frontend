import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function PrincipalNav() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    if (!userMenuOpen) return;
    const timer = setTimeout(() => setUserMenuOpen(false), 5000);
    return () => clearTimeout(timer);
  }, [userMenuOpen]);

  return (
    <>
      <nav className="nav">
        <div className="nav-brand">
          <div className="nav-gem"><img src="/assets/principal/icon1.png" alt="logol" /></div>
          <span>SKY<em>ED</em></span>
        </div>
        <div className="nav-links" />
        {user ? (
          <button
            className={`nav-user${userMenuOpen ? ' nav-user--logout' : ''}`}
            onClick={() => (userMenuOpen ? logout() : setUserMenuOpen(true))}
          >
            <i className="ti ti-user-circle" />
            <span>{userMenuOpen ? 'Cerrar sesión?' : user.name}</span>
          </button>
        ) : (
          <Link to="/login" className="nav-login">
            <i className="ti ti-login" /> Iniciar sesión
          </Link>
        )}
        <button className="nav-menu-btn" aria-label="Abrir menú" onClick={() => setOpen((o) => !o)}>
          <i className="ti ti-menu-2" />
        </button>
      </nav>

      <div className={`mobile-menu${open ? ' open' : ''}`}>
        {user ? (
          <button
            className={`mobile-user${userMenuOpen ? ' mobile-user--logout' : ''}`}
            onClick={() => (userMenuOpen ? logout() : setUserMenuOpen(true))}
          >
            {userMenuOpen ? 'Cerrar sesión?' : user.name}
          </button>
        ) : (
          <Link to="/login" className="mobile-login" onClick={() => setOpen(false)}>Iniciar sesión</Link>
        )}
      </div>
    </>
  );
}