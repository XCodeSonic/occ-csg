<?php

namespace App\Application\Actions\Reports;

use App\Domain\Enums\Role;
use App\Models\AttendancePenalty;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\EventModel;
use App\Models\Exclusion;
use App\Models\Student;
use Illuminate\Support\Collection;

final class BuildEventRosterReport
{
    private const WINDOW_ORDER = ['morning' => 1, 'afternoon' => 2, 'evening' => 3];

    private const CHECK_ORDER = ['time_in' => 1, 'time_out' => 2];

    /**
     * The report request: a printable roster grouped by
     * department -> year level -> section (the spec's own example,
     * "BSIT, 1st year, 1st section -> BSIT 1A"), one row per student
     * sorted a-z by last name, one column per session in the event
     * showing that student's Present/Late/Absent/Excluded status, and
     * a running penalty total per student — the same building blocks
     * BuildSessionReport already uses per-session, just assembled
     * across every session in the event and bucketed into groups
     * instead of scoped to one session.
     *
     * @param  int|null  $departmentId  Forced to an SC Admin's own
     *                                  department by the caller;
     *                                  otherwise an optional narrowing
     *                                  filter.
     * @param  string|null  $yearLevel  Optional narrowing filter.
     * @param  string|null  $section  Optional narrowing filter.
     * @param  callable|null  $onGroupBuilt  Invoked once per
     *                                       department/year-level/section
     *                                       group as it finishes building
     *                                       — ProcessRosterReportGeneration
     *                                       uses this to advance a real
     *                                       progress counter while a
     *                                       full-school report (the case
     *                                       that used to just hang) is
     *                                       being assembled, group by
     *                                       group, rather than a fake
     *                                       timer. Null everywhere else,
     *                                       including every existing
     *                                       caller/test — a no-op.
     * @return array{event: array, sessions: array, groups: array}
     */
    public function __invoke(
        EventModel $event,
        ?int $departmentId = null,
        ?string $yearLevel = null,
        ?string $section = null,
        ?callable $onGroupBuilt = null,
    ): array {
        $sessions = AttendanceSession::whereHas('eventDay', fn ($q) => $q->where('event_id', $event->id))
            ->with('eventDay')
            ->get()
            ->sortBy(fn (AttendanceSession $s) => sprintf(
                '%03d-%d-%d',
                $s->eventDay->day_number,
                self::WINDOW_ORDER[$s->window_type->value] ?? 99,
                self::CHECK_ORDER[$s->check_type->value] ?? 99,
            ))
            ->values();

        // Never lists a student whose department isn't part of this
        // event's scope (see EventModel::includedDepartmentIds) — same
        // reasoning as BuildSessionReport.
        $includedDepartmentIds = $event->includedDepartmentIds();

        $roster = Student::where('role', Role::Student)
            ->whereIn('department_id', $includedDepartmentIds)
            ->when($departmentId, fn ($q) => $q->where('department_id', $departmentId))
            ->when(filled($yearLevel), fn ($q) => $q->where('year_level', $yearLevel))
            ->when(filled($section), fn ($q) => $q->where('section', $section))
            ->with('department')
            ->orderBy('last_name')->orderBy('first_name')
            ->get();

        $sessionIds = $sessions->pluck('id');
        $rosterIds = $roster->pluck('id');

        $recordsBySession = AttendanceRecord::whereIn('session_id', $sessionIds)
            ->whereIn('student_id', $rosterIds)
            ->get()
            ->groupBy('session_id')
            ->map(fn (Collection $records) => $records->keyBy('student_id'));

        $excludedBySession = $sessions->mapWithKeys(
            fn (AttendanceSession $s) => [$s->id => Exclusion::excludedStudentIdsForSession($s)]
        );

        $penaltyTotals = AttendancePenalty::whereIn('session_id', $sessionIds)
            ->whereIn('student_id', $rosterIds)
            ->where('is_reversed', false)
            ->get()
            ->groupBy('student_id')
            ->map(fn (Collection $penalties) => (float) $penalties->sum('amount'));

        $sessionMeta = $sessions->map(fn (AttendanceSession $s) => [
            'id' => $s->id,
            'day_number' => $s->eventDay->day_number,
            'window_type' => $s->window_type->value,
            'check_type' => $s->check_type->value,
            'label' => 'Day '.$s->eventDay->day_number.' — '.ucfirst($s->window_type->value)
                .' — '.($s->check_type->value === 'time_in' ? 'Time In' : 'Time Out'),
        ])->values()->all();

        $groups = $roster
            ->groupBy(fn (Student $s) => sprintf(
                '%s|%s|%s',
                $s->department?->code ?? '—',
                $s->year_level ?? '—',
                $s->section ?? '—',
            ))
            ->map(function (Collection $students, string $key) use ($sessions, $recordsBySession, $excludedBySession, $penaltyTotals, $onGroupBuilt) {
                $group = $this->buildGroup(
                    $key, $students, $sessions, $recordsBySession, $excludedBySession, $penaltyTotals,
                );

                if ($onGroupBuilt !== null) {
                    $onGroupBuilt();
                }

                return $group;
            })
            ->sortBy(fn (array $group) => sprintf(
                '%s-%03d-%s', $group['department_code'], (int) $group['year_level'], $group['section'],
            ))
            ->values()
            ->all();

        return [
            'event' => ['id' => $event->id, 'name' => $event->name],
            'sessions' => $sessionMeta,
            'groups' => $groups,
        ];
    }

