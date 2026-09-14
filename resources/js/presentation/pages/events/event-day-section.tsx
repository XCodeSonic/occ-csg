import { type FormEvent, useState } from 'react';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateSession } from '@/application/sessions/use-create-session';
import { useEndSession } from '@/application/sessions/use-end-session';
import { useStartSession } from '@/application/sessions/use-start-session';
import type { EventDayWithSessions } from '@/domain/entities';
import { CHECK_TYPE_LABEL, CheckType, SESSION_STATUS_BADGE_CLASS, SessionStatus, WindowType, WINDOW_TYPE_LABEL } from '@/domain/enums';
import { formatDate } from '@/lib/utils';
import { Text } from '@/presentation/components/typography';

interface SessionFormValues {
    windowType: string;
    checkType: string;
    startTime: string;
    endTime: string;
    graceMinutes: string;
    penaltyLateAmount: string;
    penaltyAbsentAmount: string;
}

const EMPTY_SESSION_FORM: SessionFormValues = {
    windowType: '',
    checkType: '',
    startTime: '',
    endTime: '',
    graceMinutes: '',
    penaltyLateAmount: '',
    penaltyAbsentAmount: '',
};

// Backend: App\Domain\Enums\WindowType / CheckType — a window can have up
// to two sessions (one time-in, one time-out), but never two of the same
// check (unique(event_day_id, window_type, check_type) in the migration).
const WINDOW_TYPE_OPTIONS = Object.values(WindowType).map((value) => ({
    value,
    label: WINDOW_TYPE_LABEL[value],
}));

const CHECK_TYPE_OPTIONS = Object.values(CheckType).map((value) => ({
    value,
    label: CHECK_TYPE_LABEL[value],
}));

// Backend errors (EventHasOngoingSessionException, and validation
// messages on session creation) already come back as a plain
// { message } JSON body — surface that instead of a generic string so
// the officer sees *why*, not just that something failed.
function extractErrorMessage(error: unknown, fallback: string): string {
    return isAxiosError(error) && typeof error.response?.data?.message === 'string'
        ? error.response.data.message
        : fallback;
}

