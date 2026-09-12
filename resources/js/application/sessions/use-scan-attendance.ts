import { useMutation } from '@tanstack/react-query';

import { httpSessionsRepository } from '@/infrastructure/sessions/sessions.repository.http';

/**
 * One scan attempt against a fixed session. Deliberately not tied to
 * react-query's cache invalidation of anything — the scanning screen reads
 * its own running "recent scans" list from mutation results directly, and
 * nothing else in the app currently shows live per-scan data that would
 * need to react to this.
 */
export function useScanAttendance(sessionId: number) {
    return useMutation({
        mutationFn: (token: string) => httpSessionsRepository.scan(sessionId, token),
    });
}
