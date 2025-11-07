import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import client from '../services/httpClient';
import DocumentUpload from '../components/DocumentUpload';
import CaseComments from '../components/CaseComments';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';

export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<any | null>(null);
  const [loadError, setLoadError] = useState<null | { status?: number; message?: string }>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [processType, setProcessType] = useState('');

  // responsibles & user search
  const [userQuery, setUserQuery] = useState('');
  const [userSuggestions, setUserSuggestions] = useState<any[]>([]);
  const [assignRole, setAssignRole] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferTarget, setTransferTarget] = useState<string>('');

  // activity / actuaciones
  const [activity, setActivity] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [activityFilter, setActivityFilter] = useState<'all' | 'actuacion' | 'audit'>('all');
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [actActionType, setActActionType] = useState('');
  const [actDetails, setActDetails] = useState('');
  const [loadingAct, setLoadingAct] = useState(false);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [confirmState, setConfirmState] = useState<null | { message: string; onConfirm: () => void; variant?: 'danger' | 'warning' | 'info' }>(null);
  const [showResponsibles, setShowResponsibles] = useState(true);

  useEffect(() => {
    if (!id) return;
    console.debug('[CaseDetail] mounted for id=', id);
    // load case and embedded relations
    client
      .get(`/cases/${id}/`)
      .then((data) => {
        setItem(data);
        setTitle(data.title || '');
        setClientName(data.client_name || '');
        setProcessType(data.process_type || '');
        setDocuments(data.documents || []);
        setLoadError(null);
      })
      .catch((err: any) => {
        setItem(null);
        const status = err?.status;
        if (status === 403) setLoadError({ status, message: 'No estás autorizado para ver este caso.' });
        else if (status === 404) setLoadError({ status, message: 'Caso no encontrado o no tienes acceso.' });
        else setLoadError({ status, message: 'No se pudo cargar el caso.' });
      });

    // separately ensure documents list exists
    client
      .get(`/documents/?case=${id}`)
      .then((d: any) => {
        const list = d.results || d || [];
        setDocuments((prev) => (prev && prev.length ? prev : list));
      })
      .catch(() => {});

    // load unified activity feed
    loadActivity();
    console.debug('[CaseDetail] invoking loadTasks() for case', id);
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadTasks() {
    if (!id) return;
    setLoadingTasks(true);
    console.debug('[CaseDetail] loadTasks(): requesting /tasks/?case=' + id);
    try {
      const res: any = await client.get(`/tasks/?case=${id}`);
      const list = res.results || res || [];
      setTasks(list);
    } catch (err) {
      setTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  }

  async function loadActivity() {
    if (!id) return;
    setLoadingActivity(true);
    try {
      const res: any = await client.get(`/cases/${id}/activity/`);
      setActivity(res || []);
    } catch (err) {
      setActivity([]);
    } finally {
      setLoadingActivity(false);
    }
  }

  async function save() {
    if (!id) return;
    await client.put(`/cases/${id}/`, { title, client_name: clientName, process_type: processType });
    const data = await client.get(`/cases/${id}/`);
    setItem(data);
    setEditing(false);
  }

  if (!item) {
    return (
      <div className="app-container">
        <div className="mt-4 card">
          {!loadError && <div>Cargando...</div>}
          {loadError && (
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">{loadError.status === 403 ? 'Acceso restringido' : loadError.status === 404 ? 'No encontrado' : 'Error'}</h3>
              <div className="text-sm muted-dark">{loadError.message || 'Ocurrió un error cargando el caso.'}</div>
              <div className="flex items-center gap-2 mt-2">
                <button className="px-3 py-1 btn-neutral" onClick={() => navigate(-1)}>Volver</button>
                <button className="btn-primary" onClick={() => window.location.reload()}>Reintentar</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const isResponsibleActive = (() => {
    if (!user || !item?.responsibles) return false;
    return item.responsibles.some((r: any) => Number(r.user) === Number(user.id) && !r.left_at);
  })();

  const isCurrentUserPrincipal = (() => {
    if (!user || !item?.responsibles) return false;
    const p = item.responsibles.find((r: any) => r.role === 'principal' && !r.left_at);
    return !!p && Number(p.user) === Number(user.id);
  })();

  return (
    <div className="app-container">

      {!editing ? (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-semibold">{editing ? 'Editar Caso' : 'Detalle del Caso'}</h2>
                <div className="flex gap-2">
                  {!editing && (
                    <button className="px-3 py-1 btn-neutral" onClick={() => navigate(`/tasks?case=${id}`)}>
                      Tablero tareas
                    </button>
                  )}
                  <button className="px-3 py-1 btn-neutral" onClick={() => navigate(-1)}>
                    Volver
                  </button>
                  <button
                    className="btn-primary"
                    onClick={() => setEditing(!editing)}
                  >
                    {editing ? 'Cancelar' : 'Editar'}
                  </button>
                </div>
              </div>

              <h3 className="font-medium text-lg">{item.title}</h3>
              <div className="text-sm muted-dark">Cliente: {item.client_name}</div>
              <div className="text-sm muted-dark">Tipo de proceso: {item.process_type || '—'}</div>
              <p className="mt-2">{item.description}</p>

              {/* Documentos */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Documentos</h4>
                  <div className="flex items-center gap-2">
                    {/* removed old compact upload button: upload action moved into the grid as a tile */}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {isResponsibleActive && (
                    <div key="upload-tile">
                      <DocumentUpload
                        caseId={String(item.id)}
                        onUploaded={(doc:any) => {
                          setDocuments((prev)=>[doc, ...prev]);
                        }}
                        canUpload={isResponsibleActive}
                        mode="tile"
                      />
                    </div>
                  )}
                  {documents.length === 0 && (
                    <div className="text-sm muted-dark">No hay documentos</div>
                  )}

                  {documents.map((doc) => (
                    <div key={doc.id} className="p-3 bg-white rounded border flex flex-col items-center text-center">
                      <div className="w-12 h-12 flex items-center justify-center bg-gray-50 rounded mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h6l4 4v7a2 2 0 01-2 2H7a2 2 0 01-2-2V7z" />
                        </svg>
                      </div>
                      <div className="text-sm font-medium truncate w-full" title={doc.title}>{doc.title}</div>
                      <div className="text-xs muted mt-1 truncate w-full" title={doc.uploaded_by ? doc.uploaded_by.username : ''}>Subido por: {doc.uploaded_by ? doc.uploaded_by.username : '—'}</div>

                      <div className="mt-3 flex items-center gap-2">
                        <Link to={`/documents/${doc.id}`} className="p-2 bg-gray-100 rounded" title="Ver">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>

                        <a href={`/api/documents/${doc.id}/presigned/`} target="_blank" rel="noreferrer" className="p-2 bg-gray-100 rounded" title="Descargar">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                          </svg>
                        </a>

                        {(isResponsibleActive || (user && user.roles && user.roles.includes && user.roles.includes('admin'))) && (
                          <button
                            className="p-2 bg-red-50 rounded"
                            title="Eliminar"
                            onClick={() => {
                              setConfirmState({
                                message: '¿Eliminar este documento? Esta acción no se puede deshacer.',
                                variant: 'danger',
                                onConfirm: async () => {
                                  try {
                                    await client.delete(`/documents/${doc.id}/`);
                                    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
                                  } catch (e) {
                                    // show error
                                  }
                                  setConfirmState(null);
                                }
                              });
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 001 1h6a1 1 0 001-1m-8 0V6a2 2 0 012-2h2a2 2 0 012 2v1" />
                            </svg>
                          </button>
                        )}

                      </div>
                    </div>
                  ))}
                </div>
              </div>

                {/* Tasks: moved to global /tasks board. Provide a button to open the full board filtered to this case */}
                <div className="mt-6">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Tareas</h4>
                    <div>
                      <button
                        onClick={() => navigate(`/tasks?case=${id}`)}
                        className="btn-primary"
                      >Abrir tablero de tareas</button>
                    </div>
                  </div>

                  {loadingTasks && <div className="mt-2">Cargando tareas...</div>}

                  {!loadingTasks && (
                    <div className="mt-2 text-sm muted">
                      {tasks.length > 0 ? `Este caso tiene ${tasks.length} tareas. Abre el tablero para gestionarlas.` : 'No hay tareas asociadas a este caso. Puedes crearlas desde el tablero de tareas.'}
                    </div>
                  )}
                </div>

              <CaseComments caseId={String(item.id)} canComment={isResponsibleActive} />

              {/* Actividad */}
            </div>
          </div>

          <div className="md:col-span-1">
            <div className="card">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Responsables</h4>
                <button className="px-2 py-1 btn-soft text-sm" onClick={()=>setShowResponsibles(v=>!v)}>{showResponsibles ? 'Ocultar' : 'Mostrar'}</button>
              </div>
              {showResponsibles && (
              <div className="mt-2 space-y-2">
                {(item.responsibles || []).length === 0 && (
                  <div className="text-sm muted-dark">No hay responsables asignados</div>
                )}

                {(item.responsibles || []).map((r: any) => (
                  <div key={r.id} className="list-compact-item flex items-center justify-between">
                    <div>
                      <div className="font-medium">{r.user_display || r.user || `Usuario ${r.user}`}
                        {r.role === 'principal' && !r.left_at && (
                          <span className="ml-2 inline-block px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">Principal</span>
                        )}
                      </div>
                      <div className="muted-xs">{r.role || '—'}</div>
                    </div>
                    <div>
                      {user && Number(user.id) === Number(r.user) && !r.left_at && (
                        <button
                          onClick={() => {
                            if (!id) return;
                            setConfirmState({
                              message: '¿Seguro que quieres salir de este caso?',
                              variant: 'warning',
                              onConfirm: async () => {
                                try {
                                  await client.post(`/cases/${id}/leave/`);
                                  const d = await client.get(`/cases/${id}/`);
                                  setItem(d);
                                  await loadActivity();
                                } catch (e) {
                                  setConfirmState({ message: 'Error al salir del caso', onConfirm: () => setConfirmState(null), variant: 'danger' });
                                  return;
                                }
                                setConfirmState(null);
                              }
                            });
                          }}
                          className="px-2 py-1 bg-yellow-500 text-white rounded text-sm"
                        >Salir</button>
                      )}

                      {/* Remove button for principals / admins to remove other responsibles */}
                      {(isCurrentUserPrincipal || (user && user.roles && user.roles.includes && user.roles.includes('admin'))) && Number(user.id) !== Number(r.user) && !r.left_at && (
                        <button
                          onClick={() => {
                            if (!id) return;
                            setConfirmState({
                              message: '¿Seguro que quieres remover a este responsable del caso?',
                              variant: 'danger',
                              onConfirm: async () => {
                                try {
                                  await client.post(`/cases/${id}/remove-responsible/`, { user: Number(r.user) });
                                  const d = await client.get(`/cases/${id}/`);
                                  setItem(d);
                                  await loadActivity();
                                } catch (e) {
                                  setConfirmState({ message: 'Error al remover responsable', onConfirm: () => setConfirmState(null), variant: 'danger' });
                                  return;
                                }
                                setConfirmState(null);
                              }
                            });
                          }}
                          className="ml-2 btn-danger text-sm"
                        >Remover</button>
                      )}
                    </div>
                  </div>
                ))}

                <div className="mt-2">
                  <h5 className="font-medium">Asignar responsable</h5>
                  <div className="mt-2">
                    <input
                      value={userQuery}
                      onChange={async (e) => {
                        const q = e.target.value;
                        setUserQuery(q);
                        if (!q) {
                          setUserSuggestions([]);
                          return;
                        }
                        try {
                          const res: any = await client.get(`/users/users/?search=${encodeURIComponent(q)}`);
                          const list = res.results || res || [];
                          setUserSuggestions(list.slice(0, 10));
                        } catch (err) {
                          try {
                            const res: any = await client.get('/users/users/');
                            const list = res.results || res || [];
                            setUserSuggestions(
                              list
                                .filter((u: any) => (u.username || u.email || u.get_full_name || '').toLowerCase().includes(q.toLowerCase()))
                                .slice(0, 10)
                            );
                          } catch (e) {
                            setUserSuggestions([]);
                          }
                        }
                      }}
                      className="w-full border rounded px-2 py-1"
                      placeholder="Buscar usuario..."
                    />
                    <div className="mt-1 bg-white border rounded max-h-40 overflow-auto">
                      {userSuggestions.map((u) => (
                        <div key={u.id} className="p-2 hover:bg-gray-50 cursor-pointer" onClick={() => { setSelectedUser(u); setUserQuery(u.get_full_name || u.username || u.email || String(u.id)); setUserSuggestions([]); }}>
                          <div className="font-medium">{u.get_full_name || u.username || u.email}</div>
                          <div className="text-xs muted">{u.email}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <select
                        value={assignRole}
                        onChange={(e) => setAssignRole(e.target.value)}
                        className="flex-1 border rounded px-2 py-1"
                      >
                        <option value="">Miembro</option>
                        <option value="principal">Líder (Principal)</option>
                        <option value="abogado">Abogado</option>
                        <option value="auxiliar">Auxiliar</option>
                      </select>
                      <button
                        onClick={async () => {
                          if (!id) return;
                          if (!selectedUser) {
                            setConfirmState({ message: 'Selecciona un usuario de la lista', onConfirm: () => setConfirmState(null), variant: 'warning' });
                            return;
                          }
                          // if trying to assign principal, do a quick UI-level check
                          if (assignRole === 'principal' && !(isCurrentUserPrincipal || (user && user.roles && user.roles.includes && user.roles.includes('admin')))) {
                            setConfirmState({ message: 'Solo el actual principal o administradores pueden asignar un nuevo principal', onConfirm: () => setConfirmState(null), variant: 'warning' });
                            return;
                          }
                          setAssignLoading(true);
                          try {
                            await client.post(`/cases/${id}/assign-responsible/`, { user: Number(selectedUser.id), role: assignRole });
                            const d = await client.get(`/cases/${id}/`);
                            setItem(d);
                            setUserQuery('');
                            setSelectedUser(null);
                            setAssignRole('');
                            await loadActivity();
                          } catch (err) {
                            setConfirmState({ message: 'Error al asignar: ' + (err?.message || String(err)), onConfirm: () => setConfirmState(null), variant: 'danger' });
                          } finally { setAssignLoading(false); }
                        }}
                        className="btn-primary"
                        disabled={!selectedUser || assignLoading}
                      >
                        {assignLoading ? 'Asignando...' : 'Asignar'}
                      </button>
                    </div>
                  </div>
                </div>

                {(isCurrentUserPrincipal || (user && user.roles && user.roles.includes && user.roles.includes('admin'))) && (
                  <div className="mt-4">
                    <h5 className="font-medium">Transferir liderazgo</h5>
                    {!showTransfer ? (
                      <button className="mt-2 btn-primary text-sm" onClick={() => setShowTransfer(true)}>Elegir nuevo líder</button>
                    ) : (
                      <div className="mt-2 flex items-center gap-2">
                        <select className="flex-1 border rounded px-2 py-1" value={transferTarget} onChange={(e)=>setTransferTarget(e.target.value)}>
                          <option value="">Selecciona responsable…</option>
                          {(item.responsibles || [])
                            .filter((r: any) => !r.left_at && r.role !== 'principal')
                            .map((r: any) => (
                              <option key={r.id} value={String(r.user)}>{r.user_display || r.user}</option>
                            ))}
                        </select>
                        <button
                          className="btn-primary text-sm"
                          onClick={async () => {
                            if (!id || !transferTarget) return;
                            try {
                              await client.post(`/cases/${id}/transfer-principal/`, { user: Number(transferTarget) });
                              const d = await client.get(`/cases/${id}/`);
                              setItem(d);
                              setShowTransfer(false);
                              setTransferTarget('');
                              await loadActivity();
                            } catch (e) {
                              setConfirmState({ message: 'No se pudo transferir el liderazgo', onConfirm: () => setConfirmState(null), variant: 'danger' });
                            }
                          }}
                        >Transferir</button>
                        <button className="px-3 py-1 btn-neutral text-sm" onClick={() => { setShowTransfer(false); setTransferTarget(''); }}>Cancelar</button>
                      </div>
                    )}
                  </div>
                )}

                {/* Actividad compacta (debajo de Responsables) */}
                <div className="mt-4 border-t pt-4">
                  <h5 className="font-medium">Actividad</h5>
                  <div className="text-xs muted mb-2">{showAllActivity ? 'Mostrando toda la actividad' : 'Mostrando las últimas 5 entradas'}</div>
                  <div className="space-y-2 max-h-64 overflow-auto">
                    {(activity || [])
                      .slice(0, showAllActivity ? 200 : 5)
                      .map((a) => {
                        const isAudit = a.source === 'audit';
                        const badge = a.type || (isAudit ? 'evento' : 'acción');
                        function humanize(entry: any) {
                          if (!entry) return '';
                          if (entry.source === 'actuacion') {
                            const act = entry;
                            const actor = act.actor_display || act.actor || 'Alguien';
                            const t = act.action_type || 'Actuación';
                            const det = act.details ? ` — ${act.details}` : '';
                            return `${actor} registró una actuación: ${t}${det}`;
                          }
                          if (entry.source === 'audit') {
                            const actor = entry.actor_display || entry.actor || 'Sistema';
                            let parts: string[] = [];
                            const d = entry.details || {};
                            if (d.changes && typeof d.changes === 'object') {
                              for (const k of Object.keys(d.changes)) {
                                const ch = d.changes[k];
                                const from = Array.isArray(ch) ? ch[0] : ch?.from;
                                const to = Array.isArray(ch) ? ch[1] : ch?.to;
                                parts.push(`${k}: '${from}' → '${to}'`);
                              }
                            } else if (d.field) {
                              parts.push(`${d.field}: '${d.old}' → '${d.new}'`);
                            }
                            const summary = parts.length ? parts.join('; ') : (entry.summary || entry.type || 'cambio');
                            return `${actor} realizó cambios: ${summary}`;
                          }
                          // fallback
                          return typeof entry.details === 'object' ? JSON.stringify(entry.details) : (entry.details || entry.summary || 'Evento');
                        }
                        return (
                          <div key={`${a.source}-${a.id}`} className="p-2 rounded border bg-white hover:shadow-sm">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-2">
                                <div className={`mt-0.5 h-6 w-6 rounded-full flex items-center justify-center text-white text-[10px] ${isAudit ? 'bg-purple-500' : 'bg-blue-500'}`}>{isAudit ? 'A' : 'C'}</div>
                                <div>
                                  <div className="text-sm">
                                    <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700 mr-2">{badge}</span>
                                    <span className="text-xs muted">{a.actor_display || a.actor || ''}</span>
                                  </div>
                                  <div className="text-xs muted mt-1 break-words">{humanize(a)}</div>
                                </div>
                              </div>
                              <div className="text-xs muted whitespace-nowrap">{a.created_at ? new Date(a.created_at).toLocaleString() : ''}</div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button className="px-2 py-1 btn-neutral text-sm" onClick={() => setShowAllActivity(!showAllActivity)}>
                      {showAllActivity ? 'Ver recientes' : 'Ver todo'}
                    </button>
                    <button className="px-2 py-1 btn-neutral text-sm" onClick={() => loadActivity()}>
                      Refrescar
                    </button>
                  </div>
                </div>

                {/* Registrar actuación (movido dentro de Responsables) */}
                <div className="mt-4">
                  <h5 className="font-medium">Registrar actuación</h5>
                  <div className="mt-2 space-y-2">
                    <input
                      value={actActionType}
                      onChange={(e) => setActActionType(e.target.value)}
                      placeholder="Tipo de acción (ej: Presentación, Audiencia)"
                      className="w-full border rounded px-2 py-1"
                    />
                    <textarea
                      value={actDetails}
                      onChange={(e) => setActDetails(e.target.value)}
                      placeholder="Detalles (opcional)"
                      className="w-full border rounded px-2 py-1"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          if (!id) return;
                          if (!actActionType) {
                            setConfirmState({
                              message: 'Especifica el tipo de acción',
                              variant: 'warning',
                              onConfirm: () => setConfirmState(null)
                            });
                            return;
                          }
                          setLoadingAct(true);
                          try {
                            await client.post(`/cases/${id}/actuaciones/`, {
                              action_type: actActionType,
                              details: actDetails || null,
                            });
                            await loadActivity();
                            const c = await client.get(`/cases/${id}/`);
                            setItem(c);
                            setActActionType('');
                            setActDetails('');
                          } catch (err: any) {
                            setConfirmState({
                              message: 'Error al registrar actuación: ' + (err?.message || String(err)),
                              variant: 'danger',
                              onConfirm: () => setConfirmState(null)
                            });
                          } finally {
                            setLoadingAct(false);
                          }
                        }}
                        className="btn-primary"
                        disabled={loadingAct}
                      >
                        {loadingAct ? 'Registrando...' : 'Registrar'}
                      </button>
                      <button
                        onClick={() => {
                          setActActionType('');
                          setActDetails('');
                        }}
                        className="px-3 py-1 btn-neutral"
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>
                </div>

              </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 card">
          {item.left_at_for_me && (
            <div className="mb-3 p-3 rounded border border-yellow-300 bg-yellow-50 text-yellow-900">
              Vista histórica hasta {new Date(item.left_at_for_me).toLocaleString()} — no puedes editar este caso ni ver cambios posteriores a esa fecha.{' '}
              <Link to="/cases/history" className="underline">Ver mis casos históricos</Link>
            </div>
          )}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-[var(--wm-4)]">Título</label>
              <input
                className="mt-1 w-full border rounded px-3 py-2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--wm-4)]">Cliente</label>
              <input
                className="mt-1 w-full border rounded px-3 py-2 bg-gray-100 text-gray-600"
                value={clientName}
                disabled
                readOnly
              />
              <div className="mt-1 text-[11px] text-gray-500">El cliente del caso es inmutable tras la creación.</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--wm-4)]">Tipo de proceso</label>
              <input
                className="mt-1 w-full border rounded px-3 py-2"
                value={processType}
                onChange={(e) => setProcessType(e.target.value)}
                disabled={!!item.left_at_for_me}
              />
            </div>
            <div className="flex gap-2">
              <button className="btn-primary" onClick={save}>
                Guardar
              </button>
              <button className="px-3 py-1 btn-neutral" onClick={() => setEditing(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmState && (
        <ConfirmDialog
          title={confirmState.variant === 'danger' ? 'Confirmar' : confirmState.variant === 'warning' ? 'Confirmar' : 'Mensaje'}
          message={confirmState.message}
          confirmText={confirmState.variant === 'info' ? 'Cerrar' : 'Confirmar'}
          cancelText={confirmState.variant === 'info' ? '' : 'Cancelar'}
          variant={confirmState.variant || 'info'}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
  );
}
