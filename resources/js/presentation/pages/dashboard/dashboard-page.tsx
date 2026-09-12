// import type { ReactNode } from 'react';
// import { Link } from 'react-router-dom';

// import { Badge } from '@/components/ui/badge';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { useAuthStore } from '@/application/auth/auth.store';
// import { useDashboard } from '@/application/dashboard/use-dashboard';
// import type {
//     DashboardActiveSession,
//     DashboardEventPenalty,
//     DashboardOverallCounts,
//     DashboardSessionCounts,
//     DashboardSummary,
//     OfficerDashboardSummary,
//     StudentDashboardSummary,
// } from '@/infrastructure/dashboard/dashboard.repository.http';
// import {
//     ATTENDANCE_STATUS_BADGE_CLASS,
//     ATTENDANCE_STATUS_LABEL,
//     AttendanceStatus,
//     CHECK_TYPE_LABEL,
//     Role,
//     WINDOW_TYPE_LABEL,
// } from '@/domain/enums';
// import { formatCurrency, formatDate, formatTimeOfDay } from '@/lib/utils';
// import { Heading, Text } from '@/presentation/components/typography';

// function isOfficerSummary(summary: DashboardSummary): summary is OfficerDashboardSummary {
//     return summary.role === Role.Officer;
// }

// function isStudentSummary(summary: DashboardSummary): summary is StudentDashboardSummary {
//     return summary.role === Role.Student;
// }

// export function DashboardPage() {
//     const student = useAuthStore((state) => state.student);
//     const { data, isLoading, isError } = useDashboard();

//     if (!student) return null;

//     return (
//         <div className="space-y-8">
//             <div>
//                 <Heading level="h1">Dashboard</Heading>
//                 <Text variant="small">{subtitleFor(data, student.role)}</Text>
//             </div>

//             {isLoading && <Text variant="small">Loading…</Text>}

//             {isError && <Text variant="small">Couldn't load the dashboard. Try refreshing.</Text>}

//             {data && isOfficerSummary(data) && <OfficerDashboard summary={data} />}
//             {data && isStudentSummary(data) && <StudentDashboard summary={data} />}
//             {data && !isOfficerSummary(data) && !isStudentSummary(data) && <AdminDashboard summary={data} />}
//         </div>
//     );
// }

// function subtitleFor(data: DashboardSummary | undefined, role: string): string {
//     if (!data) {
//         return 'Loading your dashboard…';
//     }

//     if (isOfficerSummary(data)) {
//         return 'Your scanning activity across every session.';
//     }

//     if (isStudentSummary(data)) {
//         return 'Your attendance record and current standing.';
//     }

//     if (data.scope === 'department' && data.department) {
//         return `${data.department.name} (${data.department.code}) overview.`;
//     }

//     if (role === Role.SystemAdmin) {
//         return 'Every department, every event, at a glance.';
//     }

//     return 'Every department, every event, at a glance.';
// }

// function AdminDashboard({
//     summary,
// }: {
//     summary: Extract<DashboardSummary, { scope: 'global' | 'department' }>;
// }) {
//     return (
//         <div className="space-y-8">
//             <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
//                 <StatCard
//                     label={summary.scope === 'department' ? 'Students in department' : 'Total students'}
//                     value={summary.totalStudents}
//                 />
//                 <StatCard label="Events" value={summary.eventsCount} />
//                 <StatCard
//                     label="Live session"
//                     value={summary.activeSession ? 'Ongoing' : 'None'}
//                     highlight={!!summary.activeSession}
//                 />
//             </div>

//             <ActiveSessionCard session={summary.activeSession} />

//             {summary.activeSession && summary.activeSessionCounts && (
//                 <div className="space-y-2">
//                     <Text variant="caption">Attendance for this session</Text>
//                     <AttendanceCountsGrid counts={summary.activeSessionCounts} />
//                 </div>
//             )}

//             {/*
//                 Always shown, regardless of whether a session is currently
//                 ongoing — this is a sum across every event, not just
//                 whatever happens to be active right now. The block above
//                 (activeSessionCounts) disappears the moment nothing is
//                 ongoing, e.g. between windows or once CSG has ended an
//                 event; this one is the admin's persistent attendance
//                 picture and never goes away.
//             */}
//             <div className="space-y-2">
//                 <Text variant="caption">Attendance across all events</Text>
//                 <OverallCountsGrid counts={summary.overallAttendanceCounts} />
//             </div>

