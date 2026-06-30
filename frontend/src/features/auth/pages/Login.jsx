import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate, Navigate } from 'react-router-dom';
import { IoQrCodeOutline } from 'react-icons/io5';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

// 1. Define Form Validation Schema using Zod
const loginSchema = z.object({
  email: z.string().min(1, 'Email wajib diisi').email('Format email tidak valid'),
  password: z.string().min(1, 'Kata sandi wajib diisi').min(6, 'Kata sandi minimal 6 karakter'),
  remember: z.boolean().optional(),
});

const Login = () => {
  const { user, login, loading, isAdmin } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      remember: false,
    }
  });

  // If already authenticated, redirect to appropriate dashboard
  if (user) {
    const roleStr = user.role?.value || user.role;
    return <Navigate to={roleStr === 'admin' ? '/admin/dashboard' : '/pegawai/dashboard'} replace />;
  }

  const onSubmit = async (data) => {
    const result = await login(data.email, data.password);
    if (result.success) {
      // Re-fetch profile to determine role and redirect
      // Wait, login function already sets user, we can retrieve role directly
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/95 dark:bg-gray-850/95 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-white/20 dark:border-gray-800/40">
        
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3.5 bg-blue-600 dark:bg-blue-500 rounded-2xl text-white text-3xl shadow-lg shadow-blue-500/30 mb-4 animate-pulse">
            <IoQrCodeOutline className="h-9 w-9" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white leading-tight">
            Sistem Informasi Absensi
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
            Silakan masuk ke akun Anda menggunakan email terdaftar
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left">
          
          <Input
            label="Alamat Email"
            type="email"
            placeholder="nama@perusahaan.com"
            error={errors.email}
            required
            {...register('email')}
          />

          <Input
            label="Kata Sandi"
            type="password"
            placeholder="••••••••"
            error={errors.password}
            required
            {...register('password')}
          />

          {/* Remember me */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <input
                id="remember"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer dark:bg-gray-800 dark:border-gray-700"
                {...register('remember')}
              />
              <label htmlFor="remember" className="ml-2 block text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                Ingat saya di perangkat ini
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            className="w-full py-2.5 text-base font-bold shadow-md shadow-blue-500/25 mt-4 cursor-pointer"
            loading={loading}
          >
            Masuk Aplikasi
          </Button>

        </form>

        {/* Footer info */}
        <div className="text-center mt-8 text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800/80 pt-4">
          &copy; {new Date().getFullYear()} PT. Solusi Enterprise. All rights reserved.
        </div>

      </div>
    </div>
  );
};

export default Login;
