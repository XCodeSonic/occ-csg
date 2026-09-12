<?php

use App\Application\Actions\Events\CreateEvent;
use App\Models\AcademicYear;
use App\Models\Department;
use App\Models\Semester;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates an event owned by the given creator', function () {
    $department = Department::create(['name' => 'CCS', 'code' => 'CCS']);
    $admin = Student::create([
        'student_number' => '2020000001',
        'last_name' => 'Admin', 'first_name' => 'CSG',
        'department_id' => $department->id,
        'username' => 'csgadmin', 'password' => 'password',
        'role' => 'csg_admin',
    ]);
    // The event's semester is resolved from whatever's active — this
    // test isn't about semester scoping, so just make one active.
    $academicYear = AcademicYear::create(['name' => '2026-2027', 'is_active' => true, 'created_by' => $admin->id]);
    Semester::create([
        'academic_year_id' => $academicYear->id,
        'name' => 'semester_1',
        'is_active' => true,
        'created_by' => $admin->id,
    ]);

    $event = (new CreateEvent)([
        'name' => 'Intramurals 2026',
        'description' => 'Annual sports fest',
    ], $admin);

    expect($event->name)->toBe('Intramurals 2026')
        ->and($event->description)->toBe('Annual sports fest')
        ->and($event->created_by)->toBe($admin->id);
});

it('scopes the created event to the given semester, and transitively to its academic year', function () {
    $department = Department::create(['name' => 'CCS', 'code' => 'CCS']);
    $admin = Student::create([
        'student_number' => '2020000001',
        'last_name' => 'Admin', 'first_name' => 'CSG',
        'department_id' => $department->id,
        'username' => 'csgadmin', 'password' => 'password',
        'role' => 'csg_admin',
    ]);
    $academicYear = AcademicYear::create(['name' => '2026-2027', 'is_active' => true, 'created_by' => $admin->id]);
    $semester = Semester::create([
        'academic_year_id' => $academicYear->id,
        'name' => 'semester_1',
        'is_active' => true,
        'created_by' => $admin->id,
    ]);

    $event = (new CreateEvent)([
        'name' => 'Intramurals 2026',
        'semester_id' => $semester->id,
    ], $admin);

    expect($event->semester_id)->toBe($semester->id)
        ->and($event->semester->name)->toBe(\App\Domain\Enums\Semester::First)
        ->and($event->academicYear->id)->toBe($academicYear->id)
        ->and($event->academicYear->name)->toBe('2026-2027')
        ->and($event->academic_year->id)->toBe($academicYear->id);
});