//             <div className="space-y-2">
//                 <Text variant="caption">Penalties across all events</Text>
//                 <StatCard label="Total penalty balance" value={formatCurrency(summary.penaltyTotal)} highlight />
//                 <PenaltyByEventList rows={summary.penaltyByEvent} />
//             </div>
//         </div>
//     );
// }

// function OfficerDashboard({ summary }: { summary: OfficerDashboardSummary }) {
//     return (
//         <div className="space-y-8">
//             <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
//                 <StatCard label="Your scans" value={summary.myScans} />
//                 <StatCard label="Total scans (all officers)" value={summary.totalScans} />
//                 <StatCard label="Your contribution" value={`${summary.contributionPercentage}%`} highlight />
//             </div>

//             <Card>
//                 <CardHeader className="gap-1 pb-2">
//                     <CardDescription>Share of all officer scans</CardDescription>
//                     <CardTitle className="text-h2">{summary.contributionPercentage}%</CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                     <ContributionBar percentage={summary.contributionPercentage} />
//                     <Text variant="small" className="mt-2">
//                         {summary.myScans} of {summary.totalScans} total scans recorded across every officer.
//                     </Text>
//                 </CardContent>
//             </Card>

//             <ActiveSessionCard session={summary.activeSession} />
//         </div>
//     );
// }

// function StudentDashboard({ summary }: { summary: StudentDashboardSummary }) {
//     const statuses: { status: AttendanceStatus; value: number }[] = [
//         { status: AttendanceStatus.Present, value: summary.totals.present },
//         { status: AttendanceStatus.Late, value: summary.totals.late },
//         { status: AttendanceStatus.Absent, value: summary.totals.absent },
//         { status: AttendanceStatus.Excluded, value: summary.totals.excluded },
//     ];

//     return (
//         <div className="space-y-8">
//             <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
//                 {statuses.map((item) => (
//                     <StatusCard key={item.status} status={item.status} value={item.value} />
//                 ))}
//             </div>

//             <StatCard label="Penalty balance" value={formatCurrency(summary.penaltyTotal)} />

//             <div className="space-y-2">
//                 <div className="flex items-center justify-between">
//                     <Text variant="caption">Current session</Text>
//                     {summary.activeSession && summary.activeSessionStatus && (
//                         <Badge
//                             variant="secondary"
//                             className={ATTENDANCE_STATUS_BADGE_CLASS[summary.activeSessionStatus]}
//                         >
//                             {ATTENDANCE_STATUS_LABEL[summary.activeSessionStatus]}
//                         </Badge>
//                     )}
//                     {summary.activeSession && !summary.activeSessionStatus && (
//                         <Badge variant="secondary" className={ATTENDANCE_STATUS_BADGE_CLASS[AttendanceStatus.Pending]}>
//                             {ATTENDANCE_STATUS_LABEL[AttendanceStatus.Pending]}
//                         </Badge>
//                     )}
//                 </div>
//                 <ActiveSessionCard session={summary.activeSession} />
//             </div>
//         </div>
//     );
// }

// function ActiveSessionCard({ session }: { session: DashboardActiveSession | null }) {
//     if (!session) {
//         return (
//             <Card>
//                 <CardContent className="pt-6">
//                     <Text variant="small">No session is currently open.</Text>
//                 </CardContent>
//             </Card>
//         );
//     }

//     return (
//         <Card>
//             <CardHeader className="gap-1 pb-2">
//                 <div className="flex items-center gap-2">
//                     <span className="relative flex size-2">
//                         <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
//                         <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
//                     </span>
//                     <CardDescription>Active session</CardDescription>
//                 </div>
//                 <CardTitle className="text-h2">
//                     <Link to={`/events/${session.eventId}`} className="hover:underline">
//                         {session.eventName}
//                     </Link>
//                 </CardTitle>
//             </CardHeader>
//             <CardContent className="space-y-1">
//                 <Text variant="small">
//                     Day {session.eventDay.dayNumber} — {formatDate(session.eventDay.date)}
//                 </Text>
//                 <Text variant="small">
//                     {WINDOW_TYPE_LABEL[session.windowType]} · {CHECK_TYPE_LABEL[session.checkType]} ·{' '}
//                     {formatTimeOfDay(session.startTime)}–{formatTimeOfDay(session.endTime)}
//                 </Text>
//             </CardContent>
//         </Card>
//     );
// }

