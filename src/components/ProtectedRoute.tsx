import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSigmaStore } from '../store/SigmaStore';
import { MasterKeyStore } from '../utils/auth';
import { checkIsDedicatedDemoPanel } from '../utils/demoData';

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoadingLive, isDemo } = useSigmaStore();

  const hasSession = typeof window !== 'undefined' && Boolean(
    localStorage.getItem('sigma_session_user') ||
    localStorage.getItem('sigma_session_token') ||
    localStorage.getItem('sigma_is_demo') === 'true' ||
    sessionStorage.getItem('sigma_session_user')
  );

  if (!isAuthenticated && !hasSession && !isDemo && !isLoadingLive && !checkIsDedicatedDemoPanel()) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
