import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../services/httpClient';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import ConfirmDialog from '../components/ConfirmDialog';

const STATUSES: { id: string; label: string }[] = [
  { id: 'open', label: 'Open' },
  { id: 'closed', label: 'Closed' },
  { id: 'archived', label: 'Archived' },
];

export default function CasesKanban() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<null | { message: string; action: () => void; variant?: 'danger' | 'warning' | 'info'; }>(null);
  const navigate = useNavigate();

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      // attempt to fetch a reasonable page of cases; backend is paginated
  const res: any = await client.get('/cases/?page=1&include_closed=1');
      const list = res.results || res || [];
      setCases(list);
    } catch (e) {
      setCases([]);
    } finally {
      setLoading(false);
    }
  }

  async function onDragEnd(result: DropResult) {
    const { destination, draggableId } = result;
    if (!destination) return;
    const caseId = Number(draggableId);
    const c = cases.find((x) => Number(x.id) === caseId);
    if (!c) return;
    const newStatus = destination.droppableId;
    if (c.status === newStatus) return;

    const prev = cases;
    const updated = cases.map((x) => (Number(x.id) === caseId ? { ...x, status: newStatus } : x));
    setCases(updated);
    try {
      await client.put(`/cases/${caseId}/`, { ...c, status: newStatus });
    } catch (err: any) {
      setCases(prev);
      if (err && err.status === 403) {
        setDialog({ message: 'Solo el líder del caso o un administrador pueden cambiar el estado.', action: () => setDialog(null), variant: 'warning' });
      } else {
        setDialog({ message: 'Error actualizando el estado del caso en el servidor', action: () => setDialog(null), variant: 'danger' });
      }
    }
  }

  const grouped = STATUSES.reduce((acc: Record<string, any[]>, s) => {
    acc[s.id] = cases.filter((c) => c.status === s.id);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="app-container">
      <div className="mt-4 card">
        {dialog && (
          <ConfirmDialog
            title={dialog.variant === 'danger' ? 'Error' : 'Aviso'}
            message={dialog.message}
            confirmText="Cerrar"
            cancelText=""
            variant={dialog.variant || 'info'}
            onConfirm={() => dialog.action()}
            onCancel={() => dialog.action()}
          />
        )}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Tablero de Casos</h2>
          <div>
            <button className="px-3 py-1 btn-neutral" onClick={() => navigate('/cases')}>Ver lista de casos</button>
            <button className="ml-2 btn-primary" onClick={() => load()}>Refrescar</button>
          </div>
        </div>

        {loading && <div className="mt-4">Cargando casos...</div>}

        {!loading && (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {STATUSES.map((s) => (
                <Droppable droppableId={s.id} key={s.id}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className={`p-3 bg-white rounded border min-h-[200px] ${snapshot.isDraggingOver ? 'bg-blue-50' : ''}`}>
                      <div className="font-medium mb-2">{s.label}</div>
                      <div className="space-y-2">
                        {grouped[s.id] && grouped[s.id].length === 0 && (
                          <div className="text-sm muted">No hay casos en esta columna</div>
                        )}

                        {grouped[s.id] && grouped[s.id].map((c: any, idx: number) => (
                          <Draggable draggableId={String(c.id)} index={idx} key={c.id}>
                            {(prov, snap) => (
                              <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps} className={`p-2 border rounded bg-white ${snap.isDragging ? 'shadow' : ''}`}>
                                <div className="font-medium truncate">{c.title}</div>
                                <div className="text-xs muted">Cliente: {c.client_name || '—'}</div>
                                <div className="text-xs muted">Propietario: {c.owner_display || c.owner || '—'}</div>
                                <div className="mt-2 flex items-center gap-2">
                                  <button className="text-sm link-accent" onClick={() => navigate(`/cases/${c.id}`)}>Abrir</button>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}

                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              ))}
            </div>
          </DragDropContext>
        )}
      </div>
    </div>
  );
}
