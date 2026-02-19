import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle, AlertCircle, Server, TrendingUp, Activity, Shield,
  Clock, Timer, CheckCircle2, Settings2, ChevronRight, Download,
  Users, BarChart3,
} from 'lucide-react';

const WIDGET_LABELS = {
  stats:            'Статистика',
  incident_metrics: 'Метрики инцидентов',
  risk_charts:      'Распределение рисков',
  top_risks:        'Топ-10 рисков',
};

const DEFAULT_VISIBLE = {
  stats:            true,
  incident_metrics: true,
  risk_charts:      true,
  top_risks:        true,
};

/* ─────────────────────────────────────────────────────────────────────────
   Builds a clean, self-contained HTML string for PDF capture.
   Uses only inline styles so html2canvas picks everything up correctly.
───────────────────────────────────────────────────────────────────────── */
const buildPrintHTML = (stats, riskAnalytics) => {
  const date = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });

  const critColor  = (c) => ({ Критический:'#dc2626', Высокий:'#ea580c', Средний:'#ca8a04', Низкий:'#16a34a' }[c] ?? '#94a3b8');
  const statColor  = (s) => ({ Открыт:'#2563eb', 'В обработке':'#d97706', Принят:'#9333ea', Закрыт:'#94a3b8' }[s] ?? '#94a3b8');

  /* ── KPI cards ── */
  const kpi = [
    { label:'Всего рисков',        value: stats?.total_risks||0,      sub:`${stats?.critical_risks||0} критических`,     color:'#d97706' },
    { label:'Критические риски',   value: stats?.critical_risks||0,   sub:`из ${stats?.total_risks||0} всего`,           color:'#dc2626' },
    { label:'Инциденты',           value: stats?.total_incidents||0,  sub:`${stats?.open_incidents||0} открытых`,         color:'#2563eb' },
    { label:'Открытые инциденты',  value: stats?.open_incidents||0,   sub:`из ${stats?.total_incidents||0} всего`,        color:'#7c3aed' },
    { label:'Активы',              value: stats?.total_assets||0,     sub:`${stats?.critical_assets||0} критических`,    color:'#0891b2' },
    { label:'Критические активы',  value: stats?.critical_assets||0,  sub:`из ${stats?.total_assets||0} всего`,          color:'#0d9488' },
  ];
  const kpiHtml = kpi.map(k => `
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid ${k.color};border-radius:8px;padding:14px 16px;">
      <div style="font-size:30px;font-weight:900;color:${k.color};line-height:1;">${k.value}</div>
      <div style="font-size:12px;font-weight:600;color:#334155;margin-top:5px;">${k.label}</div>
      <div style="font-size:11px;color:#94a3b8;margin-top:2px;">${k.sub}</div>
    </div>`).join('');

  /* ── Bar rows helper ── */
  const bars = (data, colorFn) => Object.entries(data||{}).map(([k,v]) => {
    const tot = Object.values(data).reduce((a,b)=>a+b,0);
    const pct = tot > 0 ? Math.round((v/tot)*100) : 0;
    return `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        <div style="width:110px;font-size:11px;font-weight:500;color:#334155;flex-shrink:0;">${k}</div>
        <div style="flex:1;background:#e2e8f0;border-radius:4px;height:8px;overflow:hidden;">
          <div style="background:${colorFn(k)};height:100%;width:${pct}%;"></div>
        </div>
        <div style="width:60px;text-align:right;font-size:11px;color:#64748b;flex-shrink:0;">
          <b style="color:#1e293b;">${v}</b>&nbsp;(${pct}%)
        </div>
      </div>`;
  }).join('');

  /* ── Owner rows ── */
  const ownerEntries = Object.entries(riskAnalytics?.risks_by_owner||{}).sort((a,b)=>b[1]-a[1]);
  const ownerTot = ownerEntries.reduce((s,[,v])=>s+v,0);
  const ownerHtml = ownerEntries.map(([o,v],i) => {
    const pct = ownerTot > 0 ? Math.round((v/ownerTot)*100) : 0;
    return `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        <div style="width:18px;height:18px;background:#e2e8f0;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#475569;flex-shrink:0;">${i+1}</div>
        <div style="width:160px;font-size:11px;color:#334155;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${o}</div>
        <div style="flex:1;background:#e2e8f0;border-radius:4px;height:8px;overflow:hidden;">
          <div style="background:#06b6d4;height:100%;width:${pct}%;"></div>
        </div>
        <div style="width:60px;text-align:right;font-size:11px;color:#64748b;flex-shrink:0;"><b style="color:#1e293b;">${v}</b>&nbsp;(${pct}%)</div>
      </div>`;
  }).join('');

  /* ── Incident metrics ── */
  const metricCards = [
    stats?.avg_mtta && { label:'Время обнаружения', abbr:'MTTA', val:stats.avg_mtta, bg:'#eff6ff', color:'#2563eb' },
    stats?.avg_mttr && { label:'Время реагирования', abbr:'MTTR', val:stats.avg_mttr, bg:'#fff7ed', color:'#ea580c' },
    stats?.avg_mttc && { label:'Время закрытия',     abbr:'MTTC', val:stats.avg_mttc, bg:'#f0fdf4', color:'#16a34a' },
  ].filter(Boolean);
  const metricsHtml = metricCards.length ? `
    <div style="margin-bottom:24px;">
      ${section('Метрики инцидентов')}
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
        ${metricCards.map(m => `
          <div style="background:${m.bg};border-left:4px solid ${m.color};border-radius:8px;padding:14px 16px;">
            <div style="font-size:28px;font-weight:900;color:${m.color};line-height:1;">${m.val}<span style="font-size:14px;"> ч</span></div>
            <div style="font-size:11px;font-weight:700;color:${m.color};margin-top:4px;">${m.abbr}</div>
            <div style="font-size:11px;color:#64748b;margin-top:2px;">${m.label}</div>
          </div>`).join('')}
      </div>
    </div>` : '';

  /* ── Top-10 table rows ── */
  const topRows = (riskAnalytics?.top_risks||[]).map((r,i) => {
    const c = critColor(r.criticality);
    const pct = Math.min(Math.round((r.risk_level/25)*100),100);
    const bg  = i%2===1 ? '#f8fafc' : '#ffffff';
    return `
      <tr style="background:${bg};">
        <td style="padding:7px 8px;text-align:center;font-size:11px;font-weight:700;color:#64748b;">${i+1}</td>
        <td style="padding:7px 8px;">
          <div style="font-size:11px;font-weight:700;color:#1e293b;">${r.risk_number}</div>
          <div style="font-size:10px;color:#64748b;margin-top:2px;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.scenario||''}</div>
        </td>
        <td style="padding:7px 8px;width:100px;">
          <div style="display:flex;align-items:center;gap:6px;">
            <div style="flex:1;background:#e2e8f0;border-radius:3px;height:6px;overflow:hidden;">
              <div style="background:${c};height:100%;width:${pct}%;"></div>
            </div>
            <span style="font-size:12px;font-weight:900;color:#1e293b;width:16px;text-align:right;">${r.risk_level}</span>
          </div>
        </td>
        <td style="padding:7px 8px;white-space:nowrap;">
          <span style="background:${c}22;color:${c};border-radius:4px;padding:2px 7px;font-size:10px;font-weight:700;">${r.criticality}</span>
        </td>
        <td style="padding:7px 8px;font-size:10px;color:#64748b;max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.owner||''}</td>
      </tr>`;
  }).join('');

  /* ── Section header helper ── */
  function section(title) {
    return `<div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;padding-bottom:6px;border-bottom:1px solid #e2e8f0;margin-bottom:12px;">${title}</div>`;
  }

  return `
    <!-- Header bar -->
    <div style="background:#0f172a;color:#fff;padding:14px 32px;margin:-32px -32px 28px -32px;display:flex;align-items:center;justify-content:space-between;">
      <div>
        <div style="font-size:16px;font-weight:800;color:#22d3ee;">SecuRisk</div>
        <div style="font-size:10px;color:#94a3b8;margin-top:1px;">ISO 27000 — Система управления ИБ</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:13px;font-weight:600;">Дашборд ИБ</div>
        <div style="font-size:10px;color:#94a3b8;margin-top:2px;">Сформирован: ${date}</div>
      </div>
    </div>

    <!-- KPI -->
    <div style="margin-bottom:24px;">
      ${section('Ключевые показатели')}
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">${kpiHtml}</div>
    </div>

    ${metricsHtml}

    ${riskAnalytics ? `
      <!-- Risk distribution: 2 cols -->
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:20px;margin-bottom:24px;">
        <div>
          ${section('Риски по критичности')}
          ${bars(riskAnalytics.risks_by_criticality, critColor)}
        </div>
        <div>
          ${section('Риски по статусам')}
          ${bars(riskAnalytics.risks_by_status, statColor)}
        </div>
      </div>

      ${ownerEntries.length ? `
        <div style="margin-bottom:24px;">
          ${section('Риски по владельцам')}
          ${ownerHtml}
        </div>` : ''}

      ${topRows ? `
        <div style="margin-bottom:24px;">
          ${section('Топ-10 самых опасных рисков')}
          <table style="width:100%;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;">
            <thead>
              <tr style="background:#f1f5f9;">
                <th style="padding:7px 8px;font-size:10px;font-weight:600;color:#64748b;text-align:center;width:24px;">#</th>
                <th style="padding:7px 8px;font-size:10px;font-weight:600;color:#64748b;text-align:left;">Риск / Сценарий</th>
                <th style="padding:7px 8px;font-size:10px;font-weight:600;color:#64748b;text-align:left;width:100px;">Уровень</th>
                <th style="padding:7px 8px;font-size:10px;font-weight:600;color:#64748b;text-align:left;width:90px;">Критичность</th>
                <th style="padding:7px 8px;font-size:10px;font-weight:600;color:#64748b;text-align:left;width:90px;">Владелец</th>
              </tr>
            </thead>
            <tbody>${topRows}</tbody>
          </table>
        </div>` : ''}
    ` : ''}

    <!-- Footer -->
    <div style="margin-top:28px;padding-top:12px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;">
      <div style="font-size:9px;color:#94a3b8;">SecuRisk — Система управления рисками ИБ</div>
      <div style="font-size:9px;color:#94a3b8;">Конфиденциально</div>
    </div>`;
};

