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
import { Plus, Search, Edit, Trash2, Clock, Timer, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';

const Incidents = ({ user }) => {
  const [incidents, setIncidents] = useState([]);
  const [filteredIncidents, setFilteredIncidents] = useState([]);
  const [settings, setSettings] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [formData, setFormData] = useState({
    incident_number: '',
    incident_time: new Date().toISOString().slice(0, 16),
    detection_time: new Date().toISOString().slice(0, 16),
    reaction_start_time: '',
    violator: '',
    subject_type: '',
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
    fetchSettings();
    fetchIncidents();
    fetchMetrics();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [incidents, searchTerm, filterStatus]);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings`);
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchIncidents = async () => {
    try {
      const response = await axios.get(`${API}/incidents`);
      setIncidents(response.data);
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

  const applyFilters = () => {
    let filtered = [...incidents];

    if (searchTerm) {
      filtered = filtered.filter(
        (incident) =>
          incident.incident_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (incident.violator && incident.violator.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (incident.incident_type && incident.incident_type.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter((incident) => incident.status === filterStatus);
    }

    setFilteredIncidents(filtered);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        incident_time: new Date(formData.incident_time).toISOString(),
        detection_time: new Date(formData.detection_time).toISOString(),
        reaction_start_time: formData.reaction_start_time ? new Date(formData.reaction_start_time).toISOString() : null,
      };

      if (editingIncident) {
        await axios.put(`${API}/incidents/${editingIncident.id}`, payload);
        toast.success('Инцидент обновлен');
      } else {
        await axios.post(`${API}/incidents`, payload);
        toast.success('Инцидент создан');
      }
      setDialogOpen(false);
      resetForm();
      fetchIncidents();
      fetchMetrics();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка при сохранении');
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
      toast.error('Ошибка при удалении');
    }
  };

  const handleEdit = (incident) => {
    setEditingIncident(incident);
    setFormData({
      incident_number: incident.incident_number,
      incident_time: new Date(incident.incident_time).toISOString().slice(0, 16),
      detection_time: new Date(incident.detection_time).toISOString().slice(0, 16),
      reaction_start_time: incident.reaction_start_time ? new Date(incident.reaction_start_time).toISOString().slice(0, 16) : '',
      violator: incident.violator || '',
      subject_type: incident.subject_type || '',
      login: incident.login || '',
      system: incident.system || '',
      incident_type: incident.incident_type || '',
      detection_source: incident.detection_source || '',
      criticality: incident.criticality,
      detected_by: incident.detected_by || '',
      status: incident.status,
      description: incident.description || '',
      measures: incident.measures || '',
      is_repeat: incident.is_repeat,
      comment: incident.comment || '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingIncident(null);
    setFormData({
      incident_number: '',
      incident_time: new Date().toISOString().slice(0, 16),
      detection_time: new Date().toISOString().slice(0, 16),
      reaction_start_time: '',
      violator: '',
      subject_type: '',
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

  const getCriticalityColor = (criticality) => {
    switch (criticality) {
      case 'Высокая':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'Средняя':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Низкая':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Открыт':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Закрыт':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Реестр инцидентов</h1>
          <p className="text-slate-600">Управление инцидентами информационной безопасности</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={resetForm}
              data-testid="create-incident-button"
              className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white gap-2"
            >
              <Plus className="w-4 h-4" />
              Создать инцидент
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingIncident ? 'Редактировать инцидент' : 'Создать новый инцидент'}</DialogTitle>
              <DialogDescription>
                Заполните информацию об инциденте информационной безопасности
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>№ инцидента</Label>
                  <Input
                    data-testid="incident-number-input"
                    value={formData.incident_number}
                    onChange={(e) => setFormData({ ...formData, incident_number: e.target.value })}
                    placeholder="INC00001"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Критичность</Label>
                  <Select value={formData.criticality} onValueChange={(v) => setFormData({ ...formData, criticality: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Низкая">Низкая</SelectItem>
                      <SelectItem value="Средняя">Средняя</SelectItem>
                      <SelectItem value="Высокая">Высокая</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Время инцидента</Label>
                  <Input
                    type="datetime-local"
                    value={formData.incident_time}
                    onChange={(e) => setFormData({ ...formData, incident_time: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Время обнаружения</Label>
                  <Input
                    type="datetime-local"
                    value={formData.detection_time}
                    onChange={(e) => setFormData({ ...formData, detection_time: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Время начала реакции</Label>
                  <Input
                    type="datetime-local"
                    value={formData.reaction_start_time}
                    onChange={(e) => setFormData({ ...formData, reaction_start_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Нарушитель</Label>
                  <Input
                    value={formData.violator}
                    onChange={(e) => setFormData({ ...formData, violator: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Логин</Label>
                  <Input
                    value={formData.login}
                    onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Тип субъекта</Label>
                  <Select value={formData.subject_type} onValueChange={(v) => setFormData({ ...formData, subject_type: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите тип" />
                    </SelectTrigger>
                    <SelectContent>
                      {settings?.subject_types?.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Система</Label>
                  <Select value={formData.system} onValueChange={(v) => setFormData({ ...formData, system: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите систему" />
                    </SelectTrigger>
                    <SelectContent>
                      {settings?.systems?.map((sys) => (
                        <SelectItem key={sys} value={sys}>{sys}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Тип инцидента</Label>
                  <Input
                    value={formData.incident_type}
                    onChange={(e) => setFormData({ ...formData, incident_type: e.target.value })}
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Выявил (ФИО)</Label>
                  <Input
                    value={formData.detected_by}
                    onChange={(e) => setFormData({ ...formData, detected_by: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Статус</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Открыт">Открыт</SelectItem>
                      <SelectItem value="Закрыт">Закрыт</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Описание</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Меры</Label>
                <Textarea
                  value={formData.measures}
                  onChange={(e) => setFormData({ ...formData, measures: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Повтор</Label>
                  <Select value={formData.is_repeat ? 'yes' : 'no'} onValueChange={(v) => setFormData({ ...formData, is_repeat: v === 'yes' })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">Нет</SelectItem>
                      <SelectItem value="yes">Да</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Комментарий</Label>
                  <Input
                    value={formData.comment}
                    onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Отмена
                </Button>
                <Button type="submit" data-testid="incident-submit-button" className="bg-gradient-to-r from-cyan-500 to-cyan-600">
                  {editingIncident ? 'Обновить' : 'Создать'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">MTTA</CardTitle>
              <div className="p-2 rounded-lg bg-blue-50">
                <Clock className="w-5 h-5 text-blue-700" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
                {metrics.avg_mtta ? `${metrics.avg_mtta} мин` : 'N/A'}
              </div>
              <p className="text-xs text-slate-500 mt-1">Среднее время обнаружения</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">MTTR</CardTitle>
              <div className="p-2 rounded-lg bg-teal-50">
                <Timer className="w-5 h-5 text-teal-700" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-r from-teal-500 to-teal-600 bg-clip-text text-transparent">
                {metrics.avg_mttr ? `${metrics.avg_mttr} мин` : 'N/A'}
              </div>
              <p className="text-xs text-slate-500 mt-1">Среднее время реакции</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">MTTC</CardTitle>
              <div className="p-2 rounded-lg bg-emerald-50">
                <CheckCircle2 className="w-5 h-5 text-emerald-700" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent">
                {metrics.avg_mttc ? `${metrics.avg_mttc} мин` : 'N/A'}
              </div>
              <p className="text-xs text-slate-500 mt-1">Среднее время закрытия</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                data-testid="incident-search-input"
                placeholder="Поиск по номеру, нарушителю, типу..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger data-testid="filter-incident-status-select">
                <SelectValue placeholder="Все статусы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="Открыт">Открыт</SelectItem>
                <SelectItem value="Закрыт">Закрыт</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>№</TableHead>
                  <TableHead>Нарушитель</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Критичность</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>MTTA</TableHead>
                  <TableHead>MTTR</TableHead>
                  <TableHead>MTTC</TableHead>
                  <TableHead>Выявил</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIncidents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-slate-500">
                      Инциденты не найдены
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredIncidents.map((incident) => (
                    <TableRow key={incident.id} data-testid={`incident-row-${incident.id}`} className="hover:bg-slate-50">
                      <TableCell className="font-medium">{incident.incident_number}</TableCell>
                      <TableCell className="text-sm text-slate-700">{incident.violator || '-'}</TableCell>
                      <TableCell className="text-sm text-slate-700">{incident.incident_type || '-'}</TableCell>
                      <TableCell>
                        <Badge className={getCriticalityColor(incident.criticality)} variant="outline">
                          {incident.criticality}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(incident.status)} variant="outline">
                          {incident.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-700 text-center">
                        {incident.mtta ? `${incident.mtta} мин` : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-slate-700 text-center">
                        {incident.mttr ? `${incident.mttr} мин` : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-slate-700 text-center">
                        {incident.mttc ? `${incident.mttc} мин` : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-slate-700">{incident.detected_by || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            data-testid={`edit-incident-${incident.id}`}
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(incident)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            data-testid={`delete-incident-${incident.id}`}
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(incident.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Incidents;
