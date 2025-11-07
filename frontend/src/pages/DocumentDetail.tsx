import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../services/httpClient';
import DocumentVersions from '../components/DocumentVersions';

function looksLikePdf(filename: string | undefined) {
  if (!filename) return false;
  return filename.toLowerCase().endsWith('.pdf');
}

export default function DocumentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    client.get(`/documents/${id}/`).then((data) => setDoc(data));
  }, [id]);

  if (!doc) return <div className="app-container">Cargando...</div>;

  return (
    <div className="app-container">
      <div className="mt-4 card">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Detalle del documento</h2>
          <div className="flex gap-2">
            <button className="px-3 py-1 btn-neutral" onClick={() => navigate(-1)}>Volver</button>
          </div>
        </div>

        <h3 className="font-medium text-lg">{doc.title}</h3>
        <div className="text-sm muted-dark">Subido por: {doc.uploaded_by ? doc.uploaded_by.username : '—'}</div>
        <div className="mt-2">
          <div className="flex items-center gap-2">
            <a href={`/api/documents/${id}/presigned/`} target="_blank" rel="noreferrer" className="px-3 py-1 bg-blue-600 text-white rounded">Abrir documento</a>
          </div>
        </div>

        <DocumentVersions documentId={String(id)} />
      </div>
    </div>
  );
}
