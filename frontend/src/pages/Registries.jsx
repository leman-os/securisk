import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, Plus, Edit, Trash2, Download, X, Grid3x3, List } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const Registries = ({ user }) => {
  const [registries, setRegistries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    columns: []
  });

  const [newColumn, setNewColumn] = useState({
    name: '',
    column_type: 'text',
    options: []
  });

  const [selectOption, setSelectOption] = useState('');

  useEffect(() => {
    fetchRegistries();
  }, []);

  const fetchRegistries = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/registries`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRegistries(response.data);
    } catch (error) {
      toast.error('Ошибка загрузки реестров');
    } finally {
      setLoading(false);
    }
  };

  const createRegistry = async () => {
    if (!formData.name.trim()) {
      toast.error('Введите название реестра');
      return;
    }
    if (formData.columns.length === 0) {
      toast.error('Добавьте хотя бы один столбец');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/registries`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Реестр создан');
      setIsCreateDialogOpen(false);
      setFormData({ name: '', description: '', columns: [] });
      fetchRegistries();
    } catch (error) {
      toast.error('Ошибка создания реестра');
    }
  };

  const deleteRegistry = async (registryId) => {
    if (!window.confirm('Удалить реестр и все его данные?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/registries/${registryId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Реестр удален');
      fetchRegistries();
    } catch (error) {
      toast.error('Ошибка удаления реестра');
    }
  };

  const addColumn = () => {
    if (!newColumn.name.trim()) {
      toast.error('Введите название столбца');
      return;
    }
    
    const column = {
      id: Date.now().toString(),
      name: newColumn.name,
      column_type: newColumn.column_type,
      options: newColumn.column_type === 'select' ? newColumn.options : undefined,
      order: formData.columns.length
    };
    
    setFormData({
      ...formData,
      columns: [...formData.columns, column]
    });
    
    setNewColumn({ name: '', column_type: 'text', options: [] });
  };

  const removeColumn = (columnId) => {
    setFormData({
      ...formData,
      columns: formData.columns.filter(col => col.id !== columnId)
    });
  };

  const addSelectOption = () => {
    if (!selectOption.trim()) return;
    setNewColumn({
      ...newColumn,
      options: [...newColumn.options, selectOption]
    });
    setSelectOption('');
  };

  const removeSelectOption = (option) => {
    setNewColumn({
      ...newColumn,
      options: newColumn.options.filter(opt => opt !== option)
    });
  };

  const exportRegistry = async (registryId, registryName) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/registries/${registryId}/export`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${registryName}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Реестр экспортирован');
    } catch (error) {
      toast.error('Ошибка экспорта');
    }
  };

  const columnTypeLabels = {
    text: 'Текст',
    number: 'Число',
    id: 'ID (автономер)',
    date: 'Дата',
    checkbox: 'Чекбокс',
    select: 'Выбор из списка',
    multiselect: 'Выбор нескольких из списка'
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Реестры</h1>
          <p className="text-slate-600">Пользовательские таблицы данных</p>
        </div>
        <div className="flex gap-2">
          <div className="flex border border-slate-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-cyan-50 text-cyan-600' : 'hover:bg-slate-50'}`}
              title="Блоки"
            >
              <Grid3x3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-cyan-50 text-cyan-600' : 'hover:bg-slate-50'}`}
              title="Список"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-cyan-500 to-cyan-600">
              <Plus className="w-4 h-4 mr-2" />
              Создать реестр
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Новый реестр</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Название реестра</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Введите название"
                />
              </div>
              <div>
                <Label>Описание (необязательно)</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Краткое описание реестра"
                />
              </div>
              
              <div className="border-t pt-4">
                <Label className="text-base font-semibold mb-4 block">Столбцы</Label>
                
                {/* Added columns */}
                {formData.columns.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {formData.columns.map((col) => (
                      <div key={col.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                        <span className="flex-1 font-medium">{col.name}</span>
                        <span className="text-sm text-slate-600">{columnTypeLabels[col.column_type]}</span>
                        <button
                          onClick={() => removeColumn(col.id)}
                          className="p-1 hover:bg-red-100 rounded text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Add new column */}
                <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
                  <div>
                    <Label className="text-sm">Название столбца</Label>
                    <Input
                      value={newColumn.name}
                      onChange={(e) => setNewColumn({ ...newColumn, name: e.target.value })}
                      placeholder="Например: ФИО, Дата создания"
                      size="sm"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Тип данных</Label>
                    <select
                      value={newColumn.column_type}
                      onChange={(e) => setNewColumn({ ...newColumn, column_type: e.target.value, options: [] })}
                      className="w-full p-2 border border-slate-300 rounded-md text-sm"
                    >
                      <option value="text">Текст</option>
                      <option value="number">Число</option>
                      <option value="id">ID (автономер)</option>
                      <option value="date">Дата</option>
                      <option value="checkbox">Чекбокс</option>
                      <option value="select">Выбор из списка</option>
                      <option value="multiselect">Выбор нескольких из списка</option>
                    </select>
                  </div>
                  
                  {newColumn.column_type === 'select' && (
                    <div>
                      <Label className="text-sm">Варианты выбора</Label>
                      <div className="flex gap-2 mb-2">
                        <Input
                          value={selectOption}
                          onChange={(e) => setSelectOption(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addSelectOption()}
                          placeholder="Введите вариант"
                          size="sm"
                        />
                        <Button onClick={addSelectOption} size="sm">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {newColumn.options.map((opt, idx) => (
                          <div key={idx} className="flex items-center gap-1 px-2 py-1 bg-white border rounded">
                            <span className="text-sm">{opt}</span>
                            <button
                              onClick={() => removeSelectOption(opt)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <Button onClick={addColumn} size="sm" variant="outline" className="w-full">
                    Добавить столбец
                  </Button>
                </div>
              </div>
              
              <Button onClick={createRegistry} className="w-full">
                Создать реестр
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {registries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Table className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">Нет созданных реестров</p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              Создать первый реестр
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {registries.map((registry) => (
            <Card 
              key={registry.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/registries/${registry.id}`)}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Table className="w-5 h-5 text-cyan-600" />
                  {registry.name}
                </CardTitle>
                {registry.description && (
                  <CardDescription>{registry.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-slate-600">
                  <span className="font-medium">{registry.columns?.length || 0}</span> столбцов
                </div>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    onClick={() => exportRegistry(registry.id, registry.name)}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => deleteRegistry(registry.id)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {registries.map((registry) => (
                <div
                  key={registry.id}
                  className="p-4 hover:bg-slate-50 cursor-pointer flex items-center justify-between"
                  onClick={() => navigate(`/registries/${registry.id}`)}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center justify-center w-10 h-10 bg-cyan-100 rounded-lg">
                      <Table className="w-5 h-5 text-cyan-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900">{registry.name}</h3>
                      {registry.description && (
                        <p className="text-sm text-slate-600">{registry.description}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        {registry.columns?.length || 0} столбцов
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      onClick={() => exportRegistry(registry.id, registry.name)}
                      variant="outline"
                      size="sm"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => deleteRegistry(registry.id)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Registries;
