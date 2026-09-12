<?php

namespace App\Policies;

use App\Domain\Enums\Role;
use App\Models\Student;

class DepartmentPolicy
{
    /**
     * Every authenticated account needs the department list for dropdowns
     * (student creation, event scoping, etc.) — spec §3 doesn't restrict
     * viewing, only creation.
     */
    public function viewAny(Student $user): bool
    {
        return true;
    }

    /**
     * Adding departments is a CSG-level power (spec §3), same tier as
     * exclusions: System Admin carries every CSG Admin power.
     */
    public function create(Student $user): bool
    {
        return in_array($user->role, [Role::SystemAdmin, Role::CsgAdmin], true);
    }
}
