import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../services/httpClient';

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [mobile, setMobile] = useState('');
  const [nit, setNit] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [cases, setCases] = useState<any[]>([]);
  const [showOnlyParticipated, setShowOnlyParticipated] = useState(false);

  useEffect(() => {
    if (!id) return;
    client.get(`/clients/${id}/`).then((data) => {
      setItem(data);
      setName(data.name || '');
      setEmail(data.email || '');
      setPhone(data.phone || '');
      setMobile(data.mobile || '');
      setNit(data.nit || '');
      setAddress(data.address || '');
      setNotes(data.notes || '');
    });

    loadCases();
  }, [id]);

  async function loadCases() {
    if (!id) return;
    try {
      const res: any = await client.get(`/clients/${id}/cases/`);
      setCases(res || []);
    } catch (e) {
      setCases([]);
    }
  }

  async function save() {
    if (!id) return;
    await client.put(`/clients/${id}/`, { name, email, phone, mobile, nit, address, notes });
    const data = await client.get(`/clients/${id}/`);
    setItem(data);
    setEditing(false);
  }

  if (!item) return <div className="app-container">Cargando...</div>;

  return (
    <div className="app-container">
      {!editing ? (
        <div className="mt-4 card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-semibold">Detalle del cliente</h3>
              <div className="text-sm px-2 py-1 rounded bg-gray-100 text-gray-600">ID #{item.id}</div>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 btn-neutral" onClick={() => navigate(-1)}>Volver</button>
              <button className="btn-primary" onClick={() => setEditing(!editing)}>{editing ? 'Cancelar' : 'Editar'}</button>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-4">
              <section>
                <h4 className="font-medium text-sm uppercase tracking-wide text-gray-500 mb-2">Información básica</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoField label="Nombre" value={item.name} />
                  <InfoField label="Email" value={item.email} copy />
                  <InfoField label="Teléfono" value={item.phone} />
                  <InfoField label="Celular" value={item.mobile} />
                  <InfoField label="NIT" value={item.nit} />
                  <InfoField label="Dirección" value={item.address} wide />
                </div>
              </section>
              <section>
                <h4 className="font-medium text-sm uppercase tracking-wide text-gray-500 mb-2">Notas</h4>
                {item.notes ? (
                  <div className="rounded border border-dashed p-3 text-sm bg-gray-50 text-gray-700 whitespace-pre-wrap">
                    {item.notes}
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 italic">Sin notas</div>
                )}
              </section>
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm uppercase tracking-wide text-gray-500">Casos</h4>
                  <div className="flex items-center gap-2">
                    <button className="px-2 py-1 btn-neutral text-xs" onClick={() => setShowOnlyParticipated(!showOnlyParticipated)}>{showOnlyParticipated ? 'Todos' : 'Solo participé'}</button>
                    <button className="px-2 py-1 btn-neutral text-xs" onClick={() => loadCases()}>Refrescar</button>
                  </div>
                </div>
                <div className="space-y-2">
                  {(cases || [])
                    .filter(c => showOnlyParticipated ? (c.participated || c.participated_historical) : true)
                    .map(c => {
                      const historical = c.participated_historical && !c.participated;
                      return (
                        <div key={c.id} className="p-3 card-soft flex items-center justify-between">
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate flex items-center gap-2">
                              <span>{c.title}</span>
                              {c.participated && (
                                <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px]">Activo</span>
                              )}
                              {historical && (
                                <span className="px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 text-[10px]" title={c.left_at_for_me ? `Saliste el ${new Date(c.left_at_for_me).toLocaleDateString()}` : ''}>Histórico</span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-500">Estado: {c.status || '—'} • Creado: {c.created_at ? new Date(c.created_at).toLocaleDateString() : ''}</div>
                          </div>
                          <a className="ml-4 shrink-0 link-accent text-xs" href={`/cases/${c.id}`}>Ver</a>
                        </div>
                      );
                    })}
                  {cases.length === 0 && (<div className="text-sm text-gray-400 italic">No hay casos para este cliente</div>)}
                </div>
              </section>
            </div>
            <aside className="space-y-4">
              <div className="rounded-lg border p-4 bg-gradient-to-br from-gray-50 to-white">
                <h4 className="font-medium text-sm text-gray-600 mb-3">Resumen rápido</h4>
                <ul className="text-sm space-y-1 text-gray-700">
                  <li><span className="text-gray-500">Casos totales:</span> {cases.length}</li>
                  <li><span className="text-gray-500">Casos activos:</span> {cases.filter(c=>c.participated).length}</li>
                  <li><span className="text-gray-500">Casos históricos:</span> {cases.filter(c=>!c.participated && c.participated_historical).length}</li>
                  <li><span className="text-gray-500">Participación total (activos + históricos):</span> {cases.filter(c=>c.participated || c.participated_historical).length}</li>
                </ul>
              </div>
            </aside>
          </div>
        </div>
      ) : (
        <div className="mt-4 card">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-[var(--wm-4)]">Nombre</label>
              <input className="mt-1 w-full border rounded px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--wm-4)]">Email</label>
              <input className="mt-1 w-full border rounded px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--wm-4)]">Teléfono</label>
              <input className="mt-1 w-full border rounded px-3 py-2" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--wm-4)]">Celular</label>
              <input className="mt-1 w-full border rounded px-3 py-2" value={mobile} onChange={(e) => setMobile(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--wm-4)]">NIT</label>
              <input className="mt-1 w-full border rounded px-3 py-2" value={nit} onChange={(e) => setNit(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--wm-4)]">Dirección</label>
              <input className="mt-1 w-full border rounded px-3 py-2" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--wm-4)]">Notas</label>
              <textarea className="mt-1 w-full border rounded px-3 py-2" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button className="btn-primary" onClick={save}>Guardar</button>
              <button className="px-3 py-1 btn-neutral" onClick={() => setEditing(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component for read-only fields
const InfoField: React.FC<{ label: string; value?: string; copy?: boolean; wide?: boolean }> = ({ label, value, copy, wide }) => {
  const display = value && value.trim() !== '' ? value : '—';
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <div className="text-[11px] font-medium tracking-wide uppercase text-gray-500 mb-1">{label}</div>
      <div className="flex items-start gap-2">
        <div className="text-sm text-gray-800 break-words">{display}</div>
        {copy && value && (
          <button
            type="button"
            className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
            onClick={() => navigator.clipboard.writeText(value)}
            title="Copiar"
          >Copiar</button>
        )}
      </div>
    </div>
  );
};
