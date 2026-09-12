<?php

use App\Domain\Enums\ExclusionScope;
use App\Models\Department;
use App\Models\EventModel;
use App\Models\Exclusion;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function exclusionApiDept(string $code = 'CS'): Department
{
    return Department::firstOrCreate(['code' => $code], ['name' => $code]);
}

function exclusionApiStaff(string $role, string $studentNumber): Student
{
    return Student::create([
        'student_number' => $studentNumber,
        'last_name' => 'Staff', 'first_name' => ucfirst($role),
        'department_id' => exclusionApiDept('CCS')->id,
                'username' => 'staff'.$studentNumber,
        'password' => 'password',
        'role' => $role,
        // Actors here authenticate and immediately hit routes behind the
        // password.changed middleware — without this every request gets a
        // 403 from that gate before it ever reaches the policy/controller.
        'must_change_password' => false,
    ]);
}

function exclusionApiStudent(string $studentNumber = '2023105413'): Student
{
    return Student::create([
        'student_number' => $studentNumber,
        'last_name' => 'Cruz', 'first_name' => 'Juan',
        'department_id' => exclusionApiDept()->id,
        'username' => 'jcruz'.$studentNumber,
        'password' => 'password',
    ]);
}

it('rejects an unauthenticated exclusion request', function () {
    $this->postJson('/api/exclusions', [])->assertStatus(401);
});

it('rejects exclusion creation from a non-admin role', function () {
    $officer = exclusionApiStaff('officer', '2020200001');
    $student = exclusionApiStudent();
    $event = EventModel::create(['name' => 'Event', 'created_by' => $officer->id]);

    $this->actingAs($officer, 'sanctum')
        ->postJson('/api/exclusions', [
            'event_id' => $event->id,
            'scope' => ExclusionScope::Event->value,
            'student_number' => $student->student_number,
        ])
        ->assertStatus(403);
});

it('lets a csg admin create an exclusion', function () {
    $admin = exclusionApiStaff('csg_admin', '2020000001');
    $student = exclusionApiStudent();
    $event = EventModel::create(['name' => 'Event', 'created_by' => $admin->id]);

    $this->actingAs($admin, 'sanctum')
        ->postJson('/api/exclusions', [
            'event_id' => $event->id,
            'scope' => ExclusionScope::Event->value,
            'student_number' => $student->student_number,
        ])
        ->assertStatus(201)
        ->assertJsonPath('student_id', $student->id);
});

it('validates that either student_number or qr_token is present', function () {
    $admin = exclusionApiStaff('csg_admin', '2020000001');
    $event = EventModel::create(['name' => 'Event', 'created_by' => $admin->id]);

    $this->actingAs($admin, 'sanctum')
        ->postJson('/api/exclusions', [
            'event_id' => $event->id,
            'scope' => ExclusionScope::Event->value,
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('student_number');
});

it('lets a csg admin delete an exclusion', function () {
    $admin = exclusionApiStaff('csg_admin', '2020000001');
    $student = exclusionApiStudent();
    $event = EventModel::create(['name' => 'Event', 'created_by' => $admin->id]);

    $exclusion = Exclusion::create([
        'student_id' => $student->id,
        'event_id' => $event->id,
        'scope' => ExclusionScope::Event,
        'created_by' => $admin->id,
    ]);

    $this->actingAs($admin, 'sanctum')
        ->deleteJson("/api/exclusions/{$exclusion->id}")
        ->assertStatus(204);

    expect(Exclusion::find($exclusion->id))->toBeNull();
});

it('rejects exclusion deletion from a non-admin role', function () {
    $officer = exclusionApiStaff('officer', '2020200001');
    $student = exclusionApiStudent();
    $event = EventModel::create(['name' => 'Event', 'created_by' => $officer->id]);

    $exclusion = Exclusion::create([
        'student_id' => $student->id,
        'event_id' => $event->id,
        'scope' => ExclusionScope::Event,
        'created_by' => $officer->id,
    ]);

    $this->actingAs($officer, 'sanctum')
        ->deleteJson("/api/exclusions/{$exclusion->id}")
        ->assertStatus(403);
});
