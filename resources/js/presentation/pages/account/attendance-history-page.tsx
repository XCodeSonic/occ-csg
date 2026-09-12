import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMyAttendanceHistory } from '@/application/events/use-my-attendance-history';
import {
    ATTENDANCE_STATUS_BADGE_CLASS,
    ATTENDANCE_STATUS_LABEL,
    AttendanceStatus,
    CHECK_TYPE_LABEL,
    WINDOW_TYPE_LABEL,
} from '@/domain/enums';
import { formatDate, formatScannedAt, formatTimeOfDay } from '@/lib/utils';
import { Heading, Text } from '@/presentation/components/typography';

const ALL = 'all';

export function AttendanceHistoryPage() {
    const { data: entries, isLoading } = useMyAttendanceHistory();

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

    const filteredEntries = (entries ?? []).filter((entry) => {
        if (eventFilter !== ALL && String(entry.eventId) !== eventFilter) return false;
        if (statusFilter !== ALL) {
            const status = entry.attendanceStatus ?? AttendanceStatus.Pending;
            if (status !== statusFilter) return false;
        }
        return true;
    });

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <div>
                <Heading level="h1">Attendance History</Heading>
                <Text variant="small">Your own Present / Late / Absent record, per event and session.</Text>
            </div>

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

                    return (
                        <div
                            key={entry.sessionId}
                            className="space-y-2 rounded-lg border border-border p-3"
                        >
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
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
