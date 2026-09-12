<?php

namespace App\Application\Actions\Sessions;

use App\Models\AttendanceSession;
use App\Models\EventDay;

final class CreateSession
{
    /**
     * Status is deliberately absent from $data — every session is created
     * `scheduled` (the migration default, spec §7) and only moves via the
     * scan/end lifecycle, never set directly at creation.
     *
     * @param array{
     *     window_type: string,
     *     check_type: string,
     *     start_time: string,
     *     end_time: string,
     *     grace_minutes?: int|null,
     *     penalty_late_amount?: float|null,
     *     penalty_absent_amount?: float|null,
     * } $data
     */
    public function __invoke(EventDay $eventDay, array $data): AttendanceSession
    {
        $session = AttendanceSession::create([
            'event_day_id' => $eventDay->id,
            'window_type' => $data['window_type'],
            'check_type' => $data['check_type'],
            'start_time' => $data['start_time'],
            'end_time' => $data['end_time'],
            'grace_minutes' => $data['grace_minutes'] ?? 0,
            'penalty_late_amount' => $data['penalty_late_amount'] ?? 0,
            'penalty_absent_amount' => $data['penalty_absent_amount'] ?? 0,
        ]);

        // Refresh: `status` defaults to `scheduled` at the schema level
        // (spec §7) and is deliberately never set here — the DB row has it
        // right after insert, but Eloquent doesn't hydrate DB-side column
        // defaults back onto the in-memory model, so $session->status
        // would otherwise be null.
        return $session->refresh();
    }
}
