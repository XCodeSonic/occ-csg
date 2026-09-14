import { useMemo, useState } from 'react';
import { Wallet } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/application/auth/auth.store';
import { useMyAttendanceHistory } from '@/application/events/use-my-attendance-history';
import { useMyPenaltyHistory } from '@/application/penalties/use-my-penalty-history';
import type { MyPenaltyEntry } from '@/infrastructure/penalties/penalties.repository.http';
import {
    ATTENDANCE_STATUS_BADGE_CLASS,
    ATTENDANCE_STATUS_LABEL,
    AttendanceStatus,
    CHECK_TYPE_LABEL,
    Role,
    WINDOW_TYPE_LABEL,
} from '@/domain/enums';
import { cn, formatCurrency, formatDate, formatScannedAt, formatTimeOfDay } from '@/lib/utils';
import { Heading, Text } from '@/presentation/components/typography';

const ALL = 'all';

// Ties a penalty back to the session it was issued for. Penalty entries
// don't carry a sessionId of their own (see MyPenaltyHistoryController —
// a penalty is recorded against an event day/window/check, not a
// session row), so matching happens on that same tuple instead.
function sessionKey(parts: { eventId: number; dayNumber: number; windowType: string; checkType: string }): string {
    return `${parts.eventId}:${parts.dayNumber}:${parts.windowType}:${parts.checkType}`;
}

