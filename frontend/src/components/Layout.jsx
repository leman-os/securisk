import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, LayoutDashboard, AlertTriangle, AlertCircle, Server, Users, LogOut, Settings, Crosshair, Bug, BookOpen, Table, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Layout = ({ user, setUser, children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  const allMenuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Дашборд', permission: 'dashboard' },
    { path: '/risks', icon: AlertTriangle, label: 'Реестр рисков', permission: 'risks' },
    { path: '/threats', icon: Crosshair, label: 'Угрозы', permission: 'threats' },
    { path: '/vulnerabilities', icon: Bug, label: 'Уязвимости', permission: 'vulnerabilities' },
    { path: '/incidents', icon: AlertCircle, label: 'Инциденты', permission: 'incidents' },
    { path: '/assets', icon: Server, label: 'Активы', permission: 'assets' },
    { path: '/wiki', icon: BookOpen, label: 'База знаний', permission: 'wiki' },
    { path: '/registries', icon: Table, label: 'Реестры', permission: 'registries' },
    { path: '/users', icon: Users, label: 'Пользователи', permission: 'users' },
    { path: '/roles', icon: Shield, label: 'Роли', permission: 'users' },
    { path: '/settings', icon: Settings, label: 'Настройки', permission: 'settings' },
  ];

  // Filter menu items based on user permissions
  const menuItems = allMenuItems.filter(item => {
    if (!user?.permissions) return true; // Show all if no permissions (legacy admin)
    return user.permissions[item.permission] === true;
  });

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-white border-r border-slate-200 flex flex-col transition-all duration-300`}>
        <div className={`${collapsed ? 'p-3' : 'p-6'} border-b border-slate-200 transition-all duration-300`}>
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg flex-shrink-0">
              <Shield className="w-6 h-6 text-white" />
            </div>
            {!collapsed && (
              <div>
                <h1 className="text-lg font-bold text-slate-900">SecuRisk</h1>
                <p className="text-xs text-slate-500">ISO 27000</p>
              </div>
            )}
          </div>
        </div>

        {/* Toggle button */}
        <div className={`p-2 ${collapsed ? 'flex justify-center' : 'flex justify-end'}`}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            title={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4 text-slate-600" /> : <ChevronLeft className="w-4 h-4 text-slate-600" />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                data-testid={`menu-${item.path.replace('/', '') || 'dashboard'}`}
                className={`w-full flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-3 rounded-lg font-medium transition-colors ${
                  isActive
                    ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
                title={collapsed ? item.label : ''}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200">
          {!collapsed && (
            <div className="mb-4 p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 mb-1">Текущий пользователь</p>
              <p className="text-sm font-semibold text-slate-900">{user?.full_name}</p>
              <p className="text-xs text-slate-600">{user?.role}</p>
            </div>
          )}
          <Button
            onClick={handleLogout}
            data-testid="logout-button"
            variant="outline"
            className={`w-full ${collapsed ? 'justify-center px-2' : 'justify-start gap-2'} text-slate-700 hover:text-red-600 hover:border-red-600`}
            title={collapsed ? 'Выход' : ''}
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && 'Выход'}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="h-full p-2">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