/* ─────────────────────────────────────────────────────────────────────────── */
const Dashboard = ({ user }) => {
  const navigate = useNavigate();
  const printRef = useRef(null);
  const [stats, setStats] = useState(null);
  const [riskAnalytics, setRiskAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showGear, setShowGear] = useState(false);
  const [visible, setVisible] = useState(() => {
    try {
      const saved = localStorage.getItem('dashboard_widgets');
      return saved ? { ...DEFAULT_VISIBLE, ...JSON.parse(saved) } : DEFAULT_VISIBLE;
    } catch {
      return DEFAULT_VISIBLE;
    }
  });
  const gearRef = useRef(null);

  useEffect(() => {
    fetchStats();
    fetchRiskAnalytics();
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (gearRef.current && !gearRef.current.contains(e.target)) setShowGear(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleWidget = (key) => {
    const next = { ...visible, [key]: !visible[key] };
    setVisible(next);
    localStorage.setItem('dashboard_widgets', JSON.stringify(next));
  };

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

  /* ── PDF export: renders a clean off-screen HTML layout, then captures it ── */
  const exportPdf = async () => {
    setExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      // Build an off-screen div with clean inline-styled HTML
      const container = document.createElement('div');
      container.style.cssText =
        'position:fixed;top:-9999px;left:-9999px;width:794px;background:#fff;' +
        'padding:32px;font-family:Arial,Helvetica,sans-serif;color:#0f172a;font-size:13px;line-height:1.5;';
      container.innerHTML = buildPrintHTML(stats, riskAnalytics);
      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        scale: 2, useCORS: true, backgroundColor: '#ffffff',
        width: 794, windowWidth: 794,
      });
      document.body.removeChild(container);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW = 210;
      const pdfH = 297;
      const imgH = (canvas.height / canvas.width) * pdfW;
      let pos = 0;
      let left = imgH;
      while (left > 0) {
        if (pos > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -pos, pdfW, imgH);
        pos += pdfH;
        left -= pdfH;
      }
      pdf.save(`securisk-dashboard-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error('PDF export failed', e);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600" />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Всего рисков',
      value: stats?.total_risks || 0,
      sub: `${stats?.critical_risks || 0} критических`,
      icon: AlertTriangle,
      gradient: 'from-amber-400 to-orange-500',
      path: '/risks',
      tip: 'Перейти к реестру рисков',
    },
    {
      title: 'Критические риски',
      value: stats?.critical_risks || 0,
      sub: `${stats?.total_risks > 0 ? Math.round((stats.critical_risks / stats.total_risks) * 100) : 0}% от всех рисков`,
      icon: TrendingUp,
      gradient: 'from-red-500 to-red-700',
      path: '/risks',
      tip: 'Показать только критические',
    },
    {
      title: 'Всего инцидентов',
      value: stats?.total_incidents || 0,
      sub: `${stats?.open_incidents || 0} открытых`,
      icon: AlertCircle,
      gradient: 'from-blue-500 to-blue-700',
      path: '/incidents',
      tip: 'Перейти к журналу инцидентов',
    },
    {
      title: 'Открытые инциденты',
      value: stats?.open_incidents || 0,
      sub: `${stats?.total_incidents > 0 ? Math.round((stats.open_incidents / stats.total_incidents) * 100) : 0}% требуют внимания`,
      icon: Activity,
      gradient: 'from-violet-500 to-purple-700',
      path: '/incidents',
      tip: 'Показать открытые инциденты',
    },
    {
      title: 'Всего активов',
      value: stats?.total_assets || 0,
      sub: `${stats?.critical_assets || 0} критических`,
      icon: Server,
      gradient: 'from-cyan-500 to-cyan-700',
      path: '/assets',
      tip: 'Перейти к реестру активов',
    },
    {
      title: 'Критические активы',
      value: stats?.critical_assets || 0,
      sub: `${stats?.total_assets > 0 ? Math.round((stats.critical_assets / stats.total_assets) * 100) : 0}% от всех активов`,
      icon: Shield,
      gradient: 'from-teal-500 to-teal-700',
      path: '/assets',
      tip: 'Показать критические активы',
    },
  ];

  const getCriticalityColor = (c) => {
    if (c === 'Критический') return 'bg-red-500';
    if (c === 'Высокий')     return 'bg-orange-500';
    if (c === 'Средний')     return 'bg-yellow-500';
    if (c === 'Низкий')      return 'bg-green-500';
    return 'bg-slate-400';
  };

  const getCriticalityBadge = (c) => {
    if (c === 'Критический') return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400';
    if (c === 'Высокий')     return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400';
    if (c === 'Средний')     return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400';
    if (c === 'Низкий')      return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400';
    return 'bg-slate-100 text-slate-600';
  };

  const getStatusColor = (s) => {
    if (s === 'Открыт')      return 'bg-blue-500';
    if (s === 'В обработке') return 'bg-amber-500';
    if (s === 'Принят')      return 'bg-purple-500';
    if (s === 'Закрыт')      return 'bg-slate-400';
    return 'bg-slate-400';
  };

  const getStatusBadge = (s) => {
    if (s === 'Открыт')      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400';
    if (s === 'В обработке') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400';
    if (s === 'Принят')      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400';
    if (s === 'Закрыт')      return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400';
    return 'bg-slate-100 text-slate-600';
  };

  const maxRiskLevel = 25;

  return (
    <TooltipProvider>
      <div className="space-y-5 animate-fade-in">

        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Дашборд</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Обзор состояния информационной безопасности</p>
          </div>
          <div className="flex items-center gap-2">
            {/* PDF Export */}
            <Button
              variant="outline"
              size="sm"
              onClick={exportPdf}
              disabled={exporting}
              className="gap-1.5 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Генерация…' : 'PDF'}
            </Button>

            {/* Gear widget picker */}
            <div className="relative" ref={gearRef}>
              <button
                onClick={() => setShowGear(v => !v)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors border border-slate-200 dark:border-slate-700 text-sm font-medium"
                title="Настроить виджеты"
              >
                <Settings2 className="w-4 h-4" />
                <span className="hidden sm:inline">Виджеты</span>
              </button>
              {showGear && (
                <div className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl w-52 p-2">
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 px-2 py-1.5 uppercase tracking-wider">
                    Показывать блоки
                  </p>
                  {Object.entries(WIDGET_LABELS).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                      <input
                        type="checkbox"
                        checked={visible[key] ?? true}
                        onChange={() => toggleWidget(key)}
                        className="w-4 h-4 accent-cyan-500 cursor-pointer"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Content captured for PDF ── */}
        <div ref={printRef} className="space-y-5">

          {/* ── KPI Cards ── */}
          {visible.stats && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {statCards.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <Tooltip key={i}>
                    <TooltipTrigger asChild>
                      <div
                        data-testid={`stat-card-${i}`}
                        onClick={() => navigate(stat.path)}
                        className={`relative overflow-hidden rounded-2xl p-5 cursor-pointer bg-gradient-to-br ${stat.gradient} hover:scale-[1.02] hover:shadow-xl transition-all duration-200 select-none`}
                      >
                        {/* decorative bg icon */}
                        <Icon className="absolute -right-3 -top-3 w-20 h-20 text-white/15" />
                        <div className="relative">
                          <div className="flex items-center justify-between mb-3">
                            <div className="p-2 bg-white/20 rounded-lg">
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                            <ChevronRight className="w-4 h-4 text-white/60" />
                          </div>
                          <div className="text-4xl font-black text-white leading-none mb-1">{stat.value}</div>
                          <div className="text-sm font-semibold text-white/90">{stat.title}</div>
                          <div className="text-xs text-white/65 mt-0.5">{stat.sub}</div>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{stat.tip}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          )}

          {/* ── Incident Metrics ── */}
          {visible.incident_metrics && (stats?.avg_mtta || stats?.avg_mttr || stats?.avg_mttc) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                stats?.avg_mtta && { label: 'Среднее время обнаружения', abbr: 'MTTA', value: stats.avg_mtta, icon: Clock,        color: 'text-blue-600',   iconBg: 'bg-blue-100 dark:bg-blue-900/30',   accent: 'border-l-blue-500'   },
                stats?.avg_mttr && { label: 'Среднее время реагирования', abbr: 'MTTR', value: stats.avg_mttr, icon: Timer,        color: 'text-orange-600', iconBg: 'bg-orange-100 dark:bg-orange-900/30', accent: 'border-l-orange-500' },
                stats?.avg_mttc && { label: 'Среднее время закрытия',     abbr: 'MTTC', value: stats.avg_mttc, icon: CheckCircle2, color: 'text-green-600',  iconBg: 'bg-green-100 dark:bg-green-900/30',  accent: 'border-l-green-500'  },
              ].filter(Boolean).map((m) => {
                const Icon = m.icon;
                return (
                  <div
                    key={m.abbr}
                    onClick={() => navigate('/incidents')}
                    className={`group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 border-l-4 ${m.accent} rounded-xl p-5 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-2.5 rounded-xl ${m.iconBg}`}>
                        <Icon className={`w-6 h-6 ${m.color}`} />
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${m.iconBg} ${m.color}`}>{m.abbr}</span>
                    </div>
                    <div className={`text-3xl font-black ${m.color} mb-1`}>{m.value}<span className="text-lg ml-0.5">ч</span></div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">{m.label}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Risk Distribution — Tabs ── */}
          {visible.risk_charts && riskAnalytics && (
            <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
              <CardHeader className="pb-2 pt-5 px-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-slate-500" />
                    Распределение рисков
                  </CardTitle>
                  <button
                    onClick={() => navigate('/risks')}
                    className="text-xs text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 font-medium flex items-center gap-1"
                  >
                    Все риски <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="px-6 pb-5">
                <Tabs defaultValue="criticality">
                  <TabsList className="mb-4">
                    <TabsTrigger value="criticality">По критичности</TabsTrigger>
                    <TabsTrigger value="status">По статусам</TabsTrigger>
                    <TabsTrigger value="owner">По владельцам</TabsTrigger>
                  </TabsList>

                  <TabsContent value="criticality" className="space-y-3 mt-0">
                    {Object.entries(riskAnalytics.risks_by_criticality || {}).map(([crit, cnt]) => {
                      const total = Object.values(riskAnalytics.risks_by_criticality).reduce((a, b) => a + b, 0);
                      const pct = total > 0 ? Math.round((cnt / total) * 100) : 0;
                      return (
                        <div key={crit} className="flex items-center gap-3">
                          <div className="w-28 text-sm font-medium text-slate-700 dark:text-slate-300 flex-shrink-0">{crit}</div>
                          <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                            <div className={`h-full ${getCriticalityColor(crit)} transition-all duration-700`} style={{ width: `${pct}%` }} />
                          </div>
                          <div className="w-16 text-right text-sm text-slate-500 dark:text-slate-400 flex-shrink-0">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{cnt}</span> ({pct}%)
                          </div>
                        </div>
                      );
                    })}
                  </TabsContent>

                  <TabsContent value="status" className="space-y-3 mt-0">
                    {Object.entries(riskAnalytics.risks_by_status || {}).map(([status, cnt]) => {
                      const total = Object.values(riskAnalytics.risks_by_status).reduce((a, b) => a + b, 0);
                      const pct = total > 0 ? Math.round((cnt / total) * 100) : 0;
                      return (
                        <div key={status} className="flex items-center gap-3">
                          <div className="w-28 text-sm font-medium text-slate-700 dark:text-slate-300 flex-shrink-0">{status}</div>
                          <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                            <div className={`h-full ${getStatusColor(status)} transition-all duration-700`} style={{ width: `${pct}%` }} />
                          </div>
                          <div className="w-16 text-right text-sm text-slate-500 dark:text-slate-400 flex-shrink-0">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{cnt}</span> ({pct}%)
                          </div>
                        </div>
                      );
                    })}
                  </TabsContent>

                  <TabsContent value="owner" className="mt-0">
                    <div className="space-y-2">
                      {Object.entries(riskAnalytics.risks_by_owner || {})
                        .sort((a, b) => b[1] - a[1])
                        .map(([owner, cnt], idx) => {
                          const total = Object.values(riskAnalytics.risks_by_owner).reduce((a, b) => a + b, 0);
                          const pct = total > 0 ? Math.round((cnt / total) * 100) : 0;
                          return (
                            <div key={owner} className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-600 text-xs font-bold text-slate-600 dark:text-slate-300 flex-shrink-0">{idx + 1}</div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{owner}</span>
                                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 ml-2 flex-shrink-0">{cnt} ({pct}%)</span>
                                </div>
                                <div className="bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                                  <div className="h-full bg-cyan-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* ── Top-10 Risks ── */}
          {visible.top_risks && riskAnalytics?.top_risks?.length > 0 && (
            <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
              <CardHeader className="pb-2 pt-5 px-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-200">
                    Топ-10 самых опасных рисков
                  </CardTitle>
                  <button
                    onClick={() => navigate('/risks')}
                    className="text-xs text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 font-medium flex items-center gap-1"
                  >
                    Все риски <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="px-6 pb-5">
                <div className="space-y-2">
                  {/* Column headers */}
                  <div className="grid grid-cols-[2rem_1fr_8rem_6rem_5rem] gap-3 px-2 pb-1 border-b border-slate-100 dark:border-slate-700">
                    <div className="text-xs text-slate-400 font-medium">#</div>
                    <div className="text-xs text-slate-400 font-medium">Риск</div>
                    <div className="text-xs text-slate-400 font-medium">Уровень</div>
                    <div className="text-xs text-slate-400 font-medium">Критичность</div>
                    <div className="text-xs text-slate-400 font-medium">Владелец</div>
                  </div>

                  {riskAnalytics.top_risks.map((risk, idx) => (
                    <Tooltip key={risk.risk_number}>
                      <TooltipTrigger asChild>
                        <div
                          onClick={() => navigate(`/risks?risk_id=${risk.id}`)}
                          className="grid grid-cols-[2rem_1fr_8rem_6rem_5rem] gap-3 items-center px-2 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/60 cursor-pointer transition-colors group"
                        >
                          {/* Rank */}
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-600 text-xs font-bold text-slate-600 dark:text-slate-300">
                            {idx + 1}
                          </div>

                          {/* Risk name */}
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{risk.risk_number}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{risk.scenario}</div>
                          </div>

                          {/* Risk level bar */}
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full transition-all duration-500 ${getCriticalityColor(risk.criticality)}`}
                                style={{ width: `${Math.min((risk.risk_level / maxRiskLevel) * 100, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm font-black text-slate-700 dark:text-slate-300 w-5 text-right flex-shrink-0">{risk.risk_level}</span>
                          </div>

                          {/* Criticality badge */}
                          <div>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getCriticalityBadge(risk.criticality)}`}>
                              {risk.criticality}
                            </span>
                          </div>

                          {/* Owner */}
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{risk.owner}</div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-xs">
                        <p className="font-semibold mb-1">{risk.risk_number}</p>
                        <p className="text-xs">{risk.scenario}</p>
                        {risk.owner && <p className="text-xs text-slate-400 mt-1">Владелец: {risk.owner}</p>}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

        </div>{/* end printRef */}
      </div>
    </TooltipProvider>
  );
};

export default Dashboard;
