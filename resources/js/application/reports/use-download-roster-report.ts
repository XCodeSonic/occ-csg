import { useCallback, useState } from 'react';

import { httpReportsRepository } from '@/infrastructure/reports/reports.repository.http';
import type { RosterReportFilters, RosterReportFormat } from '@/infrastructure/reports/reports.repository.http';

export function useDownloadRosterReport(eventId: number) {
    const [downloadingFormat, setDownloadingFormat] = useState<RosterReportFormat | null>(null);

    const download = useCallback(
        async (filters: RosterReportFilters) => {
            setDownloadingFormat(filters.format);
            try {
                const { blob, filename } = await httpReportsRepository.downloadRosterReport(eventId, filters);
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            } finally {
                setDownloadingFormat(null);
            }
        },
        [eventId],
    );

    return { download, downloadingFormat };
}
