import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import client from '../services/httpClient';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function SearchResults() {
  const q = useQuery().get('q') || '';
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>({ cases: [], documents: [], clients: [] });

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    client.get(`/search/?q=${encodeURIComponent(q)}`).then((data) => {
      setResults({ cases: data.cases || [], documents: data.documents || [], clients: data.clients || [] });
    }).catch(() => setResults({ cases: [], documents: [], clients: [] })).finally(() => setLoading(false));
  }, [q]);

  return (
    <div className="app-container">
      <div className="mt-4 card">
        <h2 className="text-xl font-semibold">Resultados de búsqueda para "{q}"</h2>
        {loading && <div className="text-sm muted">Buscando...</div>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h3 className="font-medium">Casos</h3>
            <div className="mt-2 space-y-2">
              {results.cases.length === 0 && <div className="text-sm muted">No se encontraron casos</div>}
              {results.cases.map((c: any) => (
                <div key={c.id} className="p-2 border rounded">
                  <Link to={`/cases/${c.id}`} className="font-medium link-accent">{c.title}</Link>
                  <div className="text-sm muted-dark">{c.client_name}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-medium">Clientes</h3>
            <div className="mt-2 space-y-2">
              {results.clients.length === 0 && <div className="text-sm muted">No se encontraron clientes</div>}
              {results.clients.map((cl: any) => (
                <div key={cl.id} className="p-2 border rounded">
                  <Link to={`/clients/${cl.id}`} className="font-medium link-accent">{cl.name}</Link>
                  <div className="text-sm muted-dark">{cl.nit || cl.email || ''}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-medium">Documentos</h3>
            <div className="mt-2 space-y-2">
              {results.documents.length === 0 && <div className="text-sm muted">No se encontraron documentos</div>}
              {results.documents.map((d: any) => (
                <div key={d.id} className="p-2 border rounded">
                  <Link to={`/documents/${d.id}`} className="font-medium link-accent">{d.title}</Link>
                  <div className="text-sm muted-dark">Subido por: {d.uploaded_by?.username || '—'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
