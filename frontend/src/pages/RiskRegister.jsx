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
import { Plus, Search, Filter, Edit, Trash2, GripVertical, Settings, Download } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';

const RiskRegister = ({ user }) => {
  const [risks, setRisks] = useState([]);
  const [filteredRisks, setFilteredRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRiskLevel, setFilterRiskLevel] = useState('all');
  const [filterOwner, setFilterOwner] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);

  const [visibleColumns, setVisibleColumns] = useState({
    risk_number: true,
    title: true,
    category: true,
    risk_level: true,
    status: true,
    owner: true,
    likelihood: false,
    impact: false,
    treatment_measures: false,
    deadline: false,
    description: false,
  });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Технический',
    likelihood: 'Средняя',
    impact: 'Среднее',
    risk_level: 'Средний',
    status: 'Идентифицирован',
    owner: user?.username || '',
    treatment_measures: '',
    deadline: '',
  });

  useEffect(() => {
    fetchRisks();
    // Load visible columns from localStorage
    const savedColumns = localStorage.getItem('risks_visible_columns');
    if (savedColumns) {
      setVisibleColumns(JSON.parse(savedColumns));
    }
  }, []);

  useEffect(() => {
    // Save visible columns to localStorage
    localStorage.setItem('risks_visible_columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  useEffect(() => {
    applyFilters();
  }, [risks, searchTerm, filterCategory, filterStatus]);

  const fetchRisks = async () => {
    try {
      const response = await axios.get(`${API}/risks`);
      setRisks(response.data);
    } catch (error) {
      toast.error('Ошибка загрузки рисков');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...risks];

    if (searchTerm) {
      filtered = filtered.filter(
        (risk) =>
          risk.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          risk.risk_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          risk.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterCategory !== 'all') {
      filtered = filtered.filter((risk) => risk.category === filterCategory);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter((risk) => risk.status === filterStatus);
    }

    if (filterRiskLevel !== 'all') {
      filtered = filtered.filter((risk) => risk.risk_level === filterRiskLevel);
    }

    if (filterOwner) {
      filtered = filtered.filter((risk) => risk.owner?.toLowerCase().includes(filterOwner.toLowerCase()));
    }

    setFilteredRisks(filtered);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterCategory('all');
    setFilterStatus('all');
    setFilterRiskLevel('all');
    setFilterOwner('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingRisk) {
        await axios.put(`${API}/risks/${editingRisk.id}`, formData);
        toast.success('Риск обновлен');
      } else {
        await axios.post(`${API}/risks`, formData);
        toast.success('Риск создан');
      }
      setDialogOpen(false);
      resetForm();
      fetchRisks();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка при сохранении');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить риск?')) return;
    try {
      await axios.delete(`${API}/risks/${id}`);
      toast.success('Риск удален');
      fetchRisks();
    } catch (error) {
      toast.error('Ошибка при удалении');
    }
  };

  const handleEdit = (risk) => {
    setEditingRisk(risk);
    setFormData({
      risk_number: risk.risk_number,
      title: risk.title,
      description: risk.description,
      category: risk.category,
      likelihood: risk.likelihood,
      impact: risk.impact,
      risk_level: risk.risk_level,
      status: risk.status,
      owner: risk.owner,
      treatment_measures: risk.treatment_measures || '',
      deadline: risk.deadline || '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingRisk(null);
    setFormData({
      title: '',
      description: '',
      category: 'Технический',
      likelihood: 'Средняя',
      impact: 'Среднее',
      risk_level: 'Средний',
      status: 'Идентифицирован',
      owner: user?.username || '',
      treatment_measures: '',
      deadline: '',
    });
  };

  const handleDragStart = (e, risk) => {
    setDraggedItem(risk);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetRisk) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.id === targetRisk.id) return;

    const newRisks = [...risks];
    const draggedIndex = newRisks.findIndex((r) => r.id === draggedItem.id);
    const targetIndex = newRisks.findIndex((r) => r.id === targetRisk.id);

    newRisks.splice(draggedIndex, 1);
    newRisks.splice(targetIndex, 0, draggedItem);

    // Update priorities
    const updates = newRisks.map((risk, index) => ({
      ...risk,
      priority: index,
    }));

    setRisks(updates);
    setDraggedItem(null);

    // Update priorities in backend
    try {
      await Promise.all(
        updates.map((risk) => axios.put(`${API}/risks/${risk.id}`, { priority: risk.priority }))
      );
      toast.success('Порядок обновлен');
    } catch (error) {
      toast.error('Ошибка при обновлении порядка');
      fetchRisks(); // Reload on error
    }
  };

  const getRiskLevelColor = (level) => {
    switch (level) {
      case 'Критический':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'Высокий':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Средний':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Низкий':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Идентифицирован':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Оценен':
        return 'bg-cyan-100 text-cyan-800 border-cyan-300';
      case 'В обработке':
        return 'bg-amber-100 text-amber-800 border-amber-300';
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
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Реестр рисков</h1>
          <p className="text-slate-600">Управление рисками информационной безопасности</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={resetForm}
              data-testid="create-risk-button"
              className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white gap-2"
            >
              <Plus className="w-4 h-4" />
              Создать риск
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRisk ? 'Редактировать риск' : 'Создать новый риск'}</DialogTitle>
              <DialogDescription>
                Заполните информацию о риске информационной безопасности
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {editingRisk && (
                <div className="space-y-2">
                  <Label>Номер риска</Label>
                  <Input
                    value={editingRisk.risk_number}
                    disabled
                    className="bg-slate-100"
                  />
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Категория</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger data-testid="risk-category-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Технический">Технический</SelectItem>
                      <SelectItem value="Организационный">Организационный</SelectItem>
                      <SelectItem value="Физический">Физический</SelectItem>
                      <SelectItem value="Юридический">Юридический</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Название</Label>
                <Input
                  data-testid="risk-title-input"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Описание</Label>
                <Textarea
                  data-testid="risk-description-input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Вероятность</Label>
                  <Select value={formData.likelihood} onValueChange={(v) => setFormData({ ...formData, likelihood: v })}>
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

                <div className="space-y-2">
                  <Label>Воздействие</Label>
                  <Select value={formData.impact} onValueChange={(v) => setFormData({ ...formData, impact: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Низкое">Низкое</SelectItem>
                      <SelectItem value="Среднее">Среднее</SelectItem>
                      <SelectItem value="Высокое">Высокое</SelectItem>
                      <SelectItem value="Критическое">Критическое</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Уровень риска</Label>
                  <Select value={formData.risk_level} onValueChange={(v) => setFormData({ ...formData, risk_level: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Низкий">Низкий</SelectItem>
                      <SelectItem value="Средний">Средний</SelectItem>
                      <SelectItem value="Высокий">Высокий</SelectItem>
                      <SelectItem value="Критический">Критический</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Статус</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Идентифицирован">Идентифицирован</SelectItem>
                      <SelectItem value="Оценен">Оценен</SelectItem>
                      <SelectItem value="В обработке">В обработке</SelectItem>
                      <SelectItem value="Закрыт">Закрыт</SelectItem>
                    </SelectContent>
                  </Select>
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
                <Label>Меры по обработке</Label>
                <Textarea
                  value={formData.treatment_measures}
                  onChange={(e) => setFormData({ ...formData, treatment_measures: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Срок</Label>
                <Input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Отмена
                </Button>
                <Button type="submit" data-testid="risk-submit-button" className="bg-gradient-to-r from-cyan-500 to-cyan-600">
                  {editingRisk ? 'Обновить' : 'Создать'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="border-slate-200">
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
            </div>

            {showFilters && (
              <Card className="p-4 bg-slate-50">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Категория</Label>
                      <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Все категории" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все категории</SelectItem>
                          <SelectItem value="Технический">Технический</SelectItem>
                          <SelectItem value="Организационный">Организационный</SelectItem>
                          <SelectItem value="Физический">Физический</SelectItem>
                          <SelectItem value="Юридический">Юридический</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Статус</Label>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger>
                          <SelectValue placeholder="Все статусы" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все статусы</SelectItem>
                          <SelectItem value="Идентифицирован">Идентифицирован</SelectItem>
                          <SelectItem value="Оценен">Оценен</SelectItem>
                          <SelectItem value="В обработке">В обработке</SelectItem>
                          <SelectItem value="Закрыт">Закрыт</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Уровень риска</Label>
                      <Select value={filterRiskLevel} onValueChange={setFilterRiskLevel}>
                        <SelectTrigger>
                          <SelectValue placeholder="Все уровни" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все уровни</SelectItem>
                          <SelectItem value="Критический">Критический</SelectItem>
                          <SelectItem value="Высокий">Высокий</SelectItem>
                          <SelectItem value="Средний">Средний</SelectItem>
                          <SelectItem value="Низкий">Низкий</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Ответственный</Label>
                      <Input
                        placeholder="Введите имя..."
                        value={filterOwner}
                        onChange={(e) => setFilterOwner(e.target.value)}
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
                  {Object.keys(visibleColumns).map(key => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        checked={visibleColumns[key]}
                        onCheckedChange={(checked) => 
                          setVisibleColumns({ ...visibleColumns, [key]: checked })
                        }
                      />
                      <Label className="text-sm cursor-pointer">
                        {key === 'risk_number' ? 'Номер' :
                         key === 'title' ? 'Название' :
                         key === 'category' ? 'Категория' :
                         key === 'risk_level' ? 'Уровень риска' :
                         key === 'status' ? 'Статус' :
                         key === 'owner' ? 'Ответственный' :
                         key === 'likelihood' ? 'Вероятность' :
                         key === 'impact' ? 'Воздействие' :
                         key === 'treatment_measures' ? 'Меры' :
                         key === 'deadline' ? 'Срок' :
                         key === 'description' ? 'Описание' : key}
                      </Label>
                    </div>
                  ))}
                </div>
              </Card>
            )}
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
                  <TableHead className="w-12"></TableHead>
                  {visibleColumns.risk_number && <TableHead>Номер</TableHead>}
                  {visibleColumns.title && <TableHead>Название</TableHead>}
                  {visibleColumns.category && <TableHead>Категория</TableHead>}
                  {visibleColumns.risk_level && <TableHead>Уровень</TableHead>}
                  {visibleColumns.status && <TableHead>Статус</TableHead>}
                  {visibleColumns.owner && <TableHead>Ответственный</TableHead>}
                  {visibleColumns.likelihood && <TableHead>Вероятность</TableHead>}
                  {visibleColumns.impact && <TableHead>Воздействие</TableHead>}
                  {visibleColumns.treatment_measures && <TableHead>Меры</TableHead>}
                  {visibleColumns.deadline && <TableHead>Срок</TableHead>}
                  {visibleColumns.description && <TableHead>Описание</TableHead>}
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRisks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-8 text-slate-500">
                      Риски не найдены
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRisks.map((risk) => (
                    <TableRow
                      key={risk.id}
                      data-testid={`risk-row-${risk.id}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, risk)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, risk)}
                      className="hover:bg-slate-50 cursor-move"
                    >
                      <TableCell>
                        <GripVertical className="w-4 h-4 text-slate-400" />
                      </TableCell>
                      {visibleColumns.risk_number && <TableCell className="font-medium">{risk.risk_number}</TableCell>}
                      {visibleColumns.title && (
                        <TableCell>
                          <div className="max-w-xs">
                            <p className="font-medium text-slate-900">{risk.title}</p>
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.category && (
                        <TableCell>
                          <span className="text-sm text-slate-700">{risk.category}</span>
                        </TableCell>
                      )}
                      {visibleColumns.risk_level && (
                        <TableCell>
                          <Badge className={getRiskLevelColor(risk.risk_level)} variant="outline">
                            {risk.risk_level}
                          </Badge>
                        </TableCell>
                      )}
                      {visibleColumns.status && (
                        <TableCell>
                          <Badge className={getStatusColor(risk.status)} variant="outline">
                            {risk.status}
                          </Badge>
                        </TableCell>
                      )}
                      {visibleColumns.owner && <TableCell className="text-sm text-slate-700">{risk.owner}</TableCell>}
                      {visibleColumns.likelihood && <TableCell className="text-sm text-slate-700">{risk.likelihood}</TableCell>}
                      {visibleColumns.impact && <TableCell className="text-sm text-slate-700">{risk.impact}</TableCell>}
                      {visibleColumns.treatment_measures && <TableCell className="max-w-xs truncate text-sm text-slate-700">{risk.treatment_measures || '-'}</TableCell>}
                      {visibleColumns.deadline && <TableCell className="text-sm text-slate-700">{risk.deadline ? new Date(risk.deadline).toLocaleDateString('ru-RU') : '-'}</TableCell>}
                      {visibleColumns.description && <TableCell className="max-w-xs truncate text-sm text-slate-700">{risk.description}</TableCell>}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            data-testid={`edit-risk-${risk.id}`}
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(risk)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            data-testid={`delete-risk-${risk.id}`}
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(risk.id)}
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

export default RiskRegister;
