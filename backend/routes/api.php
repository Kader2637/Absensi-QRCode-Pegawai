<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\v1\AuthController;
use App\Http\Controllers\Api\v1\DashboardController;
use App\Http\Controllers\Api\v1\PegawaiController;
use App\Http\Controllers\Api\v1\QRCodeController;
use App\Http\Controllers\Api\v1\ScanController;
use App\Http\Controllers\Api\v1\AttendanceController;
use App\Http\Controllers\Api\v1\LeaveRequestController;
use App\Http\Controllers\Api\v1\NotificationController;
use App\Http\Controllers\Api\v1\SettingsController;

Route::prefix('v1')->group(function () {
    // Public authentication routes
    Route::post('/login', [AuthController::class, 'login']);

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
        Route::post('/pegawai/stop-impersonate', [PegawaiController::class, 'stopImpersonate']);

        // Shared QR Code route (for both admin and employees to download/view)
        Route::get('/qrcode/latest', [QRCodeController::class, 'latest']);

        // Admin restricted routes
        Route::middleware(['role:admin'])->group(function () {
            // Dashboard
            Route::get('/admin/dashboard', [DashboardController::class, 'adminDashboard']);
            
            // Employee Management
            Route::get('/admin/pegawai', [PegawaiController::class, 'index']);
            Route::post('/admin/pegawai', [PegawaiController::class, 'store']);
            Route::get('/admin/pegawai/export', [PegawaiController::class, 'export']);
            Route::post('/admin/pegawai/import', [PegawaiController::class, 'import']);
            Route::get('/admin/pegawai/{id}', [PegawaiController::class, 'show']);
            Route::put('/admin/pegawai/{id}', [PegawaiController::class, 'update']);
            Route::delete('/admin/pegawai/{id}', [PegawaiController::class, 'destroy']);
            Route::post('/admin/pegawai/{id}/impersonate', [PegawaiController::class, 'impersonate']);
            
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
        });

        // Pegawai restricted routes
        Route::middleware(['role:pegawai'])->group(function () {
            // Dashboard & History
            Route::get('/pegawai/dashboard', [DashboardController::class, 'pegawaiDashboard']);
            Route::get('/pegawai/history', [AttendanceController::class, 'history']);
            
            // Leave Requests
            Route::get('/pegawai/leave', [LeaveRequestController::class, 'index']);
            Route::post('/pegawai/leave', [LeaveRequestController::class, 'store']);
            
            // Scan QR Attendance
            Route::post('/pegawai/scan', [ScanController::class, 'scan']);
        });
    });
});
