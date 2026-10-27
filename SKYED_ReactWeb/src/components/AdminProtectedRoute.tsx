import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Props {
    /**
     * Rol exacto que exige la ruta (p. ej. 'adminSocial'). Si no se indica,
     * basta con ser administrador de cualquiera de los dos módulos.
     * Así el admin social no entra al panel deportivo y viceversa.
     */
    rol?: 'adminDeportivo' | 'adminSocial';
}

/**
 * Antes leía el usuario directo de localStorage, que se puede editar desde
 * el inspector del navegador (poniendo role: "admin"). Ahora usa el usuario
 * del contexto, que al abrir la app se reemplaza con el que devuelve el
 * servidor (GET /me), así que un valor alterado no pasa. Ojo: esto solo
 * protege la pantalla; lo que protege los datos es el middleware de la API.
 */
const AdminProtectedRoute = ({ rol }: Props) => {
    const { user, verificando } = useAuth();

    if (verificando) return null;

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (user.role !== 'admin') {
        return <Navigate to="/" replace />;
    }

    // /admin lo lleva a su propio panel (AdminRedirect).
    if (rol && !(user.roles ?? []).includes(rol)) {
        return <Navigate to="/admin" replace />;
    }

    return <Outlet />;
};

export default AdminProtectedRoute;
