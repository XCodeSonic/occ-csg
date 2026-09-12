<?php

use App\Models\Department;
use App\Models\Student;
use Illuminate\Http\UploadedFile;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function bulkImportPreviewApiDept(string $code): Department
{
    return Department::firstOrCreate(['code' => $code], ['name' => $code]);
}

function bulkImportPreviewApiStaff(string $role, string $studentNumber): Student
{
    return Student::create([
        'student_number' => $studentNumber,
        'last_name' => 'Staff', 'first_name' => 'Test',
        'department_id' => bulkImportPreviewApiDept('CCS')->id,
        'username' => 'staff'.$studentNumber,
        'password' => 'password',
        'role' => $role,
    ]);
}

function bulkImportPreviewApiCsv(array $rows): UploadedFile
{
    $headers = ['student_number', 'last_name', 'first_name', 'middle_name', 'suffix', 'department_code', 'year_level', 'section'];
    $lines = [implode(',', $headers)];

    foreach ($rows as $row) {
        $lines[] = implode(',', array_map(fn ($v) => (string) ($v ?? ''), $row));
    }

    return UploadedFile::fake()->createWithContent('import.csv', implode("\n", $lines));
}

it('rejects an unauthenticated preview request', function () {
    $this->postJson('/api/students/bulk-import/preview', [])->assertStatus(401);
});

it('rejects an officer attempting a preview', function () {
    $officer = bulkImportPreviewApiStaff('officer', '2020200001');

    $this->actingAs($officer, 'sanctum')
        ->postJson('/api/students/bulk-import/preview', [])
        ->assertStatus(403);
});

it('previews a file without creating any students', function () {
    bulkImportPreviewApiDept('BSIT');
    $admin = bulkImportPreviewApiStaff('csg_admin', '2020000001');
    $file = bulkImportPreviewApiCsv([
        ['2023000001', 'Cruz', 'Juan', 'Dela', '', 'BSIT', '1', 'A'],
    ]);

    $this->actingAs($admin, 'sanctum')
        ->post('/api/students/bulk-import/preview', ['file' => $file])
        ->assertStatus(200)
        ->assertJsonPath('valid', 1)
        ->assertJsonPath('invalid', 0)
        ->assertJsonPath('rows.0.student_number', '2023000001');

    expect(Student::where('student_number', '2023000001')->exists())->toBeFalse();
});

it('returns 422 when a previewed file exceeds the synchronous row cap', function () {
    bulkImportPreviewApiDept('BSIT');
    $admin = bulkImportPreviewApiStaff('csg_admin', '2020000001');

    $rows = [];
    for ($i = 1; $i <= \App\Application\Actions\Students\BulkImportStudents::MAX_ROWS + 1; $i++) {
        $rows[] = [sprintf('2023%06d', $i), 'Cruz', 'Juan', 'Dela', '', 'BSIT', '1', 'A'];
    }

    $this->actingAs($admin, 'sanctum')
        ->post('/api/students/bulk-import/preview', ['file' => bulkImportPreviewApiCsv($rows)])
        ->assertStatus(422);
});
