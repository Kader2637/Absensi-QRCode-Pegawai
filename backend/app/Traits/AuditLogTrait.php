<?php

namespace App\Traits;

use App\Models\ActivityLog;
use App\Enums\ActivityAction;
use Illuminate\Support\Facades\Auth;

trait AuditLogTrait
{
    protected function logActivity(ActivityAction $action, string $description, ?int $userId = null): void
    {
        ActivityLog::create([
            'user_id' => $userId ?? Auth::id(),
            'action' => $action,
            'description' => $description,
            'ip_address' => request()->ip(),
            'device' => request()->userAgent(),
        ]);
    }
}
