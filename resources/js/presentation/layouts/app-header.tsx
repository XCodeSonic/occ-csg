import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { Text } from '@/presentation/components/typography';
import { UserAvatar } from '@/presentation/components/user-avatar';
import type { Student } from '@/domain/entities';
import { ROLE_LABEL } from '@/domain/enums';
import { TONE } from '@/presentation/components/tone';
import { cn } from '@/lib/utils';
import { CHIP } from '@/presentation/components/spacing';

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
        <header className="flex h-16 items-center gap-2 border-b border-border px-4 sm:px-6">
            {!isHome && (
                <button
                    type="button"
                    onClick={handleBack}
                    aria-label="Go back"
                    className="-ml-1 flex size-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                    <ChevronLeft className="size-5" />
                </button>
            )}
            <Link
                to="/account"
                className="-mx-2 flex min-w-0 flex-1 items-center gap-4 rounded-2xl px-2 py-2 transition-colors hover:bg-muted"
            >
                {/* Violet ring, matching the account screen and the ID card —
                    the three places that are about who you are. */}
                <UserAvatar student={student} className="ring-2 ring-violet-500/15" />
                <div className="min-w-0">
                    <Text className="truncate leading-tight font-medium">
                        {student.firstName} {student.lastName}
                    </Text>
                    <span className={cn('mt-1 inline-flex', CHIP, TONE.violet.chip)}>
                        {ROLE_LABEL[student.role]}
                    </span>
                </div>
                <ChevronRight className="ml-2 size-4 shrink-0 text-muted-foreground" />
            </Link>
        </header>
    );
}
