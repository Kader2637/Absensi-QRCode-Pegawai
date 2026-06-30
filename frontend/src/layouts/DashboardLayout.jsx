import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import echoInstance from '../api/echo';
import toast from 'react-hot-toast';

// Icons
import { 
  FiMenu, FiBell, FiSun, FiMoon, FiLogOut, FiUser, 
  FiHome, FiUsers, FiClock, FiFileText, FiSettings, 
  FiSearch, FiAlertTriangle, FiCheckSquare, FiLogOut as FiExit
} from 'react-icons/fi';
import { IoQrCodeOutline } from 'react-icons/io5';
import { HiOutlineMailOpen } from 'react-icons/hi';

import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import SearchBar from '../components/ui/SearchBar';

const DashboardLayout = ({ children }) => {
  const { user, logout, isImpersonating, stopImpersonate, isAdmin, isPegawai } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  // 1. Fetch Notifications via TanStack Query
  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications?limit=5');
      return res.data;
    },
    enabled: !!user,
    refetchInterval: 30000, // 30s polling fallback
  });

  const notifications = notifData?.data || [];
  const unreadCount = notifData?.meta?.unread_count || 0;

  // 2. Real-time Echo Listener
  useEffect(() => {
    if (user && echoInstance) {
      const channel = echoInstance.private(`App.Models.User.${user.id}`);
      channel.notification((notif) => {
        // Invalidate queries to trigger instant update
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['pegawaiDashboard'] });
        queryClient.invalidateQueries({ queryKey: ['adminDashboard'] });
        
        toast.success(notif.title || 'Notifikasi baru diterima!', {
          icon: '🔔',
          duration: 4000
        });
      });

      return () => {
        echoInstance.leave(`App.Models.User.${user.id}`);
      };
    }
  }, [user, queryClient]);

  // 3. Mark Notification as Read Mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (id) => {
      await api.post(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await api.post('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Semua notifikasi ditandai dibaca.');
    }
  });

  // 4. Global Employee Search (Admin only)
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['employeeSearch', globalSearchQuery],
    queryFn: async () => {
      if (!globalSearchQuery) return [];
      const res = await api.get(`/admin/pegawai?search=${globalSearchQuery}&limit=5`);
      return res.data.data;
    },
    enabled: isAdmin && searchOpen && globalSearchQuery.length > 1
  });

  // Sidebar Links definition
  const adminLinks = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: FiHome },
    { name: 'Manajemen Pegawai', path: '/admin/pegawai', icon: FiUsers },
    { name: 'QR Code Manager', path: '/admin/qrcode', icon: IoQrCodeOutline },
    { name: 'Monitoring Kehadiran', path: '/admin/attendance', icon: FiClock },
    { name: 'Pengajuan Izin', path: '/admin/leave', icon: FiCheckSquare },
    { name: 'Laporan Kehadiran', path: '/admin/reports', icon: FiFileText },
    { name: 'Pengaturan Jam Kerja', path: '/admin/settings', icon: FiSettings },
  ];

  const pegawaiLinks = [
    { name: 'Dashboard', path: '/pegawai/dashboard', icon: FiHome },
    { name: 'Scan QR Absensi', path: '/pegawai/scan', icon: IoQrCodeOutline },
    { name: 'Pengajuan Izin', path: '/pegawai/leave', icon: FiCheckSquare },
    { name: 'Riwayat Kehadiran', path: '/pegawai/history', icon: FiClock },
  ];

  const links = isAdmin ? adminLinks : pegawaiLinks;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleStopImpersonate = async () => {
    const res = await stopImpersonate();
    if (res.success) {
      navigate('/admin/pegawai');
      queryClient.invalidateQueries();
    }
  };

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-150 flex flex-col transition-colors duration-200">
      
      {/* 1. Impersonate Alert Banner */}
      {isImpersonating && (
        <div className="bg-red-600 text-white px-4 py-2 text-center text-sm font-semibold flex items-center justify-center gap-2 z-50 shrink-0 shadow-md">
          <FiAlertTriangle className="h-4 w-4 animate-bounce" />
          <span>Anda sedang masuk sebagai <strong>{user?.name}</strong> (Impersonasi).</span>
          <button 
            onClick={handleStopImpersonate}
            className="ml-3 px-3 py-1 bg-white text-red-700 hover:bg-red-50 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            Hentikan Impersonasi
          </button>
        </div>
      )}

      <div className="flex flex-1 relative overflow-hidden">
        
        {/* 2. Desktop Sidebar */}
        <aside className={`hidden md:flex flex-col bg-white dark:bg-gray-850 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 shrink-0 ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}>
          {/* Logo Section */}
          <div className="h-16 flex items-center gap-3 px-6 border-b border-gray-200 dark:border-gray-800">
            <div className="p-2 bg-blue-600 dark:bg-blue-500 rounded-lg text-white text-lg">
              <IoQrCodeOutline className="h-6 w-6" />
            </div>
            {sidebarOpen && (
              <span className="font-bold text-base tracking-wide text-blue-600 dark:text-blue-400 truncate">
                QR Absensi
              </span>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname.startsWith(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-4 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                    isActive 
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                  title={!sidebarOpen ? link.name : ''}
                >
                  <Icon className={`h-5 w-5 shrink-0 ${
                    isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'
                  }`} />
                  {sidebarOpen && <span className="truncate">{link.name}</span>}
                </Link>
              );
            })}
          </nav>

          {/* User info & Logout */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
            {sidebarOpen ? (
              <div className="flex items-center gap-3 mb-4">
                <img 
                  src={user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=0D8ABC&color=fff`} 
                  alt="Avatar" 
                  className="h-10 w-10 rounded-full border border-gray-200 dark:border-gray-700 object-cover"
                />
                <div className="text-left truncate">
                  <h4 className="font-semibold text-sm truncate">{user?.name}</h4>
                  <p className="text-xs text-gray-500 capitalize">{user?.role?.value || user?.role}</p>
                </div>
              </div>
            ) : (
              <div className="flex justify-center mb-4">
                <img 
                  src={user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=0D8ABC&color=fff`} 
                  alt="Avatar" 
                  className="h-10 w-10 rounded-full border border-gray-200 dark:border-gray-700 object-cover"
                  title={user?.name}
                />
              </div>
            )}
            <button
              onClick={handleLogout}
              className={`w-full flex items-center justify-center gap-3 px-3 py-2 text-sm font-medium border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-pointer ${
                !sidebarOpen && 'px-0'
              }`}
              title="Logout"
            >
              <FiLogOut className="h-5 w-5 shrink-0" />
              {sidebarOpen && <span>Keluar</span>}
            </button>
          </div>
        </aside>

        {/* 3. Mobile Sidebar Drawer */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden flex">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/40 backdrop-blur-xs" 
              onClick={() => setMobileSidebarOpen(false)}
            />
            {/* Drawer Content */}
            <aside className="relative bg-white dark:bg-gray-850 w-64 max-w-xs flex flex-col h-full z-50 border-r border-gray-200 dark:border-gray-800">
              <div className="h-16 flex items-center gap-3 px-6 border-b border-gray-200 dark:border-gray-800">
                <IoQrCodeOutline className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                <span className="font-bold text-blue-600 dark:text-blue-400">QR Absensi</span>
              </div>
              <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
                {links.map((link) => {
                  const Icon = link.icon;
                  const isActive = location.pathname.startsWith(link.path);
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setMobileSidebarOpen(false)}
                      className={`flex items-center gap-4 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive 
                          ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' 
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span>{link.name}</span>
                    </Link>
                  );
                })}
              </nav>
              <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                <div className="flex items-center gap-3 mb-4">
                  <img 
                    src={user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=0D8ABC&color=fff`} 
                    alt="Avatar" 
                    className="h-10 w-10 rounded-full border border-gray-200 dark:border-gray-700 object-cover"
                  />
                  <div className="text-left">
                    <h4 className="font-semibold text-sm">{user?.name}</h4>
                    <p className="text-xs text-gray-500 capitalize">{user?.role?.value || user?.role}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-3 px-3 py-2 text-sm font-medium border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  <FiLogOut className="h-5 w-5" />
                  <span>Keluar</span>
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* 4. Main Page Body Container */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          
          {/* Topbar Header */}
          <header className="h-16 bg-white dark:bg-gray-850 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 md:px-6 shrink-0 z-30 shadow-xs">
            
            {/* Left: Toggles */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setMobileSidebarOpen(true)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white md:hidden hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
              >
                <FiMenu className="h-5 w-5" />
              </button>
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="hidden md:p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
              >
                <FiMenu className="h-5 w-5" />
              </button>

              {/* Topbar Page Breadcrumb Indicator */}
              <h2 className="hidden lg:block text-sm font-semibold text-gray-500 dark:text-gray-400">
                Sistem Absensi QR Code
              </h2>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3 md:gap-4 relative">
              
              {/* Search Trigger (Admin Only) */}
              {isAdmin && (
                <button
                  onClick={() => setSearchOpen(true)}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                  title="Cari pegawai global..."
                >
                  <FiSearch className="h-5 w-5" />
                </button>
              )}

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                title={isDark ? "Aktifkan Mode Terang" : "Aktifkan Mode Gelap"}
              >
                {isDark ? <FiSun className="h-5 w-5" /> : <FiMoon className="h-5 w-5" />}
              </button>

              {/* Notification Bell Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setNotificationOpen(!notificationOpen)}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors relative cursor-pointer"
                >
                  <FiBell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown Panel */}
                {notificationOpen && (
                  <>
                    {/* Overlay to close */}
                    <div className="fixed inset-0 z-40" onClick={() => setNotificationOpen(false)} />
                    
                    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden text-left border-gray-100 dark:border-gray-800">
                      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center">
                        <span className="font-semibold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Notifikasi</span>
                        {unreadCount > 0 && (
                          <button 
                            onClick={() => {
                              markAllAsReadMutation.mutate();
                              setNotificationOpen(false);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium cursor-pointer"
                          >
                            Tandai semua dibaca
                          </button>
                        )}
                      </div>
                      
                      <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400 flex flex-col items-center gap-2">
                            <HiOutlineMailOpen className="h-8 w-8 text-gray-300" />
                            <span>Tidak ada notifikasi baru</span>
                          </div>
                        ) : (
                          notifications.map((notif) => {
                            const data = notif.data;
                            const isRead = !!notif.read_at;
                            return (
                              <div 
                                key={notif.id}
                                className={`p-4 transition-colors ${
                                  isRead ? 'bg-white dark:bg-gray-800' : 'bg-blue-50/40 dark:bg-blue-900/5'
                                }`}
                              >
                                <div className="flex justify-between items-start gap-2 mb-1">
                                  <h5 className="font-semibold text-xs text-gray-900 dark:text-white truncate">
                                    {data.title}
                                  </h5>
                                  {!isRead && (
                                    <button
                                      onClick={() => markAsReadMutation.mutate(notif.id)}
                                      className="text-[10px] text-blue-500 hover:underline cursor-pointer"
                                    >
                                      Tandai dibaca
                                    </button>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-1">
                                  {data.message}
                                </p>
                                <span className="text-[9px] text-gray-400">
                                  {new Date(notif.created_at || notif.updated_at).toLocaleDateString('id-ID', {
                                    hour: '2-digit', minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                      
                      <Link 
                        to={isAdmin ? '/admin/dashboard' : '/pegawai/dashboard'} 
                        onClick={() => setNotificationOpen(false)}
                        className="block text-center py-2.5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 hover:bg-gray-100 dark:bg-gray-900/30 dark:hover:bg-gray-900/60 text-xs font-semibold text-gray-600 dark:text-gray-400"
                      >
                        Tutup Panel
                      </Link>
                    </div>
                  </>
                )}
              </div>

              {/* Profile Avatar trigger */}
              <div className="flex items-center gap-3">
                <Link to="/profile" title="Pengaturan Profil" className="hover:opacity-85 transition-opacity">
                  <img 
                    src={user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=0D8ABC&color=fff`} 
                    alt="Profile" 
                    className="h-9 w-9 rounded-full border border-gray-200 dark:border-gray-700 object-cover shadow-sm"
                  />
                </Link>
              </div>

            </div>
          </header>

          {/* 5. Main Content Wrapper */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 dark:bg-gray-900">
            {children}
          </main>

        </div>

      </div>

      {/* 6. Global Search Modal (Admin Only) */}
      {isAdmin && (
        <Modal
          isOpen={searchOpen}
          onClose={() => {
            setSearchOpen(false);
            setGlobalSearchQuery('');
          }}
          title="Pencarian Global Pegawai"
          size="md"
        >
          <div className="flex flex-col gap-4">
            <SearchBar
              value={globalSearchQuery}
              onChange={(e) => setGlobalSearchQuery(e.target.value)}
              placeholder="Ketik NIP, Nama, Jabatan, atau Divisi..."
              className="w-full"
            />

            <div className="mt-2 text-left">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block mb-3">
                Hasil Pencarian
              </span>

              {searchLoading ? (
                <div className="space-y-2 py-4">
                  <div className="animate-pulse h-12 bg-gray-100 dark:bg-gray-800 rounded-xl" />
                  <div className="animate-pulse h-12 bg-gray-100 dark:bg-gray-800 rounded-xl" />
                </div>
              ) : searchResults?.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">
                  {globalSearchQuery.length > 1 ? 'Pegawai tidak ditemukan.' : 'Silakan masukkan minimal 2 karakter.'}
                </p>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-72 overflow-y-auto">
                  {searchResults?.map((emp) => (
                    <div 
                      key={emp.id} 
                      className="py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/40 px-2 rounded-lg transition-colors cursor-pointer"
                      onClick={() => {
                        setSearchOpen(false);
                        setGlobalSearchQuery('');
                        navigate(`/admin/pegawai`); // Redirects to employee list, or we can select him
                        toast.success(`Ditemukan: ${emp.name}`);
                      }}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <img
                          src={emp.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=0D8ABC&color=fff`}
                          alt={emp.name}
                          className="h-9 w-9 rounded-full object-cover shrink-0"
                        />
                        <div className="truncate">
                          <h4 className="font-semibold text-sm truncate">{emp.name}</h4>
                          <p className="text-xs text-gray-500 truncate">NIP: {emp.nip} | {emp.position || 'Staff'}</p>
                        </div>
                      </div>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 capitalize">
                        {emp.department || 'Umum'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};

export default DashboardLayout;
