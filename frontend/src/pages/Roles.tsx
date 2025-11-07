import React, { useEffect, useState } from 'react';
import client from '../services/httpClient';
import ConfirmDialog from '../components/ConfirmDialog';

export default function RolesPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [permissions, setPermissions] = useState<any[]>([]);
  const [editingRole, setEditingRole] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;
    client.get('/users/roles/').then((data) => {
      if (!mounted) return;
      setRoles(data.results || data || []);
    }).catch(() => {}).finally(()=>setLoading(false));
    // load permissions catalog
    client.get('/users/permissions/').then((ps)=>{ if (ps) setPermissions(ps); }).catch(()=>{});
    return ()=>{ mounted=false };
  }, []);

  async function createRole() {
    if (!name) return;
    try {
      await client.post('/users/roles/', { name, description: '' });
      setName('');
      const data = await client.get('/users/roles/');
      setRoles(data.results || data || []);
    } catch (e) { console.error(e); }
  }

  const [confirmState, setConfirmState] = useState<null | { id: number }>(null);
  async function performDelete(id: number) {
    try { await client.delete(`/users/roles/${id}/`); setRoles(roles.filter(r=>r.id!==id)); } catch(e){ console.error(e); }
    setConfirmState(null);
  }

  async function openEdit(role: any) {
    // fetch full role and show editor
    try {
      const r = await client.get(`/users/roles/${role.id}/`);
      setEditingRole(r);
    } catch (e) { console.error(e); }
  }

  async function saveRolePermissions() {
    if (!editingRole) return;
    try {
      await client.put(`/users/roles/${editingRole.id}/`, editingRole);
      const data = await client.get('/users/roles/');
      setRoles(data.results || data || []);
      setEditingRole(null);
    } catch (e) { console.error(e); }
  }

  return (
    <div className="app-container">
      <div className="mt-4 card">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Roles</h2>
            </div>
            {loading && <div>Cargando...</div>}
        {!loading && (
          <div>
            <div className="mb-3 p-3 card-soft rounded-lg flex gap-2">
              <input className="flex-1 border px-3 py-2 rounded text-[var(--wm-5)] placeholder:text-[var(--wm-3)]" placeholder="Nombre del rol" value={name} onChange={(e)=>setName(e.target.value)} />
              <button className="btn-primary" onClick={createRole}>Crear</button>
            </div>
            <ul className="space-y-2">
              {roles.map(r => (
                  <li key={r.id} className="p-3 card-soft flex justify-between items-center">
                    <div>
                      <div className="font-medium">{r.name}</div>
                      <div className="text-sm muted">{r.description}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="text-sm link-accent" onClick={()=>openEdit(r)}>Editar</button>
                      <button className="text-sm text-red-600" onClick={()=>setConfirmState({ id: r.id })}>Eliminar</button>
                    </div>
                  </li>
                ))}
            </ul>
          </div>
        )}
          {editingRole && (
            <div className="mt-4 p-3 card-soft rounded-lg">
              <h3 className="font-medium">Editar permisos para {editingRole.name}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 max-h-64 overflow-auto">
                {permissions.map((p:any)=> (
                  <label key={p.id} className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={(editingRole.permissions||[]).includes(p.id)} onChange={(e)=>{
                      const set = new Set(editingRole.permissions||[]);
                      if (e.target.checked) set.add(p.id); else set.delete(p.id);
                      setEditingRole({...editingRole, permissions: Array.from(set)});
                    }} />
                    <span className="text-sm">[{p.app_label}] {p.codename}</span>
                  </label>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <button className="btn-primary" onClick={saveRolePermissions}>Guardar</button>
                <button className="px-3 py-1 btn-neutral" onClick={()=>setEditingRole(null)}>Cancelar</button>
              </div>
            </div>
          )}
        {confirmState && (
          <ConfirmDialog
            title="Confirmar"
            message="¿Eliminar rol?"
            variant="danger"
            confirmText="Eliminar"
            cancelText="Cancelar"
            onConfirm={() => performDelete(confirmState.id)}
            onCancel={() => setConfirmState(null)}
          />
        )}
      </div>
    </div>
  );
}
