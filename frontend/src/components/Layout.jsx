import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, LayoutDashboard, AlertTriangle, AlertCircle, Server, Users, LogOut, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Layout = ({ user, setUser, children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Дашборд' },
    { path: '/risks', icon: AlertTriangle, label: 'Реестр рисков' },
    { path: '/incidents', icon: AlertCircle, label: 'Инциденты' },
    { path: '/assets', icon: Server, label: 'Активы' },
    { path: '/users', icon: Users, label: 'Пользователи' },
    { path: '/settings', icon: Settings, label: 'Настройки' },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">SecuRisk</h1>
              <p className="text-xs text-slate-500">ISO 27000</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                data-testid={`menu-${item.path.replace('/', '') || 'dashboard'}`}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                  isActive
                    ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="mb-4 p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500 mb-1">Текущий пользователь</p>
            <p className="text-sm font-semibold text-slate-900">{user?.full_name}</p>
            <p className="text-xs text-slate-600">{user?.role}</p>
          </div>
          <Button
            onClick={handleLogout}
            data-testid="logout-button"
            variant="outline"
            className="w-full justify-start gap-2 text-slate-700 hover:text-red-600 hover:border-red-600"
          >
            <LogOut className="w-4 h-4" />
            Выход
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
