<?php

namespace Database\Seeders;

use App\Models\User;
use App\Enums\UserRole;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Seed Attendance Settings
        DB::table('attendance_settings')->insert([
            'check_in_start' => '06:00:00',
            'check_in_end' => '12:00:00',
            'check_out_start' => '12:00:00',
            'check_out_end' => '22:00:00',
            'late_after' => '08:00:00',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 2. Seed Admin
        User::create([
            'nip' => '1000000000',
            'name' => 'Admin Absensi',
            'email' => 'admin@absensi.com',
            'phone_number' => '081234567890',
            'position' => 'System Administrator',
            'department' => 'IT Support',
            'password' => Hash::make('password'),
            'role' => UserRole::ADMIN,
            'status' => 'active',
        ]);

        // 3. Seed Active Employees
        User::create([
            'nip' => '199001012020121001',
            'name' => 'Budi Setiawan',
            'email' => 'budi@absensi.com',
            'phone_number' => '081234567891',
            'position' => 'Senior Web Developer',
            'department' => 'Technology',
            'password' => Hash::make('password'),
            'role' => UserRole::PEGAWAI,
            'status' => 'active',
        ]);

        User::create([
            'nip' => '199203152021082001',
            'name' => 'Siti Aminah',
            'email' => 'siti@absensi.com',
            'phone_number' => '081234567892',
            'position' => 'UI/UX Designer',
            'department' => 'Design',
            'password' => Hash::make('password'),
            'role' => UserRole::PEGAWAI,
            'status' => 'active',
        ]);

        // 4. Seed Inactive Employee (for testing block)
        User::create([
            'nip' => '198805202019051001',
            'name' => 'Joko Susilo',
            'email' => 'joko@absensi.com',
            'phone_number' => '081234567893',
            'position' => 'HR Specialist',
            'department' => 'HRD',
            'password' => Hash::make('password'),
            'role' => UserRole::PEGAWAI,
            'status' => 'inactive',
        ]);
    }
}
