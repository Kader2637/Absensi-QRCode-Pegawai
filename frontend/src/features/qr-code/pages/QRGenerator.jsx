import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api/axios';
import Button from '../../../components/ui/Button';
import Table from '../../../components/ui/Table';
import EmptyState from '../../../components/ui/EmptyState';
import Alert from '../../../components/ui/Alert';
import Skeleton from '../../../components/ui/Skeleton';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';
import { FiCpu, FiPlay, FiStopCircle, FiTrash2, FiPrinter } from 'react-icons/fi';

const QRGenerator = () => {
  const queryClient = useQueryClient();
  const [validMinutes, setValidMinutes] = useState(15);
  const [activeQr, setActiveQr] = useState(null);
  const [activeQrImage, setActiveQrImage] = useState('');

  // 1. Fetch QR Codes List
  const { data: qrsData, isLoading, isError, error } = useQuery({
    queryKey: ['qrcodes'],
    queryFn: async () => {
      const res = await api.get('/admin/qrcode');
      return res.data;
    }
  });

  const qrCodes = qrsData?.data || [];

  // 2. Fetch Latest Active QR Code on mount/updates
  const { data: latestQrData, refetch: refetchLatest } = useQuery({
    queryKey: ['latestQrCode'],
    queryFn: async () => {
      try {
        const res = await api.get('/admin/qrcode/latest');
        return res.data.data;
      } catch (e) {
        return null;
      }
    }
  });

  useEffect(() => {
    if (latestQrData) {
      setActiveQr(latestQrData);
      QRCode.toDataURL(latestQrData.payload, { width: 280, margin: 2 }, (err, url) => {
        if (!err) setActiveQrImage(url);
      });
    } else {
      setActiveQr(null);
      setActiveQrImage('');
    }
  }, [latestQrData]);

  // 3. Mutate: Generate QR Code
  const generateMutation = useMutation({
    mutationFn: async (minutes) => {
      return await api.post('/admin/qrcode', { valid_minutes: minutes });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['qrcodes'] });
      queryClient.invalidateQueries({ queryKey: ['latestQrCode'] });
      toast.success('QR Code harian berhasil di-generate.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Gagal generate QR Code.');
    }
  });

  // 4. Mutate: Toggle Active Status
  const toggleMutation = useMutation({
    mutationFn: async (id) => {
      return await api.post(`/admin/qrcode/${id}/toggle`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qrcodes'] });
      queryClient.invalidateQueries({ queryKey: ['latestQrCode'] });
      toast.success('Status QR Code diubah.');
    }
  });

  // 5. Mutate: Delete QR Code (Soft Delete)
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await api.delete(`/admin/qrcode/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qrcodes'] });
      queryClient.invalidateQueries({ queryKey: ['latestQrCode'] });
      toast.success('QR Code berhasil dihapus.');
    }
  });

  const handleGenerate = () => {
    generateMutation.mutate(validMinutes);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Cetak QR Code Absensi</title>
          <style>
            body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; }
            img { width: 400px; height: 400px; }
            h1 { margin-bottom: 0; }
            p { color: #666; margin-top: 5px; font-size: 14px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <h1>QR CODE ABSENSI HARIAN</h1>
          <p>Scan menggunakan aplikasi absen mahasiswa. Berlaku hingga: ${new Date(activeQr.expires_at).toLocaleString('id-ID')}</p>
          <img src="${activeQrImage}" />
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">QR Code Generator</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Generate token QR Code baru untuk absensi masuk/pulang harian mahasiswa.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Generator Panel */}
        <div className="bg-white dark:bg-gray-850 p-6 rounded-2xl border border-gray-200/60 dark:border-gray-800 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Pengaturan Masa Berlaku</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
              Pilih berapa lama token QR Code absensi ini aktif sebelum kedaluwarsa secara otomatis. Mahasiswa tidak dapat memindai QR Code yang kedaluwarsa.
            </p>

            <div className="flex flex-col mb-6">
              <label className="text-xs font-semibold text-gray-400 mb-1.5 uppercase">Durasi Aktif</label>
              <select
                value={validMinutes}
                onChange={(e) => setValidMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
              >
                <option value={5}>5 Menit</option>
                <option value={15}>15 Menit</option>
                <option value={30}>30 Menit</option>
                <option value={60}>1 Jam</option>
                <option value={180}>3 Jam</option>
                <option value={480}>8 Jam</option>
              </select>
            </div>
          </div>

          <Button
            variant="primary"
            onClick={handleGenerate}
            loading={generateMutation.isPending}
            className="w-full py-2.5 font-bold shadow-md shadow-blue-500/20 cursor-pointer"
          >
            Generate QR Code Baru
          </Button>
        </div>

        {/* Center: Live QR View (Col span 2) */}
        <div className="bg-white dark:bg-gray-850 p-6 rounded-2xl border border-gray-200/60 dark:border-gray-800 lg:col-span-2 flex flex-col items-center justify-center min-h-[300px]">
          {activeQr ? (
            <div className="flex flex-col items-center text-center">
              <div className="p-3 bg-white border border-gray-150 rounded-2xl shadow-md mb-4">
                <img src={activeQrImage} alt="QR Code Absensi" className="h-48 w-48" />
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 rounded-full mb-2">
                QR CODE AKTIF & AMAN (HMAC SIGNED)
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mb-4 leading-relaxed">
                Token: <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-[10px]">{activeQr.token}</code> <br />
                Berlaku Hingga: <strong>{new Date(activeQr.expires_at).toLocaleString('id-ID')}</strong>
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex items-center gap-2 bg-white dark:bg-transparent cursor-pointer" onClick={handlePrint}>
                  <FiPrinter /> Cetak QR
                </Button>
                <Button 
                  variant="danger" 
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => toggleMutation.mutate(activeQr.id)}
                >
                  <FiStopCircle /> Nonaktifkan QR
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center text-gray-400 py-12">
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-full text-gray-300 mb-4 animate-bounce">
                <FiCpu className="h-10 w-10" />
              </div>
              <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">Tidak Ada QR Code Aktif</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mt-1 leading-relaxed">
                Gunakan panel di sebelah kiri untuk men-generate token absensi harian yang baru.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* QR Code History Table */}
      <h3 className="text-base font-bold text-gray-900 dark:text-white pt-4">Riwayat Token QR Code</h3>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10" count={4} />
        </div>
      ) : isError ? (
        <Alert type="error" title="Gagal memuat riwayat QR" message={error.message} />
      ) : qrCodes.length === 0 ? (
        <EmptyState title="Belum Ada QR Code" description="Riwayat token QR Code masih kosong." />
      ) : (
        <Table headers={['Token UUID', 'Berlaku Hingga', 'Status', 'Dibuat Oleh', 'Aksi']}>
          {qrCodes.map((qr) => (
            <tr key={qr.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10 transition-colors">
              <td className="px-6 py-4 font-mono text-xs max-w-xs truncate">{qr.token}</td>
              <td className="px-6 py-4 text-xs font-semibold">
                {new Date(qr.expires_at).toLocaleString('id-ID')}
              </td>
              <td className="px-6 py-4">
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  qr.is_active && new Date(qr.expires_at) > new Date()
                    ? 'bg-green-50 text-green-600 dark:bg-green-900/10 dark:text-green-400'
                    : 'bg-red-50 text-red-600 dark:bg-red-900/10 dark:text-red-400'
                }`}>
                  {qr.is_active && new Date(qr.expires_at) > new Date() ? 'Aktif' : 'Tidak Aktif / Expired'}
                </span>
              </td>
              <td className="px-6 py-4 text-xs">{qr.creator?.name || 'Sistem'}</td>
              <td className="px-6 py-4 flex items-center gap-2">
                <button
                  onClick={() => toggleMutation.mutate(qr.id)}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    qr.is_active 
                      ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20' 
                      : 'text-green-500 hover:bg-green-50 dark:hover:bg-green-950/20'
                  }`}
                  title={qr.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                >
                  {qr.is_active ? <FiStopCircle className="h-4 w-4" /> : <FiPlay className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => {
                    if (confirm('Hapus QR Code dari riwayat?')) {
                      deleteMutation.mutate(qr.id);
                    }
                  }}
                  className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors cursor-pointer"
                  title="Hapus"
                >
                  <FiTrash2 className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </Table>
      )}

    </div>
  );
};

export default QRGenerator;
