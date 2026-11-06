import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Páginas propias de un usuario final (perfil, inscripciones, reservas,
 * PQR...). Un administrador puede recorrer los dos módulos para "ver",
 * pero no tiene perfil de participante/cliente: si entra por URL se le
 * devuelve a su panel (si administra ese módulo) o al inicio del módulo.
 *
 * Si el admin social llega desde el enlace "PQRS", se le abre directamente
 * la sección PQRS de su panel (?seccion=pqr), sin importar cuál fue la
 * última sección que tenía abierta.
 */
export default function SoloUsuarios({ modulo }: { modulo: 'deportivo' | 'social' }) {
  const { user, verificando } = useAuth();
  const { pathname } = useLocation();

  if (verificando) return null;

  const esAdminDeportivo = user?.roles.includes('adminDeportivo') ?? false;
  const esAdminSocial = user?.roles.includes('adminSocial') ?? false;

  if (!esAdminDeportivo && !esAdminSocial) return <Outlet />;

  const esAdminDeEsteModulo = modulo === 'deportivo' ? esAdminDeportivo : esAdminSocial;

  if (!esAdminDeEsteModulo) return <Navigate to={`/${modulo}`} replace />;

  // El admin social que pulsa "PQRS" va a la sección PQRS de su panel.
  const quierePqr = modulo === 'social' && /^\/social\/pqr\/?$/.test(pathname);
  const destino = quierePqr ? '/social/admin?seccion=pqr' : `/${modulo}/admin`;

  return <Navigate to={destino} replace />;
}