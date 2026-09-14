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
    // FIX: antes se llamaba a `user.roles.includes(r)` con `r` tipado
    // como `string` genérico contra un arreglo de un union type más
    // estricto, lo cual no compilaba (`npm run build` fallaba porque
    // usa `tsc -b` antes de `vite build`). Se invierte la comparación:
    // recorrer los roles (ya tipados) del usuario y preguntar si
    // están incluidos en la lista de roles requeridos (string[]) sí
    // es válido para TypeScript y tiene el mismo resultado.
    const tienePermiso = user.roles?.some((r) => rolesRequeridos.includes(r)) ?? false;

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
