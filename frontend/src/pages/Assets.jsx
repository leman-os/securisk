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
import { Plus, Search, Edit, Trash2, RefreshCw, Filter, Settings, Download, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, Eye, X } from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

const Assets = ({ user }) => {
  const [assets, setAssets] = useState([]);
  const [filteredAssets, setFilteredAssets] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [viewingAsset, setViewingAsset] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCriticality, setFilterCriticality] = useState('all');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterOwner, setFilterOwner] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  
  // Pagination and sorting
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  const [visibleColumns, setVisibleColumns] = useState({
    asset_number: true,
    name: true,
    category: true,
    criticality: true,
    status: true,
    owner: true,
    review_date: true,
    format: false,
    location: false,
    classification: false,
    description: false,
  });

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    owner: '',
    criticality: 'Средняя',
    format: '',
    location: '',
    rights_rw: '',
    rights_ro: '',
    classification: '',
    status: 'Актуален',
    threats: [],
    protection_measures: '',
    description: '',
    note: '',
  });

  useEffect(() => {
    fetchSettings();
    // Load visible columns from localStorage
    const savedColumns = localStorage.getItem('assets_visible_columns');
    if (savedColumns) {
      setVisibleColumns(JSON.parse(savedColumns));
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [page, limit, sortBy, sortOrder]);

  useEffect(() => {
    // Save visible columns to localStorage
    localStorage.setItem('assets_visible_columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  useEffect(() => {
    applyFilters();
  }, [assets, searchTerm, filterStatus, filterCriticality, filterCategory, filterOwner]);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings`);
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchAssets = async () => {
    try {
      const response = await axios.get(`${API}/assets`, {
        params: { page, limit, sort_by: sortBy, sort_order: sortOrder }
      });
      setAssets(response.data.items);
      setTotal(response.data.total);
      setTotalPages(response.data.total_pages);
    } catch (error) {
      toast.error('Ошибка загрузки активов');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...assets];

    if (searchTerm) {
      filtered = filtered.filter(
        (asset) =>
          asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          asset.asset_number.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter((asset) => asset.status === filterStatus);
    }

    if (filterCriticality !== 'all') {
      filtered = filtered.filter((asset) => asset.criticality === filterCriticality);
    }

    if (filterCategory) {
      filtered = filtered.filter((asset) => asset.category?.toLowerCase().includes(filterCategory.toLowerCase()));
    }

    if (filterOwner) {
      filtered = filtered.filter((asset) => asset.owner?.toLowerCase().includes(filterOwner.toLowerCase()));
    }

    setFilteredAssets(filtered);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setFilterCriticality('all');
    setFilterCategory('');
    setFilterOwner('');
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAsset) {
        await axios.put(`${API}/assets/${editingAsset.id}`, formData);
        toast.success('Актив обновлен');
      } else {
        await axios.post(`${API}/assets`, formData);
        toast.success('Актив создан');
      }
      setDialogOpen(false);
      resetForm();
      fetchAssets();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка при сохранении');
    }
  };

  const handleView = (asset) => {
    setViewingAsset(asset);
    setViewDialogOpen(true);
  };

  const handleEditFromView = () => {
    setEditingAsset(viewingAsset);
    setFormData(viewingAsset);
    setViewDialogOpen(false);
    setDialogOpen(true);
  };

  const handleDeleteFromView = async () => {
    if (!window.confirm('Удалить актив?')) return;
    try {
      await axios.delete(`${API}/assets/${viewingAsset.id}`);
      toast.success('Актив удален');
      setViewDialogOpen(false);
      fetchAssets();
    } catch (error) {
      toast.error('Ошибка при удалении');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить актив?')) return;
    try {
      await axios.delete(`${API}/assets/${id}`);
      toast.success('Актив удален');
      fetchAssets();
    } catch (error) {
      toast.error('Ошибка при удалении');
    }
  };

  const handleReview = async (id) => {
    try {
      await axios.post(`${API}/assets/${id}/review`);
      toast.success('Актив пересмотрен');
      fetchAssets();
    } catch (error) {
      toast.error('Ошибка при пересмотре');
    }
  };

  const handleEdit = (asset) => {
    setEditingAsset(asset);
    setFormData({
      asset_number: asset.asset_number,
      name: asset.name,
      category: asset.category || '',
      owner: asset.owner || '',
      criticality: asset.criticality,
      format: asset.format || '',
      location: asset.location || '',
      rights_rw: asset.rights_rw || '',
      rights_ro: asset.rights_ro || '',
      classification: asset.classification || '',
      status: asset.status,
      threats: asset.threats || [],
      protection_measures: asset.protection_measures || '',
      description: asset.description || '',
      note: asset.note || '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingAsset(null);
    setFormData({
      name: '',
      category: '',
      owner: '',
      criticality: 'Средняя',
      format: '',
      location: '',
      rights_rw: '',
      rights_ro: '',
      classification: '',
      status: 'Актуален',
      threats: [],
      protection_measures: '',
      description: '',
      note: '',
    });
  };

  const toggleThreat = (threat) => {
    const newThreats = formData.threats.includes(threat)
      ? formData.threats.filter((t) => t !== threat)
      : [...formData.threats, threat];
    setFormData({ ...formData, threats: newThreats });
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
      case 'Актуален':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Не актуален':
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
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Реестр активов</h1>
          <p className="text-slate-600">Управление информационными активами организации</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={resetForm}
              data-testid="create-asset-button"
              className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white gap-2"
            >
              <Plus className="w-4 h-4" />
              Создать актив
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAsset ? 'Редактировать актив' : 'Создать новый актив'}</DialogTitle>
              <DialogDescription>
                Заполните информацию об информационном активе
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {editingAsset && (
                <div className="space-y-2">
                  <Label>ID актива</Label>
                  <Input
                    value={editingAsset.asset_number}
                    disabled
                    className="bg-slate-100"
                  />
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
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

              <div className="space-y-2">
                <Label>Название актива</Label>
                <Input
                  data-testid="asset-name-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Категория</Label>
                  <Input
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Владелец</Label>
                  <Input
                    value={formData.owner}
                    onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Формат</Label>
                  <Input
                    value={formData.format}
                    onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Месторасположение</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Права RW</Label>
                  <Input
                    value={formData.rights_rw}
                    onChange={(e) => setFormData({ ...formData, rights_rw: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Права RO</Label>
                  <Input
                    value={formData.rights_ro}
                    onChange={(e) => setFormData({ ...formData, rights_ro: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Классификация</Label>
                  <Input
                    value={formData.classification}
                    onChange={(e) => setFormData({ ...formData, classification: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Статус</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Актуален">Актуален</SelectItem>
                      <SelectItem value="Не актуален">Не актуален</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Угрозы (выберите несколько)</Label>
                <div className="border rounded-lg p-4 space-y-2 max-h-40 overflow-y-auto">
                  {settings?.threats?.map((threat) => (
                    <div key={threat} className="flex items-center space-x-2">
                      <Checkbox
                        id={`threat-${threat}`}
                        checked={formData.threats.includes(threat)}
                        onCheckedChange={() => toggleThreat(threat)}
                      />
                      <label
                        htmlFor={`threat-${threat}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {threat}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Меры защиты</Label>
                <Textarea
                  value={formData.protection_measures}
                  onChange={(e) => setFormData({ ...formData, protection_measures: e.target.value })}
                  rows={2}
                />
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
                <Label>Примечание</Label>
                <Input
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Отмена
                </Button>
                <Button type="submit" data-testid="asset-submit-button" className="bg-gradient-to-r from-cyan-500 to-cyan-600">
                  {editingAsset ? 'Обновить' : 'Создать'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Просмотр актива</DialogTitle>
              <DialogDescription>Подробная информация об информационном активе</DialogDescription>
            </DialogHeader>
            {viewingAsset && (
              <div className="space-y-6">
                {/* Основная информация */}
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-sm text-slate-700 mb-3">Основная информация</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">ID актива:</span>
                      <p className="text-sm mt-1">{viewingAsset.asset_number}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">Статус:</span>
                      <p className="text-sm mt-1">{viewingAsset.status}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs font-semibold text-slate-500 uppercase">Название:</span>
                      <p className="text-sm mt-1 font-medium">{viewingAsset.name}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">Категория:</span>
                      <p className="text-sm mt-1">{viewingAsset.category || '-'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">Критичность:</span>
                      <p className="text-sm mt-1">{viewingAsset.criticality}</p>
                    </div>
                  </div>
                </div>

                {/* Управление активом */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-sm text-slate-700 mb-3">Управление активом</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">Владелец:</span>
                      <p className="text-sm mt-1">{viewingAsset.owner || '-'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">Формат:</span>
                      <p className="text-sm mt-1">{viewingAsset.format || '-'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">Местоположение:</span>
                      <p className="text-sm mt-1">{viewingAsset.location || '-'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">Дата пересмотра:</span>
                      <p className="text-sm mt-1">{viewingAsset.review_date ? new Date(viewingAsset.review_date).toLocaleDateString('ru-RU') : '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Классификация и доступ */}
                <div className="bg-amber-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-sm text-slate-700 mb-3">Классификация и доступ</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">Классификация:</span>
                      <p className="text-sm mt-1">{viewingAsset.classification || '-'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">Права (R):</span>
                      <p className="text-sm mt-1">{viewingAsset.rights_r || '-'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">Права (W):</span>
                      <p className="text-sm mt-1">{viewingAsset.rights_w || '-'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">Права (RW):</span>
                      <p className="text-sm mt-1">{viewingAsset.rights_rw || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Описание */}
                {viewingAsset.description && (
                  <div className="bg-white border border-slate-200 p-4 rounded-lg">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Описание:</span>
                    <p className="text-sm mt-2 whitespace-pre-wrap">{viewingAsset.description}</p>
                  </div>
                )}

                {/* Дополнительная информация */}
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-sm text-slate-700 mb-3">Дополнительно</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">Дата создания:</span>
                      <p className="text-sm mt-1">{viewingAsset.created_at ? new Date(viewingAsset.created_at).toLocaleString('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">Последнее обновление:</span>
                      <p className="text-sm mt-1">{viewingAsset.updated_at ? new Date(viewingAsset.updated_at).toLocaleString('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</p>
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
                      <Label className="text-xs font-semibold">Статус</Label>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger>
                          <SelectValue placeholder="Все статусы" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все статусы</SelectItem>
                          <SelectItem value="Актуален">Актуален</SelectItem>
                          <SelectItem value="Не актуален">Не актуален</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Критичность</Label>
                      <Select value={filterCriticality} onValueChange={setFilterCriticality}>
                        <SelectTrigger>
                          <SelectValue placeholder="Все" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все</SelectItem>
                          <SelectItem value="Высокая">Высокая</SelectItem>
                          <SelectItem value="Средняя">Средняя</SelectItem>
                          <SelectItem value="Низкая">Низкая</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Владелец</Label>
                      <Input
                        placeholder="Введите владельца..."
                        value={filterOwner}
                        onChange={(e) => setFilterOwner(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Категория</Label>
                      <Input
                        placeholder="Введите категорию..."
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
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
                        {key === 'asset_number' ? 'ID' :
                         key === 'name' ? 'Название' :
                         key === 'category' ? 'Категория' :
                         key === 'criticality' ? 'Критичность' :
                         key === 'status' ? 'Статус' :
                         key === 'owner' ? 'Владелец' :
                         key === 'review_date' ? 'Дата пересмотра' :
                         key === 'format' ? 'Формат' :
                         key === 'location' ? 'Местоположение' :
                         key === 'classification' ? 'Классификация' :
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
        <CardContent className="p-6">
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
                <TableRow className="bg-slate-50">
                  {visibleColumns.asset_number && (
                    <TableHead onClick={() => handleSort('asset_number')} className="cursor-pointer hover:bg-slate-100">
                      <div className="flex items-center gap-1">
                        ID
                        {sortBy === 'asset_number' && <ArrowUpDown className="w-3 h-3" />}
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.name && (
                    <TableHead onClick={() => handleSort('name')} className="cursor-pointer hover:bg-slate-100">
                      <div className="flex items-center gap-1">
                        Название
                        {sortBy === 'name' && <ArrowUpDown className="w-3 h-3" />}
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.category && (
                    <TableHead onClick={() => handleSort('category')} className="cursor-pointer hover:bg-slate-100">
                      <div className="flex items-center gap-1">
                        Категория
                        {sortBy === 'category' && <ArrowUpDown className="w-3 h-3" />}
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.criticality && (
                    <TableHead onClick={() => handleSort('criticality')} className="cursor-pointer hover:bg-slate-100">
                      <div className="flex items-center gap-1">
                        Критичность
                        {sortBy === 'criticality' && <ArrowUpDown className="w-3 h-3" />}
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.status && (
                    <TableHead onClick={() => handleSort('status')} className="cursor-pointer hover:bg-slate-100">
                      <div className="flex items-center gap-1">
                        Статус
                        {sortBy === 'status' && <ArrowUpDown className="w-3 h-3" />}
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.owner && (
                    <TableHead onClick={() => handleSort('owner')} className="cursor-pointer hover:bg-slate-100">
                      <div className="flex items-center gap-1">
                        Владелец
                        {sortBy === 'owner' && <ArrowUpDown className="w-3 h-3" />}
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.format && <TableHead>Формат</TableHead>}
                  {visibleColumns.location && <TableHead>Местоположение</TableHead>}
                  {visibleColumns.classification && <TableHead>Классификация</TableHead>}
                  {visibleColumns.review_date && (
                    <TableHead onClick={() => handleSort('review_date')} className="cursor-pointer hover:bg-slate-100">
                      <div className="flex items-center gap-1">
                        Дата пересмотра
                        {sortBy === 'review_date' && <ArrowUpDown className="w-3 h-3" />}
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.description && <TableHead>Описание</TableHead>}
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-slate-500">
                      Активы не найдены
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssets.map((asset) => (
                    <TableRow key={asset.id} data-testid={`asset-row-${asset.id}`} className="hover:bg-slate-50">
                      {visibleColumns.asset_number && <TableCell className="font-medium">{asset.asset_number}</TableCell>}
                      {visibleColumns.name && (
                        <TableCell>
                          <div className="max-w-xs">
                            <p className="font-medium text-slate-900">{asset.name}</p>
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.category && <TableCell className="text-sm text-slate-700">{asset.category || '-'}</TableCell>}
                      {visibleColumns.criticality && (
                        <TableCell>
                          <Badge className={getCriticalityColor(asset.criticality)} variant="outline">
                            {asset.criticality}
                          </Badge>
                        </TableCell>
                      )}
                      {visibleColumns.status && (
                        <TableCell>
                          <Badge className={getStatusColor(asset.status)} variant="outline">
                            {asset.status}
                          </Badge>
                        </TableCell>
                      )}
                      {visibleColumns.owner && <TableCell className="text-sm text-slate-700">{asset.owner || '-'}</TableCell>}
                      {visibleColumns.format && <TableCell className="text-sm text-slate-700">{asset.format || '-'}</TableCell>}
                      {visibleColumns.location && <TableCell className="text-sm text-slate-700">{asset.location || '-'}</TableCell>}
                      {visibleColumns.classification && <TableCell className="text-sm text-slate-700">{asset.classification || '-'}</TableCell>}
                      {visibleColumns.review_date && (
                        <TableCell className="text-sm text-slate-600">
                          {asset.review_date ? new Date(asset.review_date).toLocaleDateString('ru-RU') : '-'}
                        </TableCell>
                      )}
                      {visibleColumns.description && <TableCell className="max-w-xs truncate text-sm text-slate-700">{asset.description || '-'}</TableCell>}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(asset)}
                            className="h-8 w-8 p-0"
                            title="Просмотр"
                          >
                            <Eye className="w-4 h-4 text-cyan-600" />
                          </Button>
                          <Button
                            data-testid={`edit-asset-${asset.id}`}
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(asset)}
                            className="h-8 w-8 p-0"
                            title="Редактировать"
                          >
                            <Edit className="w-4 h-4 text-slate-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReview(asset.id)}
                            className="h-8 w-8 p-0"
                            title="Пересмотр актива"
                          >
                            <RefreshCw className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button
                            data-testid={`delete-asset-${asset.id}`}
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(asset.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Удалить"
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

export default Assets;
