<?php

use App\Http\Controllers\AcademicYears\AcademicYearController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Dashboard\DashboardController;
use App\Http\Controllers\Departments\DepartmentController;
use App\Http\Controllers\Events\EndEventController;
use App\Http\Controllers\Events\EventController;
use App\Http\Controllers\Events\EventDayController;
use App\Http\Controllers\Events\EventMyAttendanceController;
use App\Http\Controllers\Events\EventRosterReportController;
use App\Http\Controllers\Events\MyAttendanceHistoryController;
use App\Http\Controllers\Exclusions\ExclusionController;
use App\Http\Controllers\Semesters\SemesterController;
use App\Http\Controllers\Sessions\EndSessionController;
use App\Http\Controllers\Sessions\ScanController;
use App\Http\Controllers\Sessions\SessionController;
use App\Http\Controllers\Sessions\SessionReportController;
use App\Http\Controllers\Sessions\StartSessionController;
use App\Http\Controllers\Students\StudentBulkImportController;
use App\Http\Controllers\Students\StudentBulkImportPreviewController;
use App\Http\Controllers\Students\StudentBulkImportTemplateController;
use App\Http\Controllers\Students\StudentController;
use App\Http\Controllers\Students\StudentPhotoController;
use App\Http\Controllers\Students\StudentQrController;
use App\Http\Controllers\Students\StudentRoleController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    // Reachable even while must_change_password is still true — otherwise a
    // student stuck on their default password could never clear the gate,
    // or log out, from the API alone.
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/change-password', [AuthController::class, 'changePassword']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    Route::middleware('password.changed')->group(function () {
        Route::get('/dashboard', [DashboardController::class, 'show']);

        Route::post('/sessions/{session}/scan', [ScanController::class, 'store']);
        Route::post('/sessions/{session}/start', [StartSessionController::class, 'store']);
        Route::post('/sessions/{session}/end', [EndSessionController::class, 'store']);
        Route::get('/sessions/{session}/report', [SessionReportController::class, 'show']);

        Route::post('/exclusions', [ExclusionController::class, 'store']);
        Route::delete('/exclusions/{exclusion}', [ExclusionController::class, 'destroy']);

        Route::get('/academic-years', [AcademicYearController::class, 'index']);
        Route::post('/academic-years', [AcademicYearController::class, 'store']);
        Route::patch('/academic-years/{academicYear}', [AcademicYearController::class, 'update']);
        Route::post('/academic-years/{academicYear}/activate', [AcademicYearController::class, 'activate']);
        Route::post('/academic-years/{academicYear}/deactivate', [AcademicYearController::class, 'deactivate']);

        Route::get('/academic-years/{academicYear}/semesters', [SemesterController::class, 'index']);
        Route::post('/academic-years/{academicYear}/semesters', [SemesterController::class, 'store']);
        Route::patch('/semesters/{semester}', [SemesterController::class, 'update']);
        Route::post('/semesters/{semester}/activate', [SemesterController::class, 'activate']);
        Route::post('/semesters/{semester}/deactivate', [SemesterController::class, 'deactivate']);

        Route::get('/departments', [DepartmentController::class, 'index']);
        Route::post('/departments', [DepartmentController::class, 'store']);

        Route::get('/students', [StudentController::class, 'index']);
        Route::post('/students', [StudentController::class, 'store']);
        Route::get('/students/bulk-import-template', [StudentBulkImportTemplateController::class, 'show']);
        Route::post('/students/bulk-import/preview', [StudentBulkImportPreviewController::class, 'store']);
        Route::post('/students/bulk-import', [StudentBulkImportController::class, 'store']);
        Route::patch('/students/{student}/role', [StudentRoleController::class, 'update']);
        Route::post('/students/{student}/photo', [StudentPhotoController::class, 'update']);
        Route::get('/students/{student}/qr', [StudentQrController::class, 'show']);

        Route::get('/events', [EventController::class, 'index']);
        Route::post('/events', [EventController::class, 'store']);
        Route::post('/events/{event}/end', [EndEventController::class, 'store']);
        Route::post('/events/{event}/days', [EventDayController::class, 'store']);
        Route::post('/event-days/{eventDay}/sessions', [SessionController::class, 'store']);
        Route::get('/events/{event}/roster-report', [EventRosterReportController::class, 'show']);
        Route::get('/events/{event}/my-attendance', [EventMyAttendanceController::class, 'show']);
        Route::get('/my-attendance-history', [MyAttendanceHistoryController::class, 'show']);
    });
});
