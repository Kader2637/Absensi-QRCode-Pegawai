<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\QrCode;
use App\Enums\ActivityAction;
use App\Traits\ApiResponseTrait;
use App\Traits\AuditLogTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Carbon\Carbon;

class QRCodeController extends Controller
{
    use ApiResponseTrait, AuditLogTrait;

    public function index(Request $request)
    {
        $limit = $request->input('limit', 10);
        $qrCodes = QrCode::with('creator:id,name')
            ->orderBy('created_at', 'desc')
            ->paginate($limit);

        // Add dynamic signature to each item for response representation
        foreach ($qrCodes->items() as $qr) {
            $qr->signature = hash_hmac(
                'sha256', 
                $qr->token . $qr->expires_at->toDateTimeString(), 
                config('app.key')
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Daftar QR Code berhasil diambil.',
            'data' => $qrCodes->items(),
            'meta' => [
                'current_page' => $qrCodes->currentPage(),
                'last_page' => $qrCodes->lastPage(),
                'per_page' => $qrCodes->perPage(),
                'total' => $qrCodes->total(),
            ]
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'valid_minutes' => 'required|integer|min:1|max:1440', // Max 1 day
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        $token = (string) Str::uuid();
        $expiresAt = now()->addMinutes($request->valid_minutes);

        $qrCode = QrCode::create([
            'token' => $token,
            'expires_at' => $expiresAt,
            'is_active' => true,
            'created_by' => Auth::id(),
        ]);

        // Generate HMAC signature dynamically using app key
        $signature = hash_hmac(
            'sha256', 
            $token . $expiresAt->toDateTimeString(), 
            config('app.key')
        );

        $qrCodePayload = [
            'token' => $token,
            'expires_at' => $expiresAt->toDateTimeString(),
            'signature' => $signature
        ];

        $this->logActivity(
            ActivityAction::GENERATE_QR,
            "Admin menjana QR Code baru. Berlaku hingga: {$expiresAt->toDateTimeString()}"
        );

        return $this->successResponse('QR Code berhasil dibuat.', [
            'id' => $qrCode->id,
            'token' => $qrCode->token,
            'expires_at' => $qrCode->expires_at,
            'is_active' => $qrCode->is_active,
            'payload' => json_encode($qrCodePayload) // This payload is what is rendered into QR image
        ], 201);
    }

    public function toggle(Request $request, $id)
    {
        $qrCode = QrCode::find($id);

        if (!$qrCode) {
            return $this->errorResponse('QR Code tidak ditemukan.', 404);
        }

        $qrCode->is_active = !$qrCode->is_active;
        $qrCode->save();

        $statusStr = $qrCode->is_active ? 'diaktifkan' : 'dinonaktifkan';

        $this->logActivity(
            ActivityAction::TOGGLE_QR,
            "Admin mengubah status QR Code token {$qrCode->token} menjadi {$statusStr}."
        );

        return $this->successResponse("QR Code berhasil {$statusStr}.", $qrCode);
    }

    public function latest()
    {
        $qrCode = QrCode::where('is_active', true)
            ->where('expires_at', '>', now())
            ->orderBy('created_at', 'desc')
            ->first();

        if (!$qrCode) {
            return $this->errorResponse('Tidak ada QR Code aktif saat ini.', 404);
        }

        // Compute signature on the fly
        $signature = hash_hmac(
            'sha256', 
            $qrCode->token . $qrCode->expires_at->toDateTimeString(), 
            config('app.key')
        );

        $qrCodePayload = [
            'token' => $qrCode->token,
            'expires_at' => $qrCode->expires_at->toDateTimeString(),
            'signature' => $signature
        ];

        return $this->successResponse('QR Code aktif terbaru berhasil diambil.', [
            'id' => $qrCode->id,
            'token' => $qrCode->token,
            'expires_at' => $qrCode->expires_at,
            'is_active' => $qrCode->is_active,
            'payload' => json_encode($qrCodePayload)
        ]);
    }

    public function destroy($id)
    {
        $qrCode = QrCode::find($id);

        if (!$qrCode) {
            return $this->errorResponse('QR Code tidak ditemukan.', 404);
        }

        $qrCode->delete(); // Soft delete

        return $this->successResponse('QR Code berhasil dihapus.');
    }
}
