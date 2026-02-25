import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Download, Settings, Clock, Timer, CheckCircle2, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, Eye, Edit, X, UserCheck, MessageSquare, Send, Users, Image, Paperclip, Calendar, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const INCIDENT_STATUSES = ['Новая', 'В работе', 'Завершен', 'Проверен'];

const getStatusColor = (status) => {
  switch (status) {
    case 'Новая':    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
    case 'В работе': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
    case 'Завершен': return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
    case 'Проверен': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300';
    case 'Открыт':   return 'bg-blue-100 text-blue-800';
    case 'Закрыт':   return 'bg-gray-100 text-gray-800';
    default:         return 'bg-gray-100 text-gray-800';
  }
};

const getCriticalityColor = (c) => {
  switch (c) {
    case 'Высокая': return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
    case 'Средняя': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300';
    case 'Низкая':  return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
    default:        return 'bg-gray-100 text-gray-800';
  }
};

const getCriticalityStrip = (c) => {
  switch (c) {
    case 'Высокая': return 'bg-red-500';
    case 'Средняя': return 'bg-amber-400';
    case 'Низкая':  return 'bg-green-500';
    default:        return 'bg-slate-300';
  }
};

const fmtDT = (dt) => dt ? new Date(dt).toLocaleString('ru-RU', {
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
}) : '—';

