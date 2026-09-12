<?php

use App\Models\AcademicYear;
use App\Models\Department;
use App\Models\EventModel;
use App\Models\Semester;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function eventTestDept(string $code = 'CCS'): Department
{
    return Department::firstOrCreate(['code' => $code], ['name' => $code]);
}

function eventTestSemester(Student $createdBy): Semester
{
    $academicYear = AcademicYear::firstOrCreate(
        ['name' => '2026-2027'],
        ['is_active' => true, 'created_by' => $createdBy->id],
    );

    return Semester::firstOrCreate(
        ['academic_year_id' => $academicYear->id, 'name' => 'semester_1'],
        ['is_active' => true, 'created_by' => $createdBy->id],
    );
}

function eventTestStaff(string $role, string $studentNumber): Student
{
    return Student::create([
        'student_number' => $studentNumber,
        'last_name' => 'Staff', 'first_name' => ucfirst($role),
        'department_id' => eventTestDept()->id,
        'username' => 'staff'.$studentNumber,
        'password' => 'password',
        'role' => $role,
    ]);
}

it('rejects unauthenticated event listing and creation', function () {
    $this->getJson('/api/events')->assertStatus(401);
    $this->postJson('/api/events', [])->assertStatus(401);
});

it('lets any authenticated role list events', function () {
    $officer = eventTestStaff('officer', '2020200001');

    $this->actingAs($officer, 'sanctum')
        ->getJson('/api/events')
        ->assertStatus(200);
});

it('rejects event creation from a non-admin role', function () {
    $officer = eventTestStaff('officer', '2020200001');

    $this->actingAs($officer, 'sanctum')
        ->postJson('/api/events', ['name' => 'Intramurals 2026'])
        ->assertStatus(403);
});

it('lets a csg admin create an event, auto-attached to the active semester', function () {
    $admin = eventTestStaff('csg_admin', '2020000001');
    $semester = eventTestSemester($admin);

    // No semester_id in the request — the person creating the event
    // never picks one, it's resolved from whatever's active.
    $this->actingAs($admin, 'sanctum')
        ->postJson('/api/events', [
            'name' => 'Intramurals 2026',
            'description' => 'Sports fest',
        ])
        ->assertStatus(201)
        ->assertJsonPath('name', 'Intramurals 2026')
        ->assertJsonPath('semester_id', $semester->id);
});

it('rejects event creation when there is no active semester', function () {
    $admin = eventTestStaff('csg_admin', '2020000001');

    $this->actingAs($admin, 'sanctum')
        ->postJson('/api/events', ['name' => 'Intramurals 2026'])
        ->assertStatus(422);
});

it('creates a day and then a session under it, nested via the route', function () {
    $admin = eventTestStaff('csg_admin', '2020000001');
    $event = EventModel::create(['name' => 'Intramurals 2026', 'created_by' => $admin->id]);

    $day = $this->actingAs($admin, 'sanctum')
        ->postJson("/api/events/{$event->id}/days", ['date' => '2026-11-10', 'day_number' => 1])
        ->assertStatus(201)
        ->json();

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/event-days/{$day['id']}/sessions", [
            'window_type' => 'morning',
            'check_type' => 'time_in',
            'start_time' => '07:00',
            'end_time' => '08:00',
            'grace_minutes' => 30,
        ])
        ->assertStatus(201)
        ->assertJsonPath('window_type', 'morning')
        ->assertJsonPath('check_type', 'time_in');
});

it('rejects a duplicate day_number within the same event', function () {
    $admin = eventTestStaff('csg_admin', '2020000001');
    $event = EventModel::create(['name' => 'Intramurals 2026', 'created_by' => $admin->id]);

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/events/{$event->id}/days", ['date' => '2026-11-10', 'day_number' => 1])
        ->assertStatus(201);

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/events/{$event->id}/days", ['date' => '2026-11-11', 'day_number' => 1])
        ->assertStatus(422)
        ->assertJsonValidationErrors('day_number');
});

it('rejects a duplicate window_type + check_type within the same day', function () {
    $admin = eventTestStaff('csg_admin', '2020000001');
    $event = EventModel::create(['name' => 'Intramurals 2026', 'created_by' => $admin->id]);
    $day = \App\Models\EventDay::create(['event_id' => $event->id, 'date' => '2026-11-10', 'day_number' => 1]);

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/event-days/{$day->id}/sessions", [
            'window_type' => 'morning', 'check_type' => 'time_in', 'start_time' => '07:00', 'end_time' => '08:00',
        ])
        ->assertStatus(201);

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/event-days/{$day->id}/sessions", [
            'window_type' => 'morning', 'check_type' => 'time_in', 'start_time' => '09:00', 'end_time' => '10:00',
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('window_type');
});

it('allows a time-out session for the same window_type once time-in already exists', function () {
    $admin = eventTestStaff('csg_admin', '2020000001');
    $event = EventModel::create(['name' => 'Intramurals 2026', 'created_by' => $admin->id]);
    $day = \App\Models\EventDay::create(['event_id' => $event->id, 'date' => '2026-11-10', 'day_number' => 1]);

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/event-days/{$day->id}/sessions", [
            'window_type' => 'morning', 'check_type' => 'time_in', 'start_time' => '07:00', 'end_time' => '08:00',
        ])
        ->assertStatus(201);

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/event-days/{$day->id}/sessions", [
            'window_type' => 'morning', 'check_type' => 'time_out', 'start_time' => '16:00', 'end_time' => '17:00',
        ])
        ->assertStatus(201);
});

it('rejects a session where end_time is not after start_time', function () {
    $admin = eventTestStaff('csg_admin', '2020000001');
    $event = EventModel::create(['name' => 'Intramurals 2026', 'created_by' => $admin->id]);
    $day = \App\Models\EventDay::create(['event_id' => $event->id, 'date' => '2026-11-10', 'day_number' => 1]);

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/event-days/{$day->id}/sessions", [
            'window_type' => 'morning', 'check_type' => 'time_in', 'start_time' => '08:00', 'end_time' => '07:00',
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('end_time');
});
