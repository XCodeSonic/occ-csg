import { useMemo } from 'react';
import { motion, type Variants } from 'framer-motion';
import {
    CheckCircle2,
    Circle,
    Clock,
    CloudSun,
    Flame,
    MinusCircle,
    Moon,
    Sun,
    Trophy,
    XCircle,
    type LucideIcon,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card';
import { useMyEventAttendance } from '@/application/events/use-my-event-attendance';
import type { MyEventAttendance } from '@/infrastructure/events/events.repository.http';
import { AttendanceStatus, CHECK_TYPE_LABEL, CheckType, WINDOW_TYPE_LABEL, WindowType } from '@/domain/enums';
import { cn } from '@/lib/utils';
import { CARD, CHIP, GAP, STACK } from '@/presentation/components/spacing';
import { Text } from '@/presentation/components/typography';

/**
 * Purely cosmetic. Everything here is derived client-side from
 * attendance_status values the API already returns (BuildMyEventAttendance)
 * — there's no "streak" column or concept anywhere in the backend, and
 * nothing here ever feeds back into attendance, penalties, or reports.
 * It's a fun little morale strip, not a source of truth.
 */

type PipStatus = AttendanceStatus | 'upcoming';

interface StreakSession {
    id: number;
    dayNumber: number;
    dateLabel: string;
    windowType: WindowType;
    checkType: CheckType;
    windowCheckLabel: string;
    status: PipStatus;
}

/** Window → little sky icon, so a glance at a pip says "morning / afternoon /
 * evening" without reading anything. Sun for morning, a part-cloudy sun for
 * afternoon, moon for evening — each with its own tint so the badge reads
 * as a distinct time of day even at a glance. */
const WINDOW_STYLE: Record<WindowType, { Icon: LucideIcon; badge: string }> = {
    [WindowType.Morning]: { Icon: Sun, badge: 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-300' },
    [WindowType.Afternoon]: { Icon: CloudSun, badge: 'bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-300' },
    [WindowType.Evening]: { Icon: Moon, badge: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300' },
};

/**
 * Only Present is a "filled" reward — everything else is a quiet outline
 * card that recedes instead of competing with it for attention. Late and
 * Missed still carry their own color (so a glance at the strip tells you
 * which is which) but neither is loud enough to look like a prize the way
 * Present does; Excused/Upcoming fade further still, since neither one
 * reflects on the student either way.
 */
const STATUS_STYLE: Record<
    PipStatus,
    { Icon: LucideIcon; chip: string; icon: string; dot: string; label: string }
> = {
    [AttendanceStatus.Present]: {
        Icon: CheckCircle2,
        chip: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30',
        icon: 'text-white',
        dot: 'bg-emerald-500',
        label: 'Present',
    },
    [AttendanceStatus.Late]: {
        Icon: Clock,
        chip: 'border-2 border-amber-400/70 bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400',
        icon: 'text-amber-500',
        dot: 'bg-amber-500',
        label: 'Late',
    },
    [AttendanceStatus.Absent]: {
        Icon: XCircle,
        chip: 'border-2 border-red-300/70 bg-transparent text-red-400 dark:border-red-900 dark:text-red-500/80',
        icon: 'text-red-400 dark:text-red-500/80',
        dot: 'bg-red-500',
        label: 'Missed',
    },
    [AttendanceStatus.Excluded]: {
        Icon: MinusCircle,
        chip: 'border-2 border-dashed border-border bg-transparent text-muted-foreground/60',
        icon: 'text-muted-foreground/60',
        dot: 'bg-muted-foreground/50',
        label: 'Excused',
    },
    [AttendanceStatus.Pending]: {
        Icon: Circle,
        chip: 'border-2 border-dashed border-border/70 bg-transparent text-muted-foreground/40',
        icon: 'text-muted-foreground/40',
        dot: 'bg-border',
        label: 'Upcoming',
    },
    upcoming: {
        Icon: Circle,
        chip: 'border-2 border-dashed border-border/70 bg-transparent text-muted-foreground/40',
        icon: 'text-muted-foreground/40',
        dot: 'bg-border',
        label: 'Upcoming',
    },
};

const LEGEND_ORDER = [
    AttendanceStatus.Present,
    AttendanceStatus.Late,
    AttendanceStatus.Absent,
    AttendanceStatus.Excluded,
    'upcoming',
] as const;

const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } } };
const pip: Variants = {
    hidden: { opacity: 0, scale: 0.7 },
    show: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

function formatShortDate(value: string): string {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);

    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
        new Date(Date.UTC(year, month - 1, day)),
    );
}

function flattenSessions(event: MyEventAttendance): StreakSession[] {
    return event.days.flatMap((day) =>
        day.sessions.map((session) => ({
            id: session.id,
            dayNumber: day.dayNumber,
            dateLabel: formatShortDate(day.date),
            windowType: session.windowType,
            checkType: session.checkType,
            windowCheckLabel: `${WINDOW_TYPE_LABEL[session.windowType]} ${CHECK_TYPE_LABEL[session.checkType]}`,
            status: (session.attendanceStatus ?? 'upcoming') as PipStatus,
        })),
    );
}

/**
 * Current streak = consecutive Present sessions counted back from the
 * most recent *resolved* one. Late/Absent reset it — this is a fun
 * gamification layer, not a lenient one. Excluded and not-yet-resolved
 * (upcoming) sessions are skipped entirely: they neither build nor break
 * a streak, since the student had no chance to show up either way.
 * Longest streak is the best run seen anywhere in the event so far.
 */
