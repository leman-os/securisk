import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, Edit, Trash2, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, X, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const Vulnerabilities = ({ user }) => {
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [filteredVulnerabilities, setFilteredVulnerabilities] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewAssetDialogOpen, setViewAssetDialogOpen] = useState(false);
  const [editingVulnerability, setEditingVulnerability] = useState(null);
  const [viewingVulnerability, setViewingVulnerability] = useState(null);
  const [viewingAsset, setViewingAsset] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination and sorting
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  const [formData, setFormData] = useState({
    vulnerability_number: '',
    related_asset_id: '',
    description: '',
    vulnerability_type: '',
    detection_method: '',
    cvss_vector: '',
    status: 'Обнаружена',
    discovery_date: new Date().toISOString().split('T')[0],
    closure_date: ''
  });

  useEffect(() => {
    fetchAssets();
  }, []);

  useEffect(() => {
    fetchVulnerabilities();
  }, [page, limit, sortBy, sortOrder]);

  useEffect(() => {
    applyFilters();
  }, [vulnerabilities, searchTerm, filterStatus, filterSeverity]);

  const fetchAssets = async () => {
    try {
      const response = await axios.get(`${API}/assets`, {
        params: { limit: 1000 }
      });
      setAssets(response.data.items);
    } catch (error) {
      console.error('Error fetching assets:', error);
    }
  };

  const fetchVulnerabilities = async () => {
    try {
      const response = await axios.get(`${API}/vulnerabilities`, {
        params: { page, limit, sort_by: sortBy, sort_order: sortOrder }
      });
      setVulnerabilities(response.data.items);
      setTotal(response.data.total);
      setTotalPages(response.data.total_pages);
    } catch (error) {
      toast.error('Ошибка загрузки уязвимостей');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = vulnerabilities;

    if (searchTerm) {
      filtered = filtered.filter(vuln =>
        vuln.vulnerability_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vuln.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vuln.vulnerability_type?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(vuln => vuln.status === filterStatus);
    }

    if (filterSeverity !== 'all') {
      filtered = filtered.filter(vuln => vuln.severity === filterSeverity);
    }

    setFilteredVulnerabilities(filtered);
  };

  const resetForm = () => {
    setFormData({
      vulnerability_number: '',
      related_asset_id: '',
      description: '',
      vulnerability_type: '',
      detection_method: '',
      cvss_vector: '',
      status: 'Обнаружена',
      discovery_date: new Date().toISOString().split('T')[0],
      closure_date: ''
    });
    setEditingVulnerability(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        discovery_date: new Date(formData.discovery_date).toISOString(),
        closure_date: formData.closure_date ? new Date(formData.closure_date).toISOString() : null
      };

      if (editingVulnerability) {
        await axios.put(`${API}/vulnerabilities/${editingVulnerability.id}`, submitData);
        toast.success('Уязвимость обновлена');
      } else {
        await axios.post(`${API}/vulnerabilities`, submitData);
        toast.success('Уязвимость создана');
      }
      setDialogOpen(false);
      resetForm();
      fetchVulnerabilities();
    } catch (error) {
      console.error('Vulnerability save error:', error);
      const errorMessage = error.response?.data?.detail 
        ? (typeof error.response.data.detail === 'string' 
          ? error.response.data.detail 
          : JSON.stringify(error.response.data.detail))
        : 'Ошибка при сохранении';
      toast.error(errorMessage);
    }
  };

  const handleEdit = (vulnerability) => {
    setEditingVulnerability(vulnerability);
    setFormData({
      ...vulnerability,
      discovery_date: vulnerability.discovery_date ? new Date(vulnerability.discovery_date).toISOString().split('T')[0] : '',
      closure_date: vulnerability.closure_date ? new Date(vulnerability.closure_date).toISOString().split('T')[0] : ''
    });
    setDialogOpen(true);
  };

  const handleView = (vulnerability) => {
    setViewingVulnerability(vulnerability);
    setViewDialogOpen(true);
  };

  const handleViewAsset = (assetId) => {
    const asset = assets.find(a => a.id === assetId);
    if (asset) {
      setViewingAsset(asset);
      setViewAssetDialogOpen(true);
    }
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

  const handleEditFromView = () => {
    setEditingVulnerability(viewingVulnerability);
    setFormData({
      ...viewingVulnerability,
      discovery_date: viewingVulnerability.discovery_date ? new Date(viewingVulnerability.discovery_date).toISOString().split('T')[0] : '',
      closure_date: viewingVulnerability.closure_date ? new Date(viewingVulnerability.closure_date).toISOString().split('T')[0] : ''
    });
    setViewDialogOpen(false);
    setDialogOpen(true);
  };

  const handleDeleteFromView = async () => {
    if (!window.confirm('Удалить уязвимость?')) return;
    try {
      await axios.delete(`${API}/vulnerabilities/${viewingVulnerability.id}`);
      toast.success('Уязвимость удалена');
      setViewDialogOpen(false);
      fetchVulnerabilities();
    } catch (error) {
      toast.error('Ошибка при удалении');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить уязвимость?')) return;
    try {
      await axios.delete(`${API}/vulnerabilities/${id}`);
      toast.success('Уязвимость удалена');
      fetchVulnerabilities();
    } catch (error) {
      toast.error('Ошибка при удалении');
    }
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

  const resetFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setFilterSeverity('all');
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'Critical': return 'bg-red-100 text-red-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getRelatedAsset = (assetId) => {
    return assets.find(a => a.id === assetId);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Реестр уязвимостей</h1>
          <p className="text-slate-600 mt-1">Управление уязвимостями информационных активов</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-gradient-to-r from-cyan-500 to-cyan-600">
          <Plus className="w-4 h-4 mr-2" />
          Добавить уязвимость
        </Button>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVulnerability ? 'Редактировать уязвимость' : 'Создать уязвимость'}</DialogTitle>
            <DialogDescription>Заполните информацию об уязвимости</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Связанный актив</Label>
                <Select value={formData.related_asset_id || 'none'} onValueChange={(val) => setFormData({...formData, related_asset_id: val === 'none' ? '' : val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите актив" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Не выбрано</SelectItem>
                    {assets.map(asset => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.asset_number} - {asset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Статус *</Label>
                <Select value={formData.status} onValueChange={(val) => setFormData({...formData, status: val})} required>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Обнаружена">Обнаружена</SelectItem>
                    <SelectItem value="Принята">Принята</SelectItem>
                    <SelectItem value="В работе">В работе</SelectItem>
                    <SelectItem value="Устранена">Устранена</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Описание уязвимости *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Опишите уязвимость..."
                required
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Тип уязвимости *</Label>
                <Input
                  value={formData.vulnerability_type}
                  onChange={(e) => setFormData({...formData, vulnerability_type: e.target.value})}
                  placeholder="SQL Injection, XSS, ..."
                  required
                />
              </div>
              <div>
                <Label>Метод обнаружения *</Label>
                <Input
                  value={formData.detection_method}
                  onChange={(e) => setFormData({...formData, detection_method: e.target.value})}
                  placeholder="Сканер, Пентест, ..."
                  required
                />
              </div>
            </div>

            <div>
              <Label>CVSS v3.1 Vector (необязательно)</Label>
              <Input
                value={formData.cvss_vector}
                onChange={(e) => setFormData({...formData, cvss_vector: e.target.value})}
                placeholder="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"
              />
              <p className="text-xs text-slate-500 mt-1">
                Автоматически рассчитывается CVSS Score и уровень критичности
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Дата обнаружения *</Label>
                <Input
                  type="date"
                  value={formData.discovery_date}
                  onChange={(e) => setFormData({...formData, discovery_date: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label>Дата закрытия</Label>
                <Input
                  type="date"
                  value={formData.closure_date}
                  onChange={(e) => setFormData({...formData, closure_date: e.target.value})}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
              <Button type="submit" className="bg-gradient-to-r from-cyan-500 to-cyan-600">Сохранить</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Просмотр уязвимости</DialogTitle>
            <DialogDescription>Подробная информация об уязвимости</DialogDescription>
          </DialogHeader>
          {viewingVulnerability && (
            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-lg">
                <h3 className="font-semibold text-sm text-slate-700 mb-3">Основная информация</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase">ID уязвимости:</span>
                    <p className="text-sm mt-1">{viewingVulnerability.vulnerability_number}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase">Статус:</span>
                    <p className="text-sm mt-1">{viewingVulnerability.status}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase">Тип уязвимости:</span>
                    <p className="text-sm mt-1">{viewingVulnerability.vulnerability_type}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase">Метод обнаружения:</span>
                    <p className="text-sm mt-1">{viewingVulnerability.detection_method}</p>
                  </div>
                </div>
              </div>

              {viewingVulnerability.related_asset_id && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-sm text-slate-700 mb-2">Связанный актив</h3>
                  <button
                    onClick={() => handleViewAsset(viewingVulnerability.related_asset_id)}
                    className="flex items-center gap-2 text-cyan-600 hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span className="text-sm">
                      {getRelatedAsset(viewingVulnerability.related_asset_id)?.asset_number} - 
                      {getRelatedAsset(viewingVulnerability.related_asset_id)?.name}
                    </span>
                  </button>
                </div>
              )}

              <div className="bg-white border border-slate-200 p-4 rounded-lg">
                <span className="text-xs font-semibold text-slate-500 uppercase">Описание уязвимости:</span>
                <p className="text-sm mt-2 whitespace-pre-wrap">{viewingVulnerability.description}</p>
              </div>

              {viewingVulnerability.cvss_vector && (
                <div className="bg-red-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-sm text-slate-700 mb-3">CVSS v3.1</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">Vector String:</span>
                      <p className="text-xs mt-1 font-mono bg-white p-2 rounded border">{viewingVulnerability.cvss_vector}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs font-semibold text-slate-500 uppercase">Base Score:</span>
                        <p className="text-sm mt-1 font-bold">{viewingVulnerability.cvss_score || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-500 uppercase">Уровень критичности:</span>
                        <p className="text-sm mt-1">{viewingVulnerability.severity || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-slate-50 p-4 rounded-lg">
                <h3 className="font-semibold text-sm text-slate-700 mb-3">Даты</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase">Дата обнаружения:</span>
                    <p className="text-sm mt-1">{viewingVulnerability.discovery_date ? new Date(viewingVulnerability.discovery_date).toLocaleDateString('ru-RU') : '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase">Дата закрытия:</span>
                    <p className="text-sm mt-1">{viewingVulnerability.closure_date ? new Date(viewingVulnerability.closure_date).toLocaleDateString('ru-RU') : '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase">Дата создания:</span>
                    <p className="text-sm mt-1">{viewingVulnerability.created_at ? new Date(viewingVulnerability.created_at).toLocaleString('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase">Последнее обновление:</span>
                    <p className="text-sm mt-1">{viewingVulnerability.updated_at ? new Date(viewingVulnerability.updated_at).toLocaleString('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</p>
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

      {/* Asset View Dialog */}
      <Dialog open={viewAssetDialogOpen} onOpenChange={setViewAssetDialogOpen}>
        <DialogContent className="max-w-2xl">
          {viewingAsset && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle>Актив {viewingAsset.asset_number}</DialogTitle>
                <DialogDescription>{viewingAsset.name}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Категория</p>
                    <p className="text-sm font-semibold">{viewingAsset.category}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Владелец</p>
                    <p className="text-sm font-semibold">{viewingAsset.owner}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Критичность</p>
                    <Badge className={getCriticalityColor(viewingAsset.criticality)}>
                      {viewingAsset.criticality}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Статус</p>
                    <p className="text-sm">{viewingAsset.status}</p>
                  </div>
                </div>
                {viewingAsset.description && (
                  <div>
                    <p className="text-xs text-slate-500">Описание</p>
                    <p className="text-sm">{viewingAsset.description}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="w-4 h-4 mr-2" />
                {showFilters ? 'Скрыть фильтры' : 'Показать фильтры'}
              </Button>
              {(searchTerm || filterStatus !== 'all' || filterSeverity !== 'all') && (
                <Button variant="outline" onClick={resetFilters}>Сбросить фильтры</Button>
              )}
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <Label>Поиск</Label>
                  <Input
                    placeholder="Поиск по ID, описанию..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Статус</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все статусы</SelectItem>
                      <SelectItem value="Обнаружена">Обнаружена</SelectItem>
                      <SelectItem value="Принята">Принята</SelectItem>
                      <SelectItem value="В работе">В работе</SelectItem>
                      <SelectItem value="Устранена">Устранена</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Критичность</Label>
                  <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все уровни</SelectItem>
                      <SelectItem value="Critical">Critical</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {/* Pagination top */}
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
              <Button size="sm" variant="outline" onClick={() => setPage(1)} disabled={page === 1}>
                <ChevronsLeft className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPage(page - 1)} disabled={page === 1}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm px-2">Страница {page} из {totalPages}</span>
              <Button size="sm" variant="outline" onClick={() => setPage(page + 1)} disabled={page === totalPages}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPage(totalPages)} disabled={page === totalPages}>
                <ChevronsRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead onClick={() => handleSort('vulnerability_number')} className="cursor-pointer hover:bg-slate-100">
                    <div className="flex items-center gap-1">
                      ID
                      {sortBy === 'vulnerability_number' && <ArrowUpDown className="w-3 h-3" />}
                    </div>
                  </TableHead>
                  <TableHead>Связанный актив</TableHead>
                  <TableHead>Описание</TableHead>
                  <TableHead onClick={() => handleSort('vulnerability_type')} className="cursor-pointer hover:bg-slate-100">
                    <div className="flex items-center gap-1">
                      Тип
                      {sortBy === 'vulnerability_type' && <ArrowUpDown className="w-3 h-3" />}
                    </div>
                  </TableHead>
                  <TableHead>CVSS Score</TableHead>
                  <TableHead>Критичность</TableHead>
                  <TableHead onClick={() => handleSort('status')} className="cursor-pointer hover:bg-slate-100">
                    <div className="flex items-center gap-1">
                      Статус
                      {sortBy === 'status' && <ArrowUpDown className="w-3 h-3" />}
                    </div>
                  </TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVulnerabilities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                      Уязвимости не найдены
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVulnerabilities.map((vuln) => (
                    <TableRow 
                      key={vuln.id} 
                      className="hover:bg-slate-50 cursor-pointer"
                      onClick={() => handleView(vuln)}
                    >
                      <TableCell className="font-medium">{vuln.vulnerability_number}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {vuln.related_asset_id ? (
                          <button
                            onClick={() => handleViewAsset(vuln.related_asset_id)}
                            className="text-cyan-600 text-sm hover:underline flex items-center gap-1"
                          >
                            {getRelatedAsset(vuln.related_asset_id)?.asset_number}
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="max-w-md truncate">{vuln.description}</TableCell>
                      <TableCell>{vuln.vulnerability_type}</TableCell>
                      <TableCell className="font-semibold">{vuln.cvss_score || '-'}</TableCell>
                      <TableCell>
                        {vuln.severity ? (
                          <span className="text-sm">{vuln.severity}</span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{vuln.status}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleView(vuln)} className="h-8 w-8 p-0" title="Просмотр">
                            <Eye className="w-4 h-4 text-cyan-600" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(vuln)} className="h-8 w-8 p-0" title="Редактировать">
                            <Edit className="w-4 h-4 text-slate-600" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(vuln.id)} className="h-8 w-8 p-0" title="Удалить">
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination bottom */}
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
              <Button size="sm" variant="outline" onClick={() => setPage(1)} disabled={page === 1}>
                <ChevronsLeft className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPage(page - 1)} disabled={page === 1}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm px-2">Страница {page} из {totalPages}</span>
              <Button size="sm" variant="outline" onClick={() => setPage(page + 1)} disabled={page === totalPages}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPage(totalPages)} disabled={page === totalPages}>
                <ChevronsRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Vulnerabilities;
