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
import Alert from '../../../components/ui/Alert';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiDownload, FiUpload, FiEye } from 'react-icons/fi';

// 1. Employee Form Schema (Zod)
const employeeSchema = z.object({
  nip: z.string().min(1, 'NIP wajib diisi'),
  name: z.string().min(1, 'Nama lengkap wajib diisi'),
  email: z.string().min(1, 'Email wajib diisi').email('Format email tidak valid'),
  phone_number: z.string().optional(),
  position: z.string().optional(),
  department: z.string().optional(),
  password: z.string().optional(),
  role: z.enum(['admin', 'pegawai']),
  status: z.enum(['active', 'inactive']),
});

const EmployeeList = () => {
  const { impersonate } = useAuth();
  const queryClient = useQueryClient();
  
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [csvFile, setCsvFile] = useState(null);

  // Hook Form for Employee CRUD
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      nip: '',
      name: '',
      email: '',
      phone_number: '',
      position: '',
      department: '',
      password: '',
      role: 'pegawai',
      status: 'active',
    }
  });

  // 2. Fetch Employees query
  const { data: empData, isLoading, isError, error } = useQuery({
    queryKey: ['employees', page, search],
    queryFn: async () => {
      const res = await api.get(`/admin/pegawai?page=${page}&search=${search}&limit=10`);
      return res.data;
    }
  });

  const employees = empData?.data || [];
  const meta = empData?.meta || { last_page: 1, current_page: 1, total: 0 };

  // 3. Mutate: Store / Update Employee
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (selectedEmployee) {
        return await api.put(`/admin/pegawai/${selectedEmployee.id}`, data);
      } else {
        return await api.post('/admin/pegawai', data);
      }
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success(res.data.message || 'Data pegawai berhasil disimpan.');
      closeFormModal();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Gagal menyimpan data pegawai.');
    }
  });

  // 4. Mutate: Delete Employee (Soft Delete)
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await api.delete(`/admin/pegawai/${id}`);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Pegawai berhasil dihapus.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Gagal menghapus pegawai.');
    }
  });

  // 5. Mutate: Import CSV
  const importMutation = useMutation({
    mutationFn: async (formData) => {
      return await api.post('/admin/pegawai/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success(res.data.message);
      setImportModalOpen(false);
      setCsvFile(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Gagal mengimpor file CSV.');
    }
  });

  const openAddModal = () => {
    setSelectedEmployee(null);
    reset({
      nip: '',
      name: '',
      email: '',
      phone_number: '',
      position: '',
      department: '',
      password: '',
      role: 'pegawai',
      status: 'active',
    });
    setModalOpen(true);
  };

  const openEditModal = (emp) => {
    setSelectedEmployee(emp);
    reset({
      nip: emp.nip,
      name: emp.name,
      email: emp.email,
      phone_number: emp.phone_number || '',
      position: emp.position || '',
      department: emp.department || '',
      password: '', // clear password on edit
      role: emp.role?.value || emp.role,
      status: emp.status,
    });
    setModalOpen(true);
  };

  const closeFormModal = () => {
    setModalOpen(false);
    setSelectedEmployee(null);
  };

  const handleDelete = (id) => {
    if (confirm('Apakah Anda yakin ingin menghapus pegawai ini (soft delete)?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleExport = () => {
    // Standard link download csv
    const sanctumUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace('/api/v1', '');
    window.open(`${sanctumUrl}/api/v1/admin/pegawai/export`, '_blank');
  };

  const handleImportSubmit = (e) => {
    e.preventDefault();
    if (!csvFile) {
      toast.error('Pilih file CSV terlebih dahulu.');
      return;
    }
    const formData = new FormData();
    formData.append('file', csvFile);
    importMutation.mutate(formData);
  };

  const handleImpersonate = async (id) => {
    if (confirm('Apakah Anda ingin login/meng-impersonate pegawai ini?')) {
      await impersonate(id);
      window.location.href = '/'; // redirect to main/pegawai view
    }
  };

  return (
    <div className="space-y-6 text-left">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Manajemen Pegawai</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Tambah, edit, hapus, impor/ekspor data pegawai perusahaan.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Button variant="outline" className="flex items-center gap-2 cursor-pointer bg-white dark:bg-transparent" onClick={handleExport}>
            <FiDownload /> Export CSV
          </Button>
          <Button variant="outline" className="flex items-center gap-2 cursor-pointer bg-white dark:bg-transparent" onClick={() => setImportModalOpen(true)}>
            <FiUpload /> Import CSV
          </Button>
          <Button variant="primary" className="flex items-center gap-2 cursor-pointer" onClick={openAddModal}>
            <FiPlus /> Tambah Pegawai
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-gray-850 p-4 rounded-2xl shadow-xs border border-gray-200/60 dark:border-gray-800 flex flex-col md:flex-row md:items-center gap-4">
        <SearchBar
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Cari NIP, nama, jabatan, divisi..."
          className="w-full md:max-w-xs"
        />
      </div>

      {/* Employees Table */}
      {isLoading ? (
        <div className="space-y-3 py-6">
          <Skeleton className="h-12" count={6} />
        </div>
      ) : isError ? (
        <Alert type="error" title="Gagal memuat pegawai" message={error.message} />
      ) : employees.length === 0 ? (
        <EmptyState 
          title="Tidak Ada Pegawai" 
          description={search ? 'Pegawai yang Anda cari tidak ditemukan.' : 'Belum ada data pegawai terdaftar.'} 
        />
      ) : (
        <div className="space-y-4">
          <Table headers={['NIP', 'Nama', 'Jabatan', 'Divisi', 'Role', 'Status', 'Aksi']}>
            {employees.map((emp) => {
              const roleStr = emp.role?.value || emp.role;
              return (
                <tr key={emp.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs">{emp.nip}</td>
                  <td className="px-6 py-4 flex items-center gap-3">
                    <img 
                      src={emp.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=0D8ABC&color=fff`} 
                      alt={emp.name} 
                      className="h-8 w-8 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                    />
                    <div>
                      <h4 className="font-semibold text-sm text-gray-900 dark:text-white leading-none mb-0.5">{emp.name}</h4>
                      <span className="text-xs text-gray-400">{emp.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold">{emp.position || '-'}</td>
                  <td className="px-6 py-4 text-xs">{emp.department || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold capitalize ${
                      roleStr === 'admin' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/10 dark:text-blue-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    }`}>
                      {roleStr}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                      emp.status === 'active' ? 'bg-green-50 text-green-600 dark:bg-green-900/10 dark:text-green-400' : 'bg-red-50 text-red-600 dark:bg-red-900/10 dark:text-red-400'
                    }`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex items-center gap-2">
                    {roleStr !== 'admin' && emp.status === 'active' && (
                      <button
                        onClick={() => handleImpersonate(emp.id)}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors cursor-pointer"
                        title="Masuk sebagai pegawai ini (Impersonate)"
                      >
                        <FiEye className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => openEditModal(emp)}
                      className="p-1.5 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg transition-colors cursor-pointer"
                      title="Edit"
                    >
                      <FiEdit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(emp.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                      title="Hapus (Soft Delete)"
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
              <span className="text-xs text-gray-500 dark:text-gray-400">Total {meta.total} Pegawai</span>
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

      {/* CRUD Form Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeFormModal}
        title={selectedEmployee ? 'Edit Data Pegawai' : 'Tambah Pegawai Baru'}
        size="md"
      >
        <form onSubmit={handleSubmit(saveMutation.mutate)} className="space-y-4 text-left">
          <Input
            label="NIP"
            error={errors.nip}
            required
            {...register('nip')}
          />
          <Input
            label="Nama Lengkap"
            error={errors.name}
            required
            {...register('name')}
          />
          <Input
            label="Email"
            type="email"
            error={errors.email}
            required
            {...register('email')}
          />
          <Input
            label="Nomor Handphone"
            error={errors.phone_number}
            {...register('phone_number')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Jabatan"
              error={errors.position}
              {...register('position')}
            />
            <Input
              label="Divisi / Departemen"
              error={errors.department}
              {...register('department')}
            />
          </div>
          
          <Input
            label={selectedEmployee ? 'Kata Sandi Baru (Kosongkan jika tidak diubah)' : 'Kata Sandi'}
            type="password"
            placeholder={selectedEmployee ? 'Kosongkan untuk tetap' : 'Min. 8 karakter'}
            error={errors.password}
            required={!selectedEmployee}
            {...register('password')}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col text-left mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role / Peran</label>
              <select 
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                {...register('role')}
              >
                <option value="pegawai">Pegawai</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="flex flex-col text-left mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select 
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                {...register('status')}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-gray-150 dark:border-gray-800 pt-4">
            <Button variant="secondary" onClick={closeFormModal}>Batal</Button>
            <Button type="submit" variant="primary" loading={saveMutation.isPending}>Simpan</Button>
          </div>
        </form>
      </Modal>

      {/* Import CSV Modal */}
      <Modal
        isOpen={importModalOpen}
        onClose={() => {
          setImportModalOpen(false);
          setCsvFile(null);
        }}
        title="Impor Pegawai via CSV"
        size="md"
      >
        <form onSubmit={handleImportSubmit} className="space-y-4 text-left">
          <Alert 
            type="info" 
            message="Pastikan file CSV memiliki kolom header yang sesuai: NIP, Nama, Email, No HP, Jabatan, Divisi. Sistem akan memberi password default 'password' untuk semua pegawai yang diimpor." 
          />
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-900/40">
            <input 
              type="file" 
              accept=".csv"
              onChange={(e) => setCsvFile(e.target.files[0])}
              className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/20 dark:file:text-blue-400 hover:file:bg-blue-100 cursor-pointer"
            />
            {csvFile && (
              <span className="mt-2 text-xs font-semibold text-green-600 dark:text-green-400">
                File terpilih: {csvFile.name} ({Math.round(csvFile.size / 1024)} KB)
              </span>
            )}
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-150 dark:border-gray-800 pt-4">
            <Button variant="secondary" onClick={() => {
              setImportModalOpen(false);
              setCsvFile(null);
            }}>Batal</Button>
            <Button type="submit" variant="primary" loading={importMutation.isPending}>Mulai Impor</Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default EmployeeList;
