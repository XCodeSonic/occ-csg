<?php

namespace App\Application\Actions\Reports;

use App\Domain\Enums\Role;
use App\Domain\Enums\SessionStatus;
use App\Models\AcademicYear;
use App\Models\AttendanceSession;
use App\Models\EventModel;
use App\Models\Exclusion;
use App\Models\Semester;
use App\Models\Student;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * The Settings → Reports landing screen (spec: clicking "Reports" shows
 * every event for the current active academic year and semester, with
 * total Present, Absent, Late, and Excluded) — a birds-eye summary,
 * unlike BuildEventRosterReport which drills into one event's printable
 * per-student roster.
 */
final class BuildMasterReport
{
    /**
     * @param  int|null  $departmentId  An SC Admin's own department,
     *                                  forced by the controller; null
     *                                  counts every department.
     * @return array{
     *     academic_year: ?array{id: int, name: string},
     *     semester: ?array{id: int, name: string},
     *     events: array<int, array{id: int, name: string, status: string, present: int, late: int, absent: int, excluded: int}>,
     * }
     */
    public function __invoke(?int $departmentId = null): array
    {
        $academicYear = AcademicYear::active()->first();
        $semester = $academicYear
            ? Semester::active()->forAcademicYear($academicYear->id)->first()
            : null;

        if (! $academicYear || ! $semester) {
            return [
                'academic_year' => $academicYear ? ['id' => $academicYear->id, 'name' => $academicYear->name] : null,
                'semester' => null,
                'events' => [],
            ];
        }

        // Loaded once per department_id, not once per event id/department
        // pair — summarizeEvent() below intersects this with each event's
        // own includedDepartmentIds() instead of re-querying.
        $roster = Student::where('role', Role::Student)
            ->when($departmentId, fn ($q) => $q->where('department_id', $departmentId))
            ->get(['id', 'department_id']);

        // Eager-load departments so includedDepartmentIds() below doesn't
        // fire a query per event.
        $events = EventModel::forSemester($semester->id)->with('departments')->orderBy('id')->get();

        return [
            'academic_year' => ['id' => $academicYear->id, 'name' => $academicYear->name],
            'semester' => ['id' => $semester->id, 'name' => $semester->name->value],
            'events' => $events->map(fn (EventModel $event) => $this->summarizeEvent($event, $roster))->values()->all(),
        ];
    }

    /**
     * @param  Collection<int, Student>  $roster  Every eligible student
     *                                             (already filtered by the
     *                                             viewer's own department,
     *                                             if any) — narrowed here
     *                                             to this event's scope.
     * @return array{id: int, name: string, status: string, present: int, late: int, absent: int, excluded: int}
     */
    private function summarizeEvent(EventModel $event, Collection $roster): array
    {
        // Never counts a student whose department isn't part of this
        // event's scope (see EventModel::includedDepartmentIds) — same
        // reasoning as BuildSessionReport / BuildEventRosterReport.
        $includedDepartmentIds = $event->includedDepartmentIds();
        $rosterIds = $roster
            ->filter(fn (Student $student) => in_array($student->department_id, $includedDepartmentIds, true))
            ->pluck('id');

        $sessions = AttendanceSession::whereHas('eventDay', fn ($q) => $q->where('event_id', $event->id))->get();
        $sessionIds = $sessions->pluck('id');

        // Plain DB query builder, not Eloquent — grouping by a column
        // that's cast to an enum (AttendanceRecord::$casts) would hand
        // pluck() an enum instance as its array key, which fails. Raw
        // rows sidestep that entirely.
        $statusCounts = DB::table('attendance_records')
            ->whereIn('session_id', $sessionIds)
            ->whereIn('student_id', $rosterIds)
            ->select('status', DB::raw('count(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        // Excluded students never get an attendance_records row at all
        // (see EndSession::markMissingRecords), so they're never in the
        // count above — tallied separately per session, the same way
        // BuildEventRosterReport and BuildSessionReport already do.
        //
        // Absent is handled the same way for the same reason: a session
        // that was ended the normal way (through EndSession) already has
        // a real 'absent' attendance_records row for every no-show,
        // which $statusCounts['absent'] above already picks up. But this
        // summary is a birds-eye total across every session in the
        // event, not a single session's own report, so it also sweeps in
        // any roster student who still has no record at all once their
        // session has ended — the same students EndSession would mark
        // Absent, computed here instead of requiring every session to
        // have actually been closed out through that action first. A
        // still-open (scheduled/ongoing) session never contributes to
        // this: only EndSession is allowed to decide Absent, so an
        // unscanned student in an open session stays uncounted (pending)
        // rather than guessed at.
        $recordedStudentIdsBySession = DB::table('attendance_records')
            ->whereIn('session_id', $sessionIds)
            ->whereIn('student_id', $rosterIds)
            ->select('session_id', 'student_id')
            ->get()
            ->groupBy('session_id')
            ->map(fn (Collection $rows) => $rows->pluck('student_id'));

        $excludedTotal = 0;
        $unrecordedAbsentTotal = 0;

        foreach ($sessions as $session) {
            $excludedIds = Exclusion::excludedStudentIdsForSession($session);
            $sessionExcludedIds = $rosterIds->intersect($excludedIds);
            $excludedTotal += $sessionExcludedIds->count();

            if ($session->status === SessionStatus::Ended) {
                $recordedIds = $recordedStudentIdsBySession->get($session->id, collect());

                $unrecordedAbsentTotal += $rosterIds
                    ->diff($sessionExcludedIds)
                    ->diff($recordedIds)
                    ->count();
            }
        }

        return [
            'id' => $event->id,
            'name' => $event->name,
            'status' => $event->status->value,
            'present' => (int) ($statusCounts['present'] ?? 0),
            'late' => (int) ($statusCounts['late'] ?? 0),
            'absent' => (int) ($statusCounts['absent'] ?? 0) + $unrecordedAbsentTotal,
            'excluded' => $excludedTotal,
        ];
    }
}
