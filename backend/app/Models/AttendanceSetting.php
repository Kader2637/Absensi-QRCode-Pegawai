<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Attributes\Fillable;

#[Fillable(['check_in_start', 'check_in_end', 'check_out_start', 'check_out_end', 'late_after'])]
class AttendanceSetting extends Model
{
    protected $table = 'attendance_settings';
}