// function AttendanceCountsGrid({ counts }: { counts: DashboardSessionCounts }) {
//     const items: { status: AttendanceStatus; value: number }[] = [
//         { status: AttendanceStatus.Present, value: counts.present },
//         { status: AttendanceStatus.Late, value: counts.late },
//         { status: AttendanceStatus.Absent, value: counts.absent },
//         { status: AttendanceStatus.Excluded, value: counts.excluded },
//         { status: AttendanceStatus.Pending, value: counts.pending },
//     ];

//     return (
//         <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
//             {items.map((item) => (
//                 <StatusCard key={item.status} status={item.status} value={item.value} total={counts.totalStudents} />
//             ))}
//         </div>
//     );
// }

// function OverallCountsGrid({ counts }: { counts: DashboardOverallCounts }) {
//     const items: { status: AttendanceStatus; value: number }[] = [
//         { status: AttendanceStatus.Present, value: counts.present },
//         { status: AttendanceStatus.Late, value: counts.late },
//         { status: AttendanceStatus.Absent, value: counts.absent },
//     ];

//     return (
//         <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
//             {items.map((item) => (
//                 <StatusCard key={item.status} status={item.status} value={item.value} />
//             ))}
//         </div>
//     );
// }

// function PenaltyByEventList({ rows }: { rows: DashboardEventPenalty[] }) {
//     if (rows.length === 0) {
//         return (
//             <Card>
//                 <CardContent className="pt-6">
//                     <Text variant="small">No penalties recorded yet.</Text>
//                 </CardContent>
//             </Card>
//         );
//     }

//     return (
//         <Card>
//             <CardContent className="divide-y divide-border pt-6">
//                 {rows.map((row) => (
//                     <Link
//                         key={row.eventId}
//                         to={`/events/${row.eventId}`}
//                         className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0 hover:underline"
//                     >
//                         <Text variant="small">{row.eventName}</Text>
//                         <Text className="font-medium">{formatCurrency(row.penaltyTotal)}</Text>
//                     </Link>
//                 ))}
//             </CardContent>
//         </Card>
//     );
// }

// function StatusCard({ status, value, total }: { status: AttendanceStatus; value: number; total?: number }) {
//     return (
//         <Card>
//             <CardHeader className="gap-1 pb-2">
//                 <CardDescription>{ATTENDANCE_STATUS_LABEL[status]}</CardDescription>
//                 <CardTitle className="text-h1">{value}</CardTitle>
//             </CardHeader>
//             <CardContent>
//                 <Badge variant="secondary" className={ATTENDANCE_STATUS_BADGE_CLASS[status]}>
//                     {total !== undefined ? `${value} of ${total}` : ATTENDANCE_STATUS_LABEL[status]}
//                 </Badge>
//             </CardContent>
//         </Card>
//     );
// }

// function StatCard({ label, value, highlight }: { label: string; value: ReactNode; highlight?: boolean }) {
//     return (
//         <Card>
//             <CardHeader className="gap-1 pb-2">
//                 <CardDescription>{label}</CardDescription>
//                 <CardTitle className={highlight ? 'text-h1 text-emerald-600 dark:text-emerald-400' : 'text-h1'}>
//                     {value}
//                 </CardTitle>
//             </CardHeader>
//         </Card>
//     );
// }

// function ContributionBar({ percentage }: { percentage: number }) {
//     return (
//         <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
//             <div
//                 className="h-full rounded-full bg-primary transition-all"
//                 style={{ width: `${Math.min(Math.max(percentage, 0), 100)}%` }}
//             />
//         </div>
//     );
// }
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import {
    AlertTriangle,
    Building2,
    CalendarDays,
    CheckCircle2,
    Clock,
    Flame,
    MinusCircle,
    Moon,
    Radio,
    Star,
    Trophy,
    Users,
    Wallet,
    XCircle,
    type LucideIcon,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/application/auth/auth.store';
import { useDashboard } from '@/application/dashboard/use-dashboard';
import type {
    DashboardActiveSession,
    DashboardDepartmentAttendance,
    DashboardDepartmentPenalty,
    DashboardSummary,
    OfficerDashboardSummary,
    StudentDashboardSummary,
} from '@/infrastructure/dashboard/dashboard.repository.http';
import { AttendanceStatus, CHECK_TYPE_LABEL, Role, WINDOW_TYPE_LABEL } from '@/domain/enums';
import { cn, formatCurrency, formatDate, formatTimeOfDay } from '@/lib/utils';
import { Heading, Text } from '@/presentation/components/typography';
import { AnimatedCounter } from '@/presentation/components/dashboard/animated-counter';
import { RadialGauge, SegmentedRing } from '@/presentation/components/dashboard/gauges';
import { Leaderboard, type LeaderboardEntry } from '@/presentation/components/dashboard/leaderboard';

function isOfficerSummary(summary: DashboardSummary): summary is OfficerDashboardSummary {
    return summary.role === Role.Officer;
}

function isStudentSummary(summary: DashboardSummary): summary is StudentDashboardSummary {
    return summary.role === Role.Student;
}

// One shared stagger so every dashboard variant enters the same way —
// the single orchestrated motion moment for this page. Each direct child
// of `container` should carry the `item` variant.
const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } };
const item: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};

