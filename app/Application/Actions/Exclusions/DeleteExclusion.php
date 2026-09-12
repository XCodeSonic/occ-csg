<?php

namespace App\Application\Actions\Exclusions;

use App\Models\Exclusion;

final class DeleteExclusion
{
    public function __invoke(Exclusion $exclusion): void
    {
        $exclusion->delete();
    }
}
