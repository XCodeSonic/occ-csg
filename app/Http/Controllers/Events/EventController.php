<?php

namespace App\Http\Controllers\Events;

use App\Application\Actions\Events\CreateEvent;
use App\Http\Controllers\Controller;
use App\Http\Requests\Events\StoreEventRequest;
use App\Models\EventModel;
use Illuminate\Support\Facades\Gate;

class EventController extends Controller
{
    public function index()
    {
        Gate::authorize('viewAny', EventModel::class);

        return response()->json(
            EventModel::with(['days.sessions', 'semester.academicYear', 'departments'])->orderByDesc('id')->get()
        );
    }

    public function store(StoreEventRequest $request, CreateEvent $createEvent)
    {
        $event = $createEvent($request->validated(), $request->user());

        return response()->json($event, 201);
    }
}
