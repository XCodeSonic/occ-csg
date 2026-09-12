<?php

namespace Database\Seeders;

use App\Domain\Enums\Role;
use App\Domain\ValueObjects\QrPayload;
use App\Models\Department;
use App\Models\Student;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class StudentSeeder extends Seeder
{
    /**
     * Every test account uses this password directly (not the
     * must-change-password default) so you can log in and get straight to
     * testing a role's screens instead of going through the change-password
     * gate every time you reseed. Real, bulk-imported students still go
     * through CreateStudent and keep the spec's actual password123 +
     * forced-change flow — this seeder is for local/dev testing only.
     */
    private const TEST_PASSWORD = 'password123';

    public function run(): void
    {
        $bsba = Department::where('code', 'BSBA')->firstOrFail();
        $bsit = Department::where('code', 'BSIT')->firstOrFail();
        $educ = Department::where('code', 'EDUC')->firstOrFail();

        $this->makeStudent([
            'student_number' => 'TEST-SYSADMIN',
            'last_name' => 'Reyes',
            'first_name' => 'Sofia',
            'department_id' => $bsit->id,
            'year_level' => '4',
            'section' => '4A',
            'role' => Role::SystemAdmin,
        ]);

        $this->makeStudent([
            'student_number' => 'TEST-CSGADMIN',
            'last_name' => 'Santos',
            'first_name' => 'Miguel',
            'department_id' => $bsit->id,
            'year_level' => '4',
            'section' => '4A',
            'role' => Role::CsgAdmin,
        ]);

        $this->makeStudent([
            'student_number' => 'TEST-SCADMIN-BSIT',
            'last_name' => 'Cruz',
            'first_name' => 'Andrea',
            'department_id' => $bsit->id,
            'year_level' => '3',
            'section' => '3A',
            'role' => Role::ScAdmin,
            'sc_admin_department_id' => $bsit->id,
        ]);

        $this->makeStudent([
            'student_number' => 'TEST-SCADMIN-BSBA',
            'last_name' => 'Dela Cruz',
            'first_name' => 'Paolo',
            'department_id' => $bsba->id,
            'year_level' => '3',
            'section' => '3A',
            'role' => Role::ScAdmin,
            'sc_admin_department_id' => $bsba->id,
        ]);

        $this->makeStudent([
            'student_number' => 'TEST-OFFICER',
            'last_name' => 'Bautista',
            'first_name' => 'Liam',
            'department_id' => $educ->id,
            'year_level' => '2',
            'section' => '2A',
            'role' => Role::Officer,
        ]);

        // A handful of plain students across departments/sections so the
        // roster/report screens (and their group-by-section, sort-by-last-
        // name logic) have more than one row to actually demonstrate.
        $students = [
            ['student_number' => 'TEST-STUDENT-1', 'last_name' => 'Villanueva', 'first_name' => 'Kim', 'department_id' => $bsit->id, 'year_level' => '1', 'section' => '1A'],
            ['student_number' => 'TEST-STUDENT-2', 'last_name' => 'Aquino', 'first_name' => 'Bea', 'department_id' => $bsit->id, 'year_level' => '1', 'section' => '1A'],
            ['student_number' => 'TEST-STUDENT-3', 'last_name' => 'Mendoza', 'first_name' => 'Carlo', 'department_id' => $bsit->id, 'year_level' => '1', 'section' => '1A'],
            ['student_number' => 'TEST-STUDENT-4', 'last_name' => 'Garcia', 'first_name' => 'Diane', 'department_id' => $bsba->id, 'year_level' => '2', 'section' => '2B'],
            ['student_number' => 'TEST-STUDENT-5', 'last_name' => 'Torres', 'first_name' => 'Ella', 'department_id' => $bsba->id, 'year_level' => '2', 'section' => '2B'],
            ['student_number' => 'TEST-STUDENT-6', 'last_name' => 'Ramos', 'first_name' => 'Faith', 'department_id' => $educ->id, 'year_level' => '1', 'section' => '1A'],
        ];

        foreach ($students as $student) {
            $this->makeStudent([...$student, 'role' => Role::Student]);
        }
    }

    /**
     * @param array{
     *     student_number: string,
     *     last_name: string,
     *     first_name: string,
     *     department_id: int,
     *     year_level: string,
     *     section: string,
     *     role: Role,
     *     sc_admin_department_id?: int,
     *     officer_event_id?: int,
     * } $data
     */
    private function makeStudent(array $data): Student
    {
        $student = Student::updateOrCreate(
            ['student_number' => $data['student_number']],
            [
                'last_name' => $data['last_name'],
                'first_name' => $data['first_name'],
                'department_id' => $data['department_id'],
                'year_level' => $data['year_level'],
                'section' => $data['section'],
                'role' => $data['role'],
                'sc_admin_department_id' => $data['sc_admin_department_id'] ?? null,
                'officer_event_id' => $data['officer_event_id'] ?? null,
                'username' => $data['student_number'],
                'password' => Hash::make(self::TEST_PASSWORD),
                // Test accounts skip the forced reset so you can log
                // straight into whichever role you're testing.
                'must_change_password' => false,
            ],
        );

        $student->refresh();

        $student->update([
            'qr_token' => QrPayload::forStudent($student->student_number, $student->qr_version)->encrypt(),
        ]);

        return $student;
    }
}