export function EventDaySection({
    day,
    canManage,
    ongoingSessionId,
}: {
    day: EventDayWithSessions;
    canManage: boolean;
    // Id of the one session (in *any* day of this event) currently
    // ongoing, or null if none is. Only one session per event may be
    // ongoing at a time, so every Start button except the one for this
    // exact session gets disabled client-side — see EventHasOngoingSessionException.
    ongoingSessionId: number | null;
}) {
    const [isCreating, setIsCreating] = useState(false);
    const [form, setForm] = useState<SessionFormValues>(EMPTY_SESSION_FORM);
    const createSession = useCreateSession(day.id);
    const startSession = useStartSession();
    const endSession = useEndSession();

    function handleStart(sessionId: number) {
        startSession.mutate(sessionId, {
            onSuccess: () => toast.success('Session started.'),
            onError: (error) => toast.error(extractErrorMessage(error, 'Could not start session.')),
        });
    }

    function handleEnd(sessionId: number) {
        endSession.mutate(sessionId, {
            onSuccess: () => toast.success('Session ended.'),
            onError: () => toast.error('Could not end session.'),
        });
    }

    function handleSubmit(formEvent: FormEvent) {
        formEvent.preventDefault();

        createSession.mutate(
            {
                window_type: form.windowType,
                check_type: form.checkType,
                start_time: form.startTime,
                end_time: form.endTime,
                grace_minutes: form.graceMinutes ? Number(form.graceMinutes) : null,
                penalty_late_amount: form.penaltyLateAmount ? Number(form.penaltyLateAmount) : null,
                penalty_absent_amount: form.penaltyAbsentAmount ? Number(form.penaltyAbsentAmount) : null,
            },
            {
                onSuccess: () => {
                    toast.success('Session added.');
                    setForm(EMPTY_SESSION_FORM);
                    setIsCreating(false);
                },
                onError: (error) => {
                    toast.error(
                        extractErrorMessage(
                            error,
                            "Could not add session. Check this day doesn't already have that window + check.",
                        ),
                    );
                },
            },
        );
    }

    // Hide window/check combinations already scheduled today instead of
    // letting the form hit the server's unique(event_day_id, window_type,
    // check_type) constraint.
    const isTaken = (windowType: string, checkType: string) =>
        day.sessions.some((session) => session.windowType === windowType && session.checkType === checkType);

    const availableWindowOptions = WINDOW_TYPE_OPTIONS.filter(
        (option) => !CHECK_TYPE_OPTIONS.every((check) => isTaken(option.value, check.value)),
    );
    const availableCheckOptions = form.windowType
        ? CHECK_TYPE_OPTIONS.filter((option) => !isTaken(form.windowType, option.value))
        : CHECK_TYPE_OPTIONS;

    return (
        <div className="space-y-3 rounded-lg border border-border p-4">
            <Text className="font-medium">
                Day {day.dayNumber} — {formatDate(day.date)}
            </Text>

            {day.sessions.length === 0 && !isCreating && <Text variant="small">No sessions yet.</Text>}

            <div className="space-y-2">
                {day.sessions.map((session) => (
                    <div
                        key={session.id}
                        className="flex items-center justify-between gap-4 rounded-md border border-border p-3"
                    >
                        <div>
                            <div className="flex items-center gap-2">
                                <Text className="font-medium">{WINDOW_TYPE_LABEL[session.windowType]}</Text>
                                <Badge variant="outline">{CHECK_TYPE_LABEL[session.checkType]}</Badge>
                                <Badge variant="secondary" className={SESSION_STATUS_BADGE_CLASS[session.status]}>
                                    {session.status}
                                </Badge>
                            </div>
                            <Text variant="small">
                                {session.startTime}–{session.endTime}
                                {session.graceMinutes ? ` (+${session.graceMinutes}m grace)` : ''}
                            </Text>
                        </div>

                        {canManage && session.status === SessionStatus.Scheduled && (
                            <Button
                                size="sm"
                                onClick={() => handleStart(session.id)}
                                disabled={startSession.isPending || (ongoingSessionId !== null && ongoingSessionId !== session.id)}
                                title={
                                    ongoingSessionId !== null && ongoingSessionId !== session.id
                                        ? 'Another session in this event is already ongoing. End it first.'
                                        : undefined
                                }
                            >
                                {startSession.isPending ? 'Starting…' : 'Start'}
                            </Button>
                        )}

                        {canManage && session.status === SessionStatus.Ongoing && (
                            <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleEnd(session.id)}
                                disabled={endSession.isPending}
                            >
                                {endSession.isPending ? 'Ending…' : 'End'}
                            </Button>
                        )}
                    </div>
                ))}
            </div>

            {canManage && availableWindowOptions.length > 0 && (
                <Button size="sm" variant="outline" onClick={() => setIsCreating(true)} className="w-full">
                    Add session
                </Button>
            )}

            <Dialog
                open={isCreating}
                onOpenChange={(open) => {
                    setIsCreating(open);
                    if (!open) setForm(EMPTY_SESSION_FORM);
                }}
            >
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Add session</DialogTitle>
                        <DialogDescription>
                            Day {day.dayNumber} — {formatDate(day.date)}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor={`sessionWindow-${day.id}`}>Window</Label>
                                <Select
                                    value={form.windowType}
                                    onValueChange={(value) =>
                                        setForm((prev) => ({ ...prev, windowType: value, checkType: '' }))
                                    }
                                    required
                                >
                                    <SelectTrigger id={`sessionWindow-${day.id}`} className="w-full">
                                        <SelectValue placeholder="Select a window…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableWindowOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`sessionCheck-${day.id}`}>Check type</Label>
                                <Select
                                    value={form.checkType}
                                    onValueChange={(value) => setForm((prev) => ({ ...prev, checkType: value }))}
                                    disabled={!form.windowType}
                                    required
                                >
                                    <SelectTrigger id={`sessionCheck-${day.id}`} className="w-full">
                                        <SelectValue placeholder="Select a check…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableCheckOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor={`startTime-${day.id}`}>Start time</Label>
                                <Input
                                    id={`startTime-${day.id}`}
                                    type="time"
                                    value={form.startTime}
                                    onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`endTime-${day.id}`}>End time</Label>
                                <Input
                                    id={`endTime-${day.id}`}
                                    type="time"
                                    value={form.endTime}
                                    onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor={`graceMinutes-${day.id}`}>Grace period (minutes)</Label>
                            <Input
                                id={`graceMinutes-${day.id}`}
                                type="number"
                                min={0}
                                placeholder="Optional"
                                value={form.graceMinutes}
                                onChange={(e) => setForm((prev) => ({ ...prev, graceMinutes: e.target.value }))}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor={`penaltyLate-${day.id}`}>Late penalty</Label>
                                <Input
                                    id={`penaltyLate-${day.id}`}
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    placeholder="Optional"
                                    value={form.penaltyLateAmount}
                                    onChange={(e) => setForm((prev) => ({ ...prev, penaltyLateAmount: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`penaltyAbsent-${day.id}`}>Absent penalty</Label>
                                <Input
                                    id={`penaltyAbsent-${day.id}`}
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    placeholder="Optional"
                                    value={form.penaltyAbsentAmount}
                                    onChange={(e) =>
                                        setForm((prev) => ({ ...prev, penaltyAbsentAmount: e.target.value }))
                                    }
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setIsCreating(false);
                                    setForm(EMPTY_SESSION_FORM);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createSession.isPending}>
                                {createSession.isPending ? 'Adding…' : 'Add session'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
