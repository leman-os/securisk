import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Shield } from 'lucide-react';
import { toast } from 'sonner';

const Roles = ({ user }) => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    permissions: {
      dashboard: true,
      incidents: true,
      assets: true,
      risks: true,
      threats: true,
      vulnerabilities: true,
      users: false,
      wiki: true,
      registries: true,
      settings: false
    }
  });

  useEffect(() => {
    if (user?.role === 'Администратор') {
      fetchRoles();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchRoles = async () => {
    try {
      const response = await axios.get(`${API}/roles`);
      setRoles(response.data);
    } catch (error) {
      toast.error('Ошибка загрузки ролей');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Введите название роли');
      return;
    }
    try {
      await axios.post(`${API}/roles`, formData);
      toast.success('Роль создана');
      setIsCreateDialogOpen(false);
      resetForm();
      fetchRoles();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка при создании роли');
    }
  };

  const openEditDialog = (role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      permissions: { ...role.permissions }
    });
    setIsEditDialogOpen(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/roles/${editingRole.id}`, formData);
      toast.success('Роль обновлена');
      setIsEditDialogOpen(false);
      fetchRoles();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка при обновлении роли');
    }
  };

  const handleDelete = async (roleId) => {
    if (!window.confirm('Удалить роль?')) return;
    try {
      await axios.delete(`${API}/roles/${roleId}`);
      toast.success('Роль удалена');
      fetchRoles();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка при удалении роли');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      permissions: {
        dashboard: true,
        incidents: true,
        assets: true,
        risks: true,
        threats: true,
        vulnerabilities: true,
        users: false,
        wiki: true,
        registries: true,
        settings: false
      }
    });
  };

  const togglePermission = (key) => {
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        [key]: !formData.permissions[key]
      }
    });
  };

  const permissionLabels = {
    dashboard: 'Дашборд',
    incidents: 'Инциденты',
    assets: 'Активы',
    risks: 'Реестр рисков',
    threats: 'Угрозы',
    vulnerabilities: 'Уязвимости',
    users: 'Пользователи',
    wiki: 'База знаний',
    registries: 'Реестры',
    settings: 'Настройки'
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
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Управление ролями</h1>
          <p className="text-slate-600">Создание и настройка ролей с правами доступа</p>
        </div>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <p className="text-amber-800">
              Только администраторы могут управлять ролями.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderPermissionsForm = () => (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-semibold mb-3 block">Название роли</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Например: Аналитик ИБ"
          required
        />
      </div>

      <div>
        <Label className="text-base font-semibold mb-3 block">Права доступа к разделам</Label>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(permissionLabels).map(([key, label]) => (
            <div key={key} className="flex items-center gap-2 p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
              <input
                type="checkbox"
                checked={formData.permissions[key]}
                onChange={() => togglePermission(key)}
                className="w-4 h-4"
                id={`perm-${key}`}
              />
              <Label htmlFor={`perm-${key}`} className="cursor-pointer flex-1">
                {label}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Управление ролями</h1>
          <p className="text-slate-600">Создание и настройка ролей с правами доступа</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={resetForm}
              className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white gap-2"
            >
              <Plus className="w-4 h-4" />
              Создать роль
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Создать новую роль</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate}>
              {renderPermissionsForm()}
              <div className="flex gap-2 mt-6">
                <Button type="submit" className="flex-1">
                  Создать
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="flex-1"
                >
                  Отмена
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Роль</TableHead>
                  <TableHead>Права доступа</TableHead>
                  <TableHead>Дата создания</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                      Роли не найдены
                    </TableCell>
                  </TableRow>
                ) : (
                  roles.map((role) => {
                    const activePermissions = Object.entries(role.permissions || {})
                      .filter(([_, value]) => value)
                      .map(([key]) => permissionLabels[key])
                      .filter(Boolean);
                    
                    return (
                      <TableRow key={role.id} className="hover:bg-slate-50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 bg-cyan-100 rounded-full">
                              <Shield className="w-5 h-5 text-cyan-600" />
                            </div>
                            <span className="font-medium text-slate-900">{role.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {activePermissions.slice(0, 3).map((perm) => (
                              <Badge key={perm} variant="outline" className="text-xs">
                                {perm}
                              </Badge>
                            ))}
                            {activePermissions.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{activePermissions.length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {new Date(role.created_at).toLocaleDateString('ru-RU')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(role)}
                              className="text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {!['Администратор', 'Инженер ИБ', 'Специалист ИБ'].includes(role.name) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(role.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактировать роль</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit}>
            {renderPermissionsForm()}
            <div className="flex gap-2 mt-6">
              <Button type="submit" className="flex-1">
                Сохранить
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="flex-1"
              >
                Отмена
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Roles;
