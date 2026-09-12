<?php

namespace App\Domain\Exceptions;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

final class SessionNotInEventException extends RuntimeException
{
    public function __construct(string $message = 'The given session does not belong to the given event.')
    {
        parent::__construct($message);
    }

    public function render(Request $request): JsonResponse
    {
        return response()->json(['message' => $this->getMessage()], 422);
    }
}
