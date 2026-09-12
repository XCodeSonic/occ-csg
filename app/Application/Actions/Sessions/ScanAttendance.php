<?php

namespace App\Application\Actions\Sessions;

use App\Domain\Enums\SessionStatus;
use App\Domain\Exceptions\SessionNotAcceptingScansException;
use App\Domain\Exceptions\StaleQrCodeException;
use App\Domain\Exceptions\StudentExcludedException;
use App\Domain\Exceptions\StudentNotEligibleForAttendanceException;
use App\Domain\ValueObjects\QrPayload;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\Exclusion;
use App\Models\Student;
use Carbon\Carbon;

final class ScanAttendance
{
    /**
     * Scan a student's QR token against a session.
     *
     * Each session now represents exactly one check (time-in or time-out
     * — see App\Domain\Enums\CheckType), so this action doesn't branch on
     * scan order at all: the first scan for this session+student creates
     * the record, classified Present/Late against the session's own
     * window. Any scan after that is a duplicate and is a no-op — it
     * returns the existing record untouched rather than throwing, so a
     * nervous re-scan at the gate can never double-write or
     * double-penalize. A student who needs both a time-in and a time-out
     * check on the same window scans twice, once per session row.
     *
     * @throws \App\Domain\Exceptions\InvalidQrPayloadException
     * @throws StaleQrCodeException
     * @throws SessionNotAcceptingScansException
     */
    public function __invoke(AttendanceSession $session, string $qrToken, ?int $scannedByStaffId = null): AttendanceRecord
    {
        $payload = QrPayload::decrypt($qrToken);

        $student = Student::where('student_number', $payload->studentNumber)->first();

        if (! $student || $payload->qrVersion !== $student->qr_version) {
            throw new StaleQrCodeException;
        }

        // Excluded here, not just skipped by EndSession's sweep, so a
        // staff/officiating scan is rejected at the point of scanning
        // rather than silently accepted and only quietly ignored later.
        // See Student::isAttendanceEligibleForEvent for exactly which
        // roles/scopes this covers.
        if (! $student->isAttendanceEligibleForEvent($session->eventDay->event_id)) {
            throw new StudentNotEligibleForAttendanceException;
        }

        if ($session->status !== SessionStatus::Ongoing) {
            throw new SessionNotAcceptingScansException;
        }

        if (in_array($student->id, Exclusion::excludedStudentIdsForSession($session), true)) {
            throw new StudentExcludedException;
        }

        $existing = AttendanceRecord::where('session_id', $session->id)
            ->where('student_id', $student->id)
            ->first();

        if ($existing) {
            // Duplicate scan: return as-is, no write.
            return $existing;
        }

        // Plain now() — this is the same real instant Carbon::now('Asia/Manila')
        // would give, but stored/labeled as UTC so it round-trips correctly
        // through the datetime cast (Eloquent persists whatever timezone a
        // Carbon instance is holding, verbatim, without converting it — so
        // tagging "now" as Asia/Manila here would silently store Manila
        // wall-clock digits as if they were UTC, corrupting every read-back
        // and JSON response by 8 hours). Session boundaries are still parsed
        // as Asia/Manila in AttendanceSession::combineWithDate(), which is
        // correct there because it's converting an admin-entered wall-clock
        // time into an absolute instant, not persisting a "now" value.
        $now = Carbon::now();

        return AttendanceRecord::create([
            'session_id' => $session->id,
            'student_id' => $student->id,
            'scanned_at' => $now,
            'status' => $session->window()->classify($now),
            'scanned_by' => $scannedByStaffId,
        ]);
    }
}
