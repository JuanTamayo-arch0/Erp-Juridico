import React, { useEffect, useState } from 'react';
import client from '../services/httpClient';
import ConfirmDialog from '../components/ConfirmDialog';
import { API_BASE } from '../services/httpClient';

export default function ReportsPage() {
  const [filters, setFilters] = useState({ status: '', process_type: '', client: '', start_date: '', end_date: '' });
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<any>(null);

  async function load() {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      Object.entries(filters).forEach(([k,v]) => { if (v) q.set(k, String(v)); });
      const data = await client.get(`/reports/cases/?${q.toString()}`);
      setCases(data.cases || []);
      setSummary(data.summary || null);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  }

  useEffect(()=>{ load(); }, []);

  const [dialog, setDialog] = useState<null | { message: string; variant?: 'danger' | 'warning' | 'info'; confirmText?: string; cancelText?: string; onConfirm: () => void }>(null);

  async function exportFormat(fmt: 'csv'|'xlsx') {
    const q = new URLSearchParams();
    Object.entries(filters).forEach(([k,v]) => { if (v) q.set(k, String(v)); });
    q.set('format', fmt);
    try {
      const res = await fetch(`${API_BASE}/reports/cases/?${q.toString()}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_access') || ''}` } });
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fmt === 'csv' ? 'cases_report.csv' : 'cases_report.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err:any) {
      // Fallback if server export fails (e.g., 404 from route mismatch): generate CSV client-side
      try {
        if (fmt === 'csv') {
          const qs = new URLSearchParams();
          Object.entries(filters).forEach(([k,v]) => { if (v) qs.set(k, String(v)); });
          const data = await client.get(`/reports/cases/?${qs.toString()}`);
          const rows = (data?.cases || []) as any[];
          const header = ['id','title','client_name','process_type','owner','status','created_at'];
          const csv = [header.join(',')].concat(rows.map((c:any)=>[
            c.id,
            JSON.stringify(c.title || ''),
            JSON.stringify(c.client_name || ''),
            JSON.stringify(c.process_type || ''),
            JSON.stringify(c.owner || ''),
            JSON.stringify(c.status || ''),
            JSON.stringify(c.created_at || ''),
          ].join(','))).join('\n');
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'cases_report.csv';
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        } else {
          setDialog({ message: 'Exportación a Excel no disponible (ruta no encontrada). Intenta CSV.', variant: 'warning', confirmText: 'Cerrar', cancelText: '', onConfirm: () => setDialog(null) });
        }
      } catch (e) {
        console.error(e);
        setDialog({ message: 'Error de exportación', variant: 'danger', confirmText: 'Cerrar', cancelText: '', onConfirm: () => setDialog(null) });
      }
    }
  }

  return (
    <div className="app-container">
      <div className="mt-4 card">
        <h2 className="text-xl font-semibold">Reportes y Consultas</h2>
        <div className="mt-3 p-3 card-soft rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input placeholder="Estado" value={filters.status} onChange={(e)=>setFilters({...filters, status: e.target.value})} className="border px-3 py-2 rounded text-[var(--wm-5)] placeholder:text-[var(--wm-3)]" />
            <input placeholder="Tipo de proceso" value={filters.process_type} onChange={(e)=>setFilters({...filters, process_type: e.target.value})} className="border px-3 py-2 rounded text-[var(--wm-5)] placeholder:text-[var(--wm-3)]" />
            <input placeholder="Cliente" value={filters.client} onChange={(e)=>setFilters({...filters, client: e.target.value})} className="border px-3 py-2 rounded text-[var(--wm-5)] placeholder:text-[var(--wm-3)]" />
            <div className="min-w-0">
              <label className="block text-sm font-medium text-[var(--wm-4)] mb-1">Rango de fechas</label>
              <div className="flex gap-2 min-w-0">
                <input type="date" value={filters.start_date} onChange={(e)=>setFilters({...filters, start_date: e.target.value})} className="border px-3 py-2 rounded text-[var(--wm-5)] flex-1 min-w-0 w-full" />
                <input type="date" value={filters.end_date} onChange={(e)=>setFilters({...filters, end_date: e.target.value})} className="border px-3 py-2 rounded text-[var(--wm-5)] flex-1 min-w-0 w-full" />
              </div>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button className="btn-primary" onClick={load}>Filtrar</button>
            <button className="px-3 py-1 btn-neutral" onClick={()=>exportFormat('csv')}>Exportar CSV</button>
            <button
              className="px-3 py-1 btn-soft"
              onClick={() => { setFilters({ status: '', process_type: '', client: '', start_date: '', end_date: '' }); load(); }}
            >Resetear filtros</button>
          </div>
        </div>

        <div className="mt-4">
          {loading && <div className="text-sm muted">Cargando...</div>}
          {/* Summary widgets removed per request; keep only filters and table */}
          <div className="overflow-x-auto bg-white/80 backdrop-blur-sm rounded-xl shadow-md">
            <table className="w-full table-auto text-sm">
              <thead className="bg-gradient-to-b from-white to-blue-50/40 border-b border-blue-900/40">
                <tr className="text-left text-[var(--wm-6)] divide-x divide-blue-900/40">
                  <th className="py-2 px-2">ID</th>
                  <th className="py-2 px-2">Título</th>
                  <th className="py-2 px-2">Cliente</th>
                  <th className="py-2 px-2">Tipo</th>
                  <th className="py-2 px-2">Estado</th>
                  <th className="py-2 px-2">Responsable</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c:any)=> {
                  const status = (c.status || '').toLowerCase();
                  const chipClass = status === 'open'
                    ? 'bg-blue-100 text-blue-800'
                    : status === 'closed'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-700';
                  return (
                    <tr key={c.id} className="border-t border-blue-900/40 hover:bg-blue-50/30 divide-x divide-blue-900/40 odd:bg-white even:bg-blue-50/10 transition-colors">
                      <td className="py-2 px-2 align-top">{c.id}</td>
                      <td className="py-2 px-2 align-top">{c.title}</td>
                      <td className="py-2 px-2">{c.client_name}</td>
                      <td className="py-2 px-2">{c.process_type}</td>
                      <td className="py-2 px-2">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${chipClass}`}>{c.status}</span>
                      </td>
                      <td className="py-2 px-2">{c.owner ? c.owner : ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {dialog && (
        <ConfirmDialog
          title={dialog.variant === 'danger' ? 'Error' : dialog.variant === 'warning' ? 'Aviso' : 'Confirmar'}
          message={dialog.message}
          variant={dialog.variant || 'info'}
          confirmText={dialog.confirmText || 'Aceptar'}
          cancelText={dialog.cancelText || ''}
          onConfirm={dialog.onConfirm}
          onCancel={() => setDialog(null)}
        />
      )}
    </div>
  );
}
