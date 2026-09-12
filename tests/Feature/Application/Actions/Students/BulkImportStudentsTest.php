<?php

use App\Application\Actions\Students\BulkImportStudents;
use App\Domain\Exceptions\TooManyImportRowsException;
use App\Models\Department;
use App\Models\Student;
use Illuminate\Http\UploadedFile;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function bulkImportDept(string $code): Department
{
    return Department::firstOrCreate(['code' => $code], ['name' => $code]);
}

function bulkImportActor(string $role, ?int $scAdminDeptId = null): Student
{
    return Student::create([
        'student_number' => '2020000001',
        'last_name' => 'Admin', 'first_name' => 'Test',
        'department_id' => bulkImportDept('CCS')->id,
        'username' => 'actor'.uniqid(),
        'password' => 'password',
        'role' => $role,
        'sc_admin_department_id' => $scAdminDeptId,
    ]);
}

/**
 * Builds a plain-CSV upload — Maatwebsite\Excel reads csv/xlsx/xls
 * identically once past the file-format layer, and a CSV is far simpler
 * to hand-construct in a test than a real xlsx binary.
 */
function bulkImportFile(array $rows, array $headers = ['student_number', 'last_name', 'first_name', 'middle_name', 'suffix', 'department_code', 'year_level', 'section']): UploadedFile
{
    $lines = [implode(',', $headers)];

    foreach ($rows as $row) {
        $lines[] = implode(',', array_map(fn ($v) => (string) ($v ?? ''), $row));
    }

    return UploadedFile::fake()->createWithContent('import.csv', implode("\n", $lines));
}

it('imports every valid row and creates real student records', function () {
    bulkImportDept('BSIT');
    $actor = bulkImportActor('csg_admin');

    $file = bulkImportFile([
        ['2023000001', 'Cruz', 'Juan', 'Dela', '', 'BSIT', '1', 'A'],
        ['2023000002', 'Reyes', 'Ana', 'Santos', '', 'BSIT', '2', 'B'],
    ]);

    $report = (new BulkImportStudents)($file, $actor);

    expect($report['total_rows'])->toBe(2)
        ->and($report['imported'])->toBe(2)
        ->and($report['failed'])->toBe(0)
        ->and($report['errors'])->toBe([]);

    expect(Student::where('student_number', '2023000001')->exists())->toBeTrue()
        ->and(Student::where('student_number', '2023000002')->exists())->toBeTrue();
});

it('reports a missing required field without importing that row, but still imports the rest', function () {
    bulkImportDept('BSIT');
    $actor = bulkImportActor('csg_admin');

    $file = bulkImportFile([
        ['2023000001', '', 'Juan', 'Dela', '', 'BSIT', '1', 'A'], // missing last_name
        ['2023000002', 'Reyes', 'Ana', 'Santos', '', 'BSIT', '2', 'B'],
    ]);

    $report = (new BulkImportStudents)($file, $actor);

    expect($report['imported'])->toBe(1)
        ->and($report['failed'])->toBe(1)
        ->and($report['errors'][0]['row'])->toBe(2)
        ->and($report['errors'][0]['reasons'])->toContain('Missing required field: last_name');

    expect(Student::where('student_number', '2023000001')->exists())->toBeFalse();
});

it('reports an unknown department code', function () {
    $actor = bulkImportActor('csg_admin');

    $file = bulkImportFile([
        ['2023000001', 'Cruz', 'Juan', 'Dela', '', 'NOPE', '1', 'A'],
    ]);

    $report = (new BulkImportStudents)($file, $actor);

    expect($report['failed'])->toBe(1)
        ->and($report['errors'][0]['reasons'])->toContain('Unknown department code: NOPE');
});

it('flags a duplicate student number within the same file, keeping the first occurrence', function () {
    bulkImportDept('BSIT');
    $actor = bulkImportActor('csg_admin');

    $file = bulkImportFile([
        ['2023000001', 'Cruz', 'Juan', 'Dela', '', 'BSIT', '1', 'A'],
        ['2023000001', 'Cruz', 'Juan', 'Dela', '', 'BSIT', '1', 'A'],
    ]);

    $report = (new BulkImportStudents)($file, $actor);

    expect($report['imported'])->toBe(1)
        ->and($report['failed'])->toBe(1)
        ->and($report['errors'][0]['row'])->toBe(3)
        ->and($report['errors'][0]['reasons'])->toContain('Duplicate student ID within this file');
});

it('flags a student number that already exists in the database', function () {
    $bsit = bulkImportDept('BSIT');
    $actor = bulkImportActor('csg_admin');
    Student::create([
        'student_number' => '2023000001', 'last_name' => 'Existing', 'first_name' => 'Student',
        'department_id' => $bsit->id, 'username' => 'existing', 'password' => 'password',
    ]);

    $file = bulkImportFile([
        ['2023000001', 'Cruz', 'Juan', 'Dela', '', 'BSIT', '1', 'A'],
    ]);

    $report = (new BulkImportStudents)($file, $actor);

    expect($report['failed'])->toBe(1)
        ->and($report['errors'][0]['reasons'])->toContain('Student ID already exists');
});

it('lets a csg admin import across multiple departments in one file', function () {
    bulkImportDept('BSIT');
    bulkImportDept('EDUC');
    $actor = bulkImportActor('csg_admin');

    $file = bulkImportFile([
        ['2023000001', 'Cruz', 'Juan', 'Dela', '', 'BSIT', '1', 'A'],
        ['2023000002', 'Reyes', 'Ana', 'Santos', '', 'EDUC', '1', 'A'],
    ]);

    $report = (new BulkImportStudents)($file, $actor);

    expect($report['imported'])->toBe(2)->and($report['failed'])->toBe(0);
});

it('flags rows outside an sc admin\'s administered department, but still imports rows within it', function () {
    $bsit = bulkImportDept('BSIT');
    bulkImportDept('EDUC');
    $actor = bulkImportActor('sc_admin', $bsit->id);

    $file = bulkImportFile([
        ['2023000001', 'Cruz', 'Juan', 'Dela', '', 'BSIT', '1', 'A'],
        ['2023000002', 'Reyes', 'Ana', 'Santos', '', 'EDUC', '1', 'A'],
    ]);

    $report = (new BulkImportStudents)($file, $actor);

    expect($report['imported'])->toBe(1)
        ->and($report['failed'])->toBe(1)
        ->and($report['errors'][0]['reasons'][0])->toContain('Outside your administered department');

    expect(Student::where('student_number', '2023000001')->exists())->toBeTrue()
        ->and(Student::where('student_number', '2023000002')->exists())->toBeFalse();
});

it('throws when the file has more data rows than the synchronous import cap', function () {
    bulkImportDept('BSIT');
    $actor = bulkImportActor('csg_admin');

    $rows = [];
    for ($i = 1; $i <= BulkImportStudents::MAX_ROWS + 1; $i++) {
        $rows[] = [sprintf('2023%06d', $i), 'Cruz', 'Juan', 'Dela', '', 'BSIT', '1', 'A'];
    }
    $file = bulkImportFile($rows);

    (new BulkImportStudents)($file, $actor);
})->throws(TooManyImportRowsException::class);
