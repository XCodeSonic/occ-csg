import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Text } from '@/presentation/components/typography';

const BAR_STYLE = 'bg-foreground';

/** #1 gets a quiet amber tint, #2/#3 a quiet neutral tint — just enough to
 * mark "this is a ranking" without a literal gold/silver/bronze medal. */
const RANK_TONES = [
    'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    'border-border bg-muted text-foreground',
    'border-border bg-muted text-foreground',
];

export function RankBadge({ rank }: { rank: number }) {
    return (
        <span
            className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold tabular-nums',
                RANK_TONES[rank] ?? 'border-border text-foreground',
            )}
        >
            {rank + 1}
        </span>
    );
}

export interface LeaderboardEntry {
    id: string | number;
    label: string;
    href?: string;
    /** Formatted right-aligned value, e.g. a currency amount or a count. */
    value: ReactNode;
    /** 0–100, this row's share of the whole list. */
    percentage: number;
}

const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } };
const row: Variants = {
    hidden: { opacity: 0, x: -8 },
    show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

/**
 * Ranked list with a gold/silver/bronze badge and a gradient percentage
 * bar per row — the shared visual language for "how is the whole split
 * up", used identically for penalties-by-event and attendance-by-
 * department so the two read as the same kind of breakdown.
 */
export function Leaderboard({
    entries,
    emptyLabel,
    barClassName = BAR_STYLE,
}: {
    entries: LeaderboardEntry[];
    emptyLabel: string;
    /** Tailwind bg-* class for the share bar's fill — lets callers give each
     * leaderboard (departments vs. penalties, say) its own accent color
     * instead of every ranked list on the page looking identical. */
    barClassName?: string;
}) {
    if (entries.length === 0) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <Text variant="small">{emptyLabel}</Text>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="overflow-hidden">
            <CardContent className="pt-6">
                <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
                    {entries.map((entry, index) => {
                        const inner = (
                            <>
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex min-w-0 items-center gap-2.5">
                                        <RankBadge rank={index} />
                                        <Text
                                            variant="small"
                                            className={cn('truncate font-medium text-foreground', entry.href && 'group-hover:underline')}
                                        >
                                            {entry.label}
                                        </Text>
                                    </div>
                                    <span className="shrink-0 font-semibold tabular-nums text-foreground">{entry.value}</span>
                                </div>
                                <div className="ml-9.5 flex items-center gap-2">
                                    <Progress value={entry.percentage} className="h-1.5" indicatorClassName={barClassName} />
                                    <span className="w-10 shrink-0 text-right text-caption tabular-nums text-muted-foreground">
                                        {Math.round(entry.percentage)}%
                                    </span>
                                </div>
                            </>
                        );

                        return (
                            <motion.div key={entry.id} variants={row} className="space-y-1.5">
                                {entry.href ? (
                                    <Link to={entry.href} className="group block space-y-1.5">
                                        {inner}
                                    </Link>
                                ) : (
                                    inner
                                )}
                            </motion.div>
                        );
                    })}
                </motion.div>
            </CardContent>
        </Card>
    );
}
