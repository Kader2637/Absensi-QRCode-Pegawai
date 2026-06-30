import React from 'react';
import { HiOutlineInbox } from 'react-icons/hi2';

const EmptyState = ({ 
  title = 'Tidak Ada Data', 
  description = 'Data yang Anda cari tidak ditemukan atau belum ditambahkan.', 
  icon: Icon = HiOutlineInbox,
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl ${className}`}>
      <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-full mb-3 text-gray-400">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">{description}</p>
    </div>
  );
};

export default EmptyState;
