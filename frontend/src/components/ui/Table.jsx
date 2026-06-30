import React from 'react';

const Table = ({ headers, children, className = '' }) => {
  return (
    <div className={`overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-850 ${className}`}>
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-left text-sm text-gray-500 dark:text-gray-450">
        <thead className="bg-gray-50 dark:bg-gray-900 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-6 py-4 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-850 text-gray-900 dark:text-gray-250">
          {children}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
