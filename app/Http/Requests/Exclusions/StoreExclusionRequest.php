<?php

namespace App\Http\Requests\Exclusions;

use App\Domain\Enums\ExclusionScope;
use App\Domain\Enums\WindowType;
use App\Models\Exclusion;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreExclusionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Exclusion::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'student_number' => ['required_without:qr_token', 'nullable', 'string'],
            'qr_token' => ['required_without:student_number', 'nullable', 'string'],

            'event_id' => ['required', 'integer', 'exists:events,id'],
            'scope' => ['required', Rule::enum(ExclusionScope::class)],
            'window_type' => ['required_if:scope,window_type', 'nullable', Rule::enum(WindowType::class)],
            'session_id' => ['required_if:scope,session', 'nullable', 'integer', 'exists:attendance_sessions,id'],
        ];
    }
}
