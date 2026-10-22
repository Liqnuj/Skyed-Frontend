import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Páginas propias de un usuario final (perfil, inscripciones, reservas,
 * PQR...). Un administrador puede recorrer los dos módulos para "ver",
 * pero no tiene perfil de participante/cliente: si entra por URL se le
 * devuelve a su panel (si administra ese módulo) o al inicio del módulo.
 */
export default function SoloUsuarios({ modulo }: { modulo: 'deportivo' | 'social' }) {
  const { user } = useAuth();

  const esAdminDeportivo = user?.roles.includes('adminDeportivo') ?? false;
  const esAdminSocial = user?.roles.includes('adminSocial') ?? false;

  if (!esAdminDeportivo && !esAdminSocial) return <Outlet />;

  const esAdminDeEsteModulo = modulo === 'deportivo' ? esAdminDeportivo : esAdminSocial;

  return <Navigate to={esAdminDeEsteModulo ? `/${modulo}/admin` : `/${modulo}`} replace />;
}