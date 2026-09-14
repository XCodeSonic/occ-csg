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

    /**
     * Spec §3/§10: scanning is the Officer's job at the gate, with every
     * admin role able to do it too (an admin covering a shift, testing a
     * scanner, etc.). A plain Student is never a valid scanner — they're
     * the thing being scanned, not the one holding the device — so
     * Student is deliberately the one role left out here.
     *
     * This was previously wide open ("any authenticated account") per an
     * explicit TODO-style comment on ScanAttendanceRequest; tightened to
     * match every other sensitive endpoint in this app, which gates on a
     * real role check rather than "logged in at all."
     */
    public function scan(Student $user): bool
    {
        return in_array($user->role, [
            Role::SystemAdmin,
            Role::CsgAdmin,
            Role::ScAdmin,
            Role::Officer,
        ], true);
    }
}
