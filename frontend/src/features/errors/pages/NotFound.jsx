import React from 'react';
import { Link } from 'react-router-dom';
import { FiAlertCircle } from 'react-icons/fi';
import Button from '../../../components/ui/Button';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center bg-white dark:bg-gray-850 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800">
        <div className="inline-flex p-4 bg-blue-50 dark:bg-blue-950/20 rounded-full text-blue-600 dark:text-blue-500 mb-6">
          <FiAlertCircle className="h-12 w-12" />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">404 Not Found</h1>
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">Halaman Tidak Ditemukan</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
          Halaman yang Anda cari tidak ada, sudah dipindahkan, atau nama tautan telah diubah. Silakan periksa kembali URL Anda.
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

export default NotFound;
