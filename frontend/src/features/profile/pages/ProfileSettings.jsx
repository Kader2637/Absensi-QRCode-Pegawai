import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../../api/axios';
import { useAuth } from '../../../context/AuthContext';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import Alert from '../../../components/ui/Alert';
import toast from 'react-hot-toast';
import { FiUser, FiKey, FiCamera } from 'react-icons/fi';

// 1. Zod Validation Schemas
const profileSchema = z.object({
  name: z.string().min(1, 'Nama lengkap wajib diisi'),
  email: z.string().min(1, 'Email wajib diisi').email('Format email tidak valid'),
  phone_number: z.string().optional(),
});

const passwordSchema = z.object({
  current_password: z.string().min(1, 'Kata sandi saat ini wajib diisi'),
  new_password: z.string().min(6, 'Kata sandi baru minimal 6 karakter'),
  new_password_confirmation: z.string().min(1, 'Konfirmasi kata sandi wajib diisi'),
}).refine(data => data.new_password === data.new_password_confirmation, {
  message: "Konfirmasi kata sandi baru tidak cocok",
  path: ["new_password_confirmation"]
});

const ProfileSettings = () => {
  const { user, refreshProfile } = useAuth();
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Form hooks
  const { register: regProfile, handleSubmit: handleProfileSubmit, formState: { errors: profErrors } } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      phone_number: user?.phone_number || '',
    }
  });

  const { register: regPass, handleSubmit: handlePassSubmit, reset: resetPassForm, formState: { errors: passErrors } } = useForm({
    resolver: zodResolver(passwordSchema),
  });

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const onUpdateProfile = async (data) => {
    setProfileLoading(true);
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('email', data.email);
    if (data.phone_number) {
      formData.append('phone_number', data.phone_number);
    }
    if (avatarFile) {
      formData.append('avatar', avatarFile);
    }

    try {
      // Sanctum API updateProfile endpoint
      const res = await api.post('/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        toast.success('Profil berhasil diperbarui!');
        await refreshProfile();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memperbarui profil.');
    } finally {
      setProfileLoading(false);
    }
  };

  const onChangePassword = async (data) => {
    setPasswordLoading(true);
    try {
      const res = await api.post('/profile/password', {
        current_password: data.current_password,
        new_password: data.new_password,
        new_password_confirmation: data.new_password_confirmation
      });
      if (res.data.success) {
        toast.success(res.data.message || 'Kata sandi berhasil diperbarui.');
        resetPassForm();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengganti kata sandi. Periksa kata sandi lama Anda.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-left max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Pengaturan Profil</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Kelola foto profil Anda, perbarui detail informasi pegawai, dan amankan akun.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Avatar & Profile Form (Col span 2) */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-850 p-6 rounded-2xl border border-gray-200/60 dark:border-gray-800">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <FiUser className="text-blue-500" /> Detail Informasi Profil
            </h3>
            
            <form onSubmit={handleProfileSubmit(onUpdateProfile)} className="space-y-4">
              
              {/* Avatar upload layout */}
              <div className="flex items-center gap-4 mb-6">
                <div className="relative group cursor-pointer shrink-0">
                  <img
                    src={avatarPreview || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name)}&background=0D8ABC&color=fff`}
                    alt="Preview Avatar"
                    className="h-20 w-20 rounded-full object-cover border-2 border-blue-500 shadow-md"
                  />
                  <label className="absolute inset-0 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer">
                    <FiCamera className="h-5 w-5" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-white">Foto Profil</h4>
                  <p className="text-xs text-gray-400 mt-1">Dukung file: JPG, PNG, WEBP. Maks 2MB.</p>
                </div>
              </div>

              {/* Read-only NIP and Role */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-900 p-4 rounded-xl mb-4 text-xs font-semibold">
                <div>
                  <span className="text-gray-400 uppercase tracking-wider block mb-0.5">Nomor Induk Pegawai (NIP)</span>
                  <span className="text-gray-800 dark:text-gray-200 font-mono">{user?.nip || 'Belum diatur'}</span>
                </div>
                <div>
                  <span className="text-gray-400 uppercase tracking-wider block mb-0.5">Jabatan / Divisi</span>
                  <span className="text-gray-800 dark:text-gray-200 capitalize">
                    {user?.position || '-'} ({user?.department || 'Umum'})
                  </span>
                </div>
              </div>

              <Input
                label="Nama Lengkap"
                error={profErrors.name}
                required
                {...regProfile('name')}
              />

              <Input
                label="Alamat Email"
                type="email"
                error={profErrors.email}
                required
                {...regProfile('email')}
              />

              <Input
                label="Nomor Telepon / HP"
                error={profErrors.phone_number}
                {...regProfile('phone_number')}
              />

              <div className="flex justify-end pt-2">
                <Button type="submit" variant="primary" loading={profileLoading} className="px-6 cursor-pointer">
                  Simpan Profil
                </Button>
              </div>

            </form>
          </div>
        </div>

        {/* Right Column: Password security */}
        <div className="md:col-span-1">
          <div className="bg-white dark:bg-gray-850 p-6 rounded-2xl border border-gray-200/60 dark:border-gray-800">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <FiKey className="text-amber-500" /> Ubah Kata Sandi
            </h3>

            <form onSubmit={handlePassSubmit(onChangePassword)} className="space-y-4">
              <Input
                label="Kata Sandi Saat Ini"
                type="password"
                error={passErrors.current_password}
                required
                {...regPass('current_password')}
              />

              <Input
                label="Kata Sandi Baru"
                type="password"
                placeholder="Min. 6 karakter"
                error={passErrors.new_password}
                required
                {...regPass('new_password')}
              />

              <Input
                label="Konfirmasi Kata Sandi Baru"
                type="password"
                error={passErrors.new_password_confirmation}
                required
                {...regPass('new_password_confirmation')}
              />

              <div className="pt-2">
                <Button type="submit" variant="primary" loading={passwordLoading} className="w-full cursor-pointer bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600">
                  Perbarui Kata Sandi
                </Button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProfileSettings;
