<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>{{ $report['event']['name'] }} — Roster Report</title>
<style>
    body { font-family: Helvetica, Arial, sans-serif; font-size: 10px; color: #111; }
    h1 { font-size: 15px; margin: 0 0 2px; }
    h2 { font-size: 12px; margin: 0 0 8px; color: #333; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
    th, td { border: 1px solid #999; padding: 3px 6px; text-align: left; }
    th { background: #eee; }
    .group { page-break-after: always; }
    .group:last-child { page-break-after: auto; }
    .total-row td { font-weight: bold; background: #f5f5f5; }
    .right { text-align: right; }
    .idx { width: 24px; }
</style>
</head>
<body>
@forelse ($report['groups'] as $group)
    <div class="group">
        <h1>{{ $report['event']['name'] }}</h1>
        <h2>{{ trim($group['department_code'].' '.$group['year_level'].$group['section']) }} — Roster Report</h2>

        <table>
            <thead>
                <tr>
                    <th class="idx">#</th>
                    <th>Student No.</th>
                    <th>Last Name</th>
                    <th>First Name</th>
                    @foreach ($report['sessions'] as $session)
                        <th>{{ $session['label'] }}</th>
                    @endforeach
                    <th class="right">Penalty Total</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($group['students'] as $i => $student)
                    <tr>
                        <td>{{ $i + 1 }}</td>
                        <td>{{ $student['student_number'] }}</td>
                        <td>{{ $student['last_name'] }}</td>
                        <td>{{ $student['first_name'] }}</td>
                        @foreach ($report['sessions'] as $session)
                            @php($status = $student['sessions'][$session['id']] ?? null)
                            <td>{{ $status ? ucfirst($status) : 'Pending' }}</td>
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
    <h1>{{ $report['event']['name'] }}</h1>
    <p>No students found for the selected filters.</p>
@endforelse
</body>
</html>