export function AttendanceHistoryPage() {
    const student = useAuthStore((state) => state.student);
    const isStudent = student?.role === Role.Student;

    const { data: entries, isLoading } = useMyAttendanceHistory();
    // Only students carry a penalty balance — see account-page.tsx for
    // the same guard. Merged into this page (rather than kept as its
    // own screen) so a penalty always shows next to the session that
    // caused it, for auditing.
    const { data: penaltyHistory, isLoading: isPenaltyLoading } = useMyPenaltyHistory({ enabled: isStudent });

    const [eventFilter, setEventFilter] = useState(ALL);
    const [statusFilter, setStatusFilter] = useState(ALL);

    // One dropdown entry per event, in the order events already come
    // back in (newest first) — de-duplicated by id since an event
    // contributes one row per session.
    const eventOptions = useMemo(() => {
        const seen = new Map<number, string>();
        for (const entry of entries ?? []) {
            if (!seen.has(entry.eventId)) seen.set(entry.eventId, entry.eventName);
        }
        return Array.from(seen, ([id, name]) => ({ id, name }));
    }, [entries]);

    // Every penalty grouped by the session that caused it, so it can
    // render inline with that session's attendance row.
    const penaltiesBySession = useMemo(() => {
        const map = new Map<string, MyPenaltyEntry[]>();
        for (const penalty of penaltyHistory?.entries ?? []) {
            const key = sessionKey(penalty);
            const bucket = map.get(key);
            if (bucket) bucket.push(penalty);
            else map.set(key, [penalty]);
        }
        return map;
    }, [penaltyHistory]);

    const filteredEntries = (entries ?? []).filter((entry) => {
        if (eventFilter !== ALL && String(entry.eventId) !== eventFilter) return false;
        if (statusFilter !== ALL) {
            const status = entry.attendanceStatus ?? AttendanceStatus.Pending;
            if (status !== statusFilter) return false;
        }
        return true;
    });

    // Penalties that don't line up with any session currently in this
    // student's attendance history — still surfaced, rather than
    // silently dropped, so the audit trail always accounts for every
    // peso in the total.
    const unmatchedPenalties = useMemo(() => {
        const matchedIds = new Set<number>();
        for (const entry of entries ?? []) {
            const bucket = penaltiesBySession.get(sessionKey(entry));
            bucket?.forEach((penalty) => matchedIds.add(penalty.id));
        }
        return (penaltyHistory?.entries ?? []).filter((penalty) => !matchedIds.has(penalty.id));
    }, [entries, penaltyHistory, penaltiesBySession]);

    // Same event/status filters the attendance rows use, applied to the
    // unmatched penalties too — they carry an eventId but no session
    // status, so a status filter (which only makes sense for a specific
    // session) hides them entirely rather than guessing.
    const visibleUnmatchedPenalties = useMemo(() => {
        if (statusFilter !== ALL) return [];
        return unmatchedPenalties.filter((penalty) => eventFilter === ALL || String(penalty.eventId) === eventFilter);
    }, [unmatchedPenalties, eventFilter, statusFilter]);

    const isFiltered = eventFilter !== ALL || statusFilter !== ALL;

    // The balance banner mirrors whatever's currently on screen: with no
    // filters it's the same figure as the account page, but narrowing to
    // one event or status recomputes it from only the penalties still
    // visible below (matched rows within filteredEntries, plus whichever
    // unmatched ones still pass the event filter).
    const visiblePenaltyTotal = useMemo(() => {
        let total = 0;
        for (const entry of filteredEntries) {
            const bucket = penaltiesBySession.get(sessionKey(entry));
            bucket?.forEach((penalty) => {
                if (!penalty.isReversed) total += penalty.amount;
            });
        }
        for (const penalty of visibleUnmatchedPenalties) {
            if (!penalty.isReversed) total += penalty.amount;
        }
        return total;
    }, [filteredEntries, penaltiesBySession, visibleUnmatchedPenalties]);

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <div>
                <Heading level="h1">Attendance & Penalties</Heading>
                <Text variant="small">Your Present / Late / Absent record, with any penalty shown against the session it came from.</Text>
            </div>

            {isStudent && !isPenaltyLoading && penaltyHistory && (
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2">
                        <Wallet className="size-4 text-muted-foreground" />
                        <Text variant="small">{isFiltered ? 'Penalty total for current filters' : 'Total penalty balance'}</Text>
                    </div>
                    <span
                        className={cn(
                            'text-h3 font-semibold tabular-nums',
                            (isFiltered ? visiblePenaltyTotal : penaltyHistory.total) > 0
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-emerald-600 dark:text-emerald-400',
                        )}
                    >
                        {formatCurrency(isFiltered ? visiblePenaltyTotal : penaltyHistory.total)}
                    </span>
                </div>
            )}

            <div className="grid grid-cols-2 gap-3">
                <Select value={eventFilter} onValueChange={setEventFilter}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Event" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={ALL}>All events</SelectItem>
                        {eventOptions.map((option) => (
                            <SelectItem key={option.id} value={String(option.id)}>
                                {option.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={ALL}>All statuses</SelectItem>
                        {Object.values(AttendanceStatus).map((status) => (
                            <SelectItem key={status} value={status}>
                                {ATTENDANCE_STATUS_LABEL[status]}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {isLoading && <Text variant="small">Loading…</Text>}

            {!isLoading && filteredEntries.length === 0 && (
                <Text variant="small">
                    {entries && entries.length > 0 ? 'No sessions match these filters.' : 'No attendance history yet.'}
                </Text>
            )}

            <div className="space-y-2">
                {filteredEntries.map((entry) => {
                    const status = entry.attendanceStatus ?? AttendanceStatus.Pending;
                    const penalties = penaltiesBySession.get(sessionKey(entry)) ?? [];

                    return (
                        <div key={entry.sessionId} className="space-y-2 rounded-lg border border-border p-3">
                            <div className="flex items-center justify-between gap-3">
                                <Text className="font-medium">{entry.eventName}</Text>
                                <Badge variant="secondary" className={ATTENDANCE_STATUS_BADGE_CLASS[status]}>
                                    {ATTENDANCE_STATUS_LABEL[status]}
                                </Badge>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Text variant="small">
                                            Day {entry.dayNumber} — {formatDate(entry.date)}
                                        </Text>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Text variant="small" className="text-foreground">
                                            {WINDOW_TYPE_LABEL[entry.windowType]}
                                        </Text>
                                        <Badge variant="outline">{CHECK_TYPE_LABEL[entry.checkType]}</Badge>
                                        <Text variant="small">
                                            {formatTimeOfDay(entry.startTime)}–{formatTimeOfDay(entry.endTime)}
                                        </Text>
                                    </div>
                                </div>

                                {entry.scannedAt && (
                                    <Text variant="small" className="text-muted-foreground">
                                        {formatScannedAt(entry.scannedAt)}
                                    </Text>
                                )}
                            </div>

                            {penalties.length > 0 && (
                                <div className="space-y-1.5 border-t border-border pt-2">
                                    {penalties.map((penalty) => (
                                        <PenaltyDetail key={penalty.id} penalty={penalty} />
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {visibleUnmatchedPenalties.length > 0 && (
                <div className="space-y-2">
                    <Text variant="caption">Other penalties (not tied to a session above)</Text>
                    <div className="space-y-2">
                        {visibleUnmatchedPenalties.map((penalty) => (
                            <div key={penalty.id} className="space-y-1.5 rounded-lg border border-border p-3">
                                <Text className="font-medium">{penalty.eventName}</Text>
                                <Text variant="small">
                                    Day {penalty.dayNumber} — {formatDate(penalty.date)} · {WINDOW_TYPE_LABEL[penalty.windowType]} ·{' '}
                                    {CHECK_TYPE_LABEL[penalty.checkType]}
                                </Text>
                                <PenaltyDetail penalty={penalty} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// One penalty line: amount + reason it was issued, and — if it's since
// been waived — who reversed it. This is the "audit" detail: it's what
// lets a student see *why* a charge landed on a specific session rather
// than just seeing a lump total.
function PenaltyDetail({ penalty }: { penalty: MyPenaltyEntry }) {
    return (
        <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
                <Text variant="small" className={cn('text-foreground', penalty.isReversed && 'line-through text-muted-foreground')}>
                    {penalty.reason}
                </Text>
                {penalty.isReversed && (
                    <Text variant="caption">Reversed{penalty.reversedBy ? ` by ${penalty.reversedBy}` : ''}</Text>
                )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
                <span
                    className={cn(
                        'text-small font-semibold tabular-nums',
                        penalty.isReversed ? 'text-muted-foreground line-through' : 'text-red-600 dark:text-red-400',
                    )}
                >
                    {formatCurrency(penalty.amount)}
                </span>
                {penalty.isReversed && (
                    <Badge variant="outline" className="text-muted-foreground">
                        Reversed
                    </Badge>
                )}
            </div>
        </div>
    );
}
