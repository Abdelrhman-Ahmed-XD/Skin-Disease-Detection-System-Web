import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import React from 'react';

export const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  const { user, isGuest } = useAuth();
  
  if (!user && !isGuest) {
    return <Navigate to="/login" />;
  }
  
  return children;
};