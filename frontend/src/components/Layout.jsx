import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Shield, LayoutDashboard, AlertTriangle, AlertCircle, Server,
  LogOut, Crosshair, Bug, BookOpen, Table, ChevronLeft, ChevronRight,
  ClipboardList, SlidersHorizontal, GitBranch, HelpCircle, User, Network,
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

  // Порядок разделов: Дашборд → Инциденты → Активы → Уязвимости → Угрозы →
  //   Реестр рисков → Реестры → Требования → База знаний → Граф связей
  const allMenuItems = [
    { path: '/',                icon: LayoutDashboard, label: 'Дашборд',       permission: 'dashboard' },
    { path: '/incidents',       icon: AlertCircle,     label: 'Инциденты',     permission: 'incidents' },
    { path: '/assets',          icon: Server,          label: 'Активы',        permission: 'assets' },
    { path: '/vulnerabilities', icon: Bug,             label: 'Уязвимости',    permission: 'vulnerabilities' },
    { path: '/threats',         icon: Crosshair,       label: 'Угрозы',        permission: 'threats' },
    { path: '/risks',           icon: AlertTriangle,   label: 'Реестр рисков', permission: 'risks' },
    { path: '/registries',      icon: Table,           label: 'Реестры',       permission: 'registries' },
    { path: '/requirements',    icon: ClipboardList,   label: 'Требования',    permission: 'requirements' },
    { path: '/wiki',            icon: BookOpen,        label: 'База знаний',   permission: 'wiki' },
    { path: '/graph',           icon: GitBranch,       label: 'Граф связей',   permission: 'graph' },
    { path: '/mindmap',         icon: Network,         label: 'Ментал. карта', permission: 'mindmap' },
  ];

  const menuItems = allMenuItems.filter(item => {
    // No user yet or no permissions object → show all (loading/legacy fallback)
    if (!user) return false;
    if (!user.permissions) return true;
    return user.permissions[item.permission] === true;
  });

  const hasAdminAccess = user?.role === 'Администратор' || user?.permissions?.admin === true;

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-950">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300 shadow-sm`}>

        {/* Logo + User */}
        <div className={`${collapsed ? 'p-3' : 'p-5'} border-b border-slate-200 dark:border-slate-800 transition-all duration-300 bg-gradient-to-br from-cyan-600 to-cyan-700`}>
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="flex items-center justify-center w-9 h-9 bg-white/20 rounded-lg flex-shrink-0 backdrop-blur-sm">
              <Shield className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <h1 className="text-base font-bold text-white leading-tight">SecuRisk</h1>
                <p className="text-xs text-cyan-200/80">ISO 27000</p>
                {user && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <User className="w-3 h-3 text-cyan-100/70 flex-shrink-0" />
                    <p className="text-xs font-medium text-cyan-100 truncate">
                      {user.username || user.login || user.full_name}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Collapse toggle */}
        <div className={`px-3 py-2 ${collapsed ? 'flex justify-center' : 'flex justify-end'}`}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
            title={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
          >
            {collapsed
              ? <ChevronRight className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              : <ChevronLeft  className="w-4 h-4 text-slate-500 dark:text-slate-400" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 pb-2 space-y-0.5 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                data-testid={`menu-${item.path.replace('/', '') || 'dashboard'}`}
                className={`w-full flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'} py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/30'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={collapsed ? item.label : ''}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : ''}`} />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Info link */}
        <div className="px-3 pb-2">
          <div className="h-px bg-slate-200 dark:bg-slate-800 mb-2" />
          <button
            onClick={() => navigate('/info')}
            className={`w-full flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'} py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              location.pathname === '/info'
                ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/30'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
            }`}
            title={collapsed ? 'Информация' : ''}
          >
            <HelpCircle className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Информация</span>}
          </button>
        </div>

        {/* Footer */}
        <div className="px-3 pb-4 border-t border-slate-200 dark:border-slate-800 pt-3 space-y-2">
          {/* Admin panel button */}
          {hasAdminAccess && (
            <button
              onClick={() => navigate('/admin')}
              className={`w-full flex items-center ${collapsed ? 'justify-center px-2' : 'gap-2 px-3'} py-2.5 rounded-lg text-sm font-medium transition-all duration-150 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40 border border-violet-200 dark:border-violet-800`}
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
            variant="ghost"
            className={`w-full ${collapsed ? 'justify-center px-2' : 'justify-start gap-2 px-3'} text-slate-500 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-all`}
            title={collapsed ? 'Выход' : ''}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && 'Выход'}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="min-h-full p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
