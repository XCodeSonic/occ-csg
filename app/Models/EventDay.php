<?php

namespace App\Models;

use App\Domain\Enums\SessionStatus;
use App\Domain\Enums\WindowType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EventDay extends Model
{
    protected $fillable = ['event_id', 'date', 'day_number'];

    protected function casts(): array
    {
        return ['date' => 'date'];
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(EventModel::class, 'event_id');
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(AttendanceSession::class);
    }

    /**
     * There's no separate `status` column on event_days (see the
     * exclusions/attendance_sessions migration notes) — a day's own
     * upcoming/ongoing/ended state (student-exclusion-feature-plan.md
     * §3) is derived from its sessions instead of stored redundantly. A
     * day counts as "ended" once it has at least one scheduled session
     * and every session under it (every window, every check) has ended.
     * A day with zero sessions yet is never "ended" — there's nothing to
     * have finished, and it also can't be excluded at all yet (see rule
     * 3: schedule must exist first) so callers checking hasEnded() as a
     * gate before allowing an exclusion are already covered by that
     * separate existence check.
     *
     * @param  bool  $forUpdate  student-exclusion-feature-plan.md §6a
     *                           point 2: the ended/active check must be
     *                           atomic at commit time, not just read
     *                           optimistically. Pass true from inside a
     *                           DB transaction (CreateExclusion,
     *                           RemoveExclusion) to lock every underlying
     *                           attendance_sessions row this reads before
     *                           evaluating it — the exact rows EndSession
     *                           itself locks via `lockForUpdate()` when
     *                           it flips one to Ended — so a concurrent
     *                           "end this session" and "exclude from this
     *                           day" can never both read a stale
     *                           not-ended status past each other. Report-
     *                           building callers outside a transaction
     *                           should leave this false.
     */
    public function hasEnded(bool $forUpdate = false): bool
    {
        $query = $this->sessions();

        if ($forUpdate) {
            $query->lockForUpdate();
        }

        return $query->exists()
            && ! $this->sessions()
                ->when($forUpdate, fn ($q) => $q->lockForUpdate())
                ->where('status', '!=', SessionStatus::Ended->value)
                ->exists();
    }

    /**
     * Same derivation as hasEnded(), narrowed to one window_type
     * ("Day 2 Morning") — a window is ended once every check
     * (time-in/time-out) under that day+window_type has ended.
     *
     * @param  bool  $forUpdate  See hasEnded()'s docblock.
     */
    public function windowHasEnded(WindowType $windowType, bool $forUpdate = false): bool
    {
        return $this->sessions()
            ->where('window_type', $windowType->value)
            ->when($forUpdate, fn ($q) => $q->lockForUpdate())
            ->exists()
            && ! $this->sessions()
                ->where('window_type', $windowType->value)
                ->when($forUpdate, fn ($q) => $q->lockForUpdate())
                ->where('status', '!=', SessionStatus::Ended->value)
                ->exists();
    }

    /**
     * Whether this day currently has any session at all for the given
     * window_type — student-exclusion-feature-plan.md §2 rule 3 / §5:
     * CSG can only target a Day/Window that already exists on the event.
     */
    public function hasWindow(WindowType $windowType): bool
    {
        return $this->sessions()->where('window_type', $windowType->value)->exists();
    }
}
