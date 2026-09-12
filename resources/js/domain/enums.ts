export const Role = {
    SystemAdmin: 'system_admin',
    CsgAdmin: 'csg_admin',
    ScAdmin: 'sc_admin',
    Officer: 'officer',
    Student: 'student',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const WindowType = {
    Morning: 'morning',
    Afternoon: 'afternoon',
    Evening: 'evening',
} as const;
export type WindowType = (typeof WindowType)[keyof typeof WindowType];

/** Which half of a window a session covers — each session is one check only. */
export const CheckType = {
    TimeIn: 'time_in',
    TimeOut: 'time_out',
} as const;
export type CheckType = (typeof CheckType)[keyof typeof CheckType];

export const SessionStatus = {
    Scheduled: 'scheduled',
    Ongoing: 'ongoing',
    Ended: 'ended',
} as const;
export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];

/**
 * An event's own lifecycle — separate from any individual session's
 * status. Ending one session (e.g. Day 1 Morning) never ends the event;
 * only an explicit "End Event" action does, and that cascades to force-end
 * every still-ongoing session under it. Mirrors backend
 * App\Domain\Enums\EventStatus.
 */
export const EventStatus = {
    Ongoing: 'ongoing',
    Ended: 'ended',
} as const;
export type EventStatus = (typeof EventStatus)[keyof typeof EventStatus];

export const AttendanceStatus = {
    Present: 'present',
    Late: 'late',
    Absent: 'absent',
    Excluded: 'excluded',
    Pending: 'pending',
} as const;
export type AttendanceStatus = (typeof AttendanceStatus)[keyof typeof AttendanceStatus];

/**
 * What a scan actually did — mirrors backend App\Domain\Enums\ScanOutcome.
 * The scan endpoint is idempotent (see ScanAttendance), so a "duplicate"
 * result is a normal 200, not an error; the scanning UI uses this to tell
 * a fresh check-in apart from someone's badge being read twice.
 */
export const ScanOutcome = {
    Recorded: 'recorded',
    Duplicate: 'duplicate',
} as const;
export type ScanOutcome = (typeof ScanOutcome)[keyof typeof ScanOutcome];

export const ExclusionScope = {
    Event: 'event',
    WindowType: 'window_type',
    Session: 'session',
} as const;
export type ExclusionScope = (typeof ExclusionScope)[keyof typeof ExclusionScope];

/** A term within an AcademicYear — every academic year has exactly these three. */
export const Semester = {
    First: 'semester_1',
    Second: 'semester_2',
    Summer: 'summer',
} as const;
export type Semester = (typeof Semester)[keyof typeof Semester];

/** Role → label shown in the UI. Keep this the single place role copy lives. */
export const ROLE_LABEL: Record<Role, string> = {
    [Role.SystemAdmin]: 'System Admin',
    [Role.CsgAdmin]: 'CSG Admin',
    [Role.ScAdmin]: 'SC Admin',
    [Role.Officer]: 'Officer',
    [Role.Student]: 'Student',
};

/** WindowType → label shown in the UI (event/session forms, scan screen). */
export const WINDOW_TYPE_LABEL: Record<WindowType, string> = {
    [WindowType.Morning]: 'Morning',
    [WindowType.Afternoon]: 'Afternoon',
    [WindowType.Evening]: 'Evening',
};

/** CheckType → label shown in the UI (session forms, scan screen, reports). */
export const CHECK_TYPE_LABEL: Record<CheckType, string> = {
    [CheckType.TimeIn]: 'Time In',
    [CheckType.TimeOut]: 'Time Out',
};

/** Semester → label shown in the UI. */
export const SEMESTER_LABEL: Record<Semester, string> = {
    [Semester.First]: 'Semester 1',
    [Semester.Second]: 'Semester 2',
    [Semester.Summer]: 'Summer',
};

/** Attendance status → badge variant, kept in one place so every list/report matches. */
export const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus, string> = {
    [AttendanceStatus.Present]: 'Present',
    [AttendanceStatus.Late]: 'Late',
    [AttendanceStatus.Absent]: 'Absent',
    [AttendanceStatus.Excluded]: 'Excluded',
    [AttendanceStatus.Pending]: 'Pending',
};

/**
 * SessionStatus → badge color classes (pass to Badge's className, on top of
 * variant="secondary"). Ongoing is emerald (currently happening), ended is
 * neutral gray (done, nothing to act on), scheduled is amber ("opening
 * soon" — hasn't started yet).
 */
export const SESSION_STATUS_BADGE_CLASS: Record<SessionStatus, string> = {
    [SessionStatus.Scheduled]: 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    [SessionStatus.Ongoing]: 'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    [SessionStatus.Ended]: 'border-transparent bg-gray-100 text-gray-700 dark:bg-gray-800/60 dark:text-gray-300',
};

/**
 * EventStatus → label shown in the UI (event detail header, events list).
 */
export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
    [EventStatus.Ongoing]: 'Ongoing',
    [EventStatus.Ended]: 'Ended',
};

/**
 * EventStatus → badge color classes, same palette convention as
 * SESSION_STATUS_BADGE_CLASS: ongoing is emerald, ended is neutral gray.
 */
export const EVENT_STATUS_BADGE_CLASS: Record<EventStatus, string> = {
    [EventStatus.Ongoing]: 'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    [EventStatus.Ended]: 'border-transparent bg-gray-100 text-gray-700 dark:bg-gray-800/60 dark:text-gray-300',
};

/**
 * AttendanceStatus → badge color classes (pass to Badge's className, on top
 * of variant="secondary"). Present is emerald, late is amber, absent is
 * red, excluded/pending stay neutral gray.
 */
export const ATTENDANCE_STATUS_BADGE_CLASS: Record<AttendanceStatus, string> = {
    [AttendanceStatus.Present]: 'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    [AttendanceStatus.Late]: 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    [AttendanceStatus.Absent]: 'border-transparent bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    [AttendanceStatus.Excluded]: 'border-transparent bg-gray-100 text-gray-700 dark:bg-gray-800/60 dark:text-gray-300',
    [AttendanceStatus.Pending]: 'border-transparent bg-gray-100 text-gray-700 dark:bg-gray-800/60 dark:text-gray-300',
};
