<?php

namespace App\Http\Requests\Events;

use App\Models\EventModel;
use Illuminate\Foundation\Http\FormRequest;

class StoreEventRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', EventModel::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            // The event's semester is no longer picked by the person
            // creating it — it's resolved server-side from whichever
            // semester is currently active (see CreateEvent), so there's
            // nothing to validate here.
        ];
    }
}
