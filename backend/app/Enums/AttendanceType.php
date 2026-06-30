<?php

namespace App\Enums;

enum AttendanceType: string
{
    case OFFICE = 'office';
    case REMOTE = 'remote';
    case MANUAL = 'manual';
}
