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
import { Plus, Trash2, Download, Settings, Clock, Timer, CheckCircle2, Filter } from 'lucide-react';
import { toast } from 'sonner';

const Incidents = ({ user }) => {
  const [incidents, setIncidents] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState(null);
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
            return incident[key] ? new Date(incident[key]).toLocaleString('ru-RU') : '';
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {visibleColumns.incident_number && <TableHead>Номер</TableHead>}
                  {visibleColumns.incident_time && <TableHead>Время</TableHead>}
                  {visibleColumns.violator && <TableHead>Нарушитель</TableHead>}
                  {visibleColumns.system && <TableHead>Система</TableHead>}
                  {visibleColumns.incident_type && <TableHead>Тип</TableHead>}
                  {visibleColumns.criticality && <TableHead>Критичность</TableHead>}
                  {visibleColumns.status && <TableHead>Статус</TableHead>}
                  {visibleColumns.mtta && <TableHead>MTTA (ч)</TableHead>}
                  {visibleColumns.mttr && <TableHead>MTTR (ч)</TableHead>}
                  {visibleColumns.mttc && <TableHead>MTTC (ч)</TableHead>}
                  {visibleColumns.detected_by && <TableHead>Обнаружил</TableHead>}
                  {visibleColumns.description && <TableHead>Описание</TableHead>}
                  {visibleColumns.measures && <TableHead>Меры</TableHead>}
                  {visibleColumns.comment && <TableHead>Комментарий</TableHead>}
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getFilteredIncidents().map((incident) => (
                  <TableRow key={incident.id}>
                    {visibleColumns.incident_number && <TableCell className="font-medium">{incident.incident_number}</TableCell>}
                    {visibleColumns.incident_time && <TableCell>{new Date(incident.incident_time).toLocaleString('ru-RU')}</TableCell>}
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
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(incident)}>Изменить</Button>
                        <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleDelete(incident.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {getFilteredIncidents().length === 0 && (
            <div className="text-center py-8 text-slate-500">Нет инцидентов</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Incidents;