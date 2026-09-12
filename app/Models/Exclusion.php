<?php

namespace App\Models;

use App\Domain\Enums\ExclusionScope;
use App\Domain\Enums\WindowType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Exclusion extends Model
{
    protected $fillable = [
        'student_id', 'event_id', 'scope', 'window_type', 'session_id', 'created_by',
    ];

    public static function excludedStudentIdsForSession(\App\Models\AttendanceSession $session): array
    {
        return static::where('event_id', $session->eventDay->event_id)
            ->where(function ($query) use ($session) {
                $query->where('scope', ExclusionScope::Event->value)
                    ->orWhere(function ($q) use ($session) {
                        $q->where('scope', ExclusionScope::WindowType->value)
                            ->where('window_type', $session->window_type->value);
                    })
                    ->orWhere(function ($q) use ($session) {
                        $q->where('scope', ExclusionScope::Session->value)
                            ->where('session_id', $session->id);
                    });
            })
            ->pluck('student_id')
            ->all();
    }

    protected function casts(): array
    {
        return [
            'scope' => ExclusionScope::class,
            'window_type' => WindowType::class,
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(EventModel::class, 'event_id');
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(AttendanceSession::class, 'session_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'created_by');
    }
}
