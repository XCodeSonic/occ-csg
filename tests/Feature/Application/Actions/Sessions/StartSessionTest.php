<?php

use App\Application\Actions\Sessions\StartSession;
use App\Domain\Enums\CheckType;
use App\Domain\Enums\Role;
use App\Domain\Enums\SessionStatus;
use App\Domain\Enums\WindowType;
use App\Domain\Exceptions\SessionNotScheduledException;
use App\Models\AttendanceSession;
use App\Models\Department;
use App\Models\EventDay;
use App\Models\EventModel;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function startSessionDept(string $code): Department
{
    return Department::firstOrCreate(['code' => $code], ['name' => $code]);
}

function startSessionEvent(): EventModel
{
    $creator = Student::firstOrCreate(
        ['student_number' => '2020000001'],
        [
            'last_name' => 'Admin', 'first_name' => 'CSG',
            'department_id' => startSessionDept('CCS')->id,
            'username' => 'csgadmin', 'password' => 'password',
            'role' => Role::CsgAdmin,
        ],
    );

    return EventModel::create(['name' => 'Test Event', 'created_by' => $creator->id]);
}

function startSessionFixture(array $overrides = []): AttendanceSession
{
    $day = EventDay::create([
        'event_id' => startSessionEvent()->id,
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
        'status' => SessionStatus::Scheduled,
    ], $overrides));
}

it('moves a scheduled session to ongoing', function () {
    $session = startSessionFixture();

    $started = (new StartSession)($session);

    expect($started->status)->toBe(SessionStatus::Ongoing);
    $session->refresh();
    expect($session->status)->toBe(SessionStatus::Ongoing);
});

it('throws when starting a session that is already ongoing', function () {
    $session = startSessionFixture(['status' => SessionStatus::Ongoing]);

    (new StartSession)($session);
})->throws(SessionNotScheduledException::class);

it('throws when starting a session that has already ended', function () {
    $session = startSessionFixture(['status' => SessionStatus::Ended]);

    (new StartSession)($session);
})->throws(SessionNotScheduledException::class);
