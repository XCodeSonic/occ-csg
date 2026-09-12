import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuthStore } from '@/application/auth/auth.store';

export function ProtectedRoute() {
    const token = useAuthStore((state) => state.token);
    const student = useAuthStore((state) => state.student);
    const location = useLocation();

    if (!token || !student) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Client-side gate mirrors the server-side middleware — the API still
    // rejects gated endpoints while must_change_password is true, this just
    // saves the user a round trip.
    if (student.mustChangePassword && location.pathname !== '/change-password') {
        return <Navigate to="/change-password" replace />;
    }

    return <Outlet />;
}
