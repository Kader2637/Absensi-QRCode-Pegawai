<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('qr_code_id')->nullable()->constrained('qr_codes')->onDelete('set null');
            $table->date('date');
            $table->time('check_in')->nullable();
            $table->time('check_out')->nullable();
            $table->string('status'); // Cast to AttendanceStatus Enum
            $table->string('attendance_type')->default('office'); // Cast to AttendanceType Enum
            $table->string('location')->nullable();
            $table->string('notes')->nullable();
            $table->timestamps();

            // Enforce single attendance record per user per date
            $table->unique(['user_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendances');
    }
};
