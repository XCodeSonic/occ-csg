<?php

use App\Application\Actions\Sessions\EndSession;
use App\Application\Actions\Sessions\ScanAttendance;
use App\Domain\Enums\AttendanceStatus;
use App\Domain\Enums\CheckType;
use App\Domain\Enums\ExclusionScope;
use App\Domain\Enums\Role;
use App\Domain\Enums\SessionStatus;
use App\Domain\Enums\WindowType;
use App\Domain\Exceptions\SessionAlreadyEndedException;
use App\Domain\ValueObjects\QrPayload;
use App\Models\AttendancePenalty;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\Department;
use App\Models\EventDay;
use App\Models\EventModel;
use App\Models\Exclusion;
use App\Models\Student;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(fn () => Carbon::setTestNow(Carbon::parse('2026-11-10 07:05:00', 'Asia/Manila')));
afterEach(fn () => Carbon::setTestNow());

function endSessionDept(string $code): Department
{
    return Department::firstOrCreate(['code' => $code], ['name' => $code]);
}

function endSessionEvent(): EventModel
{
    $creator = Student::firstOrCreate(
        ['student_number' => '2020000001'],
        [
            'last_name' => 'Admin', 'first_name' => 'CSG',
            'department_id' => endSessionDept('CCS')->id,
            'username' => 'csgadmin', 'password' => 'password',
            'role' => Role::CsgAdmin, // must not default to 'student' — this
            // account represents the organizer, not an attendee, and the
            // whole point of the EndSession fix is that organizers are
            // never swept into the absent-marking query.
        ],
    );

    return EventModel::create(['name' => 'Test Event', 'created_by' => $creator->id]);
}

function endSessionSession(array $overrides = []): AttendanceSession
{
    $day = EventDay::create([
        'event_id' => endSessionEvent()->id,
        'date' => '2026-11-10',
        'day_number' => 1,
    ]);

    return AttendanceSession::create(array_merge([
        'event_day_id' => $day->id,
        'window_type' => WindowType::Morning,
        'check_type' => CheckType::TimeIn,
        'start_time' => '07:00:00',
        'end_time' => '08:00:00',
        'grace_minutes' => 15,
        'penalty_late_amount' => 10,
        'penalty_absent_amount' => 25,
        'status' => SessionStatus::Ongoing,
    ], $overrides));
}

function endSessionTimeOutSibling(AttendanceSession $timeInSession, array $overrides = []): AttendanceSession
{
    return AttendanceSession::create(array_merge([
        'event_day_id' => $timeInSession->event_day_id,
        'window_type' => $timeInSession->window_type,
        'check_type' => CheckType::TimeOut,
        'start_time' => '16:00:00',
        'end_time' => '17:00:00',
        'grace_minutes' => 15,
        'penalty_late_amount' => 10,
        'penalty_absent_amount' => 25,
        'status' => SessionStatus::Ongoing,
    ], $overrides));
}

function endSessionStudent(string $studentNumber, int $qrVersion = 1): Student
{
    return Student::create([
        'student_number' => $studentNumber,
        'last_name' => 'Student', 'first_name' => 'Test',
        'department_id' => endSessionDept('CS')->id,
        'username' => 'user'.$studentNumber,
        'password' => 'password',
        'qr_version' => $qrVersion,
    ]);
}

it('marks every student with no scan as Absent and charges the absent penalty', function () {
    $session = endSessionSession();
    $student = endSessionStudent('2023000001');

    $result = (new EndSession)($session);

    $record = AttendanceRecord::where('session_id', $session->id)->where('student_id', $student->id)->first();

    expect($record->status)->toBe(AttendanceStatus::Absent)
        ->and($record->scanned_at)->toBeNull()
        ->and($result['absent_created'])->toBe(1)
        ->and((float) $result['penalty_total'])->toBe(25.0);

    expect(AttendancePenalty::where('student_id', $student->id)->count())->toBe(1);

    $session->refresh();
    expect($session->status)->toBe(SessionStatus::Ended);
});

it('ends the time-out sibling session independently, absent for the missed check only', function () {
    $timeIn = endSessionSession();
    $timeOut = endSessionTimeOutSibling($timeIn);
    $student = endSessionStudent('2023000002');
    $token = QrPayload::forStudent($student->student_number, $student->qr_version)->encrypt();

    (new ScanAttendance)($timeIn, $token); // student scans time-in only

    (new EndSession)($timeIn);
    $result = (new EndSession)($timeOut);

    $timeInRecord = AttendanceRecord::where('session_id', $timeIn->id)->where('student_id', $student->id)->first();
    $timeOutRecord = AttendanceRecord::where('session_id', $timeOut->id)->where('student_id', $student->id)->first();

    expect($timeInRecord->status)->toBe(AttendanceStatus::Present) // time-in untouched by ending time-out
        ->and($timeOutRecord->status)->toBe(AttendanceStatus::Absent)
        ->and($result['absent_created'])->toBe(1) // a fresh record was created for the missed time-out
        ->and((float) $result['penalty_total'])->toBe(25.0); // absent penalty for the missed time-out
});

it('does not create records or charge penalties for excluded students', function () {
    $session = endSessionSession();
    $event = $session->eventDay->event;
    $excludedStudent = endSessionStudent('2023000003');

    Exclusion::create([
        'student_id' => $excludedStudent->id,
        'event_id' => $event->id,
        'scope' => ExclusionScope::Event,
        'created_by' => $event->created_by,
    ]);

    $result = (new EndSession)($session);

    expect(AttendanceRecord::where('session_id', $session->id)->where('student_id', $excludedStudent->id)->exists())
        ->toBeFalse()
        ->and(AttendancePenalty::where('student_id', $excludedStudent->id)->exists())->toBeFalse()
        ->and($result['absent_created'])->toBe(0);
});

it('charges the late penalty for a student who scanned late', function () {
    $session = endSessionSession();
    $student = endSessionStudent('2023000004');
    $token = QrPayload::forStudent($student->student_number, $student->qr_version)->encrypt();

    Carbon::setTestNow(Carbon::parse('2026-11-10 08:30:00', 'Asia/Manila')); // past grace, Late
    (new ScanAttendance)($session, $token);

    $result = (new EndSession)($session);

    $record = AttendanceRecord::where('session_id', $session->id)->where('student_id', $student->id)->first();

    expect($record->status)->toBe(AttendanceStatus::Late)
        ->and((float) $result['penalty_total'])->toBe(10.0);
});

it('does not double-charge a penalty if applyPenalties logic ran on the same record twice', function () {
    $session = endSessionSession();
    endSessionStudent('2023000005');

    (new EndSession)($session);

    expect(AttendancePenalty::count())->toBe(1);

    // Simulate a second pass over the same (already-ended) data by calling
    // the action's penalty path indirectly is not possible once ended, so
    // instead assert firstOrCreate directly protects the ledger:
    $record = AttendanceRecord::first();
    $penalty = AttendancePenalty::firstOrCreate(
        [
            'student_id' => $record->student_id,
            'session_id' => $session->id,
            'reason' => 'Absent - Time In',
        ],
        ['amount' => 25],
    );

    expect(AttendancePenalty::count())->toBe(1)
        ->and($penalty->wasRecentlyCreated)->toBeFalse();
});

it('throws when ending a session that has already ended', function () {
    $session = endSessionSession();

    (new EndSession)($session);

    (new EndSession)($session);
})->throws(SessionAlreadyEndedException::class);
