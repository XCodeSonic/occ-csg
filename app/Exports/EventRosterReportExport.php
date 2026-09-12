<?php

namespace App\Exports;

use App\Exports\Sheets\EventRosterGroupSheet;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;

/**
 * The report request's printable Excel export of the roster report
 * built by BuildEventRosterReport — one sheet per department/year-level
 * /section group.
 */
final class EventRosterReportExport implements WithMultipleSheets
{
    public function __construct(private readonly array $report) {}

    public function sheets(): array
    {
        if ($this->report['groups'] === []) {
            // WithMultipleSheets requires at least one sheet — an empty
            // filter (e.g. a section with no students) shouldn't break
            // the download, just say so on a single sheet.
            return [new EventRosterGroupSheet(
                [
                    'department_code' => 'No students found',
                    'year_level' => '', 'section' => '',
                    'students' => [], 'group_penalty_total' => 0.0,
                ],
                $this->report['sessions'],
            )];
        }

        return array_map(
            fn (array $group) => new EventRosterGroupSheet($group, $this->report['sessions']),
            $this->report['groups'],
        );
    }
}
