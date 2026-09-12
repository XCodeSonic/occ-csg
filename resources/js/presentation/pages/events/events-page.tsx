import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/application/auth/auth.store';
import { useActiveAcademicYear } from '@/application/academic-years/use-academic-years';
import { useSemesters } from '@/application/semesters/use-semesters';
import { useEvents } from '@/application/events/use-events';
import { useCreateEvent } from '@/application/events/use-create-event';
import { EVENT_STATUS_BADGE_CLASS, EVENT_STATUS_LABEL, Role, SEMESTER_LABEL, type Semester as SemesterTerm } from '@/domain/enums';
import { Heading, Text } from '@/presentation/components/typography';

const MANAGE_ROLES: Role[] = [Role.SystemAdmin, Role.CsgAdmin];

interface EventFormValues {
    name: string;
    description: string;
}

const EMPTY_FORM: EventFormValues = { name: '', description: '' };

export function EventsPage() {
    const student = useAuthStore((state) => state.student);
    const { activeAcademicYear, isLoading: isLoadingAcademicYear } = useActiveAcademicYear();
    const { data: semesters, isLoading: isLoadingSemesters } = useSemesters(activeAcademicYear?.id ?? null);
    const { data: events, isLoading: isLoadingEvents } = useEvents();
    const createEvent = useCreateEvent();

    const [isCreating, setIsCreating] = useState(false);
    const [form, setForm] = useState<EventFormValues>(EMPTY_FORM);

    if (!student) return null;

    const canManage = MANAGE_ROLES.includes(student.role);

    function handleCreateSubmit(event: FormEvent) {
        event.preventDefault();
        createEvent.mutate(
            {
                name: form.name,
                description: form.description || null,
            },
            {
                onSuccess: () => {
                    toast.success('Event created.');
                    setForm(EMPTY_FORM);
                    setIsCreating(false);
                },
                onError: () => {
                    toast.error('Could not create event.');
                },
            },
        );
    }

    // Every event is attached to whichever semester is currently active
    // (CreateEvent resolves it server-side — there's no picker here), so
    // there's nothing useful to create until an active academic year with
    // an active semester exists. Guide the admin there instead of showing
    // a form that can only fail.
    const canCreate = canManage && !isLoadingAcademicYear && !isLoadingSemesters;
    const hasActiveYear = !!activeAcademicYear;
    const activeSemester = semesters?.find((semester) => semester.isActive) ?? null;
    const hasActiveSemester = !!activeSemester;

    return (
        <div className="mx-auto max-w-2xl space-y-8">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <Heading level="h1">Events</Heading>
                    <Text variant="small">Every event is scoped to a semester within the active academic year.</Text>
                </div>
                {canManage && !isCreating && hasActiveYear && hasActiveSemester && (
                    <Button onClick={() => setIsCreating(true)} size="sm">
                        Add event
                    </Button>
                )}
            </div>

            {canManage && !isLoadingAcademicYear && !hasActiveYear && (
                <Card>
                    <CardContent className="pt-6">
                        <Text variant="small">
                            There's no active academic year yet. Set one active on the{' '}
                            <Link to="/academic-years" className="underline">
                                Academic Years
                            </Link>{' '}
                            page before creating an event.
                        </Text>
                    </CardContent>
                </Card>
            )}

            {canManage && hasActiveYear && !isLoadingSemesters && !hasActiveSemester && (
                <Card>
                    <CardContent className="pt-6">
                        <Text variant="small">
                            {activeAcademicYear?.name} doesn't have an active semester yet. Activate one on the{' '}
                            <Link to="/academic-years" className="underline">
                                Academic Years
                            </Link>{' '}
                            page before creating an event.
                        </Text>
                    </CardContent>
                </Card>
            )}

            {isCreating && canCreate && (
                <Card>
                    <CardHeader>
                        <Text variant="small">New event</Text>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="eventName">Name</Label>
                                <Input
                                    id="eventName"
                                    placeholder="Freshmen Orientation"
                                    value={form.name}
                                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="eventDescription">Description</Label>
                                <Input
                                    id="eventDescription"
                                    placeholder="Optional"
                                    value={form.description}
                                    onChange={(event) =>
                                        setForm((prev) => ({ ...prev, description: event.target.value }))
                                    }
                                />
                            </div>
                            {activeSemester && (
                                <Text variant="small">
                                    This event will be created under{' '}
                                    <span className="font-medium text-foreground">
                                        {SEMESTER_LABEL[activeSemester.name as SemesterTerm]}
                                    </span>
                                    , the active semester of {activeAcademicYear?.name}.
                                </Text>
                            )}
                            <div className="flex gap-2">
                                <Button type="submit" disabled={createEvent.isPending}>
                                    {createEvent.isPending ? 'Creating…' : 'Create'}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setIsCreating(false);
                                        setForm(EMPTY_FORM);
                                    }}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {isLoadingEvents && <Text variant="small">Loading…</Text>}

            {!isLoadingEvents && events?.length === 0 && <Text variant="small">No events yet.</Text>}

            <div className="space-y-3">
                {events?.map((event) => (
                    <Link key={event.id} to={`/events/${event.id}`} className="block">
                        <Card className="transition-colors hover:bg-accent">
                            <CardContent className="space-y-1 pt-6">
                                <div className="flex items-center gap-2">
                                    <Text className="font-medium">{event.name}</Text>
                                    <Badge variant="secondary" className={EVENT_STATUS_BADGE_CLASS[event.status]}>
                                        {EVENT_STATUS_LABEL[event.status]}
                                    </Badge>
                                    {event.semesterTerm && (
                                        <Badge variant="outline">
                                            {SEMESTER_LABEL[event.semesterTerm as SemesterTerm]}
                                        </Badge>
                                    )}
                                </div>
                                {event.academicYearName && <Text variant="small">{event.academicYearName}</Text>}
                                {event.description && <Text variant="small">{event.description}</Text>}
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            <Separator />
            <Text variant="caption">
                An event's semester (and the academic year it belongs to) is set at creation and can't be changed
                afterward.
            </Text>
        </div>
    );
}
