import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Users, Settings, LogOut, ChevronLeft, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AdminLayout = ({ user, setUser, children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  const menuItems = [
    { path: '/admin/users', icon: Users, label: 'Пользователи' },
    { path: '/admin/roles', icon: Shield, label: 'Роли' },
    { path: '/admin/settings', icon: Settings, label: 'Настройки' },
  ];

  return (
    <div className="flex h-screen bg-slate-900 dark:bg-slate-950">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800 dark:bg-slate-900 flex flex-col flex-shrink-0">
        {/* Header */}
        <div className="p-5 border-b border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-violet-500 to-violet-600 rounded-lg flex-shrink-0">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">Админпанель</h1>
              <p className="text-xs text-slate-400">SecuRisk</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Вернуться в систему
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors text-sm ${
                  isActive
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700">
          <div className="mb-3 p-3 bg-slate-700 rounded-lg">
            <p className="text-xs text-slate-400 mb-0.5">Текущий пользователь</p>
            <p className="text-sm font-semibold text-white">{user?.full_name}</p>
            <p className="text-xs text-slate-400">{user?.role}</p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full justify-start gap-2 border-slate-600 text-slate-300 hover:text-red-400 hover:border-red-500 bg-transparent"
          >
            <LogOut className="w-4 h-4" />
            Выход
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900">
        <div className="h-full p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
