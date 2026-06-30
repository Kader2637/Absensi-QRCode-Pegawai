<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Enums\ActivityAction;
use App\Traits\ApiResponseTrait;
use App\Traits\AuditLogTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    use ApiResponseTrait, AuditLogTrait;

    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        $credentials = $request->only('email', 'password');

        if (!Auth::attempt($credentials, $request->boolean('remember'))) {
            return $this->errorResponse('Email atau kata sandi salah.', 401);
        }

        $user = Auth::user();

        if ($user->status !== 'active') {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
            return $this->errorResponse('Akun Anda dinonaktifkan. Silakan hubungi administrator.', 403);
        }

        $request->session()->regenerate();

        $this->logActivity(
            ActivityAction::LOGIN,
            "Pegawai {$user->name} berhasil login.",
            $user->id
        );

        return $this->successResponse('Login berhasil.', [
            'user' => $user
        ]);
    }

    public function logout(Request $request)
    {
        $user = Auth::user();

        if ($user) {
            $this->logActivity(
                ActivityAction::LOGOUT,
                "Pegawai {$user->name} berhasil logout.",
                $user->id
            );
        }

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return $this->successResponse('Logout berhasil.');
    }

    public function profile(Request $request)
    {
        // Return authenticated user with impersonation state check if any
        $user = $request->user();
        $isImpersonating = $request->session()->has('impersonator_id');

        return $this->successResponse('Data profil berhasil diambil.', [
            'user' => $user,
            'is_impersonating' => $isImpersonating
        ]);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email,' . $user->id,
            'phone_number' => 'nullable|string|max:20',
            'avatar' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:2048',
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        $user->name = $request->name;
        $user->email = $request->email;
        $user->phone_number = $request->phone_number;

        if ($request->hasFile('avatar')) {
            $path = $request->file('avatar')->store('avatars', 'public');
            // Remove old avatar if exists? (Optional but clean)
            $user->avatar_url = '/storage/' . $path;
        }

        $user->save();

        $this->logActivity(
            ActivityAction::UPDATE_EMPLOYEE,
            "Pegawai {$user->name} memperbarui profil mandiri.",
            $user->id
        );

        return $this->successResponse('Profil berhasil diperbarui.', [
            'user' => $user
        ]);
    }

    public function changePassword(Request $request)
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'current_password' => 'required|string',
            'new_password' => ['required', 'confirmed', Password::defaults()],
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        if (!Hash::check($request->current_password, $user->password)) {
            return $this->errorResponse('Kata sandi saat ini tidak cocok.', 422);
        }

        $user->password = Hash::make($request->new_password);
        $user->save();

        $this->logActivity(
            ActivityAction::UPDATE_EMPLOYEE,
            "Pegawai {$user->name} mengganti kata sandi.",
            $user->id
        );

        return $this->successResponse('Kata sandi berhasil diperbarui.');
    }
}
