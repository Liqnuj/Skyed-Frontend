import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * /admin: lleva a cada administrador a su panel. Antes el botón
 * "Panel Admin" del menú principal apuntaba aquí pero la ruta no
 * existía, así que terminaba en la página de inicio.
 */
export default function AdminRedirect() {
  const { user, verificando } = useAuth();

  if (verificando) return null;

  if (!user) return <Navigate to="/login" replace />;
  if (user.roles.includes('adminDeportivo')) return <Navigate to="/deportivo/admin" replace />;
  if (user.roles.includes('adminSocial')) return <Navigate to="/social/admin" replace />;

  return <Navigate to="/" replace />;
}
