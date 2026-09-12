<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendancePenalty extends Model
{
    protected $fillable = [
        'student_id', 'session_id', 'amount', 'reason', 'is_reversed', 'reversed_by',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'is_reversed' => 'boolean',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(AttendanceSession::class, 'session_id');
    }

    public function reversedBy(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'reversed_by');
    }
}