function computeStreaks(sessions: StreakSession[]): { current: number; longest: number } {
    let running = 0;
    let longest = 0;

    for (const session of sessions) {
        if (session.status === AttendanceStatus.Present) {
            running += 1;
            longest = Math.max(longest, running);
        } else if (session.status === AttendanceStatus.Late || session.status === AttendanceStatus.Absent) {
            running = 0;
        }
        // Excluded / upcoming: streak carries through untouched.
    }

    return { current: running, longest };
}

export function AttendanceStreak({ event, isLoading }: { event: MyEventAttendance | undefined; isLoading: boolean }) {
    const sessions = useMemo(() => (event ? flattenSessions(event) : []), [event]);
    const { current, longest } = useMemo(() => computeStreaks(sessions), [sessions]);

    if (isLoading) {
        return (
            <Card className={CARD.root}>
                <CardContent className={CARD.inset}>
                    <Text variant="small">Loading your streak…</Text>
                </CardContent>
            </Card>
        );
    }

    if (!event) return null;

    const resolvedCount = sessions.filter((s) => s.status !== 'upcoming').length;

    return (
        <Card className={cn('overflow-hidden', CARD.root)}>
            <CardHeader className={cn(CARD.inset, 'flex-row items-center justify-between', GAP.grid)}>
                <div className="min-w-0">
                    <CardDescription>Attendance streak</CardDescription>
                    <Text variant="small" className="truncate font-medium text-foreground">
                        {event.eventName}
                    </Text>
                </div>

                {longest > 1 && (
                    <span className={cn(CHIP, 'border text-muted-foreground')}>
                        <Trophy className="size-4 text-amber-500" />
                        Best {longest}
                    </span>
                )}
            </CardHeader>

            <CardContent className={cn(CARD.inset, STACK.group)}>
                <div className={cn('flex items-center', GAP.grid)}>
                    <div
                        className={cn(
                            // gap-1 (4px) is the half-step: icon stacked over its own
                            // numeral inside a 64px box. Same rule the Tile follows.
                            'flex size-16 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl',
                            current > 0
                                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                                : 'bg-muted text-muted-foreground',
                        )}
                    >
                        <Flame className={cn('size-4', current > 0 && 'fill-white')} />
                        <span className="text-h3 leading-none font-bold tabular-nums">{current}</span>
                    </div>
                    <div className="min-w-0">
                        <Text variant="small" className="font-medium text-foreground">
                            {current === 0 ? 'No streak yet' : current === 1 ? '1 session in a row' : `${current} sessions in a row`}
                        </Text>
                        <Text variant="caption">{resolvedCount} of {sessions.length} sessions tracked so far</Text>
                    </div>
                </div>

                {sessions.length === 0 ? (
                    <Text variant="small">No sessions scheduled yet for this event.</Text>
                ) : (
                    // -mx-1/px-1 is bleed, not spacing: it gives the window badge
                    // that overhangs each pip's top-right corner room to sit
                    // outside the pip without being clipped by the scroller.
                    <div className="relative -mx-1">
                        <div
                            className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 pt-2 pb-2 [&::-webkit-scrollbar]:hidden"
                            style={{ scrollbarWidth: 'none' }}
                        >
                            <motion.div variants={container} initial="hidden" animate="show" className="flex gap-4">
                                {sessions.map((session) => {
                                    const style = STATUS_STYLE[session.status];
                                    const { Icon } = style;
                                    const windowStyle = WINDOW_STYLE[session.windowType];
                                    const WindowIcon = windowStyle.Icon;
                                    const checkLabel = session.checkType === CheckType.TimeIn ? 'In' : 'Out';

                                    return (
                                        <motion.div
                                            key={session.id}
                                            variants={pip}
                                            title={`Day ${session.dayNumber} · ${session.windowCheckLabel} · ${style.label}`}
                                            className="flex shrink-0 snap-start flex-col items-center gap-2"
                                        >
                                            <div className="relative">
                                                <div className={cn('flex size-12 items-center justify-center rounded-2xl', style.chip)}>
                                                    <Icon className={cn('size-5', style.icon)} />
                                                </div>
                                                <div
                                                    className={cn(
                                                        'absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full border-2 border-card',
                                                        windowStyle.badge,
                                                    )}
                                                >
                                                    <WindowIcon className="size-3.5" />
                                                </div>
                                            </div>
                                            <Text variant="caption" className="leading-none font-medium whitespace-nowrap text-foreground">
                                                D{session.dayNumber} · {checkLabel}
                                            </Text>
                                            <Text variant="caption" className="leading-none whitespace-nowrap text-muted-foreground/70">
                                                {session.dateLabel}
                                            </Text>
                                        </motion.div>
                                    );
                                })}
                            </motion.div>
                        </div>

                        {/* Fade hints that the strip scrolls, rather than a "see more" link —
                            the whole point is to glance across every session at once. */}
                        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card to-transparent" />
                    </div>
                )}

            </CardContent>
        </Card>
    );
}

/**
 * Fetches and renders one event's streak. Split out from AttendanceStreak
 * itself so the dashboard can map over however many active events exist
 * (see useActiveEvents) and give each its own data-fetching hook instance
 * — mapping a list of small components is the react-safe way to do that;
 * calling useMyEventAttendance in a loop inside one component isn't.
 */
export function EventAttendanceStreak({ eventId }: { eventId: number }) {
    const { data, isLoading } = useMyEventAttendance(eventId);

    return <AttendanceStreak event={data} isLoading={isLoading} />;
}
