<?php

use App\Application\Actions\Exclusions\CreateExclusion;
use App\Domain\Enums\CheckType;
use App\Domain\Enums\ExclusionScope;
use App\Domain\Enums\SessionStatus;
use App\Domain\Enums\WindowType;
use App\Domain\Exceptions\SessionNotInEventException;
use App\Domain\Exceptions\StudentNotFoundException;
use App\Domain\ValueObjects\QrPayload;
use App\Models\AttendanceSession;
use App\Models\Department;
use App\Models\EventDay;
use App\Models\EventModel;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function exclusionDept(string $code = 'CS'): Department
{
    return Department::firstOrCreate(['code' => $code], ['name' => $code]);
}

function exclusionAdmin(): Student
{
    return Student::create([
        'student_number' => '2020000001',
        'last_name' => 'Admin', 'first_name' => 'CSG',
        'department_id' => exclusionDept('CCS')->id,
        'username' => 'csgadmin', 'password' => 'password',
        'role' => 'csg_admin',
    ]);
}

function exclusionStudent(string $studentNumber = '2023105413'): Student
{
    return Student::create([
        'student_number' => $studentNumber,
        'last_name' => 'Cruz', 'first_name' => 'Juan',
        'department_id' => exclusionDept()->id,
        'username' => 'jcruz'.$studentNumber,
        'password' => 'password',
        // DB defaults this to 1, but Eloquent doesn't hydrate DB-side
        // defaults back onto the model after create() — set it explicitly
        // so ->qr_version is a real int for QrPayload::forStudent().
        'qr_version' => 1,
    ]);
}

function exclusionEvent(Student $creator): EventModel
{
    return EventModel::create(['name' => 'Test Event', 'created_by' => $creator->id]);
}

function exclusionSession(EventModel $event): AttendanceSession
{
    $day = EventDay::create(['event_id' => $event->id, 'date' => '2026-11-10', 'day_number' => 1]);

    return AttendanceSession::create([
        'event_day_id' => $day->id,
        'window_type' => WindowType::Morning,
        'check_type' => CheckType::TimeIn,
        'start_time' => '07:00:00',
        'end_time' => '08:00:00',
        'grace_minutes' => 15,
        'status' => SessionStatus::Scheduled,
    ]);
}

it('creates an event-scoped exclusion by student number', function () {
    $admin = exclusionAdmin();
    $student = exclusionStudent();
    $event = exclusionEvent($admin);

    $exclusion = (new CreateExclusion)([
        'event_id' => $event->id,
        'scope' => ExclusionScope::Event->value,
        'student_number' => $student->student_number,
    ], $admin);

    expect($exclusion->student_id)->toBe($student->id)
        ->and($exclusion->created_by)->toBe($admin->id)
        ->and($exclusion->scope)->toBe(ExclusionScope::Event);
});

it('creates an exclusion by resolving the student from a scanned qr token', function () {
    $admin = exclusionAdmin();
    $student = exclusionStudent();
    $event = exclusionEvent($admin);
    $token = QrPayload::forStudent($student->student_number, $student->qr_version)->encrypt();

    $exclusion = (new CreateExclusion)([
        'event_id' => $event->id,
        'scope' => ExclusionScope::Event->value,
        'qr_token' => $token,
    ], $admin);

    expect($exclusion->student_id)->toBe($student->id);
});

it('throws when no student matches the given student number', function () {
    $admin = exclusionAdmin();
    $event = exclusionEvent($admin);

    (new CreateExclusion)([
        'event_id' => $event->id,
        'scope' => ExclusionScope::Event->value,
        'student_number' => 'does-not-exist',
    ], $admin);
})->throws(StudentNotFoundException::class);

it('creates a session-scoped exclusion when the session belongs to the event', function () {
    $admin = exclusionAdmin();
    $student = exclusionStudent();
    $event = exclusionEvent($admin);
    $session = exclusionSession($event);

    $exclusion = (new CreateExclusion)([
        'event_id' => $event->id,
        'scope' => ExclusionScope::Session->value,
        'session_id' => $session->id,
        'student_number' => $student->student_number,
    ], $admin);

    expect($exclusion->session_id)->toBe($session->id);
});

it('throws when the given session does not belong to the given event', function () {
    $admin = exclusionAdmin();
    $student = exclusionStudent();
    $eventA = exclusionEvent($admin);
    $eventB = exclusionEvent($admin);
    $sessionOnEventB = exclusionSession($eventB);

    (new CreateExclusion)([
        'event_id' => $eventA->id,
        'scope' => ExclusionScope::Session->value,
        'session_id' => $sessionOnEventB->id,
        'student_number' => $student->student_number,
    ], $admin);
})->throws(SessionNotInEventException::class);
