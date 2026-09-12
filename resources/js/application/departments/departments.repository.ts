import type { Department } from '@/domain/entities';

/**
 * Port the application layer depends on — mirrors academic-years.repository.ts.
 * The infrastructure layer (departments.repository.http.ts) provides the
 * concrete HTTP implementation.
 */
export interface DepartmentRepository {
    list(): Promise<Department[]>;
}
