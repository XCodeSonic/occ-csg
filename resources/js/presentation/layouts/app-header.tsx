import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { Text } from '@/presentation/components/typography';
import { UserAvatar } from '@/presentation/components/user-avatar';
import type { Student } from '@/domain/entities';
import { ROLE_LABEL } from '@/domain/enums';

export function AppHeader({ student }: { student: Student }) {
    const location = useLocation();
    const navigate = useNavigate();

    // Dashboard is the true home screen for every role — nothing to go
    // "back" to from there, so the button only shows everywhere else.
    // This covers both drill-in paths (e.g. Settings -> Events) and
    // direct bottom-nav jumps, since either way there's a screen behind
    // this one worth returning to.
    const isHome = location.pathname === '/dashboard';

    function handleBack() {
        // react-router's data router stores a history index in
        // history.state.idx. If it's 0 (or missing, e.g. this tab was
        // opened straight into a deep link) there's no in-app history to
        // pop back to, so land on Dashboard instead of leaving the app.
        const historyIndex = (window.history.state as { idx?: number } | null)?.idx ?? 0;

        if (historyIndex > 0) {
            navigate(-1);
        } else {
            navigate('/dashboard');
        }
    }

    return (
        <header className="flex h-16 items-center gap-1 border-b border-border px-3 sm:px-6">
            {!isHome && (
                <button
                    type="button"
                    onClick={handleBack}
                    aria-label="Go back"
                    className="-ml-1 flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                    <ChevronLeft className="size-5" />
                </button>
            )}
            <Link
                to="/account"
                className="-mx-2 flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-accent"
            >
                <UserAvatar student={student} />
                <div className="min-w-0">
                    <Text variant="small" className="leading-tight">
                        {ROLE_LABEL[student.role]}
                    </Text>
                    <Text className="leading-tight font-medium">
                        {student.firstName} {student.lastName}
                    </Text>
                </div>
                <ChevronRight className="ml-1 size-4 shrink-0 text-muted-foreground" />
            </Link>
        </header>
    );
}
