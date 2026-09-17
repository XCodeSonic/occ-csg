import { motion, type Variants } from 'framer-motion';
import { Flame, Trophy } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import type { DashboardStreakLeaderboardEntry } from '@/infrastructure/dashboard/dashboard.repository.http';
import { cn } from '@/lib/utils';
import { CARD, STACK } from '@/presentation/components/spacing';
import { Text } from '@/presentation/components/typography';
import { Tile } from '@/presentation/components/tile';

const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } };
const row: Variants = {
    hidden: { opacity: 0, x: -8 },
    show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

/**
 * Rank marker — same shape as Leaderboard's RankBadge, but #1 gets a
 * trophy instead of a numeral: this list is a competition, not a share
 * of a whole, so the top spot deserves its own icon rather than reusing
 * the "1" the penalty/attendance leaderboards use.
 */
function RankBadge({ rank }: { rank: number }) {
    if (rank === 1) {
        return (
            <Tile tone="orange" size="sm" variant="solid">
                <Trophy className="size-4" />
            </Tile>
        );
    }

    return (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted text-xs font-bold tabular-nums text-muted-foreground">
            {rank}
        </span>
    );
}

/**
 * The leaderboard's studentName arrives already combined ("First Last"),
 * unlike UserAvatar's Student prop which wants separate first/last names —
 * so initials are taken straight from the combined string's word starts
 * instead of pulling UserAvatar in for a shape it doesn't have.
 */
function initialsFromName(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    return (parts[0][0] + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
}

function StudentPhoto({ entry }: { entry: DashboardStreakLeaderboardEntry }) {
    return (
        <Avatar size="sm" className="shrink-0">
            {entry.photoUrl ? <AvatarImage src={entry.photoUrl} alt={entry.studentName} /> : null}
            <AvatarFallback>{initialsFromName(entry.studentName)}</AvatarFallback>
        </Avatar>
    );
}

/**
 * Global, cross-department Top-5 by current attendance streak — every
 * role's dashboard shows the same list (see BuildStreakLeaderboard),
 * since it's a school-wide ranking rather than something scoped to
 * whoever's looking at it. Ties on streak are broken server-side by
 * scan speed, so the order here is already final; this component just
 * renders it.
 */
export function StreakLeaderboard({ entries }: { entries: DashboardStreakLeaderboardEntry[] }) {
    if (entries.length === 0) {
        return (
            <Card className={CARD.root}>
                <CardContent className={cn(CARD.inset, 'flex items-center gap-3')}>
                    <Tile tone="neutral" variant="soft" Icon={Flame} />
                    <Text variant="small">No one's on a streak yet.</Text>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={cn('overflow-hidden', CARD.root)}>
            <CardContent className={CARD.inset}>
                <motion.div variants={container} initial="hidden" animate="show" className={STACK.group}>
                    {entries.map((entry) => (
                        <motion.div
                            key={entry.studentId}
                            variants={row}
                            className="flex items-center justify-between gap-2"
                        >
                            <div className="flex min-w-0 items-center gap-3">
                                <RankBadge rank={entry.rank} />
                                <StudentPhoto entry={entry} />
                                <div className="min-w-0">
                                    <Text variant="small" className="truncate font-medium text-foreground">
                                        {entry.studentName}
                                    </Text>
                                    <Text variant="caption" className="truncate">
                                        {entry.departmentCode ?? '—'} · {entry.studentNumber}
                                    </Text>
                                </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-1 text-orange-500">
                                <Flame className="size-4 fill-orange-500" />
                                <span className="text-small font-semibold tabular-nums text-foreground">
                                    {entry.currentStreak}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </CardContent>
        </Card>
    );
}
