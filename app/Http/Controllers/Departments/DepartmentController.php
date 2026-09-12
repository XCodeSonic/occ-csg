<?php

namespace App\Http\Controllers\Departments;

use App\Application\Actions\Departments\CreateDepartment;
use App\Http\Controllers\Controller;
use App\Http\Requests\Departments\StoreDepartmentRequest;
use App\Models\Department;
use Illuminate\Support\Facades\Gate;

class DepartmentController extends Controller
{
    public function index()
    {
        Gate::authorize('viewAny', Department::class);

        return response()->json(Department::orderBy('name')->get());
    }

    public function store(StoreDepartmentRequest $request, CreateDepartment $createDepartment)
    {
        $department = $createDepartment($request->validated());

        return response()->json($department, 201);
    }
}
