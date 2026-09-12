<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EventDay extends Model
{
    protected $fillable = ['event_id', 'date', 'day_number'];

    protected function casts(): array
    {
        return ['date' => 'date'];
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(EventModel::class, 'event_id');
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(AttendanceSession::class);
    }
}
