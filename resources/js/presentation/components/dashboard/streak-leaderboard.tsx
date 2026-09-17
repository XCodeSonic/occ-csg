import { motion, type Variants } from 'framer-motion';
import { Crown, Flame } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import type { DashboardStreakLeaderboardEntry } from '@/infrastructure/dashboard/dashboard.repository.http';
import { cn } from '@/lib/utils';
import { CARD, STACK } from '@/presentation/components/spacing';
import { Text } from '@/presentation/components/typography';
import { Tile } from '@/presentation/components/tile';

const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } } };
const podiumItem: Variants = {
    hidden: { opacity: 0, y: 16, scale: 0.9 },
    show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};
const row: Variants = {
    hidden: { opacity: 0, x: -8 },
    show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

/**
 * Gold / silver / bronze — a fixed, universally-read color language
 * (podiums, medals, trophies), used only here rather than borrowed from
 * the dashboard's usual single-hue TONE system. "1st place" isn't
 * Present/Late/Absent or any of the app's existing meanings, so it
 * intentionally sits outside that palette instead of being force-fit
 * onto one of its hues.
 */
const MEDAL = {
    1: {
        ring: 'ring-4 ring-amber-300 dark:ring-amber-400',
        glow: 'bg-amber-400/50',
        crown: 'text-amber-400 fill-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.85)]',
        step: 'bg-gradient-to-t from-amber-500 via-amber-400 to-yellow-300 text-amber-950',
        stepHeight: 'h-20',
        avatarSize: 'size-16',
    },
    2: {
        ring: 'ring-4 ring-slate-300 dark:ring-slate-400',
        glow: 'bg-slate-300/40',
        crown: 'text-slate-300',
        step: 'bg-gradient-to-t from-slate-400 via-slate-300 to-slate-200 text-slate-800',
        stepHeight: 'h-14',
        avatarSize: 'size-14',
    },
    3: {
        ring: 'ring-4 ring-orange-400/80 dark:ring-orange-500/70',
        glow: 'bg-orange-500/35',
        crown: 'text-orange-400',
        step: 'bg-gradient-to-t from-orange-700 via-orange-500 to-orange-400 text-white',
        stepHeight: 'h-10',
        avatarSize: 'size-14',
    },
} as const;

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

function StudentPhoto({ entry, className }: { entry: DashboardStreakLeaderboardEntry; className?: string }) {
    return (
        <Avatar className={cn('size-9 shrink-0', className)}>
            {entry.photoUrl ? <AvatarImage src={entry.photoUrl} alt={entry.studentName} /> : null}
            <AvatarFallback className="font-semibold">{initialsFromName(entry.studentName)}</AvatarFallback>
        </Avatar>
    );
}

/**
 * The current-streak count as a little fire pill — filled gradient +
 * glow for the podium's top spot (the number that's supposed to catch
 * the eye first), a quieter tinted version everywhere else. Same
 * "solid vs soft" idea as TONE, just built for a pill instead of a tile.
 */
function StreakBadge({ value, highlight = false }: { value: number; highlight?: boolean }) {
    return (
        <div
            className={cn(
                'flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1',
                highlight
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-500/40'
                    : 'bg-orange-500/12 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400',
            )}
        >
            <Flame className={cn('size-3.5', highlight ? 'fill-white' : 'fill-orange-500/70')} />
            <span className="text-xs font-bold tabular-nums">{value}</span>
        </div>
    );
}

/**
 * Global, cross-department Top-5 by current attendance streak — every
 * role's dashboard shows the same list (see BuildStreakLeaderboard),
 * since it's a school-wide ranking rather than something scoped to
 * whoever's looking at it. Ties on streak are broken server-side by
 * scan speed, so the order here is already final; this component just
 * renders it.
 *
 * Styled like a gamification app's leaderboard rather than another plain
 * dashboard list: the top 3 get a podium — gold/silver/bronze steps,
 * a glowing ring around each photo, a crown over 1st — and only ranks
 * 4-5 fall back to a simple numbered row.
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

    const podium = entries.slice(0, 3);
    const rest = entries.slice(3);

    // Classic podium arrangement — 2nd on the left, 1st in the middle
    // (tallest step), 3rd on the right — built from whichever of the
    // three actually exist (a leaderboard with only 1-2 students still
    // renders correctly, just with empty slots skipped).
    const podiumOrder = [podium[1], podium[0], podium[2]].filter(
        (entry): entry is DashboardStreakLeaderboardEntry => Boolean(entry),
    );

    return (
        <Card className={cn('overflow-hidden border-amber-500/20 bg-gradient-to-b from-amber-500/5 via-card to-card', CARD.root)}>
            <CardContent className={cn(CARD.inset, STACK.group)}>
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="flex items-end justify-center gap-3 pt-2"
                >
                    {podiumOrder.map((entry) => {
                        const medal = MEDAL[entry.rank as 1 | 2 | 3];
                        if (!medal) return null;

                        return (
                            <motion.div key={entry.studentId} variants={podiumItem} className="flex flex-col items-center gap-2">
                                <div className="relative">
                                    {entry.rank === 1 && (
                                        <Crown
                                            className={cn('absolute -top-5 left-1/2 size-6 -translate-x-1/2', medal.crown)}
                                            strokeWidth={2.5}
                                        />
                                    )}
                                    <span
                                        aria-hidden
                                        className={cn(
                                            'pointer-events-none absolute inset-0 -z-10 scale-125 rounded-full opacity-70 blur-lg',
                                            medal.glow,
                                        )}
                                    />
                                    <StudentPhoto entry={entry} className={cn(medal.avatarSize, medal.ring)} />
                                </div>

                                <Text variant="caption" className="max-w-20 truncate text-center font-semibold text-foreground">
                                    {entry.studentName}
                                </Text>

                                <StreakBadge value={entry.currentStreak} highlight={entry.rank === 1} />

                                <div
                                    className={cn(
                                        'flex w-14 items-center justify-center rounded-t-lg text-sm font-bold shadow-inner',
                                        medal.step,
                                        medal.stepHeight,
                                    )}
                                >
                                    {entry.rank}
                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>

                {rest.length > 0 && (
                    <motion.div variants={container} initial="hidden" animate="show" className={cn(STACK.group, 'border-t pt-3')}>
                        {rest.map((entry) => (
                            <motion.div key={entry.studentId} variants={row} className="flex items-center justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-3">
                                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold tabular-nums text-muted-foreground">
                                        {entry.rank}
                                    </span>
                                    <StudentPhoto entry={entry} className="size-8" />
                                    <div className="min-w-0">
                                        <Text variant="small" className="truncate font-medium text-foreground">
                                            {entry.studentName}
                                        </Text>
                                        <Text variant="caption" className="truncate">
                                            {entry.departmentCode ?? '—'}
                                            {entry.section ? ` · ${entry.section}` : ''}
                                        </Text>
                                    </div>
                                </div>

                                <StreakBadge value={entry.currentStreak} />
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </CardContent>
        </Card>
    );
}
