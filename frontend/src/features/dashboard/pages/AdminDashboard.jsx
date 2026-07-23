import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../api/axios';
import Skeleton from '../../../components/ui/Skeleton';
import Alert from '../../../components/ui/Alert';

// Recharts
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts';

// Icons
import { 
  FiUsers, FiCheckCircle, FiClock, FiFileText, 
  FiAlertOctagon, FiTrendingUp, FiActivity 
} from 'react-icons/fi';

const AdminDashboard = () => {
  const { data: dashData, isLoading, isError, error } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: async () => {
      const res = await api.get('/admin/dashboard');
      return res.data.data;
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6 text-left">
        <h1 className="text-2xl font-bold dark:text-white">Dashboard Analitis</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Skeleton className="h-28" count={5} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (isError) {
    return <Alert type="error" title="Gagal memuat dashboard" message={error.message} />;
  }

  const { stats, monthly_trend, department_stats, late_ranking, recent_activities } = dashData;

  const cardConfig = [
    { title: 'Total Mahasiswa', val: stats.total_mahasiswa, icon: FiUsers, color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/10' },
    { title: 'Hadir Hari Ini', val: stats.hadir, icon: FiCheckCircle, color: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/10' },
    { title: 'Terlambat', val: stats.terlambat, icon: FiClock, color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/10' },
    { title: 'Izin & Sakit', val: stats.izin + stats.sakit, icon: FiFileText, color: 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/10' },
    { title: 'Mangkir (Alpha)', val: stats.alpha, icon: FiAlertOctagon, color: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/10' },
  ];

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Dashboard Analitis</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Ringkasan kehadiran, statistik kelas, dan aktivitas absensi hari ini.</p>
        </div>
        <div className="px-4 py-2 bg-white dark:bg-gray-800 rounded-xl shadow-xs border border-gray-150 dark:border-gray-700/50 flex items-center gap-3">
          <FiTrendingUp className="text-blue-500 h-5 w-5" />
          <span className="text-sm font-semibold">Tingkat Kehadiran: <strong className="text-blue-600 dark:text-blue-400">{stats.attendance_rate}%</strong></span>
        </div>
      </div>

      {/* 1. Stat Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {cardConfig.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className="bg-white dark:bg-gray-850 p-5 rounded-2xl shadow-xs border border-gray-200/60 dark:border-gray-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 block mb-1 uppercase tracking-wider">{c.title}</span>
                <span className="text-2xl font-extrabold text-gray-900 dark:text-white leading-none">{c.val}</span>
              </div>
              <div className={`p-3 rounded-xl ${c.color}`}>
                <Icon className="h-6 w-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Trend Area Chart (Col span 2) */}
        <div className="bg-white dark:bg-gray-850 p-6 rounded-2xl shadow-xs border border-gray-200/60 dark:border-gray-800 lg:col-span-2">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Tren Kehadiran (30 Hari Terakhir)</h3>
          <div className="h-72 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHadir" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAlpha" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" className="hidden dark:block" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255,255,255,0.95)', 
                    borderColor: '#e2e8f0',
                    borderRadius: '12px',
                    color: '#1e293b'
                  }} 
                />
                <Legend />
                <Area type="monotone" dataKey="Hadir" stroke="#3b82f6" fillOpacity={1} fill="url(#colorHadir)" strokeWidth={2} />
                <Area type="monotone" dataKey="Alpha" stroke="#ef4444" fillOpacity={1} fill="url(#colorAlpha)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Attendance Bar Chart */}
        <div className="bg-white dark:bg-gray-850 p-6 rounded-2xl shadow-xs border border-gray-200/60 dark:border-gray-800">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Statistik Kelas (Hari Ini)</h3>
          {department_stats.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-sm text-gray-400">
              Tidak ada data kelas.
            </div>
          ) : (
            <div className="h-72 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={department_stats} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" className="hidden dark:block" />
                  <XAxis dataKey="department" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" name="Total Mahasiswa" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="present" name="Hadir" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

      </div>

      {/* 3. Leaderboards & Activity logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Late leaderboard */}
        <div className="bg-white dark:bg-gray-850 p-6 rounded-2xl shadow-xs border border-gray-200/60 dark:border-gray-800">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Mahasiswa Sering Terlambat (Bulan Ini)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-150 dark:border-gray-800 text-xs font-semibold text-gray-400 uppercase tracking-wider pb-2">
                  <th className="pb-3">Mahasiswa</th>
                  <th className="pb-3">Kelas</th>
                  <th className="pb-3 text-right">Frekuensi Lambat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 dark:divide-gray-800">
                {late_ranking.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="py-8 text-center text-sm text-gray-400">
                      Bulan ini bersih, tidak ada keterlambatan.
                    </td>
                  </tr>
                ) : (
                  late_ranking.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                      <td className="py-3 flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {row.name[0]}
                        </div>
                        <div>
                          <h5 className="font-semibold text-sm text-gray-950 dark:text-white">{row.name}</h5>
                          <span className="text-xs text-gray-400">{row.nip}</span>
                        </div>
                      </td>
                      <td className="py-3 text-gray-500 dark:text-gray-400 text-xs capitalize">{row.department}</td>
                      <td className="py-3 text-right font-extrabold text-amber-600 dark:text-amber-500">{row.late_count} Kali</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit trail */}
        <div className="bg-white dark:bg-gray-850 p-6 rounded-2xl shadow-xs border border-gray-200/60 dark:border-gray-800">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Aktivitas Sistem Terbaru</h3>
          <div className="relative border-l-2 border-gray-100 dark:border-gray-800 pl-4 ml-2 space-y-4 max-h-[300px] overflow-y-auto">
            {recent_activities.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Belum ada aktivitas terekam.</p>
            ) : (
              recent_activities.map((act) => {
                return (
                  <div key={act.id} className="relative text-left text-xs leading-relaxed">
                    <span className="absolute -left-[23px] top-1.5 h-3.5 w-3.5 rounded-full bg-blue-600 dark:bg-blue-500 border-4 border-white dark:border-gray-850" />
                    <div className="flex justify-between items-center mb-1">
                      <strong className="font-bold text-gray-950 dark:text-white capitalize">
                        {act.user?.name || 'Sistem / Anonim'}
                      </strong>
                      <span className="text-[10px] text-gray-400 font-medium">
                        {new Date(act.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">
                      {act.description}
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

export default AdminDashboard;
