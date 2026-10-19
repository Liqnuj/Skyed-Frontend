import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function PrincipalNav() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Un admin puede serlo de Deportivo, de Social o de ambos: se muestra un
  // acceso por cada panel (antes había un solo link a /admin, que no existía).
  const panelesAdmin = [
    user?.roles.includes('adminDeportivo') && { to: '/deportivo/admin', label: 'Panel Deportivo' },
    user?.roles.includes('adminSocial') && { to: '/social/admin', label: 'Panel Social' },
  ].filter((p): p is { to: string; label: string } => Boolean(p));
  const etiquetaPanel = (label: string) => (panelesAdmin.length === 1 ? 'Panel Admin' : label);

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
        
        <div className="nav-links">
          {/* === NUEVO: Renderizado condicional del Panel Admin (Escritorio) === */}
          {panelesAdmin.map((panel) => (
            <Link key={panel.to} to={panel.to} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '1rem', fontWeight: '600', color: 'inherit', textDecoration: 'none' }}>
              <i className="ti ti-dashboard" /> {etiquetaPanel(panel.label)}
            </Link>
          ))}
        </div>

        {user ? (
          <button
            className={`nav-user${userMenuOpen ? ' nav-user--logout' : ''}`}
            onClick={() => (userMenuOpen ? logout() : setUserMenuOpen(true))}
          >
            <i className="ti ti-user-circle" />
            <span>{userMenuOpen ? 'Cerrar sesión' : user.name}</span>
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
        {/* === NUEVO: Renderizado condicional del Panel Admin (Móvil) === */}
        {panelesAdmin.map((panel) => (
          <Link
            key={panel.to}
            to={panel.to}
            className="mobile-login"
            style={{ marginBottom: '10px', backgroundColor: '#3b82f6' }}
            onClick={() => setOpen(false)}
          >
            <i className="ti ti-dashboard" /> {etiquetaPanel(panel.label)}
          </Link>
        ))}

        {user ? (
          <button
            className={`mobile-user${userMenuOpen ? ' mobile-user--logout' : ''}`}
            onClick={() => (userMenuOpen ? logout() : setUserMenuOpen(true))}
          >
            {userMenuOpen ? 'Cerrar sesión' : user.name}
          </button>
        ) : (
          <Link to="/login" className="mobile-login" onClick={() => setOpen(false)}>Iniciar sesión</Link>
        )}
      </div>
    </>
  );
}