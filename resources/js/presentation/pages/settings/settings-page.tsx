import { Building2, CalendarDays, CalendarRange, ClipboardList, FileBarChart, Receipt, Users } from 'lucide-react';

import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/application/auth/auth.store';
import { Role } from '@/domain/enums';
import { Heading, Text } from '@/presentation/components/typography';
import { SettingsRow } from '@/presentation/components/settings-row';

const MANAGE_ROLES: Role[] = [Role.SystemAdmin, Role.CsgAdmin, Role.ScAdmin];
const EVENTS_ROLES: Role[] = [Role.SystemAdmin, Role.CsgAdmin];
// Academic years are a CSG-level power (spec §2/§3/§6 tier), not extended
// to SC Admin the way the student roster and reports are.
const ACADEMIC_YEAR_ROLES: Role[] = [Role.SystemAdmin, Role.CsgAdmin];
// Departments (courses) are the same CSG-level tier as academic years —
// DepartmentPolicy::create/update/updateLogo all gate on this same pair.
const DEPARTMENT_ROLES: Role[] = [Role.SystemAdmin, Role.CsgAdmin];
// Penalties are a CSG-level power (spec §2/§7.3), same tier as
// exclusions — AttendancePenaltyPolicy::viewAny gates on this same pair.
const PENALTY_ROLES: Role[] = [Role.SystemAdmin, Role.CsgAdmin];

export function SettingsPage() {
    const student = useAuthStore((state) => state.student);

    if (!student) return null;

    const canManage = MANAGE_ROLES.includes(student.role);
    const canManageEvents = EVENTS_ROLES.includes(student.role);
    const canManageAcademicYears = ACADEMIC_YEAR_ROLES.includes(student.role);
    const canManageDepartments = DEPARTMENT_ROLES.includes(student.role);
    const canManagePenalties = PENALTY_ROLES.includes(student.role);
    // An Officer doesn't get the "manage" tier of Attendance History
    // (that's the org-wide ledger), but they hit the same route and the
    // backend scopes it down to only the records they've personally
    // scanned — see AttendanceSessionPolicy::viewOwnScanHistory.
    const isOfficer = student.role === Role.Officer;

    return (
        <div className="mx-auto max-w-md space-y-8">
            <div>
                <Heading level="h1">Settings</Heading>
            </div>

            {canManage || canManageEvents || canManageAcademicYears || canManageDepartments || canManagePenalties || isOfficer ? (
                <div className="overflow-hidden rounded-lg border border-border">
                    {canManage && (
                        <>
                            <SettingsRow to="/students" icon={<Users className="size-5" />}>
                                Students
                            </SettingsRow>
                            <Separator />
                            <SettingsRow to="/reports" icon={<FileBarChart className="size-5" />}>
                                Reports
                            </SettingsRow>
                            <Separator />
                            {/* Same viewReport gate as the roster/session
                                reports above (System Admin/CSG Admin/SC
                                Admin) — see AttendanceSessionPolicy. */}
                            <SettingsRow to="/attendance-history" icon={<ClipboardList className="size-5" />}>
                                Attendance History
                            </SettingsRow>
                        </>
                    )}
                    {isOfficer && (
                        <>
                            {/* Same route as the admin ledger row above,
                                but an Officer never sees canManage === true,
                                so this is the only "Attendance History" row
                                they get — the backend scopes it to their
                                own scans regardless of label. */}
                            <SettingsRow to="/attendance-history" icon={<ClipboardList className="size-5" />}>
                                My Scan History
                            </SettingsRow>
                        </>
                    )}
                    {canManageEvents && (
                        <>
                            {canManage && <Separator />}
                            <SettingsRow to="/events" icon={<CalendarDays className="size-5" />}>
                                Events
                            </SettingsRow>
                        </>
                    )}
                    {canManageAcademicYears && (
                        <>
                            {(canManage || canManageEvents) && <Separator />}
                            <SettingsRow to="/academic-years" icon={<CalendarRange className="size-5" />}>
                                Academic Years
                            </SettingsRow>
                        </>
                    )}
                    {canManageDepartments && (
                        <>
                            {(canManage || canManageEvents || canManageAcademicYears) && <Separator />}
                            <SettingsRow to="/departments" icon={<Building2 className="size-5" />}>
                                Departments
                            </SettingsRow>
                        </>
                    )}
                    {canManagePenalties && (
                        <>
                            {(canManage || canManageEvents || canManageAcademicYears || canManageDepartments) && (
                                <Separator />
                            )}
                            <SettingsRow to="/penalties" icon={<Receipt className="size-5" />}>
                                Penalties
                            </SettingsRow>
                        </>
                    )}
                </div>
            ) : (
                <Text variant="small">Nothing to manage from here yet.</Text>
            )}
        </div>
    );
}
