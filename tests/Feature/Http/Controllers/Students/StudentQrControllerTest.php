<?php

use App\Models\Department;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function qrCtrlDept(string $code): Department
{
    return Department::firstOrCreate(['code' => $code], ['name' => $code]);
}

function qrCtrlStudent(string $studentNumber, string $role = 'student', ?int $scAdminDepartmentId = null): Student
{
    return Student::create([
        'student_number' => $studentNumber,
        'last_name' => 'Test', 'first_name' => 'Student',
        'department_id' => qrCtrlDept('CCS')->id,
        'sc_admin_department_id' => $scAdminDepartmentId,
        'username' => 'qc'.$studentNumber,
        'password' => 'password',
        'role' => $role,
    ]);
}

it('rejects unauthenticated qr requests', function () {
    $student = qrCtrlStudent('2020300001');

    $this->getJson("/api/students/{$student->id}/qr")
    ->assertStatus(401);
});

it('lets a student view their own qr as a png', function () {
    $student = qrCtrlStudent('2020300001');

    $this->actingAs($student, 'sanctum')
        ->get("/api/students/{$student->id}/qr")
        ->assertStatus(200)
        ->assertHeader('Content-Type', 'image/png')
        ->assertHeader('Content-Disposition', 'inline');
});

it('rejects a student viewing someone else\'s qr', function () {
    $student = qrCtrlStudent('2020300001');
    $other = qrCtrlStudent('2020300002');

    $this->actingAs($student, 'sanctum')
        ->get("/api/students/{$other->id}/qr")
        ->assertStatus(403);
});

it('lets a csg admin view any student\'s qr', function () {
    $admin = qrCtrlStudent('2020000001', 'csg_admin');
    $target = qrCtrlStudent('2020300001');

    $this->actingAs($admin, 'sanctum')
        ->get("/api/students/{$target->id}/qr")
        ->assertStatus(200);
});

it('sets an attachment disposition when download=1 is passed', function () {
    $student = qrCtrlStudent('2020300001');

    $this->actingAs($student, 'sanctum')
        ->get("/api/students/{$student->id}/qr?download=1")
        ->assertStatus(200)
        ->assertHeader('Content-Disposition', 'attachment; filename="qr-2020300001.png"');
});
