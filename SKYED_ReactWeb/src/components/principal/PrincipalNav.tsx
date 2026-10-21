import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AccountMenu from '../shared/AccountMenu';
import type { GrupoMenu } from '../shared/AccountMenu';
import PanelesAdmin from './PanelesAdmin';

export default function PrincipalNav() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const esAdminDeportivo = user?.roles.includes('adminDeportivo') ?? false;
  const esAdminSocial = user?.roles.includes('adminSocial') ?? false;

  // Menú de la cuenta: los dos módulos y, si aplica, sus paneles de
  // administración (en celular es el único acceso a esos paneles).
  const grupos: GrupoMenu[] = [
    {
      titulo: 'Mis espacios',
      opciones: [
        { to: '/deportivo/perfil', icono: 'ti-bike', titulo: 'SKYED Deportivo', detalle: 'Mi perfil, inscripciones y QR', color: 'deportivo' },
        { to: '/social/perfil', icono: 'ti-confetti', titulo: 'SkyedSocial', detalle: 'Mis reservas y PQR', color: 'social' },
      ],
    },
    {
      titulo: 'Administración',
      opciones: [
        ...(esAdminDeportivo
          ? [{ to: '/deportivo/admin', icono: 'ti-shield-check', titulo: 'Panel Deportivo', detalle: 'Eventos, pagos y acceso con QR', destacada: true, color: 'deportivo' as const }]
          : []),
        ...(esAdminSocial
          ? [{ to: '/social/admin', icono: 'ti-shield-check', titulo: 'Panel Social', detalle: 'Eventos, reservas y PQRS', destacada: true, color: 'social' as const }]
          : []),
      ],
    },
  ];

  const rol = esAdminDeportivo || esAdminSocial ? 'Administrador' : 'Miembro SKYED';

  return (
    <>
      <nav className="nav">
        <div className="nav-brand">
          <div className="nav-gem"><img src="/assets/principal/icon1.png" alt="logol" /></div>
          <span>SKY<em>ED</em></span>
        </div>

        {/* Accesos a los paneles de administración (solo administradores). */}
        <PanelesAdmin />

        {user ? (
          <AccountMenu tema="principal" grupos={grupos} rol={rol} alSalirIrA="/" />
        ) : (
          <Link to="/login" className="nav-login">
            <i className="ti ti-login" /> Iniciar sesión
          </Link>
        )}

        {/* Con sesión, todo está en el menú de la cuenta: el botón de
            hamburguesa solo hace falta para "Iniciar sesión" en celular. */}
        {!user && (
          <button className="nav-menu-btn" aria-label="Abrir menú" onClick={() => setOpen((o) => !o)}>
            <i className="ti ti-menu-2" />
          </button>
        )}
      </nav>

      {!user && (
        <div className={`mobile-menu${open ? ' open' : ''}`}>
          <Link to="/login" className="mobile-login" onClick={() => setOpen(false)}>Iniciar sesión</Link>
        </div>
      )}
    </>
  );
}
