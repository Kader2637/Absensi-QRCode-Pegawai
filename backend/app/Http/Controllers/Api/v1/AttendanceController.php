<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\User;
use App\Enums\AttendanceStatus;
use App\Enums\AttendanceType;
use App\Enums\ActivityAction;
use App\Traits\ApiResponseTrait;
use App\Traits\AuditLogTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Carbon\Carbon;

class AttendanceController extends Controller
{
    use ApiResponseTrait, AuditLogTrait;

    public function index(Request $request)
    {
        $search = $request->input('search');
        $month = $request->input('month'); // 1 - 12
        $year = $request->input('year', date('Y'));
        $status = $request->input('status'); // Castable status
        $limit = $request->input('limit', 10);

        $query = Attendance::with('user:id,nip,name,department,position');

        if ($search) {
            $query->whereHas('user', function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                  ->orWhere('nip', 'like', '%' . $search . '%');
            });
        }

        if ($month) {
            $query->whereMonth('date', $month);
        }

        if ($year) {
            $query->whereYear('date', $year);
        }

        if ($status) {
            $query->where('status', $status);
        }

        $attendances = $query->orderBy('date', 'desc')
            ->orderBy('check_in', 'desc')
            ->paginate($limit);

        return response()->json([
            'success' => true,
            'message' => 'Daftar kehadiran berhasil diambil.',
            'data' => $attendances->items(),
            'meta' => [
                'current_page' => $attendances->currentPage(),
                'last_page' => $attendances->lastPage(),
                'per_page' => $attendances->perPage(),
                'total' => $attendances->total(),
            ]
        ]);
    }

    public function history(Request $request)
    {
        $userId = Auth::id();
        $month = $request->input('month');
        $year = $request->input('year', date('Y'));
        $limit = $request->input('limit', 10);

        $query = Attendance::where('user_id', $userId);

        if ($month) {
            $query->whereMonth('date', $month);
        }

        if ($year) {
            $query->whereYear('date', $year);
        }

        $history = $query->orderBy('date', 'desc')->paginate($limit);

        return response()->json([
            'success' => true,
            'message' => 'Riwayat kehadiran berhasil diambil.',
            'data' => $history->items(),
            'meta' => [
                'current_page' => $history->currentPage(),
                'last_page' => $history->lastPage(),
                'per_page' => $history->perPage(),
                'total' => $history->total(),
            ]
        ]);
    }

    public function update(Request $request, $id)
    {
        $attendance = Attendance::with('user')->find($id);

        if (!$attendance) {
            return $this->errorResponse('Data kehadiran tidak ditemukan.', 404);
        }

        $validator = Validator::make($request->all(), [
            'status' => ['required', Rule::in(['hadir', 'terlambat', 'izin', 'sakit', 'alpha'])],
            'check_in' => 'nullable|date_format:H:i:s',
            'check_out' => 'nullable|date_format:H:i:s',
            'notes' => 'nullable|string|max:255',
            'attendance_type' => ['required', Rule::in(['office', 'remote', 'manual'])],
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        $oldStatus = $attendance->status->value ?? $attendance->status;

        $attendance->status = $request->status;
        $attendance->check_in = $request->check_in;
        $attendance->check_out = $request->check_out;
        $attendance->notes = $request->notes;
        $attendance->attendance_type = $request->attendance_type;
        $attendance->save();

        $this->logActivity(
            ActivityAction::UPDATE_SETTINGS,
            "Admin memperbarui kehadiran mahasiswa {$attendance->user->name} tanggal {$attendance->date->format('Y-m-d')}. Status diubah dari {$oldStatus} ke {$request->status}."
        );

        return $this->successResponse('Data kehadiran berhasil diperbarui.', $attendance);
    }

    public function destroy($id)
    {
        $attendance = Attendance::with('user')->find($id);

        if (!$attendance) {
            return $this->errorResponse('Data kehadiran tidak ditemukan.', 404);
        }

        $this->logActivity(
            ActivityAction::UPDATE_SETTINGS,
            "Admin menghapus data kehadiran mahasiswa {$attendance->user->name} tanggal {$attendance->date->format('Y-m-d')}."
        );

        $attendance->delete();

        return $this->successResponse('Data kehadiran berhasil dihapus.');
    }

    public function export(Request $request)
    {
        $search = $request->input('search');
        $month = $request->input('month');
        $year = $request->input('year');
        $status = $request->input('status');

        $query = Attendance::with('user:id,nip,name,department,position');

        if ($search) {
            $query->whereHas('user', function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                  ->orWhere('nip', 'like', '%' . $search . '%');
            });
        }

        if ($month) {
            $query->whereMonth('date', $month);
        }

        if ($year) {
            $query->whereYear('date', $year);
        }

        if ($status) {
            $query->where('status', $status);
        }

        $attendances = $query->orderBy('date', 'desc')->get();

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="data_kehadiran_' . date('Ymd_His') . '.csv"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0'
        ];

        $callback = function () use ($attendances) {
            $file = fopen('php://output', 'w');
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF)); // BOM UTF-8

            fputcsv($file, ['Tanggal', 'NIP', 'Nama', 'Divisi', 'Jam Masuk', 'Jam Pulang', 'Status', 'Tipe', 'Lokasi', 'Catatan']);

            foreach ($attendances as $att) {
                fputcsv($file, [
                    $att->date->format('Y-m-d'),
                    $att->user->nip ?? '-',
                    $att->user->name ?? '-',
                    $att->user->department ?? '-',
                    $att->check_in ?? '-',
                    $att->check_out ?? '-',
                    $att->status->value ?? $att->status,
                    $att->attendance_type->value ?? $att->attendance_type,
                    $att->location ?? '-',
                    $att->notes ?? '-'
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
