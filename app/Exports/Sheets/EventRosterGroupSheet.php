<?php

namespace App\Exports\Sheets;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;

/**
 * One sheet per department/year-level/section group (spec's own
 * example: "BSIT, 1st year, 1st section -> BSIT 1A"): one row per
 * student — already sorted a-z by last name by BuildEventRosterReport
 * — one column per session, and a trailing penalty-total column.
 */
final class EventRosterGroupSheet implements FromArray, ShouldAutoSize, WithHeadings, WithTitle
{
    public function __construct(
        private readonly array $group,
        private readonly array $sessions,
    ) {}

    public function title(): string
    {
        $title = trim(sprintf('%s %s%s', $this->group['department_code'], $this->group['year_level'], $this->group['section']));

        // Excel sheet names are capped at 31 characters — long department
        // names/codes are the only realistic way to hit that here.
        return substr($title !== '' ? $title : 'Group', 0, 31);
    }

    public function headings(): array
    {
        $headings = ['Student No.', 'Last Name', 'First Name'];

        foreach ($this->sessions as $session) {
            $headings[] = $session['label'];
        }

        $headings[] = 'Penalty Total';

        return $headings;
    }

    public function array(): array
    {
        $rows = [];

        foreach ($this->group['students'] as $student) {
            $row = [$student['student_number'], $student['last_name'], $student['first_name']];

            foreach ($this->sessions as $session) {
                $row[] = $this->formatCell($student['sessions'][$session['id']] ?? null);
            }

            $row[] = number_format($student['penalty_total'], 2);

            $rows[] = $row;
        }

        $rows[] = array_merge(
            ['', '', 'Group Total'],
            array_fill(0, count($this->sessions), ''),
            [number_format($this->group['group_penalty_total'], 2)],
        );

        return $rows;
    }

    private function formatCell(?string $status): string
    {
        return $status ? ucfirst($status) : 'Pending';
    }
}
