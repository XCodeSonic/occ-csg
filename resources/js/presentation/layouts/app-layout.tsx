import { Outlet } from 'react-router-dom';

import { AppBottomNav } from '@/presentation/layouts/app-bottom-nav';
import { useAuthStore } from '@/application/auth/auth.store';

export function AppLayout() {
    const student = useAuthStore((state) => state.student);

    if (!student) return null;

    return (
        <div className="min-h-svh bg-background">
            {/* pb-28 clears the floating bottom nav (~4.5rem tall + its own
                bottom offset) so the last row of content is never hidden
                behind it. No top header, so pt- accounts for the device's
                safe area itself instead of a header's height. */}
            <main
                className="mx-auto max-w-5xl px-6 pb-28 sm:px-8"
                style={{ paddingTop: 'max(2rem, calc(env(safe-area-inset-top) + 1.5rem))' }}
            >
                <Outlet />
            </main>
            <AppBottomNav student={student} />
        </div>
    );
}
