import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import client from '../services/httpClient';
import ConfirmDialog from '../components/ConfirmDialog';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [next, setNext] = useState<string | null>(null);
  const [previous, setPrevious] = useState<string | null>(null);
  const [orderBy, setOrderBy] = useState<'name' | 'username' | 'email'>('name');
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1', 10);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    client.get(`/users/users/?page=${page}`).then((data: any) => {
      if (!mounted) return;
      const list = data.results || data || [];
      setUsers(list);
      setNext(data.next || null);
      setPrevious(data.previous || null);
    }).catch(() => {}).finally(() => setLoading(false));
    return () => { mounted = false; };
  }, [page]);

  const sortedUsers = useMemo(() => {
    const arr = [...users];
    arr.sort((a, b) => {
      const nameA = ((a.first_name || '') + ' ' + (a.last_name || '')).trim() || a.username || '';
      const nameB = ((b.first_name || '') + ' ' + (b.last_name || '')).trim() || b.username || '';
      if (orderBy === 'name') return nameA.localeCompare(nameB);
      if (orderBy === 'username') return (a.username || '').localeCompare(b.username || '');
      if (orderBy === 'email') return (a.email || '').localeCompare(b.email || '');
      return 0;
    });
    return arr;
  }, [users, orderBy]);

  const [confirmState, setConfirmState] = useState<null | { message: string; variant?: 'danger' | 'warning' | 'info'; onConfirm: () => void }>(null);

  return (
    <div className="app-container">
      <div className="mt-4 card">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Usuarios</h2>
          <Link to="/users/new" className="btn-primary">Crear usuario</Link>
        </div>
        {loading && <div className="text-sm muted">Cargando...</div>}
        {!loading && users.length === 0 && <div className="text-sm muted">No hay usuarios</div>}
        {!loading && users.length > 0 && (
          <>
          <div className="mt-3 flex items-center justify-between">
            <div className="text-sm muted">Página {page}</div>
            <div className="flex items-center gap-2">
              <label className="text-sm">Ordenar por</label>
              <select className="border rounded px-2 py-1 text-sm" value={orderBy} onChange={(e)=>setOrderBy(e.target.value as any)}>
                <option value="name">Nombre</option>
                <option value="username">Usuario</option>
                <option value="email">Email</option>
              </select>
            </div>
          </div>
          <ul className="mt-2 space-y-2">
            {sortedUsers.map(u => (
              <li key={u.id} className="p-3 card-soft flex items-center justify-between">
                <div className="min-w-0 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-sm overflow-hidden shrink-0">
                    {u.avatar ? (
                      <img
                        src={String(u.avatar).startsWith('http') ? u.avatar : (window.location.origin + u.avatar)}
                        alt="avatar"
                        className="w-full h-full object-cover"
                        onError={(e)=>{ (e.currentTarget as HTMLImageElement).style.display='none'; }}
                      />
                    ) : (
                      <span>{(u.first_name || u.username || 'U').charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-[var(--wm-5)] truncate">{((u.first_name || '') + ' ' + (u.last_name || '')).trim() || u.username}</div>
                    <div className="text-xs muted truncate">{u.email}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(u.roles || []).map((r:any) => (
                        <span key={r.id || r.name} className="chip chip-small">{r.name}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link to={`/users/${u.id}`} className="link-accent text-sm">Editar</Link>
                  <button className="text-red-600 text-sm" onClick={()=>{
                    setConfirmState({
                      message: '¿Eliminar usuario? Esta acción no se puede deshacer.',
                      variant: 'danger',
                      onConfirm: async () => {
                        try { await client.delete(`/users/users/${u.id}/`); setUsers(users.filter(x=>x.id!==u.id)); } catch(e){ console.error(e); }
                        setConfirmState(null);
                      }
                    });
                  }}>Eliminar</button>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex gap-2 mt-4">
            <button
              className="px-3 py-1 btn-neutral"
              onClick={() => setSearchParams({ page: String(Math.max(1, page - 1)) })}
              disabled={!previous}
            >Anterior</button>
            <button
              className="px-3 py-1 btn-neutral"
              onClick={() => setSearchParams({ page: String(page + 1) })}
              disabled={!next}
            >Siguiente</button>
          </div>
          </>
        )}
      </div>
      {confirmState && (
        <ConfirmDialog
          title={confirmState.variant === 'danger' ? 'Confirmar Eliminación' : 'Confirmar'}
          message={confirmState.message}
          variant={confirmState.variant || 'info'}
          confirmText="Eliminar"
          cancelText="Cancelar"
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
  );
}
