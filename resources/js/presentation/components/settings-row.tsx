import type { PropsWithChildren, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import { cn } from '@/lib/utils';

interface SettingsRowProps extends PropsWithChildren {
    to?: string;
    icon?: ReactNode;
    onClick?: () => void;
    destructive?: boolean;
    /** Optional right-aligned hint shown before the chevron, e.g. a balance or a count. */
    trailing?: ReactNode;
}

export function SettingsRow({ to, icon, onClick, destructive, trailing, children }: SettingsRowProps) {
    const content = (
        <>
            {icon ? <span className="text-muted-foreground">{icon}</span> : null}
            <span className={cn('flex-1 text-body', destructive && 'text-destructive')}>{children}</span>
            {trailing ? <span className="text-small text-muted-foreground">{trailing}</span> : null}
            {to ? <ChevronRight className="size-4 text-muted-foreground" /> : null}
        </>
    );

    const className = cn(
        'flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent',
        destructive && 'hover:bg-destructive/10',
    );

    if (to) {
        return (
            <Link to={to} className={className}>
                {content}
            </Link>
        );
    }

    return (
        <button type="button" onClick={onClick} className={className}>
            {content}
        </button>
    );
}
