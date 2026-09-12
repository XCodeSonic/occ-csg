import axios from 'axios';

import { httpClient } from '@/infrastructure/http/client';
import type { AttendanceStatus, ScanOutcome } from '@/domain/enums';
import type { AttendanceSession } from '@/domain/entities';

/**
 * The student as returned by POST /sessions/{session}/scan — a smaller,
 * scan-specific shape (not the full domain Student) since this is only
 * ever used for the officer's face-to-QR cross-check on the scanning
 * screen, not for anything that edits or persists student data.
 */
export interface ScannedStudent {
    id: number;
    studentNumber: string;
    lastName: string;
    firstName: string;
    middleName: string | null;
    suffix: string | null;
    yearLevel: number | null;
    section: string | null;
    departmentCode: string | null;
    departmentName: string | null;
    photoUrl: string | null;
}

export interface ScanResult {
    recordId: number;
    outcome: ScanOutcome;
    /** Present/Late/Absent classification for the session's single check. */
    status: AttendanceStatus;
    scannedAt: string | null;
    student: ScannedStudent;
}

/**
 * Thrown for a rejected scan (malformed/stale QR, session not open,
 * excluded student, etc.) — carries the officer-facing reason straight
 * from the API's `{ message }` error body so the scan screen can show
 * *why* a badge was rejected, not just that it was.
 */
export class ScanError extends Error {}

interface RawScanStudent {
    id: number;
    student_number: string;
    last_name: string;
    first_name: string;
    middle_name: string | null;
    suffix: string | null;
    year_level: number | null;
    section: string | null;
    photo_url: string | null;
    department?: { id: number; name: string; code: string } | null;
}

interface RawScanResponse {
    id: number;
    status: string;
    scanned_at: string | null;
    outcome: string;
    student: RawScanStudent;
}

function toScanResult(raw: RawScanResponse): ScanResult {
    return {
        recordId: raw.id,
        outcome: raw.outcome as ScanOutcome,
        status: raw.status as AttendanceStatus,
        scannedAt: raw.scanned_at,
        student: {
            id: raw.student.id,
            studentNumber: raw.student.student_number,
            lastName: raw.student.last_name,
            firstName: raw.student.first_name,
            middleName: raw.student.middle_name,
            suffix: raw.student.suffix,
            yearLevel: raw.student.year_level,
            section: raw.student.section,
            departmentCode: raw.student.department?.code ?? null,
            departmentName: raw.student.department?.name ?? null,
            photoUrl: raw.student.photo_url,
        },
    };
}

export interface CreateSessionPayload {
    window_type: string;
    check_type: string;
    start_time: string;
    end_time: string;
    grace_minutes?: number | null;
    penalty_late_amount?: number | null;
    penalty_absent_amount?: number | null;
}

interface RawCreatedSession {
    id: number;
    event_day_id: number;
    window_type: string;
    check_type: string;
    start_time: string;
    end_time: string;
    grace_minutes: number;
    penalty_late_amount: string | null;
    penalty_absent_amount: string | null;
    status: string;
}

function toAttendanceSession(raw: RawCreatedSession): AttendanceSession {
    return {
        id: raw.id,
        eventDayId: raw.event_day_id,
        windowType: raw.window_type as AttendanceSession['windowType'],
        checkType: raw.check_type as AttendanceSession['checkType'],
        startTime: raw.start_time,
        endTime: raw.end_time,
        graceMinutes: raw.grace_minutes,
        penaltyLateAmount: Number(raw.penalty_late_amount ?? 0),
        penaltyAbsentAmount: Number(raw.penalty_absent_amount ?? 0),
        status: raw.status as AttendanceSession['status'],
    };
}

export const httpSessionsRepository = {
    // event_day_id is the EventDay this window belongs to — mirrors
    // POST /event-days/{eventDay}/sessions (SessionController::store).
    async createSession(eventDayId: number, payload: CreateSessionPayload): Promise<AttendanceSession> {
        const { data } = await httpClient.post<RawCreatedSession>(`/event-days/${eventDayId}/sessions`, payload);
        return toAttendanceSession(data);
    },

    // Both are manual, human-triggered transitions — no clock-based
    // auto-start/auto-end. A device's clock can run ahead or behind, and
    // shared hosting has no reliable cron/queue worker to poll for it
    // anyway, so a CSG Admin taps the button on the session card instead.
    async startSession(sessionId: number): Promise<AttendanceSession> {
        const { data } = await httpClient.post<RawCreatedSession>(`/sessions/${sessionId}/start`);
        return toAttendanceSession(data);
    },

    async endSession(sessionId: number): Promise<AttendanceSession> {
        const { data } = await httpClient.post<RawCreatedSession>(`/sessions/${sessionId}/end`);
        return toAttendanceSession(data);
    },

    async scan(sessionId: number, token: string): Promise<ScanResult> {
        try {
            const { data } = await httpClient.post<RawScanResponse>(`/sessions/${sessionId}/scan`, { token });
            return toScanResult(data);
        } catch (error) {
            if (axios.isAxiosError(error) && typeof error.response?.data?.message === 'string') {
                throw new ScanError(error.response.data.message);
            }
            throw error;
        }
    },
};
