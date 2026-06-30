import React from 'react';
import { FiAlertCircle, FiCheckCircle, FiInfo } from 'react-icons/fi';

const Alert = ({ 
  type = 'info', 
  message, 
  title,
  className = '' 
}) => {
  const types = {
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-850 text-blue-800 dark:text-blue-300',
      icon: FiInfo
    },
    success: {
      bg: 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-850 text-green-800 dark:text-green-300',
      icon: FiCheckCircle
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-850 text-yellow-800 dark:text-yellow-300',
      icon: FiAlertCircle
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-850 text-red-800 dark:text-red-300',
      icon: FiAlertCircle
    }
  };

  const current = types[type] || types.info;
  const Icon = current.icon;

  return (
    <div className={`flex gap-3 p-4 border rounded-xl text-left ${current.bg} ${className}`}>
      <Icon className="h-5 w-5 shrink-0 mt-0.5" />
      <div>
        {title && <h5 className="font-semibold text-sm mb-1">{title}</h5>}
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
};

export default Alert;
