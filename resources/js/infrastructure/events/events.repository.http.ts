import { httpClient } from '@/infrastructure/http/client';
import type { AttendanceStatus, CheckType, EventStatus, SessionStatus, WindowType } from '@/domain/enums';
import type { EventDepartment, EventWithDays } from '@/domain/entities';

export interface CreateEventPayload {
    name: string;
    description?: string | null;
    /** At least one required — see backend StoreEventRequest. */
    department_ids: number[];
}

export interface CreateEventDayPayload {
    date: string;
    day_number: number;
}

interface RawSession {
    id: number;
    event_day_id: number;
    window_type: string;
    check_type: string;
    start_time: string;
    end_time: string;
    grace_minutes: number;
    // AttendanceSession casts these 'decimal:2' — Eloquent serializes
    // decimal casts as strings (e.g. "150.00"), not numbers.
    penalty_late_amount: string | null;
    penalty_absent_amount: string | null;
    status: string;
}

interface RawDay {
    id: number;
    event_id: number;
    date: string;
    day_number: number;
    sessions?: RawSession[];
}

interface RawEvent {
    id: number;
    name: string;
    description: string | null;
    created_by: number;
    // EventModel::$fillable has semester_id; academic_year_id is a
    // read-only accessor derived from semester.academicYear, not a real
    // column — kept here only for display, not sent on create.
    semester_id: number | null;
    status: string;
    // Present when the controller eager-loads 'semester.academicYear'
    // (index()) — absent from responses that don't need it.
    semester?: {
        id: number;
        name: string;
        academic_year?: { id: number; name: string } | null;
    } | null;
    days?: RawDay[];
    // Present when the controller eager-loads 'departments' (index()) —
    // absent departments means "not requested", NOT "no restriction";
    // toEvent() below always normalizes to [] either way.
    departments?: Array<{ id: number; name: string; code: string }>;
}

function toEvent(raw: RawEvent): EventWithDays {
    return {
        id: raw.id,
        name: raw.name,
        description: raw.description,
        createdBy: raw.created_by,
        semesterId: raw.semester_id,
        status: raw.status as EventStatus,
        semesterTerm: raw.semester?.name ?? null,
        academicYearName: raw.semester?.academic_year?.name ?? null,
        departments: (raw.departments ?? []).map(
            (department): EventDepartment => ({
                id: department.id,
                name: department.name,
                code: department.code,
            }),
        ),
        days: (raw.days ?? []).map((day) => ({
            id: day.id,
            eventId: day.event_id,
            date: day.date,
            dayNumber: day.day_number,
            sessions: (day.sessions ?? []).map((session) => ({
                id: session.id,
                eventDayId: session.event_day_id,
                windowType: session.window_type as EventWithDays['days'][number]['sessions'][number]['windowType'],
                checkType: session.check_type as EventWithDays['days'][number]['sessions'][number]['checkType'],
                startTime: session.start_time,
                endTime: session.end_time,
                graceMinutes: session.grace_minutes,
                penaltyLateAmount: Number(session.penalty_late_amount ?? 0),
                penaltyAbsentAmount: Number(session.penalty_absent_amount ?? 0),
                status: session.status as EventWithDays['days'][number]['sessions'][number]['status'],
            })),
        })),
    };
}

export interface MyAttendanceSession {
    id: number;
    windowType: WindowType;
    checkType: CheckType;
    startTime: string;
    endTime: string;
    /** The session's own lifecycle: scheduled / ongoing / ended. */
    sessionStatus: SessionStatus;
    /**
     * This caller's outcome for the session — present/late/absent/excluded,
     * or null while it's still pending (not yet scanned, session not
     * ended). Never guessed at Absent client-side; null just means "no
     * verdict yet".
     */
    attendanceStatus: AttendanceStatus | null;
    scannedAt: string | null;
}

export interface MyAttendanceDay {
    id: number;
    date: string;
    dayNumber: number;
    sessions: MyAttendanceSession[];
}

export interface MyEventAttendance {
    eventId: number;
    eventName: string;
    /** The event's own lifecycle — see EventEntity.status. */
    eventStatus: EventStatus;
    days: MyAttendanceDay[];
}

interface RawMyAttendanceSession {
    id: number;
    window_type: string;
    check_type: string;
    start_time: string;
    end_time: string;
    session_status: string;
    attendance_status: string | null;
    scanned_at: string | null;
}

interface RawMyAttendanceDay {
    id: number;
    date: string;
    day_number: number;
    sessions: RawMyAttendanceSession[];
}

