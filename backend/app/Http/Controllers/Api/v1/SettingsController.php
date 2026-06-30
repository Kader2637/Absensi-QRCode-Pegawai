<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\AttendanceSetting;
use App\Enums\ActivityAction;
use App\Traits\ApiResponseTrait;
use App\Traits\AuditLogTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class SettingsController extends Controller
{
    use ApiResponseTrait, AuditLogTrait;

    public function show()
    {
        $settings = AttendanceSetting::first();
        if (!$settings) {
            return $this->errorResponse('Pengaturan absensi belum ada.', 404);
        }

        return $this->successResponse('Pengaturan absensi berhasil diambil.', $settings);
    }

    public function update(Request $request)
    {
        $settings = AttendanceSetting::first();
        if (!$settings) {
            $settings = new AttendanceSetting();
        }

        $validator = Validator::make($request->all(), [
            'check_in_start' => 'required|date_format:H:i:s',
            'check_in_end' => 'required|date_format:H:i:s|after:check_in_start',
            'check_out_start' => 'required|date_format:H:i:s',
            'check_out_end' => 'required|date_format:H:i:s|after:check_out_start',
            'late_after' => 'required|date_format:H:i:s|after:check_in_start|before:check_in_end',
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        $settings->check_in_start = $request->check_in_start;
        $settings->check_in_end = $request->check_in_end;
        $settings->check_out_start = $request->check_out_start;
        $settings->check_out_end = $request->check_out_end;
        $settings->late_after = $request->late_after;
        $settings->save();

        $this->logActivity(
            ActivityAction::UPDATE_SETTINGS,
            "Admin memperbarui jam kerja operasional absensi."
        );

        return $this->successResponse('Pengaturan absensi berhasil diperbarui.', $settings);
    }
}
