import type { Student } from '@/domain/entities';
import type { Role } from '@/domain/enums';

export interface StudentFilters {
    departmentId?: number;
    role?: Role;
    yearLevel?: string;
    section?: string;
    search?: string;
    page?: number;
    perPage?: number;
}

export interface PaginatedStudents {
    data: Student[];
    currentPage: number;
    lastPage: number;
    total: number;
    perPage: number;
}

export interface CreateStudentPayload {
    studentNumber: string;
    lastName: string;
    firstName: string;
    middleName: string;
    suffix?: string | null;
    departmentId: number;
    yearLevel: string;
    section?: string | null;
}

export interface BulkImportRowError {
    row: number;
    studentNumber: string | null;
    reasons: string[];
}

export interface BulkImportReport {
    totalRows: number;
    imported: number;
    failed: number;
    errors: BulkImportRowError[];
}

/** One row from a bulk-import preview — nothing has been written yet. */
export interface BulkImportPreviewRow {
    row: number;
    valid: boolean;
    reasons: string[];
    studentNumber: string | null;
    lastName: string | null;
    firstName: string | null;
    middleName: string | null;
    suffix: string | null;
    departmentCode: string | null;
    yearLevel: string | null;
    section: string | null;
}

export interface BulkImportPreview {
    totalRows: number;
    valid: number;
    invalid: number;
    rows: BulkImportPreviewRow[];
}

export interface UpdateStudentRolePayload {
    role: Role;
    departmentId?: number | null;
    eventId?: number | null;
}

/**
 * Port the application layer depends on — mirrors academic-years.repository.ts.
 * The infrastructure layer (students.repository.http.ts) provides the
 * concrete HTTP implementation.
 */
export interface StudentRepository {
    list(filters: StudentFilters): Promise<PaginatedStudents>;
    create(payload: CreateStudentPayload): Promise<Student>;
    /**
     * Validates a file and reports what importing it would do, row by
     * row — nothing is written to the database. Call this first; only
     * call bulkImport() with the same file once the admin confirms.
     */
    previewBulkImport(file: File): Promise<BulkImportPreview>;
    bulkImport(file: File): Promise<BulkImportReport>;
    downloadBulkImportTemplate(): Promise<Blob>;
    updateRole(studentId: number, payload: UpdateStudentRolePayload): Promise<Student>;
    getQrCode(studentId: number): Promise<Blob>;
    updatePhoto(studentId: number, file: File | Blob): Promise<Student>;
}
