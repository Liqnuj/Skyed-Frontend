import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AccountMenu from '../shared/AccountMenu';
import type { GrupoMenu } from '../shared/AccountMenu';

// Secciones de la página de inicio (cada id está en HomePage.tsx).
const SECCIONES = [
  { id: 'inicio', etiqueta: 'Inicio' },
  { id: 'mundos', etiqueta: 'Elige tu destino' },
  { id: 'encontraras', etiqueta: 'Qué encontrarás' },
  { id: 'quienes', etiqueta: 'Quiénes somos' },
  { id: 'unete', etiqueta: 'Únete' },
];

/** Baja (o sube) suavemente hasta una sección. El margen del encabezado fijo
 *  lo da `scroll-padding-top` en principal.css. */
function irASeccion(id: string) {
  const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const behavior: ScrollBehavior = reducir ? 'auto' : 'smooth';
  if (id === 'inicio') {
    window.scrollTo({ top: 0, behavior });
    return;
  }
  document.getElementById(id)?.scrollIntoView({ behavior, block: 'start' });
}

export default function PrincipalNav() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname, hash } = useLocation();
  const enInicio = pathname === '/';
  const [activa, setActiva] = useState('inicio');

  // Si se llega desde otra página con /#seccion, baja hasta ella al cargar.
  useEffect(() => {
    if (!enInicio || !hash) return;
    const t = window.setTimeout(() => irASeccion(hash.slice(1)), 80);
    return () => window.clearTimeout(t);
  }, [enInicio, hash]);

  // Marca en el menú la sección que está en el centro de la pantalla.
  useEffect(() => {
    if (!enInicio) return;
    const elementos = SECCIONES
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);
    if (elementos.length === 0) return;

    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) setActiva(entrada.target.id);
        }
      },
      { rootMargin: '-40% 0px -55% 0px' },
    );
    elementos.forEach((el) => observador.observe(el));
    return () => observador.disconnect();
  }, [enInicio]);

  const destino = (id: string) => (id === 'inicio' ? '/' : `/#${id}`);

  // En la página de inicio se desplaza sin recargar; desde otra página el
  // Link lleva a "/#seccion" y el efecto de arriba hace el desplazamiento.
  const alPulsar = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
    setOpen(false);
    if (enInicio) {
      e.preventDefault();
      irASeccion(id);
    }
  };

  const esAdminDeportivo = user?.roles.includes('adminDeportivo') ?? false;
  const esAdminSocial = user?.roles.includes('adminSocial') ?? false;

  const esAdmin = esAdminDeportivo || esAdminSocial;

  // Menú de la cuenta.
  // - Usuario normal: sus dos espacios (perfil deportivo / social).
  // - Administrador: NO ve los botones de perfil; solo el acceso al panel
  //   que le corresponde (adminDeportivo -> Panel Deportivo,
  //   adminSocial -> Panel Social). Es el único acceso a los paneles, tanto
  //   en escritorio como en celular (ya no hay botón suelto en la barra).
  const grupos: GrupoMenu[] = [
    ...(esAdmin
      ? []
      : [
          {
            titulo: 'Mis espacios',
            opciones: [
              { to: '/deportivo/perfil', icono: 'ti-bike', titulo: 'SKYED Deportivo', detalle: 'Mi perfil, inscripciones y QR', color: 'deportivo' as const },
              { to: '/social/perfil', icono: 'ti-confetti', titulo: 'SkyedSocial', detalle: 'Mis reservas y PQR', color: 'social' as const },
            ],
          },
        ]),
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

  const rol = esAdmin ? 'Administrador' : 'Miembro SKYED';

  return (
    <>
      <nav className="nav">
        <div className="nav-brand">
          <div className="nav-gem"><img src="/assets/principal/icon1.png" alt="logol" /></div>
          <span>SKY<em>ED</em></span>
        </div>

        {/* Navegación por las secciones de la página (escritorio). */}
        <ul className="nav-sections" aria-label="Secciones de la página">
          {SECCIONES.map((sec) => (
            <li key={sec.id}>
              <Link
                to={destino(sec.id)}
                className={`nav-section-link${enInicio && activa === sec.id ? ' active' : ''}`}
                aria-current={enInicio && activa === sec.id ? 'true' : undefined}
                onClick={(e) => alPulsar(e, sec.id)}
              >
                {sec.etiqueta}
              </Link>
            </li>
          ))}
        </ul>

        {user ? (
          <AccountMenu tema="principal" grupos={grupos} rol={rol} alSalirIrA="/" />
        ) : (
          <Link to="/login" className="nav-login">
            <i className="ti ti-login" /> Iniciar sesión
          </Link>
        )}

        {/* Menú de secciones en celular y pantallas angostas. */}
        <button
          className="nav-menu-btn"
          aria-label="Abrir menú de secciones"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <i className={`ti ${open ? 'ti-x' : 'ti-menu-2'}`} />
        </button>

        <div className={`mobile-menu${open ? ' open' : ''}`}>
          {SECCIONES.map((sec) => (
            <Link
              key={sec.id}
              to={destino(sec.id)}
              className={enInicio && activa === sec.id ? 'active' : undefined}
              onClick={(e) => alPulsar(e, sec.id)}
            >
              {sec.etiqueta}
            </Link>
          ))}
          {!user && (
            <Link to="/login" className="mobile-login" onClick={() => setOpen(false)}>Iniciar sesión</Link>
          )}
        </div>
      </nav>
    </>
  );
}