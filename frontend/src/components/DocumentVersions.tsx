import React, { useEffect, useState } from 'react';
import client from '../services/httpClient';
import { getAccessToken } from '../services/auth';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from './ConfirmDialog';

type Props = {
  documentId: string;
};

export default function DocumentVersions({ documentId }: Props) {
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [caseId, setCaseId] = useState<string | null>(null);
  const [isCasePrincipal, setIsCasePrincipal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<Record<number, boolean>>({});

  async function load() {
    setLoading(true);
    try {
      const data: any = await client.get(`/documents/versions/?document=${documentId}`);
      const list = data.results || data;
      setVersions(list || []);
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!documentId) return;
    load();
    // also load parent document to determine case and whether current user is principal
    (async () => {
      try {
        const doc: any = await client.get(`/documents/${documentId}/`);
        const cid = doc.case || doc.case_id || null;
        setCaseId(cid);
        if (cid) {
          const c: any = await client.get(`/cases/${cid}/`);
          const p = (c.responsibles || []).find((r: any) => r.role === 'principal' && !r.left_at);
          setIsCasePrincipal(!!p && Number(p.user) === Number(user?.id));
        }
      } catch (e) {
        // ignore
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  async function downloadVersion(v: any) {
    try {
      const token = getAccessToken();
      const res = await fetch(`/api/documents/${v.document}/proxy/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const a = document.createElement('a');
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = v.title || `version-${v.id}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      // fallback to presigned link for the document (latest)
      window.open(`/api/documents/${documentId}/presigned/`, '_blank');
    }
  }

  async function uploadVersion() {
    setError(null);
    if (!file) return setError('Selecciona un archivo');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('document', String(documentId));
      fd.append('file', file);
      // include title
      fd.append('title', file.name);

      const token = getAccessToken();
      const res = await fetch('/api/documents/versions/', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Upload failed: ${res.status} ${t}`);
      }
      setFile(null);
      await load();
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setUploading(false);
    }
  }

  const [confirmState, setConfirmState] = useState<null | { v: any }>(null);
  async function performDelete(v: any) {
    setDeleting((s) => ({ ...s, [v.id]: true }));
    try {
      await client.delete(`/documents/versions/${v.id}/`);
      await load();
    } catch (err: any) {
      setError(err?.data?.detail || err?.message || String(err));
    } finally {
      setDeleting((s) => ({ ...s, [v.id]: false }));
      setConfirmState(null);
    }
  }

  return (
    <div className="mt-4 card">
      <h4 className="font-medium">Versiones del documento</h4>
      <div className="mt-2">
        <div className="flex items-center gap-2">
          <input type="file" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} />
          <button onClick={uploadVersion} className="btn-primary disabled:opacity-50" disabled={uploading}>{uploading ? 'Subiendo...' : 'Subir versión'}</button>
        </div>
        {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
      </div>

      <div className="mt-4 space-y-2">
  {loading && <div className="text-sm muted">Cargando versiones...</div>}
  {!loading && versions.length === 0 && <div className="text-sm muted">No hay versiones</div>}
        {!loading && versions.map((v) => (
          <div key={v.id} className="flex items-center justify-between p-2 border rounded">
            <div>
              <div className="font-medium">{v.title || `Versión ${v.id}`}</div>
              <div className="text-xs muted">Subido: {new Date(v.created_at).toLocaleString()} por {v.uploaded_by_display || (v.uploaded_by && v.uploaded_by.username) || '—'}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => downloadVersion(v)} className="px-2 py-1 btn-neutral">Descargar</button>
              <a href={v.url || `/api/documents/${v.document}/presigned/`} target="_blank" rel="noreferrer" className="px-2 py-1 btn-soft text-sm">Abrir</a>
              {((user?.roles && (user.roles.includes('admin') || user.roles.includes('partner'))) || (user && user.id === v.uploaded_by) || isCasePrincipal) && (
                <button disabled={!!deleting[v.id]} onClick={() => setConfirmState({ v })} className="btn-danger text-sm">{deleting[v.id] ? 'Eliminando...' : 'Eliminar'}</button>
              )}
            </div>
          </div>
        ))}
      </div>
      {confirmState && (
        <ConfirmDialog
          title="Confirmar"
          message={`¿Eliminar la versión "${confirmState.v.title || confirmState.v.id}"?`}
          variant="danger"
          confirmText="Eliminar"
          cancelText="Cancelar"
          onConfirm={() => performDelete(confirmState.v)}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
  );
}
