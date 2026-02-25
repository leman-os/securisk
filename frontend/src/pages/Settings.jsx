import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Settings as SettingsIcon, Sun, Moon, User } from 'lucide-react';
import { toast } from 'sonner';

const Settings = ({ user }) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  );

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', next ? 'dark' : 'light');
    toast.success(next ? 'Тёмная тема включена' : 'Светлая тема включена');
  };
  
  const [newSubjectType, setNewSubjectType] = useState('');
  const [newSystem, setNewSystem] = useState('');
  const [newThreat, setNewThreat] = useState('');
  const [newAssetStatus, setNewAssetStatus] = useState('');
  const [newAssetCategory, setNewAssetCategory] = useState('');
  const [newThreatCategory, setNewThreatCategory] = useState('');
  const [newThreatSource, setNewThreatSource] = useState('');
  const [newAssetOwner, setNewAssetOwner] = useState('');

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
      console.error('Settings update error:', error);
      const errorMessage = error.response?.data?.detail 
        ? (typeof error.response.data.detail === 'string' 
          ? error.response.data.detail 
          : JSON.stringify(error.response.data.detail))
        : 'Ошибка при обновлении';
      toast.error(errorMessage);
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

  const addAssetCategory = () => {
    if (!newAssetCategory.trim()) return;
    const updated = [...(settings?.asset_categories || []), newAssetCategory.trim()];
    updateSettings({ asset_categories: updated });
    setNewAssetCategory('');
  };

  const removeAssetCategory = (category) => {
    const updated = settings.asset_categories.filter((c) => c !== category);
    updateSettings({ asset_categories: updated });
  };

  const addAssetOwner = () => {
    if (!newAssetOwner.trim()) return;
    const updated = [...(settings?.asset_owners || []), newAssetOwner.trim()];
    updateSettings({ asset_owners: updated });
    setNewAssetOwner('');
  };

  const removeAssetOwner = (owner) => {
    const updated = (settings.asset_owners || []).filter((o) => o !== owner);
    updateSettings({ asset_owners: updated });
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
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Настройки</h1>
        <p className="text-slate-600 dark:text-slate-400">Управление справочниками системы</p>
      </div>

      {/* Theme toggle */}
      <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
            {isDark ? <Moon className="w-5 h-5 text-violet-500" /> : <Sun className="w-5 h-5 text-amber-500" />}
            Тема интерфейса
          </CardTitle>
          <CardDescription className="dark:text-slate-400">
            Выберите светлую или тёмную тему оформления
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <button
              onClick={() => { if (isDark) toggleTheme(); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                !isDark
                  ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                  : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <Sun className="w-4 h-4" />
              Светлая
            </button>
            <button
              onClick={() => { if (!isDark) toggleTheme(); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                isDark
                  ? 'border-violet-500 bg-violet-900/30 text-violet-400'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              <Moon className="w-4 h-4" />
              Тёмная
            </button>
          </div>
        </CardContent>
      </Card>

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

      {/* Asset Categories */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-cyan-600" />
            Категории активов
          </CardTitle>
          <CardDescription>
            Список категорий для классификации информационных активов
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {settings?.asset_categories?.map((category) => (
              <Badge
                key={category}
                className="bg-purple-100 text-purple-800 border-purple-300 px-3 py-1.5 text-sm"
                variant="outline"
              >
                {category}
                <button
                  onClick={() => removeAssetCategory(category)}
                  className="ml-2 hover:text-purple-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Добавить новую категорию актива"
              value={newAssetCategory}
              onChange={(e) => setNewAssetCategory(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addAssetCategory()}
            />
            <Button
              onClick={addAssetCategory}
              className="bg-gradient-to-r from-cyan-500 to-cyan-600"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Threat Categories */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-cyan-600" />
            Категории угроз
          </CardTitle>
          <CardDescription>
            Список категорий для классификации угроз ИБ
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {settings?.threat_categories?.map((category) => (
              <Badge
                key={category}
                className="bg-red-100 text-red-800 border-red-300 px-3 py-1.5 text-sm"
                variant="outline"
              >
                {category}
                <button
                  onClick={() => removeThreatCategory(category)}
                  className="ml-2 hover:text-red-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Добавить новую категорию угрозы"
              value={newThreatCategory}
              onChange={(e) => setNewThreatCategory(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addThreatCategory()}
            />
            <Button
              onClick={addThreatCategory}
              className="bg-gradient-to-r from-cyan-500 to-cyan-600"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Threat Sources */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-cyan-600" />
            Источники угроз
          </CardTitle>
          <CardDescription>
            Список источников угроз для реестра угроз
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {settings?.threat_sources?.map((source) => (
              <Badge
                key={source}
                className="bg-orange-100 text-orange-800 border-orange-300 px-3 py-1.5 text-sm"
                variant="outline"
              >
                {source}
                <button
                  onClick={() => removeThreatSource(source)}
                  className="ml-2 hover:text-orange-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Добавить новый источник угрозы"
              value={newThreatSource}
              onChange={(e) => setNewThreatSource(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addThreatSource()}
            />
            <Button
              onClick={addThreatSource}
              className="bg-gradient-to-r from-cyan-500 to-cyan-600"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Asset Owners */}
      <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
            <User className="w-5 h-5 text-teal-600" />
            Владельцы активов
          </CardTitle>
          <CardDescription className="dark:text-slate-400">
            Список владельцев информационных активов. Используется при создании и редактировании активов.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(settings?.asset_owners || []).map((owner) => (
              <Badge
                key={owner}
                className="bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-700 px-3 py-1.5 text-sm"
                variant="outline"
              >
                {owner}
                <button
                  onClick={() => removeAssetOwner(owner)}
                  className="ml-2 hover:text-teal-900 dark:hover:text-teal-100"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            {(!settings?.asset_owners || settings.asset_owners.length === 0) && (
              <p className="text-sm text-slate-400 dark:text-slate-500">Нет владельцев активов. Добавьте ниже.</p>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Добавить владельца актива (ФИО или название)"
              value={newAssetOwner}
              onChange={(e) => setNewAssetOwner(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addAssetOwner()}
              className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            />
            <Button
              onClick={addAssetOwner}
              className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
        <CardContent className="pt-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            <strong>Примечание:</strong> Изменения в справочниках сразу отражаются при создании и редактировании инцидентов, активов, угроз и уязвимостей.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
