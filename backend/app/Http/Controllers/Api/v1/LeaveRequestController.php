<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\LeaveRequest;
use App\Models\Attendance;
use App\Enums\LeaveRequestStatus;
use App\Enums\AttendanceStatus;
use App\Enums\AttendanceType;
use App\Enums\ActivityAction;
use App\Notifications\LeaveRequestStatusUpdated;
use App\Traits\ApiResponseTrait;
use App\Traits\AuditLogTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Carbon\Carbon;

class LeaveRequestController extends Controller
{
    use ApiResponseTrait, AuditLogTrait;

    public function index(Request $request)
    {
        $limit = $request->input('limit', 10);
        $userId = Auth::id();

        $leaves = LeaveRequest::where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->paginate($limit);

        return response()->json([
            'success' => true,
            'message' => 'Pengajuan izin Anda berhasil diambil.',
            'data' => $leaves->items(),
            'meta' => [
                'current_page' => $leaves->currentPage(),
                'last_page' => $leaves->lastPage(),
                'per_page' => $leaves->perPage(),
                'total' => $leaves->total(),
            ]
        ]);
    }

    public function adminIndex(Request $request)
    {
        $limit = $request->input('limit', 10);
        $status = $request->input('status');
        $type = $request->input('type');

        $query = LeaveRequest::with('user:id,nip,name,department');

        if ($status) {
            $query->where('status', $status);
        }

        if ($type) {
            $query->where('type', $type);
        }

        $leaves = $query->orderBy('created_at', 'desc')->paginate($limit);

        return response()->json([
            'success' => true,
            'message' => 'Daftar pengajuan izin berhasil diambil.',
            'data' => $leaves->items(),
            'meta' => [
                'current_page' => $leaves->currentPage(),
                'last_page' => $leaves->lastPage(),
                'per_page' => $leaves->perPage(),
                'total' => $leaves->total(),
            ]
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'type' => ['required', Rule::in(['izin', 'sakit'])],
            'reason' => 'required|string|min:5',
            'start_date' => 'required|date|after_or_equal:today',
            'end_date' => 'required|date|after_or_equal:start_date',
            'file' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:2048', // 2MB max
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        $userId = Auth::id();
        $fileUrl = null;

        if ($request->hasFile('file')) {
            $path = $request->file('file')->store('leave_documents', 'public');
            $fileUrl = '/storage/' . $path;
        }

        $leave = LeaveRequest::create([
            'user_id' => $userId,
            'type' => $request->type,
            'reason' => $request->reason,
            'file_url' => $fileUrl,
            'status' => LeaveRequestStatus::PENDING,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
        ]);

        $this->logActivity(
            ActivityAction::CREATE_EMPLOYEE, // Can map to generic action or custom
            "Mahasiswa mengajukan {$request->type} dari {$request->start_date} s/d {$request->end_date}.",
            $userId
        );

        return $this->successResponse('Pengajuan izin berhasil dikirim.', $leave, 201);
    }

    public function approve(Request $request, $id)
    {
        $leave = LeaveRequest::with('user')->find($id);

        if (!$leave) {
            return $this->errorResponse('Pengajuan izin tidak ditemukan.', 404);
        }

        if ($leave->status !== LeaveRequestStatus::PENDING) {
            return $this->errorResponse('Pengajuan ini sudah diproses.', 400);
        }

        $validator = Validator::make($request->all(), [
            'admin_notes' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        $leave->status = LeaveRequestStatus::APPROVED;
        $leave->admin_notes = $request->admin_notes;
        $leave->save();

        // Auto-create/update attendances for the range of dates
        $start = Carbon::parse($leave->start_date);
        $end = Carbon::parse($leave->end_date);
        $employee = $leave->user;

        for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
            Attendance::updateOrCreate([
                'user_id' => $leave->user_id,
                'date' => $date->format('Y-m-d'),
            ], [
                'status' => $leave->type === 'sakit' ? AttendanceStatus::SAKIT : AttendanceStatus::IZIN,
                'attendance_type' => AttendanceType::MANUAL,
                'notes' => 'Izin/Sakit disetujui admin. Catatan: ' . ($leave->admin_notes ?? '-'),
            ]);
        }

        // Notify Employee (DB + Broadcast)
        $employee->notify(new LeaveRequestStatusUpdated($leave));

        $this->logActivity(
            ActivityAction::APPROVE_LEAVE,
            "Admin menyetujui pengajuan {$leave->type} mahasiswa {$employee->name} dari {$leave->start_date->format('Y-m-d')} s/d {$leave->end_date->format('Y-m-d')}."
        );

        return $this->successResponse('Pengajuan izin disetujui.', $leave);
    }

    public function reject(Request $request, $id)
    {
        $leave = LeaveRequest::with('user')->find($id);

        if (!$leave) {
            return $this->errorResponse('Pengajuan izin tidak ditemukan.', 404);
        }

        if ($leave->status !== LeaveRequestStatus::PENDING) {
            return $this->errorResponse('Pengajuan ini sudah diproses.', 400);
        }

        $validator = Validator::make($request->all(), [
            'admin_notes' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        $leave->status = LeaveRequestStatus::REJECTED;
        $leave->admin_notes = $request->admin_notes;
        $leave->save();

        $employee = $leave->user;

        // Notify Employee (DB + Broadcast)
        $employee->notify(new LeaveRequestStatusUpdated($leave));

        $this->logActivity(
            ActivityAction::REJECT_LEAVE,
            "Admin menolak pengajuan {$leave->type} mahasiswa {$employee->name} dengan alasan: {$request->admin_notes}."
        );

        return $this->successResponse('Pengajuan izin ditolak.', $leave);
    }
}
