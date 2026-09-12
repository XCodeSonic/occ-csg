<?php

namespace App\Models;

use App\Domain\Enums\EventStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EventModel extends Model
{
    protected $table = 'events';

    protected $fillable = ['name', 'description', 'created_by', 'semester_id', 'status'];

    protected function casts(): array
    {
        return [
            'status' => EventStatus::class,
        ];
    }

    public function days(): HasMany
    {
        return $this->hasMany(EventDay::class, 'event_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'created_by');
    }

    public function semester(): BelongsTo
    {
        return $this->belongsTo(Semester::class);
    }

    /**
     * An event points at a Semester, which points at an AcademicYear —
     * there's no direct academic_year_id column on events anymore, so
     * this is a read-only accessor rather than a BelongsTo relation.
     * Accessible as both $event->academicYear and $event->academic_year.
     */
    protected function academicYear(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->semester?->academicYear,
        );
    }

    /**
     * @param  Builder<EventModel>  $query
     * @return Builder<EventModel>
     */
    public function scopeForAcademicYear(Builder $query, int $academicYearId): Builder
    {
        return $query->whereHas('semester', function (Builder $semesterQuery) use ($academicYearId) {
            $semesterQuery->where('academic_year_id', $academicYearId);
        });
    }

    /**
     * @param  Builder<EventModel>  $query
     * @return Builder<EventModel>
     */
    public function scopeForSemester(Builder $query, int $semesterId): Builder
    {
        return $query->where('semester_id', $semesterId);
    }
}
