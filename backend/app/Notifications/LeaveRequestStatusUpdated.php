<?php

namespace App\Notifications;

use App\Models\LeaveRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\BroadcastMessage;

class LeaveRequestStatusUpdated extends Notification
{
    use Queueable;

    protected LeaveRequest $leaveRequest;

    public function __construct(LeaveRequest $leaveRequest)
    {
        $this->leaveRequest = $leaveRequest;
    }

    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    public function toArray(object $notifiable): array
    {
        $statusStr = $this->leaveRequest->status->value ?? $this->leaveRequest->status;
        $startStr = $this->leaveRequest->start_date->format('Y-m-d');
        $endStr = $this->leaveRequest->end_date->format('Y-m-d');
        
        return [
            'title' => 'Pengajuan ' . ucfirst($this->leaveRequest->type) . ' ' . ucfirst($statusStr),
            'message' => "Pengajuan Anda dari tanggal {$startStr} s/d {$endStr} telah {$statusStr} oleh admin." . ($this->leaveRequest->admin_notes ? " Catatan: {$this->leaveRequest->admin_notes}" : ""),
            'type' => 'leave',
            'leave_request_id' => $this->leaveRequest->id,
            'status' => $statusStr,
        ];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage([
            'id' => $this->id,
            'data' => $this->toArray($notifiable),
            'read_at' => null,
            'created_at' => now()->toIso8601String(),
        ]);
    }
}
