import React, { useEffect, useState } from 'react';
import client from '../services/httpClient';
import { Link } from 'react-router-dom';

export default function DocumentsPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    client.get('/documents/?mine=1').then((data: any) => {
      setDocs(data.results || data || []);
    }).catch(() => setDocs([])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="app-container">
      <div className="mt-4 card">
        <h2 className="text-xl font-semibold">Documentos</h2>
        {loading && <div className="text-sm muted">Cargando...</div>}
        <div className="space-y-2">
          {docs.length === 0 && <div className="text-sm muted">No hay documentos</div>}
          {docs.map((d) => (
            <div key={d.id} className="p-3 card-soft flex justify-between items-center">
              <div>
                <Link to={`/documents/${d.id}`} className="font-medium link-accent">{d.title}</Link>
                <div className="text-xs muted">Subido por: {d.uploaded_by?.username || '—'}</div>
              </div>
              <div>
                <a href={d.url || `/api/documents/${d.id}/presigned/`} target="_blank" rel="noreferrer" className="px-2 py-1 btn-neutral rounded text-sm">Abrir</a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
