import React, { useEffect, useState } from 'react';
import client from '../services/httpClient';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from './ConfirmDialog';

type Props = {
  caseId: string;
  canComment?: boolean;
};

export default function CaseComments({ caseId, canComment = true }: Props) {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [posting, setPosting] = useState(false);
  const [deleting, setDeleting] = useState<Record<number, boolean>>({});

  async function load() {
    setLoading(true);
    try {
      const data: any = await client.get(`/cases/comments/?case=${caseId}`);
      // API may return paginated results or plain list
      const list = data.results || data;
      setComments(list || []);
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!caseId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  async function postComment() {
    setError(null);
    if (!content.trim()) return setError('Escribe un comentario');
    setPosting(true);
    try {
      const payload = { case: Number(caseId), content };
      await client.post('/cases/comments/', payload);
      setContent('');
      await load();
    } catch (err: any) {
      setError(err?.data?.detail || err?.message || String(err));
    } finally {
      setPosting(false);
    }
  }

  const [confirmState, setConfirmState] = useState<null | number>(null);
  async function performDelete(id: number) {
    setDeleting((s) => ({ ...s, [id]: true }));
    try {
      await client.delete(`/cases/comments/${id}/`);
      await load();
    } catch (err: any) {
      setError(err?.data?.detail || err?.message || String(err));
    } finally {
      setDeleting((s) => ({ ...s, [id]: false }));
      setConfirmState(null);
    }
  }

  return (
    <div className="mt-4 card">
      <h4 className="font-medium">Comentarios internos</h4>
      <div className="mt-2">
        {!canComment ? (
          <div className="text-sm muted">No puedes comentar en este caso porque no eres responsable activo o has salido del caso.</div>
        ) : (
          <>
            <textarea
              rows={3}
              className="w-full border rounded p-2"
              placeholder="Escribe una nota interna para el equipo..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <div className="flex items-center gap-2 mt-2">
              <button className="btn-primary disabled:opacity-50" onClick={postComment} disabled={posting}>{posting ? 'Publicando...' : 'Publicar'}</button>
              <button className="px-3 py-1 btn-neutral" onClick={() => setContent('')}>Cancelar</button>
            </div>
            {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
          </>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {loading && <div className="text-sm muted">Cargando comentarios...</div>}
        {!loading && comments.length === 0 && <div className="text-sm muted">No hay comentarios</div>}
        {!loading && comments.map((c) => (
          <div key={c.id} className="p-2 border rounded">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{c.author ? (c.author.username || c.author_display || c.author) : 'Anónimo'}</div>
              <div className="text-xs muted">{new Date(c.created_at).toLocaleString()}</div>
            </div>
            <div className="mt-1 text-sm text-[var(--wm-5)] whitespace-pre-wrap">{c.content}</div>
            <div className="mt-2 flex justify-end">
              {((user && user.id === c.author?.id) || (user?.roles && (user.roles.includes('admin') || user.roles.includes('partner')))) && (
                <button disabled={!!deleting[c.id]} onClick={() => setConfirmState(c.id)} className="btn-danger text-sm">
                  {deleting[c.id] ? 'Eliminando...' : 'Eliminar'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {confirmState !== null && (
        <ConfirmDialog
          title="Confirmar"
          message="¿Eliminar este comentario?"
          variant="danger"
          confirmText="Eliminar"
          cancelText="Cancelar"
          onConfirm={() => performDelete(confirmState)}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
  );
}
