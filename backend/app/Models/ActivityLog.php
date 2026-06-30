<?php

namespace App\Models;

use App\Enums\ActivityAction;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Attributes\Fillable;

#[Fillable(['user_id', 'action', 'description', 'ip_address', 'device'])]
class ActivityLog extends Model
{
    protected $table = 'activity_logs';

    // Disable standard Laravel timestamps, only use created_at
    const UPDATED_AT = null;

    protected function casts(): array
    {
        return [
            'action' => ActivityAction::class,
            'created_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
