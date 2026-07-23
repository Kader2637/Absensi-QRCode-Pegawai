import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../../api/axios';
import { useAuth } from '../../../context/AuthContext';
import Button from '../../../components/ui/Button';
import Table from '../../../components/ui/Table';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import SearchBar from '../../../components/ui/SearchBar';
import EmptyState from '../../../components/ui/EmptyState';
import Skeleton from '../../../components/ui/Skeleton';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiCalendar } from 'react-icons/fi';

// Holiday Form Schema (Zod)
const holidaySchema = z.object({
  name: z.string().min(1, 'Nama hari libur wajib diisi').max(255, 'Nama hari libur maksimal 255 karakter'),
  date: z.string().min(1, 'Tanggal wajib diisi'),
  description: z.string().optional().or(z.literal('')),
});

const HolidayList = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState(null);

  // Hook Form for Holiday CRUD
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(holidaySchema),
    defaultValues: {
      name: '',
      date: '',
      description: '',
    }
  });

  // Fetch Holidays query based on user role (Admin/Pegawai)
  const { data: holidayData, isLoading, isError } = useQuery({
    queryKey: ['holidays', page, search, isAdmin],
    queryFn: async () => {
      const endpoint = isAdmin ? '/admin/holidays' : '/pegawai/holidays';
      const res = await api.get(`${endpoint}?page=${page}&search=${search}&limit=10`);
      return res.data;
    }
  });

  const holidays = holidayData?.data || [];
  const meta = holidayData?.meta || { last_page: 1, current_page: 1, total: 0 };

  // Mutate: Store / Update Holiday
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (selectedHoliday) {
        return await api.put(`/admin/holidays/${selectedHoliday.id}`, data);
      } else {
        return await api.post('/admin/holidays', data);
      }
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      toast.success(res.data.message || 'Hari libur berhasil disimpan.');
      closeFormModal();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Gagal menyimpan data hari libur.');
    }
  });

  // Mutate: Delete Holiday
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await api.delete(`/admin/holidays/${id}`);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      toast.success('Hari libur berhasil dihapus.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Gagal menghapus hari libur.');
    }
  });

  const openAddModal = () => {
    setSelectedHoliday(null);
    reset({
      name: '',
      date: '',
      description: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (holiday) => {
    setSelectedHoliday(holiday);
    reset({
      name: holiday.name,
      date: holiday.date,
      description: holiday.description || '',
    });
    setModalOpen(true);
  };

  const closeFormModal = () => {
    setModalOpen(false);
    setSelectedHoliday(null);
  };

  const onSubmit = (data) => {
    saveMutation.mutate(data);
  };

  const handleDelete = (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus hari libur ini?')) {
      deleteMutation.mutate(id);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Define Table headers depending on role (Aksi column only for admin)
  const headers = isAdmin 
    ? ['No', 'Nama Hari Libur', 'Tanggal', 'Keterangan', 'Aksi']
    : ['No', 'Nama Hari Libur', 'Tanggal', 'Keterangan'];

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Daftar Hari Libur
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Informasi hari libur nasional atau libur khusus akademik.
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={openAddModal}
            variant="primary"
            className="inline-flex items-center gap-2 self-start sm:self-auto cursor-pointer"
          >
            <FiPlus className="h-5 w-5" />
            Tambah Hari Libur
          </Button>
        )}
      </div>

      {/* Main Container Card */}
      <div className="bg-white dark:bg-gray-850 rounded-2xl shadow-xs border border-gray-200 dark:border-gray-800 p-6 space-y-6">
        
        {/* Search Bar */}
        <div className="max-w-md">
          <SearchBar
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Cari hari libur..."
          />
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : isError ? (
          <div className="text-center py-12 text-red-500 font-medium">
            Gagal mengambil data hari libur. Silakan coba lagi.
          </div>
        ) : holidays.length === 0 ? (
          <EmptyState
            title="Tidak Ada Hari Libur"
            description={search ? "Hari libur tidak ditemukan dengan pencarian tersebut." : "Belum ada hari libur yang ditambahkan ke sistem."}
            icon={FiCalendar}
          />
        ) : (
          <>
            <Table headers={headers}>
              {holidays.map((holiday, idx) => (
                <tr key={holiday.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                  <td className="px-6 py-4 font-medium whitespace-nowrap">
                    {(page - 1) * 10 + idx + 1}
                  </td>
                  <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                    {holiday.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {formatDate(holiday.date)}
                  </td>
                  <td className="px-6 py-4 max-w-xs truncate" title={holiday.description}>
                    {holiday.description || '-'}
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(holiday)}
                          className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors cursor-pointer"
                          title="Ubah"
                        >
                          <FiEdit2 className="h-4.5 w-4.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(holiday.id)}
                          className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                          title="Hapus"
                        >
                          <FiTrash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </Table>

            {/* Pagination Controls */}
            {meta.last_page > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800/80">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Halaman {meta.current_page} dari {meta.last_page} ({meta.total} data)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="cursor-pointer"
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                    disabled={page === meta.last_page}
                    className="cursor-pointer"
                  >
                    Selanjutnya
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Form Modal for Add/Edit */}
      {isAdmin && (
        <Modal
          isOpen={modalOpen}
          onClose={closeFormModal}
          title={selectedHoliday ? 'Ubah Hari Libur' : 'Tambah Hari Libur Baru'}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            
            <Input
              label="Nama Hari Libur"
              placeholder="Contoh: Tahun Baru Hijriah"
              error={errors.name}
              required
              {...register('name')}
            />

            <Input
              label="Tanggal Libur"
              type="date"
              error={errors.date}
              required
              {...register('date')}
            />

            <div className="w-full text-left mb-4">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Keterangan
              </label>
              <textarea
                id="description"
                rows="3"
                placeholder="Penjelasan singkat mengenai hari libur..."
                className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900 dark:bg-gray-880 dark:text-white dark:border-gray-750 ${
                  errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                }`}
                {...register('description')}
              />
              {errors.description && (
                <span className="text-xs text-red-500 mt-1 block">
                  {errors.description.message}
                </span>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <Button
                type="button"
                variant="secondary"
                onClick={closeFormModal}
                className="cursor-pointer"
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={saveMutation.isPending}
                className="cursor-pointer"
              >
                Simpan
              </Button>
            </div>

          </form>
        </Modal>
      )}

    </div>
  );
};

export default HolidayList;
