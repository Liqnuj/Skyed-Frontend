import { Navigate, Outlet } from 'react-router-dom';

interface Props {
    /**
     * Rol exacto que exige la ruta (p. ej. 'adminSocial'). Si no se indica,
     * basta con ser administrador de cualquiera de los dos módulos.
     * Así el admin social no entra al panel deportivo y viceversa.
     */
    rol?: 'adminDeportivo' | 'adminSocial';
}

const AdminProtectedRoute = ({ rol }: Props) => {
    const rawUser = localStorage.getItem('skyed_user');

    if (!rawUser) {
        return <Navigate to="/login" replace />;
    }

    const user = JSON.parse(rawUser);

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