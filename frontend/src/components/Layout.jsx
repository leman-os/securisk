import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Shield, LayoutDashboard, AlertTriangle, AlertCircle, Server,
  LogOut, Crosshair, Bug, BookOpen, Table, ChevronLeft, ChevronRight,
  ClipboardList, SlidersHorizontal, GitBranch, HelpCircle,
} from 'lucide-react';
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
    { path: '/',                icon: LayoutDashboard, label: 'Дашборд',       permission: 'dashboard' },
    { path: '/requirements',    icon: ClipboardList,   label: 'Требования',    permission: 'requirements' },
    { path: '/risks',           icon: AlertTriangle,   label: 'Реестр рисков', permission: 'risks' },
    { path: '/threats',         icon: Crosshair,       label: 'Угрозы',        permission: 'threats' },
    { path: '/vulnerabilities', icon: Bug,             label: 'Уязвимости',    permission: 'vulnerabilities' },
    { path: '/incidents',       icon: AlertCircle,     label: 'Инциденты',     permission: 'incidents' },
    { path: '/assets',          icon: Server,          label: 'Активы',        permission: 'assets' },
    { path: '/wiki',            icon: BookOpen,        label: 'База знаний',   permission: 'wiki' },
    { path: '/registries',      icon: Table,           label: 'Реестры',       permission: 'registries' },
    { path: '/graph',           icon: GitBranch,       label: 'Граф связей',   permission: 'graph' },
  ];

  const menuItems = allMenuItems.filter(item => {
    if (!user?.permissions) return true;
    return user.permissions[item.permission] === true;
  });

  const hasAdminAccess = user?.role === 'Администратор' || user?.permissions?.admin === true;

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col transition-all duration-300`}>

        {/* Logo */}
        <div className={`${collapsed ? 'p-3' : 'p-6'} border-b border-slate-200 dark:border-slate-700 transition-all duration-300`}>
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg flex-shrink-0">
              <Shield className="w-6 h-6 text-white" />
            </div>
            {!collapsed && (
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">SecuRisk</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">ISO 27000</p>
              </div>
            )}
          </div>
        </div>

        {/* Collapse toggle */}
        <div className={`p-2 ${collapsed ? 'flex justify-center' : 'flex justify-end'}`}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
          >
            {collapsed
              ? <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              : <ChevronLeft  className="w-4 h-4 text-slate-600 dark:text-slate-400" />}
          </button>
        </div>

        {/* Nav */}
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
                    ? 'bg-cyan-50 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-700'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
                title={collapsed ? item.label : ''}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Info link */}
        <div className="px-4 pb-2">
          <button
            onClick={() => navigate('/info')}
            className={`w-full flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-2.5 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === '/info'
                ? 'bg-cyan-50 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-700'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
            title={collapsed ? 'Информация' : ''}
          >
            <HelpCircle className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Информация</span>}
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
          {/* User info */}
          {!collapsed && (
            <div className="mb-1 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Текущий пользователь</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{user?.full_name}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">{user?.role}</p>
            </div>
          )}

          {/* Admin panel button */}
          {hasAdminAccess && (
            <button
              onClick={() => navigate('/admin')}
              className={`w-full flex items-center ${collapsed ? 'justify-center px-2' : 'gap-2 px-3'} py-2.5 rounded-lg text-sm font-medium transition-colors bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/50 border border-violet-200 dark:border-violet-700`}
              title={collapsed ? 'Админпанель' : ''}
            >
              <SlidersHorizontal className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>Админпанель</span>}
            </button>
          )}

          {/* Logout */}
          <Button
            onClick={handleLogout}
            data-testid="logout-button"
            variant="outline"
            className={`w-full ${collapsed ? 'justify-center px-2' : 'justify-start gap-2'} text-slate-700 dark:text-slate-300 dark:border-slate-600 hover:text-red-600 hover:border-red-600`}
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