export function DashboardPage() {
    const student = useAuthStore((state) => state.student);
    const { data, isLoading, isError } = useDashboard();

    if (!student) return null;

    return (
        <div className="space-y-8">
            <div>
                <Heading level="h1">Dashboard</Heading>
                <Text variant="small">{subtitleFor(data, student.role)}</Text>
            </div>

            {isLoading && <Text variant="small">Loading…</Text>}

            {isError && <Text variant="small">Couldn't load the dashboard. Try refreshing.</Text>}

            {data && isOfficerSummary(data) && <OfficerDashboard summary={data} />}
            {data && isStudentSummary(data) && <StudentDashboard summary={data} />}
            {data && !isOfficerSummary(data) && !isStudentSummary(data) && <AdminDashboard summary={data} />}
        </div>
    );
}

function subtitleFor(data: DashboardSummary | undefined, role: string): string {
    if (!data) return 'Loading your dashboard…';
    if (isOfficerSummary(data)) return 'Your scanning activity across every session.';
    if (isStudentSummary(data)) return 'Your attendance record and current standing.';
    if (data.scope === 'department' && data.department) return `${data.department.name} (${data.department.code}) overview.`;
    return 'Every department, every event, at a glance.';
}

/* ---------------------------------------------------------------------- */
/* Tiers — the light gamification layer. Derived entirely client-side from
   numbers the API already returns; no backend concept of "level" exists
   or needs to. Kept deliberately quiet (an icon + a short label) rather
   than turning the dashboard into a game. */
/* ---------------------------------------------------------------------- */

interface Tier {
    label: string;
    Icon: LucideIcon;
    className: string;
}

function attendanceTier(rate: number | null): Tier {
    if (rate === null) return { label: 'No sessions yet', Icon: Clock, className: 'text-muted-foreground' };
    if (rate >= 95) return { label: 'Perfect record', Icon: Trophy, className: 'text-violet-600 dark:text-violet-400' };
    if (rate >= 85) return { label: 'Reliable', Icon: Star, className: 'text-violet-600 dark:text-violet-400' };
    if (rate >= 70) return { label: 'Getting there', Icon: Flame, className: 'text-amber-600 dark:text-amber-400' };
    return { label: 'Needs attention', Icon: AlertTriangle, className: 'text-red-600 dark:text-red-400' };
}

function contributionTier(percentage: number, totalScans: number): Tier {
    if (totalScans === 0) return { label: 'No scans yet', Icon: Clock, className: 'text-muted-foreground' };
    if (percentage >= 50) return { label: 'Top scanner', Icon: Trophy, className: 'text-violet-600 dark:text-violet-400' };
    if (percentage >= 25) return { label: 'Strong contributor', Icon: Star, className: 'text-violet-600 dark:text-violet-400' };
    return { label: 'Getting started', Icon: Flame, className: 'text-amber-600 dark:text-amber-400' };
}

/* ---------------------------------------------------------------------- */
/* Student                                                                 */
/* ---------------------------------------------------------------------- */

function StudentDashboard({ summary }: { summary: StudentDashboardSummary }) {
    const { present, late, absent, excluded } = summary.totals;
    const tracked = present + late + absent;
    const rate = tracked > 0 ? Math.round(((present + late) / tracked) * 100) : null;
    const tier = attendanceTier(rate);

    const pills: { status: AttendanceStatus; value: number; Icon: LucideIcon; className: string }[] = [
        { status: AttendanceStatus.Present, value: present, Icon: CheckCircle2, className: 'text-emerald-600 dark:text-emerald-400' },
        { status: AttendanceStatus.Late, value: late, Icon: Clock, className: 'text-amber-600 dark:text-amber-400' },
        { status: AttendanceStatus.Absent, value: absent, Icon: XCircle, className: 'text-red-600 dark:text-red-400' },
        { status: AttendanceStatus.Excluded, value: excluded, Icon: MinusCircle, className: 'text-muted-foreground' },
    ];

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
            <motion.div variants={item}>
                <ScoreHero
                    value={rate}
                    tier={tier}
                    eyebrow="Your attendance score"
                    caption={
                        tracked > 0
                            ? `Present or late for ${present + late} of ${tracked} tracked sessions`
                            : 'Nothing tracked yet — check back after your first session.'
                    }
                />
            </motion.div>

            <motion.div variants={item} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {pills.map((pill) => (
                    <StatPill key={pill.status} label={statusLabel(pill.status)} value={pill.value} Icon={pill.Icon} iconClassName={pill.className} />
                ))}
            </motion.div>

            <motion.div variants={item}>
                <PenaltyStrip total={summary.penaltyTotal} />
            </motion.div>

            <motion.div variants={item} className="space-y-2">
                <div className="flex items-center justify-between">
                    <Text variant="caption">Current session</Text>
                    <SessionStatusBadge status={summary.activeSession ? (summary.activeSessionStatus ?? AttendanceStatus.Pending) : null} />
                </div>
                <ActiveSessionCard session={summary.activeSession} />
            </motion.div>
        </motion.div>
    );
}

