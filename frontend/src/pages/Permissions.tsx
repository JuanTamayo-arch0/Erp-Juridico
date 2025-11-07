import React, { useEffect, useState } from 'react';
import client from '../services/httpClient';

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    client.get('/users/permissions/').then((data) => {
      if (!mounted) return;
      setPermissions(data || []);
    }).catch(() => {}).finally(()=>setLoading(false));
    return ()=>{ mounted=false };
  }, []);

  return (
    <div className="app-container">
      <div className="mt-4 card">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Catálogo de Permisos</h2>
        </div>
        {loading && <div className="text-sm muted">Cargando permisos...</div>}
        {!loading && (
          <div className="mt-3">
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {permissions.map((p:any)=> (
                <li key={p.id} className="p-3 card-soft">
                  <div className="text-sm font-medium text-[var(--wm-5)]">[{p.app_label}] {p.codename}</div>
                  <div className="text-xs muted">{p.name}</div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
