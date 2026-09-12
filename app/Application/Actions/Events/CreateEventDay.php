<?php

namespace App\Application\Actions\Events;

use App\Models\EventDay;
use App\Models\EventModel;

final class CreateEventDay
{
    /**
     * @param array{date: string, day_number: int} $data
     */
    public function __invoke(EventModel $event, array $data): EventDay
    {
        return EventDay::create([
            'event_id' => $event->id,
            'date' => $data['date'],
            'day_number' => $data['day_number'],
        ]);
    }
}