/* ---------------------------------------------------------------------- */
/* Officer                                                                 */
/* ---------------------------------------------------------------------- */

function OfficerDashboard({ summary }: { summary: OfficerDashboardSummary }) {
    const others = Math.max(summary.totalScans - summary.myScans, 0);
    const tier = contributionTier(summary.contributionPercentage, summary.totalScans);

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
            <motion.div variants={item}>
                <ScoreHero
                    value={summary.totalScans > 0 ? summary.contributionPercentage : null}
                    tier={tier}
                    eyebrow="Your share of all scans"
                    caption={`${summary.myScans} of ${summary.totalScans} total scans recorded across every officer`}
                />
            </motion.div>

            <motion.div variants={item}>
                <Card>
                    <CardHeader className="gap-1 pb-2">
                        <CardDescription>You vs. everyone else</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <SplitBar mineLabel="You" mine={summary.myScans} othersLabel="Other officers" others={others} />
                    </CardContent>
                </Card>
            </motion.div>

            <motion.div variants={item} className="space-y-2">
                <Text variant="caption">Current session</Text>
                <ActiveSessionCard session={summary.activeSession} />
            </motion.div>
        </motion.div>
    );
}

/* ---------------------------------------------------------------------- */
/* Admin (System Admin / CSG Admin / SC Admin)                            */
/* ---------------------------------------------------------------------- */

function AdminDashboard({ summary }: { summary: Extract<DashboardSummary, { scope: 'global' | 'department' }> }) {
    const { present, late, absent } = summary.overallAttendanceCounts;

    const departmentEntries: LeaderboardEntry[] = summary.attendanceByDepartment.map((row) => ({
        id: row.departmentId,
        label: `${row.departmentName} (${row.departmentCode})`,
        value: `${row.tracked} tracked`,
        percentage: row.percentageOfOverall,
    }));

    const penaltyEntries: LeaderboardEntry[] = summary.penaltyByEvent.map((row) => ({
        id: row.eventId,
        href: `/events/${row.eventId}`,
        label: row.eventName,
        value: formatCurrency(row.penaltyTotal),
        percentage: row.percentageOfOverall,
    }));

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
            <motion.div variants={item}>
                {summary.activeSession && summary.activeSessionCounts ? (
                    <LiveHero session={summary.activeSession} counts={summary.activeSessionCounts} />
                ) : (
                    <QuietHero totalStudents={summary.totalStudents} eventsCount={summary.eventsCount} scope={summary.scope} />
                )}
            </motion.div>

            <motion.div variants={item}>
                <Card className="overflow-hidden">
                    <CardHeader className="gap-1 pb-2">
                        <div className="flex items-center gap-1.5">
                            <Trophy className="size-4 text-amber-500" />
                            <CardDescription>Attendance across all events</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-around">
                            <SegmentedRing
                                size={148}
                                strokeWidth={16}
                                segments={[
                                    { value: present, className: 'stroke-emerald-500 dark:stroke-emerald-400' },
                                    { value: late, className: 'stroke-amber-500 dark:stroke-amber-400' },
                                    { value: absent, className: 'stroke-red-500 dark:stroke-red-400' },
                                ]}
                            >
                                <span className="text-h2 font-semibold tabular-nums text-foreground">
                                    <AnimatedCounter value={present + late + absent} />
                                </span>
                                <span className="text-caption text-muted-foreground">tracked</span>
                            </SegmentedRing>

                            <div className="grid w-full grid-cols-1 gap-2.5 sm:w-auto">
                                <StatChip label="Present" value={present} iconClassName="text-emerald-500" Icon={CheckCircle2} />
                                <StatChip label="Late" value={late} iconClassName="text-amber-500" Icon={Clock} />
                                <StatChip label="Absent" value={absent} iconClassName="text-red-500" Icon={XCircle} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            <motion.div variants={item} className="space-y-2">
                <div className="flex items-center gap-1.5">
                    <Building2 className="size-4 text-violet-500" />
                    <Text variant="caption">Attendance by department — share of overall</Text>
                </div>
                <Leaderboard entries={departmentEntries} emptyLabel="No attendance tracked yet." />
            </motion.div>

            <motion.div variants={item} className="space-y-2">
                <div className="flex items-center gap-1.5">
                    <Flame className="size-4 text-orange-500" />
                    <Text variant="caption">Present / Late / Absent — by department</Text>
                </div>
                <DepartmentComposition
                    rows={summary.attendanceByDepartment}
                    penaltyByDepartment={summary.penaltyByDepartment}
                />
            </motion.div>

            <motion.div variants={item} className="space-y-2">
                <div className="flex items-center gap-1.5">
                    <Wallet className="size-4 text-amber-500" />
                    <Text variant="caption">Penalties across all events — share of overall</Text>
                </div>
                <PenaltyStrip total={summary.penaltyTotal} />
                <Leaderboard entries={penaltyEntries} emptyLabel="No penalties recorded yet." />
            </motion.div>
        </motion.div>
    );
}

