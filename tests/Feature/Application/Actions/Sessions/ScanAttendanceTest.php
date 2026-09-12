<?php

use App\Application\Actions\Sessions\ScanAttendance;
use App\Domain\Enums\AttendanceStatus;
use App\Domain\Enums\CheckType;
use App\Domain\Enums\ExclusionScope;
use App\Domain\Enums\SessionStatus;
use App\Domain\Enums\WindowType;
use App\Domain\Exceptions\SessionNotAcceptingScansException;
use App\Domain\Exceptions\StaleQrCodeException;
use App\Domain\Exceptions\StudentExcludedException;
use App\Domain\ValueObjects\QrPayload;
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

// The session fixture below is anchored to a fixed calendar date
// (2026-11-10), so every test needs the clock frozen inside that
// session's window rather than relying on real wall-clock time.
beforeEach(fn () => Carbon::setTestNow(Carbon::parse('2026-11-10 07:05:00', 'Asia/Manila')));
afterEach(fn () => Carbon::setTestNow());

function makeDay(): EventDay
{
    // firstOrCreate throughout: several tests build a sibling session on
    // "the same day", which means reusing the same department/event/day
    // row rather than colliding on the department's unique `code`.
    $department = Department::firstOrCreate(['code' => 'CCS'], ['name' => 'CCS']);

    $creator = Student::firstOrCreate(
        ['student_number' => '2020000001'],
        [
            'last_name' => 'Admin', 'first_name' => 'CSG',
            'department_id' => $department->id,
            'username' => 'csgadmin', 'password' => 'password',
        ],
    );

    $event = EventModel::firstOrCreate(
        ['name' => 'Test Event'],
        ['created_by' => $creator->id],
    );

    return EventDay::firstOrCreate(
        ['event_id' => $event->id, 'day_number' => 1],
        ['date' => '2026-11-10'],
    );
}

function makeSession(array $overrides = []): AttendanceSession
{
    return AttendanceSession::create(array_merge([
        'event_day_id' => makeDay()->id,
        'window_type' => WindowType::Morning,
        'check_type' => CheckType::TimeIn,
        'start_time' => '07:00:00',
        'end_time' => '08:00:00',
        'grace_minutes' => 15,
        'status' => SessionStatus::Ongoing,
    ], $overrides));
}

function makeStudent(int $qrVersion = 1): Student
{
    $department = Department::create(['name' => 'CS', 'code' => 'CS']);

    return Student::create([
        'student_number' => '2023105413',
        'last_name' => 'Cruz', 'first_name' => 'Juan',
        'department_id' => $department->id,
        'username' => 'jcruz',
        'password' => 'password',
        'qr_version' => $qrVersion,
    ]);
}

it('records a scan as Present within the grace window', function () {
    $session = makeSession();
    $student = makeStudent();
    $token = QrPayload::forStudent($student->student_number, $student->qr_version)->encrypt();

    $record = (new ScanAttendance)($session, $token);

    expect($record->student_id)->toBe($student->id)
        ->and($record->status)->toBe(AttendanceStatus::Present)
        ->and($record->scanned_at)->not->toBeNull();
});

it('is idempotent on a second scan and does not throw', function () {
    $session = makeSession();
    $student = makeStudent();
    $token = QrPayload::forStudent($student->student_number, $student->qr_version)->encrypt();

    $action = new ScanAttendance;
    $first = $action($session, $token);
    $second = $action($session, $token);

    expect(AttendanceRecord::count())->toBe(1)
        ->and($second->id)->toBe($first->id)
        ->and($second->scanned_at)->toEqual($first->scanned_at);
});

it('records the time-out sibling session independently of the time-in scan', function () {
    $timeIn = makeSession();
    $timeOut = makeSession([
        'check_type' => CheckType::TimeOut,
        'start_time' => '16:00:00',
        'end_time' => '17:00:00',
    ]);
    $student = makeStudent();
    $token = QrPayload::forStudent($student->student_number, $student->qr_version)->encrypt();

    (new ScanAttendance)($timeIn, $token);
    Carbon::setTestNow(Carbon::parse('2026-11-10 16:05:00', 'Asia/Manila'));
    (new ScanAttendance)($timeOut, $token);

    expect(AttendanceRecord::where('session_id', $timeIn->id)->count())->toBe(1)
        ->and(AttendanceRecord::where('session_id', $timeOut->id)->count())->toBe(1);
});

it('rejects a scan from a QR token with a stale qr_version', function () {
    $session = makeSession();
    $student = makeStudent(qrVersion: 2);
    $staleToken = QrPayload::forStudent($student->student_number, 1)->encrypt(); // version 1, student is now on 2

    (new ScanAttendance)($session, $staleToken);
})->throws(StaleQrCodeException::class);

it('rejects a scan when the session is not ongoing', function () {
    $session = makeSession(['status' => SessionStatus::Scheduled]);
    $student = makeStudent();
    $token = QrPayload::forStudent($student->student_number, $student->qr_version)->encrypt();

    (new ScanAttendance)($session, $token);
})->throws(SessionNotAcceptingScansException::class);

it('classifies a scan outside the grace window as Late', function () {
    $session = makeSession();
    $student = makeStudent();
    $token = QrPayload::forStudent($student->student_number, $student->qr_version)->encrypt();

    Carbon::setTestNow(Carbon::parse('2026-11-10 09:00:00', 'Asia/Manila'));

    $record = (new ScanAttendance)($session, $token);

    expect($record->status)->toBe(AttendanceStatus::Late);
});

it('rejects a scan from a student excluded from the whole event', function () {
    $session = makeSession();
    $student = makeStudent();
    $token = QrPayload::forStudent($student->student_number, $student->qr_version)->encrypt();

    Exclusion::create([
        'student_id' => $student->id,
        'event_id' => $session->eventDay->event_id,
        'scope' => ExclusionScope::Event,
        'created_by' => $student->id,
    ]);

    (new ScanAttendance)($session, $token);
})->throws(StudentExcludedException::class);

it('rejects a scan from a student excluded from this specific session', function () {
    $session = makeSession();
    $student = makeStudent();
    $token = QrPayload::forStudent($student->student_number, $student->qr_version)->encrypt();

    Exclusion::create([
        'student_id' => $student->id,
        'event_id' => $session->eventDay->event_id,
        'scope' => ExclusionScope::Session,
        'session_id' => $session->id,
        'created_by' => $student->id,
    ]);

    (new ScanAttendance)($session, $token);
})->throws(StudentExcludedException::class);

it('still allows a scan from a student excluded from a different window type', function () {
    $session = makeSession(); // Morning
    $student = makeStudent();
    $token = QrPayload::forStudent($student->student_number, $student->qr_version)->encrypt();

    Exclusion::create([
        'student_id' => $student->id,
        'event_id' => $session->eventDay->event_id,
        'scope' => ExclusionScope::WindowType,
        'window_type' => WindowType::Evening,
        'created_by' => $student->id,
    ]);

    $record = (new ScanAttendance)($session, $token);

    expect($record->status)->toBe(AttendanceStatus::Present);
});
