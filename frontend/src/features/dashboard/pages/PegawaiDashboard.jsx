import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../../api/axios';
import Skeleton from '../../../components/ui/Skeleton';
import Alert from '../../../components/ui/Alert';
import Button from '../../../components/ui/Button';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';

// Icons
import { 
  FiClock, FiCamera, FiAlertTriangle, FiCheckCircle, 
  FiFileText, FiActivity, FiCalendar 
} from 'react-icons/fi';
import { IoQrCodeOutline } from 'react-icons/io5';

const PegawaiDashboard = () => {
  const [activeQrImage, setActiveQrImage] = useState('');

  // 1. Fetch Main Dashboard Data
  const { data: dashData, isLoading, isError, error } = useQuery({
    queryKey: ['pegawaiDashboard'],
    queryFn: async () => {
      const res = await api.get('/pegawai/dashboard');
      return res.data.data;
    }
  });

  // 2. Fetch Latest Active QR Code (Shared Endpoint)
  const { data: activeQrData } = useQuery({
    queryKey: ['activeQrCodeShared'],
    queryFn: async () => {
      try {
        const res = await api.get('/qrcode/latest');
        return res.data.data;
      } catch (e) {
        return null;
      }
    },
    refetchInterval: 15000, // Refresh every 15s to update expiration and pick up new codes
  });

  // 3. Render QR Code payload into data URL
  useEffect(() => {
    if (activeQrData) {
      QRCode.toDataURL(activeQrData.payload, { width: 250, margin: 2 }, (err, url) => {
        if (!err) setActiveQrImage(url);
      });
    } else {
      setActiveQrImage('');
    }
  }, [activeQrData]);

  // 4. Download QR Code
  const handleDownloadQr = () => {
    if (!activeQrImage) return;
    const link = document.createElement('a');
    link.href = activeQrImage;
    link.download = `qrcode-absensi-${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR Code berhasil diunduh!');
  };

  if (isLoading) {
    return (
      <div className="space-y-6 text-left">
        <h1 className="text-2xl font-bold dark:text-white">Dashboard Pegawai</h1>
        <Skeleton className="h-44" />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Skeleton className="h-24" count={5} />
        </div>
      </div>
    );
  }

  if (isError) {
    return <Alert type="error" title="Gagal memuat dashboard" message={error.message} />;
  }

  const { today, stats, recent_history, recent_logs } = dashData;

  const statCards = [
    { title: 'Hadir', val: stats.hadir, icon: FiCheckCircle, color: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/10' },
    { title: 'Terlambat', val: stats.terlambat, icon: FiClock, color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/10' },
    { title: 'Izin', val: stats.izin, icon: FiFileText, color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/10' },
    { title: 'Sakit', val: stats.sakit, icon: FiFileText, color: 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/10' },
    { title: 'Mangkir (Alpha)', val: stats.alpha, icon: FiAlertTriangle, color: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/10' },
  ];

  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Beranda Pegawai</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Selamat datang kembali! Lakukan absensi harian dan cek statistik Anda.</p>
      </div>

      {/* 1. Today's Status & Active QR Code Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Card: Today's Status & Action Buttons */}
        <div className="lg:col-span-2 flex flex-col justify-between bg-white dark:bg-gray-850 p-6 rounded-2xl shadow-xs border border-gray-200/60 dark:border-gray-800 gap-6">
          <div className="flex items-center gap-4 text-left">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl text-blue-600 dark:text-blue-400">
              <IoQrCodeOutline className="h-10 w-10" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Status Absensi Hari Ini</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {today 
                  ? `Anda telah mencatat absensi hari ini dengan status: ${today.status.toUpperCase()}`
                  : 'Anda belum mencatat absensi hari ini. Silakan scan QR Code.'}
              </p>
            </div>
          </div>

          {/* Action button based on scan status */}
          <div className="flex flex-col sm:flex-row gap-3 w-full shrink-0">
            {!today ? (
              <Link to="/pegawai/scan" className="w-full sm:w-auto">
                <Button variant="primary" className="w-full justify-center gap-2">
                  <FiCamera className="h-5 w-5" />
                  Scan Absen Sekarang
                </Button>
              </Link>
            ) : !today.check_out ? (
              <Link to="/pegawai/scan" className="w-full sm:w-auto">
                <Button variant="primary" className="w-full justify-center gap-2 bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600">
                  <FiCamera className="h-5 w-5" />
                  Scan Absen Pulang
                </Button>
              </Link>
            ) : (
              <div className="inline-flex items-center justify-center gap-2 text-green-600 dark:text-green-400 font-semibold text-sm px-4 py-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/40 rounded-xl">
                <FiCheckCircle className="h-5 w-5" />
                Absensi Hari Ini Selesai
              </div>
            )}

            <Link to="/pegawai/leave" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full justify-center gap-2 bg-white dark:bg-transparent">
                <FiFileText className="h-5 w-5" />
                Ajukan Izin / Sakit
              </Button>
            </Link>
          </div>
        </div>

        {/* Right Card: Active QR Code display & download */}
        <div className="bg-white dark:bg-gray-850 p-6 rounded-2xl border border-gray-200/60 dark:border-gray-800 flex flex-col items-center justify-center text-center shadow-xs">
          {activeQrImage ? (
            <div className="flex flex-col items-center">
              <div className="p-2 bg-white border border-gray-150 rounded-xl shadow-xs mb-3">
                <img src={activeQrImage} alt="QR Code Absensi Aktif" className="h-28 w-28 object-contain" />
              </div>
              <h4 className="text-xs font-bold text-gray-800 dark:text-white mb-1">QR Code Absensi Aktif</h4>
              <button 
                onClick={handleDownloadQr}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline cursor-pointer flex items-center gap-1"
              >
                Unduh Barcode (PNG)
              </button>
            </div>
          ) : (
            <div className="text-gray-400 flex flex-col items-center p-4">
              <IoQrCodeOutline className="h-10 w-10 text-gray-300 mb-2 animate-pulse" />
              <h4 className="text-xs font-bold">QR Code Belum Aktif</h4>
              <p className="text-[10px] text-gray-500 mt-1">Belum ada token absensi aktif dari admin.</p>
            </div>
          )}
        </div>

      </div>

      {/* 2. Check-in & Check-out Time Details */}
      {today && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-850 p-4 rounded-xl shadow-xs border border-gray-200/60 dark:border-gray-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-gray-400 block mb-0.5">JAM MASUK</span>
              <strong className="text-lg font-bold text-gray-800 dark:text-white">{today.check_in || '--:--'}</strong>
            </div>
            <span className={`px-2 py-0.5 text-xs rounded-full font-bold uppercase ${
              today.status === 'hadir' ? 'bg-green-50 text-green-600 dark:bg-green-900/10 dark:text-green-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/10 dark:text-amber-400'
            }`}>
              {today.status}
            </span>
          </div>

          <div className="bg-white dark:bg-gray-850 p-4 rounded-xl shadow-xs border border-gray-200/60 dark:border-gray-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-gray-400 block mb-0.5">JAM PULANG</span>
              <strong className="text-lg font-bold text-gray-800 dark:text-white">{today.check_out || '--:--'}</strong>
            </div>
            <span className={`px-2 py-0.5 text-xs rounded-full font-bold uppercase ${
              today.check_out ? 'bg-green-50 text-green-600 dark:bg-green-900/10 dark:text-green-400' : 'bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
            }`}>
              {today.check_out ? 'Selesai' : 'Belum Absen Pulang'}
            </span>
          </div>
        </div>
      )}

      {/* 3. Stats Recap Cards Grid */}
      <h3 className="text-base font-bold text-gray-900 dark:text-white pt-2">Rekap Absensi Bulan Ini</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="bg-white dark:bg-gray-850 p-4 rounded-2xl border border-gray-200/60 dark:border-gray-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-400 block mb-1">{card.title}</span>
                <span className="text-xl font-extrabold text-gray-900 dark:text-white">{card.val}</span>
              </div>
              <div className={`p-2.5 rounded-xl ${card.color}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Details List Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: 10 Personal Presence logs */}
        <div className="bg-white dark:bg-gray-850 p-6 rounded-2xl shadow-xs border border-gray-200/60 dark:border-gray-800 lg:col-span-2 text-left">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FiCalendar className="text-blue-500" />
              Riwayat Absensi Terkini
            </h3>
            <Link to="/pegawai/history" className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400">
              Lihat Semua
            </Link>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-500 dark:text-gray-450">
              <thead>
                <tr className="border-b border-gray-150 dark:border-gray-800 text-xs font-semibold text-gray-400 uppercase tracking-wider pb-2">
                  <th className="pb-3">Tanggal</th>
                  <th className="pb-3">Masuk</th>
                  <th className="pb-3">Pulang</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Tipe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 dark:divide-gray-800 text-gray-900 dark:text-gray-250">
                {recent_history.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-sm text-gray-400">
                      Belum ada riwayat kehadiran tercatat.
                    </td>
                  </tr>
                ) : (
                  recent_history.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10 transition-colors">
                      <td className="py-3 font-semibold">{new Date(row.date).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</td>
                      <td className="py-3 font-mono">{row.check_in || '-'}</td>
                      <td className="py-3 font-mono">{row.check_out || '-'}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                          row.status === 'hadir' ? 'bg-green-50 text-green-600 dark:bg-green-900/10 dark:text-green-400' :
                          row.status === 'terlambat' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/10 dark:text-amber-400' :
                          row.status === 'izin' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/10 dark:text-blue-400' :
                          row.status === 'sakit' ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/10 dark:text-purple-400' :
                          'bg-red-50 text-red-600 dark:bg-red-900/10 dark:text-red-400'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="py-3 text-xs capitalize text-gray-450">{row.attendance_type}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Personal logs */}
        <div className="bg-white dark:bg-gray-850 p-6 rounded-2xl shadow-xs border border-gray-200/60 dark:border-gray-800">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FiActivity className="text-blue-500" />
            Log Aktivitas Anda
          </h3>
          <div className="relative border-l-2 border-gray-100 dark:border-gray-800 pl-4 ml-2 space-y-4 max-h-[300px] overflow-y-auto">
            {recent_logs.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Belum ada aktivitas terekam.</p>
            ) : (
              recent_logs.map((log) => {
                return (
                  <div key={log.id} className="relative text-left text-xs leading-relaxed">
                    <span className="absolute -left-[23px] top-1.5 h-3.5 w-3.5 rounded-full bg-blue-500 dark:bg-blue-600 border-4 border-white dark:border-gray-850" />
                    <div className="flex justify-between items-center mb-1">
                      <strong className="font-semibold text-gray-800 dark:text-gray-250 capitalize">
                        {log.action}
                      </strong>
                      <span className="text-[10px] text-gray-400 font-medium">
                        {new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">
                      {log.description}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default PegawaiDashboard;
