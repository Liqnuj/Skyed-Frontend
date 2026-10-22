import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/social/userMenu.css';

/**
 * Menú de la cuenta en la barra de SkyedSocial (igual idea que el de
 * SKYED Deportivo): al tocar el nombre se abre un panel con el acceso al
 * panel de usuario y, si la cuenta es adminSocial, al panel de
 * administración. Se usa en SocialNav, así que funciona en todas las
 * páginas de Social.
 */
export default function SocialUserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);

  // Se cierra al cambiar de página (por ejemplo, al elegir una opción).
  useEffect(() => {
    setAbierto(false);
  }, [location.pathname, location.search]);

  // Se cierra al hacer clic afuera o al presionar Escape.
  useEffect(() => {
    if (!abierto) return;

    const alHacerClic = (e: MouseEvent) => {
      if (!contenedorRef.current?.contains(e.target as Node)) setAbierto(false);
    };
    const alPresionarTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAbierto(false);
        botonRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', alHacerClic);
    document.addEventListener('keydown', alPresionarTecla);
    return () => {
      document.removeEventListener('mousedown', alHacerClic);
      document.removeEventListener('keydown', alPresionarTecla);
    };
  }, [abierto]);

  if (!user) return null;

  const esAdmin = user.roles.includes('adminSocial');
  const nombreCorto = user.name.split(' ')[0];
  const iniciales = user.name
    .split(' ')
    .filter(Boolean)
    .map((parte) => parte[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const rol = esAdmin
    ? 'Administrador'
    : user.roles.includes('cliente')
      ? 'Cliente SkyedSocial'
      : 'Miembro SKYED';

  const opciones = [
    { to: '/social/perfil', icono: 'ti-layout-dashboard', titulo: 'Perfil', detalle: 'Resumen de tu cuenta' },
    { to: '/social/reservar', icono: 'ti-dollar-sign', titulo: 'Cotizar reserva', detalle: 'Solicita una cotización para tu reserva' }
  ];

  const cerrarSesion = async () => {
    setAbierto(false);
    await logout();
    navigate('/social');
  };

  const avatar = (clase: string) => (
    <span className={clase} aria-hidden="true">
      {user.foto_url ? <img src={user.foto_url} alt="" /> : iniciales}
    </span>
  );

  return (
    <div className={`um-wrap${abierto ? ' is-open' : ''}`} ref={contenedorRef}>
      <button
        ref={botonRef}
        type="button"
        className="nav-cta um-trigger"
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}
      >
        {avatar('um-avatar')}
        <span className="um-trigger-name">{nombreCorto}</span>
        <i className="ti ti-chevron-down um-chevron" aria-hidden="true" />
      </button>

      <div className="um-panel" role="menu" aria-label="Menú de tu cuenta">
        <div className="um-head">
          {avatar('um-head-avatar')}
          <div className="um-head-text">
            <strong className="um-head-name">{user.name}</strong>
            <span className="um-head-mail">{user.email}</span>
            <span className="um-role">
              <i className={`ti ${esAdmin ? 'ti-shield-check' : 'ti-sparkles'}`} aria-hidden="true" />
              {rol}
            </span>
          </div>
        </div>

        <div className="um-list">
          {esAdmin && (
            <>
              <Link to="/social/admin" className="um-item is-admin" role="menuitem">
                <span className="um-item-icon"><i className="ti ti-shield-check" aria-hidden="true" /></span>
                <span className="um-item-text">
                  <strong>Panel de administración</strong>
                  <small>Eventos, reservas y PQRS</small>
                </span>
              </Link>
              <div className="um-sep" role="separator" />
            </>
          )}

          {opciones.map((opcion) => (
            <Link key={opcion.to} to={opcion.to} className="um-item" role="menuitem">
              <span className="um-item-icon"><i className={`ti ${opcion.icono}`} aria-hidden="true" /></span>
              <span className="um-item-text">
                <strong>{opcion.titulo}</strong>
                <small>{opcion.detalle}</small>
              </span>
            </Link>
          ))}

          <div className="um-sep" role="separator" />

          <button type="button" className="um-item is-logout" role="menuitem" onClick={cerrarSesion}>
            <span className="um-item-icon"><i className="ti ti-logout" aria-hidden="true" /></span>
            <span className="um-item-text">
              <strong>Cerrar sesión</strong>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
