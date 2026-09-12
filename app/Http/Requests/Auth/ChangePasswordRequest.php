<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class ChangePasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Any authenticated account may change its own password —
        // there's nothing role-specific about this action.
        return true;
    }

    public function rules(): array
    {
        return [
            'current_password' => ['required', 'string'],
            // 'confirmed' expects a matching new_password_confirmation field.
            // 'different' stops someone from "changing" it to the same value
            // just to clear the must_change_password flag.
            'new_password' => ['required', 'string', 'min:8', 'confirmed', 'different:current_password'],
        ];
    }
}
