import React, { useState } from 'react';
import client from '../services/httpClient';
import { getAccessToken } from '../services/auth';

type Props = {
  caseId?: string | null;
  onUploaded?: (doc: any) => void;
  canUpload?: boolean;
  compact?: boolean;
  mode?: 'compact' | 'tile' | 'default';
};

export default function DocumentUpload({ caseId, onUploaded, canUpload = true, compact = false, mode = 'default' }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(fileArg?: File | null) {
    setError(null);
    const f = fileArg || file;
    if (!f) return setError('Seleccione un archivo');
    setLoading(true);
    try {
      const timestamp = Date.now();
      const safeName = encodeURIComponent(file.name);
      const key = caseId ? `cases/${caseId}/${timestamp}-${safeName}` : `uploads/${timestamp}-${safeName}`;

      // Request presign from backend
      const presign = await client.post('/documents/presign/', { key });
      const { url, fields } = presign as any;

      // Build form data for S3 POST
      const fd = new FormData();
      // include all returned fields
      if (fields && typeof fields === 'object') {
        Object.entries(fields).forEach(([k, v]) => {
          fd.append(k, String(v));
        });
      }
      // S3 expects the file field to be named 'file'
      fd.append('file', file);

      // Direct POST to S3/MinIO endpoint
      const res = await fetch(url, {
        method: 'POST',
        body: fd,
      });

      if (!(res.status >= 200 && res.status < 300)) {
        const text = await res.text();
        throw new Error(`Upload failed: ${res.status} ${text}`);
      }

      // Create Document record in API
      const docPayload: any = {
        title: file.name,
        key,
        url: presign.url ? `${presign.url}/${key.split('/').slice(-2).join('/')}` : '',
        case: caseId || null,
      };

      // If presign returned a direct public url, use it instead
      if (presign.url && (!presign.fields || !presign.fields.key)) {
        docPayload.url = presign.url;
      } else if (presign.url) {
        // Many S3 presign responses use the bucket endpoint; construct the object URL
        // preserve the adapter's url if it points to the bucket root
        docPayload.url = `${presign.url.replace(/\/$/, '')}/${key}`;
      }

      const created = await client.post('/documents/', docPayload);
      setFile(null);
      if (onUploaded) onUploaded(created);
    } catch (err: any) {
        // Try fallback: upload the file to the backend server if direct S3 upload fails
        try {
          const token = getAccessToken();
          const fd = new FormData();
          fd.append('file', file as File);
          fd.append('title', file ? file.name : '');
          if (caseId) fd.append('case', String(caseId));

          const fallbackRes = await fetch('/api/documents/upload_local/', {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            body: fd,
          });

          if (!fallbackRes.ok) {
            const t = await fallbackRes.text();
            throw new Error(`Fallback upload failed: ${fallbackRes.status} ${t}`);
          }

          const created = await fallbackRes.json();
          setFile(null);
          if (onUploaded) onUploaded(created);
          return;
        } catch (fbErr: any) {
          setError(fbErr?.message || String(fbErr));
        }
    } finally {
      setLoading(false);
    }
  }

  // If uploads are disabled
  if (!canUpload) {
    if (mode === 'tile') {
      return (
        <div className="p-3 bg-white rounded border flex flex-col items-center text-center">
          <div className="w-12 h-12 flex items-center justify-center bg-gray-50 rounded mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h6l4 4v7a2 2 0 01-2 2H7a2 2 0 01-2-2V7z" />
            </svg>
          </div>
          <div className="text-sm muted-dark">Subida deshabilitada</div>
        </div>
      );
    }

    return (
      <div className={compact ? 'inline-block' : 'mt-4 p-4 bg-white rounded shadow'}>
        {!compact && <>
          <h4 className="font-medium">Subir documento</h4>
          <div className="mt-2 text-sm muted">No puedes subir documentos a este caso porque no eres responsable activo o ya saliste del caso.</div>
        </>}
        {compact && <div className="text-xs muted">Subida deshabilitada</div>}
      </div>
    );
  }

  // Tile mode: render a card-like upload tile to place inside a grid
  if (mode === 'tile') {
    return (
      <div className="p-3 bg-white rounded border flex flex-col items-center text-center cursor-pointer hover:bg-gray-50 min-h-[160px]">
        <label className="w-full h-full flex flex-col items-center justify-between gap-2 py-3" title="Subir documento">
          <div className="w-12 h-12 flex items-center justify-center bg-gray-50 rounded mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} strokeDasharray="4 2" d="M7 7h6l4 4v7a2 2 0 01-2 2H7a2 2 0 01-2-2V7z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} strokeDasharray="4 2" d="M12 3v6" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} strokeDasharray="4 2" d="M9 12l3 3 3-3" />
            </svg>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center">
            {!file && <div className="text-sm font-medium">Subir</div>}
            {file && (
              <div className="space-y-2">
                <div className="text-sm font-medium truncate w-36 mx-auto" title={file.name}>{file.name}</div>
                <div className="flex items-center gap-2 justify-center">
                  <button onClick={() => handleUpload(file)} disabled={loading} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">{loading ? 'Subiendo...' : 'Confirmar'}</button>
                  <button onClick={() => setFile(null)} className="px-2 py-1 btn-neutral text-sm">Cancelar</button>
                </div>
              </div>
            )}
          </div>

          <input type="file" className="hidden" onChange={(e) => { const f = e.target.files ? e.target.files[0] : null; if (f) { setFile(f); } }} />
        </label>
        {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
      </div>
    );
  }

  // Compact mode inline control
  if (compact) {
    return (
      <div className="inline-block">
        <label className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded cursor-pointer">
          {/* Document outline with dashed stroke to indicate upload */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} strokeDasharray="4 2" d="M7 7h6l4 4v7a2 2 0 01-2 2H7a2 2 0 01-2-2V7z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} strokeDasharray="4 2" d="M12 3v6" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} strokeDasharray="4 2" d="M9 12l3 3 3-3" />
          </svg>
          <input type="file" className="hidden" onChange={(e) => { const f = e.target.files ? e.target.files[0] : null; if (f) { setFile(f); } }} />
        </label>
        <button
          onClick={() => handleUpload()}
          disabled={!file || loading}
          className="ml-2 px-2 py-1 bg-blue-600 text-white rounded disabled:opacity-50 text-sm"
        >
          {loading ? 'Subiendo...' : 'Subir'}
        </button>
        {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
      </div>
    );
  }

  // Default full widget
  return (
    <div className="mt-4 p-4 bg-white rounded shadow">
      <h4 className="font-medium">Subir documento</h4>
      <div className="mt-2 flex items-center gap-2">
        <input type="file" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} />
        <button
          onClick={() => handleUpload()}
          disabled={!file || loading}
          className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Subiendo...' : 'Subir'}
        </button>
      </div>
      {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
    </div>
  );
}
