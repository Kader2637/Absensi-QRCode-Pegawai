import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../api/axios';
import Table from '../../../components/ui/Table';
import EmptyState from '../../../components/ui/EmptyState';
import Alert from '../../../components/ui/Alert';
import Skeleton from '../../../components/ui/Skeleton';
import Button from '../../../components/ui/Button';
import { FiCalendar } from 'react-icons/fi';

const History = () => {
  const [page, setPage] = useState(1);
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());

  // 1. Fetch Personal Attendance History
  const { data: historyData, isLoading, isError, error } = useQuery({
    queryKey: ['myHistory', page, monthFilter, yearFilter],
    queryFn: async () => {
      const res = await api.get(
        `/pegawai/history?page=${page}&month=${monthFilter}&year=${yearFilter}&limit=10`
      );
      return res.data;
    }
  });

  const history = historyData?.data || [];
  const meta = historyData?.meta || { last_page: 1, current_page: 1, total: 0 };

  return (
    <div className="space-y-6 text-left max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Riwayat Kehadiran Anda</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Tinjau seluruh catatan kehadiran masuk, pulang, izin, dan sakit Anda.</p>
      </div>

      {/* Filters Panel */}
      <div className="bg-white dark:bg-gray-850 p-4 rounded-2xl border border-gray-200/60 dark:border-gray-800 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex flex-col text-left">
          <label className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Saring Bulan</label>
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
        </div>

        <div className="flex-1 flex flex-col text-left">
          <label className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Saring Tahun</label>
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
      </div>

      {/* History Grid */}
      {isLoading ? (
        <div className="space-y-3 py-6">
          <Skeleton className="h-12" count={6} />
        </div>
      ) : isError ? (
        <Alert type="error" title="Gagal memuat riwayat" message={error.message} />
      ) : history.length === 0 ? (
        <EmptyState title="Riwayat Kosong" description="Belum ada catatan absensi terdaftar pada filter ini." icon={FiCalendar} />
      ) : (
        <div className="space-y-4">
          <Table headers={['Hari & Tanggal', 'Jam Masuk', 'Jam Pulang', 'Status Kehadiran', 'Tipe Absensi', 'Catatan']}>
            {history.map((row) => {
              const statusStr = row.status?.value || row.status;
              const typeStr = row.attendance_type?.value || row.attendance_type;
              const dateObj = new Date(row.date);
              
              return (
                <tr key={row.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10 transition-colors text-sm">
                  <td className="px-6 py-4 font-semibold">
                    {dateObj.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 font-mono">{row.check_in || '--:--'}</td>
                  <td className="px-6 py-4 font-mono">{row.check_out || '--:--'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${
                      statusStr === 'hadir' ? 'bg-green-50 text-green-600 dark:bg-green-900/10 dark:text-green-400' :
                      statusStr === 'terlambat' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/10 dark:text-amber-400' :
                      statusStr === 'izin' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/10 dark:text-blue-400' :
                      statusStr === 'sakit' ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/10 dark:text-purple-400' :
                      'bg-red-50 text-red-600 dark:bg-red-900/10 dark:text-red-400'
                    }`}>
                      {statusStr}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs capitalize">{typeStr}</td>
                  <td className="px-6 py-4 text-xs text-gray-500 max-w-xs truncate" title={row.notes}>
                    {row.notes || '-'}
                  </td>
                </tr>
              );
            })}
          </Table>

          {/* Pagination Controls */}
          {meta.last_page > 1 && (
            <div className="flex justify-between items-center bg-white dark:bg-gray-850 p-4 rounded-xl border border-gray-200 dark:border-gray-800">
              <span className="text-xs text-gray-500 dark:text-gray-400">Total {meta.total} Hari Tercatat</span>
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

    </div>
  );
};

export default History;
