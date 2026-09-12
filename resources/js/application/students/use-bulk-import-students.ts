import { useMutation, useQueryClient } from '@tanstack/react-query';

import { httpStudentsRepository } from '@/infrastructure/students/students.repository.http';
import { STUDENTS_QUERY_KEY } from '@/application/students/use-students';

export function useBulkImportStudents() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (file: File) => httpStudentsRepository.bulkImport(file),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: STUDENTS_QUERY_KEY });
        },
    });
}
