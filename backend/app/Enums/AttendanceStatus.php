<?php

namespace App\Enums;

enum AttendanceStatus: string
{
    case HADIR = 'hadir';
    case TERLAMBAT = 'terlambat';
    case IZIN = 'izin';
    case SAKIT = 'sakit';
    case ALPHA = 'alpha';
}
