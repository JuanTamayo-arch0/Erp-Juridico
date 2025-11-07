import React, { useState, useEffect, useRef } from 'react';
import { MagnifyingGlassIcon, BellIcon, Bars3Icon } from '@heroicons/react/24/outline';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from './ConfirmDialog';
import client from '../services/httpClient';

export default function TopBar({ collapsed, onToggle }:{collapsed?:boolean; onToggle?:()=>void}){
  const { user, logout } = useAuth();
  const [q, setQ] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const notifRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<{cases:any[]; clients:any[]; documents:any[]}>({ cases: [], clients: [], documents: [] });
  const [fetchingSuggest, setFetchingSuggest] = useState(false);
  const debounceRef = useRef<number | undefined>(undefined);
  const [profileOpen, setProfileOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const navigate = useNavigate();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastUnreadRef = useRef<number>(0);

  function submit(e: React.FormEvent){
    e.preventDefault();
    const term = (q || '').trim();
    if (!term) return;
    navigate(`/search?q=${encodeURIComponent(term)}`);
  }

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    lastUnreadRef.current = 0;
    // simple polling each 20s
    const iv = window.setInterval(async () => {
      const prev = lastUnreadRef.current;
      const count = await fetchNotifications();
      if (typeof count === 'number' && count > prev) {
        playBell();
      }
      lastUnreadRef.current = count || 0;
    }, 20000);
    function onDoc(e: MouseEvent){
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSuggestionsOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    }
    document.addEventListener('click', onDoc);
    // Initialize/resume audio on first user interaction to comply with autoplay policies
    const resume = () => {
      try {
        if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
      } catch {}
      document.removeEventListener('click', resume);
    };
    document.addEventListener('click', resume);
    return () => { document.removeEventListener('click', onDoc); document.removeEventListener('click', resume); window.clearInterval(iv); };
  }, [user]);

  useEffect(() => {
    // Debounced live suggestions
    const term = (q || '').trim();
    if (!term) {
      setSuggestions({ cases: [], clients: [], documents: [] });
      setSuggestionsOpen(false);
      return;
    }
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      try {
        setFetchingSuggest(true);
        const data: any = await client.get(`/search/?q=${encodeURIComponent(term)}`);
        setSuggestions({
          cases: (data.cases || []).slice(0, 5),
          clients: (data.clients || []).slice(0, 5),
          documents: (data.documents || []).slice(0, 5),
        });
        setSuggestionsOpen(true);
      } catch (e) {
        setSuggestions({ cases: [], clients: [], documents: [] });
        setSuggestionsOpen(false);
      } finally {
        setFetchingSuggest(false);
      }
    }, 250);
    return () => window.clearTimeout(debounceRef.current);
  }, [q]);

  async function fetchNotifications(){
    try {
      const data = await client.get('/events/notifications/');
      const list = (data.results || data || []).slice(0, 5);
      setNotifications(list);
      const count = (data.results || data || []).filter((n: any) => !n.read).length;
      setUnread(count);
      return count;
    } catch {}
  }

  function playBell(){
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = audioCtxRef.current;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = 880; // A5
      g.gain.value = 0.0001;
      o.connect(g);
      g.connect(ctx.destination);
      const now = ctx.currentTime;
      o.start(now);
      g.gain.exponentialRampToValueAtTime(0.02, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.00001, now + 0.35);
      o.stop(now + 0.4);
    } catch {}
  }

  async function markRead(id: number){
    try {
      await client.post(`/events/notifications/${id}/mark_read/`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnread(u => Math.max(0, u - 1));
    } catch {}
  }

  async function markAllRead(){
    try { await client.post('/events/notifications/mark_all_read/'); setNotifications(prev => prev.map(n => ({ ...n, read: true }))); setUnread(0); } catch {}
  }
  return (
    <div className="flex items-center gap-4">
      {/* sidebar toggle (visible on all sizes, handy for keyboard users) */}
      <button onClick={onToggle} className="p-2 rounded-md hover:bg-white/5 mr-2"><Bars3Icon className="w-5 h-5 text-[var(--wm-3)]"/></button>

      <form onSubmit={submit} className="relative flex-1 flex justify-center">
        <div className="w-full max-w-3xl relative" ref={searchRef}>
          <input
            value={q}
            onChange={(e)=>setQ(e.target.value)}
            onFocus={() => { if ((q || '').trim()) setSuggestionsOpen(true); }}
            placeholder="Buscar casos, clientes o documentos"
            className="w-full rounded-full bg-[var(--wm-1)]/08 placeholder:text-[var(--wm-4)] py-2 px-4 pl-10 text-[var(--wm-5)] border border-transparent focus:border-[var(--card-border)]"
          />
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--wm-3)]" />

          {suggestionsOpen && (
            <div className="absolute z-50 mt-2 w-full bg-white border rounded-lg shadow-lg overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x">
                <div className="p-2">
                  <div className="text-xs uppercase muted-dark mb-1">Casos</div>
                  {fetchingSuggest && suggestions.cases.length === 0 && <div className="text-sm muted">Buscando...</div>}
                  {suggestions.cases.length === 0 && !fetchingSuggest && <div className="text-sm muted">Sin coincidencias</div>}
                  {suggestions.cases.map((c) => (
                    <div key={c.id} className="p-2 rounded hover:bg-gray-50 cursor-pointer" onClick={() => { navigate(`/cases/${c.id}`); setSuggestionsOpen(false); }}>
                      <div className="font-medium text-[var(--wm-5)]">{c.title}</div>
                      <div className="text-xs muted">{c.client_name || ''}</div>
                    </div>
                  ))}
                </div>
                <div className="p-2">
                  <div className="text-xs uppercase muted-dark mb-1">Clientes</div>
                  {fetchingSuggest && suggestions.clients.length === 0 && <div className="text-sm muted">Buscando...</div>}
                  {suggestions.clients.length === 0 && !fetchingSuggest && <div className="text-sm muted">Sin coincidencias</div>}
                  {suggestions.clients.map((cl) => (
                    <div key={cl.id} className="p-2 rounded hover:bg-gray-50 cursor-pointer" onClick={() => { navigate(`/clients/${cl.id}`); setSuggestionsOpen(false); }}>
                      <div className="font-medium text-[var(--wm-5)]">{cl.name}</div>
                      <div className="text-xs muted">{cl.nit || cl.email || ''}</div>
                    </div>
                  ))}
                </div>
                <div className="p-2">
                  <div className="text-xs uppercase muted-dark mb-1">Documentos</div>
                  {fetchingSuggest && suggestions.documents.length === 0 && <div className="text-sm muted">Buscando...</div>}
                  {suggestions.documents.length === 0 && !fetchingSuggest && <div className="text-sm muted">Sin coincidencias</div>}
                  {suggestions.documents.map((d) => (
                    <div key={d.id} className="p-2 rounded hover:bg-gray-50 cursor-pointer" onClick={() => { navigate(`/documents/${d.id}`); setSuggestionsOpen(false); }}>
                      <div className="font-medium text-[var(--wm-5)]">{d.title}</div>
                      <div className="text-xs muted">Subido por: {d.uploaded_by?.username || '—'}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t p-2 text-right">
                <button type="submit" className="text-sm link-accent" onClick={() => setSuggestionsOpen(false)}>Ver todos los resultados →</button>
              </div>
            </div>
          )}
        </div>
      </form>
      <div className="flex items-center gap-3">
        <div className="relative" ref={notifRef}>
          <button onClick={(e)=>{ e.stopPropagation(); setNotifOpen(o=>!o); }} className="relative p-2 rounded-full bg-[var(--wm-1)]/20">
            <BellIcon className="w-5 h-5 text-white"/>
            {unread > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1">{unread}</span>}
          </button>
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white border rounded shadow-lg z-50" onClick={(e)=>e.stopPropagation()}>
              <div className="p-2 flex items-center justify-between">
                <div className="font-medium text-[var(--wm-5)]">Notificaciones</div>
                <button onClick={markAllRead} className="text-xs link-accent">Marcar todos</button>
              </div>
              <div className="max-h-64 overflow-auto">
                {notifications.length === 0 && <div className="p-3 text-sm muted-dark">No hay notificaciones</div>}
                {notifications.map((n) => (
                  <div key={n.id} className={`p-3 border-t ${n.read ? 'bg-white' : 'bg-gray-50'}`}>
                    <div className="flex justify-between items-start">
                      <div className="text-sm text-[var(--wm-5)]">{n.message}</div>
                      {!n.read && <button onClick={()=>markRead(n.id)} className="text-xs link-accent ml-2">Marcar leído</button>}
                    </div>
                    <div className="text-xs muted">{n.created_at}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative" ref={profileRef}>
            <button onClick={(e) => { e.stopPropagation(); setProfileOpen(o => !o); }} className="block">
              {user && user.avatar ? (
                <img
                  src={(user.avatar && (String(user.avatar).startsWith('http') ? user.avatar : window.location.origin + user.avatar)) || ''}
                  alt="avatar"
                  className="h-8 w-8 rounded-full object-cover border"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#3049D9] to-[#5B85D9] flex items-center justify-center text-sm">
                  {user ? (user.first_name || user.username || 'U').charAt(0) : 'U'}
                </div>
              )}
            </button>
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white text-[var(--wm-5)] border rounded shadow-lg z-50" onClick={(e)=>e.stopPropagation()}>
                <div className="px-3 py-2 border-b">
                  <div className="text-sm font-medium">{user?.first_name || user?.username || 'Usuario'}</div>
                  <div className="text-xs muted">{user?.email || ''}</div>
                </div>
                <button className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm" onClick={() => { setConfirmLogout(true); setProfileOpen(false); }}>
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
        {/* quick links removed from TopBar — moved to left Sidebar */}
      </div>
      {confirmLogout && (
        <ConfirmDialog
          title="Confirmar"
          message="¿Cerrar sesión?"
          variant="warning"
          confirmText="Salir"
          cancelText="Cancelar"
          onConfirm={() => { logout(); setConfirmLogout(false); }}
          onCancel={() => setConfirmLogout(false)}
        />
      )}
    </div>
  );
}
