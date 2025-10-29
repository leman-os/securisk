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
import { Plus, Eye, Edit, Trash2, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, X } from 'lucide-react';
import { toast } from 'sonner';

const Threats = ({ user }) => {
  const [threats, setThreats] = useState([]);
  const [filteredThreats, setFilteredThreats] = useState([]);
  const [settings, setSettings] = useState(null);
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [mitreAttacks, setMitreAttacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewVulnDialogOpen, setViewVulnDialogOpen] = useState(false);
  const [editingThreat, setEditingThreat] = useState(null);
  const [viewingThreat, setViewingThreat] = useState(null);
  const [viewingVuln, setViewingVuln] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination and sorting
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  const [formData, setFormData] = useState({
    threat_number: '',
    category: '',
    description: '',
    source: '',
    related_vulnerability_id: '',
    mitre_attack_id: ''
  });

  useEffect(() => {
    fetchSettings();
    fetchVulnerabilities();
    fetchMitreAttacks();
  }, []);

  useEffect(() => {
    fetchThreats();
  }, [page, limit, sortBy, sortOrder]);

  useEffect(() => {
    applyFilters();
  }, [threats, searchTerm, filterCategory, filterSource]);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings`);
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchVulnerabilities = async () => {
    try {
      const response = await axios.get(`${API}/vulnerabilities`, {
        params: { limit: 1000 }
      });
      setVulnerabilities(response.data.items);
    } catch (error) {
      console.error('Error fetching vulnerabilities:', error);
    }
  };

  const fetchMitreAttacks = async () => {
    try {
      const response = await axios.get(`${API}/mitre-attack`);
      setMitreAttacks(response.data);
    } catch (error) {
      console.error('Error fetching MITRE ATT&CK:', error);
    }
  };

  const getMitreTechnique = (id) => {
    return mitreAttacks.find(tech => tech.id === id);
  };

  const getRelatedVulnerability = (id) => {
    return vulnerabilities.find(vuln => vuln.id === id);
  };

  const handleViewVuln = (vulnId) => {
    const vuln = vulnerabilities.find(v => v.id === vulnId);
    if (vuln) {
      setViewingVuln(vuln);
      setViewVulnDialogOpen(true);
    }
  };

  const fetchThreats = async () => {
    try {
      const response = await axios.get(`${API}/threats`, {
        params: { page, limit, sort_by: sortBy, sort_order: sortOrder }
      });
      setThreats(response.data.items);
      setTotal(response.data.total);
      setTotalPages(response.data.total_pages);
    } catch (error) {
      toast.error('Ошибка загрузки угроз');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = threats;

    if (searchTerm) {
      filtered = filtered.filter(threat =>
        threat.threat_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        threat.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        threat.source?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterCategory !== 'all') {
      filtered = filtered.filter(threat => threat.category === filterCategory);
    }

    if (filterSource !== 'all') {
      filtered = filtered.filter(threat => threat.source === filterSource);
    }

    setFilteredThreats(filtered);
  };

  const resetForm = () => {
    setFormData({
      threat_number: '',
      category: '',
      description: '',
      source: '',
      related_vulnerability_id: '',
      mitre_attack_id: ''
    });
    setEditingThreat(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingThreat) {
        await axios.put(`${API}/threats/${editingThreat.id}`, formData);
        toast.success('Угроза обновлена');
      } else {
        await axios.post(`${API}/threats`, formData);
        toast.success('Угроза создана');
      }
      setDialogOpen(false);
      resetForm();
      fetchThreats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка при сохранении');
    }
  };

  const handleEdit = (threat) => {
    setEditingThreat(threat);
    setFormData(threat);
    setDialogOpen(true);
  };

  const handleView = (threat) => {
    setViewingThreat(threat);
    setViewDialogOpen(true);
  };

  const handleEditFromView = () => {
    setEditingThreat(viewingThreat);
    setFormData(viewingThreat);
    setViewDialogOpen(false);
    setDialogOpen(true);
  };

  const handleDeleteFromView = async () => {
    if (!window.confirm('Удалить угрозу?')) return;
    try {
      await axios.delete(`${API}/threats/${viewingThreat.id}`);
      toast.success('Угроза удалена');
      setViewDialogOpen(false);
      fetchThreats();
    } catch (error) {
      toast.error('Ошибка при удалении');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить угрозу?')) return;
    try {
      await axios.delete(`${API}/threats/${id}`);
      toast.success('Угроза удалена');
      fetchThreats();
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
    setFilterCategory('all');
    setFilterSource('all');
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Реестр угроз</h1>
          <p className="text-slate-600 mt-1">Управление угрозами информационной безопасности</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-gradient-to-r from-cyan-500 to-cyan-600">
          <Plus className="w-4 h-4 mr-2" />
          Добавить угрозу
        </Button>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingThreat ? 'Редактировать угрозу' : 'Создать угрозу'}</DialogTitle>
            <DialogDescription>Заполните информацию об угрозе ИБ</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Категория угрозы *</Label>
                <Select value={formData.category} onValueChange={(val) => setFormData({...formData, category: val})} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите категорию" />
                  </SelectTrigger>
                  <SelectContent>
                    {settings?.threat_categories?.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Источник угрозы</Label>
                <Select value={formData.source} onValueChange={(val) => setFormData({...formData, source: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите источник" />
                  </SelectTrigger>
                  <SelectContent>
                    {settings?.threat_sources?.map(src => (
                      <SelectItem key={src} value={src}>{src}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Описание угрозы *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Опишите угрозу..."
                required
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Связанная уязвимость</Label>
                <Select value={formData.related_vulnerability_id || 'none'} onValueChange={(val) => setFormData({...formData, related_vulnerability_id: val === 'none' ? '' : val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите уязвимость" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Не выбрано</SelectItem>
                    {vulnerabilities.map(vuln => (
                      <SelectItem key={vuln.id} value={vuln.id}>
                        {vuln.vulnerability_number} - {vuln.description.substring(0, 50)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>MITRE ATT&CK Technique</Label>
                <Select value={formData.mitre_attack_id || 'none'} onValueChange={(val) => setFormData({...formData, mitre_attack_id: val === 'none' ? '' : val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите технику" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Не выбрано</SelectItem>
                    {mitreAttacks.map(tech => (
                      <SelectItem key={tech.id} value={tech.id}>
                        {tech.technique_id} - {tech.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            <DialogTitle>Просмотр угрозы</DialogTitle>
            <DialogDescription>Подробная информация об угрозе ИБ</DialogDescription>
          </DialogHeader>
          {viewingThreat && (
            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-lg">
                <h3 className="font-semibold text-sm text-slate-700 mb-3">Основная информация</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase">ID угрозы:</span>
                    <p className="text-sm mt-1">{viewingThreat.threat_number}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase">Категория:</span>
                    <p className="text-sm mt-1">{viewingThreat.category}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase">Источник:</span>
                    <p className="text-sm mt-1">{viewingThreat.source || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase">MITRE ATT&CK:</span>
                    <p className="text-sm mt-1">
                      {viewingThreat.mitre_attack_id ? 
                        `${getMitreTechnique(viewingThreat.mitre_attack_id)?.technique_id} - ${getMitreTechnique(viewingThreat.mitre_attack_id)?.name}` 
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-4 rounded-lg">
                <span className="text-xs font-semibold text-slate-500 uppercase">Описание угрозы:</span>
                <p className="text-sm mt-2 whitespace-pre-wrap">{viewingThreat.description}</p>
              </div>

              {viewingThreat.related_vulnerability_id && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-sm text-slate-700 mb-2">Связанная уязвимость</h3>
                  <button
                    onClick={() => handleViewVuln(viewingThreat.related_vulnerability_id)}
                    className="inline-flex items-center gap-2 text-sm text-cyan-600 hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {getRelatedVulnerability(viewingThreat.related_vulnerability_id)?.vulnerability_number} - 
                    {getRelatedVulnerability(viewingThreat.related_vulnerability_id)?.description.substring(0, 50)}...
                  </button>
                </div>
              )}

              <div className="bg-slate-50 p-4 rounded-lg">
                <h3 className="font-semibold text-sm text-slate-700 mb-3">Дополнительно</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase">Дата создания:</span>
                    <p className="text-sm mt-1">{viewingThreat.created_at ? new Date(viewingThreat.created_at).toLocaleString('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase">Последнее обновление:</span>
                    <p className="text-sm mt-1">{viewingThreat.updated_at ? new Date(viewingThreat.updated_at).toLocaleString('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</p>
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

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="w-4 h-4 mr-2" />
                {showFilters ? 'Скрыть фильтры' : 'Показать фильтры'}
              </Button>
              {(searchTerm || filterCategory !== 'all' || filterSource !== 'all') && (
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
                  <Label>Категория</Label>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все категории</SelectItem>
                      {settings?.threat_categories?.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Источник</Label>
                  <Select value={filterSource} onValueChange={setFilterSource}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все источники</SelectItem>
                      {settings?.threat_sources?.map(src => (
                        <SelectItem key={src} value={src}>{src}</SelectItem>
                      ))}
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
                  <TableHead onClick={() => handleSort('threat_number')} className="cursor-pointer hover:bg-slate-100">
                    <div className="flex items-center gap-1">
                      ID угрозы
                      {sortBy === 'threat_number' && <ArrowUpDown className="w-3 h-3" />}
                    </div>
                  </TableHead>
                  <TableHead onClick={() => handleSort('category')} className="cursor-pointer hover:bg-slate-100">
                    <div className="flex items-center gap-1">
                      Категория
                      {sortBy === 'category' && <ArrowUpDown className="w-3 h-3" />}
                    </div>
                  </TableHead>
                  <TableHead>Описание</TableHead>
                  <TableHead onClick={() => handleSort('source')} className="cursor-pointer hover:bg-slate-100">
                    <div className="flex items-center gap-1">
                      Источник
                      {sortBy === 'source' && <ArrowUpDown className="w-3 h-3" />}
                    </div>
                  </TableHead>
                  <TableHead>MITRE ATT&CK</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredThreats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      Угрозы не найдены
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredThreats.map((threat) => (
                    <TableRow 
                      key={threat.id} 
                      className="hover:bg-slate-50 cursor-pointer"
                      onClick={() => handleView(threat)}
                    >
                      <TableCell className="font-medium">{threat.threat_number}</TableCell>
                      <TableCell>{threat.category}</TableCell>
                      <TableCell className="max-w-md truncate">{threat.description}</TableCell>
                      <TableCell>{threat.source || '-'}</TableCell>
                      <TableCell className="text-sm">
                        {threat.mitre_attack_id ? 
                          `${getMitreTechnique(threat.mitre_attack_id)?.technique_id} - ${getMitreTechnique(threat.mitre_attack_id)?.name}` 
                          : '-'}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleView(threat)} className="h-8 w-8 p-0" title="Просмотр">
                            <Eye className="w-4 h-4 text-cyan-600" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(threat)} className="h-8 w-8 p-0" title="Редактировать">
                            <Edit className="w-4 h-4 text-slate-600" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(threat.id)} className="h-8 w-8 p-0" title="Удалить">
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

export default Threats;