/* ---------------------------------------------------------------------- */
/* Department composition — Present/Late/Absent split *within* each      */
/* department (not that department's share of the grand total, which is  */
/* what the Leaderboard above already shows). One bold segmented bar per */
/* department, dark surface + a confident amber/orange fill, echoing the */
/* energetic sports-app reference the client pointed to — but kept on    */
/* this app's existing status palette (emerald/amber/red) rather than a  */
/* new color scheme, since that mapping already means Present/Late/      */
/* Absent everywhere else in the app (badges, the ring above, etc.).     */
/* ---------------------------------------------------------------------- */

function DepartmentComposition({
    rows,
    penaltyByDepartment,
}: {
    rows: DashboardDepartmentAttendance[];
    penaltyByDepartment: DashboardDepartmentPenalty[];
}) {
    if (rows.length === 0) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <Text variant="small">No attendance tracked yet.</Text>
                </CardContent>
            </Card>
        );
    }

    const penaltyByDept = new Map(penaltyByDepartment.map((row) => [row.departmentId, row]));

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="grid gap-3 sm:grid-cols-2">
            {rows.map((dept) => {
                const tracked = dept.present + dept.late + dept.absent;
                const presentPct = tracked > 0 ? (dept.present / tracked) * 100 : 0;
                const latePct = tracked > 0 ? (dept.late / tracked) * 100 : 0;
                const absentPct = tracked > 0 ? 100 - presentPct - latePct : 0;
                const penalty = penaltyByDept.get(dept.departmentId);

                return (
                    <motion.div key={dept.departmentId} variants={item}>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <span className="text-small font-medium text-foreground">{dept.departmentCode}</span>
                                    <Text variant="caption">{tracked} tracked</Text>
                                </div>

                                <div className="mt-3 flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                    {presentPct > 0 && (
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${presentPct}%` }}
                                            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                            className="bg-emerald-500"
                                        />
                                    )}
                                    {latePct > 0 && (
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${latePct}%` }}
                                            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
                                            className="bg-amber-500"
                                        />
                                    )}
                                    {absentPct > 0 && (
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${absentPct}%` }}
                                            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                                            className="bg-red-500"
                                        />
                                    )}
                                </div>

                                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-muted-foreground">
                                    <span className="flex items-center gap-1.5">
                                        <span className="size-1.5 rounded-full bg-emerald-500" /> Present {Math.round(presentPct)}%
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="size-1.5 rounded-full bg-amber-500" /> Late {Math.round(latePct)}%
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="size-1.5 rounded-full bg-red-500" /> Absent {Math.round(absentPct)}%
                                    </span>
                                </div>

                                {penalty && penalty.penaltyTotal > 0 && (
                                    <div className="mt-3 flex items-center justify-between border-t pt-3">
                                        <span className="flex items-center gap-1.5 text-caption text-muted-foreground">
                                            <Wallet className="size-3.5" /> Penalties
                                        </span>
                                        <span className="text-small font-semibold tabular-nums text-foreground">
                                            {formatCurrency(penalty.penaltyTotal)}
                                            <span className="ml-1 font-normal text-muted-foreground">
                                                ({Math.round(penalty.percentageOfOverall)}% of all)
                                            </span>
                                        </span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                );
            })}
        </motion.div>
    );
}

/* ---------------------------------------------------------------------- */
/* Shared pieces                                                          */
/* ---------------------------------------------------------------------- */

function ScoreHero({ value, tier, eyebrow, caption }: { value: number | null; tier: Tier; eyebrow: string; caption: string }) {
    const { Icon } = tier;

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-3xl border bg-card p-6"
        >
            <div className="flex flex-col items-center gap-4 text-center">
                <Text variant="caption">{eyebrow}</Text>
                <RadialGauge value={value ?? 0} colorClassName="stroke-foreground">
                    {value !== null ? (
                        <>
                            <span className="text-display font-semibold tabular-nums text-foreground">
                                <AnimatedCounter value={value} format={(n) => `${Math.round(n)}`} />
                            </span>
                            <span className="text-caption text-muted-foreground">percent</span>
                        </>
                    ) : (
                        <span className="text-h3 text-muted-foreground">—</span>
                    )}
                </RadialGauge>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6, type: 'spring', stiffness: 260, damping: 18 }}
                    className={cn('flex items-center gap-1.5 rounded-full border px-3 py-1 text-small font-medium', tier.className)}
                >
                    <Icon className="size-4" />
                    {tier.label}
                </motion.div>
                <Text variant="small" className="max-w-xs">
                    {caption}
                </Text>
            </div>
        </motion.div>
    );
}

function LiveHero({ session, counts }: { session: DashboardActiveSession; counts: { present: number; totalStudents: number } }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-3xl border bg-card p-6"
        >
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <span className="relative flex size-2">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                    </span>
                    <Badge variant="secondary" className="gap-1">
                        <Radio className="size-3" />
                        Live
                    </Badge>
                </div>

                <div>
                    <Link to={`/events/${session.eventId}`} className="text-h2 font-semibold hover:underline">
                        {session.eventName}
                    </Link>
                    <Text variant="small">
                        Day {session.eventDay.dayNumber} — {formatDate(session.eventDay.date)} · {WINDOW_TYPE_LABEL[session.windowType]} ·{' '}
                        {CHECK_TYPE_LABEL[session.checkType]}
                    </Text>
                </div>

                <div className="flex items-end gap-2">
                    <span className="text-display font-semibold tabular-nums text-foreground">
                        <AnimatedCounter value={counts.present} />
                    </span>
                    <Text variant="small" className="pb-2">
                        of {counts.totalStudents} present so far
                    </Text>
                </div>
            </div>
        </motion.div>
    );
}

function QuietHero({ totalStudents, eventsCount, scope }: { totalStudents: number; eventsCount: number; scope: 'global' | 'department' }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-3xl border bg-card p-6"
        >
            <div className="flex items-center gap-2 text-muted-foreground">
                <Moon className="size-4" />
                <Text variant="small">No session is currently open.</Text>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
                <MiniStat label={scope === 'department' ? 'Students in department' : 'Total students'} value={totalStudents} Icon={Users} />
                <MiniStat label="Events" value={eventsCount} Icon={CalendarDays} />
            </div>
        </motion.div>
    );
}

function MiniStat({ label, value, Icon }: { label: string; value: number; Icon: LucideIcon }) {
    return (
        <motion.div whileHover={{ y: -2 }} className="rounded-2xl border p-3">
            <div className="mb-1.5 flex size-7 items-center justify-center rounded-full bg-muted">
                <Icon className="size-3.5 text-muted-foreground" />
            </div>
            <Text variant="caption">{label}</Text>
            <span className="block text-h2 font-semibold tabular-nums text-foreground">
                <AnimatedCounter value={value} />
            </span>
        </motion.div>
    );
}

function StatChip({ label, value, Icon, iconClassName }: { label: string; value: number; Icon: LucideIcon; iconClassName: string }) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3">
            <div className="flex items-center gap-2">
                <Icon className={cn('size-4', iconClassName)} />
                <Text variant="small" className="font-medium text-foreground">
                    {label}
                </Text>
            </div>
            <span className="text-h3 font-semibold tabular-nums text-foreground">
                <AnimatedCounter value={value} />
            </span>
        </div>
    );
}

function StatPill({ label, value, Icon, iconClassName }: { label: ReactNode; value: number; Icon: LucideIcon; iconClassName: string }) {
    return (
        <Card>
            <CardContent className="flex items-center gap-3 pt-6">
                <Icon className={cn('size-5 shrink-0', iconClassName)} />
                <div className="min-w-0">
                    <span className="block text-h2 leading-none font-semibold tabular-nums text-foreground">
                        <AnimatedCounter value={value} />
                    </span>
                    <Text variant="caption" className="truncate">
                        {label}
                    </Text>
                </div>
            </CardContent>
        </Card>
    );
}

function PenaltyStrip({ total }: { total: number }) {
    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between gap-2 pb-2">
                <div className="flex items-center gap-2">
                    <Wallet className="size-4 text-muted-foreground" />
                    <CardDescription>Total penalty balance</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <span
                    className={cn(
                        'text-h1 font-semibold tabular-nums',
                        total > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400',
                    )}
                >
                    <AnimatedCounter value={total} format={formatCurrency} />
                </span>
            </CardContent>
        </Card>
    );
}

function SplitBar({ mineLabel, mine, othersLabel, others }: { mineLabel: string; mine: number; othersLabel: string; others: number }) {
    const total = mine + others;
    const minePercent = total > 0 ? (mine / total) * 100 : 0;

    return (
        <div className="space-y-2">
            <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                <motion.div
                    className="h-full bg-violet-500 dark:bg-violet-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${minePercent}%` }}
                    transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
                />
            </div>
            <div className="flex items-center justify-between text-small">
                <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-violet-500 dark:bg-violet-400" />
                    {mineLabel} · <span className="font-medium text-foreground">{mine}</span>
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="size-2 rounded-full bg-muted-foreground/40" />
                    {othersLabel} · <span className="font-medium text-foreground">{others}</span>
                </span>
            </div>
        </div>
    );
}

