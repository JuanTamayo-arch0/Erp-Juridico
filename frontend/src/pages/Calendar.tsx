import React, { useEffect, useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import type { DateSelectArg, EventClickArg, EventChangeArg, EventContentArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import client from '../services/httpClient';
import ConfirmDialog from '../components/ConfirmDialog';
import Card from '../components/Card';
import { useAuth } from '../context/AuthContext';

export default function CalendarPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [onlyMine, setOnlyMine] = useState<boolean>(true);
  const [caseFilter, setCaseFilter] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<null | { message: string; onConfirm: () => void; variant?: 'danger' }>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '', start: '', end: '', remind_at: '', case: '', assignee: '' });
  const calendarRef = useRef<FullCalendar | null>(null);

  useEffect(() => {
    fetchEvents();
    // preload cases and users for selectors
    (async () => {
      try {
        const cs = await client.get('/cases/?include_closed=1');
        setCases((cs as any).results || (cs as any) || []);
      } catch (e) {}
      try {
        const us = await client.get('/users/users/');
        setUsers((us as any).results || (us as any) || []);
      } catch (e) {
        setUsers([]);
      }
    })();
  }, []);

  async function fetchEvents() {
    try {
      const params = new URLSearchParams();
      if (onlyMine) params.set('mine', '1');
      if (caseFilter) params.set('case', caseFilter);
      const data = await client.get(`/events/?${params.toString()}`);
      const list = data.results || data || [];
      // map to FullCalendar event shape with enriched props
      const mapped = list.map((e: any) => ({
        id: e.id.toString(),
        title: e.title,
        start: e.start,
        end: e.end,
        backgroundColor: computeColor(e),
        textColor: '#111827',
        extendedProps: {
          case: e.case || null,
          assignee: e.assignee || null,
          created_by: e.created_by || null,
          remind_at: e.remind_at || null,
          description: e.description || '',
          type: e.type || 'otro',
        }
      }));
      setEvents(mapped);
    } catch (e) {
      console.error(e);
    }
  }

  function computeColor(e: any): string {
    // urgency: overdue -> red; within 48h -> orange; else by type
    const now = new Date();
    const start = e.start ? new Date(e.start) : null;
    const end = e.end ? new Date(e.end) : null;
    const due = end || start;
    if (due) {
      if (due < now) return '#ef4444'; // red-500
      const diff = (due.getTime() - now.getTime()) / 3600000; // hours
      if (diff <= 48) return '#f59e0b'; // amber-500
    }
    switch (e.type) {
      case 'audiencia': return '#3b82f6'; // blue-500
      case 'plazo': return '#10b981'; // emerald-500
      case 'tarea': return '#8b5cf6'; // violet-500
      default: return '#6b7280'; // gray-500
    }
  }

  function openCreate(dateStr?: string) {
    setSelectedDate(dateStr || null);
    setEditingId(null);
    setForm({ title: '', description: '', start: dateStr ? `${dateStr}` : '', end: '', remind_at: '', case: caseFilter || '', assignee: String(user?.id || '') });
    setModalOpen(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload: any = {
        title: form.title,
        description: form.description || '',
        start: form.start,
        end: form.end || null,
        remind_at: form.remind_at || null,
        case: form.case ? Number(form.case) : null,
        assignee: form.assignee ? Number(form.assignee) : null,
        type: (form as any).type || 'otro'
      };
      if (editingId) {
        await client.put(`/events/${editingId}/`, payload);
      } else {
        await client.post('/events/', payload);
      }
      setModalOpen(false);
      setEditingId(null);
      fetchEvents();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleEventDrop(change: EventChangeArg) {
    const ev = change.event;
    try {
      await client.put(`/events/${ev.id}/`, { title: ev.title, start: ev.start?.toISOString(), end: ev.end?.toISOString() || null });
      fetchEvents();
    } catch (err) {
      console.error(err);
    }
  }

  function handleDateSelect(selectInfo: DateSelectArg) {
    openCreate(selectInfo.startStr);
  }

  async function handleEventClick(clickInfo: EventClickArg) {
    const ev = clickInfo.event;
    setEditingId(Number(ev.id));
    setForm({
      title: ev.title || '',
      description: (ev.extendedProps as any)?.description || '',
      start: ev.start ? ev.start.toISOString().slice(0,16) : '',
      end: ev.end ? ev.end.toISOString().slice(0,16) : '',
      remind_at: (ev.extendedProps as any)?.remind_at || '',
      case: String((ev.extendedProps as any)?.case || ''),
      assignee: String((ev.extendedProps as any)?.assignee || ''),
    });
    setModalOpen(true);
  }

  const caseMap = useMemo(() => {
    const m: Record<string,string> = {};
    (cases || []).forEach((c: any) => { m[String(c.id)] = c.title || `Caso ${c.id}`; });
    return m;
  }, [cases]);

  const filteredEvents = useMemo(() => {
    return events.filter((e: any) => {
      if (onlyMine && user) {
        const a = e.extendedProps?.assignee;
        const cb = e.extendedProps?.created_by;
        if (String(a || cb) !== String(user.id)) return false;
      }
      if (caseFilter) {
        if (String(e.extendedProps?.case || '') !== String(caseFilter)) return false;
      }
      return true;
    });
  }, [events, onlyMine, caseFilter, user]);

  function renderEventContent(arg: EventContentArg) {
    const cId = String((arg.event.extendedProps as any)?.case || '');
    const cTitle = cId ? caseMap[cId] : '';
    const bg = (arg.event as any).backgroundColor || '#6b7280';
    return (
      <div className="flex items-start gap-2">
        <span className="mt-[3px] inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: bg }} />
        <div className="min-w-0">
          <div className="font-medium text-[13px] truncate">{arg.event.title}</div>
          {cTitle && <div className="text-[11px] text-gray-600 truncate">{cTitle}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">

      <div className="mt-4">
        <Card>
          <div className="flex flex-col gap-2 mb-2">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Agenda</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => openCreate()} className="btn-soft">Crear evento</button>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" className="checkbox checkbox-sm" checked={onlyMine} onChange={(e)=>{ setOnlyMine(e.target.checked); setTimeout(()=>fetchEvents(), 0); }} />
                  <span>Solo mis eventos</span>
                </label>
                <div>
                  <select className="border rounded px-2 py-1" value={caseFilter} onChange={(e)=>{ setCaseFilter(e.target.value); setTimeout(()=>fetchEvents(), 0); }}>
                    <option value="">Todos los casos</option>
                    {cases.map((c:any)=> (
                      <option key={c.id} value={String(c.id)}>{c.title || `Caso ${c.id}`}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin, timeGridPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
            events={filteredEvents}
            selectable={true}
            select={handleDateSelect}
            eventDrop={handleEventDrop}
            eventClick={handleEventClick}
            eventContent={renderEventContent}
            eventTextColor="#111827"
            ref={calendarRef as any}
          />
        </Card>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="w-full max-w-md p-4 bg-[var(--card-surface)] rounded">
            <h3 className="font-medium mb-2">{editingId ? 'Editar evento' : 'Crear evento'}</h3>
            <form onSubmit={handleCreate} className="space-y-2">
              <input required className="w-full border rounded px-2 py-1 text-gray-900" placeholder="Título" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} />
              <textarea className="w-full border rounded px-2 py-1 text-gray-900" placeholder="Descripción (opcional)" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} />
              <label className="text-xs muted">Start</label>
              <input required type="datetime-local" className="w-full border rounded px-2 py-1 text-gray-900" value={form.start} onChange={(e) => setForm({...form, start: e.target.value})} />
              <label className="text-xs muted">End</label>
              <input type="datetime-local" className="w-full border rounded px-2 py-1 text-gray-900" value={form.end} onChange={(e) => setForm({...form, end: e.target.value})} />
              <label className="text-xs muted">Remind at</label>
              <input type="datetime-local" className="w-full border rounded px-2 py-1 text-gray-900" value={form.remind_at} onChange={(e) => setForm({...form, remind_at: e.target.value})} />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs muted">Tipo</label>
                  <select className="w-full border rounded px-2 py-1 text-gray-900" value={(form as any).type || 'otro'} onChange={(e)=>{
                    const type = e.target.value;
                    setForm((prev:any)=>{
                      // default durations if end empty
                      let end = prev.end;
                      if (!end && prev.start) {
                        const start = new Date(prev.start);
                        if (type === 'audiencia') {
                          const d = new Date(start.getTime() + 2*60*60*1000);
                          end = d.toISOString().slice(0,16);
                        } else if (type === 'tarea') {
                          const d = new Date(start.getTime() + 60*60*1000);
                          end = d.toISOString().slice(0,16);
                        }
                      }
                      return { ...prev, type, end };
                    });
                  }}>
                    <option value="audiencia">Audiencia</option>
                    <option value="plazo">Plazo</option>
                    <option value="tarea">Tarea</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs muted">Caso</label>
                  <select className="w-full border rounded px-2 py-1 text-gray-900" value={form.case} onChange={(e)=>setForm({...form, case: e.target.value})}>
                    <option value="">Sin caso</option>
                    {cases.map((c:any)=> (
                      <option key={c.id} value={String(c.id)}>{c.title || `Caso ${c.id}`}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs muted">Asignado a</label>
                  <select className="w-full border rounded px-2 py-1 text-gray-900" value={form.assignee} onChange={(e)=>setForm({...form, assignee: e.target.value})}>
                    <option value="">Sin asignar</option>
                    {users.map((u:any)=> (
                      <option key={u.id} value={String(u.id)}>{u.first_name || u.last_name ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : (u.username || u.email)}</option>
                    ))}
                  </select>
                </div>
              </div>
              {form.case && (
                <div className="text-right">
                  <a className="link-accent text-sm" href={`/cases/${form.case}`} target="_blank" rel="noreferrer">Ver caso</a>
                </div>
              )}
              <div className="flex justify-between items-center mt-2">
                <button type="button" onClick={() => { setModalOpen(false); setEditingId(null); }} className="px-3 py-1 btn-neutral">Cancelar</button>
                <div className="flex gap-2">
                  {editingId && (
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => {
                        if (!editingId) return;
                        setConfirmState({
                          message: '¿Eliminar evento?',
                          variant: 'danger',
                          onConfirm: async () => {
                            try {
                              await client.delete(`/events/${editingId}/`);
                              setModalOpen(false);
                              setEditingId(null);
                              fetchEvents();
                            } catch (e) {
                              // swallow
                            } finally {
                              setConfirmState(null);
                            }
                          }
                        });
                      }}
                    >Eliminar</button>
                  )}
                  <button type="submit" className="btn-primary">{editingId ? 'Guardar' : 'Crear'}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {confirmState && (
        <ConfirmDialog
          title="Confirmar"
          message={confirmState.message}
          confirmText="Eliminar"
          cancelText="Cancelar"
          variant={confirmState.variant || 'info'}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
  );
}
