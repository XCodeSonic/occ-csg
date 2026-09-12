<?php

namespace App\Http\Controllers\Exclusions;

use App\Application\Actions\Exclusions\CreateExclusion;
use App\Application\Actions\Exclusions\DeleteExclusion;
use App\Http\Controllers\Controller;
use App\Http\Requests\Exclusions\StoreExclusionRequest;
use App\Models\Exclusion;
use Illuminate\Support\Facades\Gate;

class ExclusionController extends Controller
{
    public function store(StoreExclusionRequest $request, CreateExclusion $createExclusion)
    {
        $exclusion = $createExclusion($request->validated(), $request->user());

        return response()->json($exclusion->fresh(['student', 'event', 'session']), 201);
    }

    public function destroy(Exclusion $exclusion, DeleteExclusion $deleteExclusion)
    {
        // No dedicated FormRequest for delete (no body to validate, same
        // reasoning as EndSessionController) — gate it directly instead.
        Gate::authorize('delete', $exclusion);

        $deleteExclusion($exclusion);

        return response()->noContent();
    }
}
