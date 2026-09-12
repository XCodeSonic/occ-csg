<?php

namespace App\Domain\Enums;

enum ExclusionScope: string
{
    case Event = 'event';
    case WindowType = 'window_type';
    case Session = 'session';
}
