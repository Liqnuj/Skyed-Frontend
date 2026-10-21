import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AccountMenu from '../shared/AccountMenu';
import type { GrupoMenu } from '../shared/AccountMenu';

export default function SportNav() {
const [open, setOpen] = useState(false);
const close = () => setOpen(false);
const { user } = useAuth();

  const esAdmin = user?.roles.includes('adminDeportivo') ?? false;

  // Opciones del menú de la cuenta (mismo diseño que el de SkyedSocial).
  const grupos: GrupoMenu[] = [
    {
      opciones: esAdmin
        ? [{ to: '/deportivo/admin', icono: 'ti-shield-check', titulo: 'Panel de administración', detalle: 'Eventos, pagos y control de acceso', destacada: true }]
        : [],
    },
    {
      opciones: [
        { to: '/deportivo/perfil', icono: 'ti-layout-dashboard', titulo: 'Mi perfil', detalle: 'Resumen y estadísticas' },
        { to: '/deportivo/perfil?tab=inscripciones', icono: 'ti-bike', titulo: 'Mis inscripciones', detalle: 'Estado de tus carreras' },
        { to: '/deportivo/mi-entrada', icono: 'ti-qrcode', titulo: 'Mi entrada', detalle: 'Tu QR para el día del evento' },
        { to: '/deportivo/perfil?tab=historial', icono: 'ti-trophy', titulo: 'Historial', detalle: 'Tus participaciones y resultados' },
        { to: '/deportivo/perfil?tab=ajustes', icono: 'ti-settings', titulo: 'Ajustes', detalle: 'Datos y contraseña' },
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

        <button className="menu-toggle" aria-expanded={open} aria-controls="nav-list" aria-label="Abrir menú" onClick={() => setOpen((o) => !o)}>☰</button>
        <ul className={`nav-links ${open ? 'open' : ''}`} id="nav-list">
          <li><NavLink to="/deportivo" end onClick={close}>Inicio</NavLink></li>
          <li><NavLink to="/deportivo/eventos" onClick={close}>Eventos</NavLink></li>
          <li><NavLink to="/deportivo/nosotros" onClick={close}>Nosotros</NavLink></li>
          <li><a href="#contacto" onClick={close}>Contacto</a></li>
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
