<?php

namespace App\Models;

use App\Domain\Enums\CheckType;
use App\Domain\Enums\SessionStatus;
use App\Domain\Enums\WindowType;
use App\Domain\ValueObjects\TimeWindow;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AttendanceSession extends Model
{
    protected $table = 'attendance_sessions';

    protected $fillable = [
        'event_day_id', 'window_type', 'check_type', 'start_time', 'end_time',
        'grace_minutes', 'penalty_late_amount', 'penalty_absent_amount', 'status',
    ];

    protected function casts(): array
    {
        return [
            'window_type' => WindowType::class,
            'check_type' => CheckType::class,
            'status' => SessionStatus::class,
            'penalty_late_amount' => 'decimal:2',
            'penalty_absent_amount' => 'decimal:2',
        ];
    }

    public function eventDay(): BelongsTo
    {
        return $this->belongsTo(EventDay::class);
    }

    public function records(): HasMany
    {
        return $this->hasMany(AttendanceRecord::class, 'session_id');
    }

    public function window(): TimeWindow
    {
        return new TimeWindow(
            $this->combineWithDate($this->start_time),
            $this->combineWithDate($this->end_time),
            $this->grace_minutes,
        );
    }

    private function combineWithDate(string $time): Carbon
    {
        return Carbon::parse($this->eventDay->date->format('Y-m-d').' '.$time, 'Asia/Manila');
    }
}
