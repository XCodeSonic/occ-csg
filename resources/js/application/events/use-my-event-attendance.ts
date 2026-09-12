import { useQuery } from '@tanstack/react-query';

import { httpEventsRepository } from '@/infrastructure/events/events.repository.http';

/**
 * A student's own attendance across every session of one event. Kept
 * under its own query key (not EVENTS_QUERY_KEY) since it's per-caller
 * data, not the shared events list — refetches on a short interval so a
 * student sitting on the page during an ongoing session sees their scan
 * land without a manual refresh.
 */
export function useMyEventAttendance(eventId: number) {
    return useQuery({
        queryKey: ['events', eventId, 'my-attendance'],
        queryFn: () => httpEventsRepository.myAttendance(eventId),
        refetchInterval: 15_000,
        enabled: Number.isFinite(eventId),
    });
}
