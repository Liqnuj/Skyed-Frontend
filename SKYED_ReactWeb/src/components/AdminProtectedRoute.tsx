import { Navigate, Outlet } from 'react-router-dom';

const AdminProtectedRoute = () => {
    const rawUser = localStorage.getItem('skyed_user');
    
    if (!rawUser) {
        return <Navigate to="/login" replace />;
    }

    const user = JSON.parse(rawUser);

    if (user.role !== 'admin') {
        return <Navigate to="/" replace />; 
    }

    return <Outlet />;
};

export default AdminProtectedRoute;