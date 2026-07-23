import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { IoQrCodeOutline } from 'react-icons/io5';
import { useAuth } from '../../../context/AuthContext';
import api, { getCsrfCookie } from '../../../api/axios';
import toast from 'react-hot-toast';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

// Define Form Validation Schema using Zod
const registerSchema = z.object({
  nip: z.string().min(1, 'NIM wajib diisi').max(50, 'NIM maksimal 50 karakter'),
  name: z.string().min(1, 'Nama lengkap wajib diisi').max(255, 'Nama maksimal 255 karakter'),
  email: z.string().min(1, 'Email wajib diisi').email('Format email tidak valid'),
  phone_number: z.string().max(20, 'Nomor telepon maksimal 20 karakter').optional().or(z.literal('')),
  position: z.string().max(255, 'Program studi/Angkatan maksimal 255 karakter').optional().or(z.literal('')),
  department: z.string().max(255, 'Jurusan/Kelas maksimal 255 karakter').optional().or(z.literal('')),
  password: z.string().min(1, 'Kata sandi wajib diisi').min(6, 'Kata sandi minimal 6 karakter'),
  password_confirmation: z.string().min(1, 'Konfirmasi kata sandi wajib diisi'),
}).refine((data) => data.password === data.password_confirmation, {
  message: 'Konfirmasi kata sandi tidak cocok',
  path: ['password_confirmation'],
});

const Register = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      nip: '',
      name: '',
      email: '',
      phone_number: '',
      position: '',
      department: '',
      password: '',
      password_confirmation: '',
    }
  });

  // If already authenticated, redirect to appropriate dashboard
  if (user) {
    const roleStr = user.role?.value || user.role;
    return <Navigate to={roleStr === 'admin' ? '/admin/dashboard' : '/mahasiswa/dashboard'} replace />;
  }

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      // 1. Fetch CSRF cookie first
      await getCsrfCookie();

      // 2. Post registration payload
      const response = await api.post('/register', data);

      if (response.data.success) {
        toast.success('Registrasi berhasil! Silakan masuk.');
        navigate('/login');
      } else {
        toast.error(response.data.message || 'Registrasi gagal.');
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Terjadi kesalahan saat registrasi.';
      if (error.response?.data?.errors) {
        // Detailed validation messages
        const details = Object.values(error.response.data.errors).flat().join('\n');
        toast.error(`${msg}\n${details}`);
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center p-4 py-12">
      <div className="max-w-2xl w-full bg-white/95 dark:bg-gray-850/95 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-white/20 dark:border-gray-800/40">

        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3.5 bg-blue-600 dark:bg-blue-500 rounded-2xl text-white text-3xl shadow-lg shadow-blue-500/30 mb-4 animate-pulse">
            <IoQrCodeOutline className="h-9 w-9" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white leading-tight">
            Pendaftaran Mahasiswa Baru
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
            Silakan buat akun untuk mulai menggunakan sistem absensi
          </p>
        </div>

        {/* Register Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-1 text-left">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">

            <Input
              label="NIM (Nomor Induk Mahasiswa)"
              type="text"
              placeholder="Contoh: 2022310001"
              error={errors.nip}
              required
              {...register('nip')}
            />

            <Input
              label="Nama Lengkap"
              type="text"
              placeholder="Nama Lengkap Anda"
              error={errors.name}
              required
              {...register('name')}
            />

            <Input
              label="Alamat Email"
              type="email"
              placeholder="nama@email.com"
              error={errors.email}
              required
              {...register('email')}
            />

            <Input
              label="Nomor Telepon"
              type="text"
              placeholder="Contoh: 081234567890"
              error={errors.phone_number}
              {...register('phone_number')}
            />

            <Input
              label="Jurusan / Kelas"
              type="text"
              placeholder="Contoh: TI-2022-A"
              error={errors.department}
              {...register('department')}
            />

            <Input
              label="Program Studi / Angkatan"
              type="text"
              placeholder="Contoh: Teknik Informatika"
              error={errors.position}
              {...register('position')}
            />

            <Input
              label="Kata Sandi"
              type="password"
              placeholder="Minimal 6 karakter"
              error={errors.password}
              required
              {...register('password')}
            />

            <Input
              label="Konfirmasi Kata Sandi"
              type="password"
              placeholder="Ketik ulang kata sandi"
              error={errors.password_confirmation}
              required
              {...register('password_confirmation')}
            />

          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            className="w-full py-2.5 text-base font-bold shadow-md shadow-blue-500/25 mt-6 cursor-pointer"
            loading={submitting}
          >
            Daftar Akun Baru
          </Button>

          {/* Login Redirection Link */}
          <div className="text-center mt-6">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Sudah memiliki akun?{' '}
              <Link to="/login" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                Masuk di sini
              </Link>
            </span>
          </div>

        </form>

        {/* Footer info */}
        <div className="text-center mt-8 text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800/80 pt-4">
          &copy; {new Date().getFullYear()}  All rights reserved.
        </div>

      </div>
    </div>
  );
};

export default Register;
