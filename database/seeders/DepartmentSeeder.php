<?php

namespace Database\Seeders;

use App\Models\Department;
use Illuminate\Database\Seeder;

class DepartmentSeeder extends Seeder
{
    /**
     * Spec §3: BSBA, BSIT, EDUC are seeded by default; CSG Admin adds more
     * from here on via POST /api/departments.
     */
    public function run(): void
    {
        foreach ([
            ['code' => 'BSBA', 'name' => 'Bachelor of Science in Business Administration'],
            ['code' => 'BSIT', 'name' => 'Bachelor of Science in Information Technology'],
            ['code' => 'EDUC', 'name' => 'College of Education'],
        ] as $department) {
            Department::firstOrCreate(['code' => $department['code']], $department);
        }
    }
}