function ActiveSessionCard({ session }: { session: DashboardActiveSession | null }) {
    if (!session) {
        return (
            <Card>
                <CardContent className="flex items-center gap-2 pt-6 text-muted-foreground">
                    <Moon className="size-4" />
                    <Text variant="small">No session is currently open.</Text>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="gap-1 pb-2">
                <div className="flex items-center gap-2">
                    <span className="relative flex size-2">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                    </span>
                    <CardDescription>Active session</CardDescription>
                </div>
                <CardTitle className="text-h2">
                    <Link to={`/events/${session.eventId}`} className="hover:underline">
                        {session.eventName}
                    </Link>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
                <Text variant="small">
                    Day {session.eventDay.dayNumber} — {formatDate(session.eventDay.date)}
                </Text>
                <Text variant="small">
                    {WINDOW_TYPE_LABEL[session.windowType]} · {CHECK_TYPE_LABEL[session.checkType]} · {formatTimeOfDay(session.startTime)}–
                    {formatTimeOfDay(session.endTime)}
                </Text>
            </CardContent>
        </Card>
    );
}

function SessionStatusBadge({ status }: { status: AttendanceStatus | null }) {
    if (!status) return null;

    const config: Record<AttendanceStatus, { className: string; label: string }> = {
        [AttendanceStatus.Present]: {
            className: 'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
            label: 'Present',
        },
        [AttendanceStatus.Late]: { className: 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300', label: 'Late' },
        [AttendanceStatus.Absent]: { className: 'border-transparent bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300', label: 'Absent' },
        [AttendanceStatus.Excluded]: {
            className: 'border-transparent bg-gray-100 text-gray-700 dark:bg-gray-800/60 dark:text-gray-300',
            label: 'Excluded',
        },
        [AttendanceStatus.Pending]: {
            className: 'border-transparent bg-gray-100 text-gray-700 dark:bg-gray-800/60 dark:text-gray-300',
            label: 'Pending',
        },
    };

    const { className, label } = config[status];

    return (
        <Badge variant="secondary" className={className}>
            {label}
        </Badge>
    );
}

function statusLabel(status: AttendanceStatus): string {
    const labels: Record<AttendanceStatus, string> = {
        [AttendanceStatus.Present]: 'Present',
        [AttendanceStatus.Late]: 'Late',
        [AttendanceStatus.Absent]: 'Absent',
        [AttendanceStatus.Excluded]: 'Excluded',
        [AttendanceStatus.Pending]: 'Pending',
    };
    return labels[status];
}