// ── MultiUserSelect ────────────────────────────────────────────────
const MultiUserSelect = ({ users, selected, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (id) => {
    if (selected.includes(id)) onChange(selected.filter(x => x !== id));
    else onChange([...selected, id]);
  };

  const names = users.filter(u => selected.includes(u.id)).map(u => u.full_name);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(v => !v)}
        className={`w-full text-left border rounded-md px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:border-slate-600 min-h-[38px] flex items-center justify-between gap-2 ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-400 cursor-pointer'}`}
      >
        <span className={names.length === 0 ? 'text-slate-400' : 'text-slate-900 dark:text-white'}>
          {names.length === 0 ? 'Выберите сотрудников...' : names.join(', ')}
        </span>
        <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md shadow-lg max-h-52 overflow-y-auto">
          {users.length === 0 && (
            <div className="px-3 py-2 text-sm text-slate-500">Нет пользователей</div>
          )}
          {users.map(u => (
            <label key={u.id} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer">
              <Checkbox checked={selected.includes(u.id)} onCheckedChange={() => toggle(u.id)} />
              <span className="text-sm dark:text-white">{u.full_name}</span>
              <span className="text-xs text-slate-400 ml-auto">{u.role_name || u.role}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

// ── CommentsSection ────────────────────────────────────────────────
const CommentsSection = ({ incidentId, user }) => {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [pendingImage, setPendingImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const bottomRef = useRef(null);
  const messagesRef = useRef(null);
  const imgInputRef = useRef(null);

  const load = async () => {
    try {
      const res = await axios.get(`${API}/incidents/${incidentId}/comments`);
      setComments(res.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [incidentId]); // eslint-disable-line

  // Scroll within the messages container only, not the whole dialog
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [comments]);

  const readFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => setPendingImage(e.target.result);
    reader.readAsDataURL(file);
  };

  const handlePaste = (e) => {
    const item = Array.from(e.clipboardData?.items || []).find(i => i.type.startsWith('image/'));
    if (item) { e.preventDefault(); readFile(item.getAsFile()); }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files[0];
    if (file) readFile(file);
  };

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() && !pendingImage) return;
    try {
      await axios.post(`${API}/incidents/${incidentId}/comments`, { text: text.trim(), image: pendingImage || null });
      setText('');
      setPendingImage(null);
      load();
    } catch { toast.error('Ошибка отправки комментария'); }
  };

  const del = async (commentId) => {
    if (!window.confirm('Удалить комментарий?')) return;
    try {
      await axios.delete(`${API}/incidents/${incidentId}/comments/${commentId}`);
      load();
    } catch { toast.error('Ошибка удаления'); }
  };

  const isAdmin = user?.role === 'Администратор';

  return (
    <div className="flex flex-col gap-3">
      {/* Lightbox — z-[200] to appear above dialog overlay */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-[200] bg-black/85 flex items-center justify-center p-6"
          onClick={() => setLightboxSrc(null)}
        >
          <img
            src={lightboxSrc}
            alt="preview"
            className="max-w-full max-h-full rounded-xl shadow-2xl object-contain"
            onClick={e => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            onClick={() => setLightboxSrc(null)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 mb-1">
        <MessageSquare className="w-4 h-4 text-cyan-500" />
        <span className="font-semibold text-sm dark:text-white">Комментарии</span>
        <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 text-xs">{comments.length}</Badge>
      </div>

      <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        {/* Messages area — own scroll container */}
        <div
          ref={messagesRef}
          className="p-3 space-y-3 bg-slate-50 dark:bg-slate-900/50 max-h-72 overflow-y-auto"
        >
          {loading && <div className="text-center text-sm text-slate-400 py-4">Загрузка...</div>}
          {!loading && comments.length === 0 && (
            <div className="text-center text-sm text-slate-400 py-4">Пока нет комментариев. Будьте первым!</div>
          )}
          {comments.map(c => {
            const isOwn = c.user_id === user?.id;

            if (c.type === 'note') {
              return (
                <div key={c.id} className="flex items-center gap-2 py-1">
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                  <div className="flex items-center gap-1.5 px-2 text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                    <span>{c.text}</span>
                    <span className="opacity-60">·</span>
                    <span>{c.user_name}</span>
                    <span className="opacity-60">·</span>
                    <span>{fmtDT(c.created_at)}</span>
                    {isAdmin && (
                      <button onClick={() => del(c.id)} className="text-slate-300 hover:text-red-400 ml-1 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                </div>
              );
            }

            return (
              <div key={c.id} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${isOwn ? 'bg-cyan-500' : 'bg-slate-500'}`}>
                  {(c.user_name || '?')[0].toUpperCase()}
                </div>
                <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{c.user_name}</span>
                    <span className="text-xs text-slate-400">{fmtDT(c.created_at)}</span>
                    {isAdmin && (
                      <button onClick={() => del(c.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className={`px-3 py-2 rounded-xl text-sm break-words ${isOwn ? 'bg-cyan-500 text-white rounded-tr-sm' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-sm'}`}>
                    {c.text && <p>{c.text}</p>}
                    {c.image && (
                      <img
                        src={c.image}
                        alt="вложение"
                        className="mt-1 max-w-[220px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setLightboxSrc(c.image)}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Pending image preview */}
        {pendingImage && (
          <div className="px-3 pt-2 bg-white dark:bg-slate-800 flex items-center gap-2 flex-wrap">
            <div className="relative">
              <img src={pendingImage} alt="preview" className="h-16 rounded border border-slate-300 dark:border-slate-600 object-cover" />
              <button onClick={() => setPendingImage(null)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">×</button>
            </div>
          </div>
        )}

        {/* Input area */}
        <form onSubmit={send} className="flex gap-2 p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
          onDrop={handleDrop} onDragOver={e => e.preventDefault()}>
          <input ref={imgInputRef} type="file" accept="image/*" className="hidden"
            onChange={e => readFile(e.target.files?.[0])} />
          <button type="button" onClick={() => imgInputRef.current?.click()}
            className="text-slate-400 hover:text-cyan-500 transition-colors flex-shrink-0 p-1"
            title="Прикрепить изображение">
            <Image className="w-5 h-5" />
          </button>
          <Input
            value={text}
            onChange={e => setText(e.target.value)}
            onPaste={handlePaste}
            placeholder="Написать комментарий... (или вставьте скриншот)"
            className="flex-1 dark:bg-slate-700 dark:border-slate-600"
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e); } }}
          />
          <Button type="submit" size="sm" className="bg-cyan-600 hover:bg-cyan-700 px-3" disabled={!text.trim() && !pendingImage}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════
const Incidents = ({ user }) => {
  const [incidents, setIncidents] = useState([]);
  const [users, setUsers] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState(null);
  const [viewingIncident, setViewingIncident] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Все');
  const [criticalityFilter, setCriticalityFilter] = useState('Все');
  const [detectedByFilter, setDetectedByFilter] = useState('');
  const [violatorFilter, setViolatorFilter] = useState('');
  const [systemFilter, setSystemFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination and sorting
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  const isAdmin = user?.role === 'Администратор';

  // Ref for scrolling view dialog to top
  const viewDialogTopRef = useRef(null);

  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('incidents_visible_columns_v2');
    if (saved) return JSON.parse(saved);
    return {
      incident_number: true,
      incident_time: true,
      violator: true,
      system: true,
      incident_type: true,
      criticality: true,
      status: true,
      assigned_to: true,
      mtta: true,
      mttr: true,
      mttc: true,
      detected_by: true,
      description: false,
      measures: false,
    };
  });

  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [lightboxAtt, setLightboxAtt] = useState(null);
  const attInputRef = useRef(null);
  const viewAttInputRef = useRef(null);

  const emptyForm = {
    incident_time: '',
    detection_time: '',
    reaction_start_time: '',
    closed_at: '',
    violator: '',
    subject_type: 'Внутренний',
    login: '',
    system: '',
    incident_type: '',
    detection_source: '',
    criticality: 'Средняя',
    detected_by: user?.full_name || '',
    status: 'Новая',
    description: '',
    measures: '',
    is_repeat: false,
    comment: '',
    assigned_to: [],
    attachments: [],
  };

  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    fetchMetrics();
    fetchUsers();
  }, []); // eslint-disable-line

  useEffect(() => {
    fetchIncidents();
  }, [page, limit, sortBy, sortOrder]); // eslint-disable-line

  useEffect(() => {
    localStorage.setItem('incidents_visible_columns_v2', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  // Scroll to top when view dialog opens
  useEffect(() => {
    if (viewDialogOpen) {
      setTimeout(() => {
        viewDialogTopRef.current?.scrollIntoView({ block: 'start' });
      }, 80);
    }
  }, [viewDialogOpen]);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API}/users`);
      setUsers(res.data);
    } catch { /* silently ignore */ }
  };

  const fetchIncidents = async () => {
    try {
      const response = await axios.get(`${API}/incidents`, {
        params: { page, limit, sort_by: sortBy, sort_order: sortOrder }
      });
      setIncidents(response.data.items);
      setTotal(response.data.total);
      setTotalPages(response.data.total_pages);
    } catch {
      toast.error('Ошибка загрузки инцидентов');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await axios.get(`${API}/incidents/metrics/summary`);
      setMetrics(response.data);
    } catch { /* ignore */ }
  };

  const getUserName = (id) => {
    const u = users.find(u => u.id === id);
    return u ? u.full_name : id;
  };

  const getAssignedNames = (assigned_to) => {
    if (!assigned_to || assigned_to.length === 0) return '—';
    return (assigned_to || []).map(id => getUserName(id)).join(', ');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSend = {
        ...formData,
        reaction_start_time: formData.reaction_start_time || null,
        closed_at: formData.closed_at || null,
        assigned_to: formData.assigned_to || [],
      };

      if (editingIncident) {
        await axios.put(`${API}/incidents/${editingIncident.id}`, dataToSend);
        toast.success('Инцидент обновлён');
      } else {
        await axios.post(`${API}/incidents`, dataToSend);
        toast.success('Инцидент создан');
      }
      setDialogOpen(false);
      resetForm();
      fetchIncidents();
      fetchMetrics();
    } catch (error) {
      const detail = error.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Ошибка сохранения инцидента');
    }
  };

  const handleView = (incident) => {
    setViewingIncident(incident);
    setViewDialogOpen(true);
  };

  const handleEditFromView = () => {
    setViewDialogOpen(false);
    handleEdit(viewingIncident);
  };

  const handleDeleteFromView = async () => {
    if (!window.confirm('Удалить инцидент?')) return;
    try {
      await axios.delete(`${API}/incidents/${viewingIncident.id}`);
      toast.success('Инцидент удалён');
      setViewDialogOpen(false);
      fetchIncidents();
      fetchMetrics();
    } catch { toast.error('Ошибка удаления'); }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Удалить инцидент?')) return;
    try {
      await axios.delete(`${API}/incidents/${id}`);
      toast.success('Инцидент удалён');
      fetchIncidents();
      fetchMetrics();
    } catch { toast.error('Ошибка удаления'); }
  };

  const handleEdit = (incident, e) => {
    e?.stopPropagation();
    setEditingIncident(incident);
    setFormData({ ...incident, assigned_to: incident.assigned_to || [], attachments: incident.attachments || [] });
    setDialogOpen(true);
  };

  const handleStatusChange = async (newStatus) => {
    if (!viewingIncident) return;
    try {
      const updated = await axios.put(`${API}/incidents/${viewingIncident.id}`, { status: newStatus });
      setViewingIncident(updated.data);
      toast.success(`Статус изменён: ${newStatus}`);
      fetchIncidents();
      fetchMetrics();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Ошибка смены статуса');
    }
  };

  const handleAddAttachment = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        await axios.post(`${API}/incidents/${viewingIncident.id}/attachments`, {
          data: e.target.result,
          filename: file.name,
        });
        const res = await axios.get(`${API}/incidents/${viewingIncident.id}`);
        setViewingIncident(res.data);
        toast.success('Вложение добавлено');
      } catch { toast.error('Ошибка загрузки вложения'); }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteAttachment = async (attId) => {
    if (!window.confirm('Удалить вложение?')) return;
    try {
      await axios.delete(`${API}/incidents/${viewingIncident.id}/attachments/${attId}`);
      const res = await axios.get(`${API}/incidents/${viewingIncident.id}`);
      setViewingIncident(res.data);
      toast.success('Вложение удалено');
    } catch { toast.error('Ошибка удаления вложения'); }
  };

  const resetForm = () => {
    setEditingIncident(null);
    setFormData({ ...emptyForm, detected_by: user?.full_name || '' });
  };

  const addAttachmentToForm = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const att = { id: `${Date.now()}-${Math.random()}`, data: e.target.result, filename: file.name, created_at: new Date().toISOString() };
      setFormData(prev => ({ ...prev, attachments: [...(prev.attachments || []), att] }));
    };
    reader.readAsDataURL(file);
  };

  const removeAttachmentFromForm = (id) => {
    setFormData(prev => ({ ...prev, attachments: (prev.attachments || []).filter(a => a.id !== id) }));
  };

  const handleFormPaste = (e) => {
    const item = Array.from(e.clipboardData?.items || []).find(i => i.type.startsWith('image/'));
    if (item) { e.preventDefault(); addAttachmentToForm(item.getAsFile()); }
  };

  const exportToCSV = () => {
    const data = getFilteredIncidents();
    if (data.length === 0) { toast.error('Нет данных для экспорта'); return; }
    const headers = ['Номер', 'Время', 'Нарушитель', 'Система', 'Тип', 'Критичность', 'Статус', 'Назначен', 'MTTA(ч)', 'MTTR(ч)', 'MTTC(ч)', 'Обнаружил'];
    const rows = data.map(i => [
      i.incident_number, fmtDT(i.incident_time), i.violator || '', i.system || '',
      i.incident_type || '', i.criticality, i.status,
      getAssignedNames(i.assigned_to),
      i.mtta ? (i.mtta / 60).toFixed(2) : 'N/A',
      i.mttr ? (i.mttr / 60).toFixed(2) : 'N/A',
      i.mttc ? (i.mttc / 60).toFixed(2) : 'N/A',
      i.detected_by || '',
    ]);
    const BOM = '\uFEFF';
    const csv = BOM + [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `incidents_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Данные экспортированы');
  };

  const columnNames = {
    incident_number: 'Номер',
    incident_time: 'Время инцидента',
    violator: 'Нарушитель',
    system: 'Система',
    incident_type: 'Тип',
    criticality: 'Критичность',
    status: 'Статус',
    assigned_to: 'Назначен',
    mtta: 'MTTA (ч)',
    mttr: 'MTTR (ч)',
    mttc: 'MTTC (ч)',
    detected_by: 'Обнаружил',
    description: 'Описание',
    measures: 'Меры',
  };

  const getFilteredIncidents = () => {
    return incidents.filter(incident => {
      const matchesSearch = !searchTerm ||
        Object.values(incident).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'Все' || incident.status === statusFilter;
      const matchesCriticality = criticalityFilter === 'Все' || incident.criticality === criticalityFilter;
      const matchesDetectedBy = !detectedByFilter || incident.detected_by?.toLowerCase().includes(detectedByFilter.toLowerCase());
      const matchesViolator = !violatorFilter || incident.violator?.toLowerCase().includes(violatorFilter.toLowerCase());
      const matchesSystem = !systemFilter || incident.system?.toLowerCase().includes(systemFilter.toLowerCase());
      const matchesAssigned = !assignedFilter ||
        (incident.assigned_to || []).some(id => getUserName(id).toLowerCase().includes(assignedFilter.toLowerCase()));
      const matchesDateFrom = !dateFrom || new Date(incident.incident_time) >= new Date(dateFrom);
      const matchesDateTo = !dateTo || new Date(incident.incident_time) <= new Date(dateTo);
      return matchesSearch && matchesStatus && matchesCriticality && matchesDetectedBy &&
             matchesViolator && matchesSystem && matchesAssigned && matchesDateFrom && matchesDateTo;
    });
  };

  const resetFilters = () => {
    setSearchTerm(''); setStatusFilter('Все'); setCriticalityFilter('Все');
    setDetectedByFilter(''); setViolatorFilter(''); setSystemFilter('');
    setAssignedFilter(''); setDateFrom(''); setDateTo('');
  };

  const handleSort = (column) => {
    if (sortBy === column) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortBy(column); setSortOrder('asc'); }
    setPage(1);
  };

  const canEdit = (incident) => {
    if (isAdmin) return true;
    return incident.created_by === user?.id || (incident.assigned_to || []).includes(user?.id);
  };

  const Pagination = () => (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={() => setPage(1)} disabled={page === 1}><ChevronsLeft className="w-4 h-4" /></Button>
      <Button size="sm" variant="outline" onClick={() => setPage(page - 1)} disabled={page === 1}><ChevronLeft className="w-4 h-4" /></Button>
      <span className="text-sm px-2">Стр. {page} из {totalPages}</span>
      <Button size="sm" variant="outline" onClick={() => setPage(page + 1)} disabled={page >= totalPages}><ChevronRight className="w-4 h-4" /></Button>
      <Button size="sm" variant="outline" onClick={() => setPage(totalPages)} disabled={page >= totalPages}><ChevronsRight className="w-4 h-4" /></Button>
    </div>
  );

  if (loading) return (
    <div className="flex justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600" />
    </div>
  );

  const filteredIncidents = getFilteredIncidents();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-cyan-600" />
            Инциденты ИБ
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Управление инцидентами информационной безопасности</p>
        </div>

        {/* Create dialog trigger */}
        <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm">
              <Plus className="w-4 h-4 mr-2" />
              Добавить инцидент
            </Button>
          </DialogTrigger>

          {/* Create / Edit Dialog */}
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto dark:bg-slate-900 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="dark:text-white">{editingIncident ? 'Редактировать инцидент' : 'Новый инцидент'}</DialogTitle>
              <DialogDescription className="dark:text-slate-400">Заполните информацию об инциденте ИБ</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4" onPaste={handleFormPaste}>

              {/* Timing */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="dark:text-slate-300">Время инцидента *</Label>
                  <Input type="datetime-local" value={formData.incident_time}
                    onChange={e => setFormData({ ...formData, incident_time: e.target.value })} required
                    className="dark:bg-slate-800 dark:border-slate-600" />
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-slate-300">Время обнаружения *</Label>
                  <Input type="datetime-local" value={formData.detection_time}
                    onChange={e => setFormData({ ...formData, detection_time: e.target.value })} required
                    className="dark:bg-slate-800 dark:border-slate-600" />
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-slate-300">Начало реакции</Label>
                  <Input type="datetime-local" value={formData.reaction_start_time}
                    onChange={e => setFormData({ ...formData, reaction_start_time: e.target.value })}
                    className="dark:bg-slate-800 dark:border-slate-600" />
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-slate-300">Время закрытия</Label>
                  <Input type="datetime-local" value={formData.closed_at}
                    onChange={e => setFormData({ ...formData, closed_at: e.target.value })}
                    className="dark:bg-slate-800 dark:border-slate-600" />
                </div>
              </div>

              {/* Violator / Subject */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="dark:text-slate-300">Нарушитель</Label>
                  <Input value={formData.violator}
                    onChange={e => setFormData({ ...formData, violator: e.target.value })}
                    className="dark:bg-slate-800 dark:border-slate-600" />
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-slate-300">Тип субъекта</Label>
                  <Select value={formData.subject_type} onValueChange={v => setFormData({ ...formData, subject_type: v })}>
                    <SelectTrigger className="dark:bg-slate-800 dark:border-slate-600"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['Внутренний','Внешний','Привилегированный','Сотрудник','Подрядчик'].map(v => (
                        <SelectItem key={v} value={v}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Login / System */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="dark:text-slate-300">Логин</Label>
                  <Input value={formData.login}
                    onChange={e => setFormData({ ...formData, login: e.target.value })}
                    className="dark:bg-slate-800 dark:border-slate-600" />
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-slate-300">Система *</Label>
                  <Input value={formData.system} required
                    onChange={e => setFormData({ ...formData, system: e.target.value })}
                    className="dark:bg-slate-800 dark:border-slate-600" />
                </div>
              </div>

              {/* Type / Source */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="dark:text-slate-300">Тип инцидента *</Label>
                  <Input value={formData.incident_type} required
                    onChange={e => setFormData({ ...formData, incident_type: e.target.value })}
                    className="dark:bg-slate-800 dark:border-slate-600" />
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-slate-300">Источник выявления</Label>
                  <Input value={formData.detection_source}
                    onChange={e => setFormData({ ...formData, detection_source: e.target.value })}
                    className="dark:bg-slate-800 dark:border-slate-600" />
                </div>
              </div>

              {/* Criticality / Detected by / Status */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="dark:text-slate-300">Критичность</Label>
                  <Select value={formData.criticality} onValueChange={v => setFormData({ ...formData, criticality: v })}>
                    <SelectTrigger className="dark:bg-slate-800 dark:border-slate-600"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Высокая">Высокая</SelectItem>
                      <SelectItem value="Средняя">Средняя</SelectItem>
                      <SelectItem value="Низкая">Низкая</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-slate-300">Обнаружил</Label>
                  <Input value={formData.detected_by}
                    onChange={e => setFormData({ ...formData, detected_by: e.target.value })}
                    className="dark:bg-slate-800 dark:border-slate-600" />
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-slate-300">Статус</Label>
                  <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
                    <SelectTrigger className="dark:bg-slate-800 dark:border-slate-600"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {INCIDENT_STATUSES.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Assign to users — admin only */}
              {isAdmin && (
                <div className="space-y-2">
                  <Label className="dark:text-slate-300 flex items-center gap-1">
                    <UserCheck className="w-4 h-4 text-cyan-500" />
                    Назначить сотрудников
                  </Label>
                  <MultiUserSelect
                    users={users}
                    selected={formData.assigned_to || []}
                    onChange={ids => setFormData({ ...formData, assigned_to: ids })}
                  />
                  <p className="text-xs text-slate-400">Только администратор может назначать исполнителей</p>
                </div>
              )}

              {/* Description / Measures */}
              <div className="space-y-2">
                <Label className="dark:text-slate-300">Описание инцидента</Label>
                <textarea
                  className="w-full border rounded-md p-2 min-h-[80px] text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="dark:text-slate-300">Принятые меры</Label>
                <textarea
                  className="w-full border rounded-md p-2 min-h-[80px] text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                  value={formData.measures}
                  onChange={e => setFormData({ ...formData, measures: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="dark:text-slate-300">Комментарий (служебный)</Label>
                <textarea
                  className="w-full border rounded-md p-2 min-h-[60px] text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                  value={formData.comment}
                  onChange={e => setFormData({ ...formData, comment: e.target.value })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox checked={formData.is_repeat}
                  onCheckedChange={v => setFormData({ ...formData, is_repeat: v })} />
                <Label className="dark:text-slate-300">Повторный инцидент</Label>
              </div>

              {/* Вложения */}
              <div className="space-y-2">
                <Label className="dark:text-slate-300 flex items-center gap-1">
                  <Paperclip className="w-4 h-4 text-cyan-500" />
                  Вложения (скриншоты)
                </Label>
                <input ref={attInputRef} type="file" accept="image/*" multiple className="hidden"
                  onChange={e => [...e.target.files].forEach(f => addAttachmentToForm(f))} />
                <div
                  className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-3 text-center cursor-pointer hover:border-cyan-400 transition-colors"
                  onClick={() => attInputRef.current?.click()}
                  onDrop={e => { e.preventDefault(); [...e.dataTransfer.files].forEach(f => addAttachmentToForm(f)); }}
                  onDragOver={e => e.preventDefault()}
                >
                  <Image className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                  <p className="text-xs text-slate-400">Кликните, перетащите или вставьте (Ctrl+V) скриншот</p>
                </div>
                {(formData.attachments || []).length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {formData.attachments.map((att) => (
                      <div key={att.id} className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 aspect-square bg-slate-100 dark:bg-slate-800">
                        <img src={att.data} alt={att.filename} className="w-full h-full object-cover cursor-pointer group-hover:opacity-80"
                          onClick={() => setLightboxAtt({ src: att.data, filename: att.filename })} />
                        <button type="button" onClick={() => removeAttachmentFromForm(att.id)}
                          className="absolute top-1 right-1 bg-red-500/90 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 text-xs">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Chat — only when editing existing */}
              {editingIncident && (
                <div className="border-t dark:border-slate-700 pt-4">
                  <CommentsSection incidentId={editingIncident.id} user={user} />
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}
                  className="dark:border-slate-600 dark:text-slate-300">Отмена</Button>
                <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700 text-white">Сохранить</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* ═══ View Dialog ═══════════════════════════════════════════════════ */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto dark:bg-slate-900 dark:border-slate-700 p-0">

            {/* Lightbox for attachments — z-[200] so it appears above dialog overlay */}
            {lightboxAtt && (
              <div
                className="fixed inset-0 z-[200] bg-black/88 flex flex-col items-center justify-center p-8"
                onClick={() => setLightboxAtt(null)}
              >
                <img
                  src={lightboxAtt.src}
                  alt={lightboxAtt.filename}
                  className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain"
                  onClick={e => e.stopPropagation()}
                />
                {lightboxAtt.filename && (
                  <p className="text-white/70 text-sm mt-4 text-center">{lightboxAtt.filename}</p>
                )}
                <button
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                  onClick={() => setLightboxAtt(null)}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {viewingIncident && (
              <>
                {/* Criticality color strip at top */}
                <div className={`h-1.5 w-full rounded-t-lg ${getCriticalityStrip(viewingIncident.criticality)}`} />

                <div className="p-6 space-y-5">
                  {/* Scroll anchor */}
                  <div ref={viewDialogTopRef} />

                  {/* ── Header ── */}
                  <div className="flex items-start gap-4 pr-6">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Инцидент</div>
                      <div className="text-2xl font-mono font-bold text-slate-900 dark:text-white leading-tight">
                        {viewingIncident.incident_number}
                      </div>
                      {viewingIncident.incident_type && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{viewingIncident.incident_type}</p>
                      )}
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
                        <Calendar className="w-3 h-3" />
                        Создан: {fmtDT(viewingIncident.created_at)}
                        {viewingIncident.is_repeat && (
                          <Badge className="ml-2 bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 text-xs">Повторный</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <Badge className={`${getCriticalityColor(viewingIncident.criticality)} text-sm px-3 py-1`}>
                        {viewingIncident.criticality}
                      </Badge>
                      <Badge className={`${getStatusColor(viewingIncident.status)} text-sm px-3 py-1`}>
                        {viewingIncident.status}
                      </Badge>
                    </div>
                  </div>

                  {/* ── Row 1: Participants + Timing ── */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                    {/* Participants */}
                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                        <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300">Участники и системы</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                        {[
                          ['Нарушитель', viewingIncident.violator],
                          ['Тип субъекта', viewingIncident.subject_type],
                          ['Логин', viewingIncident.login],
                          ['Система', viewingIncident.system],
                          ['Источник обнаружения', viewingIncident.detection_source],
                          ['Обнаружил', viewingIncident.detected_by],
                        ].map(([k, v]) => (
                          <div key={k}>
                            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{k}</div>
                            <div className="text-sm text-slate-800 dark:text-slate-200 mt-0.5 font-medium">{v || '—'}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Timing */}
                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                        <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300">Временные данные</h3>
                      </div>
                      <div className="space-y-2.5">
                        {[
                          ['Время инцидента',   fmtDT(viewingIncident.incident_time)],
                          ['Обнаружен',         fmtDT(viewingIncident.detection_time)],
                          ['Начало реакции',    fmtDT(viewingIncident.reaction_start_time)],
                          ['Время закрытия',    fmtDT(viewingIncident.closed_at)],
                        ].map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{k}</span>
                            <span className="text-sm text-slate-800 dark:text-slate-200 font-medium text-right">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ── Row 2: Assigned + Metrics ── */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                    {/* Assigned */}
                    <div className="bg-cyan-50 dark:bg-cyan-900/10 border border-cyan-200 dark:border-cyan-900/30 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <UserCheck className="w-4 h-4 text-cyan-600" />
                        <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300">Назначен</h3>
                      </div>
                      {(!viewingIncident.assigned_to || viewingIncident.assigned_to.length === 0) ? (
                        <p className="text-sm text-slate-400 dark:text-slate-500 italic">Никому не назначен</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {viewingIncident.assigned_to.map(id => (
                            <div key={id} className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-cyan-200 dark:border-cyan-800 rounded-lg px-3 py-1.5">
                              <div className="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {(getUserName(id) || '?')[0].toUpperCase()}
                              </div>
                              <span className="text-sm font-medium text-slate-800 dark:text-white">{getUserName(id)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Metrics */}
                    <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                        <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300">Метрики реагирования</h3>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          ['MTTA', viewingIncident.mtta, 'Подтверждение'],
                          ['MTTR', viewingIncident.mttr, 'Реакция'],
                          ['MTTC', viewingIncident.mttc, 'Закрытие'],
                        ].map(([k, v, desc]) => (
                          <div key={k} className="text-center bg-white dark:bg-slate-800 rounded-lg p-3 border border-green-100 dark:border-green-900/30">
                            <div className="text-lg font-bold text-green-600 dark:text-green-400">
                              {v ? `${(v / 60).toFixed(1)}ч` : '—'}
                            </div>
                            <div className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-0.5">{k}</div>
                            <div className="text-[10px] text-slate-400">{desc}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ── Text Fields ── */}
                  {(viewingIncident.description || viewingIncident.measures || viewingIncident.comment) && (
                    <div className="space-y-3">
                      {viewingIncident.description && (
                        <div className="border-l-4 border-slate-300 dark:border-slate-600 pl-4 bg-slate-50 dark:bg-slate-800/60 rounded-r-xl p-4">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Описание инцидента</div>
                          <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">{viewingIncident.description}</p>
                        </div>
                      )}
                      {viewingIncident.measures && (
                        <div className="border-l-4 border-emerald-400 dark:border-emerald-600 pl-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-r-xl p-4">
                          <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2">Принятые меры</div>
                          <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">{viewingIncident.measures}</p>
                        </div>
                      )}
                      {viewingIncident.comment && (
                        <div className="border-l-4 border-violet-400 dark:border-violet-600 pl-4 bg-violet-50 dark:bg-violet-900/10 rounded-r-xl p-4">
                          <div className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest mb-2">Служебный комментарий</div>
                          <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">{viewingIncident.comment}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Status Quick-Change ── */}
                  {canEdit(viewingIncident) && (
                    <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                      <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300 mb-3">Изменить статус</h3>
                      <div className="flex flex-wrap gap-2">
                        {INCIDENT_STATUSES.map(s => {
                          const isLockedProverena = viewingIncident.status === 'Проверен' && s !== 'Проверен' && !isAdmin;
                          const isActive = viewingIncident.status === s;
                          return (
                            <button
                              key={s}
                              onClick={() => handleStatusChange(s)}
                              disabled={isActive || isLockedProverena}
                              title={isLockedProverena ? 'Только администратор может снять статус «Проверен»' : ''}
                              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                                isActive
                                  ? `${getStatusColor(s)} ring-2 ring-offset-2 ring-current cursor-default shadow-sm`
                                  : isLockedProverena
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-40'
                                    : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600'
                              }`}
                            >
                              {s}
                            </button>
                          );
                        })}
                      </div>
                      {viewingIncident.status === 'Проверен' && !isAdmin && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                          Только администратор может изменить статус «Проверен»
                        </p>
                      )}
                    </div>
                  )}

                  {/* ── Attachments ── */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-cyan-500" />
                      <span className="font-semibold text-sm dark:text-white">Вложения</span>
                      <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 text-xs">
                        {(viewingIncident.attachments || []).length}
                      </Badge>
                      {isAdmin && (
                        <>
                          <input
                            ref={viewAttInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => [...(e.target.files || [])].forEach(f => handleAddAttachment(f))}
                          />
                          <button
                            onClick={() => viewAttInputRef.current?.click()}
                            className="ml-1 flex items-center gap-1 text-xs text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 font-medium transition-colors"
                          >
                            <Plus className="w-3 h-3" /> Добавить
                          </button>
                        </>
                      )}
                    </div>

                    {(viewingIncident.attachments || []).length > 0 ? (
                      <div className="grid grid-cols-4 gap-2">
                        {viewingIncident.attachments.map((att) => (
                          <div key={att.id} className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 aspect-square">
                            <img
                              src={att.data}
                              alt={att.filename || 'вложение'}
                              className="w-full h-full object-cover cursor-pointer group-hover:opacity-80 transition-opacity"
                              onClick={() => setLightboxAtt({ src: att.data, filename: att.filename })}
                            />
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteAttachment(att.id)}
                                className="absolute top-1 right-1 bg-red-500/90 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                              >×</button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div
                        className={`border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-5 text-center transition-colors ${isAdmin ? 'cursor-pointer hover:border-cyan-400' : ''}`}
                        onClick={() => isAdmin && viewAttInputRef.current?.click()}
                      >
                        <Paperclip className="w-5 h-5 text-slate-300 mx-auto mb-1" />
                        <p className="text-xs text-slate-400">{isAdmin ? 'Нет вложений — нажмите, чтобы добавить' : 'Нет вложений'}</p>
                      </div>
                    )}
                  </div>

                  {/* ── Comments ── */}
                  <CommentsSection incidentId={viewingIncident.id} user={user} />

                  {/* ── Actions ── */}
                  <div className="flex justify-between gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div>
                      {isAdmin && (
                        <Button variant="outline" className="text-red-600 hover:bg-red-50 border-red-200 hover:border-red-400 dark:border-red-900 dark:hover:bg-red-900/20" onClick={handleDeleteFromView}>
                          <Trash2 className="w-4 h-4 mr-1" /> Удалить
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {canEdit(viewingIncident) && (
                        <Button variant="outline" onClick={handleEditFromView} className="dark:border-slate-600 dark:text-slate-300">
                          <Edit className="w-4 h-4 mr-1" /> Редактировать
                        </Button>
                      )}
                      <Button variant="outline" onClick={() => setViewDialogOpen(false)} className="dark:border-slate-600 dark:text-slate-300">
                        <X className="w-4 h-4 mr-1" /> Закрыть
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Metrics cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="dark:bg-slate-800 dark:border-slate-700 border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">MTTA — подтверждение</CardTitle>
            <Clock className="w-5 h-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{metrics?.avg_mtta ? `${metrics.avg_mtta}ч` : 'N/A'}</div>
            <p className="text-xs text-slate-400 mt-1">Mean Time To Acknowledge</p>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-800 dark:border-slate-700 border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">MTTR — реагирование</CardTitle>
            <Timer className="w-5 h-5 text-teal-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">{metrics?.avg_mttr ? `${metrics.avg_mttr}ч` : 'N/A'}</div>
            <p className="text-xs text-slate-400 mt-1">Mean Time To Respond</p>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-800 dark:border-slate-700 border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">MTTC — закрытие</CardTitle>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{metrics?.avg_mttc ? `${metrics.avg_mttc}ч` : 'N/A'}</div>
            <p className="text-xs text-slate-400 mt-1">Mean Time To Close</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & toolbar */}
      <Card className="dark:bg-slate-800 dark:border-slate-700 border-0 shadow-sm">
        <CardContent className="pt-4 pb-4">
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}
                className="dark:border-slate-600 dark:text-slate-300">
                <Filter className="w-4 h-4 mr-2" />Фильтры {showFilters ? '▲' : '▼'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowColumnSelector(!showColumnSelector)}
                className="dark:border-slate-600 dark:text-slate-300">
                <Settings className="w-4 h-4 mr-2" />Столбцы
              </Button>
              <Button variant="outline" size="sm" onClick={exportToCSV}
                className="dark:border-slate-600 dark:text-slate-300">
                <Download className="w-4 h-4 mr-2" />Экспорт CSV
              </Button>
            </div>

            {showFilters && (
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl space-y-4 border border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold dark:text-slate-400">Статус</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="dark:bg-slate-800 dark:border-slate-600"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Все">Все статусы</SelectItem>
                        {INCIDENT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold dark:text-slate-400">Критичность</Label>
                    <Select value={criticalityFilter} onValueChange={setCriticalityFilter}>
                      <SelectTrigger className="dark:bg-slate-800 dark:border-slate-600"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Все">Все</SelectItem>
                        <SelectItem value="Высокая">Высокая</SelectItem>
                        <SelectItem value="Средняя">Средняя</SelectItem>
                        <SelectItem value="Низкая">Низкая</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold dark:text-slate-400">Обнаружил</Label>
                    <Input placeholder="Введите имя..." value={detectedByFilter}
                      onChange={e => setDetectedByFilter(e.target.value)}
                      className="dark:bg-slate-800 dark:border-slate-600" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold dark:text-slate-400">Нарушитель</Label>
                    <Input placeholder="Введите имя..." value={violatorFilter}
                      onChange={e => setViolatorFilter(e.target.value)}
                      className="dark:bg-slate-800 dark:border-slate-600" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold dark:text-slate-400">Система</Label>
                    <Input placeholder="Введите систему..." value={systemFilter}
                      onChange={e => setSystemFilter(e.target.value)}
                      className="dark:bg-slate-800 dark:border-slate-600" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold dark:text-slate-400">Назначен</Label>
                    <Input placeholder="Имя исполнителя..." value={assignedFilter}
                      onChange={e => setAssignedFilter(e.target.value)}
                      className="dark:bg-slate-800 dark:border-slate-600" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold dark:text-slate-400">Общий поиск</Label>
                    <Input placeholder="Поиск..." value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="dark:bg-slate-800 dark:border-slate-600" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold dark:text-slate-400">Дата от</Label>
                    <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                      className="dark:bg-slate-800 dark:border-slate-600" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold dark:text-slate-400">Дата до</Label>
                    <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                      className="dark:bg-slate-800 dark:border-slate-600" />
                  </div>
                  <div className="flex items-end">
                    <Button variant="outline" size="sm" onClick={resetFilters} className="w-full dark:border-slate-600 dark:text-slate-300">
                      Сбросить фильтры
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {showColumnSelector && (
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <h3 className="font-semibold mb-3 text-sm dark:text-white">Выберите столбцы:</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.keys(columnNames).map(key => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={visibleColumns[key] || false}
                        onCheckedChange={v => setVisibleColumns({ ...visibleColumns, [key]: v })} />
                      <span className="text-sm dark:text-slate-300">{columnNames[key]}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="dark:bg-slate-800 dark:border-slate-700 border-0 shadow-sm">
        <CardContent className="pt-4">
          {/* Pagination top */}
          <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-sm dark:text-slate-400">Показать:</Label>
              <Select value={limit.toString()} onValueChange={v => { setLimit(Number(v)); setPage(1); }}>
                <SelectTrigger className="w-24 dark:bg-slate-700 dark:border-slate-600"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[10, 20, 30, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="text-sm text-slate-600 dark:text-slate-400">Всего: {total}</span>
            </div>
            <Pagination />
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="dark:border-slate-700">
                  {visibleColumns.incident_number && (
                    <TableHead onClick={() => handleSort('incident_number')} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-1">Номер {sortBy === 'incident_number' && <ArrowUpDown className="w-3 h-3" />}</div>
                    </TableHead>
                  )}
                  {visibleColumns.incident_time && (
                    <TableHead onClick={() => handleSort('incident_time')} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-1">Время {sortBy === 'incident_time' && <ArrowUpDown className="w-3 h-3" />}</div>
                    </TableHead>
                  )}
                  {visibleColumns.violator && (
                    <TableHead onClick={() => handleSort('violator')} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-1">Нарушитель {sortBy === 'violator' && <ArrowUpDown className="w-3 h-3" />}</div>
                    </TableHead>
                  )}
                  {visibleColumns.system && (
                    <TableHead onClick={() => handleSort('system')} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-1">Система {sortBy === 'system' && <ArrowUpDown className="w-3 h-3" />}</div>
                    </TableHead>
                  )}
                  {visibleColumns.incident_type && (
                    <TableHead className="dark:text-slate-300">Тип</TableHead>
                  )}
                  {visibleColumns.criticality && (
                    <TableHead onClick={() => handleSort('criticality')} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-1">Критичность {sortBy === 'criticality' && <ArrowUpDown className="w-3 h-3" />}</div>
                    </TableHead>
                  )}
                  {visibleColumns.status && (
                    <TableHead onClick={() => handleSort('status')} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-1">Статус {sortBy === 'status' && <ArrowUpDown className="w-3 h-3" />}</div>
                    </TableHead>
                  )}
                  {visibleColumns.assigned_to && (
                    <TableHead className="dark:text-slate-300">
                      <div className="flex items-center gap-1"><UserCheck className="w-3 h-3" />Назначен</div>
                    </TableHead>
                  )}
                  {visibleColumns.mtta && <TableHead className="dark:text-slate-300">MTTA</TableHead>}
                  {visibleColumns.mttr && <TableHead className="dark:text-slate-300">MTTR</TableHead>}
                  {visibleColumns.mttc && <TableHead className="dark:text-slate-300">MTTC</TableHead>}
                  {visibleColumns.detected_by && (
                    <TableHead onClick={() => handleSort('detected_by')} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-1">Обнаружил {sortBy === 'detected_by' && <ArrowUpDown className="w-3 h-3" />}</div>
                    </TableHead>
                  )}
                  {visibleColumns.description && <TableHead className="dark:text-slate-300">Описание</TableHead>}
                  {visibleColumns.measures && <TableHead className="dark:text-slate-300">Меры</TableHead>}
                  <TableHead className="dark:text-slate-300">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIncidents.map((incident) => (
                  <TableRow
                    key={incident.id}
                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:border-slate-700"
                    onClick={() => handleView(incident)}
                  >
                    {visibleColumns.incident_number && (
                      <TableCell className="font-mono font-semibold text-cyan-600 dark:text-cyan-400">
                        {incident.incident_number}
                      </TableCell>
                    )}
                    {visibleColumns.incident_time && (
                      <TableCell className="text-sm dark:text-slate-300 whitespace-nowrap">{fmtDT(incident.incident_time)}</TableCell>
                    )}
                    {visibleColumns.violator && <TableCell className="dark:text-slate-300">{incident.violator || '—'}</TableCell>}
                    {visibleColumns.system && <TableCell className="dark:text-slate-300">{incident.system || '—'}</TableCell>}
                    {visibleColumns.incident_type && <TableCell className="dark:text-slate-300">{incident.incident_type || '—'}</TableCell>}
                    {visibleColumns.criticality && (
                      <TableCell><Badge className={getCriticalityColor(incident.criticality)}>{incident.criticality}</Badge></TableCell>
                    )}
                    {visibleColumns.status && (
                      <TableCell><Badge className={getStatusColor(incident.status)}>{incident.status}</Badge></TableCell>
                    )}
                    {visibleColumns.assigned_to && (
                      <TableCell className="text-sm dark:text-slate-300 max-w-[140px]">
                        <span className="truncate block">{getAssignedNames(incident.assigned_to)}</span>
                      </TableCell>
                    )}
                    {visibleColumns.mtta && <TableCell className="dark:text-slate-300">{incident.mtta ? `${(incident.mtta / 60).toFixed(2)}ч` : '—'}</TableCell>}
                    {visibleColumns.mttr && <TableCell className="dark:text-slate-300">{incident.mttr ? `${(incident.mttr / 60).toFixed(2)}ч` : '—'}</TableCell>}
                    {visibleColumns.mttc && <TableCell className="dark:text-slate-300">{incident.mttc ? `${(incident.mttc / 60).toFixed(2)}ч` : '—'}</TableCell>}
                    {visibleColumns.detected_by && <TableCell className="dark:text-slate-300">{incident.detected_by || '—'}</TableCell>}
                    {visibleColumns.description && <TableCell className="max-w-xs truncate dark:text-slate-300">{incident.description}</TableCell>}
                    {visibleColumns.measures && <TableCell className="max-w-xs truncate dark:text-slate-300">{incident.measures}</TableCell>}
                    <TableCell onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleView(incident)} className="h-8 w-8 p-0" title="Просмотр">
                          <Eye className="w-4 h-4 text-cyan-600" />
                        </Button>
                        {canEdit(incident) && (
                          <Button size="sm" variant="ghost" onClick={e => handleEdit(incident, e)} className="h-8 w-8 p-0" title="Редактировать">
                            <Edit className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                          </Button>
                        )}
                        {isAdmin && (
                          <Button size="sm" variant="ghost" onClick={e => handleDelete(incident.id, e)} className="h-8 w-8 p-0" title="Удалить">
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredIncidents.length === 0 && !loading && (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Инциденты не найдены</p>
            </div>
          )}

          {/* Pagination bottom */}
          <div className="flex justify-between items-center mt-4 pt-4 border-t dark:border-slate-700 gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-sm dark:text-slate-400">Показать:</Label>
              <Select value={limit.toString()} onValueChange={v => { setLimit(Number(v)); setPage(1); }}>
                <SelectTrigger className="w-24 dark:bg-slate-700 dark:border-slate-600"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[10, 20, 30, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="text-sm text-slate-600 dark:text-slate-400">Всего: {total}</span>
            </div>
            <Pagination />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Incidents;
