<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\QrCode;
use App\Models\Attendance;
use App\Models\AttendanceSetting;
use App\Enums\AttendanceStatus;
use App\Enums\AttendanceType;
use App\Enums\ActivityAction;
use App\Traits\ApiResponseTrait;
use App\Traits\AuditLogTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class ScanController extends Controller
{
    use ApiResponseTrait, AuditLogTrait;

    public function scan(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'payload' => 'required|string',
            'location' => 'nullable|string',
            'attendance_type' => 'nullable|string|in:office,remote',
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        // 1. Decode Payload JSON
        $payloadData = json_decode($request->payload, true);
        if (!$payloadData || !isset($payloadData['token'], $payloadData['expires_at'], $payloadData['signature'])) {
            return $this->errorResponse('Format QR Code tidak valid.', 400);
        }

        $token = $payloadData['token'];
        $expiresAt = $payloadData['expires_at'];
        $clientSignature = $payloadData['signature'];

        // 2. Validate HMAC Signature (dynamic validation)
        $serverSignature = hash_hmac('sha256', $token . $expiresAt, config('app.key'));
        if (!hash_equals($serverSignature, $clientSignature)) {
            return $this->errorResponse('QR Code palsu atau telah dimanipulasi.', 403);
        }

        // 3. Verify QR Expiration (Time check)
        $expiresTime = Carbon::parse($expiresAt);
        if (now()->gt($expiresTime)) {
            return $this->errorResponse('QR Code telah kedaluwarsa.', 400);
        }

        // 4. Verify QR Database Record Status
        $qrCodeRecord = QrCode::where('token', $token)->first();
        if (!$qrCodeRecord || !$qrCodeRecord->is_active) {
            return $this->errorResponse('QR Code tidak aktif atau sudah dinonaktifkan oleh admin.', 400);
        }

        // 5. Get Attendance Settings
        $settings = AttendanceSetting::first();
        if (!$settings) {
            return $this->errorResponse('Pengaturan absensi belum dikonfigurasi oleh admin.', 500);
        }

        $userId = Auth::id();
        $today = now()->toDateString();
        $currentTime = now()->toTimeString();

        // 6. Check existing attendance record for today
        $attendance = Attendance::where('user_id', $userId)
            ->where('date', $today)
            ->first();

        // Check if we are in check-in window
        $inCheckInWindow = ($currentTime >= $settings->check_in_start && $currentTime <= $settings->check_in_end);
        // Check if we are in check-out window
        $inCheckOutWindow = ($currentTime >= $settings->check_out_start && $currentTime <= $settings->check_out_end);

        if (!$inCheckInWindow && !$inCheckOutWindow) {
            return $this->errorResponse('Absensi gagal: Di luar jam operasional absensi.', 400);
        }

        // Case A: Absen Masuk (Check-in)
        if ($inCheckInWindow) {
            if ($attendance) {
                return $this->errorResponse('Anda sudah melakukan absensi masuk hari ini.', 400);
            }

            // Determine late status
            $status = ($currentTime > $settings->late_after) 
                ? AttendanceStatus::TERLAMBAT 
                : AttendanceStatus::HADIR;

            $newAttendance = Attendance::create([
                'user_id' => $userId,
                'qr_code_id' => $qrCodeRecord->id,
                'date' => $today,
                'check_in' => $currentTime,
                'status' => $status,
                'attendance_type' => $request->input('attendance_type') === 'remote' 
                    ? AttendanceType::REMOTE 
                    : AttendanceType::OFFICE,
                'location' => $request->input('location'),
            ]);

            $this->logActivity(
                ActivityAction::SCAN_IN,
                "Pegawai melakukan check-in via QR Code. Status: {$status->value}.",
                $userId
            );

            return $this->successResponse('Absen masuk berhasil.', $newAttendance);
        }

        // Case B: Absen Pulang (Check-out)
        if ($inCheckOutWindow) {
            if (!$attendance) {
                return $this->errorResponse('Anda belum melakukan absensi masuk hari ini.', 400);
            }

            if ($attendance->check_out) {
                return $this->errorResponse('Anda sudah melakukan absensi pulang hari ini.', 400);
            }

            // Check if status is Izin/Sakit/Alpha, shouldn't check-out if they are permitted/sick
            if (in_array($attendance->status, [AttendanceStatus::IZIN, AttendanceStatus::SAKIT, AttendanceStatus::ALPHA])) {
                return $this->errorResponse('Status kehadiran Anda hari ini adalah ' . $attendance->status->value . ', tidak dapat melakukan absen pulang.', 400);
            }

            $attendance->check_out = $currentTime;
            $attendance->save();

            $this->logActivity(
                ActivityAction::SCAN_OUT,
                "Pegawai melakukan check-out via QR Code.",
                $userId
            );

            return $this->successResponse('Absen pulang berhasil.', $attendance);
        }

        return $this->errorResponse('Di luar jam operasional absensi.', 400);
    }
}
