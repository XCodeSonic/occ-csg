<?php

use App\Application\Actions\Students\BulkImportStudents;
use App\Models\Department;
use App\Models\Student;
use Illuminate\Http\UploadedFile;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function previewDept(string $code): Department
{
    return Department::firstOrCreate(['code' => $code], ['name' => $code]);
}

function previewActor(string $role, ?int $scAdminDeptId = null): Student
{
    return Student::create([
        'student_number' => '2020000001',
        'last_name' => 'Admin', 'first_name' => 'Test',
        'department_id' => previewDept('CCS')->id,
        'username' => 'actor'.uniqid(),
        'password' => 'password',
        'role' => $role,
        'sc_admin_department_id' => $scAdminDeptId,
    ]);
}

function previewFile(array $rows, array $headers = ['student_number', 'last_name', 'first_name', 'middle_name', 'suffix', 'department_code', 'year_level', 'section']): UploadedFile
{
    $lines = [implode(',', $headers)];

    foreach ($rows as $row) {
        $lines[] = implode(',', array_map(fn ($v) => (string) ($v ?? ''), $row));
    }

    return UploadedFile::fake()->createWithContent('import.csv', implode("\n", $lines));
}

it('reports every row as valid without creating any student records', function () {
    previewDept('BSIT');
    $actor = previewActor('csg_admin');

    $file = previewFile([
        ['2023000001', 'Cruz', 'Juan', 'Dela', '', 'BSIT', '1', 'A'],
        ['2023000002', 'Reyes', 'Ana', 'Santos', '', 'BSIT', '2', 'B'],
    ]);

    $preview = (new BulkImportStudents)->preview($file, $actor);

    expect($preview['total_rows'])->toBe(2)
        ->and($preview['valid'])->toBe(2)
        ->and($preview['invalid'])->toBe(0)
        ->and($preview['rows'][0]['valid'])->toBeTrue()
        ->and($preview['rows'][0]['student_number'])->toBe('2023000001')
        ->and($preview['rows'][0]['department_code'])->toBe('BSIT');

    expect(Student::where('student_number', '2023000001')->exists())->toBeFalse()
        ->and(Student::where('student_number', '2023000002')->exists())->toBeFalse();
});

it('flags the same problems the real import would, still without writing anything', function () {
    $actor = previewActor('csg_admin');

    $file = previewFile([
        ['2023000001', 'Cruz', 'Juan', 'Dela', '', 'NOPE', '1', 'A'],
    ]);

    $preview = (new BulkImportStudents)->preview($file, $actor);

    expect($preview['invalid'])->toBe(1)
        ->and($preview['rows'][0]['valid'])->toBeFalse()
        ->and($preview['rows'][0]['reasons'])->toContain('Unknown department code: NOPE');

    expect(Student::count())->toBe(1); // just the actor — nothing imported
});

it('produces a preview whose valid rows import cleanly afterwards', function () {
    previewDept('BSIT');
    $actor = previewActor('csg_admin');

    $file = previewFile([
        ['2023000001', 'Cruz', 'Juan', 'Dela', '', 'BSIT', '1', 'A'],
    ]);

    $preview = (new BulkImportStudents)->preview($file, $actor);
    expect($preview['valid'])->toBe(1);

    // Re-submitting the identical file for a real commit should succeed
    // exactly as the preview promised.
    $file2 = previewFile([
        ['2023000001', 'Cruz', 'Juan', 'Dela', '', 'BSIT', '1', 'A'],
    ]);
    $report = (new BulkImportStudents)($file2, $actor);

    expect($report['imported'])->toBe(1)
        ->and(Student::where('student_number', '2023000001')->exists())->toBeTrue();
});
