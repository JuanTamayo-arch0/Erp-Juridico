import React, { useEffect, useState } from 'react';
import client from '../services/httpClient';
import ConfirmDialog from '../components/ConfirmDialog';

export default function SavedReports() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [filters, setFilters] = useState('');

  async function load() {
    setLoading(true);
    try {
      const data = await client.get('/reports/templates/');
      setTemplates(data.results || data || []);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  }

  useEffect(()=>{ load(); }, []);

  const [dialog, setDialog] = useState<null | { message: string; variant?: 'danger' | 'warning' | 'info'; confirmText?: string; cancelText?: string; onConfirm: () => void }>(null);

  async function createTemplate() {
    try {
      const payload = { name, description, filters: filters ? JSON.parse(filters) : {} };
      await client.post('/reports/templates/', payload);
      setName(''); setDescription(''); setFilters('');
      setCreating(false);
      await load();
    } catch (err:any) {
      console.error(err);
      setDialog({ message: err?.message || 'Error creando plantilla', variant: 'danger', confirmText: 'Cerrar', cancelText: '', onConfirm: () => setDialog(null) });
    }
  }

  async function runTemplate(t:any, fmt?: 'csv'|'xlsx') {
    try {
      const q = new URLSearchParams();
      if (fmt) q.set('format', fmt);
      const url = `/api/reports/templates/${t.id}/run/?${q.toString()}`;
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_access') || ''}` } });
      if (!res.ok) {
        const json = await res.json().catch(()=>null);
        throw new Error(json?.detail || 'Run failed');
      }
      if (fmt) {
        const blob = await res.blob();
        const suffix = fmt === 'csv' ? 'csv' : 'xlsx';
        const a = document.createElement('a');
        const urlBlob = URL.createObjectURL(blob);
        a.href = urlBlob;
        a.download = `${t.name.replace(/\s+/g,'_')}.${suffix}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(urlBlob);
      } else {
        const json = await res.json();
        setDialog({ message: `Se recuperaron ${json.cases?.length || 0} casos`, variant: 'info', confirmText: 'Cerrar', cancelText: '', onConfirm: () => setDialog(null) });
      }
    } catch (e) {
      console.error(e);
      setDialog({ message: 'Error al ejecutar plantilla', variant: 'danger', confirmText: 'Cerrar', cancelText: '', onConfirm: () => setDialog(null) });
    }
  }

  return (
    <div className="app-container">
      <h2 className="text-xl font-semibold">Saved Reports</h2>
  <div className="mt-4 card">
        <div className="flex justify-between items-center">
          <div className="font-medium">Templates</div>
          <div>
            <button className="btn-primary" onClick={()=>setCreating(!creating)}>{creating ? 'Cancel' : 'New template'}</button>
          </div>
        </div>

        {creating && (
          <div className="mt-3 border p-3">
            <div className="grid grid-cols-3 gap-2">
              <input placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} className="border p-2" />
              <input placeholder="Description" value={description} onChange={(e)=>setDescription(e.target.value)} className="border p-2" />
              <textarea placeholder='filters as JSON, e.g. {"status":"open"}' value={filters} onChange={(e)=>setFilters(e.target.value)} className="border p-2" />
            </div>
            <div className="mt-2">
              <button className="btn-primary" onClick={createTemplate}>Create</button>
            </div>
          </div>
        )}

        <div className="mt-4">
          {loading && <div>Loading…</div>}
          <table className="w-full table-auto">
            <thead>
              <tr className="text-left text-sm muted-dark"><th>Name</th><th>Owner</th><th>Filters</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {templates.map(t => (
                <tr key={t.id} className="border-t">
                  <td className="py-2">{t.name}</td>
                  <td className="py-2">{t.owner}</td>
                  <td className="py-2"><pre className="text-xs">{JSON.stringify(t.filters || {}, null, 2)}</pre></td>
                  <td className="py-2">
                    <button className="px-2 py-1 btn-neutral mr-2" onClick={()=>runTemplate(t)}>Run (JSON)</button>
                    <button className="px-2 py-1 btn-neutral" onClick={()=>runTemplate(t,'csv')}>CSV</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
