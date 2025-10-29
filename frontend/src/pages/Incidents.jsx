import { useState, useEffect } from 'react';
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
import { Plus, Trash2, Download, Settings, Clock, Timer, CheckCircle2, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, Eye, Edit, X } from 'lucide-react';
import { toast } from 'sonner';

const Incidents = ({ user }) => {
  const [incidents, setIncidents] = useState([]);
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

  // Выбор столбцов для отображения
  const [visibleColumns, setVisibleColumns] = useState({
    incident_number: true,
    incident_time: true,
    violator: true,
    system: true,
    incident_type: true,
    criticality: true,
    status: true,
    mtta: true,
    mttr: true,
    mttc: true,
    detected_by: true,
    description: false,
    measures: false,
    comment: false,
  });

  const [showColumnSelector, setShowColumnSelector] = useState(false);

  const [formData, setFormData] = useState({
    incident_time: '',
    detection_time: '',
    reaction_start_time: '',
    closed_at: '',
    violator: '',
    subject_type: 'Сотрудник',
    login: '',
    system: '',
    incident_type: '',
    detection_source: '',
    criticality: 'Средняя',
    detected_by: user?.full_name || '',
    status: 'Открыт',
    description: '',
    measures: '',
    is_repeat: false,
    comment: '',
  });

  useEffect(() => {
    fetchMetrics();
    // Load visible columns from localStorage
    const savedColumns = localStorage.getItem('incidents_visible_columns');
    if (savedColumns) {
      setVisibleColumns(JSON.parse(savedColumns));
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
  }, [page, limit, sortBy, sortOrder]);

  useEffect(() => {
    // Save visible columns to localStorage
    localStorage.setItem('incidents_visible_columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const fetchIncidents = async () => {
    try {
      const response = await axios.get(`${API}/incidents`, {
        params: { page, limit, sort_by: sortBy, sort_order: sortOrder }
      });
      setIncidents(response.data.items);
      setTotal(response.data.total);
      setTotalPages(response.data.total_pages);
    } catch (error) {
      toast.error('Ошибка загрузки инцидентов');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await axios.get(`${API}/incidents/metrics/summary`);
      setMetrics(response.data);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingIncident) {
        await axios.put(`${API}/incidents/${editingIncident.id}`, formData);
        toast.success('Инцидент обновлен');
      } else {
        await axios.post(`${API}/incidents`, formData);
        toast.success('Инцидент создан');
      }
      setDialogOpen(false);
      resetForm();
      fetchIncidents();
      fetchMetrics();
    } catch (error) {
      toast.error('Ошибка сохранения инцидента');
    }
  };

  const handleView = (incident) => {
    setViewingIncident(incident);
    setViewDialogOpen(true);
  };

  const handleEditFromView = () => {
    setEditingIncident(viewingIncident);
    setFormData(viewingIncident);
    setViewDialogOpen(false);
    setDialogOpen(true);
  };

  const handleDeleteFromView = async () => {
    if (!window.confirm('Удалить инцидент?')) return;
    try {
      await axios.delete(`${API}/incidents/${viewingIncident.id}`);
      toast.success('Инцидент удален');
      setViewDialogOpen(false);
      fetchIncidents();
      fetchMetrics();
    } catch (error) {
      toast.error('Ошибка удаления');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить инцидент?')) return;
    try {
      await axios.delete(`${API}/incidents/${id}`);
      toast.success('Инцидент удален');
      fetchIncidents();
      fetchMetrics();
    } catch (error) {
      toast.error('Ошибка удаления');
    }
  };

  const handleEdit = (incident) => {
    setEditingIncident(incident);
    setFormData(incident);
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingIncident(null);
    setFormData({
      incident_time: '',
      detection_time: '',
      reaction_start_time: '',
      closed_at: '',
      violator: '',
      subject_type: 'Сотрудник',
      login: '',
      system: '',
      incident_type: '',
      detection_source: '',
      criticality: 'Средняя',
      detected_by: user?.full_name || '',
      status: 'Открыт',
      description: '',
      measures: '',
      is_repeat: false,
      comment: '',
    });
  };

  // Экспорт в CSV
  const exportToCSV = () => {
    const filteredData = getFilteredIncidents();
    if (filteredData.length === 0) {
      toast.error('Нет данных для экспорта');
      return;
    }

    const headers = Object.keys(visibleColumns)
      .filter(key => visibleColumns[key])
      .map(key => columnNames[key] || key);

    const rows = filteredData.map(incident => {
      return Object.keys(visibleColumns)
        .filter(key => visibleColumns[key])
        .map(key => {
          if (key === 'mtta' || key === 'mttr' || key === 'mttc') {
            return incident[key] ? `${(incident[key] / 60).toFixed(2)}ч` : 'N/A';
          }
          if (key === 'incident_time' || key === 'detection_time') {
            return incident[key] ? new Date(incident[key]).toLocaleString('ru-RU', { 
              year: 'numeric', 
              month: '2-digit', 
              day: '2-digit', 
              hour: '2-digit', 
              minute: '2-digit' 
            }) : '';
          }
          return incident[key] || '';
        });
    });

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

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
    mtta: 'MTTA (ч)',
    mttr: 'MTTR (ч)',
    mttc: 'MTTC (ч)',
    detected_by: 'Обнаружил',
    description: 'Описание',
    measures: 'Меры',
    comment: 'Комментарий',
  };

  const getFilteredIncidents = () => {
    return incidents.filter(incident => {
      const matchesSearch = !searchTerm || 
        Object.values(incident).some(val => 
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        );
      
      const matchesStatus = statusFilter === 'Все' || incident.status === statusFilter;
      const matchesCriticality = criticalityFilter === 'Все' || incident.criticality === criticalityFilter;
      const matchesDetectedBy = !detectedByFilter || incident.detected_by?.toLowerCase().includes(detectedByFilter.toLowerCase());
      const matchesViolator = !violatorFilter || incident.violator?.toLowerCase().includes(violatorFilter.toLowerCase());
      const matchesSystem = !systemFilter || incident.system?.toLowerCase().includes(systemFilter.toLowerCase());
      
      const matchesDateFrom = !dateFrom || new Date(incident.incident_time) >= new Date(dateFrom);
      const matchesDateTo = !dateTo || new Date(incident.incident_time) <= new Date(dateTo);

      return matchesSearch && matchesStatus && matchesCriticality && matchesDetectedBy && 
             matchesViolator && matchesSystem && matchesDateFrom && matchesDateTo;
    });
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('Все');
    setCriticalityFilter('Все');
    setDetectedByFilter('');
    setViolatorFilter('');
    setSystemFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setPage(1); // Reset to first page on sort
  };

  const getCriticalityColor = (criticality) => {
    switch (criticality) {
      case 'Высокая': return 'bg-red-100 text-red-800';
      case 'Средняя': return 'bg-yellow-100 text-yellow-800';
      case 'Низкая': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    return status === 'Открыт' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Инциденты ИБ</h1>
          <p className="text-slate-600">Управление инцидентами информационной безопасности</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-cyan-600 hover:bg-cyan-700">
              <Plus className="w-4 h-4 mr-2" />
              Добавить инцидент
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingIncident ? 'Редактировать инцидент' : 'Новый инцидент'}</DialogTitle>
              <DialogDescription>Заполните информацию об инциденте ИБ</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Время инцидента *</Label>
                  <Input
                    type="datetime-local"
                    value={formData.incident_time}
                    onChange={(e) => setFormData({ ...formData, incident_time: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Время обнаружения *</Label>
                  <Input
                    type="datetime-local"
                    value={formData.detection_time}
                    onChange={(e) => setFormData({ ...formData, detection_time: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Начало реакции</Label>
                  <Input
                    type="datetime-local"
                    value={formData.reaction_start_time}
                    onChange={(e) => setFormData({ ...formData, reaction_start_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Время закрытия</Label>
                  <Input
                    type="datetime-local"
                    value={formData.closed_at}
                    onChange={(e) => setFormData({ ...formData, closed_at: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Нарушитель *</Label>
                  <Input
                    value={formData.violator}
                    onChange={(e) => setFormData({ ...formData, violator: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Тип субъекта</Label>
                  <Select value={formData.subject_type} onValueChange={(value) => setFormData({ ...formData, subject_type: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Сотрудник">Сотрудник</SelectItem>
                      <SelectItem value="Подрядчик">Подрядчик</SelectItem>
                      <SelectItem value="Внешний">Внешний</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Логин</Label>
                  <Input
                    value={formData.login}
                    onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Система *</Label>
                  <Input
                    value={formData.system}
                    onChange={(e) => setFormData({ ...formData, system: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Тип инцидента *</Label>
                  <Input
                    value={formData.incident_type}
                    onChange={(e) => setFormData({ ...formData, incident_type: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Источник выявления</Label>
                  <Input
                    value={formData.detection_source}
                    onChange={(e) => setFormData({ ...formData, detection_source: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Критичность</Label>
                  <Select value={formData.criticality} onValueChange={(value) => setFormData({ ...formData, criticality: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Высокая">Высокая</SelectItem>
                      <SelectItem value="Средняя">Средняя</SelectItem>
                      <SelectItem value="Низкая">Низкая</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Обнаружил</Label>
                  <Input
                    value={formData.detected_by}
                    onChange={(e) => setFormData({ ...formData, detected_by: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Статус</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Открыт">Открыт</SelectItem>
                      <SelectItem value="Закрыт">Закрыт</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Описание инцидента</Label>
                <textarea
                  className="w-full border rounded p-2 min-h-[80px]"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Принятые меры</Label>
                <textarea
                  className="w-full border rounded p-2 min-h-[80px]"
                  value={formData.measures}
                  onChange={(e) => setFormData({ ...formData, measures: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Комментарий</Label>
                <textarea
                  className="w-full border rounded p-2 min-h-[60px]"
                  value={formData.comment}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={formData.is_repeat}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_repeat: checked })}
                />
                <Label>Повторный инцидент</Label>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
                <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700">Сохранить</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Просмотр инцидента</DialogTitle>
              <DialogDescription>Подробная информация об инциденте</DialogDescription>
            </DialogHeader>
            {viewingIncident && (
              <div className="space-y-6">
                {/* Основная информация */}
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-sm text-slate-700 mb-3">Основная информация</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">Номер инцидента:</span>
                      <p className="text-sm mt-1">{viewingIncident.incident_number}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">Статус:</span>
                      <p className="text-sm mt-1">{viewingIncident.status}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">Критичность:</span>
                      <p className="text-sm mt-1">{viewingIncident.criticality}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">Тип инцидента:</span>
                      <p className="text-sm mt-1">{viewingIncident.incident_type || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Временные метки */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-sm text-slate-700 mb-3">Временные данные</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">Время инцидента:</span>
                      <p className="text-sm mt-1">{viewingIncident.incident_time ? new Date(viewingIncident.incident_time).toLocaleString('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">Время обнаружения:</span>
                      <p className="text-sm mt-1">{viewingIncident.detection_time ? new Date(viewingIncident.detection_time).toLocaleString('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">Время начала реакции:</span>
                      <p className="text-sm mt-1">{viewingIncident.reaction_start_time ? new Date(viewingIncident.reaction_start_time).toLocaleString('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">Время закрытия:</span>
                      <p className="text-sm mt-1">{viewingIncident.closed_at ? new Date(viewingIncident.closed_at).toLocaleString('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Участники и системы */}
                <div className="bg-amber-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-sm text-slate-700 mb-3">Участники и системы</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">Нарушитель:</span>
                      <p className="text-sm mt-1">{viewingIncident.violator || '-'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">Тип субъекта:</span>
                      <p className="text-sm mt-1">{viewingIncident.subject_type || '-'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">Логин:</span>
                      <p className="text-sm mt-1">{viewingIncident.login || '-'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">Система:</span>
                      <p className="text-sm mt-1">{viewingIncident.system || '-'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">Источник обнаружения:</span>
                      <p className="text-sm mt-1">{viewingIncident.detection_source || '-'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">Обнаружил:</span>
                      <p className="text-sm mt-1">{viewingIncident.detected_by || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Метрики */}
                {(viewingIncident.mtta || viewingIncident.mttr || viewingIncident.mttc) && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-sm text-slate-700 mb-3">Метрики</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <span className="text-xs font-semibold text-slate-500 uppercase">MTTA (Время подтверждения):</span>
                        <p className="text-sm mt-1">{viewingIncident.mtta ? `${(viewingIncident.mtta / 60).toFixed(2)} ч` : '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-500 uppercase">MTTR (Время реакции):</span>
                        <p className="text-sm mt-1">{viewingIncident.mttr ? `${(viewingIncident.mttr / 60).toFixed(2)} ч` : '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-500 uppercase">MTTC (Время закрытия):</span>
                        <p className="text-sm mt-1">{viewingIncident.mttc ? `${(viewingIncident.mttc / 60).toFixed(2)} ч` : '-'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Описание и меры */}
                {(viewingIncident.description || viewingIncident.measures || viewingIncident.comment) && (
                  <div className="space-y-3">
                    {viewingIncident.description && (
                      <div className="bg-white border border-slate-200 p-4 rounded-lg">
                        <span className="text-xs font-semibold text-slate-500 uppercase">Описание:</span>
                        <p className="text-sm mt-2 whitespace-pre-wrap">{viewingIncident.description}</p>
                      </div>
                    )}
                    {viewingIncident.measures && (
                      <div className="bg-white border border-slate-200 p-4 rounded-lg">
                        <span className="text-xs font-semibold text-slate-500 uppercase">Принятые меры:</span>
                        <p className="text-sm mt-2 whitespace-pre-wrap">{viewingIncident.measures}</p>
                      </div>
                    )}
                    {viewingIncident.comment && (
                      <div className="bg-white border border-slate-200 p-4 rounded-lg">
                        <span className="text-xs font-semibold text-slate-500 uppercase">Комментарий:</span>
                        <p className="text-sm mt-2 whitespace-pre-wrap">{viewingIncident.comment}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Дополнительная информация */}
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-sm text-slate-700 mb-3">Дополнительно</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">Повторный инцидент:</span>
                      <p className="text-sm mt-1">{viewingIncident.is_repeat ? 'Да' : 'Нет'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">Дата создания:</span>
                      <p className="text-sm mt-1">{viewingIncident.created_at ? new Date(viewingIncident.created_at).toLocaleString('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleDeleteFromView} title="Удалить">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" onClick={handleEditFromView} title="Редактировать">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" onClick={() => setViewDialogOpen(false)} title="Закрыть">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Метрики */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">MTTA (Среднее время подтверждения)</CardTitle>
            <Clock className="w-5 h-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {metrics?.avg_mtta ? `${metrics.avg_mtta}ч` : 'N/A'}
            </div>
            <p className="text-xs text-slate-500 mt-1">Mean Time To Acknowledge</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">MTTR (Среднее время решения)</CardTitle>
            <Timer className="w-5 h-5 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-600">
              {metrics?.avg_mttr ? `${metrics.avg_mttr}ч` : 'N/A'}
            </div>
            <p className="text-xs text-slate-500 mt-1">Mean Time To Resolve</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">MTTC (Среднее время закрытия)</CardTitle>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {metrics?.avg_mttc ? `${metrics.avg_mttc}ч` : 'N/A'}
            </div>
            <p className="text-xs text-slate-500 mt-1">Mean Time To Close</p>
          </CardContent>
        </Card>
      </div>

      {/* Фильтры и управление */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Фильтры {showFilters ? '▲' : '▼'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowColumnSelector(!showColumnSelector)}
              >
                <Settings className="w-4 h-4 mr-2" />
                Столбцы
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
              >
                <Download className="w-4 h-4 mr-2" />
                Экспорт CSV
              </Button>
            </div>

            {showFilters && (
              <Card className="p-4 bg-slate-50">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Статус</Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Все статусы" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Все">Все статусы</SelectItem>
                          <SelectItem value="Открыт">Открыт</SelectItem>
                          <SelectItem value="Закрыт">Закрыт</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Критичность</Label>
                      <Select value={criticalityFilter} onValueChange={setCriticalityFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Все" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Все">Все</SelectItem>
                          <SelectItem value="Высокая">Высокая</SelectItem>
                          <SelectItem value="Средняя">Средняя</SelectItem>
                          <SelectItem value="Низкая">Низкая</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Обнаружил</Label>
                      <Input
                        placeholder="Введите имя..."
                        value={detectedByFilter}
                        onChange={(e) => setDetectedByFilter(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Нарушитель</Label>
                      <Input
                        placeholder="Введите имя..."
                        value={violatorFilter}
                        onChange={(e) => setViolatorFilter(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Система</Label>
                      <Input
                        placeholder="Введите систему..."
                        value={systemFilter}
                        onChange={(e) => setSystemFilter(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Общий поиск</Label>
                      <Input
                        placeholder="Поиск..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Дата от:</Label>
                      <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Дата до:</Label>
                      <Input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={resetFilters}
                        className="w-full"
                      >
                        Сбросить фильтры
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {showColumnSelector && (
              <Card className="p-4 bg-slate-50">
                <h3 className="font-semibold mb-3 text-sm">Выберите столбцы для отображения:</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.keys(columnNames).map(key => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        checked={visibleColumns[key]}
                        onCheckedChange={(checked) => 
                          setVisibleColumns({ ...visibleColumns, [key]: checked })
                        }
                      />
                      <Label className="text-sm cursor-pointer">{columnNames[key]}</Label>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Таблица */}
      <Card>
        <CardContent className="pt-6">
          {/* Pagination controls */}
          <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-sm">Показать:</Label>
              <Select value={limit.toString()} onValueChange={(val) => { setLimit(Number(val)); setPage(1); }}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="30">30</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-slate-600">Всего: {total}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setPage(1)} 
                disabled={page === 1}
              >
                <ChevronsLeft className="w-4 h-4" />
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setPage(page - 1)} 
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm px-2">
                Страница {page} из {totalPages}
              </span>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setPage(page + 1)} 
                disabled={page === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setPage(totalPages)} 
                disabled={page === totalPages}
              >
                <ChevronsRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {visibleColumns.incident_number && (
                    <TableHead onClick={() => handleSort('incident_number')} className="cursor-pointer hover:bg-slate-50">
                      <div className="flex items-center gap-1">
                        Номер
                        {sortBy === 'incident_number' && <ArrowUpDown className="w-3 h-3" />}
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.incident_time && (
                    <TableHead onClick={() => handleSort('incident_time')} className="cursor-pointer hover:bg-slate-50">
                      <div className="flex items-center gap-1">
                        Время
                        {sortBy === 'incident_time' && <ArrowUpDown className="w-3 h-3" />}
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.violator && (
                    <TableHead onClick={() => handleSort('violator')} className="cursor-pointer hover:bg-slate-50">
                      <div className="flex items-center gap-1">
                        Нарушитель
                        {sortBy === 'violator' && <ArrowUpDown className="w-3 h-3" />}
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.system && (
                    <TableHead onClick={() => handleSort('system')} className="cursor-pointer hover:bg-slate-50">
                      <div className="flex items-center gap-1">
                        Система
                        {sortBy === 'system' && <ArrowUpDown className="w-3 h-3" />}
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.incident_type && (
                    <TableHead onClick={() => handleSort('incident_type')} className="cursor-pointer hover:bg-slate-50">
                      <div className="flex items-center gap-1">
                        Тип
                        {sortBy === 'incident_type' && <ArrowUpDown className="w-3 h-3" />}
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.criticality && (
                    <TableHead onClick={() => handleSort('criticality')} className="cursor-pointer hover:bg-slate-50">
                      <div className="flex items-center gap-1">
                        Критичность
                        {sortBy === 'criticality' && <ArrowUpDown className="w-3 h-3" />}
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.status && (
                    <TableHead onClick={() => handleSort('status')} className="cursor-pointer hover:bg-slate-50">
                      <div className="flex items-center gap-1">
                        Статус
                        {sortBy === 'status' && <ArrowUpDown className="w-3 h-3" />}
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.mtta && (
                    <TableHead onClick={() => handleSort('mtta')} className="cursor-pointer hover:bg-slate-50">
                      <div className="flex items-center gap-1">
                        MTTA (ч)
                        {sortBy === 'mtta' && <ArrowUpDown className="w-3 h-3" />}
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.mttr && (
                    <TableHead onClick={() => handleSort('mttr')} className="cursor-pointer hover:bg-slate-50">
                      <div className="flex items-center gap-1">
                        MTTR (ч)
                        {sortBy === 'mttr' && <ArrowUpDown className="w-3 h-3" />}
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.mttc && (
                    <TableHead onClick={() => handleSort('mttc')} className="cursor-pointer hover:bg-slate-50">
                      <div className="flex items-center gap-1">
                        MTTC (ч)
                        {sortBy === 'mttc' && <ArrowUpDown className="w-3 h-3" />}
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.detected_by && (
                    <TableHead onClick={() => handleSort('detected_by')} className="cursor-pointer hover:bg-slate-50">
                      <div className="flex items-center gap-1">
                        Обнаружил
                        {sortBy === 'detected_by' && <ArrowUpDown className="w-3 h-3" />}
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.description && <TableHead>Описание</TableHead>}
                  {visibleColumns.measures && <TableHead>Меры</TableHead>}
                  {visibleColumns.comment && <TableHead>Комментарий</TableHead>}
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getFilteredIncidents().map((incident) => (
                  <TableRow 
                    key={incident.id} 
                    className="cursor-pointer hover:bg-slate-50" 
                    onClick={() => handleView(incident)}
                  >
                    {visibleColumns.incident_number && <TableCell className="font-medium">{incident.incident_number}</TableCell>}
                    {visibleColumns.incident_time && <TableCell>{new Date(incident.incident_time).toLocaleString('ru-RU', { 
                      year: 'numeric', 
                      month: '2-digit', 
                      day: '2-digit', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}</TableCell>}
                    {visibleColumns.violator && <TableCell>{incident.violator}</TableCell>}
                    {visibleColumns.system && <TableCell>{incident.system}</TableCell>}
                    {visibleColumns.incident_type && <TableCell>{incident.incident_type}</TableCell>}
                    {visibleColumns.criticality && (
                      <TableCell>
                        <Badge className={getCriticalityColor(incident.criticality)}>{incident.criticality}</Badge>
                      </TableCell>
                    )}
                    {visibleColumns.status && (
                      <TableCell>
                        <Badge className={getStatusColor(incident.status)}>{incident.status}</Badge>
                      </TableCell>
                    )}
                    {visibleColumns.mtta && <TableCell>{incident.mtta ? `${(incident.mtta / 60).toFixed(2)}ч` : 'N/A'}</TableCell>}
                    {visibleColumns.mttr && <TableCell>{incident.mttr ? `${(incident.mttr / 60).toFixed(2)}ч` : 'N/A'}</TableCell>}
                    {visibleColumns.mttc && <TableCell>{incident.mttc ? `${(incident.mttc / 60).toFixed(2)}ч` : 'N/A'}</TableCell>}
                    {visibleColumns.detected_by && <TableCell>{incident.detected_by}</TableCell>}
                    {visibleColumns.description && <TableCell className="max-w-xs truncate">{incident.description}</TableCell>}
                    {visibleColumns.measures && <TableCell className="max-w-xs truncate">{incident.measures}</TableCell>}
                    {visibleColumns.comment && <TableCell className="max-w-xs truncate">{incident.comment}</TableCell>}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleView(incident)} className="h-8 w-8 p-0" title="Просмотр">
                          <Eye className="w-4 h-4 text-cyan-600" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(incident)} className="h-8 w-8 p-0" title="Редактировать">
                          <Edit className="w-4 h-4 text-slate-600" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(incident.id)} className="h-8 w-8 p-0" title="Удалить">
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {getFilteredIncidents().length === 0 && !loading && (
            <div className="text-center py-8 text-slate-500">Нет инцидентов</div>
          )}
          
          {/* Pagination controls bottom */}
          <div className="flex justify-between items-center mt-4 gap-4 flex-wrap border-t pt-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm">Показать:</Label>
              <Select value={limit.toString()} onValueChange={(val) => { setLimit(Number(val)); setPage(1); }}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="30">30</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-slate-600">Всего: {total}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setPage(1)} 
                disabled={page === 1}
              >
                <ChevronsLeft className="w-4 h-4" />
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setPage(page - 1)} 
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm px-2">
                Страница {page} из {totalPages}
              </span>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setPage(page + 1)} 
                disabled={page === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setPage(totalPages)} 
                disabled={page === totalPages}
              >
                <ChevronsRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Incidents;