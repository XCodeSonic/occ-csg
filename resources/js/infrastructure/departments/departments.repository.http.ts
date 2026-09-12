import { httpClient } from '@/infrastructure/http/client';
import type { Department } from '@/domain/entities';
import type { DepartmentRepository } from '@/application/departments/departments.repository';

export const httpDepartmentsRepository: DepartmentRepository = {
    async list(): Promise<Department[]> {
        const { data } = await httpClient.get<Department[]>('/departments');
        return data;
    },
};
