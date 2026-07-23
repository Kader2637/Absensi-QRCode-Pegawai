import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../../api/axios';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Table from '../../../components/ui/Table';
import EmptyState from '../../../components/ui/EmptyState';
import Alert from '../../../components/ui/Alert';
import Skeleton from '../../../components/ui/Skeleton';
import toast from 'react-hot-toast';
import { FiSend, FiFile, FiPaperclip } from 'react-icons/fi';

// 1. Leave Submission Schema (Zod)
const leaveFormSchema = z.object({
  type: z.enum(['izin', 'sakit']),
  reason: z.string().min(5, 'Alasan minimal harus 5 karakter'),
  start_date: z.string().min(1, 'Tanggal mulai wajib diisi'),
  end_date: z.string().min(1, 'Tanggal selesai wajib diisi'),
});

const LeaveForm = () => {
  const queryClient = useQueryClient();
  const [fileAttachment, setFileAttachment] = useState(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(leaveFormSchema),
    defaultValues: {
      type: 'izin',
      reason: '',
      start_date: '',
      end_date: '',
    }
  });

  // 2. Fetch Employee's Personal Leaves
  const { data: myLeavesData, isLoading, isError, error } = useQuery({
    queryKey: ['myLeaves'],
    queryFn: async () => {
      const res = await api.get('/mahasiswa/leave');
      return res.data;
    }
  });

  const myLeaves = myLeavesData?.data || [];

  // 3. Mutate: Submit Leave Request
  const submitMutation = useMutation({
    mutationFn: async (formData) => {
      return await api.post('/mahasiswa/leave', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['myLeaves'] });
      toast.success(res.data.message || 'Pengajuan izin berhasil dikirim.');
      reset();
      setFileAttachment(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Gagal mengirim pengajuan.');
    }
  });

  const onSubmit = (data) => {
    // Basic date validation
    if (new Date(data.start_date) > new Date(data.end_date)) {
      toast.error('Tanggal mulai tidak boleh melebihi tanggal selesai.');
      return;
    }

    const formData = new FormData();
    formData.append('type', data.type);
    formData.append('reason', data.reason);
    formData.append('start_date', data.start_date);
    formData.append('end_date', data.end_date);
    if (fileAttachment) {
      formData.append('file', fileAttachment);
    }

    submitMutation.mutate(formData);
  };

  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Pengajuan Izin / Sakit</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Ajukan surat perizinan tidak masuk kelas atau surat keterangan sakit.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Leave Request Form */}
        <div className="bg-white dark:bg-gray-850 p-6 rounded-2xl border border-gray-200/60 dark:border-gray-800 lg:col-span-1">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Form Pengisian Pengajuan</h3>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            
            <div className="flex flex-col text-left mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipe Pengajuan <span className="text-red-500">*</span></label>
              <select 
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                {...register('type')}
              >
                <option value="izin">Izin Tidak Masuk</option>
                <option value="sakit">Sakit</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Tanggal Mulai"
                type="date"
                error={errors.start_date}
                required
                {...register('start_date')}
              />
              <Input
                label="Tanggal Selesai"
                type="date"
                error={errors.end_date}
                required
                {...register('end_date')}
              />
            </div>

            <div className="flex flex-col text-left mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alasan Pengajuan <span className="text-red-500">*</span></label>
              <textarea
                placeholder="Jelaskan alasan detail pengajuan izin Anda..."
                rows="4"
                className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 dark:bg-gray-850 dark:text-white dark:border-gray-750 ${
                  errors.reason ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                }`}
                {...register('reason')}
              />
              {errors.reason && <span className="text-xs text-red-500 mt-1 block">{errors.reason.message}</span>}
            </div>

            {/* File Upload input */}
            <div className="flex flex-col text-left mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                <FiPaperclip /> Unggah Berkas Pendukung (Opsional)
              </label>
              <input 
                type="file" 
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) => setFileAttachment(e.target.files[0])}
                className="block w-full text-xs text-gray-500 dark:text-gray-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/20 dark:file:text-blue-400 hover:file:bg-blue-100 cursor-pointer"
              />
              <span className="text-[10px] text-gray-400 mt-1">Dukung file: JPG, PNG, PDF (Maks. 2MB)</span>
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={submitMutation.isPending}
              className="w-full gap-2 cursor-pointer py-2.5"
            >
              <FiSend /> Kirim Pengajuan
            </Button>
          </form>
        </div>

        {/* Right: Personal Leaves History (Col span 2) */}
        <div className="bg-white dark:bg-gray-850 p-6 rounded-2xl border border-gray-200/60 dark:border-gray-800 lg:col-span-2">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Riwayat Pengajuan Anda</h3>
          
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10" count={4} />
            </div>
          ) : isError ? (
            <Alert type="error" title="Gagal memuat riwayat" message={error.message} />
          ) : myLeaves.length === 0 ? (
            <EmptyState title="Belum Ada Pengajuan" description="Anda belum pernah mengirim surat pengajuan izin." />
          ) : (
            <div className="overflow-x-auto">
              <Table headers={['Tipe', 'Tanggal Mulai', 'Tanggal Selesai', 'Alasan', 'Status', 'Catatan Admin/Dosen']}>
                {myLeaves.map((leave) => {
                  const statusStr = leave.status?.value || leave.status;
                  return (
                    <tr key={leave.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10 transition-colors text-xs">
                      <td className="px-6 py-4 font-semibold capitalize">{leave.type}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(leave.start_date).toLocaleDateString('id-ID', { dateStyle: 'short' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(leave.end_date).toLocaleDateString('id-ID', { dateStyle: 'short' })}
                      </td>
                      <td className="px-6 py-4 max-w-[120px] truncate" title={leave.reason}>{leave.reason}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          statusStr === 'approved' ? 'bg-green-50 text-green-600 dark:bg-green-900/10 dark:text-green-400' :
                          statusStr === 'rejected' ? 'bg-red-50 text-red-600 dark:bg-red-900/10 dark:text-red-400' :
                          'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/10 dark:text-yellow-400'
                        }`}>
                          {statusStr}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400 max-w-[120px] truncate" title={leave.admin_notes}>
                        {leave.admin_notes || '-'}
                      </td>
                    </tr>
                  );
                })}
              </Table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default LeaveForm;
