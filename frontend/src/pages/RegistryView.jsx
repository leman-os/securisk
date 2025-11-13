import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Edit, Trash2, Download, Search, Settings, X } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

const RegistryView = ({ user }) => {
  const { registryId } = useParams();
  const navigate = useNavigate();
  const [registry, setRegistry] = useState(null);
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isEditStructureOpen, setIsEditStructureOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formData, setFormData] = useState({});
  const [structureData, setStructureData] = useState({ columns: [] });
  const [newColumn, setNewColumn] = useState({ name: '', column_type: 'text', options: [] });
  const [selectOption, setSelectOption] = useState('');

  useEffect(() => {
    fetchRegistry();
    fetchRecords();
  }, [registryId]);

  useEffect(() => {
    // Filter records based on search
    if (!searchQuery.trim()) {
      setFilteredRecords(records);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = records.filter(record => {
        return Object.values(record.data || {}).some(value => 
          String(value).toLowerCase().includes(query)
        );
      });
      setFilteredRecords(filtered);
    }
  }, [searchQuery, records]);

  const fetchRegistry = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/registries/${registryId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRegistry(response.data);
    } catch (error) {
      toast.error('Ошибка загрузки реестра');
      navigate('/registries');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/registries/${registryId}/records`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecords(response.data);
      setFilteredRecords(response.data);
    } catch (error) {
      toast.error('Ошибка загрузки записей');
    }
  };

  const openCreateDialog = () => {
    const initialData = {};
    registry.columns.forEach(col => {
      if (col.column_type === 'checkbox') {
        initialData[col.id] = false;
      } else if (col.column_type !== 'id') {
        initialData[col.id] = '';
      }
    });
    setFormData(initialData);
    setEditingRecord(null);
    setIsFormDialogOpen(true);
  };

  const openEditDialog = (record) => {
    setFormData({ ...record.data });
    setEditingRecord(record);
    setIsFormDialogOpen(true);
  };

  const saveRecord = async () => {
    try {
      const token = localStorage.getItem('token');
      if (editingRecord) {
        await axios.put(`${API}/registries/${registryId}/records/${editingRecord.id}`, 
          { data: formData },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Запись обновлена');
      } else {
        await axios.post(`${API}/registries/${registryId}/records`,
          { data: formData },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Запись создана');
      }
      setIsFormDialogOpen(false);
      fetchRecords();
    } catch (error) {
      toast.error('Ошибка сохранения записи');
    }
  };

  const deleteRecord = async (recordId) => {
    if (!window.confirm('Удалить запись?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/registries/${registryId}/records/${recordId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Запись удалена');
      fetchRecords();
    } catch (error) {
      toast.error('Ошибка удаления записи');
    }
  };

  // Structure editing functions
  const openEditStructure = () => {
    setStructureData({ columns: [...registry.columns] });
    setIsEditStructureOpen(true);
  };

  const addColumnToStructure = () => {
    if (!newColumn.name.trim()) {
      toast.error('Введите название столбца');
      return;
    }
    
    const column = {
      id: Date.now().toString(),
      name: newColumn.name,
      column_type: newColumn.column_type,
      options: (newColumn.column_type === 'select' || newColumn.column_type === 'multiselect') ? newColumn.options : undefined,
      order: structureData.columns.length
    };
    
    setStructureData({
      ...structureData,
      columns: [...structureData.columns, column]
    });
    
    setNewColumn({ name: '', column_type: 'text', options: [] });
  };

  const removeColumnFromStructure = (columnId) => {
    setStructureData({
      ...structureData,
      columns: structureData.columns.filter(col => col.id !== columnId)
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

  const saveStructure = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/registries/${registryId}`,
        { columns: structureData.columns },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Структура обновлена');
      setIsEditStructureOpen(false);
      fetchRegistry();
      fetchRecords();
    } catch (error) {
      toast.error('Ошибка обновления структуры');
    }
  };

  const exportRegistry = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/registries/${registryId}/export`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${registry.name}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Экспорт завершен');
    } catch (error) {
      toast.error('Ошибка экспорта');
    }
  };

  const renderFieldInput = (column) => {
    const value = formData[column.id] || '';
    
    switch (column.column_type) {
      case 'id':
        return (
          <Input
            value={value || 'Автоматически'}
            disabled
            className="bg-slate-100"
          />
        );
      
      case 'text':
        return (
          <Input
            value={value}
            onChange={(e) => setFormData({ ...formData, [column.id]: e.target.value })}
            placeholder={`Введите ${column.name.toLowerCase()}`}
          />
        );
      
      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => setFormData({ ...formData, [column.id]: e.target.value })}
            placeholder={`Введите число`}
          />
        );
      
      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => setFormData({ ...formData, [column.id]: e.target.value })}
          />
        );
      
      case 'checkbox':
        return (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={value === true || value === 'true'}
              onChange={(e) => setFormData({ ...formData, [column.id]: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm text-slate-600">Да</span>
          </div>
        );
      
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => setFormData({ ...formData, [column.id]: e.target.value })}
            className="w-full p-2 border border-slate-300 rounded-md"
          >
            <option value="">Выберите...</option>
            {column.options?.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      
      default:
        return <Input value={value} onChange={(e) => setFormData({ ...formData, [column.id]: e.target.value })} />;
    }
  };

  const renderCellValue = (column, value) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-slate-400">—</span>;
    }
    
    switch (column.column_type) {
      case 'checkbox':
        return value === true || value === 'true' ? '✓' : '✗';
      case 'date':
        return new Date(value).toLocaleDateString('ru-RU');
      default:
        return String(value);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  if (!registry) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/registries')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{registry.name}</h1>
            {registry.description && (
              <p className="text-slate-600">{registry.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportRegistry} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Экспорт
          </Button>
          <Button onClick={openCreateDialog} className="bg-gradient-to-r from-cyan-500 to-cyan-600">
            <Plus className="w-4 h-4 mr-2" />
            Добавить запись
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-slate-400" />
            <Input
              placeholder="Поиск по всем полям..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
            {searchQuery && (
              <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                Очистить
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Записи ({filteredRecords.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRecords.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500 mb-4">
                {searchQuery ? 'Ничего не найдено' : 'Нет записей в реестре'}
              </p>
              {!searchQuery && (
                <Button onClick={openCreateDialog}>
                  Добавить первую запись
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    {registry.columns.map((col) => (
                      <th key={col.id} className="text-left p-3 text-sm font-semibold text-slate-700">
                        {col.name}
                      </th>
                    ))}
                    <th className="text-right p-3 text-sm font-semibold text-slate-700">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="border-b border-slate-100 hover:bg-slate-50">
                      {registry.columns.map((col) => (
                        <td key={col.id} className="p-3 text-sm text-slate-900">
                          {renderCellValue(col, record.data[col.id])}
                        </td>
                      ))}
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            onClick={() => openEditDialog(record)}
                            variant="outline"
                            size="sm"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => deleteRecord(record.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRecord ? 'Редактирование записи' : 'Новая запись'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {registry.columns.map((col) => (
              <div key={col.id}>
                <Label>{col.name}</Label>
                {renderFieldInput(col)}
              </div>
            ))}
            <div className="flex gap-2 pt-4">
              <Button onClick={saveRecord} className="flex-1">
                Сохранить
              </Button>
              <Button
                onClick={() => setIsFormDialogOpen(false)}
                variant="outline"
                className="flex-1"
              >
                Отмена
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RegistryView;
