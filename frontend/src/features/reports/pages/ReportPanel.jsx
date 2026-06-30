import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../api/axios';
import Button from '../../../components/ui/Button';
import Table from '../../../components/ui/Table';
import EmptyState from '../../../components/ui/EmptyState';
import Alert from '../../../components/ui/Alert';
import Skeleton from '../../../components/ui/Skeleton';
import SearchBar from '../../../components/ui/SearchBar';
import toast from 'react-hot-toast';
import { FiFileText, FiPrinter, FiDownload, FiCalendar } from 'react-icons/fi';

const ReportPanel = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Custom range default to past 30 days
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // 1. Fetch Report Data
  // We query all records within date range to display and export
  const { data: reportData, isLoading, isError, error } = useQuery({
    queryKey: ['attendanceReport', startDate, endDate, statusFilter, search],
    queryFn: async () => {
      // In the backend, we query /admin/attendance without pagination limit (or a high limit) for report purposes,
      // or we can reuse the attendance index endpoint with page limits.
      // Let's call standard attendance endpoint with a large limit e.g. 500 for printing/export purposes
      const res = await api.get(
        `/admin/attendance?limit=500&search=${search}&status=${statusFilter}&year=${new Date(startDate).getFullYear()}`
      );
      
      // Filter clientside by date range to make it extremely precise
      const allData = res.data.data || [];
      return allData.filter(att => {
        const attDate = att.date; // yyyy-mm-dd
        return attDate >= startDate && attDate <= endDate;
      });
    }
  });

  const attendances = reportData || [];

  // Summary counts
  const total = attendances.length;
  const hadir = attendances.filter(a => (a.status?.value || a.status) === 'hadir').length;
  const terlambat = attendances.filter(a => (a.status?.value || a.status) === 'terlambat').length;
  const izin = attendances.filter(a => (a.status?.value || a.status) === 'izin').length;
  const sakit = attendances.filter(a => (a.status?.value || a.status) === 'sakit').length;
  const alpha = attendances.filter(a => (a.status?.value || a.status) === 'alpha').length;

  const handlePrint = () => {
    if (attendances.length === 0) {
      toast.error('Tidak ada data untuk dicetak.');
      return;
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Laporan Kehadiran Pegawai</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px; color: #333; line-height: 1.4; }
            .header { text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 15px; margin-bottom: 25px; }
            .header h1 { margin: 0; font-size: 24px; color: #1e3a8a; }
            .header p { margin: 5px 0 0; color: #64748b; font-size: 13px; }
            .meta-info { display: flex; justify-content: space-between; font-size: 12px; color: #475569; margin-bottom: 20px; background-color: #f8fafc; padding: 12px; border-radius: 8px; }
            .summary-cards { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 25px; }
            .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center; font-size: 11px; background-color: #fff; }
            .card strong { display: block; font-size: 18px; margin-top: 4px; color: #1e293b; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 11px; }
            th { background-color: #f1f5f9; color: #334155; font-weight: bold; text-transform: uppercase; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .footer-sign { margin-top: 60px; display: flex; justify-content: space-between; font-size: 12px; color: #334155; }
            .sign-box { text-align: center; width: 200px; }
            .sign-space { height: 60px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <h1>LAPORAN REKAPITULASI KEHADIRAN</h1>
            <p>Sistem Informasi Absensi QR Code PT. Solusi Enterprise</p>
          </div>
          
          <div class="meta-info">
            <div>
              <strong>Rentang Laporan:</strong> ${new Date(startDate).toLocaleDateString('id-ID', { dateStyle: 'medium' })} s/d ${new Date(endDate).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
            </div>
            <div>
              <strong>Tanggal Cetak:</strong> ${new Date().toLocaleDateString('id-ID', { dateStyle: 'medium' })}
            </div>
          </div>

          <div class="summary-cards">
            <div class="card">Hadir<strong>${hadir}</strong></div>
            <div class="card">Terlambat<strong>${terlambat}</strong></div>
            <div class="card">Izin<strong>${izin}</strong></div>
            <div class="card">Sakit<strong>${sakit}</strong></div>
            <div class="card">Mangkir (Alpha)<strong>${alpha}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Tanggal</th>
                <th>NIP</th>
                <th>Nama</th>
                <th>Divisi</th>
                <th>Masuk</th>
                <th>Pulang</th>
                <th>Status</th>
                <th>Tipe</th>
              </tr>
            </thead>
            <tbody>
              ${attendances.map((att, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${new Date(att.date).toLocaleDateString('id-ID', { dateStyle: 'short' })}</td>
                  <td>${att.user?.nip || '-'}</td>
                  <td>${att.user?.name || '-'}</td>
                  <td>${att.user?.department || '-'}</td>
                  <td>${att.check_in || '-'}</td>
                  <td>${att.check_out || '-'}</td>
                  <td style="font-weight: bold; text-transform: uppercase;">${att.status?.value || att.status}</td>
                  <td style="text-transform: capitalize;">${att.attendance_type?.value || att.attendance_type}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer-sign">
            <div class="sign-box">
              <p>Mengetahui,</p>
              <p>Direktur Utama</p>
              <div class="sign-space"></div>
              <p>_______________________</p>
            </div>
            <div class="sign-box">
              <p>Jakarta, ${new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</p>
              <p>HRD Manager</p>
              <div class="sign-space"></div>
              <p>_______________________</p>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleCsvExport = () => {
    // We reuse our CSV export endpoint but can customize parameters
    const sanctumUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace('/api/v1', '');
    const queryParams = `search=${search}&status=${statusFilter}&year=${new Date(startDate).getFullYear()}`;
    window.open(`${sanctumUrl}/api/v1/admin/attendance/export?${queryParams}`, '_blank');
  };

  return (
    <div className="space-y-6 text-left">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Laporan Kehadiran</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Buat laporan kehadiran periodik, cetak dokumen PDF, atau unduh CSV rekap.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" className="flex items-center gap-2 cursor-pointer bg-white dark:bg-transparent justify-center flex-1 md:flex-none" onClick={handlePrint}>
            <FiPrinter /> Cetak PDF
          </Button>
          <Button variant="primary" className="flex items-center gap-2 cursor-pointer justify-center flex-1 md:flex-none" onClick={handleCsvExport}>
            <FiDownload /> Unduh CSV
          </Button>
        </div>
      </div>

      {/* Date Filters Card */}
      <div className="bg-white dark:bg-gray-850 p-6 rounded-2xl border border-gray-200/60 dark:border-gray-800 space-y-4">
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <FiCalendar className="text-blue-500" />
          Filter Rentang Tanggal
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col text-left">
            <label className="text-xs font-semibold text-gray-400 mb-1">DARI TANGGAL</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
            />
          </div>

          <div className="flex flex-col text-left">
            <label className="text-xs font-semibold text-gray-400 mb-1">SAMPAI TANGGAL</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
            />
          </div>

          <div className="flex flex-col text-left">
            <label className="text-xs font-semibold text-gray-400 mb-1">CARI PEGAWAI</label>
            <SearchBar
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nama, NIP..."
            />
          </div>

          <div className="flex flex-col text-left">
            <label className="text-xs font-semibold text-gray-400 mb-1">STATUS KEHADIRAN</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
            >
              <option value="">Semua Status</option>
              <option value="hadir">Hadir</option>
              <option value="terlambat">Terlambat</option>
              <option value="izin">Izin</option>
              <option value="sakit">Sakit</option>
              <option value="alpha">Alpha</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-850 p-4 border border-gray-200 dark:border-gray-800 rounded-xl text-center">
          <span className="text-xs font-semibold text-gray-400 uppercase">Hadir</span>
          <strong className="block text-2xl font-extrabold text-green-600 dark:text-green-400 mt-1">{hadir}</strong>
        </div>
        <div className="bg-white dark:bg-gray-850 p-4 border border-gray-200 dark:border-gray-800 rounded-xl text-center">
          <span className="text-xs font-semibold text-gray-400 uppercase">Terlambat</span>
          <strong className="block text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">{terlambat}</strong>
        </div>
        <div className="bg-white dark:bg-gray-850 p-4 border border-gray-200 dark:border-gray-800 rounded-xl text-center">
          <span className="text-xs font-semibold text-gray-400 uppercase">Izin</span>
          <strong className="block text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">{izin}</strong>
        </div>
        <div className="bg-white dark:bg-gray-850 p-4 border border-gray-200 dark:border-gray-800 rounded-xl text-center">
          <span className="text-xs font-semibold text-gray-400 uppercase">Sakit</span>
          <strong className="block text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">{sakit}</strong>
        </div>
        <div className="bg-white dark:bg-gray-850 p-4 border border-gray-200 dark:border-gray-800 rounded-xl text-center">
          <span className="text-xs font-semibold text-gray-400 uppercase">Alpha</span>
          <strong className="block text-2xl font-extrabold text-red-600 dark:text-red-400 mt-1">{alpha}</strong>
        </div>
      </div>

      {/* Results Table */}
      {isLoading ? (
        <div className="space-y-2 py-4">
          <Skeleton className="h-11" count={5} />
        </div>
      ) : isError ? (
        <Alert type="error" title="Gagal memuat laporan" message={error.message} />
      ) : attendances.length === 0 ? (
        <EmptyState title="Laporan Kosong" description="Tidak ada data kehadiran yang terekam pada rentang waktu terpilih." />
      ) : (
        <div className="space-y-4">
          <Table headers={['Tanggal', 'NIP', 'Nama', 'Jam Masuk', 'Jam Pulang', 'Status', 'Tipe']}>
            {attendances.map((att) => {
              const statusStr = att.status?.value || att.status;
              const typeStr = att.attendance_type?.value || att.attendance_type;
              return (
                <tr key={att.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10 transition-colors text-xs">
                  <td className="px-6 py-4 font-semibold whitespace-nowrap">
                    {new Date(att.date).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                  </td>
                  <td className="px-6 py-4 font-mono">{att.user?.nip || '-'}</td>
                  <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{att.user?.name || '-'}</td>
                  <td className="px-6 py-4 font-mono">{att.check_in || '-'}</td>
                  <td className="px-6 py-4 font-mono">{att.check_out || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
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
                </tr>
              );
            })}
          </Table>
          <span className="text-xs text-gray-400 block text-right">Menampilkan {total} data absensi</span>
        </div>
      )}

    </div>
  );
};

export default ReportPanel;
