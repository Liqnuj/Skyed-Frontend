import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { ReactNode } from 'react';

interface ProtectedProps {
  children: ReactNode;
  /**
   * Si se indica, además de estar logueado, el usuario debe tener
   * al menos uno de estos roles exactos (ej: 'adminSocial').
   * Si no se indica, solo se exige estar logueado (comportamiento
   * de antes).
   */
  requireRole?: string | string[];
}

export default function Protected({ children, requireRole }: ProtectedProps) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (requireRole) {
    const rolesRequeridos = Array.isArray(requireRole) ? requireRole : [requireRole];
    const tienePermiso = rolesRequeridos.some((r) => user.roles?.includes(r));

    if (!tienePermiso) {
      return (
        <div className="container section">
          <p className="form-error error">
            No tienes permisos para ver esta página.
          </p>
        </div>
      );
    }
  }

  return <>{children}</>;
}
