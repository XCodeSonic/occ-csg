<?php

namespace App\Policies;

use App\Domain\Enums\Role;
use App\Models\Student;

class AttendanceSessionPolicy
{
    /**
     * Spec §10 groups GET /sessions/{id}/report with the other
     * administration endpoints, not the Officer's scan endpoint — an
     * Officer runs the scanner but doesn't get the roster-level report,
     * mirroring StudentPolicy::viewAny. Row-level department scoping for
     * SC Admin (own department only) is applied in the controller, since
     * it depends on which students appear in the report, not on whether
     * the session itself is viewable.
     */
    public function viewReport(Student $user): bool
    {
        return in_array($user->role, [Role::SystemAdmin, Role::CsgAdmin, Role::ScAdmin], true);
    }
}
