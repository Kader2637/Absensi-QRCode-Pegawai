import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../../../api/axios';
import Button from '../../../components/ui/Button';
import Alert from '../../../components/ui/Alert';
import toast from 'react-hot-toast';
import { FiCamera, FiStopCircle, FiMapPin, FiCompass, FiBriefcase } from 'react-icons/fi';

const ScanQR = () => {
  const navigate = useNavigate();
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [scanning, setScanning] = useState(false);
  const [attendanceType, setAttendanceType] = useState('office'); // office / remote
  const [locationStr, setLocationStr] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [scanError, setScanError] = useState('');

  const qrScannerRef = useRef(null);
  const scannerContainerId = 'qr-reader';

  // 1. Get Camera Devices on mount (Request permission first to get labels)
  useEffect(() => {
    const initCameras = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setScanError('Kamera tidak dapat diakses. Pastikan Anda menggunakan koneksi aman (HTTPS atau localhost/127.0.0.1).');
          return;
        }

        // Request temporary camera access to trigger the browser's permission prompt
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });

        // Get all camera devices while the stream is active to guarantee labels are accessible
        const devices = await Html5Qrcode.getCameras();

        // Stop the tracks immediately so the camera indicator turns off
        stream.getTracks().forEach(track => track.stop());

        if (devices && devices.length > 0) {
          setCameras(devices);
          setSelectedCameraId(devices[0].id);
        } else {
          setScanError('Kamera tidak ditemukan. Pastikan perangkat Anda memiliki kamera.');
        }
      } catch (err) {
        setScanError('Gagal mendapatkan izin kamera: ' + err.message);
      }
    };

    initCameras();

    return () => {
      // Cleanup: ensure camera is stopped on unmount
      stopScanning();
    };
  }, []);

  // 2. Fetch Geolocation
  const requestLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolokasi tidak didukung oleh browser Anda.');
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocationStr(`${latitude}, ${longitude}`);
        setLocationLoading(false);
        toast.success('Lokasi berhasil diambil.');
      },
      (err) => {
        toast.error('Gagal mengambil lokasi. Pastikan GPS/izin lokasi aktif.');
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  // 3. Start Camera Scanning
  const startScanning = async () => {
    if (!selectedCameraId) {
      toast.error('Silakan pilih kamera terlebih dahulu.');
      return;
    }

    setScanError('');
    setScanning(true);

    try {
      const html5QrCode = new Html5Qrcode(scannerContainerId);
      qrScannerRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 220, height: 220 },
      };

      await html5QrCode.start(
        selectedCameraId,
        config,
        async (decodedText) => {
          // Success Scan Callback: decode text
          await handleScanSuccess(decodedText);
        },
        (errorMessage) => {
          // Silent scan errors while searching
        }
      );
    } catch (err) {
      setScanError('Gagal menjalankan scanner: ' + err.message);
      setScanning(false);
    }
  };

  // 4. Stop Camera Scanning
  const stopScanning = async () => {
    if (qrScannerRef.current && qrScannerRef.current.isScanning) {
      try {
        await qrScannerRef.current.stop();
        qrScannerRef.current = null;
      } catch (err) {
        console.error('Failed to stop camera: ', err);
      }
    }
    setScanning(false);
  };

  // 5. Handle Scan Success and POST to API
  const handleScanSuccess = async (decodedText) => {
    // Instantly stop camera to avoid multiple hits
    await stopScanning();

    toast.loading('Memproses absensi...', { id: 'scan-process' });

    try {
      const response = await api.post('/mahasiswa/scan', {
        payload: decodedText,
        location: locationStr || null,
        attendance_type: attendanceType
      });

      if (response.data.success) {
        toast.success(response.data.message || 'Absensi berhasil dicatat!', { id: 'scan-process' });
        navigate('/mahasiswa/dashboard');
      } else {
        toast.error(response.data.message || 'Absensi gagal.', { id: 'scan-process' });
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Kode QR tidak valid atau masa berlaku habis.';
      toast.error(errorMsg, { id: 'scan-process' });
      // Restart scanner to let user try again
      startScanning();
    }
  };

  return (
    <div className="space-y-6 text-left max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Scan QR Absensi</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Arahkan kamera perangkat Anda ke QR Code yang ditampilkan oleh Admin untuk melakukan absensi.</p>
      </div>

      <div className="bg-white dark:bg-gray-850 p-6 rounded-2xl border border-gray-200/60 dark:border-gray-800 space-y-6">
        
        {scanError && <Alert type="error" message={scanError} />}

        {/* Form Settings Option */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <div className="flex flex-col text-left">
            <label className="text-xs font-bold text-gray-400 uppercase mb-1.5 flex items-center gap-1.5">
              <FiBriefcase className="text-gray-400" /> Tipe Kehadiran
            </label>
            <select
              value={attendanceType}
              onChange={(e) => setAttendanceType(e.target.value)}
              disabled={scanning}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
            >
              <option value="office">Hadir di Kelas (Onsite)</option>
              <option value="remote">Kuliah Daring (Online/Remote)</option>
            </select>
          </div>

          <div className="flex flex-col text-left">
            <label className="text-xs font-bold text-gray-400 uppercase mb-1.5 flex items-center gap-1.5">
              <FiMapPin className="text-gray-400" /> Lokasi (Opsional)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={locationStr}
                readOnly
                placeholder="Ketuk 'Dapatkan Lokasi'"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 dark:text-gray-300 rounded-lg text-sm focus:outline-none cursor-not-allowed"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={requestLocation}
                disabled={scanning || locationLoading}
                className="bg-white dark:bg-transparent shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <FiCompass className={locationLoading ? 'animate-spin' : ''} />
                Ambil GPS
              </Button>
            </div>
          </div>

        </div>

        {/* Camera Selector dropdown */}
        <div className="flex flex-col text-left border-t border-gray-150 dark:border-gray-800 pt-4">
          <label className="text-xs font-bold text-gray-400 uppercase mb-1.5">Pilih Kamera</label>
          <select
            value={selectedCameraId}
            onChange={(e) => setSelectedCameraId(e.target.value)}
            disabled={scanning}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
          >
            {cameras.map((cam) => (
              <option key={cam.id} value={cam.id}>
                {cam.label || `Kamera ${cameras.indexOf(cam) + 1}`}
              </option>
            ))}
          </select>
        </div>

        {/* Camera Scanner View Area */}
        <div className="relative w-full max-w-sm mx-auto aspect-square bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
          
          <div id={scannerContainerId} className="w-full h-full object-cover"></div>

          {!scanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/90 dark:bg-gray-900/90 text-gray-400 p-6 text-center">
              <div className="p-4 bg-white dark:bg-gray-800 rounded-full shadow-md text-blue-600 dark:text-blue-500 mb-4 animate-bounce">
                <FiCamera className="h-10 w-10" />
              </div>
              <h4 className="text-sm font-bold text-gray-750 dark:text-gray-200">Kamera Siap</h4>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-xs">
                Ketuk tombol di bawah untuk mengaktifkan kamera dan mulai memindai QR Code.
              </p>
            </div>
          )}

          {scanning && (
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
              <div className="flex justify-between">
                <div className="h-6 w-6 border-t-4 border-l-4 border-blue-500"></div>
                <div className="h-6 w-6 border-t-4 border-r-4 border-blue-500"></div>
              </div>
              <div className="flex justify-between">
                <div className="h-6 w-6 border-b-4 border-l-4 border-blue-500"></div>
                <div className="h-6 w-6 border-b-4 border-r-4 border-blue-500"></div>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex justify-center border-t border-gray-150 dark:border-gray-800 pt-6">
          {!scanning ? (
            <Button
              variant="primary"
              onClick={startScanning}
              className="w-full max-w-xs py-2.5 font-bold shadow-md shadow-blue-500/20 cursor-pointer"
            >
              Mulai Kamera
            </Button>
          ) : (
            <Button
              variant="danger"
              onClick={stopScanning}
              className="w-full max-w-xs py-2.5 font-bold shadow-md shadow-red-500/20 cursor-pointer"
            >
              <FiStopCircle className="mr-2 h-5 w-5" /> Hentikan Kamera
            </Button>
          )}
        </div>

      </div>
    </div>
  );
};

export default ScanQR;
