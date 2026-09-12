<?php

namespace App\Http\Controllers\Events;

use App\Application\Actions\Events\CreateEventDay;
use App\Http\Controllers\Controller;
use App\Http\Requests\Events\StoreEventDayRequest;
use App\Models\EventModel;

class EventDayController extends Controller
{
    public function store(StoreEventDayRequest $request, EventModel $event, CreateEventDay $createEventDay)
    {
        $day = $createEventDay($event, $request->validated());

        return response()->json($day, 201);
    }
}
