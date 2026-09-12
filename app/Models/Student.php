<?php

namespace App\Models;

use App\Domain\Enums\Role;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\HasApiTokens;

class Student extends Authenticatable
{
    use HasApiTokens, HasFactory;

    protected $fillable = [
        'student_number', 'last_name', 'first_name', 'middle_name', 'suffix',
        'department_id', 'year_level', 'section', 'role', 'sc_admin_department_id',
        'officer_event_id', 'semester_id', 'photo_path', 'qr_token', 'qr_version', 'username', 'password',
        'must_change_password',
    ];

    protected $hidden = ['password', 'remember_token', 'qr_token'];

    // Spec §4.5: the React app needs a ready-to-use image URL, not a raw
    // storage path — appended so it rides along on every JSON response
    // without controllers having to remember to add it.
    protected $appends = ['photo_url'];

    protected function photoUrl(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->photo_path ? Storage::disk('public')->url($this->photo_path) : null,
        );
    }

    protected function casts(): array
    {
        return [
            'role' => Role::class,
            'must_change_password' => 'boolean',
            'password' => 'hashed',
        ];
    }

    /**
     * Whether this student can have attendance tracked for a given event.
     *
     * Only a plain Student is ever eligible. System Admin, CSG Admin, SC
     * Admin, and Officer are all staff — they run or staff events rather
     * than attend them (spec §2) — and are never eligible, regardless of
     * which event is asked about or how (or whether) an Officer is
     * scoped via officer_event_id.
     */
    public function isAttendanceEligibleForEvent(int $eventId): bool
    {
        return $this->role === Role::Student;
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function scAdminDepartment(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'sc_admin_department_id');
    }

    public function officerEvent(): BelongsTo
    {
        return $this->belongsTo(EventModel::class, 'officer_event_id');
    }

    /**
     * The semester this student is currently enrolled in (spec: "students
     * to a semester"). Defaults to the active semester at creation time
     * (see CreateStudent) but is a plain nullable FK, not enforced here.
     */
    public function semester(): BelongsTo
    {
        return $this->belongsTo(Semester::class);
    }
}
