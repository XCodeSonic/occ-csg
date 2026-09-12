import { useMutation } from '@tanstack/react-query';

import { httpAuthRepository } from '@/infrastructure/auth/auth.repository.http';
import { useAuthStore } from '@/application/auth/auth.store';
import type { LoginCredentials } from '@/application/auth/auth.repository';

export function useLogin() {
    const setSession = useAuthStore((state) => state.set);

    return useMutation({
        mutationFn: (credentials: LoginCredentials) => httpAuthRepository.login(credentials),
        onSuccess: (result) => {
            setSession(result.token, result.student);
        },
    });
}
