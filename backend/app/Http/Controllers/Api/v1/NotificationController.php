<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    use ApiResponseTrait;

    public function index(Request $request)
    {
        $limit = $request->input('limit', 10);
        $user = $request->user();

        $notifications = $user->notifications()->paginate($limit);

        return response()->json([
            'success' => true,
            'message' => 'Daftar notifikasi berhasil diambil.',
            'data' => $notifications->items(),
            'meta' => [
                'current_page' => $notifications->currentPage(),
                'last_page' => $notifications->lastPage(),
                'per_page' => $notifications->perPage(),
                'total' => $notifications->total(),
                'unread_count' => $user->unreadNotifications()->count()
            ]
        ]);
    }

    public function markAsRead(Request $request, $id)
    {
        $notification = $request->user()->unreadNotifications()->find($id);

        if (!$notification) {
            return $this->errorResponse('Notifikasi tidak ditemukan atau sudah dibaca.', 404);
        }

        $notification->markAsRead();

        return $this->successResponse('Notifikasi ditandai sebagai dibaca.');
    }

    public function markAllAsRead(Request $request)
    {
        $request->user()->unreadNotifications->markAsRead();

        return $this->successResponse('Semua notifikasi ditandai sebagai dibaca.');
    }
}
