import { type FormEvent, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileBarChart } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/application/auth/auth.store';
import { useEvents } from '@/application/events/use-events';
import { useCreateEventDay } from '@/application/events/use-create-event-day';
import { useEndEvent } from '@/application/events/use-end-event';
import { useMyEventAttendance } from '@/application/events/use-my-event-attendance';
import { EVENT_STATUS_BADGE_CLASS, EVENT_STATUS_LABEL, EventStatus, Role, SessionStatus } from '@/domain/enums';
import { Heading, Text } from '@/presentation/components/typography';
import { EventDaySection } from '@/presentation/pages/events/event-day-section';
import { StudentEventDaySection } from '@/presentation/pages/events/student-event-day-section';

const MANAGE_ROLES: Role[] = [Role.SystemAdmin, Role.CsgAdmin];
// Mirrors EventModelPolicy::viewRosterReport — an SC Admin can pull
// reports for their own department even though they can't manage days
// and sessions (MANAGE_ROLES above).
const REPORT_ROLES: Role[] = [Role.SystemAdmin, Role.CsgAdmin, Role.ScAdmin];

interface DayFormValues {
    date: string;
    dayNumber: string;
}

const EMPTY_DAY_FORM: DayFormValues = { date: '', dayNumber: '' };

export function EventDetailPage() {
    const { eventId } = useParams<{ eventId: string }>();
    const navigate = useNavigate();
    const student = useAuthStore((state) => state.student);
    const { data: events, isLoading } = useEvents();

    const [isCreatingDay, setIsCreatingDay] = useState(false);
    const [dayForm, setDayForm] = useState<DayFormValues>(EMPTY_DAY_FORM);

    const event = events?.find((candidate) => candidate.id === Number(eventId));
    const createEventDay = useCreateEventDay(Number(eventId));
    const endEvent = useEndEvent();
    // Only rendered for non-managers (see canManage below), but the hook
    // itself has to run unconditionally either way — React's rules of
    // hooks don't allow it behind the early `if (!student)` return.
    const myAttendance = useMyEventAttendance(Number(eventId));

    if (!student) return null;

    const canManage = MANAGE_ROLES.includes(student.role);
    const sortedDays = event ? [...event.days].sort((a, b) => a.dayNumber - b.dayNumber) : [];
    const nextDayNumber = sortedDays.length > 0 ? Math.max(...sortedDays.map((day) => day.dayNumber)) + 1 : 1;
    const isEventEnded = event?.status === EventStatus.Ended;
    // Only one session per event may be ongoing at a time (spec: don't
    // start Day 1 Afternoon while Day 1 Morning Time Out is still open) —
    // computed across every day, not just the one being rendered, and
    // passed down so EventDaySection can disable "Start" on every *other*
    // session the moment one goes ongoing, instead of only finding out
    // after the server rejects it.
    const ongoingSessionId = sortedDays
        .flatMap((day) => day.sessions)
        .find((session) => session.status === SessionStatus.Ongoing)?.id ?? null;

    function handleEndEvent() {
        if (!event) return;

        if (!window.confirm('End this event? Any still-ongoing session will be ended automatically too.')) {
            return;
        }

        endEvent.mutate(event.id, {
            onSuccess: (result) => {
                toast.success(
                    result.sessionsEnded > 0
                        ? `Event ended. ${result.sessionsEnded} ongoing session(s) were ended too.`
                        : 'Event ended.',
                );
            },
            onError: () => toast.error('Could not end event.'),
        });
    }

    function handleCreateDay(formEvent: FormEvent) {
        formEvent.preventDefault();
        createEventDay.mutate(
            {
                date: dayForm.date,
                day_number: Number(dayForm.dayNumber),
            },
            {
                onSuccess: () => {
                    toast.success('Day added.');
                    setDayForm(EMPTY_DAY_FORM);
                    setIsCreatingDay(false);
                },
                onError: () => {
                    toast.error("Could not add day. Check the day number isn't already used.");
                },
            },
        );
    }

    if (isLoading) {
        return <Text variant="small">Loading…</Text>;
    }

    if (!event) {
        return <Text variant="small">Event not found.</Text>;
    }

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <Heading level="h1">{event.name}</Heading>
                        <Badge variant="secondary" className={EVENT_STATUS_BADGE_CLASS[event.status]}>
                            {EVENT_STATUS_LABEL[event.status]}
                        </Badge>
                    </div>
                    {event.description && <Text variant="small">{event.description}</Text>}
                </div>

                <div className="flex shrink-0 gap-2">
                    {REPORT_ROLES.includes(student.role) && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => navigate(`/events/${event.id}/report`)}
                        >
                            <FileBarChart className="size-4" />
                            Reports
                        </Button>
                    )}
                    {canManage && !isEventEnded && (
                        <Button size="sm" variant="destructive" onClick={handleEndEvent} disabled={endEvent.isPending}>
                            {endEvent.isPending ? 'Ending…' : 'End event'}
                        </Button>
                    )}
                </div>
            </div>

            {isEventEnded && (
                <Text variant="small" className="text-muted-foreground">
                    This event has ended. Days and sessions are now read-only.
                </Text>
            )}

            <Separator />

            <div className="space-y-3">
                <Heading level="h2">Days</Heading>

                {canManage ? (
                    <>
                        {sortedDays.length === 0 && <Text variant="small">No days scheduled yet.</Text>}

                        {sortedDays.map((day) => (
                            <EventDaySection
                                key={day.id}
                                day={day}
                                canManage={!isEventEnded}
                                ongoingSessionId={ongoingSessionId}
                            />
                        ))}
                    </>
                ) : (
                    <>
                        {myAttendance.isLoading && <Text variant="small">Loading…</Text>}

                        {!myAttendance.isLoading && (myAttendance.data?.days.length ?? 0) === 0 && (
                            <Text variant="small">No days scheduled yet.</Text>
                        )}

                        {myAttendance.data?.days
                            .slice()
                            .sort((a, b) => a.dayNumber - b.dayNumber)
                            .map((day) => <StudentEventDaySection key={day.id} day={day} />)}
                    </>
                )}

                {canManage && !isEventEnded &&
                    (isCreatingDay ? (
                        <Card>
                            <CardHeader>
                                <Text variant="small">New day</Text>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleCreateDay} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="dayDate">Date</Label>
                                        <Input
                                            id="dayDate"
                                            type="date"
                                            value={dayForm.date}
                                            onChange={(e) => setDayForm((prev) => ({ ...prev, date: e.target.value }))}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="dayNumber">Day number</Label>
                                        <Input
                                            id="dayNumber"
                                            type="number"
                                            min={1}
                                            value={dayForm.dayNumber}
                                            onChange={(e) =>
                                                setDayForm((prev) => ({ ...prev, dayNumber: e.target.value }))
                                            }
                                            required
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button type="submit" disabled={createEventDay.isPending}>
                                            {createEventDay.isPending ? 'Adding…' : 'Add day'}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                setIsCreatingDay(false);
                                                setDayForm(EMPTY_DAY_FORM);
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    ) : (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                                setDayForm({ date: '', dayNumber: String(nextDayNumber) });
                                setIsCreatingDay(true);
                            }}
                            className="w-full"
                        >
                            Add day
                        </Button>
                    ))}
            </div>
        </div>
    );
}
