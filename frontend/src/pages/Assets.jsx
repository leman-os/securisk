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

const Assets = ({ user }) => {
  const [assets, setAssets] = useState([]);
  const [filteredAssets, setFilteredAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const [formData, setFormData] = useState({
    asset_number: '',
    name: '',
    asset_type: 'Сервер',
    criticality: 'Средняя',
    owner: user?.username || '',
    location: '',
    status: 'Активен',
    description: '',
  });

  useEffect(() => {
    fetchAssets();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [assets, searchTerm, filterType]);

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

    if (filterType !== 'all') {
      filtered = filtered.filter((asset) => asset.asset_type === filterType);
    }

    setFilteredAssets(filtered);
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

  const handleEdit = (asset) => {
    setEditingAsset(asset);
    setFormData({
      asset_number: asset.asset_number,
      name: asset.name,
      asset_type: asset.asset_type,
      criticality: asset.criticality,
      owner: asset.owner,
      location: asset.location || '',
      status: asset.status,
      description: asset.description || '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingAsset(null);
    setFormData({
      asset_number: '',
      name: '',
      asset_type: 'Сервер',
      criticality: 'Средняя',
      owner: user?.username || '',
      location: '',
      status: 'Активен',
      description: '',
    });
  };

  const getCriticalityColor = (criticality) => {
    switch (criticality) {
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
      case 'Активен':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Неактивен':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      case 'На обслуживании':
        return 'bg-amber-100 text-amber-800 border-amber-300';
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAsset ? 'Редактировать актив' : 'Создать новый актив'}</DialogTitle>
              <DialogDescription>
                Заполните информацию об информационном активе
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Номер актива</Label>
                  <Input
                    data-testid="asset-number-input"
                    value={formData.asset_number}
                    onChange={(e) => setFormData({ ...formData, asset_number: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Тип актива</Label>
                  <Select value={formData.asset_type} onValueChange={(v) => setFormData({ ...formData, asset_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Сервер">Сервер</SelectItem>
                      <SelectItem value="Рабочая станция">Рабочая станция</SelectItem>
                      <SelectItem value="Сеть">Сеть</SelectItem>
                      <SelectItem value="ПО">ПО</SelectItem>
                      <SelectItem value="Данные">Данные</SelectItem>
                      <SelectItem value="Другое">Другое</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Название</Label>
                <Input
                  data-testid="asset-name-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
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
                      <SelectItem value="Активен">Активен</SelectItem>
                      <SelectItem value="Неактивен">Неактивен</SelectItem>
                      <SelectItem value="На обслуживании">На обслуживании</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ответственный</Label>
                  <Input
                    value={formData.owner}
                    onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Расположение</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
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
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger data-testid="filter-asset-type-select">
                <SelectValue placeholder="Все типы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                <SelectItem value="Сервер">Сервер</SelectItem>
                <SelectItem value="Рабочая станция">Рабочая станция</SelectItem>
                <SelectItem value="Сеть">Сеть</SelectItem>
                <SelectItem value="ПО">ПО</SelectItem>
                <SelectItem value="Данные">Данные</SelectItem>
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
                  <TableHead>Критичность</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Ответственный</TableHead>
                  <TableHead>Расположение</TableHead>
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
                      <TableCell>
                        <span className="text-sm text-slate-700">{asset.asset_type}</span>
                      </TableCell>
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
                      <TableCell className="text-sm text-slate-700">{asset.owner}</TableCell>
                      <TableCell className="text-sm text-slate-600">{asset.location || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
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
