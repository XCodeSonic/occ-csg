import { useQuery } from '@tanstack/react-query';

import { httpDashboardRepository } from '@/infrastructure/dashboard/dashboard.repository.http';

export const DASHBOARD_QUERY_KEY = ['dashboard'];

/**
 * No background polling — data is fetched once on mount and whenever the
 * caller explicitly invalidates/refetches (e.g. the pull-to-refresh
 * gesture in AppLayout). Previously auto-refetched every 15s; removed
 * per request to stop the silent recurring network calls.
 */
export function useDashboard() {
    return useQuery({
        queryKey: DASHBOARD_QUERY_KEY,
        queryFn: httpDashboardRepository.summary,
    });
}
