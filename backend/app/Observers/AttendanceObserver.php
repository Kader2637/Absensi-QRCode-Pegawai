<?php

namespace App\Observers;

use App\Models\Attendance;
use App\Models\ActivityLog;
use App\Enums\ActivityAction;
use Illuminate\Support\Facades\Auth;

class AttendanceObserver
{
    private function logActivity(ActivityAction $action, string $description, ?int $userId = null): void
    {
        if (app()->runningInConsole() && !request()->hasHeader('User-Agent')) {
            return;
        }

        ActivityLog::create([
            'user_id' => $userId ?? Auth::id(),
            'action' => $action,
            'description' => $description,
            'ip_address' => request()->ip(),
            'device' => request()->userAgent(),
        ]);
    }

    public function created(Attendance $attendance): void
    {
        $employee = $attendance->user;
        $statusStr = $attendance->status->value ?? 'hadir';
        $typeStr = $attendance->attendance_type->value ?? 'office';
        
        $this->logActivity(
            ActivityAction::SCAN_IN,
            "Pegawai {$employee->name} melakukan check-in ({$typeStr}). Status: {$statusStr} pada jam {$attendance->check_in}.",
            $employee->id
        );
    }

    public function updated(Attendance $attendance): void
    {
        $employee = $attendance->user;
        
        if ($attendance->isDirty('check_out') && $attendance->check_out !== null) {
            $this->logActivity(
                ActivityAction::SCAN_OUT,
                "Pegawai {$employee->name} melakukan check-out. Jam: {$attendance->check_out}.",
                $employee->id
            );
        } else if ($attendance->isDirty('status') || $attendance->isDirty('notes')) {
            $this->logActivity(
                ActivityAction::UPDATE_SETTINGS,
                "Admin memperbarui absensi {$employee->name} tanggal {$attendance->date->format('Y-m-d')}. Status baru: " . ($attendance->status->value ?? $attendance->status) . "."
            );
        }
    }
}