interface RawMyEventAttendance {
    event_id: number;
    event_name: string;
    event_status: string;
    days: RawMyAttendanceDay[];
}

function toMyEventAttendance(raw: RawMyEventAttendance): MyEventAttendance {
    return {
        eventId: raw.event_id,
        eventName: raw.event_name,
        eventStatus: raw.event_status as EventStatus,
        days: raw.days.map((day) => ({
            id: day.id,
            date: day.date,
            dayNumber: day.day_number,
           sessions: day.sessions.map((session) => ({
                id: session.id,
                windowType: session.window_type as WindowType,
                checkType: session.check_type as CheckType,
                startTime: session.start_time,
                endTime: session.end_time,
                sessionStatus: session.session_status as SessionStatus,
                attendanceStatus: session.attendance_status as AttendanceStatus | null,
                scannedAt: session.scanned_at,
            })),
        })),
    };
}

export interface MyAttendanceHistoryEntry {
    eventId: number;
    eventName: string;
    eventStatus: EventStatus;
    dayId: number;
    dayNumber: number;
    date: string;
    sessionId: number;
    windowType: WindowType;
    checkType: CheckType;
    startTime: string;
    endTime: string;
    sessionStatus: SessionStatus;
    attendanceStatus: AttendanceStatus | null;
    scannedAt: string | null;
}

interface RawMyAttendanceHistoryEntry {
    event_id: number;
    event_name: string;
    event_status: string;
    day_id: number;
    day_number: number;
    date: string;
    session_id: number;
    window_type: string;
    check_type: string;
    start_time: string;
    end_time: string;
    session_status: string;
    attendance_status: string | null;
    scanned_at: string | null;
}

function toMyAttendanceHistoryEntry(raw: RawMyAttendanceHistoryEntry): MyAttendanceHistoryEntry {
    return {
        eventId: raw.event_id,
        eventName: raw.event_name,
        eventStatus: raw.event_status as EventStatus,
        dayId: raw.day_id,
        dayNumber: raw.day_number,
        date: raw.date,
        sessionId: raw.session_id,
        windowType: raw.window_type as WindowType,
        checkType: raw.check_type as CheckType,
        startTime: raw.start_time,
        endTime: raw.end_time,
        sessionStatus: raw.session_status as SessionStatus,
        attendanceStatus: raw.attendance_status as AttendanceStatus | null,
        scannedAt: raw.scanned_at,
    };
}

export interface EndEventResult {
    eventId: number;
    sessionsEnded: number;
    status: EventStatus;
}

interface RawEndEventResult {
    event_id: number;
    sessions_ended: number;
    status: string;
}

export const httpEventsRepository = {
    async list(): Promise<EventWithDays[]> {
        const { data } = await httpClient.get<RawEvent[]>('/events');
        return data.map(toEvent);
    },

    // Ends the event and cascades to force-end every still-ongoing
    // session under it — see backend App\Application\Actions\Events\EndEvent.
    async end(eventId: number): Promise<EndEventResult> {
        const { data } = await httpClient.post<RawEndEventResult>(`/events/${eventId}/end`);
        return {
            eventId: data.event_id,
            sessionsEnded: data.sessions_ended,
            status: data.status as EventStatus,
        };
    },

    // Always the caller's own attendance (backend keys it off the
    // authenticated user, not a student id param) — see
    // EventMyAttendanceController.
    async myAttendance(eventId: number): Promise<MyEventAttendance> {
        const { data } = await httpClient.get<RawMyEventAttendance>(`/events/${eventId}/my-attendance`);
        return toMyEventAttendance(data);
    },

    // Flattened across every event — the caller's own history, newest
    // event first. Filtering (by event / status) happens client-side in
    // the account settings page rather than as query params, since one
    // student's whole history is a small dataset.
    async myAttendanceHistory(): Promise<MyAttendanceHistoryEntry[]> {
        const { data } = await httpClient.get<{ entries: RawMyAttendanceHistoryEntry[] }>('/my-attendance-history');
        return data.entries.map(toMyAttendanceHistoryEntry);
    },

    async create(payload: CreateEventPayload): Promise<EventWithDays> {
        const { data } = await httpClient.post<RawEvent>('/events', payload);
        return toEvent(data);
    },

    // Response is the bare EventDay row (no nested sessions yet) — callers
    // just invalidate the events list to get the merged tree back rather
    // than trying to splice this into cache by hand.
    async createDay(eventId: number, payload: CreateEventDayPayload): Promise<void> {
        await httpClient.post(`/events/${eventId}/days`, payload);
    },
};
