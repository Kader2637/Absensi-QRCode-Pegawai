import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api/axios';
import Button from '../../../components/ui/Button';
import Table from '../../../components/ui/Table';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import EmptyState from '../../../components/ui/EmptyState';
import Alert from '../../../components/ui/Alert';
import Skeleton from '../../../components/ui/Skeleton';
import toast from 'react-hot-toast';
import { FiCheck, FiX, FiFile, FiCheckSquare, FiAlertCircle } from 'react-icons/fi';

const LeaveRequestList = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('pending'); // default to pending first
  const [typeFilter, setTypeFilter] = useState('');

  const [processModalOpen, setProcessModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');

  // 1. Fetch Leave Requests Query
  const { data: leavesData, isLoading, isError, error } = useQuery({
    queryKey: ['adminLeaves', page, statusFilter, typeFilter],
    queryFn: async () => {
      const res = await api.get(
        `/admin/leave?page=${page}&status=${statusFilter}&type=${typeFilter}&limit=10`
      );
      return res.data;
    }
  });

  const leaves = leavesData?.data || [];
  const meta = leavesData?.meta || { last_page: 1, current_page: 1, total: 0 };

  // 2. Mutate: Approve Leave Request
  const approveMutation = useMutation({
    mutationFn: async ({ id, notes }) => {
      return await api.post(`/admin/leave/${id}/approve`, { admin_notes: notes });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['adminLeaves'] });
      toast.success(res.data.message || 'Pengajuan izin disetujui.');
      setProcessModalOpen(false);
      setAdminNotes('');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Gagal menyetujui pengajuan.');
    }
  });

  // 3. Mutate: Reject Leave Request
  const rejectMutation = useMutation({
    mutationFn: async ({ id, notes }) => {
      return await api.post(`/admin/leave/${id}/reject`, { admin_notes: notes });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['adminLeaves'] });
      toast.success(res.data.message || 'Pengajuan izin ditolak.');
      setProcessModalOpen(false);
      setAdminNotes('');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Gagal menolak pengajuan.');
    }
  });

  const openProcessModal = (leave) => {
    setSelectedLeave(leave);
    setAdminNotes(leave.admin_notes || '');
    setProcessModalOpen(true);
  };

  const handleApprove = () => {
    approveMutation.mutate({ id: selectedLeave.id, notes: adminNotes });
  };

  const handleReject = () => {
    if (!adminNotes.trim()) {
      toast.error('Catatan admin (alasan penolakan) wajib diisi untuk penolakan.');
      return;
    }
    rejectMutation.mutate({ id: selectedLeave.id, notes: adminNotes });
  };

  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Persetujuan Izin / Sakit</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Verifikasi, berikan catatan, dan setujui/tolak pengajuan izin mahasiswa.</p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-850 p-4 rounded-2xl border border-gray-200/60 dark:border-gray-800 flex flex-col sm:flex-row gap-3">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
        >
          <option value="">Semua Status Proses</option>
          <option value="pending">Menunggu Persetujuan (Pending)</option>
          <option value="approved">Disetujui (Approved)</option>
          <option value="rejected">Ditolak (Rejected)</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
        >
          <option value="">Semua Tipe Pengajuan</option>
          <option value="izin">Izin</option>
          <option value="sakit">Sakit</option>
        </select>
      </div>

      {/* Table Data */}
      {isLoading ? (
        <div className="space-y-3 py-6">
          <Skeleton className="h-12" count={6} />
        </div>
      ) : isError ? (
        <Alert type="error" title="Gagal memuat pengajuan izin" message={error.message} />
      ) : leaves.length === 0 ? (
        <EmptyState title="Tidak Ada Pengajuan" description="Tidak ditemukan surat pengajuan izin pada kategori filter ini." />
      ) : (
        <div className="space-y-4">
          <Table headers={['Mahasiswa', 'Tipe', 'Tanggal Izin', 'Durasi', 'Alasan', 'Status', 'Aksi']}>
            {leaves.map((leave) => {
              const statusStr = leave.status?.value || leave.status;
              const start = new Date(leave.start_date);
              const end = new Date(leave.end_date);
              const daysCount = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
              return (
                <tr key={leave.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10 transition-colors">
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div>
                      <h4 className="font-semibold text-sm text-gray-900 dark:text-white leading-none mb-0.5">{leave.user?.name || 'Mahasiswa'}</h4>
                      <span className="text-xs text-gray-400">NIM: {leave.user?.nip || '-'} | {leave.user?.department || 'Umum'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${
                      leave.type === 'sakit' ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/10 dark:text-purple-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/10 dark:text-blue-400'
                    }`}>
                      {leave.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold whitespace-nowrap">
                    {start.toLocaleDateString('id-ID', { dateStyle: 'short' })} s/d {end.toLocaleDateString('id-ID', { dateStyle: 'short' })}
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-gray-700 dark:text-gray-300">{daysCount} Hari</td>
                  <td className="px-6 py-4 text-xs max-w-xs truncate">{leave.reason}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold capitalize ${
                      statusStr === 'approved' ? 'bg-green-50 text-green-600 dark:bg-green-900/10 dark:text-green-400' :
                      statusStr === 'rejected' ? 'bg-red-50 text-red-600 dark:bg-red-900/10 dark:text-red-400' :
                      'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/10 dark:text-yellow-400'
                    }`}>
                      {statusStr}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Button
                      variant={statusStr === 'pending' ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => openProcessModal(leave)}
                      className="cursor-pointer bg-white dark:bg-transparent"
                    >
                      {statusStr === 'pending' ? 'Proses' : 'Detail'}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </Table>

          {/* Pagination Controls */}
          {meta.last_page > 1 && (
            <div className="flex justify-between items-center bg-white dark:bg-gray-850 p-4 rounded-xl border border-gray-200 dark:border-gray-800">
              <span className="text-xs text-gray-500 dark:text-gray-400">Total {meta.total} Pengajuan</span>
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

      {/* Leave Approval Process Modal */}
      <Modal
        isOpen={processModalOpen}
        onClose={() => setProcessModalOpen(false)}
        title="Proses Pengajuan Surat Izin / Sakit"
        size="lg"
      >
        {selectedLeave && (
          <div className="space-y-5 text-left text-sm">
            
            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-900 p-4 rounded-xl">
              <div>
                <span className="text-xs text-gray-400 uppercase font-semibold">Nama Mahasiswa</span>
                <p className="font-bold text-gray-800 dark:text-white mt-0.5">{selectedLeave.user?.name}</p>
              </div>
              <div>
                <span className="text-xs text-gray-400 uppercase font-semibold">NIM / Kelas</span>
                <p className="font-semibold text-gray-700 dark:text-gray-300 mt-0.5">
                  {selectedLeave.user?.nip} | {selectedLeave.user?.department || 'Umum'}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-400 uppercase font-semibold">Tipe Pengajuan</span>
                <p className="font-bold text-blue-600 dark:text-blue-400 mt-0.5 capitalize">{selectedLeave.type}</p>
              </div>
              <div>
                <span className="text-xs text-gray-400 uppercase font-semibold">Rentang Tanggal</span>
                <p className="font-semibold text-gray-700 dark:text-gray-300 mt-0.5">
                  {new Date(selectedLeave.start_date).toLocaleDateString('id-ID', { dateStyle: 'medium' })} s/d {new Date(selectedLeave.end_date).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                </p>
              </div>
            </div>

            {/* Reason */}
            <div>
              <span className="text-xs text-gray-400 uppercase font-semibold block mb-1">Alasan Pengajuan</span>
              <div className="p-3 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-800/40 text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {selectedLeave.reason}
              </div>
            </div>

            {/* Document File Attached */}
            {selectedLeave.file_url && (
              <div>
                <span className="text-xs text-gray-400 uppercase font-semibold block mb-1">Berkas Pendukung / Surat Dokter</span>
                <a 
                  href={`http://localhost:8000${selectedLeave.file_url}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline bg-blue-50 dark:bg-blue-900/10 px-3 py-2 rounded-lg border border-blue-200/50 dark:border-blue-900/20"
                >
                  <FiFile /> Lihat Dokumen Lampiran
                </a>
              </div>
            )}

            {/* Action panel (Conditional) */}
            <div className="border-t border-gray-150 dark:border-gray-800 pt-4 space-y-4">
              
              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Catatan Admin {selectedLeave.status?.value !== 'pending' && '(Sudah Diproses)'}
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  disabled={selectedLeave.status?.value !== 'pending'}
                  placeholder="Ketik catatan persetujuan atau alasan penolakan di sini..."
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                />
              </div>

              {selectedLeave.status?.value === 'pending' ? (
                <div className="flex justify-between items-center gap-3">
                  <Button 
                    variant="danger" 
                    onClick={handleReject} 
                    loading={rejectMutation.isPending}
                    className="flex-1 gap-1.5 cursor-pointer"
                  >
                    <FiX /> Tolak Pengajuan
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={handleApprove} 
                    loading={approveMutation.isPending}
                    className="flex-1 gap-1.5 cursor-pointer bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                  >
                    <FiCheck /> Setujui Pengajuan
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs font-semibold justify-center py-2 text-gray-500 bg-gray-50 dark:bg-gray-900 rounded-xl">
                  <FiCheckSquare /> Surat cuti ini sudah berstatus: <strong>{selectedLeave.status?.value?.toUpperCase()}</strong>
                </div>
              )}
            </div>

          </div>
        )}
      </Modal>

    </div>
  );
};

export default LeaveRequestList;
