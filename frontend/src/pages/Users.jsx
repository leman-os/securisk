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
import { Plus, Trash2, UserCircle, Edit, Key } from 'lucide-react';
import { toast } from 'sonner';

const Users = ({ user }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    role: 'Инженер ИБ',
  });

  const [editFormData, setEditFormData] = useState({
    full_name: '',
    email: '',
    role: '',
  });

  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`);
      setUsers(response.data);
    } catch (error) {
      toast.error('Ошибка загрузки пользователей');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/auth/register`, formData);
      toast.success('Пользователь создан');
      setDialogOpen(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      console.error('User creation error:', error);
      const errorMessage = error.response?.data?.detail 
        ? (typeof error.response.data.detail === 'string' 
          ? error.response.data.detail 
          : JSON.stringify(error.response.data.detail))
        : 'Ошибка при создании пользователя';
      toast.error(errorMessage);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Удалить пользователя?')) return;
    try {
      await axios.delete(`${API}/users/${userId}`);
      toast.success('Пользователь удален');
      fetchUsers();
    } catch (error) {
      console.error('User deletion error:', error);
      const errorMessage = error.response?.data?.detail 
        ? (typeof error.response.data.detail === 'string' 
          ? error.response.data.detail 
          : JSON.stringify(error.response.data.detail))
        : 'Ошибка при удалении';
      toast.error(errorMessage);
    }
  };

  const openEditDialog = (userToEdit) => {
    setEditingUser(userToEdit);
    setEditFormData({
      full_name: userToEdit.full_name,
      email: userToEdit.email || '',
      role: userToEdit.role,
    });
    setEditDialogOpen(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/users/${editingUser.id}`, editFormData);
      toast.success('Пользователь обновлен');
      setEditDialogOpen(false);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка при обновлении');
    }
  };

  const openPasswordDialog = (userToEdit) => {
    setEditingUser(userToEdit);
    setPasswordData({ old_password: '', new_password: '' });
    setPasswordDialogOpen(true);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    try {
      const data = user.role === 'Администратор' && editingUser.id !== user.id
        ? { new_password: passwordData.new_password }
        : passwordData;
      
      await axios.post(`${API}/users/${editingUser.id}/change-password`, data);
      toast.success('Пароль изменен');
      setPasswordDialogOpen(false);
      setPasswordData({ old_password: '', new_password: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка при смене пароля');
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      full_name: '',
      email: '',
      role: 'Инженер ИБ',
    });
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'Администратор':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'Инженер ИБ':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Специалист ИБ':
        return 'bg-cyan-100 text-cyan-800 border-cyan-300';
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

  const isAdmin = user?.role === 'Администратор';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Пользователи</h1>
          <p className="text-slate-600">Управление учетными записями системы</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={resetForm}
                data-testid="create-user-button"
                className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white gap-2"
              >
                <Plus className="w-4 h-4" />
                Создать пользователя
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Создать нового пользователя</DialogTitle>
                <DialogDescription>
                  Добавьте новую учетную запись для доступа к системе
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Имя пользователя</Label>
                  <Input
                    data-testid="user-username-input"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Пароль</Label>
                  <Input
                    data-testid="user-password-input"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Полное имя</Label>
                  <Input
                    data-testid="user-fullname-input"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email (опционально)</Label>
                  <Input
                    data-testid="user-email-input"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Роль</Label>
                  <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                    <SelectTrigger data-testid="user-role-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Администратор">Администратор</SelectItem>
                      <SelectItem value="Инженер ИБ">Инженер ИБ</SelectItem>
                      <SelectItem value="Специалист ИБ">Специалист ИБ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Отмена
                  </Button>
                  <Button type="submit" data-testid="user-submit-button" className="bg-gradient-to-r from-cyan-500 to-cyan-600">
                    Создать
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!isAdmin && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <p className="text-amber-800">
              Только администраторы могут управлять пользователями.
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-200">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Пользователь</TableHead>
                  <TableHead>Имя пользователя</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Роль</TableHead>
                  <TableHead>Дата создания</TableHead>
                  {isAdmin && <TableHead className="text-right">Действия</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-8 text-slate-500">
                      Пользователи не найдены
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow key={u.id} data-testid={`user-row-${u.id}`} className="hover:bg-slate-50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-10 h-10 bg-slate-100 rounded-full">
                            <UserCircle className="w-6 h-6 text-slate-600" />
                          </div>
                          <span className="font-medium text-slate-900">{u.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-700">{u.username}</TableCell>
                      <TableCell className="text-sm text-slate-600">{u.email || '-'}</TableCell>
                      <TableCell>
                        <Badge className={getRoleColor(u.role)} variant="outline">
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {new Date(u.created_at).toLocaleDateString('ru-RU')}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          {u.username !== 'admin' && (
                            <Button
                              data-testid={`delete-user-${u.id}`}
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(u.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      )}
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

export default Users;
