<?php

namespace App\Observers;

use App\Models\User;
use App\Models\ActivityLog;
use App\Enums\ActivityAction;
use Illuminate\Support\Facades\Auth;

class UserObserver
{
    private function logActivity(ActivityAction $action, string $description): void
    {
        // Don't log if running seeders / console commands without request context
        if (app()->runningInConsole() && !request()->hasHeader('User-Agent')) {
            return;
        }

        ActivityLog::create([
            'user_id' => Auth::id() ?? null,
            'action' => $action,
            'description' => $description,
            'ip_address' => request()->ip(),
            'device' => request()->userAgent(),
        ]);
    }

    public function created(User $user): void
    {
        $this->logActivity(
            ActivityAction::CREATE_EMPLOYEE,
            "Membuat mahasiswa baru: {$user->name} (NIM: {$user->nip}, Email: {$user->email})"
        );
    }

    public function updated(User $user): void
    {
        // Avoid recursive logs if status is being updated or session changes
        if ($user->isDirty('remember_token')) {
            return;
        }
        
        $this->logActivity(
            ActivityAction::UPDATE_EMPLOYEE,
            "Memperbarui data mahasiswa: {$user->name} (NIM: {$user->nip})"
        );
    }

    public function deleted(User $user): void
    {
        $this->logActivity(
            ActivityAction::DELETE_EMPLOYEE,
            "Menghapus (soft delete) mahasiswa: {$user->name} (NIM: {$user->nip})"
        );
    }
}
