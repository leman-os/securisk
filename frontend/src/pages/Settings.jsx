import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Settings as SettingsIcon } from 'lucide-react';
import { toast } from 'sonner';

const Settings = ({ user }) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [newSubjectType, setNewSubjectType] = useState('');
  const [newSystem, setNewSystem] = useState('');
  const [newThreat, setNewThreat] = useState('');
  const [newAssetStatus, setNewAssetStatus] = useState('');
  const [newThreatCategory, setNewThreatCategory] = useState('');
  const [newThreatSource, setNewThreatSource] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings`);
      setSettings(response.data);
    } catch (error) {
      toast.error('Ошибка загрузки настроек');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates) => {
    try {
      const response = await axios.put(`${API}/settings`, updates);
      setSettings(response.data);
      toast.success('Настройки обновлены');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка при обновлении');
    }
  };

  const addSubjectType = () => {
    if (!newSubjectType.trim()) return;
    const updated = [...(settings?.subject_types || []), newSubjectType.trim()];
    updateSettings({ subject_types: updated });
    setNewSubjectType('');
  };

  const removeSubjectType = (type) => {
    const updated = settings.subject_types.filter((t) => t !== type);
    updateSettings({ subject_types: updated });
  };

  const addSystem = () => {
    if (!newSystem.trim()) return;
    const updated = [...(settings?.systems || []), newSystem.trim()];
    updateSettings({ systems: updated });
    setNewSystem('');
  };

  const removeSystem = (system) => {
    const updated = settings.systems.filter((s) => s !== system);
    updateSettings({ systems: updated });
  };

  const addThreat = () => {
    if (!newThreat.trim()) return;
    const updated = [...(settings?.threats || []), newThreat.trim()];
    updateSettings({ threats: updated });
    setNewThreat('');
  };

  const removeThreat = (threat) => {
    const updated = settings.threats.filter((t) => t !== threat);
    updateSettings({ threats: updated });
  };

  const addAssetStatus = () => {
    if (!newAssetStatus.trim()) return;
    const updated = [...(settings?.asset_statuses || []), newAssetStatus.trim()];
    updateSettings({ asset_statuses: updated });
    setNewAssetStatus('');
  };

  const removeAssetStatus = (status) => {
    const updated = settings.asset_statuses.filter((s) => s !== status);
    updateSettings({ asset_statuses: updated });
  };

  const addThreatCategory = () => {
    if (!newThreatCategory.trim()) return;
    const updated = [...(settings?.threat_categories || []), newThreatCategory.trim()];
    updateSettings({ threat_categories: updated });
    setNewThreatCategory('');
  };

  const removeThreatCategory = (category) => {
    const updated = settings.threat_categories.filter((c) => c !== category);
    updateSettings({ threat_categories: updated });
  };

  const addThreatSource = () => {
    if (!newThreatSource.trim()) return;
    const updated = [...(settings?.threat_sources || []), newThreatSource.trim()];
    updateSettings({ threat_sources: updated });
    setNewThreatSource('');
  };

  const removeThreatSource = (source) => {
    const updated = settings.threat_sources.filter((s) => s !== source);
    updateSettings({ threat_sources: updated });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  if (user?.role !== 'Администратор') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Настройки</h1>
          <p className="text-slate-600">Управление справочниками системы</p>
        </div>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <p className="text-amber-800">
              Только администраторы могут управлять настройками системы.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Настройки</h1>
        <p className="text-slate-600">Управление справочниками системы</p>
      </div>

      {/* Subject Types */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-cyan-600" />
            Типы субъектов
          </CardTitle>
          <CardDescription>
            Используются при регистрации инцидентов для классификации нарушителей
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {settings?.subject_types?.map((type) => (
              <Badge
                key={type}
                className="bg-cyan-100 text-cyan-800 border-cyan-300 px-3 py-1.5 text-sm"
                variant="outline"
              >
                {type}
                <button
                  onClick={() => removeSubjectType(type)}
                  className="ml-2 hover:text-cyan-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              data-testid="new-subject-type-input"
              placeholder="Добавить новый тип субъекта"
              value={newSubjectType}
              onChange={(e) => setNewSubjectType(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addSubjectType()}
            />
            <Button
              onClick={addSubjectType}
              className="bg-gradient-to-r from-cyan-500 to-cyan-600"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Systems */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-cyan-600" />
            Системы
          </CardTitle>
          <CardDescription>
            Список систем и платформ для классификации инцидентов
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {settings?.systems?.map((system) => (
              <Badge
                key={system}
                className="bg-blue-100 text-blue-800 border-blue-300 px-3 py-1.5 text-sm"
                variant="outline"
              >
                {system}
                <button
                  onClick={() => removeSystem(system)}
                  className="ml-2 hover:text-blue-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              data-testid="new-system-input"
              placeholder="Добавить новую систему"
              value={newSystem}
              onChange={(e) => setNewSystem(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addSystem()}
            />
            <Button
              onClick={addSystem}
              className="bg-gradient-to-r from-cyan-500 to-cyan-600"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Threats */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-cyan-600" />
            Угрозы
          </CardTitle>
          <CardDescription>
            Список угроз для классификации информационных активов
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {settings?.threats?.map((threat) => (
              <Badge
                key={threat}
                className="bg-red-100 text-red-800 border-red-300 px-3 py-1.5 text-sm"
                variant="outline"
              >
                {threat}
                <button
                  onClick={() => removeThreat(threat)}
                  className="ml-2 hover:text-red-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              data-testid="new-threat-input"
              placeholder="Добавить новую угрозу"
              value={newThreat}
              onChange={(e) => setNewThreat(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addThreat()}
            />
            <Button
              onClick={addThreat}
              className="bg-gradient-to-r from-cyan-500 to-cyan-600"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Asset Statuses */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-cyan-600" />
            Статусы активов
          </CardTitle>
          <CardDescription>
            Список статусов для классификации информационных активов
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {settings?.asset_statuses?.map((status) => (
              <Badge
                key={status}
                className="bg-green-100 text-green-800 border-green-300 px-3 py-1.5 text-sm"
                variant="outline"
              >
                {status}
                <button
                  onClick={() => removeAssetStatus(status)}
                  className="ml-2 hover:text-green-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              data-testid="new-asset-status-input"
              placeholder="Добавить новый статус актива"
              value={newAssetStatus}
              onChange={(e) => setNewAssetStatus(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addAssetStatus()}
            />
            <Button
              onClick={addAssetStatus}
              className="bg-gradient-to-r from-cyan-500 to-cyan-600"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-slate-50">
        <CardContent className="pt-6">
          <p className="text-sm text-slate-600">
            <strong>Примечание:</strong> Изменения в справочниках сразу отражаются при создании и редактировании инцидентов и активов.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
