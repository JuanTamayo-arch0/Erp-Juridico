import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAccessToken } from '../services/auth';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../services/httpClient';

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [userCases, setUserCases] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const rs = await client.get('/users/roles/');
        if (mounted) setRoles(rs.results || rs || []);
        if (id && id !== 'new') {
          const u = await client.get(`/users/users/${id}/`);
          if (mounted) setUser(u);
          // load case activity history for this user (limited)
          try {
            const h = await client.get(`/cases/history/by-user/?user=${id}&limit=50`);
            if (mounted) setHistory(h || []);
          } catch (e) { /* ignore */ }
          // load cases where this user is/was responsible
          try {
            const cs = await client.get(`/cases/by-user/?user=${id}`);
            if (mounted) setUserCases((cs?.results || cs || []));
          } catch (e) { /* ignore */ }
        } else {
          if (mounted) setUser({ username: '', email: '', first_name: '', last_name: '', role_ids: [] });
        }
      } catch (e) {}
      finally { if (mounted) setLoading(false); }
    }
    load();
    return () => { mounted = false; };
  }, [id]);

  async function uploadAvatar(file: File | null) {
    if (!file) return;
    const token = getAccessToken();
    const fd = new FormData();
    fd.append('avatar', file);
    try {
      // use endpoint on users viewset: /api/users/users/{id}/avatar/
      const url = `/api/users/users/${id}/avatar/`;
      const res = await fetch(url, { method: 'POST', body: fd, headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (res.ok) {
        const d = await res.json();
        // refresh user data
        const u = await client.get(`/users/users/${id}/`);
        setUser(u);
      } else {
        console.error('avatar upload failed', res.status);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      if (id && id !== 'new') {
        await client.put(`/users/users/${id}/`, user);
      } else {
        const data: any = await client.post('/users/users/', user);
        // if backend returned a generated password, show it to the admin so it can be copied
        if (data && data.generated_password) {
          setGeneratedPassword(data.generated_password);
          // refresh created user to populate id/avatar etc
          const newUser = await client.get(`/users/users/${data.id}/`);
          setUser(newUser);
          // do not navigate away immediately; let admin copy the password
          setSaving(false);
          return;
        }
      }
      navigate('/users');
    } catch (e) {
      console.error(e);
    } finally { setSaving(false); }
  }

  if (loading) return <div className="app-container">Cargando...</div>;

  return (
    <div className="app-container">
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        {/* Columna izquierda: edición de usuario */}
        <div>
          <div className="card h-full">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">{id === 'new' ? 'Crear usuario' : 'Editar usuario'}</h2>
        </div>
        <div className="mb-4">
          {user && user.avatar ? (
            <img src={user.avatar} alt="avatar" className="h-20 w-20 rounded-full object-cover" />
          ) : (
            <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center">No avatar</div>
          )}
          <div className="mt-2">
            <input type="file" accept="image/*" onChange={(e)=>uploadAvatar(e.target.files ? e.target.files[0] : null)} />
          </div>
        </div>
        <label className="block">Username</label>
        <input className="w-full border p-2" value={user.username} onChange={(e)=>setUser({...user, username: e.target.value})} />
        <label className="block mt-2">Email</label>
        <input className="w-full border p-2" value={user.email} onChange={(e)=>setUser({...user, email: e.target.value})} />
        <label className="block mt-2">Nombre</label>
        <input className="w-full border p-2" value={user.first_name} onChange={(e)=>setUser({...user, first_name: e.target.value})} />
        <label className="block mt-2">Apellido</label>
        <input className="w-full border p-2" value={user.last_name} onChange={(e)=>setUser({...user, last_name: e.target.value})} />

        <label className="block mt-2">Roles</label>
        <div className="flex gap-2 flex-wrap">
          {roles.map(r => (
            <label key={r.id} className="inline-flex items-center gap-2">
              <input type="checkbox" checked={(user.role_ids||[]).includes(r.id)} onChange={(e)=>{
                const set = new Set(user.role_ids || []);
                if (e.target.checked) set.add(r.id); else set.delete(r.id);
                setUser({...user, role_ids: Array.from(set)});
              }} />
              <span className="text-sm">{r.name}</span>
            </label>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <button className="btn-primary" onClick={save} disabled={saving || !!generatedPassword}>{saving ? 'Guardando...' : 'Guardar'}</button>
          <button className="px-3 py-1 btn-neutral" onClick={()=>navigate('/users')}>Cancelar</button>
        </div>
          </div>
          {generatedPassword && (
            <div className="mt-4 card">
          <h3 className="font-medium">Contraseña generada</h3>
          <div className="mt-2 p-3 bg-gray-50 rounded flex items-center justify-between">
            <div className="font-mono text-sm">{generatedPassword}</div>
            <div className="flex gap-2">
              <button className="px-2 py-1 btn-neutral" onClick={() => { navigator.clipboard.writeText(generatedPassword); }}>Copiar</button>
              <button className="btn-primary" onClick={() => navigate('/users')}>Listo</button>
            </div>
          </div>
          <div className="mt-2 text-xs muted">La contraseña se muestra una sola vez. Si la pierdes, restablécela desde el perfil del usuario.</div>
            </div>
          )}
        </div>

        {/* Columna derecha: Casos del usuario (historial) y movimientos */}
        <div>
          <div className="card h-full flex flex-col min-h-0">
            <h3 className="font-medium">Casos del usuario</h3>
            <div className="mt-2 space-y-2 flex-1 min-h-0 overflow-auto">
              {userCases.length === 0 && (
                <div className="text-sm muted">No hay casos para este usuario o no tienes permiso para verlos.</div>
              )}
              {userCases.map((c:any) => (
                <div key={c.id} className="p-3 border rounded bg-white flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-medium truncate" title={c.title}>{c.title || `Caso ${c.id}`}</div>
                    <div className="text-xs muted truncate">Cliente: {c.client_name || '—'}</div>
                    <div className="text-xs muted">Rol: {c.role || '—'}{c.left_at ? <span className="ml-2 inline-block px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded">Histórico</span> : <span className="ml-2 inline-block px-2 py-0.5 bg-green-100 text-green-800 rounded">Activo</span>}</div>
                    {c.left_at && <div className="text-[11px] muted">Salió: {new Date(c.left_at).toLocaleString()}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={`/cases/${c.id}`} className="px-2 py-1 btn-neutral text-sm">Ver caso</a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {userCases.length === 0 && history.filter((a:any)=>['case.responsible.assigned','case.responsible.left','case.responsible.removed','case.principal.transferred'].includes(a.type)).length > 0 && (
            <div className="mt-4 card">
              <h3 className="font-medium">Movimientos en casos</h3>
              <div className="mt-2 space-y-2 max-h-96 overflow-auto">
                {history.filter((a:any)=>['case.responsible.assigned','case.responsible.left','case.responsible.removed','case.principal.transferred'].includes(a.type)).map((a:any)=>(
                  <div key={`${a.source}-${a.id}`} className="p-3 border rounded bg-white flex items-start justify-between">
                    <div>
                      <div className="text-sm"><span className="inline-block px-2 py-0.5 bg-gray-100 rounded mr-2">{a.type.replace('case.','').replaceAll('.', ' ')}</span><span className="muted-xs">{a.created_at ? new Date(a.created_at).toLocaleString() : ''}</span></div>
                      <div className="text-xs muted">{a.case_title ? `Caso: ${a.case_title}` : (a.case_id ? `Caso #${a.case_id}` : '')}</div>
                    </div>
                    {a.case_id && <a href={`/cases/${a.case_id}`} className="px-2 py-1 btn-neutral text-sm">Ver</a>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
