import { useQuery } from '@tanstack/react-query';

import { httpDashboardRepository } from '@/infrastructure/dashboard/dashboard.repository.http';

export const DASHBOARD_QUERY_KEY = ['dashboard'];

/**
 * Polls rather than using Reverb/websockets on purpose — spec explicitly
 * rules out Reverb/queues since this is hosted on shared hosting. A 15s
 * interval is frequent enough for a live present/late/absent counter
 * during an ongoing session without hammering a shared-hosting box.
 */
export function useDashboard() {
    return useQuery({
        queryKey: DASHBOARD_QUERY_KEY,
        queryFn: httpDashboardRepository.summary,
        refetchInterval: 15_000,
    });
}
