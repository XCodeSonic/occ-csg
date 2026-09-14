<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>{{ $report['event']['name'] }} — Roster Report</title>
<style>
    body { font-family: Helvetica, Arial, sans-serif; font-size: 10px; color: #111; }
    .banner { background: #065f46; color: #fff; padding: 8px 10px; border-radius: 3px 3px 0 0; }
    .banner h1 { font-size: 15px; margin: 0; }
    .subtitle { background: #ecfdf5; color: #064e3b; padding: 5px 10px; font-size: 11px; font-weight: bold; }
    .meta { color: #6b7280; font-style: italic; font-size: 8.5px; padding: 3px 10px 8px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
    th, td { border: 1px solid #d1d5db; padding: 3px 6px; text-align: left; }
    th { background: #1e293b; color: #fff; }
    th.day-header { background: #0f172a; text-align: center; }
    th.window-header { background: #334155; text-align: center; }
    th.check-header { text-align: center; }
    .group { page-break-after: always; }
    .group:last-child { page-break-after: auto; }
    .total-row td { font-weight: bold; background: #f1f5f9; border-top: 2px solid #1e293b; }
    .right { text-align: right; }
    .idx { width: 24px; }
    .status { text-align: center; border-radius: 2px; }
    .status-present { background: #d1fae5; color: #065f46; font-weight: bold; }
    .status-late { background: #fef3c7; color: #92400e; }
    .status-absent { background: #fee2e2; color: #991b1b; }
    .status-excluded { background: #f3f4f6; color: #374151; }
    .status-pending { background: #f9fafb; color: #6b7280; }
</style>
</head>
<body>
@php
    // Dynamic Day -> Window -> Check header tree — a day with only a
    // Morning session never gets Afternoon/Evening columns, and a window
    // with only a time-in session never gets a Time Out column. See
    // App\Domain\Support\RosterReportColumnGrouper for why this is
    // derived here rather than in BuildEventRosterReport itself.
    $dayColumns = \App\Domain\Support\RosterReportColumnGrouper::groupByDayAndWindow($report['sessions']);
@endphp
@forelse ($report['groups'] as $group)
    <div class="group">
        <div class="banner"><h1>{{ $report['event']['name'] }} — Roster Report</h1></div>
        <div class="subtitle">{{ trim($group['department_code'].' — Year '.($group['year_level'] ?: '—').' — Section '.($group['section'] ?: '—')) }}</div>
        <div class="meta">
            Generated {{ now()->format('M j, Y g:i A') }} •
            {{ count($group['students']) }} student{{ count($group['students']) === 1 ? '' : 's' }} •
            sorted A–Z by last name
        </div>

        <table>
            <thead>
                @if (count($dayColumns) > 0)
                    <tr>
                        <th class="idx" rowspan="3">#</th>
                        <th rowspan="3">Student No.</th>
                        <th rowspan="3">Last Name</th>
                        <th rowspan="3">First Name</th>
                        @foreach ($dayColumns as $day)
                            <th class="day-header" colspan="{{ $day['span'] }}">Day {{ $day['day_number'] }}</th>
                        @endforeach
                        <th class="right" rowspan="3">Penalty Total</th>
                    </tr>
                    <tr>
                        @foreach ($dayColumns as $day)
                            @foreach ($day['windows'] as $window)
                                <th class="window-header" colspan="{{ $window['span'] }}">{{ ucfirst($window['window_type']) }}</th>
                            @endforeach
                        @endforeach
                    </tr>
                    <tr>
                        @foreach ($dayColumns as $day)
                            @foreach ($day['windows'] as $window)
                                @foreach ($window['checks'] as $check)
                                    <th class="check-header">{{ $check['label'] }}</th>
                                @endforeach
                            @endforeach
                        @endforeach
                    </tr>
                @else
                    <tr>
                        <th class="idx">#</th>
                        <th>Student No.</th>
                        <th>Last Name</th>
                        <th>First Name</th>
                        <th class="right">Penalty Total</th>
                    </tr>
                @endif
            </thead>
            <tbody>
                @foreach ($group['students'] as $i => $student)
                    <tr>
                        <td>{{ $i + 1 }}</td>
                        <td>{{ $student['student_number'] }}</td>
                        <td>{{ $student['last_name'] }}</td>
                        <td>{{ $student['first_name'] }}</td>
                        @foreach ($report['sessions'] as $session)
                            @php($status = $student['sessions'][$session['id']] ?? 'pending')
                            <td class="status status-{{ $status }}">{{ ucfirst($status) }}</td>
                        @endforeach
                        <td class="right">{{ number_format($student['penalty_total'], 2) }}</td>
                    </tr>
                @endforeach
                <tr class="total-row">
                    <td colspan="{{ 4 + count($report['sessions']) }}">Group Total</td>
                    <td class="right">{{ number_format($group['group_penalty_total'], 2) }}</td>
                </tr>
            </tbody>
        </table>
    </div>
@empty
    <div class="banner"><h1>{{ $report['event']['name'] }}</h1></div>
    <p style="padding: 10px;">No students found for the selected filters.</p>
@endforelse
</body>
</html>

