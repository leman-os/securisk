import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Filter, Edit, Trash2, Settings, Download, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, Eye, X, Link2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const RiskRegister = ({ user }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [risks, setRisks] = useState([]);
  const [filteredRisks, setFilteredRisks] = useState([]);
  const [assets, setAssets] = useState([]);
  const [threats, setThreats] = useState([]);
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewAssetDialogOpen, setViewAssetDialogOpen] = useState(false);
  const [viewThreatDialogOpen, setViewThreatDialogOpen] = useState(false);
  const [viewVulnDialogOpen, setViewVulnDialogOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState(null);
  const [viewingRisk, setViewingRisk] = useState(null);
  const [viewingAsset, setViewingAsset] = useState(null);
  const [viewingThreat, setViewingThreat] = useState(null);
  const [viewingVuln, setViewingVuln] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCriticality, setFilterCriticality] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination and sorting
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  const [formData, setFormData] = useState({
    scenario: '',
    related_assets: [],
    related_threats: [],
    related_vulnerabilities: [],
    probability: 3,
    impact: 3,
    owner: user?.full_name || '',
    treatment_strategy: 'Снижение',
    treatment_plan: '',
    implementation_deadline: '',
    status: 'Открыт',
    review_date: '',
  });

  // Dynamic select fields
  const [assetSelects, setAssetSelects] = useState([{ id: 0, value: '' }]);
  const [threatSelects, setThreatSelects] = useState([{ id: 0, value: '' }]);
  const [vulnSelects, setVulnSelects] = useState([{ id: 0, value: '' }]);

  useEffect(() => {
    fetchAssets();
    fetchThreats();
    fetchVulnerabilities();
  }, []);

  useEffect(() => {
    fetchRisks();
  }, [page, limit, sortBy, sortOrder]);

  useEffect(() => {
    applyFilters();
  }, [risks, searchTerm, filterStatus, filterCriticality]);

  // Auto-open risk from dashboard link (?risk_id=...)
  useEffect(() => {
    const riskId = searchParams.get('risk_id');
    if (!riskId) return;

    const openRisk = async () => {
      try {
        const response = await axios.get(`${API}/risks/${riskId}`);
        setViewingRisk(response.data);
        setViewDialogOpen(true);
        // Clear the param from URL without re-navigating
        setSearchParams({}, { replace: true });
      } catch (error) {
        console.error('Risk not found:', error);
      }
    };

    openRisk();
  }, [searchParams]);

  const fetchAssets = async () => {
    try {
      const response = await axios.get(`${API}/assets`, { params: { limit: 1000 } });
      setAssets(response.data.items);
    } catch (error) {
      console.error('Error fetching assets:', error);
    }
  };

  const fetchThreats = async () => {
    try {
      const response = await axios.get(`${API}/threats`, { params: { limit: 1000 } });
      setThreats(response.data.items);
    } catch (error) {
      console.error('Error fetching threats:', error);
    }
  };

  const fetchVulnerabilities = async () => {
    try {
      const response = await axios.get(`${API}/vulnerabilities`, { params: { limit: 1000 } });
      setVulnerabilities(response.data.items);
    } catch (error) {
      console.error('Error fetching vulnerabilities:', error);
    }
  };

  const fetchRisks = async () => {
    try {
      const response = await axios.get(`${API}/risks`, {
        params: { page, limit, sort_by: sortBy, sort_order: sortOrder }
      });
      setRisks(response.data.items);
      setTotal(response.data.total);
      setTotalPages(response.data.total_pages);
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
          risk.risk_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          risk.scenario?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          risk.owner?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter((risk) => risk.status === filterStatus);
    }

    if (filterCriticality !== 'all') {
      filtered = filtered.filter((risk) => risk.criticality === filterCriticality);
    }

    setFilteredRisks(filtered);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setFilterCriticality('all');
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
      const probability = Number(formData.probability);
      const impact = Number(formData.impact);
      const riskLevel = probability * impact;
      
      // Calculate criticality
      let criticality;
      if (riskLevel >= 15) criticality = 'Критический';
      else if (riskLevel >= 10) criticality = 'Высокий';
      else if (riskLevel >= 5) criticality = 'Средний';
      else criticality = 'Низкий';
      
      // Clean up data - add required fields
      const dataToSend = {
        scenario: formData.scenario,
        related_assets: formData.related_assets || [],
        related_threats: formData.related_threats || [],
        related_vulnerabilities: formData.related_vulnerabilities || [],
        probability: probability,
        impact: impact,
        risk_level: riskLevel,
        criticality: criticality,
        owner: formData.owner,
        treatment_strategy: formData.treatment_strategy,
        treatment_plan: formData.treatment_plan || null,
        implementation_deadline: formData.implementation_deadline || null,
        status: formData.status,
        review_date: formData.review_date || null,
        registration_date: new Date().toISOString(),
      };
      
      console.log('Sending risk data:', dataToSend);
      
      if (editingRisk) {
        await axios.put(`${API}/risks/${editingRisk.id}`, dataToSend);
        toast.success('Риск обновлен');
      } else {
        await axios.post(`${API}/risks`, dataToSend);
        toast.success('Риск создан');
      }
      setDialogOpen(false);
      resetForm();
      fetchRisks();
    } catch (error) {
      console.error('Risk save error:', error);
      const errorMessage = error.response?.data?.detail 
        ? (typeof error.response.data.detail === 'string' 
          ? error.response.data.detail 
          : JSON.stringify(error.response.data.detail))
        : 'Ошибка при сохранении';
      toast.error(errorMessage);
    }
  };

  const handleView = (risk) => {
    setViewingRisk(risk);
    setViewDialogOpen(true);
  };

  const handleViewAsset = (assetId) => {
    const asset = assets.find(a => a.id === assetId);
    if (asset) {
      setViewingAsset(asset);
      setViewAssetDialogOpen(true);
    }
  };

  const handleViewThreat = (threatId) => {
    const threat = threats.find(t => t.id === threatId);
    if (threat) {
      setViewingThreat(threat);
      setViewThreatDialogOpen(true);
    }
  };

  const handleViewVuln = (vulnId) => {
    const vuln = vulnerabilities.find(v => v.id === vulnId);
    if (vuln) {
      setViewingVuln(vuln);
      setViewVulnDialogOpen(true);
    }
  };

  const handleEditFromView = () => {
    setEditingRisk(viewingRisk);
    setFormData({
      scenario: viewingRisk.scenario || '',
      related_assets: viewingRisk.related_assets || [],
      related_threats: viewingRisk.related_threats || [],
      related_vulnerabilities: viewingRisk.related_vulnerabilities || [],
      probability: viewingRisk.probability || 3,
      impact: viewingRisk.impact || 3,
      owner: viewingRisk.owner || '',
      treatment_strategy: viewingRisk.treatment_strategy || 'Снижение',
      treatment_plan: viewingRisk.treatment_plan || '',
      implementation_deadline: viewingRisk.implementation_deadline || '',
      status: viewingRisk.status || 'Открыт',
      review_date: viewingRisk.review_date ? new Date(viewingRisk.review_date).toISOString().split('T')[0] : '',
    });
    
    // Set dynamic selects
    setAssetSelects(viewingRisk.related_assets?.length > 0 
      ? viewingRisk.related_assets.map((id, idx) => ({ id: idx, value: id }))
      : [{ id: 0, value: '' }]
    );
    setThreatSelects(viewingRisk.related_threats?.length > 0
      ? viewingRisk.related_threats.map((id, idx) => ({ id: idx, value: id }))
      : [{ id: 0, value: '' }]
    );
    setVulnSelects(viewingRisk.related_vulnerabilities?.length > 0
      ? viewingRisk.related_vulnerabilities.map((id, idx) => ({ id: idx, value: id }))
      : [{ id: 0, value: '' }]
    );
    
    setViewDialogOpen(false);
    setDialogOpen(true);
  };

  // Dynamic select handlers
  const addAssetSelect = () => {
    setAssetSelects([...assetSelects, { id: Date.now(), value: '' }]);
  };

  const updateAssetSelect = (selectId, value) => {
    const updatedSelects = assetSelects.map(s => s.id === selectId ? { ...s, value } : s);
    setAssetSelects(updatedSelects);
    // Update formData with all selected values
    const selectedAssets = updatedSelects.map(s => s.value).filter(v => v);
    setFormData({ ...formData, related_assets: selectedAssets });
  };

  const removeAssetSelect = (id) => {
    const updated = assetSelects.filter(s => s.id !== id);
    setAssetSelects(updated.length > 0 ? updated : [{ id: 0, value: '' }]);
    const selectedAssets = updated.map(s => s.value).filter(v => v);
    setFormData({ ...formData, related_assets: selectedAssets });
  };

  const addThreatSelect = () => {
    setThreatSelects([...threatSelects, { id: Date.now(), value: '' }]);
  };

  const updateThreatSelect = (selectId, value) => {
    const updatedSelects = threatSelects.map(s => s.id === selectId ? { ...s, value } : s);
    setThreatSelects(updatedSelects);
    const selectedThreats = updatedSelects.map(s => s.value).filter(v => v);
    setFormData({ ...formData, related_threats: selectedThreats });
  };

  const removeThreatSelect = (id) => {
    const updated = threatSelects.filter(s => s.id !== id);
    setThreatSelects(updated.length > 0 ? updated : [{ id: 0, value: '' }]);
    const selectedThreats = updated.map(s => s.value).filter(v => v);
    setFormData({ ...formData, related_threats: selectedThreats });
  };

  const addVulnSelect = () => {
    setVulnSelects([...vulnSelects, { id: Date.now(), value: '' }]);
  };

  const updateVulnSelect = (selectId, value) => {
    const updatedSelects = vulnSelects.map(s => s.id === selectId ? { ...s, value } : s);
    setVulnSelects(updatedSelects);
    const selectedVulns = updatedSelects.map(s => s.value).filter(v => v);
    setFormData({ ...formData, related_vulnerabilities: selectedVulns });
  };

  const removeVulnSelect = (id) => {
    const updated = vulnSelects.filter(s => s.id !== id);
    setVulnSelects(updated.length > 0 ? updated : [{ id: 0, value: '' }]);
    const selectedVulns = updated.map(s => s.value).filter(v => v);
    setFormData({ ...formData, related_vulnerabilities: selectedVulns });
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
      scenario: risk.scenario || '',
      related_assets: risk.related_assets || [],
      related_threats: risk.related_threats || [],
      related_vulnerabilities: risk.related_vulnerabilities || [],
      probability: risk.probability || 3,
      impact: risk.impact || 3,
      owner: risk.owner || '',
      treatment_strategy: risk.treatment_strategy || 'Снижение',
      treatment_plan: risk.treatment_plan || '',
      implementation_deadline: risk.implementation_deadline || '',
      status: risk.status || 'Открыт',
      review_date: risk.review_date ? new Date(risk.review_date).toISOString().split('T')[0] : '',
    });
    
    // Set dynamic selects based on existing data
    setAssetSelects(risk.related_assets?.length > 0 
      ? risk.related_assets.map((id, idx) => ({ id: idx, value: id }))
      : [{ id: 0, value: '' }]
    );
    setThreatSelects(risk.related_threats?.length > 0
      ? risk.related_threats.map((id, idx) => ({ id: idx, value: id }))
      : [{ id: 0, value: '' }]
    );
    setVulnSelects(risk.related_vulnerabilities?.length > 0
      ? risk.related_vulnerabilities.map((id, idx) => ({ id: idx, value: id }))
      : [{ id: 0, value: '' }]
    );
    
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingRisk(null);
    setFormData({
      scenario: '',
      related_assets: [],
      related_threats: [],
      related_vulnerabilities: [],
      probability: 3,
      impact: 3,
      owner: user?.full_name || '',
      treatment_strategy: 'Снижение',
      treatment_plan: '',
      implementation_deadline: '',
      status: 'Открыт',
      review_date: '',
    });
    setAssetSelects([{ id: 0, value: '' }]);
    setThreatSelects([{ id: 0, value: '' }]);
    setVulnSelects([{ id: 0, value: '' }]);
  };

  const getCriticalityColor = (criticality) => {
    switch (criticality) {
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
      case 'Открыт':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'В обработке':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Принят':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'Закрыт':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getRiskMatrixColor = (p, i) => {
    const level = p * i;
    if (level >= 15) return 'bg-red-500';
    if (level >= 10) return 'bg-orange-500';
    if (level >= 5) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const exportToCSV = () => {
    if (filteredRisks.length === 0) {
      toast.error('Нет данных для экспорта');
      return;
    }

    const headers = ['ID риска', 'Дата регистрации', 'Сценарий', 'Вероятность', 'Воздействие', 'Уровень риска', 'Критичность', 'Владелец', 'Стратегия', 'Статус'];
    
    const rows = filteredRisks.map(risk => [
      risk.risk_number,
      risk.registration_date ? new Date(risk.registration_date).toLocaleDateString('ru-RU') : '',
      risk.scenario,
      risk.probability,
      risk.impact,
      risk.risk_level,
      risk.criticality,
      risk.owner,
      risk.treatment_strategy,
      risk.status
    ]);

    const BOM = '\uFEFF';
    const csv = BOM + [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `risks_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Данные экспортированы');
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
              className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white gap-2"
            >
              <Plus className="w-4 h-4" />
              Создать риск
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                  <Input value={editingRisk.risk_number} disabled className="bg-slate-100" />
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Сценарий риска *</Label>
                <Textarea
                  value={formData.scenario}
                  onChange={(e) => setFormData({ ...formData, scenario: e.target.value })}
                  rows={4}
                  placeholder='Например: "Злоумышленник использует уязвимость Mass Assignment (VUL-012) в API лидов (AST-001) для повышения своих привилегий и кражи базы лидов."'
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Вероятность (1-5) *</Label>
                  <Select value={formData.probability.toString()} onValueChange={(v) => setFormData({ ...formData, probability: parseInt(v) })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Очень низкая</SelectItem>
                      <SelectItem value="2">2 - Низкая</SelectItem>
                      <SelectItem value="3">3 - Средняя</SelectItem>
                      <SelectItem value="4">4 - Высокая</SelectItem>
                      <SelectItem value="5">5 - Очень высокая</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Воздействие (1-5) *</Label>
                  <Select value={formData.impact.toString()} onValueChange={(v) => setFormData({ ...formData, impact: parseInt(v) })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Незначительное</SelectItem>
                      <SelectItem value="2">2 - Малое</SelectItem>
                      <SelectItem value="3">3 - Серьезное</SelectItem>
                      <SelectItem value="4">4 - Значительное</SelectItem>
                      <SelectItem value="5">5 - Катастрофическое</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-4 bg-slate-100 rounded">
                <p className="text-sm font-semibold">Уровень риска: {Number(formData.probability) * Number(formData.impact)}</p>
                <p className="text-sm text-slate-600">
                  Критичность: {
                    (Number(formData.probability) * Number(formData.impact)) >= 15 ? '🔴 Критический' :
                    (Number(formData.probability) * Number(formData.impact)) >= 10 ? '🟠 Высокий' :
                    (Number(formData.probability) * Number(formData.impact)) >= 5 ? '🟡 Средний' : '🟢 Низкий'
                  }
                </p>
              </div>

              <div className="space-y-2">
                <Label>Связанные активы</Label>
                {assetSelects.map((select, index) => (
                  <div key={select.id} className="flex gap-2">
                    <Select value={select.value} onValueChange={(v) => updateAssetSelect(select.id, v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите актив" />
                      </SelectTrigger>
                      <SelectContent>
                        {assets.map(asset => (
                          <SelectItem key={asset.id} value={asset.id}>
                            {asset.asset_number} - {asset.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {assetSelects.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeAssetSelect(select.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={addAssetSelect}
                  className="text-cyan-600"
                >
                  + Добавить актив
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Связанные угрозы</Label>
                {threatSelects.map((select, index) => (
                  <div key={select.id} className="flex gap-2">
                    <Select value={select.value} onValueChange={(v) => updateThreatSelect(select.id, v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите угрозу" />
                      </SelectTrigger>
                      <SelectContent>
                        {threats.map(threat => (
                          <SelectItem key={threat.id} value={threat.id}>
                            {threat.threat_number} - {(threat.description || '').substring(0, 60)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {threatSelects.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeThreatSelect(select.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={addThreatSelect}
                  className="text-cyan-600"
                >
                  + Добавить угрозу
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Связанные уязвимости</Label>
                {vulnSelects.map((select, index) => (
                  <div key={select.id} className="flex gap-2">
                    <Select value={select.value} onValueChange={(v) => updateVulnSelect(select.id, v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите уязвимость" />
                      </SelectTrigger>
                      <SelectContent>
                        {vulnerabilities.map(vuln => (
                          <SelectItem key={vuln.id} value={vuln.id}>
                            {vuln.vulnerability_number} - {(vuln.description || '').substring(0, 60)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {vulnSelects.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeVulnSelect(select.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={addVulnSelect}
                  className="text-cyan-600"
                >
                  + Добавить уязвимость
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Владелец риска *</Label>
                  <Input
                    value={formData.owner}
                    onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Стратегия обработки *</Label>
                  <Select value={formData.treatment_strategy} onValueChange={(v) => setFormData({ ...formData, treatment_strategy: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Снижение">Снижение</SelectItem>
                      <SelectItem value="Принятие">Принятие</SelectItem>
                      <SelectItem value="Передача">Передача</SelectItem>
                      <SelectItem value="Избегание">Избегание</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>План обработки</Label>
                <Textarea
                  value={formData.treatment_plan}
                  onChange={(e) => setFormData({ ...formData, treatment_plan: e.target.value })}
                  rows={3}
                  placeholder="1. Внедрить WAF. 2. Провести тренинг для разработчиков."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Срок реализации</Label>
                  <Input
                    value={formData.implementation_deadline}
                    onChange={(e) => setFormData({ ...formData, implementation_deadline: e.target.value })}
                    placeholder="Q3 2026"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Дата пересмотра</Label>
                  <Input
                    type="date"
                    value={formData.review_date}
                    onChange={(e) => setFormData({ ...formData, review_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Статус *</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Открыт">Открыт</SelectItem>
                    <SelectItem value="В обработке">В обработке</SelectItem>
                    <SelectItem value="Принят">Принят</SelectItem>
                    <SelectItem value="Закрыт">Закрыт</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Отмена
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-cyan-500 to-cyan-600">
                  {editingRisk ? 'Обновить' : 'Создать'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {viewingRisk && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-cyan-600" />
                  Риск {viewingRisk.risk_number}
                </DialogTitle>
                <div className="flex gap-2">
                  <Badge className={getCriticalityColor(viewingRisk.criticality)}>{viewingRisk.criticality}</Badge>
                  <Badge className={getStatusColor(viewingRisk.status)}>{viewingRisk.status}</Badge>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded">
                  <h3 className="font-semibold text-sm mb-2">Сценарий риска</h3>
                  <p className="text-sm">{viewingRisk.scenario}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs text-slate-500 mb-1">Вероятность</p>
                      <p className="text-2xl font-bold">{viewingRisk.probability}/5</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs text-slate-500 mb-1">Воздействие</p>
                      <p className="text-2xl font-bold">{viewingRisk.impact}/5</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs text-slate-500 mb-1">Уровень риска</p>
                      <p className="text-2xl font-bold">{viewingRisk.risk_level}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs text-slate-500 mb-1">Критичность</p>
                      <Badge className={getCriticalityColor(viewingRisk.criticality)}>{viewingRisk.criticality}</Badge>
                    </CardContent>
                  </Card>
                </div>

                {/* Risk Matrix */}
                <div className="bg-slate-50 p-4 rounded">
                  <h3 className="font-semibold text-sm mb-3">Матрица рисков 5x5</h3>
                  <div className="grid grid-cols-6 gap-1">
                    <div></div>
                    <div className="text-xs text-center font-semibold">1</div>
                    <div className="text-xs text-center font-semibold">2</div>
                    <div className="text-xs text-center font-semibold">3</div>
                    <div className="text-xs text-center font-semibold">4</div>
                    <div className="text-xs text-center font-semibold">5</div>
                    {[5, 4, 3, 2, 1].map(p => (
                      <>
                        <div key={`label-${p}`} className="text-xs font-semibold flex items-center justify-center">{p}</div>
                        {[1, 2, 3, 4, 5].map(i => (
                          <div
                            key={`${p}-${i}`}
                            className={`h-12 w-12 flex items-center justify-center rounded text-white text-xs font-semibold ${getRiskMatrixColor(p, i)} ${viewingRisk.probability === p && viewingRisk.impact === i ? 'ring-4 ring-blue-600' : ''}`}
                          >
                            {p * i}
                          </div>
                        ))}
                      </>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2"><div className="w-4 h-4 bg-green-500 rounded"></div>Низкий (1-4)</div>
                    <div className="flex items-center gap-2"><div className="w-4 h-4 bg-yellow-500 rounded"></div>Средний (5-9)</div>
                    <div className="flex items-center gap-2"><div className="w-4 h-4 bg-orange-500 rounded"></div>Высокий (10-14)</div>
                    <div className="flex items-center gap-2"><div className="w-4 h-4 bg-red-500 rounded"></div>Критический (15-25)</div>
                  </div>
                </div>

                {(viewingRisk.related_assets?.length > 0 || viewingRisk.related_threats?.length > 0 || viewingRisk.related_vulnerabilities?.length > 0) && (
                  <div className="space-y-3">
                    {viewingRisk.related_assets?.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-sm mb-2">Связанные активы ({viewingRisk.related_assets.length})</h3>
                        <div className="flex flex-wrap gap-2">
                          {viewingRisk.related_assets.map(assetId => {
                            const asset = assets.find(a => a.id === assetId);
                            return asset ? (
                              <button
                                key={assetId}
                                onClick={() => handleViewAsset(assetId)}
                                className="inline-flex items-center px-3 py-1 rounded-md text-sm border border-slate-300 bg-white hover:bg-slate-100 transition-colors"
                              >
                                <Link2 className="w-3 h-3 mr-1 text-cyan-600" />
                                <span className="font-medium">{asset.asset_number}</span>
                                <span className="ml-1 text-slate-600">- {asset.name}</span>
                              </button>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}

                    {viewingRisk.related_threats?.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-sm mb-2">Связанные угрозы ({viewingRisk.related_threats.length})</h3>
                        <div className="flex flex-wrap gap-2">
                          {viewingRisk.related_threats.map(threatId => {
                            const threat = threats.find(t => t.id === threatId);
                            return threat ? (
                              <button
                                key={threatId}
                                onClick={() => handleViewThreat(threatId)}
                                className="inline-flex items-center px-3 py-1 rounded-md text-sm border border-slate-300 bg-white hover:bg-slate-100 transition-colors"
                              >
                                <Link2 className="w-3 h-3 mr-1 text-orange-600" />
                                <span className="font-medium">{threat.threat_number}</span>
                                <span className="ml-1 text-slate-600">- {(threat.description || '').substring(0, 40)}...</span>
                              </button>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}

                    {viewingRisk.related_vulnerabilities?.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-sm mb-2">Связанные уязвимости ({viewingRisk.related_vulnerabilities.length})</h3>
                        <div className="flex flex-wrap gap-2">
                          {viewingRisk.related_vulnerabilities.map(vulnId => {
                            const vuln = vulnerabilities.find(v => v.id === vulnId);
                            return vuln ? (
                              <button
                                key={vulnId}
                                onClick={() => handleViewVuln(vulnId)}
                                className="inline-flex items-center px-3 py-1 rounded-md text-sm border border-slate-300 bg-white hover:bg-slate-100 transition-colors"
                              >
                                <Link2 className="w-3 h-3 mr-1 text-red-600" />
                                <span className="font-medium">{vuln.vulnerability_number}</span>
                                <span className="ml-1 text-slate-600">- {(vuln.description || '').substring(0, 40)}...</span>
                              </button>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Владелец</p>
                    <p className="text-sm font-semibold">{viewingRisk.owner}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Стратегия обработки</p>
                    <p className="text-sm font-semibold">{viewingRisk.treatment_strategy}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Срок реализации</p>
                    <p className="text-sm">{viewingRisk.implementation_deadline || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Дата пересмотра</p>
                    <p className="text-sm">{viewingRisk.review_date ? new Date(viewingRisk.review_date).toLocaleDateString('ru-RU') : '-'}</p>
                  </div>
                </div>

                {viewingRisk.treatment_plan && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">План обработки</p>
                    <p className="text-sm whitespace-pre-wrap">{viewingRisk.treatment_plan}</p>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => handleDelete(viewingRisk.id)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Удалить
                  </Button>
                  <Button variant="outline" onClick={handleEditFromView}>
                    <Edit className="w-4 h-4 mr-2" />
                    Редактировать
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Asset View Dialog */}
      <Dialog open={viewAssetDialogOpen} onOpenChange={setViewAssetDialogOpen}>
        <DialogContent>
          {viewingAsset && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle>Актив {viewingAsset.asset_number}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div><span className="font-semibold">Название:</span> {viewingAsset.name}</div>
                <div><span className="font-semibold">Категория:</span> {viewingAsset.category}</div>
                <div><span className="font-semibold">Владелец:</span> {viewingAsset.owner}</div>
                <div><span className="font-semibold">Критичность:</span> <Badge className={getCriticalityColor(viewingAsset.criticality)}>{viewingAsset.criticality}</Badge></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Threat View Dialog */}
      <Dialog open={viewThreatDialogOpen} onOpenChange={setViewThreatDialogOpen}>
        <DialogContent>
          {viewingThreat && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle>Угроза {viewingThreat.threat_number}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div><span className="font-semibold">Категория:</span> {viewingThreat.category}</div>
                <div><span className="font-semibold">Описание:</span> {viewingThreat.description}</div>
                {viewingThreat.source && <div><span className="font-semibold">Источник:</span> {viewingThreat.source}</div>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Vulnerability View Dialog */}
      <Dialog open={viewVulnDialogOpen} onOpenChange={setViewVulnDialogOpen}>
        <DialogContent>
          {viewingVuln && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle>Уязвимость {viewingVuln.vulnerability_number}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div><span className="font-semibold">Описание:</span> {viewingVuln.description}</div>
                <div><span className="font-semibold">Тип:</span> {viewingVuln.vulnerability_type}</div>
                {viewingVuln.cvss_score && <div><span className="font-semibold">CVSS Score:</span> {viewingVuln.cvss_score}</div>}
                {viewingVuln.severity && <div><span className="font-semibold">Критичность:</span> {viewingVuln.severity}</div>}
                <div><span className="font-semibold">Статус:</span> {viewingVuln.status}</div>
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Фильтры {showFilters ? '▲' : '▼'}
              </Button>
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="w-4 h-4 mr-2" />
                Экспорт CSV
              </Button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg">
                <div className="space-y-2">
                  <Label>Поиск</Label>
                  <Input
                    placeholder="Поиск по ID, сценарию..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Статус</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все</SelectItem>
                      <SelectItem value="Открыт">Открыт</SelectItem>
                      <SelectItem value="В обработке">В обработке</SelectItem>
                      <SelectItem value="Принят">Принят</SelectItem>
                      <SelectItem value="Закрыт">Закрыт</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Критичность</Label>
                  <Select value={filterCriticality} onValueChange={setFilterCriticality}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все</SelectItem>
                      <SelectItem value="Критический">Критический</SelectItem>
                      <SelectItem value="Высокий">Высокий</SelectItem>
                      <SelectItem value="Средний">Средний</SelectItem>
                      <SelectItem value="Низкий">Низкий</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    Сбросить
                  </Button>
                </div>
              </div>
            )}

            <div className="text-sm text-slate-600">
              Показано {filteredRisks.length} из {total} рисков
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead onClick={() => handleSort('risk_number')} className="cursor-pointer hover:bg-slate-100">
                      <div className="flex items-center gap-1">
                        ID риска
                        {sortBy === 'risk_number' && <ArrowUpDown className="w-3 h-3" />}
                      </div>
                    </TableHead>
                    <TableHead onClick={() => handleSort('registration_date')} className="cursor-pointer hover:bg-slate-100">
                      <div className="flex items-center gap-1">
                        Дата
                        {sortBy === 'registration_date' && <ArrowUpDown className="w-3 h-3" />}
                      </div>
                    </TableHead>
                    <TableHead>Сценарий</TableHead>
                    <TableHead className="text-center">Связи</TableHead>
                    <TableHead className="text-center">P</TableHead>
                    <TableHead className="text-center">I</TableHead>
                    <TableHead className="text-center">Уровень</TableHead>
                    <TableHead>Критичность</TableHead>
                    <TableHead>Владелец</TableHead>
                    <TableHead>Стратегия</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRisks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-8 text-slate-500">
                        Риски не найдены
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRisks.map((risk) => (
                      <TableRow
                        key={risk.id}
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={() => handleView(risk)}
                      >
                        <TableCell className="font-medium">{risk.risk_number}</TableCell>
                        <TableCell className="text-sm">
                          {risk.registration_date ? new Date(risk.registration_date).toLocaleDateString('ru-RU') : '-'}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <p className="truncate text-sm">{risk.scenario}</p>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex gap-1 justify-center">
                            {risk.related_assets?.length > 0 && (
                              <Badge variant="outline" className="text-xs">A:{risk.related_assets.length}</Badge>
                            )}
                            {risk.related_threats?.length > 0 && (
                              <Badge variant="outline" className="text-xs">T:{risk.related_threats.length}</Badge>
                            )}
                            {risk.related_vulnerabilities?.length > 0 && (
                              <Badge variant="outline" className="text-xs">V:{risk.related_vulnerabilities.length}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-semibold">{risk.probability}</TableCell>
                        <TableCell className="text-center font-semibold">{risk.impact}</TableCell>
                        <TableCell className="text-center font-bold">{risk.risk_level}</TableCell>
                        <TableCell>
                          <Badge className={getCriticalityColor(risk.criticality)} variant="outline">
                            {risk.criticality}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{risk.owner}</TableCell>
                        <TableCell className="text-sm">{risk.treatment_strategy}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(risk.status)} variant="outline">
                            {risk.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleView(risk)}
                              className="h-8 w-8 p-0"
                              title="Просмотр"
                            >
                              <Eye className="w-4 h-4 text-cyan-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(risk)}
                              className="h-8 w-8 p-0"
                              title="Редактировать"
                            >
                              <Edit className="w-4 h-4 text-slate-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(risk.id)}
                              className="h-8 w-8 p-0"
                              title="Удалить"
                            >
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

            {/* Pagination */}
            <div className="flex justify-between items-center">
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
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                >
                  <ChevronsLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm">
                  Страница {page} из {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                >
                  <ChevronsRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RiskRegister;
