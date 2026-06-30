<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Attendance;
use App\Models\ActivityLog;
use App\Models\LeaveRequest;
use App\Enums\UserRole;
use App\Enums\AttendanceStatus;
use App\Enums\LeaveRequestStatus;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class DashboardController extends Controller
{
    use ApiResponseTrait;

    public function adminDashboard(Request $request)
    {
        $today = now()->toDateString();

        // 1. Core counters
        $totalPegawai = User::where('role', UserRole::PEGAWAI)->count();
        
        $hadirToday = Attendance::where('date', $today)->where('status', AttendanceStatus::HADIR)->count();
        $terlambatToday = Attendance::where('date', $today)->where('status', AttendanceStatus::TERLAMBAT)->count();
        $izinToday = Attendance::where('date', $today)->where('status', AttendanceStatus::IZIN)->count();
        $sakitToday = Attendance::where('date', $today)->where('status', AttendanceStatus::SAKIT)->count();
        
        $totalNotAlpha = Attendance::where('date', $today)->count();
        $alphaToday = max(0, $totalPegawai - $totalNotAlpha);

        $attendanceRate = $totalPegawai > 0 
            ? round((($hadirToday + $terlambatToday) / $totalPegawai) * 100, 1) 
            : 0;

        // 2. Weekly Trend (last 7 days)
        $weeklyData = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = now()->subDays($i)->toDateString();
            $dName = now()->subDays($i)->translatedFormat('D');
            
            $h = Attendance::where('date', $date)->whereIn('status', [AttendanceStatus::HADIR, AttendanceStatus::TERLAMBAT])->count();
            $iz = Attendance::where('date', $date)->where('status', AttendanceStatus::IZIN)->count();
            $sa = Attendance::where('date', $date)->where('status', AttendanceStatus::SAKIT)->count();
            $totalActiveOnDay = User::where('role', UserRole::PEGAWAI)->where('created_at', '<=', $date . ' 23:59:59')->count();
            $scannedOnDay = Attendance::where('date', $date)->count();
            $al = max(0, $totalActiveOnDay - $scannedOnDay);

            $weeklyData[] = [
                'day' => $dName,
                'date' => $date,
                'Hadir' => $h,
                'Izin' => $iz,
                'Sakit' => $sa,
                'Alpha' => $al
            ];
        }

        // 3. Monthly Trend (last 30 days) - Optimized single database query
        $startDate = now()->subDays(29)->toDateString();
        $attendanceCounts = Attendance::where('date', '>=', $startDate)
            ->selectRaw('date, status, count(*) as count')
            ->groupBy('date', 'status')
            ->get()
            ->groupBy('date');

        $monthlyData = [];
        for ($i = 29; $i >= 0; $i--) {
            $date = now()->subDays($i)->toDateString();
            $dayCounts = $attendanceCounts->get($date) ?? collect();
            
            $h = 0;
            $iz = 0;
            $sa = 0;
            
            foreach ($dayCounts as $c) {
                $st = $c->status->value ?? $c->status;
                if ($st === 'hadir' || $st === 'terlambat') {
                    $h += $c->count;
                } elseif ($st === 'izin') {
                    $iz = $c->count;
                } elseif ($st === 'sakit') {
                    $sa = $c->count;
                }
            }

            $totalActiveOnDay = User::where('role', UserRole::PEGAWAI)->where('created_at', '<=', $date . ' 23:59:59')->count();
            $scannedOnDay = $dayCounts->sum('count');
            $al = max(0, $totalActiveOnDay - $scannedOnDay);

            $monthlyData[] = [
                'date' => Carbon::parse($date)->format('d M'),
                'Hadir' => $h,
                'Izin' => $iz,
                'Sakit' => $sa,
                'Alpha' => $al
            ];
        }

        // 4. Department Statistics
        $departments = User::where('role', UserRole::PEGAWAI)
            ->whereNotNull('department')
            ->where('department', '<>', '')
            ->selectRaw('department, count(*) as total')
            ->groupBy('department')
            ->get();

        $deptStats = [];
        foreach ($departments as $dept) {
            $present = Attendance::where('date', $today)
                ->whereIn('status', [AttendanceStatus::HADIR, AttendanceStatus::TERLAMBAT])
                ->whereHas('user', function ($q) use ($dept) {
                    $q->where('department', $dept->department);
                })
                ->count();

            $deptStats[] = [
                'department' => $dept->department,
                'total' => $dept->total,
                'present' => $present
            ];
        }

        // 5. Late Ranking (This month)
        $lateRanking = Attendance::whereMonth('date', now()->month)
            ->whereYear('date', now()->year)
            ->where('status', AttendanceStatus::TERLAMBAT)
            ->selectRaw('user_id, count(*) as late_count')
            ->groupBy('user_id')
            ->orderBy('late_count', 'desc')
            ->limit(5)
            ->with('user:id,nip,name,department,position')
            ->get()
            ->map(function ($att) {
                return [
                    'name' => $att->user->name ?? 'Pegawai',
                    'nip' => $att->user->nip ?? '-',
                    'position' => $att->user->position ?? '-',
                    'department' => $att->user->department ?? '-',
                    'late_count' => $att->late_count
                ];
            });

        // 6. Recent Activities (Audit Log)
        $recentActivities = ActivityLog::with('user:id,name,role')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        return $this->successResponse('Data dashboard admin berhasil dimuat.', [
            'stats' => [
                'total_pegawai' => $totalPegawai,
                'hadir' => $hadirToday,
                'terlambat' => $terlambatToday,
                'izin' => $izinToday,
                'sakit' => $sakitToday,
                'alpha' => $alphaToday,
                'attendance_rate' => $attendanceRate,
            ],
            'weekly_trend' => $weeklyData,
            'monthly_trend' => $monthlyData,
            'department_stats' => $deptStats,
            'late_ranking' => $lateRanking,
            'recent_activities' => $recentActivities
        ]);
    }

    public function pegawaiDashboard(Request $request)
    {
        $user = $request->user();
        $today = now()->toDateString();
        $startOfMonth = now()->startOfMonth()->toDateString();

        // 1. Today's status
        $todayAttendance = Attendance::where('user_id', $user->id)
            ->where('date', $today)
            ->first();

        // 2. Personal Month stats
        $hadirMonth = Attendance::where('user_id', $user->id)
            ->whereBetween('date', [$startOfMonth, $today])
            ->where('status', AttendanceStatus::HADIR)
            ->count();

        $terlambatMonth = Attendance::where('user_id', $user->id)
            ->whereBetween('date', [$startOfMonth, $today])
            ->where('status', AttendanceStatus::TERLAMBAT)
            ->count();

        $izinMonth = Attendance::where('user_id', $user->id)
            ->whereBetween('date', [$startOfMonth, $today])
            ->where('status', AttendanceStatus::IZIN)
            ->count();

        $sakitMonth = Attendance::where('user_id', $user->id)
            ->whereBetween('date', [$startOfMonth, $today])
            ->where('status', AttendanceStatus::SAKIT)
            ->count();

        // Compute alpha for pegawai: total calendar days in working days minus present/excused days
        // Or simply: total days from start of month till today, minus actual attendance logs
        $totalDaysElapsed = Carbon::parse($startOfMonth)->diffInDays(now()) + 1;
        
        // Let's filter out weekends from elapsed days to get working days elapsed (if we want, or just simple count)
        $workingDaysElapsed = 0;
        for ($date = Carbon::parse($startOfMonth)->copy(); $date->lte(now()); $date->addDay()) {
            if (!$date->isWeekend()) {
                $workingDaysElapsed++;
            }
        }

        $recordedLogsCount = Attendance::where('user_id', $user->id)
            ->whereBetween('date', [$startOfMonth, $today])
            ->count();

        $alphaMonth = max(0, $workingDaysElapsed - $recordedLogsCount);

        // 3. Personal 30 days history
        $recentHistory = Attendance::where('user_id', $user->id)
            ->orderBy('date', 'desc')
            ->limit(10)
            ->get();

        // 4. Personal logs
        $recentLogs = ActivityLog::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        return $this->successResponse('Data dashboard pegawai berhasil dimuat.', [
            'today' => $todayAttendance ? [
                'check_in' => $todayAttendance->check_in,
                'check_out' => $todayAttendance->check_out,
                'status' => $todayAttendance->status->value ?? $todayAttendance->status,
                'type' => $todayAttendance->attendance_type->value ?? $todayAttendance->attendance_type,
            ] : null,
            'stats' => [
                'hadir' => $hadirMonth,
                'terlambat' => $terlambatMonth,
                'izin' => $izinMonth,
                'sakit' => $sakitMonth,
                'alpha' => $alphaMonth,
            ],
            'recent_history' => $recentHistory,
            'recent_logs' => $recentLogs
        ]);
    }
}
