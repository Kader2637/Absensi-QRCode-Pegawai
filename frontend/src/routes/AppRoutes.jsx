import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../context/AuthContext';

// Pages
import Login from '../features/auth/pages/Login';
import AdminDashboard from '../features/dashboard/pages/AdminDashboard';
import PegawaiDashboard from '../features/dashboard/pages/PegawaiDashboard';
import EmployeeList from '../features/employees/pages/EmployeeList';
import QRGenerator from '../features/qr-code/pages/QRGenerator';
import AttendanceList from '../features/attendance/pages/AttendanceList';
import LeaveRequestList from '../features/leave/pages/LeaveRequestList';
import ReportPanel from '../features/reports/pages/ReportPanel';
import Settings from '../features/attendance/pages/Settings';

import ScanQR from '../features/attendance/pages/ScanQR';
import LeaveForm from '../features/leave/pages/LeaveForm';
import History from '../features/attendance/pages/History';
import ProfileSettings from '../features/profile/pages/ProfileSettings';

import Forbidden from '../features/errors/pages/Forbidden';
import NotFound from '../features/errors/pages/NotFound';

const RootRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const roleStr = user.role?.value || user.role;
  return <Navigate to={roleStr === 'admin' ? '/admin/dashboard' : '/pegawai/dashboard'} replace />;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={<Login />} />
      <Route path="/forbidden" element={<Forbidden />} />

      {/* Main App Routes (Protected) */}
      <Route path="/" element={<RootRedirect />} />

      {/* Admin Specific Routes */}
      <Route 
        path="/admin/dashboard" 
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DashboardLayout>
              <AdminDashboard />
            </DashboardLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/pegawai" 
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DashboardLayout>
              <EmployeeList />
            </DashboardLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/qrcode" 
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DashboardLayout>
              <QRGenerator />
            </DashboardLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/attendance" 
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DashboardLayout>
              <AttendanceList />
            </DashboardLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/leave" 
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DashboardLayout>
              <LeaveRequestList />
            </DashboardLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/reports" 
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DashboardLayout>
              <ReportPanel />
            </DashboardLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/settings" 
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DashboardLayout>
              <Settings />
            </DashboardLayout>
          </ProtectedRoute>
        } 
      />

      {/* Pegawai Specific Routes */}
      <Route 
        path="/pegawai/dashboard" 
        element={
          <ProtectedRoute allowedRoles={['pegawai']}>
            <DashboardLayout>
              <PegawaiDashboard />
            </DashboardLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/pegawai/scan" 
        element={
          <ProtectedRoute allowedRoles={['pegawai']}>
            <DashboardLayout>
              <ScanQR />
            </DashboardLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/pegawai/leave" 
        element={
          <ProtectedRoute allowedRoles={['pegawai']}>
            <DashboardLayout>
              <LeaveForm />
            </DashboardLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/pegawai/history" 
        element={
          <ProtectedRoute allowedRoles={['pegawai']}>
            <DashboardLayout>
              <History />
            </DashboardLayout>
          </ProtectedRoute>
        } 
      />

      {/* Shared Protected Profile Page */}
      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <ProfileSettings />
            </DashboardLayout>
          </ProtectedRoute>
        } 
      />

      {/* Fallback Routes */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
