<?php

namespace App\Policies;

use App\Domain\Enums\Role;
use App\Models\Student;

/**
 * Named EventModelPolicy (not EventPolicy) because the Eloquent model is
 * App\Models\EventModel — Laravel's policy auto-discovery guesses the
 * policy class from the model's class name, not the table name.
 */
class EventModelPolicy
{
    public function viewAny(Student $user): bool
    {
        return true;
    }

    /**
     * Spec §6/§10: creating events, days, and sessions is all one CSG-level
     * power ("create/manage events, windows, sessions"), so this single
     * check gates all three creation endpoints — not scoped per-event since
     * events aren't department-owned.
     */
    public function create(Student $user): bool
    {
        return in_array($user->role, [Role::SystemAdmin, Role::CsgAdmin], true);
    }

    /**
     * The report request's printable roster groups with the other
     * roster/report endpoints — mirrors AttendanceSessionPolicy::viewReport
     * exactly (same three roles, same reasoning: an Officer runs the
     * scanner, not the paperwork). Row-level department scoping for an
     * SC Admin is applied in the controller, same as SessionReportController.
     */
    public function viewRosterReport(Student $user): bool
    {
        return in_array($user->role, [Role::SystemAdmin, Role::CsgAdmin, Role::ScAdmin], true);
    }

    /**
     * Ending an event is the same CSG-level power as creating one (spec
     * §6/§10 groups event lifecycle management together) — same two
     * roles as create().
     */
    public function end(Student $user): bool
    {
        return in_array($user->role, [Role::SystemAdmin, Role::CsgAdmin], true);
    }
}
