<?php

namespace Database\Seeders;

use App\Domain\Enums\CheckType;
use App\Domain\Enums\SessionStatus;
use App\Domain\Enums\WindowType;
use App\Domain\ValueObjects\QrPayload;
use App\Models\AttendanceSession;
use App\Models\Department;
use App\Models\EventDay;
use App\Models\EventModel;
use App\Models\Student;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Not run by DatabaseSeeder's default chain — this is a manual, opt-in
 * stress-test fixture, not part of a normal fresh install. Run it with:
 *
 *   php artisan db:seed --class=Database\\Seeders\\LoadTestStudentSeeder
 *
 * Builds the exact shape asked about: 3 departments (BSBA, BSIT, EDUC) x
 * 4 year levels x 13 sections (A-M) x 50 students = 7,800 students, which
 * is 156 roster-report groups/sheets — a good stand-in for "the whole
 * school, every section, right before an event" instead of the handful
 * of rows StudentSeeder gives you. It also creates one sample event with
 * a single time-in session so /events/{id}/roster-report has something
 * real to render across all 156 groups, so you can actually time the
 * xlsx/pdf download end to end.
 *
 * Re-runnable: everything it creates is prefixed LOAD- (students) or
 * named "Load Test — <n> Students" (the event), and both are deleted at
 * the top of run() before regenerating, so running this twice never
 * hits a duplicate student_number/username collision.
 */
class LoadTestStudentSeeder extends Seeder
{
    private const YEAR_LEVELS = ['1', '2', '3', '4'];

    private const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];

    private const STUDENTS_PER_SECTION = 50;

    // Every load-test account shares this password (bcrypt is ~50-100ms
    // per hash — hashing it 7,800 times separately would make the seeder
    // itself the slow part). Fine for a throwaway local/staging fixture,
    // never do this for real bulk-imported students.
    private const TEST_PASSWORD = 'password123';

    private const LAST_NAMES = [
        'Santos', 'Reyes', 'Cruz', 'Bautista', 'Ocampo', 'Garcia', 'Mendoza', 'Torres',
        'Flores', 'Ramos', 'Villanueva', 'Castillo', 'Del Rosario', 'Aquino', 'Marquez',
        'Navarro', 'Domingo', 'Pascual', 'Salazar', 'Gonzales', 'Fernandez', 'Rivera',
        'Diaz', 'Morales', 'Castro', 'Ortega', 'Guerrero', 'Medina', 'Herrera', 'Vargas',
        'Dela Cruz', 'Espiritu', 'Manalo', 'Tolentino', 'Bernardo', 'Lazaro', 'Roque',
        'Sarmiento', 'Valdez', 'Ignacio', 'Cabrera', 'Villareal', 'Macatangay', 'Panganiban',
    ];

    private const FIRST_NAMES = [
        'Juan', 'Maria', 'Jose', 'Ana', 'Miguel', 'Sofia', 'Carlo', 'Bea', 'Diane',
        'Ella', 'Faith', 'Liam', 'Kim', 'Andrea', 'Paolo', 'Mark', 'Grace', 'John',
        'Angel', 'Kevin', 'Nicole', 'Christian', 'Jasmine', 'Rafael', 'Alyssa', 'Daniel',
        'Camille', 'Vincent', 'Erika', 'Joshua', 'Michelle', 'Aaron', 'Patricia', 'Bryan',
        'Samantha', 'Gabriel', 'Trisha', 'Nathan', 'Kyla', 'Adrian',
    ];

    public function run(): void
    {
        $this->command?->info('Clearing any previous load-test data…');
        Student::where('student_number', 'like', 'LOAD-%')->delete();
        EventModel::where('name', 'like', 'Load Test —%')->delete();

        $departments = Department::whereIn('code', ['BSBA', 'BSIT', 'EDUC'])->get()->keyBy('code');

        foreach (['BSBA', 'BSIT', 'EDUC'] as $code) {
            if (! $departments->has($code)) {
                $this->command?->warn("Department {$code} not found — run DepartmentSeeder first. Skipping.");
            }
        }

        $creator = Student::where('role', 'csg_admin')->first()
            ?? Student::where('role', 'system_admin')->first();

        if (! $creator) {
            $this->command?->warn('No CSG/System Admin found — run StudentSeeder first so the sample event has an owner. Skipping the sample event.');
        }

        $seq = 1;
        $rowsInsertedTotal = 0;
        // Hashed once and reused for every row — bcrypt is ~50-100ms per
        // call, so hashing it fresh 7,800 times would make the seeder
        // itself the slow part of this whole exercise.
        $hashedPassword = Hash::make(self::TEST_PASSWORD);

        foreach ($departments as $code => $department) {
            foreach (self::YEAR_LEVELS as $yearLevel) {
                foreach (self::SECTIONS as $section) {
                    $rows = [];

                    for ($i = 0; $i < self::STUDENTS_PER_SECTION; $i++) {
                        $studentNumber = sprintf('LOAD-%05d', $seq);
                        $lastName = self::LAST_NAMES[($seq * 7) % count(self::LAST_NAMES)];
                        $firstName = self::FIRST_NAMES[($seq * 13) % count(self::FIRST_NAMES)];

                        $rows[] = [
                            'student_number' => $studentNumber,
                            'last_name' => $lastName,
                            'first_name' => $firstName,
                            'middle_name' => null,
                            'suffix' => null,
                            'department_id' => $department->id,
                            'year_level' => $yearLevel,
                            'section' => $section,
                            'role' => 'student',
                            'sc_admin_department_id' => null,
                            'photo_path' => null,
                            'qr_token' => QrPayload::forStudent($studentNumber, 1)->encrypt(),
                            'qr_version' => 1,
                            'username' => $studentNumber,
                            'password' => $hashedPassword,
                            'must_change_password' => false,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];

                        $seq++;
                    }

                    // One insert per section (50 rows) rather than one
                    // per student — 156 queries instead of 7,800.
                    Student::insert($rows);
                    $rowsInsertedTotal += count($rows);
                }
            }

            $this->command?->info("{$code}: inserted ".(count(self::YEAR_LEVELS) * count(self::SECTIONS) * self::STUDENTS_PER_SECTION).' students.');
        }

        $this->command?->info("Inserted {$rowsInsertedTotal} students across ".$departments->count().' departments.');

        if ($creator) {
            $this->seedSampleEvent($creator->id, $rowsInsertedTotal);
        }
    }

    /**
     * One event, one day, one still-open morning time-in session — enough
     * for BuildEventRosterReport to render a real "Pending" column across
     * all 156 groups so you can time the actual xlsx/pdf download, not
     * just the student count.
     */
    private function seedSampleEvent(int $createdBy, int $studentCount): void
    {
        $event = EventModel::create([
            'name' => "Load Test — {$studentCount} Students",
            'description' => 'Generated by LoadTestStudentSeeder to time the roster report export at full-school scale.',
            'created_by' => $createdBy,
        ]);

        $day = EventDay::create([
            'event_id' => $event->id,
            'date' => now()->toDateString(),
            'day_number' => 1,
        ]);

        AttendanceSession::create([
            'event_day_id' => $day->id,
            'window_type' => WindowType::Morning,
            'check_type' => CheckType::TimeIn,
            'start_time' => '07:00:00',
            'end_time' => '08:00:00',
            'grace_minutes' => 15,
            'penalty_late_amount' => 10,
            'penalty_absent_amount' => 25,
            'status' => SessionStatus::Ongoing,
        ]);

        $this->command?->info("Sample event created: \"{$event->name}\" (id {$event->id}) — try GET /api/events/{$event->id}/roster-report");
    }
}
