<?php

namespace App\Application\Actions\Exclusions;

use App\Domain\Enums\ExclusionScope;
use App\Domain\Exceptions\SessionNotInEventException;
use App\Domain\Exceptions\StudentNotFoundException;
use App\Domain\ValueObjects\QrPayload;
use App\Models\AttendanceSession;
use App\Models\Exclusion;
use App\Models\Student;

final class CreateExclusion
{
    /**
     * Spec §8: identify the student by student number (manual entry) or by
     * scanning their QR code — the FormRequest guarantees exactly one of
     * student_number/qr_token is present before this ever runs.
     *
     * @param array{
     *     event_id: int,
     *     scope: string,
     *     window_type?: string|null,
     *     session_id?: int|null,
     *     student_number?: string|null,
     *     qr_token?: string|null,
     * } $data
     *
     * @throws StudentNotFoundException
     * @throws SessionNotInEventException
     */
    public function __invoke(array $data, Student $createdBy): Exclusion
    {
        $student = $this->resolveStudent($data);

        if ($data['scope'] === ExclusionScope::Session->value) {
            $this->assertSessionBelongsToEvent((int) $data['session_id'], (int) $data['event_id']);
        }

        return Exclusion::create([
            'student_id' => $student->id,
            'event_id' => $data['event_id'],
            'scope' => $data['scope'],
            'window_type' => $data['window_type'] ?? null,
            'session_id' => $data['session_id'] ?? null,
            'created_by' => $createdBy->id,
        ]);
    }

    private function resolveStudent(array $data): Student
    {
        if (! empty($data['qr_token'])) {
            $payload = QrPayload::decrypt($data['qr_token']);
            $student = Student::where('student_number', $payload->studentNumber)->first();
        } else {
            $student = Student::where('student_number', $data['student_number'])->first();
        }

        if (! $student) {
            throw new StudentNotFoundException;
        }

        return $student;
    }

    private function assertSessionBelongsToEvent(int $sessionId, int $eventId): void
    {
        $belongs = AttendanceSession::whereKey($sessionId)
            ->whereHas('eventDay', fn ($q) => $q->where('event_id', $eventId))
            ->exists();

        if (! $belongs) {
            throw new SessionNotInEventException;
        }
    }
}
