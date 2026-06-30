import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../../api/axios';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import Alert from '../../../components/ui/Alert';
import Skeleton from '../../../components/ui/Skeleton';
import toast from 'react-hot-toast';
import { FiSettings, FiSave } from 'react-icons/fi';

// Zod Schema to validate time strings in HH:MM:SS format
const settingsSchema = z.object({
  check_in_start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, 'Format harus HH:MM:SS'),
  check_in_end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, 'Format harus HH:MM:SS'),
  check_out_start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, 'Format harus HH:MM:SS'),
  check_out_end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, 'Format harus HH:MM:SS'),
  late_after: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, 'Format harus HH:MM:SS'),
});

const Settings = () => {
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(settingsSchema)
  });

  // 1. Fetch Current Settings
  const { data: settings, isLoading, isError, error } = useQuery({
    queryKey: ['attendanceSettings'],
    queryFn: async () => {
      const res = await api.get('/admin/settings');
      const data = res.data.data;
      reset({
        check_in_start: data.check_in_start,
        check_in_end: data.check_in_end,
        check_out_start: data.check_out_start,
        check_out_end: data.check_out_end,
        late_after: data.late_after,
      });
      return data;
    }
  });

  // 2. Mutate Settings
  const updateMutation = useMutation({
    mutationFn: async (data) => {
      return await api.put('/admin/settings', data);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['attendanceSettings'] });
      toast.success(res.data.message || 'Pengaturan jam kerja diperbarui.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Gagal memperbarui pengaturan.');
    }
  });

  return (
    <div className="space-y-6 text-left max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Pengaturan Jam Kerja</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Atur jam mulai scan masuk, jam pulang, serta toleransi keterlambatan secara dinamis.</p>
      </div>

      {isLoading ? (
        <Skeleton className="h-80" />
      ) : isError ? (
        <Alert type="error" title="Gagal memuat pengaturan" message={error.message} />
      ) : (
        <div className="bg-white dark:bg-gray-850 p-6 rounded-2xl border border-gray-200/60 dark:border-gray-800">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <FiSettings className="text-blue-500" /> Konfigurasi Operasional Absensi
          </h3>

          <form onSubmit={handleSubmit(updateMutation.mutate)} className="space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Awal Mulai Absen Masuk (HH:MM:SS)"
                placeholder="06:00:00"
                error={errors.check_in_start}
                required
                {...register('check_in_start')}
              />

              <Input
                label="Batas Akhir Absen Masuk (HH:MM:SS)"
                placeholder="12:00:00"
                error={errors.check_in_end}
                required
                {...register('check_in_end')}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Awal Mulai Absen Pulang (HH:MM:SS)"
                placeholder="12:00:00"
                error={errors.check_out_start}
                required
                {...register('check_out_start')}
              />

              <Input
                label="Batas Akhir Absen Pulang (HH:MM:SS)"
                placeholder="22:00:00"
                error={errors.check_out_end}
                required
                {...register('check_out_end')}
              />
            </div>

            <div className="border-t border-gray-150 dark:border-gray-800 pt-4">
              <Input
                label="Toleransi Terlambat Setelah Jam (HH:MM:SS)"
                placeholder="08:00:00"
                error={errors.late_after}
                required
                {...register('late_after')}
              />
              <span className="text-[11px] text-gray-400 block -mt-2">Pegawai yang memindai QR masuk setelah jam ini akan otomatis berstatus Terlambat.</span>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-150 dark:border-gray-800">
              <Button
                type="submit"
                variant="primary"
                loading={updateMutation.isPending}
                className="w-full sm:w-auto px-6 cursor-pointer gap-2 font-semibold"
              >
                <FiSave /> Simpan Konfigurasi
              </Button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default Settings;
