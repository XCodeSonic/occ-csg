<?php

namespace App\Application\Actions\Sessions;

use App\Domain\Enums\EventStatus;
use App\Domain\Enums\SessionStatus;
use App\Domain\Exceptions\EventAlreadyEndedException;
use App\Domain\Exceptions\SessionNotScheduledException;
use App\Models\AttendanceSession;
use Illuminate\Support\Facades\DB;

final class StartSession
{
    /**
     * Move a session scheduled → ongoing. This is a manual, human-triggered
     * transition (spec §7.2 already treats ending as manual because "real
     * events run behind schedule" — the same is true of starting: a
     * clock-based auto-start is unreliable on shared hosting with no
     * queue/cron worker, and unreliable per-device besides, since a
     * scanning phone's clock can be minutes off in either direction. So a
     * CSG Admin taps Start on the session card, same as End.
     *
     * @throws SessionNotScheduledException if the session is already
     *         ongoing or has already ended.
     * @throws EventAlreadyEndedException if the session's parent event has
     *         already been ended by CSG — see App\Application\Actions\Events\EndEvent.
     *         A session left `scheduled` when its event ended is never
     *         force-transitioned (nothing to finalize), but it also can't
     *         be started afterward: the event is over.
     */
    public function __invoke(AttendanceSession $session): AttendanceSession
    {
        return DB::transaction(function () use ($session) {
            // Lock the row so two concurrent "start" taps can't both pass
            // the status check — mirrors EndSession's use of lockForUpdate.
            $locked = AttendanceSession::whereKey($session->id)->lockForUpdate()->first();

            if ($locked->status !== SessionStatus::Scheduled) {
                throw new SessionNotScheduledException;
            }

            if ($locked->eventDay->event->status === EventStatus::Ended) {
                throw new EventAlreadyEndedException(
                    'Cannot start this session because its event has already been ended.'
                );
            }

            $locked->update(['status' => SessionStatus::Ongoing]);

            return $locked;
        });
    }
}   
