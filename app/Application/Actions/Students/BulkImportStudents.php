<?php

namespace App\Application\Actions\Students;

use App\Domain\Enums\Role;
use App\Domain\Exceptions\TooManyImportRowsException;
use App\Imports\StudentsImport;
use App\Models\Department;
use App\Models\Student;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Facades\Excel;
use Throwable;

final class BulkImportStudents
{
    /**
     * Spec §12: "do not include reverb or queue because I'm hosting it in
     * shared hosting" rules out the queued-import path §4.2 originally
     * suggested. This whole method runs inside a single request, so this
     * cap exists to keep one upload comfortably inside a typical
     * shared-host max_execution_time — a spreadsheet bigger than this
     * needs to be split and imported in batches instead.
     */
    public const MAX_ROWS = 1000;

    /**
     * Validates the file and reports what a real import would do —
     * row-by-row — without writing anything to the database. Lets an
     * admin review a spreadsheet (wrong department code, a typo'd ID,
     * students that already exist) before committing 1,000 rows in one
     * shot, which was previously irreversible from the UI the moment
     * the file was chosen.
     *
     * @return array{
     *     total_rows: int,
     *     valid: int,
     *     invalid: int,
     *     rows: array<int, array{
     *         row: int, valid: bool, reasons: array<int, string>,
     *         student_number: ?string, last_name: ?string, first_name: ?string,
     *         middle_name: ?string, suffix: ?string, department_code: ?string,
     *         year_level: ?string, section: ?string,
     *     }>,
     * }
     */
    public function preview(UploadedFile $file, Student $actor): array
    {
        return $this->process($file, $actor, commit: false);
    }

    /**
     * @return array{
     *     total_rows: int,
     *     imported: int,
     *     failed: int,
     *     errors: array<int, array{row: int, student_number: ?string, reasons: array<int, string>}>,
     * }
     */
    public function __invoke(UploadedFile $file, Student $actor): array
    {
        $result = $this->process($file, $actor, commit: true);

        return [
            'total_rows' => $result['total_rows'],
            'imported' => $result['valid'],
            'failed' => $result['invalid'],
            'errors' => collect($result['rows'])
                ->filter(fn (array $row) => ! $row['valid'])
                ->map(fn (array $row) => [
                    'row' => $row['row'],
                    'student_number' => $row['student_number'],
                    'reasons' => $row['reasons'],
                ])
                ->values()
                ->all(),
        ];
    }

    /**
     * Shared row-by-row pass used by both preview() and __invoke(). Every
     * row is validated exactly the same way regardless of $commit, so a
     * row the preview marked valid is guaranteed to import cleanly later
     * — the only thing $commit changes is whether CreateStudent actually
     * runs for it.
     */
    private function process(UploadedFile $file, Student $actor, bool $commit): array
    {
        $import = new StudentsImport;
        Excel::import($import, $file);
        $rows = $import->rows;

        if ($rows->count() > self::MAX_ROWS) {
            throw new TooManyImportRowsException(self::MAX_ROWS, $rows->count());
        }

        $departmentsByCode = Department::all()->keyBy(fn ($d) => strtoupper($d->code));
        $seenNumbers = [];
        $results = [];

        foreach ($rows as $index => $row) {
            // Row 1 is the heading row, so the first data row is 2 —
            // matching the row number a person would see if they opened
            // the file in Excel and needed to go fix something.
            $lineNumber = $index + 2;
            $studentNumber = trim((string) ($row['student_number'] ?? ''));

            $reasons = $this->validateRow($row, $studentNumber, $seenNumbers, $departmentsByCode, $actor);
            $isValid = $reasons === [];

            if ($isValid) {
                $seenNumbers[$studentNumber] = true;
            }

            if ($isValid && $commit) {
                $department = $departmentsByCode[strtoupper(trim((string) $row['department_code']))];

                try {
                    (new CreateStudent)([
                        'student_number' => $studentNumber,
                        'last_name' => trim((string) $row['last_name']),
                        'first_name' => trim((string) $row['first_name']),
                        'middle_name' => $this->nullableTrim($row['middle_name'] ?? null),
                        'suffix' => $this->nullableTrim($row['suffix'] ?? null),
                        'department_id' => $department->id,
                        'year_level' => trim((string) $row['year_level']),
                        'section' => $this->nullableTrim($row['section'] ?? null),
                    ]);
                } catch (Throwable $e) {
                    // A row can still fail here despite passing validateRow()
                    // — e.g. a duplicate student_number created by a
                    // *different concurrent* import between our upfront check
                    // and this insert. Recorded as a normal per-row failure
                    // rather than aborting the rest of the file.
                    $isValid = false;
                    $reasons = ['Could not be created: '.$e->getMessage()];
                }
            }

            $results[] = [
                'row' => $lineNumber,
                'valid' => $isValid,
                'reasons' => $reasons,
                'student_number' => $studentNumber ?: null,
                'last_name' => $this->nullableTrim($row['last_name'] ?? null),
                'first_name' => $this->nullableTrim($row['first_name'] ?? null),
                'middle_name' => $this->nullableTrim($row['middle_name'] ?? null),
                'suffix' => $this->nullableTrim($row['suffix'] ?? null),
                'department_code' => $this->nullableTrim($row['department_code'] ?? null),
                'year_level' => $this->nullableTrim($row['year_level'] ?? null),
                'section' => $this->nullableTrim($row['section'] ?? null),
            ];
        }

        $validCount = count(array_filter($results, fn (array $r) => $r['valid']));

        return [
            'total_rows' => $rows->count(),
            'valid' => $validCount,
            'invalid' => count($results) - $validCount,
            'rows' => $results,
        ];
    }

    /**
     * @param  array<string, bool>  $seenNumbers  Student numbers already
     *                                             committed to earlier in
     *                                             *this same* file.
     * @return array<int, string>
     */
    private function validateRow(
        Collection $row,
        string $studentNumber,
        array $seenNumbers,
        Collection $departmentsByCode,
        Student $actor,
    ): array {
        $reasons = [];

        foreach (['student_number', 'last_name', 'first_name', 'middle_name', 'department_code', 'year_level'] as $field) {
            if (trim((string) ($row[$field] ?? '')) === '') {
                $reasons[] = "Missing required field: {$field}";
            }
        }

        // Every reason below needs a real student_number or department_code
        // to check against, so stop here rather than reporting confusing
        // secondary errors off an already-missing field.
        if ($reasons !== []) {
            return $reasons;
        }

        if (isset($seenNumbers[$studentNumber])) {
            $reasons[] = 'Duplicate student ID within this file';
        } elseif (Student::where('student_number', $studentNumber)->exists()) {
            $reasons[] = 'Student ID already exists';
        }

        $departmentCode = strtoupper(trim((string) $row['department_code']));
        $department = $departmentsByCode->get($departmentCode);

        if ($department === null) {
            $reasons[] = "Unknown department code: {$departmentCode}";
        } elseif (! $actor->can('create', [Student::class, $department->id])) {
            // Spec §4.1: SC Admin may only add within their own
            // department — surfaced per-row (not as a blanket 403) since
            // a CSG Admin's file legitimately mixes departments while an
            // SC Admin's shouldn't contain any outside their own.
            $reasons[] = $actor->role === Role::ScAdmin
                ? "Outside your administered department (row is {$departmentCode})"
                : 'Not authorized to add students to this department';
        }

        return $reasons;
    }

    private function nullableTrim(?string $value): ?string
    {
        $trimmed = trim((string) $value);

        return $trimmed === '' ? null : $trimmed;
    }
}
