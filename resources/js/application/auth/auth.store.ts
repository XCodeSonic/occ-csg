import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Student } from '@/domain/entities';

interface AuthState {
    token: string | null;
    student: Student | null;
    set: (token: string, student: Student) => void;
    clear: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            student: null,
            set: (token, student) => set({ token, student }),
            clear: () => set({ token: null, student: null }),
        }),
        { name: 'occ-csg-auth' },
    ),
);
