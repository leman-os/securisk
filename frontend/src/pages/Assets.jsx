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
import { Plus, Search, Edit, Trash2, RefreshCw, Filter, Settings, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

const Assets = ({ user }) => {
  const [assets, setAssets] = useState([]);
  const [filteredAssets, setFilteredAssets] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCriticality, setFilterCriticality] = useState('all');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterOwner, setFilterOwner] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnSelector, setShowColumnSelector] = useState(false);

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
    fetchAssets();
    // Load visible columns from localStorage
    const savedColumns = localStorage.getItem('assets_visible_columns');
    if (savedColumns) {
      setVisibleColumns(JSON.parse(savedColumns));
    }
  }, []);

  useEffect(() => {
    // Save visible columns to localStorage
    localStorage.setItem('assets_visible_columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  useEffect(() => {
    applyFilters();
  }, [assets, searchTerm, filterStatus]);

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
      const response = await axios.get(`${API}/assets`);
      setAssets(response.data);
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
      </div>

      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                data-testid="asset-search-input"
                placeholder="Поиск по названию, номеру..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger data-testid="filter-asset-status-select">
                <SelectValue placeholder="Все статусы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="Актуален">Актуален</SelectItem>
                <SelectItem value="Не актуален">Не актуален</SelectItem>
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
                  <TableHead>ID</TableHead>
                  <TableHead>Название</TableHead>
                  <TableHead>Категория</TableHead>
                  <TableHead>Критичность</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Владелец</TableHead>
                  <TableHead>Дата пересмотра</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                      Активы не найдены
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssets.map((asset) => (
                    <TableRow key={asset.id} data-testid={`asset-row-${asset.id}`} className="hover:bg-slate-50">
                      <TableCell className="font-medium">{asset.asset_number}</TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <p className="font-medium text-slate-900">{asset.name}</p>
                          {asset.description && (
                            <p className="text-sm text-slate-600 truncate">{asset.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-700">{asset.category || '-'}</TableCell>
                      <TableCell>
                        <Badge className={getCriticalityColor(asset.criticality)} variant="outline">
                          {asset.criticality}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(asset.status)} variant="outline">
                          {asset.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-700">{asset.owner || '-'}</TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {asset.review_date ? new Date(asset.review_date).toLocaleDateString('ru-RU') : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReview(asset.id)}
                            title="Пересмотр актива"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                          <Button
                            data-testid={`edit-asset-${asset.id}`}
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(asset)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            data-testid={`delete-asset-${asset.id}`}
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(asset.id)}
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

export default Assets;
