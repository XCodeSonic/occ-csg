<?php

namespace App\Http\Requests\Students;

use App\Models\Student;
use Illuminate\Foundation\Http\FormRequest;

class BulkImportStudentsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('bulkImport', Student::class) ?? false;
    }

    public function rules(): array
    {
        return [
            // 5MB is generous for a spreadsheet of plain-text student rows
            // and cheap to reject up front, well before the MAX_ROWS check
            // in BulkImportStudents even has to parse the file.
            'file' => ['required', 'file', 'mimes:xlsx,xls,csv', 'max:5120'],
        ];
    }
}
