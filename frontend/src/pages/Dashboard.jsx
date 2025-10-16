import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, AlertCircle, Server, TrendingUp, Activity, Shield, Clock, Timer, CheckCircle2 } from 'lucide-react';

const Dashboard = ({ user }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Всего рисков',
      value: stats?.total_risks || 0,
      icon: AlertTriangle,
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700',
    },
    {
      title: 'Критические риски',
      value: stats?.critical_risks || 0,
      icon: TrendingUp,
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
    },
    {
      title: 'Всего инцидентов',
      value: stats?.total_incidents || 0,
      icon: AlertCircle,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
    },
    {
      title: 'Открытые инциденты',
      value: stats?.open_incidents || 0,
      icon: Activity,
      color: 'from-violet-500 to-violet-600',
      bgColor: 'bg-violet-50',
      textColor: 'text-violet-700',
    },
    {
      title: 'Всего активов',
      value: stats?.total_assets || 0,
      icon: Server,
      color: 'from-cyan-500 to-cyan-600',
      bgColor: 'bg-cyan-50',
      textColor: 'text-cyan-700',
    },
    {
      title: 'Критические активы',
      value: stats?.critical_assets || 0,
      icon: Shield,
      color: 'from-teal-500 to-teal-600',
      bgColor: 'bg-teal-50',
      textColor: 'text-teal-700',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Дашборд</h1>
        <p className="text-slate-600">Обзор состояния информационной безопасности</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card
              key={index}
              data-testid={`stat-card-${index}`}
              className="border-slate-200 hover:shadow-lg transition-shadow"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-5 h-5 ${stat.textColor}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">MTTA (Среднее время подтверждения)</CardTitle>
            <div className="p-2 rounded-lg bg-blue-50">
              <Clock className="w-5 h-5 text-blue-700" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
              {stats?.avg_mtta ? `${stats.avg_mtta}ч` : 'N/A'}
            </div>
            <p className="text-xs text-slate-500 mt-1">Mean Time To Acknowledge</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">MTTR (Среднее время решения)</CardTitle>
            <div className="p-2 rounded-lg bg-teal-50">
              <Timer className="w-5 h-5 text-teal-700" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold bg-gradient-to-r from-teal-500 to-teal-600 bg-clip-text text-transparent">
              {stats?.avg_mttr ? `${stats.avg_mttr}ч` : 'N/A'}
            </div>
            <p className="text-xs text-slate-500 mt-1">Mean Time To Resolve</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">MTTC (Среднее время закрытия)</CardTitle>
            <div className="p-2 rounded-lg bg-emerald-50">
              <CheckCircle2 className="w-5 h-5 text-emerald-700" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent">
              {stats?.avg_mttc ? `${stats.avg_mttc}ч` : 'N/A'}
            </div>
            <p className="text-xs text-slate-500 mt-1">Mean Time To Close</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Статус рисков
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-4">Распределение рисков по уровням критичности</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700">Критические</span>
                <span className="font-semibold text-red-600">{stats?.critical_risks || 0}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-red-500 to-red-600 h-2 rounded-full"
                  style={{ width: `${stats?.total_risks > 0 ? (stats?.critical_risks / stats?.total_risks) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              Статус инцидентов
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-4">Текущие активные инциденты</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700">Открытые</span>
                <span className="font-semibold text-violet-600">{stats?.open_incidents || 0}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-violet-500 to-violet-600 h-2 rounded-full"
                  style={{ width: `${stats?.total_incidents > 0 ? (stats?.open_incidents / stats?.total_incidents) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
