import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import client from '../services/httpClient';
import { useAuth } from '../context/AuthContext';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import ConfirmDialog from '../components/ConfirmDialog';

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  console.debug('[Tasks] auth user:', user);

  const params = new URLSearchParams(location.search);
  const caseFilter = params.get('case');

  useEffect(() => {
    console.debug('[Tasks] mounted/invoked load(), caseFilter=', caseFilter);
    if (caseFilter) {
      load();
    } else {
      setTasks([]);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  async function load() {
    setLoading(true);
    console.debug('[Tasks] load(): requesting /tasks/ with caseFilter=', caseFilter);
    try {
      if (!caseFilter) return;
      const path = `/tasks/?case=${encodeURIComponent(caseFilter)}`;
      const res: any = await client.get(path);
      console.debug('[Tasks] response body:', res);
      setTasks(res.results || res || []);
    } catch (e) {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }

  const [dialog, setDialog] = useState<null | { message: string; variant?: 'danger' | 'warning' | 'info'; onConfirm: () => void; confirmText?: string; cancelText?: string; extra?: React.ReactNode; busy?: boolean }>(null);

  async function createTask() {
    if (!caseFilter) {
      setDialog({ message: 'Selecciona un caso para crear tareas (abre el tablero desde el detalle del caso).', variant: 'warning', onConfirm: () => setDialog(null), confirmText: 'Cerrar', cancelText: '' });
      return;
    }
    // show dialog with input instead of prompt
    let titleLocal = '';
    setDialog({
      message: 'Nueva tarea',
      variant: 'info',
      confirmText: 'Crear',
      cancelText: 'Cancelar',
      extra: (
        <input
          autoFocus
          className="w-full border rounded px-2 py-1 mt-2"
          placeholder="Título de la tarea"
          onChange={(e) => { titleLocal = e.target.value; }}
        />
      ),
      onConfirm: async () => {
        if (!titleLocal.trim()) { return; }
        setDialog((d) => d ? { ...d, busy: true } : d);
        setLoadingAction(true);
        try {
          const payload: any = { title: titleLocal.trim(), case: Number(caseFilter) };
          await client.post('/tasks/', payload);
          await load();
          setDialog(null);
        } catch (e) {
          setDialog({ message: 'Error creando tarea', variant: 'danger', onConfirm: () => setDialog(null), confirmText: 'Cerrar', cancelText: '' });
        } finally { setLoadingAction(false); }
      }
    });
  }

  async function onDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    const taskId = Number(draggableId);
    const task = tasks.find(t => Number(t.id) === taskId);
    if (!task) return;
    const newStatus = destination.droppableId;
    if (task.status === newStatus) return;

    const prev = tasks;
    const updated = tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
    setTasks(updated);
    try {
      await client.put(`/tasks/${taskId}/`, { ...task, status: newStatus });
    } catch (e) {
      setTasks(prev);
      setDialog({ message: 'Error actualizando tarea en el servidor', variant: 'danger', onConfirm: () => setDialog(null), confirmText: 'Cerrar', cancelText: '' });
    }
  }

  const canCreate = !!user && !!caseFilter;

  return (
    <div className="app-container">
      <div className="mt-4 card">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Tareas</h2>
          <div className="flex items-center gap-2">
            {caseFilter && (
              <button className="px-3 py-1 btn-neutral" onClick={() => navigate(`/cases/${caseFilter}`)}>Volver al caso</button>
            )}
            {canCreate ? (
              <button className="btn-primary" onClick={createTask} disabled={loadingAction}>{loadingAction ? 'Creando...' : 'Crear tarea'}</button>
            ) : (
              <button className="px-3 py-1 border rounded text-sm" onClick={() => navigate('/login')}>Iniciar sesión para crear tareas</button>
            )}
          </div>
        </div>

        {loading && caseFilter && <div className="mt-4">Cargando...</div>}

        {!caseFilter && (
          <div className="mt-4 text-sm">
            Este tablero es por caso. Abre el detalle de un caso y usa el botón "Abrir tablero de tareas" para ver y gestionar sus tareas.
          </div>
        )}

        {!loading && caseFilter && tasks.length === 0 && (
          <div className="mt-4 text-center text-sm muted">No hay tareas disponibles. Usa "Crear tarea" para agregar la primera.</div>
        )}

        {!loading && caseFilter && (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {['todo', 'in_progress', 'done'].map(col => (
                <Droppable droppableId={col} key={col}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className={`p-3 bg-white rounded border min-h-[200px] ${snapshot.isDraggingOver ? 'bg-blue-50' : ''}`}>
                      <div className="font-medium mb-2">{col === 'todo' ? 'To Do' : col === 'in_progress' ? 'In Progress' : 'Done'}</div>
                      <div className="space-y-2">
                        {tasks.filter(t => t.status === col).length === 0 && (
                          <div className="text-sm muted">No hay tareas en esta columna</div>
                        )}

                        {tasks.filter(t => t.status === col).map((t, idx) => (
                          <Draggable draggableId={String(t.id)} index={idx} key={t.id}>
                            {(prov, snap) => (
                              <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps} className={`p-2 border rounded bg-white ${snap.isDragging ? 'shadow' : ''}`}>
                                <div className="font-medium">{t.title}</div>
                                <div className="text-xs muted">{t.description || ''}</div>
                                <div className="text-xs muted">Caso: {t.case ? t.case : '—'}</div>
                                <div className="mt-2 flex items-center gap-2">
                                  <button className="text-sm link-accent" onClick={() => navigate(`/tasks/${t.id}`)}>Abrir</button>
                                  <button className="text-sm text-red-600" onClick={() => {
                                    setDialog({
                                      message: '¿Eliminar tarea?',
                                      variant: 'danger',
                                      confirmText: 'Eliminar',
                                      cancelText: 'Cancelar',
                                      onConfirm: async () => {
                                        try {
                                          await client.delete(`/tasks/${t.id}/`);
                                          await load();
                                        } catch (e) {
                                          setDialog({ message: 'Error eliminando', variant: 'danger', onConfirm: () => setDialog(null), confirmText: 'Cerrar', cancelText: '' });
                                          return;
                                        }
                                        setDialog(null);
                                      }
                                    });
                                  }}>Eliminar</button>
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
      {dialog && (
        <ConfirmDialog
          title={dialog.variant === 'danger' ? 'Error' : dialog.variant === 'warning' ? 'Aviso' : 'Confirmar'}
          message={dialog.message}
          variant={dialog.variant || 'info'}
          confirmText={dialog.confirmText || 'Aceptar'}
          cancelText={dialog.cancelText || ''}
          onConfirm={dialog.onConfirm}
          onCancel={() => setDialog(null)}
          busy={dialog.busy}
          extra={dialog.extra}
        />
      )}
    </div>
  );
}
