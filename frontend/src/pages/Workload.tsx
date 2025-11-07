import React, { useEffect, useMemo, useState } from 'react';
import http from '../services/httpClient';

type WorkloadItem = {
  user_id: number;
  count: number;
  todo: number;
  in_progress: number;
  done: number;
  user?: {
    id: number;
    username: string;
    name?: string;
    avatar?: string | null;
  } | null;
};

export default function WorkloadPage() {
  const [data, setData] = useState<WorkloadItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [includeDone, setIncludeDone] = useState(false);
  const [cases, setCases] = useState<any[]>([]);
  const [caseId, setCaseId] = useState<string>('');
  const [userId, setUserId] = useState<string>('');

  const load = async (params?: { include_done?: boolean; case?: string; user?: string }) => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (params?.include_done || includeDone) query.set('include_done', '1');
      if (params?.case !== undefined) {
        if (params.case) query.set('case', params.case);
      } else if (caseId) query.set('case', caseId);
      if (params?.user !== undefined) {
        if (params.user) query.set('user', params.user);
      } else if (userId) query.set('user', userId);
      const res = await http.get<WorkloadItem[]>(`/tasks/workload/${query.toString() ? `?${query.toString()}` : ''}`);
      setData(res || []);
    } catch (e) {
      console.error('Failed to load workload', e);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load initial cases for filter
    (async () => {
      try {
        const cs = await http.get<any[]>('/cases/');
        setCases((cs as any).results || (cs as any) || []);
      } catch (e) {}
    })();
    // Initial workload
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeDone]);

  const filtered = useMemo(() => {
    if (!userId) return data;
    return data.filter((it) => String(it.user_id) === String(userId));
  }, [data, userId]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc: any, it: any) => {
        acc.count += it.count || 0;
        acc.todo += it.todo || 0;
        acc.in_progress += it.in_progress || 0;
        acc.done += it.done || 0;
        acc.overdue += (it as any).overdue || 0;
        acc.score += (it as any).score || 0;
        return acc;
      },
      { count: 0, todo: 0, in_progress: 0, done: 0, overdue: 0, score: 0 }
    );
  }, [filtered]);

  // Sugerimos 40 como límite semanal de horas/puntos para abogados.
  const capacityThreshold = 40;

  return (
    <div className="app-container">
      <div className="mt-4 card">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Carga de trabajo</h2>
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={includeDone}
                onChange={(e) => setIncludeDone(e.target.checked)}
              />
              <span>Incluir finalizadas</span>
            </label>
            <button className="px-3 py-1 btn-neutral" onClick={() => load()}>Refrescar</button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium">Caso</label>
            <select
              className="mt-1 w-full border rounded px-2 py-1"
              value={caseId}
              onChange={(e) => { setCaseId(e.target.value); load({ case: e.target.value }); }}
            >
              <option value="">Todos</option>
              {cases.map((c: any) => (
                <option key={c.id} value={String(c.id)}>{c.title || `Caso ${c.id}`}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Usuario</label>
            <select
              className="mt-1 w-full border rounded px-2 py-1"
              value={userId}
              onChange={(e) => { setUserId(e.target.value); load({ user: e.target.value }); }}
            >
              <option value="">Todos</option>
              {/* Build options from current dataset */}
              {data
                .filter((d) => d.user && d.user.id)
                .map((d) => (
                  <option key={d.user!.id} value={String(d.user!.id)}>{d.user!.name || d.user!.username}</option>
                ))}
              {/* Unassigned option */}
              {data.some((d) => !d.user) && <option value="0">Sin asignar</option>}
            </select>
          </div>
          <div className="flex items-end">
            <div className="text-xs muted">Umbral de capacidad: <span className="font-medium">{capacityThreshold}</span></div>
          </div>
        </div>

        {loading ? (
          <div className="mt-4">Cargando…</div>
        ) : (
          <>
            {/* Totals summary */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-5 gap-2">
              <div className="p-3 card-soft"><div className="text-xs muted">Total</div><div className="text-lg font-semibold">{totals.count}</div></div>
              <div className="p-3 card-soft"><div className="text-xs muted">Por hacer</div><div className="text-lg font-semibold">{totals.todo}</div></div>
              <div className="p-3 card-soft"><div className="text-xs muted">En progreso</div><div className="text-lg font-semibold">{totals.in_progress}</div></div>
              <div className="p-3 card-soft"><div className="text-xs muted">Atrasadas</div><div className="text-lg font-semibold">{totals.overdue}</div></div>
              <div className="p-3 card-soft"><div className="text-xs muted">Hechas</div><div className="text-lg font-semibold">{totals.done}</div></div>
            </div>
            <div className="mt-4 overflow-x-auto bg-white/80 backdrop-blur-sm rounded-xl shadow-md">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-b from-white to-blue-50/40 border-b border-blue-900/40">
                <tr className="text-left text-[var(--wm-6)] divide-x divide-blue-900/40">
                  <th className="py-2 px-2">Abogado</th>
                  <th className="text-right py-2 px-2">Por hacer</th>
                  <th className="text-right py-2 px-2">En progreso</th>
                  <th className="text-right py-2 px-2">Atrasadas</th>
                  <th className="text-right py-2 px-2">Hechas</th>
                  <th className="text-right py-2 px-2">Score</th>
                  <th className="text-right py-2 px-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((it) => {
                  const name = it.user ? (it.user.name || it.user.username) : 'Sin asignar';
                  let avatar = it.user?.avatar as string | undefined;
                  if (avatar) {
                    // Always force avatar to explicit backend media path as requested.
                    // Extract filename and rebuild full URL: http://127.0.0.1:8000/media/avatars/<filename>
                    // If already a full /media/avatars/ URL keep it.
                    const hasMediaPrefix = /\/media\/avatars\//.test(avatar);
                    const isFull = /^https?:\/\//.test(avatar) && hasMediaPrefix;
                    if (!isFull) {
                      const filename = avatar.split('/').pop() || avatar;
                      avatar = `http://127.0.0.1:8000/media/avatars/${filename}`;
                    }
                  }
                  const score = (it as any).score || 0;
                  const pct = capacityThreshold > 0 ? score / capacityThreshold : 0;
                  const overCap = pct >= 1;
                  const level: 'normal' | 'warning' | 'danger' = overCap ? 'danger' : (pct >= 0.8 ? 'warning' : 'normal');
                  return (
                    <tr key={it.user_id} className={`${overCap ? 'bg-red-50/40' : (level==='warning' ? 'bg-yellow-50/30' : '')} hover:bg-blue-50/30 border-t border-blue-900/40 divide-x divide-blue-900/40 odd:bg-white even:bg-blue-50/10 transition-colors`}>
                      <td className="px-2 py-2 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="relative" title={name}>
                            {/* Fallback always present; hidden when image loads */}
                            <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-sm shadow-sm" id={`avatar-fallback-${it.user_id}`}
                              style={{ opacity: avatar ? 0 : 1, transition: 'opacity 120ms' }}>
                              {name.charAt(0).toUpperCase()}
                            </div>
                            {avatar && (
                              <img
                                src={avatar}
                                alt=""
                                className="w-9 h-9 rounded-full object-cover shadow-sm relative z-10"
                                onLoad={() => {
                                  const fb = document.getElementById(`avatar-fallback-${it.user_id}`);
                                  if (fb) fb.style.opacity = '0';
                                }}
                                onError={(e) => {
                                  const fb = document.getElementById(`avatar-fallback-${it.user_id}`);
                                  if (fb) fb.style.opacity = '1';
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            )}
                            <span
                              className={`absolute -bottom-1 -right-1 w-4 h-4 text-[10px] text-white rounded-full flex items-center justify-center ${level==='danger' ? 'bg-red-500' : level==='warning' ? 'bg-yellow-500' : 'bg-green-500'}`}
                              title={level==='danger' ? 'Al límite' : level==='warning' ? 'Cerca del límite' : 'Normal'}
                            >
                              {level==='danger' ? '!' : level==='warning' ? '!' : '✓'}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-800 truncate">{name}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-600">{it.count} tareas</span>
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${level==='danger' ? 'bg-red-100 text-red-700' : level==='warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                {level==='danger' ? 'Límite' : level==='warning' ? 'Cerca' : 'Normal'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="text-right px-2 py-2">{it.todo || 0}</td>
                      <td className="text-right px-2 py-2">{it.in_progress || 0}</td>
                      <td className="text-right px-2 py-2">{(it as any).overdue || 0}</td>
                      <td className="text-right px-2 py-2">{it.done || 0}</td>
                      <td className={`text-right px-2 py-2 font-semibold ${overCap ? 'text-red-700' : (level==='warning' ? 'text-yellow-700' : '')}`}>{score.toFixed ? score.toFixed(2) : score}</td>
                      <td className="text-right px-2 py-2 font-semibold">{it.count}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t border-blue-900/40">
                <tr className="divide-x divide-blue-900/40">
                  <th className="py-2 px-2 text-left">Total</th>
                  <th className="text-right py-2 px-2">{totals.todo}</th>
                  <th className="text-right py-2 px-2">{totals.in_progress}</th>
                  <th className="text-right py-2 px-2">{totals.overdue}</th>
                  <th className="text-right py-2 px-2">{totals.done}</th>
                  <th className="text-right py-2 px-2">{(totals.score as any).toFixed ? (totals.score as any).toFixed(2) : totals.score}</th>
                  <th className="text-right py-2 px-2">{totals.count}</th>
                </tr>
              </tfoot>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
