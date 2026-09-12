<?php

namespace App\Policies;

use App\Domain\Enums\Role;
use App\Models\Exclusion;
use App\Models\Student;

class ExclusionPolicy
{
    /**
     * Exclusions are a CSG-level power (spec §2): System Admin carries every
     * CSG Admin power; SC Admin, Officer, and Student do not manage exclusions.
     */
    public function create(Student $user): bool
    {
        return in_array($user->role, [Role::SystemAdmin, Role::CsgAdmin], true);
    }

    public function delete(Student $user, Exclusion $exclusion): bool
    {
        return $this->create($user);
    }
}
