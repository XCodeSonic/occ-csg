import { type FormEvent, useState } from 'react';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';

import { CalendarDays, Moon, Plus, Sun, Sunrise, type LucideIcon } from 'lucide-react';

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
import { cn, formatDate } from '@/lib/utils';
import { Text } from '@/presentation/components/typography';
import { Tile } from '@/presentation/components/tile';
import { TONE, type Tone } from '@/presentation/components/tone';

/** Window → icon + hue. Same pairing as the dashboard's streak strip, the
 *  event schedule and the scanner, so a "Morning" row is amber everywhere. */
const WINDOW_STYLE: Record<string, { Icon: LucideIcon; tone: Tone }> = {
    [WindowType.Morning]: { Icon: Sunrise, tone: 'amber' },
    [WindowType.Afternoon]: { Icon: Sun, tone: 'orange' },
    [WindowType.Evening]: { Icon: Moon, tone: 'violet' },
};

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
        <div className="space-y-4 rounded-3xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
                <Tile tone="sky" size="sm" variant="soft" Icon={CalendarDays} />
                <div className="min-w-0">
                    <Text variant="small" className="font-medium text-foreground">
                        Day {day.dayNumber}
                    </Text>
                    <Text variant="caption">{formatDate(day.date)}</Text>
                </div>
            </div>

            {day.sessions.length === 0 && !isCreating && (
                <Text variant="small" className="px-0.5">
                    No sessions yet — add the windows this day runs.
                </Text>
            )}

            <div className="space-y-2">
                {day.sessions.map((session) => {
                    const windowStyle = WINDOW_STYLE[session.windowType] ?? { Icon: Sun, tone: 'neutral' as Tone };
                    const isOngoing = session.status === SessionStatus.Ongoing;

                    return (
                    <div
                        key={session.id}
                        className={cn(
                            'flex items-center justify-between gap-4 rounded-2xl border border-border p-4',
                            // Only the running session is filled and washed.
                            // Everything else on the day stays quiet.
                            isOngoing && TONE.emerald.wash,
                        )}
                    >
                        <div className="flex min-w-0 items-center gap-4">
                            <Tile tone={windowStyle.tone} variant={isOngoing ? 'solid' : 'soft'} Icon={windowStyle.Icon} />
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Text variant="small" className="font-medium text-foreground">
                                        {WINDOW_TYPE_LABEL[session.windowType]} · {CHECK_TYPE_LABEL[session.checkType]}
                                    </Text>
                                    <Badge variant="secondary" className={SESSION_STATUS_BADGE_CLASS[session.status]}>
                                        {session.status}
                                    </Badge>
                                </div>
                                <Text variant="caption">
                                    {session.startTime}–{session.endTime}
                                    {session.graceMinutes ? ` · +${session.graceMinutes}m grace` : ''}
                                </Text>
                            </div>
                        </div>

                        {canManage && session.status === SessionStatus.Scheduled && (
                            <Button
                                size="sm"
                                className="shrink-0"
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
                                className="shrink-0"
                                onClick={() => handleEnd(session.id)}
                                disabled={endSession.isPending}
                            >
                                {endSession.isPending ? 'Ending…' : 'End'}
                            </Button>
                        )}
                    </div>
                    );
                })}
            </div>

            {canManage && availableWindowOptions.length > 0 && (
                <button
                    type="button"
                    onClick={() => setIsCreating(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border p-4 text-small font-medium text-muted-foreground transition-colors hover:border-sky-500/40 hover:text-foreground"
                >
                    <Plus className="size-4" />
                    Add session
                </button>
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
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
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

                        <div className="grid grid-cols-2 gap-4">
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

                        <div className="space-y-2 rounded-2xl border border-border p-4">
                            <Label htmlFor={`graceMinutes-${day.id}`}>Grace period (minutes)</Label>
                            <Text variant="caption">Scans inside this window still count as Present.</Text>
                            <Input
                                id={`graceMinutes-${day.id}`}
                                type="number"
                                min={0}
                                placeholder="Optional"
                                value={form.graceMinutes}
                                onChange={(e) => setForm((prev) => ({ ...prev, graceMinutes: e.target.value }))}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
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
