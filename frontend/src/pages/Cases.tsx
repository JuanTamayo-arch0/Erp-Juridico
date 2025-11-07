import React, { useEffect, useState } from 'react';
import client from '../services/httpClient';
import { useAuth } from '../context/AuthContext';
import { Link, useSearchParams } from 'react-router-dom';

type Case = { id: number; title: string; client_name?: string };

export default function CasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientQuery, setClientQuery] = useState('');
  const [clientSuggestions, setClientSuggestions] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1', 10);
  const [next, setNext] = useState<string | null>(null);
  const [previous, setPrevious] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    client.get(`/cases/?page=${page}`).then((data: any) => {
      if (!data) {
        setCases([]);
        setNext(null);
        setPrevious(null);
        return;
      }
      // DRF paginated response: {count, next, previous, results}
      setCases(data.results || []);
      setNext(data.next || null);
      setPrevious(data.previous || null);
    });
  }, [token, page]);

  async function createCase(e: React.FormEvent) {
    e.preventDefault();
    const payload = { title, client_name: clientName };
    const created = await client.post('/cases/', payload);
    // Refresh current page
    client.get(`/cases/?page=${page}`).then((data: any) => setCases(data.results || []));
    setTitle('');
    setClientName('');
  }

  return (
    <div className="app-container">
      <div className="mt-4 card">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold mb-4">Casos</h2>
          <Link to="/cases" className="text-sm muted-dark" />
        </div>
  <form onSubmit={createCase} className="mb-4">
          <div className="flex gap-2">
            <input className="flex-1 border px-2 py-1 rounded" placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />

            <div className="w-48 relative">
              <input
                className="w-full border px-2 py-1 rounded"
                placeholder="Cliente"
                value={clientQuery || clientName}
                onChange={async (e) => {
                  const q = e.target.value;
                  setClientQuery(q);
                  setSelectedClient(null);
                  setClientName(q);
                  if (!q) { setClientSuggestions([]); return; }
                  try {
                    const res: any = await client.get(`/clients/?search=${encodeURIComponent(q)}`);
                    const list = res.results || res || [];
                    setClientSuggestions(list.slice(0, 8));
                  } catch (err) {
                    setClientSuggestions([]);
                  }
                }}
              />
              {clientSuggestions.length > 0 && (
                <div className="absolute z-10 bg-white border rounded w-full mt-1 max-h-40 overflow-auto">
                  {clientSuggestions.map((c) => (
                    <div key={c.id} className="p-2 hover:bg-gray-50 cursor-pointer" onClick={() => { setSelectedClient(c); setClientName(c.name); setClientQuery(''); setClientSuggestions([]); }}>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs muted">{c.email || ''}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button className="btn-primary" type="submit">Crear</button>
          </div>
        </form>

        <ul className="space-y-2">
          {cases.map((c) => (
            <li key={c.id} className="p-3 card-soft flex items-center justify-between">
              <div>
                <Link to={`/cases/${c.id}`} className="font-medium link-accent">{c.title}</Link>
                <div className="text-sm muted-dark">{c.client_name}</div>
              </div>
              <Link to={`/cases/${c.id}`} className="text-sm link-accent">Ver / Editar</Link>
            </li>
          ))}
        </ul>

        <div className="flex gap-2 mt-4">
          <button
            className="px-3 py-1 btn-neutral"
            onClick={() => setSearchParams({ page: String(Math.max(1, page - 1)) })}
            disabled={!previous}
          >
            Anterior
          </button>
          <button
            className="px-3 py-1 btn-neutral"
            onClick={() => setSearchParams({ page: String(page + 1) })}
            disabled={!next}
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
