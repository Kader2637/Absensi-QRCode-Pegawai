<?php

namespace App\Observers;

use App\Models\LeaveRequest;
use App\Models\ActivityLog;
use App\Models\Attendance;
use App\Enums\ActivityAction;
use App\Enums\LeaveRequestStatus;
use App\Enums\AttendanceStatus;
use App\Enums\AttendanceType;
use App\Notifications\LeaveRequestStatusUpdated;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class LeaveRequestObserver
{
    private function logActivity(ActivityAction $action, string $description): void
    {
        if (app()->runningInConsole() && !request()->hasHeader('User-Agent')) {
            return;
        }

        ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => $action,
            'description' => $description,
            'ip_address' => request()->ip(),
            'device' => request()->userAgent(),
        ]);
    }

    public function updated(LeaveRequest $leaveRequest): void
    {
        if ($leaveRequest->isDirty('status')) {
            $employee = $leaveRequest->user;
            $status = $leaveRequest->status;

            if ($status === LeaveRequestStatus::APPROVED) {
                $this->logActivity(
                    ActivityAction::APPROVE_LEAVE,
                    "Admin menyetujui pengajuan {$leaveRequest->type} pegawai {$employee->name} (Tanggal: {$leaveRequest->start_date->format('Y-m-d')} s/d {$leaveRequest->end_date->format('Y-m-d')})"
                );

                $start = Carbon::parse($leaveRequest->start_date);
                $end = Carbon::parse($leaveRequest->end_date);

                for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
                    Attendance::updateOrCreate([
                        'user_id' => $leaveRequest->user_id,
                        'date' => $date->format('Y-m-d'),
                    ], [
                        'status' => $leaveRequest->type === 'sakit' ? AttendanceStatus::SAKIT : AttendanceStatus::IZIN,
                        'attendance_type' => AttendanceType::MANUAL,
                        'notes' => 'Izin/Sakit disetujui admin. Catatan: ' . ($leaveRequest->admin_notes ?? '-'),
                    ]);
                }

                // Send notification
                $employee->notify(new LeaveRequestStatusUpdated($leaveRequest));

            } elseif ($status === LeaveRequestStatus::REJECTED) {
                $this->logActivity(
                    ActivityAction::REJECT_LEAVE,
                    "Admin menolak pengajuan {$leaveRequest->type} pegawai {$employee->name}."
                );

                // Send notification
                $employee->notify(new LeaveRequestStatusUpdated($leaveRequest));
            }
        }
    }
}
