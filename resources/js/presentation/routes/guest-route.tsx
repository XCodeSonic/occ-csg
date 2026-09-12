import { Navigate, Outlet } from 'react-router-dom';

import { useAuthStore } from '@/application/auth/auth.store';

/**
 * Wraps routes that only make sense for a signed-out visitor (login).
 * Without this, an authenticated user hitting /login directly just sees
 * the login form again instead of being sent back into the app.
 */
export function GuestRoute() {
    const token = useAuthStore((state) => state.token);
    const student = useAuthStore((state) => state.student);

    if (token && student) {
        return <Navigate to={student.mustChangePassword ? '/change-password' : '/dashboard'} replace />;
    }

    return <Outlet />;
}
