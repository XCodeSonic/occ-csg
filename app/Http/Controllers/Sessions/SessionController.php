<?php

namespace App\Http\Controllers\Sessions;

use App\Application\Actions\Sessions\CreateSession;
use App\Http\Controllers\Controller;
use App\Http\Requests\Sessions\StoreSessionRequest;
use App\Models\EventDay;

class SessionController extends Controller
{
    public function store(StoreSessionRequest $request, EventDay $eventDay, CreateSession $createSession)
    {
        $session = $createSession($eventDay, $request->validated());

        return response()->json($session, 201);
    }
}
