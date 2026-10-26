import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AccountMenu from '../shared/AccountMenu';
import type { GrupoMenu } from '../shared/AccountMenu';

export default function SportNav() {
const [open, setOpen] = useState(false);
const close = () => setOpen(false);
const { user } = useAuth();

  const esAdminDeportivo = user?.roles.includes('adminDeportivo') ?? false;
  const esAdminSocial = user?.roles.includes('adminSocial') ?? false;
  // Cualquier administrador: no tiene perfil de participante (inscripciones, QR...).
  const esAdmin = esAdminDeportivo || esAdminSocial;

  // Opciones del menú de la cuenta (mismo diseño que el de SkyedSocial).
  const grupos: GrupoMenu[] = [
    {
      // Admin deportivo: acceso a su panel. Admin social (de visita): nada,
      // el menú solo trae "Cerrar sesión".
      opciones: esAdminDeportivo
        ? [{ to: '/deportivo/admin', icono: 'ti-shield-check', titulo: 'Panel de administración', detalle: 'Eventos, pagos y control de acceso', destacada: true }]
        : [],
    },
    {
      // Los administradores no tienen perfil de participante.
      opciones: esAdmin ? [] : [
        { to: '/deportivo/perfil', icono: 'ti-layout-dashboard', titulo: 'Mi perfil', detalle: 'Resumen y estadísticas' },
      ],
    },
  ];

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

        <button className={`hamburger ${open ? 'active' : ''}`} aria-expanded={open} aria-controls="nav-list" aria-label="Abrir menú" onClick={() => setOpen((o) => !o)}>
          <span></span><span></span><span></span>
        </button>
        <ul className={`nav-links ${open ? 'open' : ''}`} id="nav-list">
          <li><NavLink to="/deportivo" end onClick={close}>Inicio</NavLink></li>
          <li><NavLink to="/deportivo/eventos" onClick={close}>Eventos</NavLink></li>
          <li><NavLink to="/deportivo/nosotros" onClick={close}>Nosotros</NavLink></li>
          <li><Link to="/deportivo/nosotros#contactanos" onClick={close}>Contacto</Link></li>
        </ul>
        <div className="nav-cta">
          {user ? (
            <AccountMenu
              tema="deportivo"
              grupos={grupos}
              rol={esAdmin ? 'Administrador' : 'Ciclista SKYED'}
              alSalirIrA="/deportivo"
            />
          ) : (
            <Link to="/login" className="btn btn-primary">Iniciar sesión</Link>
          )}
        </div>
      </nav>
    </header>
  );
}
