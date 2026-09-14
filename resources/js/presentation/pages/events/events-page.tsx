import { type FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/application/auth/auth.store';
import { useActiveAcademicYear } from '@/application/academic-years/use-academic-years';
import { useSemesters } from '@/application/semesters/use-semesters';
import { useDepartments } from '@/application/departments/use-departments';
import { useEvents } from '@/application/events/use-events';
import { useCreateEvent } from '@/application/events/use-create-event';
import { EVENT_STATUS_BADGE_CLASS, EVENT_STATUS_LABEL, Role, SEMESTER_LABEL, type Semester as SemesterTerm } from '@/domain/enums';
import { Heading, Text } from '@/presentation/components/typography';

const MANAGE_ROLES: Role[] = [Role.SystemAdmin, Role.CsgAdmin];

interface EventFormValues {
    name: string;
    description: string;
    departmentIds: number[];
}

const EMPTY_FORM: EventFormValues = { name: '', description: '', departmentIds: [] };

export function EventsPage() {
    const student = useAuthStore((state) => state.student);
    const { activeAcademicYear, isLoading: isLoadingAcademicYear } = useActiveAcademicYear();
    const { data: semesters, isLoading: isLoadingSemesters } = useSemesters(activeAcademicYear?.id ?? null);
    const { data: events, isLoading: isLoadingEvents } = useEvents();
    const { data: departments, isLoading: isLoadingDepartments } = useDepartments();
    const createEvent = useCreateEvent();

    const [isCreating, setIsCreating] = useState(false);
    const [form, setForm] = useState<EventFormValues>(EMPTY_FORM);

    // Every checkbox starts checked (spec: an event is open to everyone
    // unless a CSG Admin deliberately narrows it) — reset to "all" each
    // time the department list resolves or the dialog reopens, rather
    // than starting empty and forcing a "select all" click every time.
    useEffect(() => {
        if (isCreating && departments) {
            setForm((prev) => ({ ...prev, departmentIds: departments.map((department) => department.id) }));
        }
        // Only when the dialog opens / the department list first loads —
        // not on every department toggle, which would fight the user's
        // own unchecking.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCreating, departments?.length]);

    if (!student) return null;

    const canManage = MANAGE_ROLES.includes(student.role);

    function resetCreateForm() {
        setIsCreating(false);
        setForm(EMPTY_FORM);
    }

    function toggleDepartment(departmentId: number, checked: boolean) {
        setForm((prev) => ({
            ...prev,
            departmentIds: checked
                ? [...prev.departmentIds, departmentId]
                : prev.departmentIds.filter((id) => id !== departmentId),
        }));
    }

    function handleCreateSubmit(event: FormEvent) {
        event.preventDefault();

        if (form.departmentIds.length === 0) {
            toast.error('Select at least one department.');
            return;
        }

        createEvent.mutate(
            {
                name: form.name,
                description: form.description || null,
                department_ids: form.departmentIds,
            },
            {
                onSuccess: () => {
                    toast.success('Event created.');
                    resetCreateForm();
                },
                onError: (error) => {
                    toast.error(
                        isAxiosError(error) && typeof error.response?.data?.message === 'string'
                            ? error.response.data.message
                            : 'Could not create event.',
                    );
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
    const allDepartmentsSelected = !!departments && form.departmentIds.length === departments.length;

    return (
        <div className="mx-auto max-w-2xl space-y-8">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <Heading level="h1">Events</Heading>
                    <Text variant="small">Every event is scoped to a semester within the active academic year.</Text>
                </div>
                {canManage && hasActiveYear && hasActiveSemester && (
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
                                {departments && event.departments.length < departments.length && (
                                    <div className="flex flex-wrap gap-1 pt-1">
                                        {event.departments.map((department) => (
                                            <Badge key={department.id} variant="outline" className="text-xs">
                                                {department.code}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
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

            <Dialog open={isCreating && canCreate} onOpenChange={(open) => (open ? setIsCreating(true) : resetCreateForm())}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>New event</DialogTitle>
                        {activeSemester && (
                            <DialogDescription>
                                This event will be created under{' '}
                                <span className="font-medium text-foreground">
                                    {SEMESTER_LABEL[activeSemester.name as SemesterTerm]}
                                </span>
                                , the active semester of {activeAcademicYear?.name}.
                            </DialogDescription>
                        )}
                    </DialogHeader>
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
                                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Departments</Label>
                                <button
                                    type="button"
                                    className="text-xs text-muted-foreground underline underline-offset-2"
                                    onClick={() =>
                                        setForm((prev) => ({
                                            ...prev,
                                            departmentIds: allDepartmentsSelected ? [] : (departments ?? []).map((d) => d.id),
                                        }))
                                    }
                                >
                                    {allDepartmentsSelected ? 'Clear all' : 'Select all'}
                                </button>
                            </div>
                            <Text variant="caption">
                                Every department is included by default. Uncheck any that shouldn't be part of this
                                event — e.g. an intramural just for BSIT and BEd.
                            </Text>
                            {isLoadingDepartments && <Text variant="small">Loading departments…</Text>}
                            <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border border-border p-3">
                                {departments?.map((department) => (
                                    <label
                                        key={department.id}
                                        className="flex cursor-pointer items-center gap-2 text-sm"
                                    >
                                        <Checkbox
                                            checked={form.departmentIds.includes(department.id)}
                                            onCheckedChange={(checked) => toggleDepartment(department.id, checked === true)}
                                        />
                                        <span>
                                            {department.name} <span className="text-muted-foreground">({department.code})</span>
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={resetCreateForm}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createEvent.isPending}>
                                {createEvent.isPending ? 'Creating…' : 'Create'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
