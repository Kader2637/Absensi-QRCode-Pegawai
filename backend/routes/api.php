<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\v1\AuthController;
use App\Http\Controllers\Api\v1\DashboardController;
use App\Http\Controllers\Api\v1\MahasiswaController;
use App\Http\Controllers\Api\v1\QRCodeController;
use App\Http\Controllers\Api\v1\ScanController;
use App\Http\Controllers\Api\v1\AttendanceController;
use App\Http\Controllers\Api\v1\LeaveRequestController;
use App\Http\Controllers\Api\v1\NotificationController;
use App\Http\Controllers\Api\v1\SettingsController;
use App\Http\Controllers\Api\v1\HolidayController;

Route::prefix('v1')->group(function () {
    // Public authentication routes
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register']);

    // Authenticated & Active routes
    Route::middleware(['auth:sanctum', 'active'])->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/profile', [AuthController::class, 'profile']);
        Route::post('/profile', [AuthController::class, 'updateProfile']);
        Route::post('/profile/password', [AuthController::class, 'changePassword']);
        
        // Notifications
        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
        Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
        
        // Impersonation termination
        Route::post('/mahasiswa/stop-impersonate', [MahasiswaController::class, 'stopImpersonate']);

        // Shared QR Code route (for both admin and employees to download/view)
        Route::get('/qrcode/latest', [QRCodeController::class, 'latest']);

        // Admin restricted routes
        Route::middleware(['role:admin'])->group(function () {
            // Dashboard
            Route::get('/admin/dashboard', [DashboardController::class, 'adminDashboard']);
            
            // Student Management
            Route::get('/admin/mahasiswa', [MahasiswaController::class, 'index']);
            Route::post('/admin/mahasiswa', [MahasiswaController::class, 'store']);
            Route::get('/admin/mahasiswa/export', [MahasiswaController::class, 'export']);
            Route::post('/admin/mahasiswa/import', [MahasiswaController::class, 'import']);
            Route::get('/admin/mahasiswa/{id}', [MahasiswaController::class, 'show']);
            Route::put('/admin/mahasiswa/{id}', [MahasiswaController::class, 'update']);
            Route::delete('/admin/mahasiswa/{id}', [MahasiswaController::class, 'destroy']);
            Route::post('/admin/mahasiswa/{id}/impersonate', [MahasiswaController::class, 'impersonate']);
            
            // QR Code Management
            Route::get('/admin/qrcode', [QRCodeController::class, 'index']);
            Route::post('/admin/qrcode', [QRCodeController::class, 'store']);
            Route::get('/admin/qrcode/latest', [QRCodeController::class, 'latest']);
            Route::post('/admin/qrcode/{id}/toggle', [QRCodeController::class, 'toggle']);
            Route::delete('/admin/qrcode/{id}', [QRCodeController::class, 'destroy']);
            
            // Attendance Management
            Route::get('/admin/attendance', [AttendanceController::class, 'index']);
            Route::get('/admin/attendance/export', [AttendanceController::class, 'export']);
            Route::put('/admin/attendance/{id}', [AttendanceController::class, 'update']);
            Route::delete('/admin/attendance/{id}', [AttendanceController::class, 'destroy']);
            
            // Leave Request Management
            Route::get('/admin/leave', [LeaveRequestController::class, 'adminIndex']);
            Route::post('/admin/leave/{id}/approve', [LeaveRequestController::class, 'approve']);
            Route::post('/admin/leave/{id}/reject', [LeaveRequestController::class, 'reject']);
            
            // System Settings
            Route::get('/admin/settings', [SettingsController::class, 'show']);
            Route::put('/admin/settings', [SettingsController::class, 'update']);

            // Holiday Management (CRUD)
            Route::apiResource('/admin/holidays', HolidayController::class);
        });

        // Pegawai restricted routes
        Route::middleware(['role:mahasiswa'])->group(function () {
            // Dashboard & History
            Route::get('/mahasiswa/dashboard', [DashboardController::class, 'mahasiswaDashboard']);
            Route::get('/mahasiswa/history', [AttendanceController::class, 'history']);
            
            // Leave Requests
            Route::get('/mahasiswa/leave', [LeaveRequestController::class, 'index']);
            Route::post('/mahasiswa/leave', [LeaveRequestController::class, 'store']);
            
            // Scan QR Attendance
            Route::post('/mahasiswa/scan', [ScanController::class, 'scan']);
 
            // Holidays
            Route::get('/mahasiswa/holidays', [HolidayController::class, 'index']);
        });
    });
});
