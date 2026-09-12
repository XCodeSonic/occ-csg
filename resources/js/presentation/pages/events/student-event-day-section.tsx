import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { MyAttendanceDay } from '@/infrastructure/events/events.repository.http';
import { ATTENDANCE_STATUS_BADGE_CLASS, ATTENDANCE_STATUS_LABEL, CHECK_TYPE_LABEL, SessionStatus, WINDOW_TYPE_LABEL } from '@/domain/enums';
import { formatDate, formatScannedAt, formatTimeOfDay } from '@/lib/utils';
import { Text } from '@/presentation/components/typography';

export function StudentEventDaySection({ day }: { day: MyAttendanceDay }) {
    return (
        <div className="space-y-3 rounded-lg border border-border p-4">
            <Text className="font-medium">
                Day {day.dayNumber} — {formatDate(day.date)}
            </Text>

            {day.sessions.length === 0 && <Text variant="small">No sessions scheduled yet.</Text>}

            <div className="space-y-2">
                {day.sessions.map((session) => (
                    <div key={session.id} className="space-y-2 rounded-md border border-border p-3">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Text className="font-medium">{WINDOW_TYPE_LABEL[session.windowType]}</Text>
                                    <Badge variant="outline">{CHECK_TYPE_LABEL[session.checkType]}</Badge>
                                </div>
                                <Text variant="small">
                                    {formatTimeOfDay(session.startTime)}–{formatTimeOfDay(session.endTime)}
                                </Text>
                            </div>

                            {session.attendanceStatus && (
                                <div className="flex flex-col items-end gap-1">
                                    <Badge
                                        variant="secondary"
                                        className={ATTENDANCE_STATUS_BADGE_CLASS[session.attendanceStatus]}
                                    >
                                        {ATTENDANCE_STATUS_LABEL[session.attendanceStatus]}
                                    </Badge>
                                    {session.scannedAt && (
                                        <Text variant="small" className="text-muted-foreground">
                                            {formatScannedAt(session.scannedAt)}
                                        </Text>
                                    )}
                                </div>
                            )}
                        </div>

                        {!session.attendanceStatus && session.sessionStatus === SessionStatus.Ongoing && (
                            <div className="flex items-center justify-between gap-3 rounded-md bg-accent p-3">
                                <Text variant="small">
                                    Ongoing — go to the attendance committee and present your QR code for
                                    attendance.
                                </Text>
                                <Button asChild size="sm" variant="outline">
                                    <Link to="/profile">My QR</Link>
                                </Button>
                            </div>
                        )}

                        {!session.attendanceStatus && session.sessionStatus === SessionStatus.Scheduled && (
                            <Text variant="small">Not yet started.</Text>
                        )}

                        {!session.attendanceStatus && session.sessionStatus === SessionStatus.Ended && (
                            <Text variant="small">Pending.</Text>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
