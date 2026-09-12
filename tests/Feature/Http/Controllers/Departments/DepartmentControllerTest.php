<?php

use App\Models\Department;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

// Prefixed "departmentTest*" to avoid colliding with same-purpose helpers
// declared in other test files (exclusionDept, exclusionApiDept, etc.) —
// Pest loads every test file's top-level functions into one process.
function departmentTestDept(string $code = 'CCS'): Department
{
    return Department::firstOrCreate(['code' => $code], ['name' => $code]);
}

function departmentTestStaff(string $role, string $studentNumber): Student
{
    return Student::create([
        'student_number' => $studentNumber,
        'last_name' => 'Staff', 'first_name' => ucfirst($role),
        'department_id' => departmentTestDept()->id,
        'username' => 'staff'.$studentNumber,
        'password' => 'password',
        'role' => $role,
    ]);
}

it('rejects an unauthenticated department list request', function () {
    $this->getJson('/api/departments')->assertStatus(401);
});

it('lets any authenticated role list departments', function () {
    departmentTestDept('BSIT');
    $officer = departmentTestStaff('officer', '2020200001');

    $this->actingAs($officer, 'sanctum')
        ->getJson('/api/departments')
        ->assertStatus(200)
        ->assertJsonCount(2); // bootstrap CCS + BSIT
});

it('rejects department creation from a non-admin role', function () {
    $officer = departmentTestStaff('officer', '2020200001');

    $this->actingAs($officer, 'sanctum')
        ->postJson('/api/departments', ['name' => 'New Dept', 'code' => 'ND'])
        ->assertStatus(403);
});

it('lets a csg admin create a department', function () {
    $admin = departmentTestStaff('csg_admin', '2020000001');

    $this->actingAs($admin, 'sanctum')
        ->postJson('/api/departments', ['name' => 'New Department', 'code' => 'nd'])
        ->assertStatus(201)
        ->assertJsonPath('code', 'ND');
});

it('rejects a duplicate department code regardless of casing', function () {
    $admin = departmentTestStaff('csg_admin', '2020000001');
    departmentTestDept('BSIT');

    $this->actingAs($admin, 'sanctum')
        ->postJson('/api/departments', ['name' => 'Duplicate', 'code' => 'bsit'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('code');
});

it('validates required fields on department creation', function () {
    $admin = departmentTestStaff('csg_admin', '2020000001');

    $this->actingAs($admin, 'sanctum')
        ->postJson('/api/departments', [])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['name', 'code']);
});
