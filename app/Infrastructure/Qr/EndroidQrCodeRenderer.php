<?php

namespace App\Infrastructure\Qr;

use App\Domain\Contracts\QrCodeRendererInterface;
use Endroid\QrCode\Builder\Builder;
use Endroid\QrCode\ErrorCorrectionLevel;
use Endroid\QrCode\Writer\PngWriter;

final class EndroidQrCodeRenderer implements QrCodeRendererInterface
{
    // High error correction (spec §5.1: must survive being printed small
    // on a physical ID badge and scanned by a generic camera under
    // imperfect conditions), at a size generous enough to stay readable
    // printed without ballooning the PNG for on-screen display.
    private const SIZE = 400;

    private const MARGIN = 4;

    public function renderPng(string $data): string
    {
        // v6 dropped Builder::create()/fluent setters in favor of a
        // readonly class built via constructor (named args); build()
        // takes no arguments here since every option is fixed up front.
        $builder = new Builder(
            writer: new PngWriter(),
            data: $data,
            errorCorrectionLevel: ErrorCorrectionLevel::High,
            size: self::SIZE,
            margin: self::MARGIN,
        );

        return $builder->build()->getString();
    }
}
