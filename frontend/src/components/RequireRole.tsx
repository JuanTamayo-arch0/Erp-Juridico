import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type Props = {
  children: React.ReactElement;
  roles?: string[]; // allowed roles (any match)
  redirectTo?: string;
};

export default function RequireRole({ children, roles, redirectTo = '/not-authorized' }: Props) {
  const { token, loading, user } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!token) return <Navigate to="/login" replace />;
  if (!roles || roles.length === 0) return children;
  const userRoles: string[] = user?.roles || [];
  const allowed = roles.some(r => userRoles.includes(r));
  if (!allowed) return <Navigate to={redirectTo} replace />;
  return children;
}
