import React from 'react';
import { Link } from 'react-router-dom';
import { FiAlertTriangle } from 'react-icons/fi';
import Button from '../../../components/ui/Button';

const Forbidden = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center bg-white dark:bg-gray-850 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800">
        <div className="inline-flex p-4 bg-red-50 dark:bg-red-950/20 rounded-full text-red-600 dark:text-red-500 mb-6">
          <FiAlertTriangle className="h-12 w-12" />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">403 Forbidden</h1>
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">Akses Ditolak</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
          Anda tidak memiliki izin atau kewenangan yang diperlukan untuk melihat halaman ini. Hubungi administrator jika Anda merasa ini adalah kesalahan.
        </p>
        <Link to="/">
          <Button variant="primary" className="w-full">
            Kembali ke Beranda
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default Forbidden;
