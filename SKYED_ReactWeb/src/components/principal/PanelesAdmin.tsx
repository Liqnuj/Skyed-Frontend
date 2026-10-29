import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useMenuDesplegable } from '../../hooks/useMenuDesplegable';
import '../../styles/principal/panelesAdmin.css';

type Panel = {
  to: string;
  modulo: 'deportivo' | 'social';
  nombre: string;
  logo: string;
  funciones: string[];
};

const PANELES: Record<'adminDeportivo' | 'adminSocial', Panel> = {
  adminDeportivo: {
    to: '/deportivo/admin',
    modulo: 'deportivo',
    nombre: 'SKYED Deportivo',
    logo: '/assets/deportivo/logo_deportivo.png',
    funciones: ['Eventos y categorías', 'Inscripciones y pagos', 'Control de acceso con QR'],
  },
  adminSocial: {
    to: '/social/admin',
    modulo: 'social',
    nombre: 'SkyedSocial',
    logo: '/assets/social/logo_social.png',
    funciones: ['Eventos y lugares', 'Reservas y servicios', 'PQRS de los clientes'],
  },
};

/**
 * Acceso a los paneles de administración en la barra de la página
 * principal. Reemplaza los dos enlaces de texto "Panel Deportivo" /
 * "Panel Social": si la cuenta administra los dos módulos se abre un
 * selector con una tarjeta por panel; si administra uno, va directo.
 * En celular se oculta (los paneles quedan en el menú de la cuenta).
 */
export default function PanelesAdmin() {
  const { user } = useAuth();
  const { abierto, setAbierto, contenedorRef, botonRef } = useMenuDesplegable();

  const paneles = (['adminDeportivo', 'adminSocial'] as const)
    .filter((rol) => user?.roles.includes(rol))
    .map((rol) => PANELES[rol]);

  if (paneles.length === 0) return null;

  if (paneles.length === 1) {
    const panel = paneles[0];
    return (
      <div className="pa-wrap">
        <Link title={`Abrir el panel ${panel.modulo === 'deportivo' ? 'deportivo' : 'social'}`} to={panel.to} className={`pa-trigger pa-trigger--${panel.modulo}`}>
          <i className="ti ti-shield-check" aria-hidden="true" />
          Panel {panel.modulo === 'deportivo' ? 'Deportivo' : 'Social'}
        </Link>
      </div>
    );
  }

  return (
    <div className={`pa-wrap${abierto ? ' is-open' : ''}`} ref={contenedorRef}>
      <button title="Ver los paneles de administración"
        ref={botonRef}
        type="button"
        className="pa-trigger"
        aria-haspopup="true"
        aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}
      >
        <i className="ti ti-shield-check" aria-hidden="true" />
        Administración
        <span className="pa-count">{paneles.length}</span>
        <i className="ti ti-chevron-down pa-chevron" aria-hidden="true" />
      </button>

      <div className="pa-panel" role="dialog" aria-label="Paneles de administración">
        <div className="pa-head">
          <span className="pa-kicker">Paneles de administración</span>
          <p>Elige el módulo que quieres gestionar.</p>
        </div>

        <div className="pa-grid">
          {paneles.map((panel) => (
            <Link title={`Abrir el panel ${panel.modulo === 'deportivo' ? 'deportivo' : 'social'}`} key={panel.to} to={panel.to} className={`pa-card pa-card--${panel.modulo}`}>
              <span className="pa-card-banner">
                <span className="pa-card-logo"><img src={panel.logo} alt="" /></span>
              </span>
              <span className="pa-card-body">
                <strong>{panel.nombre}</strong>
                <span className="pa-card-list">
                  {panel.funciones.map((f) => (
                    <span key={f}><i className="ti ti-check" aria-hidden="true" />{f}</span>
                  ))}
                </span>
                <span className="pa-card-cta">
                  Abrir panel <i className="ti ti-arrow-right" aria-hidden="true" />
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
