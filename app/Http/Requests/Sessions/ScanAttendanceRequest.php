<?php

namespace App\Http\Requests\Sessions;

use Illuminate\Foundation\Http\FormRequest;

class ScanAttendanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Any authenticated staff account may scan. If specific roles
        // (e.g. only Officer/ScAdmin/CsgAdmin, not Student) turn out to be
        // spec'd as scan-eligible, tighten this to a Gate/Policy check.
        return true;
    }

    public function rules(): array
    {
        return [
            'token' => ['required', 'string'],
        ];
    }
}
