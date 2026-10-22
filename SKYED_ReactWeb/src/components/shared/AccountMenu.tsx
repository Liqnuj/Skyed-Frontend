import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useMenuDesplegable } from '../../hooks/useMenuDesplegable';
import '../../styles/shared/accountMenu.css';

export type OpcionMenu = {
  to: string;
  icono: string;
  titulo: string;
  detalle?: string;
  /** Resalta la opción (por ejemplo, el panel de administración). */
  destacada?: boolean;
  /** Color propio del ícono, p. ej. el de cada módulo. */
  color?: 'deportivo' | 'social';
};

export type GrupoMenu = {
  titulo?: string;
  opciones: OpcionMenu[];
  /** Clase extra para el grupo (p. ej. para mostrarlo solo en celular). */
  clase?: string;
};

type Props = {
  /** Paleta del módulo donde se muestra. */
  tema: 'deportivo' | 'principal';
  grupos: GrupoMenu[];
  /** Texto de la etiqueta bajo el correo (p. ej. "Administrador"). */
  rol: string;
  /** A dónde ir después de cerrar sesión. */
  alSalirIrA: string;
};

/**
 * Menú de la cuenta de la barra de navegación (mismo diseño que el de
 * SkyedSocial): avatar, nombre, correo y rol arriba, y las opciones que
 * cada módulo le pase. Lo usan SportNav y PrincipalNav.
 */
export default function AccountMenu({ tema, grupos, rol, alSalirIrA }: Props) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { abierto, setAbierto, contenedorRef, botonRef } = useMenuDesplegable();

  if (!user) return null;

  const nombreCorto = user.name.split(' ')[0];
  const iniciales = user.name
    .split(' ')
    .filter(Boolean)
    .map((parte) => parte[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const cerrarSesion = async () => {
    setAbierto(false);
    await logout();
    navigate(alSalirIrA);
  };

  const avatar = (clase: string) => (
    <span className={clase} aria-hidden="true">
      {user.foto_url ? <img src={user.foto_url} alt="" /> : iniciales}
    </span>
  );

  return (
    <div className={`am-wrap${abierto ? ' is-open' : ''}`} data-tema={tema} ref={contenedorRef}>
      <button
        ref={botonRef}
        type="button"
        className="am-trigger"
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}
      >
        {avatar('am-avatar')}
        <span className="am-trigger-name">{nombreCorto}</span>
        <i className="ti ti-chevron-down am-chevron" aria-hidden="true" />
      </button>

      <div className="am-panel" role="menu" aria-label="Menú de tu cuenta">
        <div className="am-head">
          {avatar('am-head-avatar')}
          <div className="am-head-text">
            <strong className="am-head-name">{user.name}</strong>
            <span className="am-head-mail">{user.email}</span>
            <span className="am-role">
              <i className="ti ti-sparkles" aria-hidden="true" />
              {rol}
            </span>
          </div>
        </div>

        <div className="am-list">
          {grupos
            .filter((grupo) => grupo.opciones.length > 0)
            .map((grupo, i) => (
              <div className={`am-group${grupo.clase ? ` ${grupo.clase}` : ''}`} key={grupo.titulo ?? i}>
                {grupo.titulo && <p className="am-group-title">{grupo.titulo}</p>}
                {grupo.opciones.map((opcion) => (
                  <Link
                    key={opcion.to}
                    to={opcion.to}
                    role="menuitem"
                    className={`am-item${opcion.destacada ? ' is-highlight' : ''}${opcion.color ? ` is-${opcion.color}` : ''}`}
                  >
                    <span className="am-item-icon"><i className={`ti ${opcion.icono}`} aria-hidden="true" /></span>
                    <span className="am-item-text">
                      <strong>{opcion.titulo}</strong>
                      {opcion.detalle && <small>{opcion.detalle}</small>}
                    </span>
                    <i className="ti ti-chevron-right am-item-go" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            ))}

          <div className="am-sep" role="separator" />

          <button type="button" role="menuitem" className="am-item is-logout" onClick={cerrarSesion}>
            <span className="am-item-icon"><i className="ti ti-logout" aria-hidden="true" /></span>
            <span className="am-item-text"><strong>Cerrar sesión</strong></span>
          </button>
        </div>
      </div>
    </div>
  );
}
