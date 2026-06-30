<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Enums\UserRole;
use App\Enums\ActivityAction;
use App\Traits\ApiResponseTrait;
use App\Traits\AuditLogTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class PegawaiController extends Controller
{
    use ApiResponseTrait, AuditLogTrait;

    public function index(Request $request)
    {
        $search = $request->input('search');
        $limit = $request->input('limit', 10);
        $sort = $request->input('sort', 'created_at');
        $order = $request->input('order', 'desc');

        // Allow sorting only on safe columns
        $safeSort = in_array($sort, ['nip', 'name', 'email', 'position', 'department', 'status', 'created_at']) ? $sort : 'created_at';
        $safeOrder = in_array(strtolower($order), ['asc', 'desc']) ? $order : 'desc';

        $query = User::query();

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                  ->orWhere('nip', 'like', '%' . $search . '%')
                  ->orWhere('email', 'like', '%' . $search . '%')
                  ->orWhere('position', 'like', '%' . $search . '%')
                  ->orWhere('department', 'like', '%' . $search . '%');
            });
        }

        // Exclude admin if requested, or filter by role
        if ($request->has('role')) {
            $query->where('role', $request->role);
        }

        $users = $query->orderBy($safeSort, $safeOrder)->paginate($limit);

        return response()->json([
            'success' => true,
            'message' => 'Daftar pegawai berhasil diambil.',
            'data' => $users->items(),
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ]
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nip' => 'required|string|unique:users,nip',
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'phone_number' => 'nullable|string|max:20',
            'position' => 'nullable|string|max:255',
            'department' => 'nullable|string|max:255',
            'password' => 'required|string|min:8',
            'role' => ['required', Rule::in(['admin', 'pegawai'])],
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        $user = User::create([
            'nip' => $request->nip,
            'name' => $request->name,
            'email' => $request->email,
            'phone_number' => $request->phone_number,
            'position' => $request->position,
            'department' => $request->department,
            'password' => Hash::make($request->password),
            'role' => $request->role === 'admin' ? UserRole::ADMIN : UserRole::PEGAWAI,
            'status' => $request->status,
        ]);

        return $this->successResponse('Pegawai berhasil ditambahkan.', $user, 201);
    }

    public function show($id)
    {
        $user = User::find($id);

        if (!$user) {
            return $this->errorResponse('Pegawai tidak ditemukan.', 404);
        }

        return $this->successResponse('Detail pegawai berhasil diambil.', $user);
    }

    public function update(Request $request, $id)
    {
        $user = User::find($id);

        if (!$user) {
            return $this->errorResponse('Pegawai tidak ditemukan.', 404);
        }

        $validator = Validator::make($request->all(), [
            'nip' => 'required|string|unique:users,nip,' . $user->id,
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $user->id,
            'phone_number' => 'nullable|string|max:20',
            'position' => 'nullable|string|max:255',
            'department' => 'nullable|string|max:255',
            'password' => 'nullable|string|min:8',
            'role' => ['required', Rule::in(['admin', 'pegawai'])],
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        $user->nip = $request->nip;
        $user->name = $request->name;
        $user->email = $request->email;
        $user->phone_number = $request->phone_number;
        $user->position = $request->position;
        $user->department = $request->department;
        $user->role = $request->role === 'admin' ? UserRole::ADMIN : UserRole::PEGAWAI;
        $user->status = $request->status;

        if ($request->filled('password')) {
            $user->password = Hash::make($request->password);
        }

        $user->save();

        return $this->successResponse('Pegawai berhasil diperbarui.', $user);
    }

    public function destroy($id)
    {
        $user = User::find($id);

        if (!$user) {
            return $this->errorResponse('Pegawai tidak ditemukan.', 404);
        }

        if ($user->id === Auth::id()) {
            return $this->errorResponse('Anda tidak dapat menghapus akun Anda sendiri.', 400);
        }

        $user->delete(); // Soft delete

        return $this->successResponse('Pegawai berhasil dihapus.');
    }

    public function impersonate(Request $request, $id)
    {
        $targetUser = User::find($id);

        if (!$targetUser) {
            return $this->errorResponse('Pegawai tidak ditemukan.', 404);
        }

        if ($targetUser->role === UserRole::ADMIN) {
            return $this->errorResponse('Anda tidak dapat meng-impersonate admin lain.', 400);
        }

        if ($targetUser->status !== 'active') {
            return $this->errorResponse('Akun pegawai tidak aktif.', 400);
        }

        $adminId = Auth::id();

        // Log impersonation start
        $this->logActivity(
            ActivityAction::IMPERSONATE,
            "Admin " . Auth::user()->name . " mulai meng-impersonate pegawai {$targetUser->name}.",
            $adminId
        );

        // Store impersonator ID in session
        $request->session()->put('impersonator_id', $adminId);

        // Login as the employee
        Auth::login($targetUser);

        return $this->successResponse("Berhasil masuk sebagai {$targetUser->name}.", [
            'user' => $targetUser
        ]);
    }

    public function stopImpersonate(Request $request)
    {
        if (!$request->session()->has('impersonator_id')) {
            return $this->errorResponse('Anda tidak sedang melakukan impersonasi.', 400);
        }

        $adminId = $request->session()->pull('impersonator_id');
        $admin = User::find($adminId);

        if (!$admin) {
            return $this->errorResponse('Admin asal tidak ditemukan.', 404);
        }

        // Login admin back
        Auth::login($admin);

        $this->logActivity(
            ActivityAction::STOP_IMPERSONATE,
            "Admin {$admin->name} menghentikan impersonasi.",
            $admin->id
        );

        return $this->successResponse('Impersonasi dihentikan.', [
            'user' => $admin
        ]);
    }

    public function export()
    {
        $users = User::where('role', 'pegawai')->get();

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="data_pegawai_' . date('Ymd_His') . '.csv"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0'
        ];

        $callback = function () use ($users) {
            $file = fopen('php://output', 'w');
            
            // Add UTF-8 BOM for proper Excel encoding
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF));

            fputcsv($file, ['NIP', 'Nama', 'Email', 'No HP', 'Jabatan', 'Divisi', 'Status']);

            foreach ($users as $user) {
                fputcsv($file, [
                    $user->nip,
                    $user->name,
                    $user->email,
                    $user->phone_number ?? '-',
                    $user->position ?? '-',
                    $user->department ?? '-',
                    $user->status
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function import(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:csv,txt|max:2048',
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        $file = $request->file('file');
        $handle = fopen($file->getPathname(), 'r');
        
        // Remove BOM if present
        $bom = fread($handle, 3);
        if ($bom !== "\xEF\xBB\xBF") {
            rewind($handle);
        }

        $header = fgetcsv($handle, 1000, ',');
        
        $importedCount = 0;
        $errors = [];
        $rowNum = 1;

        while (($data = fgetcsv($handle, 1000, ',')) !== FALSE) {
            $rowNum++;
            if (count($data) < 3) {
                $errors[] = "Baris {$rowNum}: Kolom tidak lengkap.";
                continue;
            }

            // Columns mapping: NIP, Nama, Email, No HP, Jabatan, Divisi
            $nip = trim($data[0]);
            $name = trim($data[1]);
            $email = trim($data[2]);
            $phone = isset($data[3]) ? trim($data[3]) : null;
            $position = isset($data[4]) ? trim($data[4]) : null;
            $department = isset($data[5]) ? trim($data[5]) : null;

            // Simple validation
            if (empty($nip) || empty($name) || empty($email)) {
                $errors[] = "Baris {$rowNum}: NIP, Nama, dan Email wajib diisi.";
                continue;
            }

            if (User::where('nip', $nip)->exists()) {
                $errors[] = "Baris {$rowNum}: NIP {$nip} sudah terdaftar.";
                continue;
            }

            if (User::where('email', $email)->exists()) {
                $errors[] = "Baris {$rowNum}: Email {$email} sudah terdaftar.";
                continue;
            }

            User::create([
                'nip' => $nip,
                'name' => $name,
                'email' => $email,
                'phone_number' => $phone,
                'position' => $position,
                'department' => $department,
                'password' => Hash::make('password'), // default password
                'role' => UserRole::PEGAWAI,
                'status' => 'active',
            ]);

            $importedCount++;
        }

        fclose($handle);

        $this->logActivity(
            ActivityAction::CREATE_EMPLOYEE,
            "Mengimpor {$importedCount} data pegawai dari berkas CSV."
        );

        return $this->successResponse("Impor selesai. {$importedCount} pegawai berhasil diimpor.", [
            'imported_count' => $importedCount,
            'errors' => $errors
        ]);
    }
}
