<?php

namespace App\Infrastructure\Pdf;

use App\Domain\Contracts\RosterPdfRendererInterface;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Support\Facades\View;

/**
 * Plain dompdf/dompdf, not a Blade-package wrapper — the report request
 * explicitly rules out anything that needs a queue worker (shared
 * hosting), and dompdf renders synchronously in-process like every
 * other action in this app.
 */
final class DompdfRosterPdfRenderer implements RosterPdfRendererInterface
{
    public function render(array $report): string
    {
        $html = View::make('reports.roster-pdf', ['report' => $report])->render();

        $options = new Options();
        $options->set('isRemoteEnabled', false);
        $options->set('defaultFont', 'Helvetica');

        $dompdf = new Dompdf($options);
        // Landscape: session columns run wide once an event has more than
        // a couple of days, and this is meant to be printed/handed out.
        $dompdf->setPaper('legal', 'landscape');
        $dompdf->loadHtml($html);
        $dompdf->render();

        return $dompdf->output();
    }
}
