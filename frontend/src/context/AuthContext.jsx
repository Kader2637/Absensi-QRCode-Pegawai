import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { getCsrfCookie } from '../api/axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/profile');
      if (response.data.success) {
        setUser(response.data.data.user);
        setIsImpersonating(response.data.data.is_impersonating);
      } else {
        setUser(null);
        setIsImpersonating(false);
      }
    } catch (error) {
      setUser(null);
      setIsImpersonating(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();

    // Catch interceptor unauthorized events
    const handleUnauthorized = () => {
      setUser(null);
      setIsImpersonating(false);
      setLoading(false);
    };

    window.addEventListener('auth-unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth-unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      // 1. Get CSRF Cookie
      await getCsrfCookie();

      // 2. Perform Login
      const response = await api.post('/login', { email, password });
      
      if (response.data.success) {
        setUser(response.data.data.user);
        toast.success(response.data.message || 'Login berhasil!');
        return { success: true };
      }
      return { success: false, message: response.data.message };
    } catch (error) {
      const msg = error.response?.data?.message || 'Email atau kata sandi salah.';
      toast.error(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api.post('/logout');
      setUser(null);
      setIsImpersonating(false);
      toast.success('Logout berhasil!');
    } catch (error) {
      toast.error('Gagal melakukan logout.');
    } finally {
      setLoading(false);
    }
  };

  const impersonate = async (userId) => {
    setLoading(true);
    try {
      const response = await api.post(`/admin/pegawai/${userId}/impersonate`);
      if (response.data.success) {
        setUser(response.data.data.user);
        setIsImpersonating(true);
        toast.success(response.data.message);
        return { success: true };
      }
      return { success: false };
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal impersonasi.');
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const stopImpersonate = async () => {
    setLoading(true);
    try {
      const response = await api.post('/pegawai/stop-impersonate');
      if (response.data.success) {
        setUser(response.data.data.user);
        setIsImpersonating(false);
        toast.success(response.data.message);
        return { success: true };
      }
      return { success: false };
    } catch (error) {
      toast.error('Gagal menghentikan impersonasi.');
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isImpersonating,
      login,
      logout,
      impersonate,
      stopImpersonate,
      isAdmin: user?.role === 'admin',
      isPegawai: user?.role === 'pegawai',
      refreshProfile: fetchProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