    /**
     * @param  Collection<int, Student>  $students
     * @param  Collection<int, AttendanceSession>  $sessions
     * @param  Collection<int, Collection>  $recordsBySession
     * @param  Collection<int, array<int>>  $excludedBySession
     * @param  Collection<int, float>  $penaltyTotals
     */
    private function buildGroup(
        string $key,
        Collection $students,
        Collection $sessions,
        Collection $recordsBySession,
        Collection $excludedBySession,
        Collection $penaltyTotals,
    ): array {
        [$deptCode, $yearLevel, $section] = explode('|', $key);

        $studentRows = $students
            ->map(fn (Student $student) => [
                'student_id' => $student->id,
                'student_number' => $student->student_number,
                'last_name' => $student->last_name,
                'first_name' => $student->first_name,
                'middle_name' => $student->middle_name,
                'sessions' => $this->sessionStatusesFor($student, $sessions, $recordsBySession, $excludedBySession),
                'penalty_total' => $penaltyTotals->get($student->id, 0.0),
            ])
            ->values()
            ->all();

        return [
            'department_code' => $deptCode,
            'year_level' => $yearLevel,
            'section' => $section,
            'students' => $studentRows,
            'group_penalty_total' => array_sum(array_column($studentRows, 'penalty_total')),
        ];
    }

    /**
     * @param  Collection<int, AttendanceSession>  $sessions
     * @param  Collection<int, Collection>  $recordsBySession
     * @param  Collection<int, array<int>>  $excludedBySession
     * @return array<int, ?string>
     */
    private function sessionStatusesFor(
        Student $student,
        Collection $sessions,
        Collection $recordsBySession,
        Collection $excludedBySession,
    ): array {
        $statuses = [];

        foreach ($sessions as $session) {
            $isExcluded = in_array($student->id, $excludedBySession->get($session->id, []), true);
            $record = $recordsBySession->get($session->id, collect())->get($student->id);

            $statuses[$session->id] = match (true) {
                // Spec §8: excluded reads as "Excluded", never "Absent".
                $isExcluded => 'excluded',
                $record !== null => $record->status->value,
                // Not yet scanned and the session may still be open — only
                // EndSession is allowed to decide Absent, so this stays
                // null (rendered as "Pending") rather than guessed at.
                default => null,
            };
        }

        return $statuses;
    }
}
