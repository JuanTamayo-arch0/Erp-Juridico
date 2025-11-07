import React, { useEffect, useState, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BellIcon, UserCircleIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import client from '../services/httpClient';
import { useAuth } from '../context/AuthContext';
import { getAccessToken } from '../services/auth';
import { API_BASE, API_HOST } from '../services/httpClient';
import SearchBar from './SearchBar';

const NavLink: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => {
  const loc = useLocation();
  const active = loc.pathname === to;
  return (
    <Link
      to={to}
      className={`px-3 py-2 rounded-md text-sm font-medium ${active ? 'bg-[var(--wm-5)] text-[var(--wm-1)]' : 'text-[var(--wm-4)] hover:bg-[var(--card-surface)]'}`}>
      {children}
    </Link>
  );
};

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const { user, token, loading, logout, refreshUser } = useAuth();
  const notifRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // only fetch notifications when we have a token / user; avoid unauthenticated 401s
    if (!token && !user && !loading) return;
    if (!token && !user) return;
    fetchNotifications();
    // close dropdown when clicking outside
    function onDoc(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, [token, user, loading]);

  async function fetchNotifications() {
    try {
      const data = await client.get('/events/notifications/');
      const list = (data.results || data || []).slice(0, 5);
      setNotifications(list);
      setUnread((data.results || data || []).filter((n: any) => !n.read).length);
    } catch (e) {
      // ignore
    }
  }

  async function markRead(id: number) {
    try {
      await client.post(`/events/notifications/${id}/mark_read/`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnread((u) => Math.max(0, u - 1));
    } catch (e) {
      console.error(e);
    }
  }

  async function markAllRead() {
    try {
      await client.post('/events/notifications/mark_all_read/');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch (e) {
      console.error(e);
    }
  }

  function initials() {
    if (!user) return 'U';
    const a = (user.first_name || '').trim();
    const b = (user.last_name || '').trim();
    if (a || b) return `${a.charAt(0) || ''}${b.charAt(0) || ''}`.toUpperCase();
    return (user.username || 'U').charAt(0).toUpperCase();
  }

  return (
    <header className="bg-[var(--card-surface)] border-b">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-semibold text-[var(--wm-5)]">ERP Juridico</Link>
            <nav className="hidden md:flex ml-6 space-x-2">
              <NavLink to="/">Dashboard</NavLink>
              <NavLink to="/cases">Casos</NavLink>
              <NavLink to="/clients">Clientes</NavLink>
              <NavLink to="/documents">Documentos</NavLink>
              <NavLink to="/calendar">Agenda</NavLink>
              
              <NavLink to="/roles">Roles</NavLink>
              <NavLink to="/tasks">Tareas</NavLink>
              <NavLink to="/search">Buscar</NavLink>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <SearchBar />
            <div className="relative" ref={notifRef}>
              <button aria-label="notifications" onClick={(e) => { e.stopPropagation(); setNotifOpen(o => !o); }} className="relative p-1 rounded-full hover:bg-[var(--card-surface)]">
                <BellIcon className="w-6 h-6 text-[var(--wm-4)]" />
                {unread > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1">{unread}</span>}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border rounded shadow-lg z-50" onClick={(e) => e.stopPropagation()}>
                  <div className="p-2">
                    <div className="flex justify-between items-center">
                      <div className="font-medium">Notificaciones</div>
                      <button onClick={markAllRead} className="text-xs text-blue-600">Marcar todos</button>
                    </div>
                  </div>
                  <div className="max-h-64 overflow-auto">
                    {notifications.length === 0 && <div className="p-3 text-sm muted-dark">No hay notificaciones</div>}
                    {notifications.map((n) => (
                      <div key={n.id} className={`p-3 border-t ${n.read ? 'bg-white' : 'bg-gray-50'}`}>
                        <div className="flex justify-between items-start">
                          <div className="text-sm" style={{ color: 'var(--wm-5)' }}>{n.message}</div>
                          <div className="flex items-center space-x-2">
                            {n.event && <Link to={`/events/${n.event}`} className="text-xs text-indigo-600">Abrir evento</Link>}
                            {!n.read && (
                              <button onClick={() => markRead(n.id)} className="text-xs text-blue-600 ml-2">Marcar leído</button>
                            )}
                          </div>
                        </div>
                        <div className="text-xs muted">{n.created_at}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="hidden md:block">
              <Link to="/search" className="text-sm text-[var(--wm-4)] hover:underline">Buscar</Link>
            </div>

            <div className="flex items-center space-x-3">
              <div className="relative">
                {user && user.avatar ? (
                  <img src={(user.avatar && (user.avatar.startsWith('http') ? user.avatar : (API_HOST + user.avatar))) || ''} alt="avatar" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-[var(--wm-1)] flex items-center justify-center text-sm text-[var(--wm-5)]">{initials()}</div>
                )}
                <input id="avatarUpload" type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const f = e.target.files && e.target.files[0];
                  if (!f) return;
                  const url = `${API_BASE}/auth/me/avatar/`;
                  const token = getAccessToken();
                  const fd = new FormData();
                  fd.append('avatar', f);
                  try {
                    const res = await fetch(url, { method: 'POST', body: fd, headers: token ? { 'Authorization': `Bearer ${token}` } : {} });
                    if (res.ok) {
                      // refresh user profile in context
                      try { await refreshUser(); } catch (e) { /* fallback */ window.location.reload(); }
                    }
                  } catch (err) { console.error(err); }
                }} />
                <label htmlFor="avatarUpload" className="absolute -bottom-1 -right-1 bg-[var(--card-surface)] p-0.5 rounded-full cursor-pointer">
                  <UserCircleIcon className="w-4 h-4 text-[var(--wm-4)]" />
                </label>
              </div>
              <button onClick={() => logout()} className="text-sm text-[var(--wm-4)] hover:underline">Sign out</button>
            </div>

            <div className="md:hidden">
              <button onClick={() => setOpen(!open)} aria-label="menu" className="p-2 rounded-md bg-[var(--wm-2)]/20">
                {open ? <XMarkIcon className="w-5 h-5 text-[var(--wm-4)]" /> : <Bars3Icon className="w-5 h-5 text-[var(--wm-4)]" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t bg-[var(--card-surface)]">
          <nav className="px-2 pt-2 pb-3 space-y-1">
            <Link to="/" className="block px-3 py-2 rounded-md text-base font-medium text-[var(--wm-4)]">Dashboard</Link>
            <Link to="/cases" className="block px-3 py-2 rounded-md text-base font-medium text-[var(--wm-4)]">Casos</Link>
            <Link to="/clients" className="block px-3 py-2 rounded-md text-base font-medium text-[var(--wm-4)]">Clientes</Link>
            <Link to="/documents" className="block px-3 py-2 rounded-md text-base font-medium text-[var(--wm-4)]">Documentos</Link>
            <Link to="/calendar" className="block px-3 py-2 rounded-md text-base font-medium text-[var(--wm-4)]">Agenda</Link>
            
            <Link to="/roles" className="block px-3 py-2 rounded-md text-base font-medium text-[var(--wm-4)]">Roles</Link>
            <Link to="/tasks" className="block px-3 py-2 rounded-md text-base font-medium text-[var(--wm-4)]">Tareas</Link>
            <Link to="/search" className="block px-3 py-2 rounded-md text-base font-medium text-[var(--wm-4)]">Buscar</Link>
          </nav>
        </div>
      )}
    </header>
  );
}
