import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, AlertCircle, Server, TrendingUp, Activity, Shield, Clock, Timer, CheckCircle2 } from 'lucide-react';

const Dashboard = ({ user }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [riskAnalytics, setRiskAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchRiskAnalytics();
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

  const fetchRiskAnalytics = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/risk-analytics`);
      setRiskAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching risk analytics:', error);
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

  const getCriticalityColor = (criticality) => {
    switch (criticality) {
      case 'Критический':
        return 'bg-red-500';
      case 'Высокий':
        return 'bg-orange-500';
      case 'Средний':
        return 'bg-yellow-500';
      case 'Низкий':
        return 'bg-green-500';
      default:
        return 'bg-slate-500';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Открыт':
        return 'bg-blue-500';
      case 'В обработке':
        return 'bg-amber-500';
      case 'Принят':
        return 'bg-purple-500';
      case 'Закрыт':
        return 'bg-slate-500';
      default:
        return 'bg-slate-500';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Дашборд</h1>
        <p className="text-slate-600">Обзор состояния информационной безопасности</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          const getNavigationPath = () => {
            if (stat.title.includes('риск')) return '/risks';
            if (stat.title.includes('инцидент')) return '/incidents';
            if (stat.title.includes('актив')) return '/assets';
            return null;
          };
          
          return (
            <Card
              key={index}
              data-testid={`stat-card-${index}`}
              className="border-slate-200 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => {
                const path = getNavigationPath();
                if (path) navigate(path);
              }}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  {stat.title}
                </CardTitle>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-5 h-5 ${stat.textColor}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Incident Metrics */}
      {(stats?.avg_mtta || stats?.avg_mttr || stats?.avg_mttc) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.avg_mtta && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Среднее время обнаружения (MTTA)
                </CardTitle>
                <Clock className="w-5 h-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.avg_mtta}ч</div>
              </CardContent>
            </Card>
          )}
          {stats.avg_mttr && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Среднее время реагирования (MTTR)
                </CardTitle>
                <Timer className="w-5 h-5 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats.avg_mttr}ч</div>
              </CardContent>
            </Card>
          )}
          {stats.avg_mttc && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Среднее время закрытия (MTTC)
                </CardTitle>
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.avg_mttc}ч</div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Risk Analytics */}
      {riskAnalytics && (
        <>
          {/* Risk Distribution by Criticality and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* By Criticality */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Распределение рисков по критичности</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(riskAnalytics.risks_by_criticality || {}).map(([criticality, count]) => {
                    const total = Object.values(riskAnalytics.risks_by_criticality).reduce((a, b) => a + b, 0);
                    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={criticality}>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-medium">{criticality}</span>
                          <span className="text-slate-600">{count} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                          <div
                            className={`h-full ${getCriticalityColor(criticality)} transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* By Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Распределение рисков по статусам</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(riskAnalytics.risks_by_status || {}).map(([status, count]) => {
                    const total = Object.values(riskAnalytics.risks_by_status).reduce((a, b) => a + b, 0);
                    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={status}>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-medium">{status}</span>
                          <span className="text-slate-600">{count} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                          <div
                            className={`h-full ${getStatusColor(status)} transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top 10 Most Critical Risks */}
          {riskAnalytics.top_risks && riskAnalytics.top_risks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Топ-10 самых опасных рисков</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {riskAnalytics.top_risks.map((risk, index) => (
                    <div
                      key={risk.risk_number}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 font-semibold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-sm">{risk.risk_number}</div>
                          <div className="text-xs text-slate-600 truncate max-w-md">{risk.scenario}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xs text-slate-500">Владелец</div>
                          <div className="text-sm font-medium">{risk.owner}</div>
                        </div>
                        <div className="text-center min-w-[60px]">
                          <div className="text-2xl font-bold text-slate-900">{risk.risk_level}</div>
                          <div className={`text-xs px-2 py-1 rounded-full inline-block ${getCriticalityColor(risk.criticality)} text-white`}>
                            {risk.criticality}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Risk Distribution by Owner */}
          {riskAnalytics.risks_by_owner && Object.keys(riskAnalytics.risks_by_owner).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Распределение рисков по владельцам</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(riskAnalytics.risks_by_owner || {})
                    .sort((a, b) => b[1] - a[1])
                    .map(([owner, count]) => {
                      const total = Object.values(riskAnalytics.risks_by_owner).reduce((a, b) => a + b, 0);
                      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                      return (
                        <div key={owner}>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="font-medium">{owner}</span>
                            <span className="text-slate-600">{count} рисков ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                            <div
                              className="h-full bg-cyan-500 transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
