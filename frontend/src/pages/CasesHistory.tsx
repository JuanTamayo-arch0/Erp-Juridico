import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import client from '../services/httpClient';

export default function CasesHistory() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [previous, setPrevious] = useState<string | null>(null);
  const [orderBy, setOrderBy] = useState<'title' | 'left_desc' | 'status'>('left_desc');
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1', 10);

  useEffect(() => {
    (async () => {
      try {
        const res: any = await client.get(`/cases/history/mine/${page ? `?page=${page}` : ''}`);
        const list = res.results || res || [];
        setItems(list);
        setNext(res.next || null);
        setPrevious(res.previous || null);
      } catch (e: any) {
        setError(e?.message || 'Error al cargar historial');
      } finally {
        setLoading(false);
      }
    })();
  }, [page]);

  const sorted = useMemo(() => {
    const arr = [...items];
    if (orderBy === 'title') arr.sort((a,b)=> (a.title||'').localeCompare(b.title||''));
    if (orderBy === 'status') arr.sort((a,b)=> (a.status||'').localeCompare(b.status||''));
    if (orderBy === 'left_desc') arr.sort((a,b)=> new Date(b.left_at||0).getTime() - new Date(a.left_at||0).getTime());
    return arr;
  }, [items, orderBy]);

  return (
    <div className="app-container">
      <div className="mt-4 card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Casos históricos</h2>
        </div>

        {loading && <div className="text-sm muted">Cargando...</div>}
        {error && <div className="text-red-600">{error}</div>}

        {!loading && !error && (
          <>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <label className="text-sm">Ordenar por</label>
              <select className="border rounded px-2 py-1 text-sm" value={orderBy} onChange={(e)=>setOrderBy(e.target.value as any)}>
                <option value="left_desc">Salida (reciente)</option>
                <option value="title">Título</option>
                <option value="status">Estado</option>
              </select>
            </div>
            {(next || previous) && (
              <div className="flex gap-2">
                <button className="px-3 py-1 btn-neutral" onClick={()=> setSearchParams({ page: String(Math.max(1, page-1)) })} disabled={!previous}>Anterior</button>
                <button className="px-3 py-1 btn-neutral" onClick={()=> setSearchParams({ page: String(page+1) })} disabled={!next}>Siguiente</button>
              </div>
            )}
          </div>
          <div className="space-y-2">
            {items.length === 0 && (
              <div className="text-sm muted">No tienes casos históricos</div>
            )}
            {sorted.map((c) => (
              <div key={c.id} className="p-3 card-soft flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-medium text-[var(--wm-5)] truncate">
                    <span className="truncate">{c.title}</span>
                    <span className="px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 text-[10px]">Histórico</span>
                  </div>
                  <div className="text-xs muted">Estado: {c.status || '—'} • Saliste: {c.left_at ? new Date(c.left_at).toLocaleDateString() : '—'}</div>
                </div>
                <Link className="ml-4 shrink-0 link-accent text-sm" to={`/cases/${c.id}`}>Ver</Link>
              </div>
            ))}
          </div>
          </>
        )}
      </div>
    </div>
  );
}
