import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../services/httpClient';
import { useAuth } from '../context/AuthContext';

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigneeScore, setAssigneeScore] = useState<number | null>(null);
  const [assigneeOverCap, setAssigneeOverCap] = useState<boolean>(false);
  const capacityThreshold = 20;
  const { user } = useAuth();

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const us = await client.get('/users/users/');
        if (mounted) setUsers(us.results || us || []);
        // load cases for selection when creating/editing a task
        try {
          const cs = await client.get('/cases/');
          if (mounted) setCases(cs.results || cs || []);
        } catch (e) {
          // ignore
        }
        if (id && id !== 'new') {
          const t = await client.get(`/tasks/${id}/`);
          if (mounted) setTask(t);
        } else {
          if (mounted) setTask({ title: '', description: '', assigned_to: null, due_date: null, status: 'todo', weight: 1 });
        }
      } catch (e) {
        console.error(e);
      } finally { if (mounted) setLoading(false); }
    }
    load();
    return () => { mounted = false; };
  }, [id]);

  // When assigned_to or case changes, fetch workload for that user to warn if high
  useEffect(() => {
    let mounted = true;
    async function checkLoad() {
      try {
        setAssigneeScore(null);
        setAssigneeOverCap(false);
        if (!task || !task.assigned_to) return;
        const query = new URLSearchParams();
        query.set('user', String(task.assigned_to));
        if (task.case) query.set('case', String(task.case));
        const res: any = await client.get(`/tasks/workload/?${query.toString()}`);
        const rows = res || [];
        const row = Array.isArray(rows) ? rows.find((r: any) => String(r.user_id) === String(task.assigned_to)) : null;
        const score = row ? (row.score || 0) : 0;
        if (!mounted) return;
        setAssigneeScore(score);
        setAssigneeOverCap(score >= capacityThreshold);
      } catch (e) {
        if (!mounted) return;
        setAssigneeScore(null);
        setAssigneeOverCap(false);
      }
    }
    checkLoad();
    return () => { mounted = false; };
  }, [task?.assigned_to, task?.case]);

  async function save() {
    try {
      const payload = {
        ...task,
        case: task.case ? Number(task.case) : null,
        assigned_to: task.assigned_to ? Number(task.assigned_to) : null,
        weight: task.weight !== undefined && task.weight !== null ? Number(task.weight) : 1,
      };
      if (id && id !== 'new') {
        await client.put(`/tasks/${id}/`, payload);
      } else {
        await client.post('/tasks/', payload);
      }
      // After saving, go to per-case Kanban if we know the case id
      const cid = payload.case;
      if (cid) navigate(`/tasks?case=${cid}`); else navigate('/tasks');
    } catch (e) { console.error(e); }
  }

  if (loading) return <div className="app-container">Cargando...</div>;

  return (
    <div className="app-container">
      <div className="mt-4 flex justify-center">
        <div className="card w-full max-w-xl">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">{id === 'new' ? 'Crear tarea' : 'Editar tarea'}</h2>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1 btn-neutral"
              onClick={() => {
                const cid = task?.case;
                if (cid) navigate(`/tasks?case=${cid}`); else navigate('/tasks');
              }}
            >Volver</button>
          </div>
        </div>
        <label className="block">Título</label>
        <input
          className="w-full border rounded p-2 bg-white text-[var(--wm-6)] placeholder:text-[var(--wm-3)]"
          value={task.title}
          onChange={(e)=>setTask({...task, title: e.target.value})}
          placeholder="Título de la tarea"
        />
        <label className="block mt-2">Descripción</label>
        <textarea
          className="w-full border rounded p-2 bg-white text-[var(--wm-6)] placeholder:text-[var(--wm-3)]"
          value={task.description}
          onChange={(e)=>setTask({...task, description: e.target.value})}
          placeholder="Detalles o notas (opcional)"
          rows={4}
        />

        <label className="block mt-2">Asignar a</label>
  <select className="w-full border rounded p-2 bg-white text-[var(--wm-6)]" value={task.assigned_to || ''} onChange={(e)=>setTask({...task, assigned_to: e.target.value || null})}>
          <option value="">-- sin responsable --</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.username}</option>
          ))}
        </select>

        {(user && user.roles && user.roles.includes && user.roles.includes('admin')) && (
          <>
            <label className="block mt-2">Peso (puntos)</label>
            <input
              type="number"
              step="0.25"
              min="0"
              className="w-full border rounded p-2 bg-white text-[var(--wm-6)]"
              value={task.weight ?? 1}
              onChange={(e)=> setTask({ ...task, weight: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
            />
            <div className="text-xs text-gray-500 mt-1">Ajusta la importancia de la tarea en la carga de trabajo. Por defecto 1.</div>
          </>
        )}
        {assigneeScore !== null && (
          <div className={`mt-1 text-xs ${assigneeOverCap ? 'text-yellow-700' : 'text-gray-500'}`}>
            Carga estimada del abogado seleccionado: <span className="font-medium">{assigneeScore.toFixed ? assigneeScore.toFixed(2) : assigneeScore}</span> {assigneeOverCap && `(alta ≥ ${capacityThreshold})`}
          </div>
        )}

        <label className="block mt-2">Caso</label>
  <select className="w-full border rounded p-2 bg-white text-[var(--wm-6)]" value={task.case || ''} onChange={(e)=>setTask({...task, case: e.target.value || null})}>
          <option value="">-- sin caso --</option>
          {cases.map(c => (
            <option key={c.id} value={c.id}>{c.title || `Caso ${c.id}`}</option>
          ))}
        </select>

        <label className="block mt-2">Estado</label>
  <select className="w-full border rounded p-2 bg-white text-[var(--wm-6)]" value={task.status} onChange={(e)=>setTask({...task, status: e.target.value})}>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>

        <div className="mt-4 flex gap-2">
          <button className="btn-primary" onClick={save}>Guardar</button>
          <button
            className="px-3 py-1 btn-neutral"
            onClick={() => { const cid = task?.case; if (cid) navigate(`/tasks?case=${cid}`); else navigate('/tasks'); }}
          >Volver</button>
        </div>
        </div>
      </div>
    </div>
  );
}
