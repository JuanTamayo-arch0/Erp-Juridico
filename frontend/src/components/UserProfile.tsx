import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function UserProfile() {
  const { user } = useAuth();
  if (!user) return <div>No user</div>;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div>
        <strong>{user.first_name || user.username}</strong>
        <div style={{ fontSize: 12, color: '#666' }}>{user.email}</div>
      </div>
      <div style={{ marginLeft: 'auto', fontSize: 12, color: '#333' }}>
        Roles: {user.roles && user.roles.length ? user.roles.join(', ') : '—'}
      </div>
    </div>
  );
}
