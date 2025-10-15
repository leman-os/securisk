import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';

const Incidents = ({ user }) => {
  const [incidents, setIncidents] = useState([]);
  const [filteredIncidents, setFilteredIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [formData, setFormData] = useState({
    incident_number: '',
    title: '',
    description: '',
    incident_type: 'Утечка данных',
    severity: 'Средняя',
    status: 'Новый',
    detected_at: new Date().toISOString().slice(0, 16),
    source: '',
    affected_assets: '',
    owner: user?.username || '',
    actions: '',
  });

  useEffect(() => {
    fetchIncidents();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [incidents, searchTerm, filterStatus]);

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

  const applyFilters = () => {
    let filtered = [...incidents];

    if (searchTerm) {
      filtered = filtered.filter(
        (incident) =>
          incident.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          incident.incident_number.toLowerCase().includes(searchTerm.toLowerCase())
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
        detected_at: new Date(formData.detected_at).toISOString(),
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
    } catch (error) {
      toast.error('Ошибка при удалении');
    }
  };

  const handleEdit = (incident) => {
    setEditingIncident(incident);
    setFormData({
      incident_number: incident.incident_number,
      title: incident.title,
      description: incident.description,
      incident_type: incident.incident_type,
      severity: incident.severity,
      status: incident.status,
      detected_at: new Date(incident.detected_at).toISOString().slice(0, 16),
      source: incident.source || '',
      affected_assets: incident.affected_assets || '',
      owner: incident.owner,
      actions: incident.actions || '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingIncident(null);
    setFormData({
      incident_number: '',
      title: '',
      description: '',
      incident_type: 'Утечка данных',
      severity: 'Средняя',
      status: 'Новый',
      detected_at: new Date().toISOString().slice(0, 16),
      source: '',
      affected_assets: '',
      owner: user?.username || '',
      actions: '',
    });
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'Критическая':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'Высокая':
        return 'bg-orange-100 text-orange-800 border-orange-300';
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
      case 'Новый':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'В работе':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Решен':
        return 'bg-teal-100 text-teal-800 border-teal-300';
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
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Инциденты ИБ</h1>
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingIncident ? 'Редактировать инцидент' : 'Создать новый инцидент'}</DialogTitle>
              <DialogDescription>
                Заполните информацию об инциденте информационной безопасности
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Номер инцидента</Label>
                  <Input
                    data-testid="incident-number-input"
                    value={formData.incident_number}
                    onChange={(e) => setFormData({ ...formData, incident_number: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Тип инцидента</Label>
                  <Select value={formData.incident_type} onValueChange={(v) => setFormData({ ...formData, incident_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Утечка данных">Утечка данных</SelectItem>
                      <SelectItem value="Вирус">Вирус</SelectItem>
                      <SelectItem value="Взлом">Взлом</SelectItem>
                      <SelectItem value="DDoS">DDoS</SelectItem>
                      <SelectItem value="Фишинг">Фишинг</SelectItem>
                      <SelectItem value="Другое">Другое</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Название</Label>
                <Input
                  data-testid="incident-title-input"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Описание</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Серьезность</Label>
                  <Select value={formData.severity} onValueChange={(v) => setFormData({ ...formData, severity: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Низкая">Низкая</SelectItem>
                      <SelectItem value="Средняя">Средняя</SelectItem>
                      <SelectItem value="Высокая">Высокая</SelectItem>
                      <SelectItem value="Критическая">Критическая</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Статус</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Новый">Новый</SelectItem>
                      <SelectItem value="В работе">В работе</SelectItem>
                      <SelectItem value="Решен">Решен</SelectItem>
                      <SelectItem value="Закрыт">Закрыт</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Дата обнаружения</Label>
                  <Input
                    type="datetime-local"
                    value={formData.detected_at}
                    onChange={(e) => setFormData({ ...formData, detected_at: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Ответственный</Label>
                  <Input
                    value={formData.owner}
                    onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Источник инцидента</Label>
                <Input
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Затронутые активы</Label>
                <Input
                  value={formData.affected_assets}
                  onChange={(e) => setFormData({ ...formData, affected_assets: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Действия по устранению</Label>
                <Textarea
                  value={formData.actions}
                  onChange={(e) => setFormData({ ...formData, actions: e.target.value })}
                  rows={2}
                />
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

      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                data-testid="incident-search-input"
                placeholder="Поиск по названию, номеру..."
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
                <SelectItem value="Новый">Новый</SelectItem>
                <SelectItem value="В работе">В работе</SelectItem>
                <SelectItem value="Решен">Решен</SelectItem>
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
                  <TableHead>Номер</TableHead>
                  <TableHead>Название</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Серьезность</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Дата обнаружения</TableHead>
                  <TableHead>Ответственный</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIncidents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                      Инциденты не найдены
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredIncidents.map((incident) => (
                    <TableRow key={incident.id} data-testid={`incident-row-${incident.id}`} className="hover:bg-slate-50">
                      <TableCell className="font-medium">{incident.incident_number}</TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <p className="font-medium text-slate-900">{incident.title}</p>
                          <p className="text-sm text-slate-600 truncate">{incident.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-700">{incident.incident_type}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getSeverityColor(incident.severity)} variant="outline">
                          {incident.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(incident.status)} variant="outline">
                          {incident.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-700">
                        {new Date(incident.detected_at).toLocaleString('ru-RU')}
                      </TableCell>
                      <TableCell className="text-sm text-slate-700">{incident.owner}</TableCell>
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
