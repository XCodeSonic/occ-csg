import { type ChangeEvent, type FormEvent, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/application/auth/auth.store';
import { useDepartments } from '@/application/departments/use-departments';
import { useStudents } from '@/application/students/use-students';
import { useCreateStudent } from '@/application/students/use-create-student';
import { useBulkImportStudents } from '@/application/students/use-bulk-import-students';
import { usePreviewBulkImportStudents } from '@/application/students/use-preview-bulk-import-students';
import { useDownloadBulkImportTemplate } from '@/application/students/use-download-bulk-import-template';
import { useUpdateStudentRole } from '@/application/students/use-update-student-role';
import { useEvents } from '@/application/events/use-events';
import type { BulkImportPreview, BulkImportReport } from '@/application/students/students.repository';
import type { Student } from '@/domain/entities';
import { Role, ROLE_LABEL } from '@/domain/enums';
import { Heading, Text } from '@/presentation/components/typography';

// System Admin can promote up to csg_admin; CSG Admin cannot reach that
// high. Mirrors StudentPolicy::assignRole's $assignable sets exactly.
const ASSIGNABLE_ROLES: Record<string, Role[]> = {
    [Role.SystemAdmin]: [Role.CsgAdmin, Role.ScAdmin, Role.Officer, Role.Student],
    [Role.CsgAdmin]: [Role.ScAdmin, Role.Officer, Role.Student],
};

const PER_PAGE = 25;

interface CreateFormValues {
    studentNumber: string;
    lastName: string;
    firstName: string;
    middleName: string;
    suffix: string;
    departmentId: string;
    yearLevel: string;
    section: string;
}

const EMPTY_CREATE_FORM: CreateFormValues = {
    studentNumber: '',
    lastName: '',
    firstName: '',
    middleName: '',
    suffix: '',
    departmentId: '',
    yearLevel: '',
    section: '',
};

export function StudentsPage() {
    const student = useAuthStore((state) => state.student);
    const { data: departments } = useDepartments();
    const { data: events } = useEvents();

    const [search, setSearch] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState<string>('all');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [page, setPage] = useState(1);

    const isScAdmin = student?.role === Role.ScAdmin;
    const canFilterDepartment = student?.role === Role.SystemAdmin || student?.role === Role.CsgAdmin;

    const { data: rosterPage, isLoading } = useStudents({
        search: search || undefined,
        departmentId:
            canFilterDepartment && departmentFilter !== 'all' ? Number(departmentFilter) : undefined,
        role: roleFilter !== 'all' ? (roleFilter as Role) : undefined,
        page,
        perPage: PER_PAGE,
    });

    const [isAdding, setIsAdding] = useState(false);
    const [createForm, setCreateForm] = useState<CreateFormValues>(EMPTY_CREATE_FORM);
    const createStudent = useCreateStudent();

    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
    const [importReport, setImportReport] = useState<BulkImportReport | null>(null);
    const [preview, setPreview] = useState<BulkImportPreview | null>(null);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const previewBulkImportStudents = usePreviewBulkImportStudents();
    const bulkImportStudents = useBulkImportStudents();
    const { download: downloadTemplate, isDownloading } = useDownloadBulkImportTemplate();

    const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
    const [roleForm, setRoleForm] = useState<{ role: Role; departmentId: string; eventId: string }>({
        role: Role.Student,
        departmentId: '',
        eventId: '',
    });
    const updateStudentRole = useUpdateStudentRole();

    if (!student) return null;

    const assignableRoles = ASSIGNABLE_ROLES[student.role] ?? [];
    const canAssignRoles = assignableRoles.length > 0;
    const departmentName = (id: number) => departments?.find((d) => d.id === id)?.code ?? '—';

    function resetCreateForm() {
        setCreateForm(EMPTY_CREATE_FORM);
        setIsAdding(false);
    }

    function handleCreateSubmit(event: FormEvent) {
        event.preventDefault();

        if (!isScAdmin && !createForm.departmentId) {
            toast.error('Select a department.');
            return;
        }

        createStudent.mutate(
            {
                studentNumber: createForm.studentNumber,
                lastName: createForm.lastName,
                firstName: createForm.firstName,
                middleName: createForm.middleName,
                suffix: createForm.suffix || null,
                // SC Admin's own department is enforced server-side regardless
                // of what's sent, but we still need a real value here — the
                // field is hidden for them, so fall back to the one they
                // administer rather than sending an empty department_id.
                departmentId: isScAdmin ? (student.scAdminDepartmentId ?? 0) : Number(createForm.departmentId),
                yearLevel: createForm.yearLevel,
                section: createForm.section || null,
            },
            {
                onSuccess: () => {
                    toast.success('Student added.');
                    resetCreateForm();
                },
                onError: () => {
                    toast.error('Could not add student. Check the ID is not already in use.');
                },
            },
        );
    }

    function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        setImportReport(null);

        previewBulkImportStudents.mutate(file, {
            onSuccess: (result) => {
                setPreview(result);
                setPendingFile(file);
            },
            onError: () => {
                toast.error('Could not read the file. Check the format and try again.');
            },
        });
    }

    function handleConfirmImport() {
        if (!pendingFile) return;

        bulkImportStudents.mutate(pendingFile, {
            onSuccess: (report) => {
                setImportReport(report);
                setPreview(null);
                setPendingFile(null);
                if (report.failed === 0) {
                    toast.success(`Imported ${report.imported} of ${report.totalRows} students.`);
                } else {
                    toast.warning(`Imported ${report.imported} of ${report.totalRows} students — ${report.failed} failed.`);
                }
            },
            onError: () => {
                toast.error('Could not import the file.');
            },
        });
    }

    function handleCancelImport() {
        setPreview(null);
        setPendingFile(null);
    }

    function startEditingRole(row: Student) {
        setEditingRoleId(row.id);
        setRoleForm({
            role: row.role,
            departmentId: row.scAdminDepartmentId ? String(row.scAdminDepartmentId) : '',
            eventId: row.officerEventId ? String(row.officerEventId) : '',
        });
    }

    function handleRoleSubmit(event: FormEvent, row: Student) {
        event.preventDefault();

        if (roleForm.role === Role.ScAdmin && !roleForm.departmentId) {
            toast.error('Select the department they will administer.');
            return;
        }

        updateStudentRole.mutate(
            {
                studentId: row.id,
                payload: {
                    role: roleForm.role,
                    departmentId: roleForm.role === Role.ScAdmin ? Number(roleForm.departmentId) : null,
                    eventId: roleForm.role === Role.Officer && roleForm.eventId ? Number(roleForm.eventId) : null,
                },
            },
            {
                onSuccess: () => {
                    toast.success('Role updated.');
                    setEditingRoleId(null);
                },
                onError: () => {
                    toast.error('Could not update role.');
                },
            },
        );
    }

    return (
        <div className="mx-auto max-w-3xl space-y-8">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <Heading level="h1">Students</Heading>
                    <Text variant="small">
                        {isScAdmin ? 'Your department\u2019s roster.' : 'The full student roster across every department.'}
                    </Text>
                </div>
                <div className="flex shrink-0 gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsBulkImportOpen(true)}>
                        Bulk import
                    </Button>
                    <Button size="sm" onClick={() => setIsAdding(true)}>
                        Add student
                    </Button>
                </div>
            </div>

            <Dialog open={isAdding} onOpenChange={(open) => (open ? setIsAdding(true) : resetCreateForm())}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>New student</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="studentNumber">Student ID</Label>
                                <Input
                                    id="studentNumber"
                                    value={createForm.studentNumber}
                                    onChange={(e) => setCreateForm((f) => ({ ...f, studentNumber: e.target.value }))}
                                    required
                                />
                            </div>
                            {!isScAdmin && (
                                <div className="space-y-2">
                                    <Label htmlFor="department">Department</Label>
                                    <Select
                                        value={createForm.departmentId}
                                        onValueChange={(value) => setCreateForm((f) => ({ ...f, departmentId: value }))}
                                    >
                                        <SelectTrigger id="department" className="w-full">
                                            <SelectValue placeholder="Select department" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {departments?.map((dept) => (
                                                <SelectItem key={dept.id} value={String(dept.id)}>
                                                    {dept.code} — {dept.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="lastName">Last name</Label>
                                <Input
                                    id="lastName"
                                    value={createForm.lastName}
                                    onChange={(e) => setCreateForm((f) => ({ ...f, lastName: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="firstName">First name</Label>
                                <Input
                                    id="firstName"
                                    value={createForm.firstName}
                                    onChange={(e) => setCreateForm((f) => ({ ...f, firstName: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="middleName">Middle name</Label>
                                <Input
                                    id="middleName"
                                    value={createForm.middleName}
                                    onChange={(e) => setCreateForm((f) => ({ ...f, middleName: e.target.value }))}
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="suffix">Suffix</Label>
                                <Input
                                    id="suffix"
                                    placeholder="Jr., III, etc."
                                    value={createForm.suffix}
                                    onChange={(e) => setCreateForm((f) => ({ ...f, suffix: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="yearLevel">Year level</Label>
                                <Input
                                    id="yearLevel"
                                    placeholder="1"
                                    value={createForm.yearLevel}
                                    onChange={(e) => setCreateForm((f) => ({ ...f, yearLevel: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="section">Section</Label>
                                <Input
                                    id="section"
                                    placeholder="A"
                                    value={createForm.section}
                                    onChange={(e) => setCreateForm((f) => ({ ...f, section: e.target.value }))}
                                />
                            </div>
                        </div>
                        <Text variant="caption">
                            Default password is <span className="font-medium">password123</span> — the student must change
                            it on first login.
                        </Text>
                        <div className="flex gap-2">
                            <Button type="submit" disabled={createStudent.isPending}>
                                {createStudent.isPending ? 'Adding…' : 'Add student'}
                            </Button>
                            <Button type="button" variant="outline" onClick={resetCreateForm}>
                                Cancel
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isBulkImportOpen} onOpenChange={setIsBulkImportOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Bulk import</DialogTitle>
                        <DialogDescription>
                            Upload an Excel/CSV file (max 1,000 rows per file — split larger rosters into batches). You'll
                            see a full preview before anything is saved.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={downloadTemplate} disabled={isDownloading}>
                                {isDownloading ? 'Downloading…' : 'Download template'}
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={previewBulkImportStudents.isPending || !!preview}
                            >
                                {previewBulkImportStudents.isPending ? 'Reading file…' : 'Choose file'}
                            </Button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </div>

                        {preview && (
                            <div className="space-y-3 rounded-md border border-border p-3">
                                <Text variant="small" className="font-medium">
                                    Preview — nothing has been saved yet
                                </Text>
                                <Text variant="small">
                                    {preview.valid} of {preview.totalRows} rows are ready to import
                                    {preview.invalid > 0 ? `; ${preview.invalid} have errors and will be skipped` : ''}.
                                </Text>

                                {preview.invalid > 0 && (
                                    <div className="space-y-1">
                                        <Text variant="caption" className="font-medium">
                                            Rows with errors
                                        </Text>
                                        <ul className="max-h-56 space-y-1 overflow-y-auto">
                                            {preview.rows
                                                .filter((row) => !row.valid)
                                                .map((row) => (
                                                    <li key={row.row}>
                                                        <Text variant="caption">
                                                            Row {row.row}
                                                            {row.studentNumber ? ` (${row.studentNumber})` : ''}:{' '}
                                                            {row.reasons.join('; ')}
                                                        </Text>
                                                    </li>
                                                ))}
                                        </ul>
                                    </div>
                                )}

                                {preview.valid > 0 && (
                                    <div className="space-y-1">
                                        <Text variant="caption" className="font-medium">
                                            Ready to import (first 20 shown)
                                        </Text>
                                        <ul className="max-h-56 space-y-1 overflow-y-auto">
                                            {preview.rows
                                                .filter((row) => row.valid)
                                                .slice(0, 20)
                                                .map((row) => (
                                                    <li key={row.row}>
                                                        <Text variant="caption">
                                                            {row.studentNumber} — {row.lastName}, {row.firstName} (
                                                            {row.departmentCode} · Yr {row.yearLevel}
                                                            {row.section ? ` · ${row.section}` : ''})
                                                        </Text>
                                                    </li>
                                                ))}
                                        </ul>
                                        {preview.valid > 20 && (
                                            <Text variant="caption">and {preview.valid - 20} more…</Text>
                                        )}
                                    </div>
                                )}

                                <div className="flex gap-2 pt-1">
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={handleConfirmImport}
                                        disabled={preview.valid === 0 || bulkImportStudents.isPending}
                                    >
                                        {bulkImportStudents.isPending
                                            ? 'Importing…'
                                            : `Confirm — import ${preview.valid} student${preview.valid === 1 ? '' : 's'}`}
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={handleCancelImport}
                                        disabled={bulkImportStudents.isPending}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        )}

                        {importReport && (
                            <div className="space-y-2 rounded-md border border-border p-3">
                                <Text variant="small">
                                    {importReport.imported} of {importReport.totalRows} rows imported
                                    {importReport.failed > 0 ? `, ${importReport.failed} failed` : ''}.
                                </Text>
                                {importReport.errors.length > 0 && (
                                    <ul className="space-y-1">
                                        {importReport.errors.map((error) => (
                                            <li key={error.row}>
                                                <Text variant="caption">
                                                    Row {error.row}
                                                    {error.studentNumber ? ` (${error.studentNumber})` : ''}:{' '}
                                                    {error.reasons.join('; ')}
                                                </Text>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                    <Input
                        placeholder="Search by ID or name…"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        className="max-w-56"
                    />
                    {canFilterDepartment && (
                        <Select
                            value={departmentFilter}
                            onValueChange={(value) => {
                                setDepartmentFilter(value);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-40">
                                <SelectValue placeholder="Department" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All departments</SelectItem>
                                {departments?.map((dept) => (
                                    <SelectItem key={dept.id} value={String(dept.id)}>
                                        {dept.code}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    <Select
                        value={roleFilter}
                        onValueChange={(value) => {
                            setRoleFilter(value);
                            setPage(1);
                        }}
                    >
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All roles</SelectItem>
                            {Object.values(Role).map((role) => (
                                <SelectItem key={role} value={role}>
                                    {ROLE_LABEL[role]}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {isLoading && <Text variant="small">Loading…</Text>}
                {!isLoading && rosterPage?.data.length === 0 && <Text variant="small">No students match these filters.</Text>}

                {rosterPage?.data.map((row) => (
                    <Card key={row.id}>
                        {editingRoleId === row.id ? (
                            <CardContent className="pt-6">
                                <form onSubmit={(e) => handleRoleSubmit(e, row)} className="space-y-4">
                                    <Text variant="small" className="font-medium">
                                        {row.lastName}, {row.firstName} — change role
                                    </Text>
                                    <div className="space-y-2">
                                        <Label htmlFor={`role-${row.id}`}>Role</Label>
                                        <Select
                                            value={roleForm.role}
                                            onValueChange={(value) => setRoleForm((f) => ({ ...f, role: value as Role }))}
                                        >
                                            <SelectTrigger id={`role-${row.id}`} className="w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {[...assignableRoles, Role.Student]
                                                    .filter((role, index, all) => all.indexOf(role) === index)
                                                    .map((role) => (
                                                        <SelectItem key={role} value={role}>
                                                            {ROLE_LABEL[role]}
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {roleForm.role === Role.ScAdmin && (
                                        <div className="space-y-2">
                                            <Label htmlFor={`sc-dept-${row.id}`}>Department administered</Label>
                                            <Select
                                                value={roleForm.departmentId}
                                                onValueChange={(value) => setRoleForm((f) => ({ ...f, departmentId: value }))}
                                            >
                                                <SelectTrigger id={`sc-dept-${row.id}`} className="w-full">
                                                    <SelectValue placeholder="Select department" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {departments?.map((dept) => (
                                                        <SelectItem key={dept.id} value={String(dept.id)}>
                                                            {dept.code} — {dept.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                    {roleForm.role === Role.Officer && (
                                        <div className="space-y-2">
                                            <Label htmlFor={`officer-event-${row.id}`}>Event (optional)</Label>
                                            <Select
                                                value={roleForm.eventId || 'none'}
                                                onValueChange={(value) =>
                                                    setRoleForm((f) => ({ ...f, eventId: value === 'none' ? '' : value }))
                                                }
                                            >
                                                <SelectTrigger id={`officer-event-${row.id}`} className="w-full">
                                                    <SelectValue placeholder="Not scoped to an event" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">Not scoped to an event</SelectItem>
                                                    {events?.map((evt) => (
                                                        <SelectItem key={evt.id} value={String(evt.id)}>
                                                            {evt.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                    <div className="flex gap-2">
                                        <Button type="submit" size="sm" disabled={updateStudentRole.isPending}>
                                            {updateStudentRole.isPending ? 'Saving…' : 'Save'}
                                        </Button>
                                        <Button type="button" size="sm" variant="outline" onClick={() => setEditingRoleId(null)}>
                                            Cancel
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        ) : (
                            <CardContent className="flex items-center justify-between gap-4 pt-6">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Text className="font-medium">
                                            {row.lastName}, {row.firstName} {row.middleName ?? ''}
                                        </Text>
                                        {row.role !== Role.Student && (
                                            <Badge variant="secondary">{ROLE_LABEL[row.role]}</Badge>
                                        )}
                                    </div>
                                    <Text variant="small">
                                        {row.studentNumber} · {departmentName(row.departmentId)}
                                        {row.yearLevel ? ` · Yr ${row.yearLevel}` : ''}
                                        {row.section ? ` · ${row.section}` : ''}
                                    </Text>
                                </div>
                                {canAssignRoles && (
                                    <Button size="sm" variant="outline" onClick={() => startEditingRole(row)}>
                                        Change role
                                    </Button>
                                )}
                            </CardContent>
                        )}
                    </Card>
                ))}

                {rosterPage && rosterPage.lastPage > 1 && (
                    <div className="flex items-center justify-between pt-2">
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={page <= 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                            Previous
                        </Button>
                        <Text variant="caption">
                            Page {rosterPage.currentPage} of {rosterPage.lastPage} — {rosterPage.total} students
                        </Text>
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={page >= rosterPage.lastPage}
                            onClick={() => setPage((p) => p + 1)}
                        >
                            Next
                        </Button>
                    </div>
                )}
            </div>

            <Separator />
            <Text variant="caption">
                Every account is a student record — promoting someone to SC Admin or Officer here is what grants them
                that role's extra powers, without creating a separate account.
            </Text>
        </div>
    );
}
