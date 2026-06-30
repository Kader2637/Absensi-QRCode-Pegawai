<?php

namespace App\Http\Middleware;

use App\Enums\UserRole;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    public function handle(Request $request, Closure $next, string $role): Response
    {
        $user = $request->user();

        if (!$user || $user->role->value !== $role) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak memiliki hak akses untuk halaman/aksi ini.'
            ], 403);
        }

        return $next($request);
    }
}
