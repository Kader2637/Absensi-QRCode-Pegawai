import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import api from '../../../api/axios';
import Button from '../../../components/ui/Button';
import Table from '../../../components/ui/Table';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import SearchBar from '../../../components/ui/SearchBar';
import EmptyState from '../../../components/ui/EmptyState';
import Alert from '../../../components/ui/Alert';
import Skeleton from '../../../components/ui/Skeleton';
import toast from 'react-hot-toast';
import { FiEdit2, FiTrash2, FiDownload } from 'react-icons/fi';

const AttendanceList = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Hook Form for Manual Adjustment
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  // 1. Fetch Attendances Query
  const { data: attData, isLoading, isError, error } = useQuery({
    queryKey: ['adminAttendance', page, search, statusFilter, monthFilter, yearFilter],
    queryFn: async () => {
      const res = await api.get(
        `/admin/attendance?page=${page}&search=${search}&status=${statusFilter}&month=${monthFilter}&year=${yearFilter}&limit=10`
      );
      return res.data;
    }
  });

  const attendances = attData?.data || [];
  const meta = attData?.meta || { last_page: 1, current_page: 1, total: 0 };

  // 2. Mutate: Update Attendance Manual
  const updateMutation = useMutation({
    mutationFn: async (data) => {
      return await api.put(`/admin/attendance/${selectedRecord.id}`, data);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['adminAttendance'] });
      toast.success(res.data.message || 'Absensi berhasil disesuaikan.');
      setModalOpen(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Gagal menyesuaikan absensi.');
    }
  });

  // 3. Mutate: Delete Attendance
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await api.delete(`/admin/attendance/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAttendance'] });
      toast.success('Record absensi berhasil dihapus.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Gagal menghapus record absensi.');
    }
  });

  const handleEdit = (record) => {
    setSelectedRecord(record);
    reset({
      status: record.status?.value || record.status,
      check_in: record.check_in || '',
      check_out: record.check_out || '',
      attendance_type: record.attendance_type?.value || record.attendance_type || 'manual',
      notes: record.notes || '',
    });
    setModalOpen(true);
  };

  const handleDelete = (id) => {
    if (confirm('Apakah Anda yakin ingin menghapus record kehadiran ini?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleExport = () => {
    const sanctumUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace('/api/v1', '');
    const queryParams = `search=${search}&status=${statusFilter}&month=${monthFilter}&year=${yearFilter}`;
    window.open(`${sanctumUrl}/api/v1/admin/attendance/export?${queryParams}`, '_blank');
  };

  return (
    <div className="space-y-6 text-left">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Monitoring Absensi</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Lihat, saring, dan sesuaikan data kehadiran seluruh mahasiswa.</p>
        </div>
        <Button variant="outline" className="flex items-center gap-2 cursor-pointer bg-white dark:bg-transparent w-full md:w-auto justify-center" onClick={handleExport}>
          <FiDownload /> Unduh CSV Kehadiran
        </Button>
      </div>

      {/* Filters Panel */}
      <div className="bg-white dark:bg-gray-850 p-4 rounded-2xl border border-gray-200/60 dark:border-gray-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <SearchBar
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Cari NIM, nama..."
          className="w-full"
        />

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
        >
          <option value="">Semua Status Kehadiran</option>
          <option value="hadir">Hadir</option>
          <option value="terlambat">Terlambat</option>
          <option value="izin">Izin</option>
          <option value="sakit">Sakit</option>
          <option value="alpha">Mangkir (Alpha)</option>
        </select>

        <select
          value={monthFilter}
          onChange={(e) => {
            setMonthFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
        >
          <option value="">Semua Bulan</option>
          <option value="1">Januari</option>
          <option value="2">Februari</option>
          <option value="3">Maret</option>
          <option value="4">April</option>
          <option value="5">Mei</option>
          <option value="6">Juni</option>
          <option value="7">Juli</option>
          <option value="8">Agustus</option>
          <option value="9">September</option>
          <option value="10">Oktober</option>
          <option value="11">November</option>
          <option value="12">Desember</option>
        </select>

        <select
          value={yearFilter}
          onChange={(e) => {
            setYearFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
        >
          <option value="2026">2026</option>
          <option value="2025">2025</option>
          <option value="2024">2024</option>
        </select>
      </div>

      {/* Attendance Grid Data */}
      {isLoading ? (
        <div className="space-y-3 py-6">
          <Skeleton className="h-12" count={6} />
        </div>
      ) : isError ? (
        <Alert type="error" title="Gagal memuat absensi" message={error.message} />
      ) : attendances.length === 0 ? (
        <EmptyState title="Tidak Ada Data Kehadiran" description="Tidak ditemukan record kehadiran mahasiswa pada filter terpilih." />
      ) : (
        <div className="space-y-4">
          <Table headers={['Tanggal', 'Mahasiswa', 'Jam Masuk', 'Jam Pulang', 'Status', 'Tipe', 'Catatan/Lokasi', 'Aksi']}>
            {attendances.map((att) => {
              const statusStr = att.status?.value || att.status;
              const typeStr = att.attendance_type?.value || att.attendance_type;
              return (
                <tr key={att.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10 transition-colors">
                  <td className="px-6 py-4 font-semibold text-xs whitespace-nowrap">
                    {new Date(att.date).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                  </td>
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div>
                      <h4 className="font-semibold text-sm text-gray-900 dark:text-white leading-none mb-0.5">{att.user?.name || 'Mahasiswa'}</h4>
                      <span className="text-xs text-gray-400">NIM: {att.user?.nip || '-'} | {att.user?.department || 'Umum'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">{att.check_in || '-'}</td>
                  <td className="px-6 py-4 font-mono text-xs">{att.check_out || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold capitalize ${
                      statusStr === 'hadir' ? 'bg-green-50 text-green-600 dark:bg-green-900/10 dark:text-green-400' :
                      statusStr === 'terlambat' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/10 dark:text-amber-400' :
                      statusStr === 'izin' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/10 dark:text-blue-400' :
                      statusStr === 'sakit' ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/10 dark:text-purple-400' :
                      'bg-red-50 text-red-600 dark:bg-red-900/10 dark:text-red-400'
                    }`}>
                      {statusStr}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs capitalize whitespace-nowrap">{typeStr}</td>
                  <td className="px-6 py-4 text-xs max-w-xs truncate">
                    {att.notes || att.location || '-'}
                  </td>
                  <td className="px-6 py-4 flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(att)}
                      className="p-1.5 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg transition-colors cursor-pointer"
                      title="Edit Absensi"
                    >
                      <FiEdit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(att.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                      title="Hapus Record"
                    >
                      <FiTrash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </Table>

          {/* Pagination Controls */}
          {meta.last_page > 1 && (
            <div className="flex justify-between items-center bg-white dark:bg-gray-850 p-4 rounded-xl border border-gray-200 dark:border-gray-800">
              <span className="text-xs text-gray-500 dark:text-gray-400">Total {meta.total} Record</span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={page === 1}
                  onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                  className="bg-white dark:bg-transparent"
                >
                  Sebelumnya
                </Button>
                <span className="px-3 py-1.5 text-xs font-semibold bg-gray-100 dark:bg-gray-800 rounded-lg">
                  {page} / {meta.last_page}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={page === meta.last_page}
                  onClick={() => setPage(prev => Math.min(prev + 1, meta.last_page))}
                  className="bg-white dark:bg-transparent"
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Adjustment Form Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Penyesuaian Absensi: ${selectedRecord?.user?.name}`}
        size="md"
      >
        <form onSubmit={handleSubmit(updateMutation.mutate)} className="space-y-4 text-left">
          
          <div className="flex flex-col text-left mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status Kehadiran</label>
            <select 
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              {...register('status')}
            >
              <option value="hadir">Hadir</option>
              <option value="terlambat">Terlambat</option>
              <option value="izin">Izin</option>
              <option value="sakit">Sakit</option>
              <option value="alpha">Alpha</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Jam Masuk (Format: HH:MM:SS)"
              placeholder="08:00:00"
              {...register('check_in')}
            />
            <Input
              label="Jam Pulang (Format: HH:MM:SS)"
              placeholder="17:00:00"
              {...register('check_out')}
            />
          </div>

          <div className="flex flex-col text-left mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipe Absensi</label>
            <select 
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              {...register('attendance_type')}
            >
              <option value="office">Office</option>
              <option value="remote">Remote</option>
              <option value="manual">Manual Adjustment</option>
            </select>
          </div>

          <Input
            label="Catatan Admin / Keterangan"
            placeholder="Alasan penyesuaian..."
            {...register('notes')}
          />

          <div className="flex justify-end gap-2 border-t border-gray-150 dark:border-gray-800 pt-4">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button type="submit" variant="primary" loading={updateMutation.isPending}>Simpan Perubahan</Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default AttendanceList;
