import { useState, useEffect, useRef, useCallback } from 'react';
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
  BarChart3, CalendarDays, ChevronDown, ChevronUp, ShieldAlert, Bug,
} from 'lucide-react';

/* ── Section registry ──────────────────────────────────────────── */
const ALL_SECTIONS = ['stats', 'incident_metrics', 'risk_charts', 'top_risks', 'recent_incidents', 'vuln_stats', 'asset_stats'];

const SECTION_META = {
  stats:             { label: 'Статистика (KPI)',       icon: BarChart3 },
  incident_metrics:  { label: 'Метрики инцидентов',     icon: Timer },
  risk_charts:       { label: 'Распределение рисков',   icon: AlertTriangle },
  top_risks:         { label: 'Топ-10 рисков',          icon: TrendingUp },
  recent_incidents:  { label: 'Последние инциденты',    icon: AlertCircle },
  vuln_stats:        { label: 'Уязвимости',             icon: ShieldAlert },
  asset_stats:       { label: 'Активы',                 icon: Server },
};

const DEFAULT_SECTIONS = [...ALL_SECTIONS];

/* ── Period presets ────────────────────────────────────────────── */
const PERIOD_PRESETS = [
  { value: 'all',       label: 'Всё время' },
  { value: 'today',     label: 'Сегодня' },
  { value: 'yesterday', label: 'Вчера' },
  { value: 'week',      label: 'Эта неделя' },
  { value: 'last_week', label: 'Прошлая неделя' },
  { value: 'month',     label: 'Этот месяц' },
  { value: 'last_month',label: 'Прошлый месяц' },
  { value: '2months',   label: 'Последние 2 месяца' },
  { value: '3months',   label: 'Последние 3 месяца' },
  { value: '6months',   label: 'Последние 6 месяцев' },
  { value: 'year',      label: 'Последний год' },
  { value: 'last_year', label: 'Прошлый год' },
  { value: 'custom',    label: 'Произвольный период' },
];

function presetToDates(preset, customFrom, customTo) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const iso   = d => d.toISOString();
  const sod   = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const eod   = d => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  switch (preset) {
    case 'all': return { date_from: null, date_to: null };
    case 'today': return { date_from: iso(sod(today)), date_to: iso(eod(today)) };
    case 'yesterday': { const y = new Date(today); y.setDate(y.getDate()-1); return { date_from: iso(sod(y)), date_to: iso(eod(y)) }; }
    case 'week': { const d = today.getDay()||7; const m=new Date(today); m.setDate(today.getDate()-d+1); return { date_from: iso(sod(m)), date_to: iso(eod(today)) }; }
    case 'last_week': { const d=today.getDay()||7; const m=new Date(today); m.setDate(today.getDate()-d+1-7); const s=new Date(m); s.setDate(m.getDate()+6); return { date_from: iso(sod(m)), date_to: iso(eod(s)) }; }
    case 'month': { const f=new Date(today.getFullYear(),today.getMonth(),1); return { date_from: iso(sod(f)), date_to: iso(eod(today)) }; }
    case 'last_month': { const f=new Date(today.getFullYear(),today.getMonth()-1,1); const l=new Date(today.getFullYear(),today.getMonth(),0); return { date_from: iso(sod(f)), date_to: iso(eod(l)) }; }
    case '2months': { const f=new Date(today); f.setMonth(f.getMonth()-2); return { date_from: iso(sod(f)), date_to: iso(eod(today)) }; }
    case '3months': { const f=new Date(today); f.setMonth(f.getMonth()-3); return { date_from: iso(sod(f)), date_to: iso(eod(today)) }; }
    case '6months': { const f=new Date(today); f.setMonth(f.getMonth()-6); return { date_from: iso(sod(f)), date_to: iso(eod(today)) }; }
    case 'year': { const f=new Date(today); f.setFullYear(f.getFullYear()-1); return { date_from: iso(sod(f)), date_to: iso(eod(today)) }; }
    case 'last_year': { const f=new Date(today.getFullYear()-1,0,1); const t=new Date(today.getFullYear()-1,11,31); return { date_from: iso(sod(f)), date_to: iso(eod(t)) }; }
    case 'custom': return { date_from: customFrom ? new Date(customFrom).toISOString() : null, date_to: customTo ? new Date(customTo+'T23:59:59').toISOString() : null };
    default: return { date_from: null, date_to: null };
  }
}

/* ── Period selector component ─────────────────────────────────── */
const PeriodSelector = ({ period, setPeriod, customFrom, setCustomFrom, customTo, setCustomTo }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const label = PERIOD_PRESETS.find(p => p.value === period)?.label ?? 'Период';
  const fmtDate = d => d ? new Date(d).toLocaleDateString('ru-RU', { day:'2-digit', month:'short', year:'numeric' }) : '';
  const displayLabel = period === 'custom' && (customFrom || customTo)
    ? `${fmtDate(customFrom)} — ${fmtDate(customTo)}`
    : label;
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
        <CalendarDays className="w-4 h-4 text-slate-400" />
        <span className="max-w-[160px] truncate">{displayLabel}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl w-56 p-1.5">
          {PERIOD_PRESETS.map(p => (
            <button key={p.value} onClick={() => { setPeriod(p.value); if (p.value !== 'custom') setOpen(false); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${period === p.value ? 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 font-medium' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
              {p.label}
            </button>
          ))}
          {period === 'custom' && (
            <div className="px-3 py-2 space-y-2 border-t border-slate-100 dark:border-slate-700 mt-1">
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">С</label>
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm dark:bg-slate-700 dark:text-slate-200" />
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">По</label>
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm dark:bg-slate-700 dark:text-slate-200" />
              </div>
              <button onClick={() => setOpen(false)} className="w-full py-1.5 bg-cyan-500 text-white rounded-lg text-sm font-medium hover:bg-cyan-600">
                Применить
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   PDF HTML builder  (A4 landscape — container 1120px, content 1040px)
   html2canvas rules: no flexbox flex:1, no grid fr → use <table>
   ═══════════════════════════════════════════════════════════════════ */
const buildPrintHTML = (stats, riskAnalytics, recentIncidents, vulnStats, assetStats, periodLabel) => {
  const W    = 1040;          // content width
  const date = new Date().toLocaleDateString('ru-RU', { day:'2-digit', month:'long', year:'numeric' });

  const critColor = c => ({ Критический:'#dc2626', Высокий:'#ea580c', Средний:'#ca8a04', Низкий:'#16a34a', 'Критическая':'#dc2626', 'Высокая':'#ea580c', 'Средняя':'#ca8a04', 'Низкая':'#16a34a' }[c] ?? '#94a3b8');
  const statColor = s => ({ Открыт:'#2563eb', 'В обработке':'#d97706', Принят:'#9333ea', Закрыт:'#94a3b8', Открыт:'#2563eb' }[s] ?? '#94a3b8');
  const incStatColor = s => statColor(s);

  const section = (t) =>
    `<div style="font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.07em;padding-bottom:5px;border-bottom:2px solid #e2e8f0;margin-bottom:10px;">${t}</div>`;

  /* bar table helper */
  const barTable = (data, colorFn, colW) => {
    const labelW = 130, countW = 80, barW = colW - labelW - countW - 8;
    const tot = Object.values(data || {}).reduce((a,b) => a+b, 0);
    const rows = Object.entries(data || {}).map(([k, v]) => {
      const pct = tot > 0 ? Math.round(v/tot*100) : 0;
      const fill = Math.max(0, Math.round(barW * pct / 100));
      const c = colorFn(k);
      return `<tr>
        <td style="width:${labelW}px;padding:4px 6px 4px 0;font-size:11px;font-weight:500;color:#334155;vertical-align:middle;overflow:hidden;white-space:nowrap;">${k}</td>
        <td style="width:${barW}px;padding:4px;vertical-align:middle;">
          <table style="width:${barW}px;border-collapse:collapse;"><tr>
            <td style="width:${fill}px;height:9px;background:${c};border-radius:${fill>0?'4px 0 0 4px':'4px'};"></td>
            <td style="width:${barW-fill}px;height:9px;background:#e2e8f0;border-radius:${fill===0?'4px':'0 4px 4px 0'};"></td>
          </tr></table>
        </td>
        <td style="width:${countW}px;padding:4px 0 4px 6px;text-align:right;font-size:10px;color:#64748b;vertical-align:middle;white-space:nowrap;"><b style="color:#1e293b;">${v}</b>&nbsp;(${pct}%)</td>
      </tr>`;
    }).join('');
    return `<table style="width:${colW}px;border-collapse:collapse;table-layout:fixed;">${rows}</table>`;
  };

  /* ── KPI cards: 6 in 2 rows × 3 ── */
  const kpi = [
    { label:'Всего рисков',       value:stats?.total_risks||0,     sub:`${stats?.critical_risks||0} критических`,    color:'#d97706' },
    { label:'Критические риски',  value:stats?.critical_risks||0,  sub:`из ${stats?.total_risks||0} всего`,          color:'#dc2626' },
    { label:'Всего инцидентов',   value:stats?.total_incidents||0, sub:`${stats?.open_incidents||0} открытых`,       color:'#2563eb' },
    { label:'Открытые инциденты', value:stats?.open_incidents||0,  sub:`из ${stats?.total_incidents||0} всего`,      color:'#7c3aed' },
    { label:'Всего активов',      value:stats?.total_assets||0,    sub:`${stats?.critical_assets||0} критических`,  color:'#0891b2' },
    { label:'Критические активы', value:stats?.critical_assets||0, sub:`из ${stats?.total_assets||0} всего`,        color:'#0d9488' },
  ];
  const cW = Math.floor((W - 20) / 3);
  const kpiRows = [kpi.slice(0,3), kpi.slice(3,6)].map(row =>
    `<tr>${row.map(k => `<td style="width:${cW}px;padding:5px;">
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid ${k.color};border-radius:8px;padding:14px 16px;">
        <div style="font-size:32px;font-weight:900;color:${k.color};line-height:1;">${k.value}</div>
        <div style="font-size:12px;font-weight:700;color:#334155;margin-top:6px;">${k.label}</div>
        <div style="font-size:10px;color:#94a3b8;margin-top:3px;">${k.sub}</div>
      </div>
    </td>`).join('')}</tr>`
  ).join('');
  const kpiHtml = `<div style="margin-bottom:24px;">${section('Ключевые показатели')}<table style="width:${W}px;border-collapse:collapse;table-layout:fixed;margin:-5px;">${kpiRows}</table></div>`;

  /* ── Metrics + Risk distribution: 4-column row ── */
  const halfW = Math.floor((W - 24) / 2);
  const qW    = Math.floor((W - 36) / 4);

  const metricCards = [
    stats?.avg_mtta && { abbr:'MTTA', label:'Обнаружение',  val:stats.avg_mtta, color:'#2563eb', bg:'#eff6ff' },
    stats?.avg_mttr && { abbr:'MTTR', label:'Реагирование', val:stats.avg_mttr, color:'#ea580c', bg:'#fff7ed' },
    stats?.avg_mttc && { abbr:'MTTC', label:'Закрытие',     val:stats.avg_mttc, color:'#16a34a', bg:'#f0fdf4' },
  ].filter(Boolean);

  const metricsHtml = metricCards.length ? `<div style="margin-bottom:24px;">
    ${section('Метрики инцидентов')}
    <table style="width:${W}px;border-collapse:collapse;table-layout:fixed;margin:-5px;"><tr>
    ${metricCards.map(m => `<td style="width:${qW}px;padding:5px;">
      <div style="background:${m.bg};border-left:4px solid ${m.color};border-radius:8px;padding:14px 16px;">
        <div style="font-size:28px;font-weight:900;color:${m.color};line-height:1.1;">${m.val}<span style="font-size:12px;font-weight:400;"> ч</span></div>
        <div style="font-size:11px;font-weight:700;color:${m.color};margin-top:5px;">${m.abbr}</div>
        <div style="font-size:10px;color:#64748b;margin-top:2px;">${m.label}</div>
      </div>
    </td>`).join('')}
    </tr></table></div>` : '';

  /* ── Risk distributions: criticality + status side by side ── */
  const distHtml = riskAnalytics ? `<div style="margin-bottom:24px;">
    <table style="width:${W}px;border-collapse:collapse;table-layout:fixed;">
      <tr>
        <td style="width:${halfW}px;padding-right:12px;vertical-align:top;">
          ${section('Риски по критичности')}
          ${barTable(riskAnalytics.risks_by_criticality, critColor, halfW)}
        </td>
        <td style="width:${halfW}px;padding-left:12px;vertical-align:top;">
          ${section('Риски по статусам')}
          ${barTable(riskAnalytics.risks_by_status, statColor, halfW)}
        </td>
      </tr>
    </table></div>` : '';

  /* ── Risk owners ── */
  const ownerEntries = Object.entries(riskAnalytics?.risks_by_owner || {}).sort((a,b) => b[1]-a[1]);
  const ownerTot = ownerEntries.reduce((s,[,v]) => s+v, 0);
  const oRank=30, oName=220, oCount=80, oBar=W-oRank-oName-oCount-16;
  const ownerRows = ownerEntries.map(([o,v],i) => {
    const pct = ownerTot > 0 ? Math.round(v/ownerTot*100) : 0;
    const fill = Math.max(0, Math.round(oBar*pct/100));
    return `<tr style="background:${i%2===1?'#f8fafc':'#fff'};">
      <td style="width:${oRank}px;padding:5px 4px;text-align:center;vertical-align:middle;">
        <div style="display:inline-block;width:22px;height:22px;background:#e2e8f0;border-radius:50%;text-align:center;line-height:22px;font-size:9px;font-weight:700;color:#475569;">${i+1}</div>
      </td>
      <td style="width:${oName}px;padding:5px 6px;font-size:11px;color:#334155;vertical-align:middle;overflow:hidden;white-space:nowrap;">${o}</td>
      <td style="width:${oBar}px;padding:5px 4px;vertical-align:middle;">
        <table style="width:${oBar}px;border-collapse:collapse;"><tr>
          <td style="width:${fill}px;height:8px;background:#06b6d4;border-radius:${fill>0?'4px 0 0 4px':'4px'};"></td>
          <td style="width:${oBar-fill}px;height:8px;background:#e2e8f0;border-radius:${fill===0?'4px':'0 4px 4px 0'};"></td>
        </tr></table>
      </td>
      <td style="width:${oCount}px;padding:5px 4px;text-align:right;font-size:10px;color:#64748b;vertical-align:middle;white-space:nowrap;"><b style="color:#1e293b;">${v}</b>&nbsp;(${pct}%)</td>
    </tr>`;
  }).join('');
  const ownerHtml = ownerEntries.length ? `<div style="margin-bottom:24px;">
    ${section('Риски по владельцам')}
    <table style="width:${W}px;border-collapse:collapse;table-layout:fixed;">${ownerRows}</table></div>` : '';

  /* ── Top-10 risks ── */
  const tRank=32, tLevel=120, tCrit=110, tOwner=140, tPad=5*12;
  const tRisk = W - tRank - tLevel - tCrit - tOwner - tPad;
  const topRows = (riskAnalytics?.top_risks || []).map((r,i) => {
    const c = critColor(r.criticality);
    const pct = Math.min(Math.round((r.risk_level/25)*100), 100);
    const fill = Math.round(80 * pct / 100);
    const scenario = (r.scenario||'').length > 80 ? (r.scenario||'').slice(0,78)+'…' : (r.scenario||'');
    return `<tr style="background:${i%2===1?'#f8fafc':'#fff'};">
      <td style="width:${tRank}px;padding:6px;text-align:center;font-size:12px;font-weight:700;color:#64748b;vertical-align:middle;">${i+1}</td>
      <td style="width:${tRisk}px;padding:6px;vertical-align:middle;overflow:hidden;">
        <div style="font-size:11px;font-weight:700;color:#1e293b;white-space:nowrap;overflow:hidden;">${r.risk_number||''}</div>
        <div style="font-size:9.5px;color:#64748b;margin-top:2px;white-space:nowrap;overflow:hidden;">${scenario}</div>
      </td>
      <td style="width:${tLevel}px;padding:6px;vertical-align:middle;">
        <table style="width:100%;border-collapse:collapse;"><tr>
          <td style="width:80px;vertical-align:middle;">
            <table style="width:80px;border-collapse:collapse;"><tr>
              <td style="width:${fill}px;height:7px;background:${c};border-radius:${fill>0?'3px 0 0 3px':'3px'};"></td>
              <td style="width:${80-fill}px;height:7px;background:#e2e8f0;border-radius:${fill===0?'3px':'0 3px 3px 0'};"></td>
            </tr></table>
          </td>
          <td style="padding-left:6px;font-size:14px;font-weight:900;color:#1e293b;white-space:nowrap;">${r.risk_level}</td>
        </tr></table>
      </td>
      <td style="width:${tCrit}px;padding:6px;vertical-align:middle;">
        <span style="background:${c}22;color:${c};border-radius:5px;padding:2px 8px;font-size:9.5px;font-weight:700;white-space:nowrap;">${r.criticality||'—'}</span>
      </td>
      <td style="width:${tOwner}px;padding:6px;font-size:10px;color:#64748b;vertical-align:middle;overflow:hidden;white-space:nowrap;">${r.owner||'—'}</td>
    </tr>`;
  }).join('');
  const topHtml = topRows ? `<div style="margin-bottom:24px;">
    ${section('Топ-10 самых опасных рисков')}
    <table style="width:${W}px;border-collapse:collapse;table-layout:fixed;">
      <thead><tr style="background:#f1f5f9;">
        <th style="width:${tRank}px;padding:6px;font-size:10px;font-weight:600;color:#64748b;text-align:center;">#</th>
        <th style="width:${tRisk}px;padding:6px;font-size:10px;font-weight:600;color:#64748b;text-align:left;">Риск / Сценарий</th>
        <th style="width:${tLevel}px;padding:6px;font-size:10px;font-weight:600;color:#64748b;text-align:left;">Уровень</th>
        <th style="width:${tCrit}px;padding:6px;font-size:10px;font-weight:600;color:#64748b;text-align:left;">Критичность</th>
        <th style="width:${tOwner}px;padding:6px;font-size:10px;font-weight:600;color:#64748b;text-align:left;">Владелец</th>
      </tr></thead>
      <tbody>${topRows}</tbody>
    </table></div>` : '';

  /* ── Recent incidents ── */
  const iNum=32, iStat=110, iPri=90, iDate=90, iMtta=70, iMttr=70, iPad=6*12;
  const iName = W - iNum - iStat - iPri - iDate - iMtta - iMttr - iPad;
  const incRows = (recentIncidents||[]).map((inc,i) => {
    const sc = incStatColor(inc.status);
    const title = (inc.title||inc.name||inc.description||'Инцидент').slice(0,60);
    return `<tr style="background:${i%2===1?'#f8fafc':'#fff'};">
      <td style="width:${iNum}px;padding:6px;text-align:center;font-size:11px;font-weight:700;color:#64748b;vertical-align:middle;">${i+1}</td>
      <td style="width:${iName}px;padding:6px;font-size:11px;font-weight:600;color:#1e293b;vertical-align:middle;overflow:hidden;white-space:nowrap;">${title}</td>
      <td style="width:${iStat}px;padding:6px;vertical-align:middle;">
        <span style="background:${sc}22;color:${sc};border-radius:5px;padding:2px 8px;font-size:9.5px;font-weight:700;white-space:nowrap;">${inc.status||'—'}</span>
      </td>
      <td style="width:${iPri}px;padding:6px;font-size:10px;color:#64748b;vertical-align:middle;white-space:nowrap;">${inc.priority||inc.criticality||'—'}</td>
      <td style="width:${iDate}px;padding:6px;font-size:10px;color:#64748b;vertical-align:middle;white-space:nowrap;">${inc.created_at ? new Date(inc.created_at).toLocaleDateString('ru-RU') : '—'}</td>
      <td style="width:${iMtta}px;padding:6px;font-size:10px;color:#64748b;text-align:center;vertical-align:middle;">${inc.mtta ? `${inc.mtta}ч` : '—'}</td>
      <td style="width:${iMttr}px;padding:6px;font-size:10px;color:#64748b;text-align:center;vertical-align:middle;">${inc.mttr ? `${inc.mttr}ч` : '—'}</td>
    </tr>`;
  }).join('');
  const incHtml = incRows ? `<div style="margin-bottom:24px;">
    ${section('Последние инциденты')}
    <table style="width:${W}px;border-collapse:collapse;table-layout:fixed;">
      <thead><tr style="background:#f1f5f9;">
        <th style="width:${iNum}px;padding:6px;font-size:10px;font-weight:600;color:#64748b;text-align:center;">#</th>
        <th style="width:${iName}px;padding:6px;font-size:10px;font-weight:600;color:#64748b;text-align:left;">Инцидент</th>
        <th style="width:${iStat}px;padding:6px;font-size:10px;font-weight:600;color:#64748b;text-align:left;">Статус</th>
        <th style="width:${iPri}px;padding:6px;font-size:10px;font-weight:600;color:#64748b;text-align:left;">Приоритет</th>
        <th style="width:${iDate}px;padding:6px;font-size:10px;font-weight:600;color:#64748b;text-align:left;">Дата</th>
        <th style="width:${iMtta}px;padding:6px;font-size:10px;font-weight:600;color:#64748b;text-align:center;">MTTA</th>
        <th style="width:${iMttr}px;padding:6px;font-size:10px;font-weight:600;color:#64748b;text-align:center;">MTTR</th>
      </tr></thead>
      <tbody>${incRows}</tbody>
    </table></div>` : '';

  /* ── Vuln + Asset stats side by side ── */
  const extraHtml = (vulnStats || assetStats) ? `<div style="margin-bottom:24px;">
    <table style="width:${W}px;border-collapse:collapse;table-layout:fixed;">
      <tr>
        <td style="width:${halfW}px;padding-right:12px;vertical-align:top;">
          ${section('Уязвимости по критичности')}
          ${barTable(vulnStats || {}, critColor, halfW)}
        </td>
        <td style="width:${halfW}px;padding-left:12px;vertical-align:top;">
          ${section('Активы по критичности')}
          ${barTable(assetStats || {}, critColor, halfW)}
        </td>
      </tr>
    </table></div>` : '';

  return `
    <table style="width:${W+80}px;border-collapse:collapse;background:#0f172a;margin:-40px -40px 28px -40px;">
      <tr>
        <td style="padding:16px 40px;vertical-align:middle;">
          <div style="font-size:18px;font-weight:800;color:#22d3ee;letter-spacing:-0.5px;">SecuRisk</div>
          <div style="font-size:9.5px;color:#94a3b8;margin-top:2px;">ISO 27000 — Система управления информационной безопасностью</div>
        </td>
        <td style="padding:16px 40px;text-align:right;vertical-align:middle;">
          <div style="font-size:14px;font-weight:700;color:#fff;">Дашборд ИБ — Сводный отчёт</div>
          <div style="font-size:10px;color:#94a3b8;margin-top:3px;">Период: ${periodLabel}</div>
          <div style="font-size:10px;color:#94a3b8;margin-top:2px;">Сформирован: ${date}</div>
        </td>
      </tr>
    </table>
    ${kpiHtml}${metricsHtml}${distHtml}${ownerHtml}${topHtml}${incHtml}${extraHtml}
    <table style="width:${W}px;border-collapse:collapse;border-top:1px solid #e2e8f0;margin-top:20px;">
      <tr>
        <td style="padding-top:10px;font-size:9px;color:#94a3b8;">SecuRisk — Система управления рисками информационной безопасности</td>
        <td style="padding-top:10px;font-size:9px;color:#94a3b8;text-align:right;">Конфиденциально · Не для распространения</td>
      </tr>
    </table>`;
};

/* ═══════════════════════════════════════════════════════════════════
   Main Dashboard component
   ═══════════════════════════════════════════════════════════════════ */
const Dashboard = ({ user }) => {
  const navigate = useNavigate();

  const [stats, setStats]                       = useState(null);
  const [riskAnalytics, setRiskAnalytics]       = useState(null);
  const [recentIncidents, setRecentIncidents]   = useState([]);
  const [vulnStats, setVulnStats]               = useState(null);
  const [assetStats, setAssetStats]             = useState(null);
  const [loading, setLoading]                   = useState(true);
  const [exporting, setExporting]               = useState(false);
  const [showGear, setShowGear]                 = useState(false);

  /* ordered visible sections */
  const [visibleSections, setVisibleSections] = useState(() => {
    try {
      const s = localStorage.getItem('dashboard_sections_v2');
      if (s) {
        const arr = JSON.parse(s);
        // merge: keep saved order, add any new sections at end
        const merged = arr.filter(k => ALL_SECTIONS.includes(k));
        ALL_SECTIONS.forEach(k => { if (!merged.includes(k)) merged.push(k); });
        return merged;
      }
    } catch {}
    return [...DEFAULT_SECTIONS];
  });

  const [period, setPeriod]         = useState('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo]     = useState('');

  const gearRef = useRef(null);

  useEffect(() => {
    const h = e => { if (gearRef.current && !gearRef.current.contains(e.target)) setShowGear(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  /* section ordering helpers */
  const toggleSection = key => {
    setVisibleSections(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      localStorage.setItem('dashboard_sections_v2', JSON.stringify(next));
      return next;
    });
  };
  const moveSection = (key, dir) => {
    setVisibleSections(prev => {
      const arr = [...prev];
      const idx = arr.indexOf(key);
      if (idx < 0) return arr;
      const ni = idx + dir;
      if (ni < 0 || ni >= arr.length) return arr;
      [arr[idx], arr[ni]] = [arr[ni], arr[idx]];
      localStorage.setItem('dashboard_sections_v2', JSON.stringify(arr));
      return arr;
    });
  };

  /* data fetching */
  const fetchStats = useCallback(async (dateFrom, dateTo) => {
    try {
      const params = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo)   params.date_to   = dateTo;
      const r = await axios.get(`${API}/dashboard/stats`, { params });
      setStats(r.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  const fetchRiskAnalytics = useCallback(async (dateFrom, dateTo) => {
    try {
      const params = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo)   params.date_to   = dateTo;
      const r = await axios.get(`${API}/dashboard/risk-analytics`, { params });
      setRiskAnalytics(r.data);
    } catch (e) { console.error(e); }
  }, []);

  /* period-dependent fetch */
  useEffect(() => {
    if (period === 'custom' && !customFrom && !customTo) return;
    const { date_from, date_to } = presetToDates(period, customFrom, customTo);
    setLoading(true);
    fetchStats(date_from, date_to);
    fetchRiskAnalytics(date_from, date_to);
  }, [period, customFrom, customTo, fetchStats, fetchRiskAnalytics]);

  /* one-time fetches for extra sections */
  useEffect(() => {
    axios.get(`${API}/incidents`, { params: { limit: 5, sort_by: 'created_at', sort_order: 'desc' } })
      .then(r => setRecentIncidents(r.data.items || r.data || []))
      .catch(() => {});

    axios.get(`${API}/vulnerabilities`, { params: { limit: 1000 } })
      .then(r => {
        const items = r.data.items || r.data || [];
        const map = {};
        items.forEach(v => { const k = v.severity || v.criticality || 'Не указано'; map[k] = (map[k]||0) + 1; });
        if (Object.keys(map).length > 0) setVulnStats(map);
      }).catch(() => {});

    axios.get(`${API}/assets`, { params: { limit: 1000 } })
      .then(r => {
        const items = r.data.items || r.data || [];
        const map = {};
        items.forEach(a => { const k = a.criticality || a.category || 'Не указано'; map[k] = (map[k]||0) + 1; });
        if (Object.keys(map).length > 0) setAssetStats(map);
      }).catch(() => {});
  }, []);

  /* PDF export */
  const exportPdf = async () => {
    setExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const periodLabel = PERIOD_PRESETS.find(p => p.value === period)?.label ?? 'Всё время';

      const container = document.createElement('div');
      container.style.cssText =
        'position:fixed;top:-99999px;left:-99999px;width:1120px;background:#fff;' +
        'padding:40px;font-family:Arial,Helvetica,sans-serif;color:#0f172a;font-size:13px;line-height:1.5;';
      container.innerHTML = buildPrintHTML(stats, riskAnalytics, recentIncidents, vulnStats, assetStats, periodLabel);
      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        scale: 2, useCORS: true, backgroundColor: '#ffffff',
        width: 1120, windowWidth: 1120,
      });
      document.body.removeChild(container);

      const imgData = canvas.toDataURL('image/png');
      const pdf  = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pdfW = 297; // landscape A4 width
      const pdfH = 210; // landscape A4 height
      const imgH = (canvas.height / canvas.width) * pdfW;
      let pos = 0, left = imgH;
      while (left > 0) {
        if (pos > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -pos, pdfW, imgH);
        pos += pdfH; left -= pdfH;
      }
      pdf.save(`securisk-dashboard-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) { console.error('PDF export failed', e); }
    finally { setExporting(false); }
  };

  /* loading state */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600" />
      </div>
    );
  }

  /* ── helpers ── */
  const critColor  = c => ({ Критический:'bg-red-500', Высокий:'bg-orange-500', Средний:'bg-yellow-500', Низкий:'bg-green-500' }[c] ?? 'bg-slate-400');
  const critBadge  = c => ({ Критический:'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400', Высокий:'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400', Средний:'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400', Низкий:'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' }[c] ?? 'bg-slate-100 text-slate-600');
  const statColor  = s => ({ Открыт:'bg-blue-500', 'В обработке':'bg-amber-500', Принят:'bg-purple-500', Закрыт:'bg-slate-400' }[s] ?? 'bg-slate-400');
  const statBadge  = s => ({ Открыт:'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400', 'В обработке':'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400', Принят:'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400', Закрыт:'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400' }[s] ?? 'bg-slate-100 text-slate-600');
  const maxRiskLevel = 25;

  const statCards = [
    { title:'Всего рисков',      value:stats?.total_risks||0,      sub:`${stats?.critical_risks||0} критических`,    icon:AlertTriangle, gradient:'from-amber-400 to-orange-500', path:'/risks',     tip:'Перейти к реестру рисков' },
    { title:'Критические риски', value:stats?.critical_risks||0,   sub:`${stats?.total_risks>0?Math.round(stats.critical_risks/stats.total_risks*100):0}% от всех`,  icon:TrendingUp,   gradient:'from-red-500 to-red-700',   path:'/risks',     tip:'Показать критические' },
    { title:'Всего инцидентов',  value:stats?.total_incidents||0,  sub:`${stats?.open_incidents||0} открытых`,       icon:AlertCircle,  gradient:'from-blue-500 to-blue-700',  path:'/incidents', tip:'Перейти к журналу' },
    { title:'Открытые инциденты',value:stats?.open_incidents||0,   sub:`${stats?.total_incidents>0?Math.round(stats.open_incidents/stats.total_incidents*100):0}% требуют внимания`, icon:Activity, gradient:'from-violet-500 to-violet-700', path:'/incidents', tip:'Открытые инциденты' },
    { title:'Всего активов',     value:stats?.total_assets||0,     sub:`${stats?.critical_assets||0} критических`,   icon:Server,       gradient:'from-cyan-500 to-cyan-700',  path:'/assets',    tip:'Перейти к активам' },
    { title:'Критические активы',value:stats?.critical_assets||0,  sub:`из ${stats?.total_assets||0} всего`,         icon:Shield,       gradient:'from-teal-500 to-teal-700',  path:'/assets',    tip:'Критические активы' },
  ];

  /* ── section renderers ── */
  const renderSection = key => {
    switch (key) {

      case 'stats': return (
        <div key="stats" className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {statCards.map((s, i) => {
            const Icon = s.icon;
            return (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <div onClick={() => navigate(s.path)}
                    className={`relative overflow-hidden rounded-2xl p-5 cursor-pointer bg-gradient-to-br ${s.gradient} hover:scale-[1.02] hover:shadow-xl transition-all duration-200 select-none`}>
                    <Icon className="absolute -right-3 -top-3 w-20 h-20 text-white/15" />
                    <div className="relative">
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-white/20 rounded-lg"><Icon className="w-5 h-5 text-white" /></div>
                        <ChevronRight className="w-4 h-4 text-white/60" />
                      </div>
                      <div className="text-4xl font-black text-white leading-none mb-1">{s.value}</div>
                      <div className="text-sm font-semibold text-white/90">{s.title}</div>
                      <div className="text-xs text-white/65 mt-0.5">{s.sub}</div>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>{s.tip}</p></TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      );

      case 'incident_metrics':
        if (!(stats?.avg_mtta || stats?.avg_mttr || stats?.avg_mttc)) return null;
        return (
          <div key="incident_metrics" className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              stats?.avg_mtta && { label:'Среднее время обнаружения',  abbr:'MTTA', value:stats.avg_mtta, icon:Clock,        color:'text-blue-600',   iconBg:'bg-blue-100 dark:bg-blue-900/30',   accent:'border-l-blue-500' },
              stats?.avg_mttr && { label:'Среднее время реагирования', abbr:'MTTR', value:stats.avg_mttr, icon:Timer,        color:'text-orange-600', iconBg:'bg-orange-100 dark:bg-orange-900/30',accent:'border-l-orange-500' },
              stats?.avg_mttc && { label:'Среднее время закрытия',     abbr:'MTTC', value:stats.avg_mttc, icon:CheckCircle2, color:'text-green-600',  iconBg:'bg-green-100 dark:bg-green-900/30',  accent:'border-l-green-500' },
            ].filter(Boolean).map(m => {
              const Icon = m.icon;
              return (
                <div key={m.abbr} onClick={() => navigate('/incidents')}
                  className={`group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 border-l-4 ${m.accent} rounded-xl p-5 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-2.5 rounded-xl ${m.iconBg}`}><Icon className={`w-6 h-6 ${m.color}`} /></div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${m.iconBg} ${m.color}`}>{m.abbr}</span>
                  </div>
                  <div className={`text-3xl font-black ${m.color} mb-1`}>{m.value}<span className="text-lg ml-0.5">ч</span></div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">{m.label}</div>
                </div>
              );
            })}
          </div>
        );

      case 'risk_charts':
        if (!riskAnalytics) return null;
        return (
          <Card key="risk_charts" className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
            <CardHeader className="pb-2 pt-5 px-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-slate-500" /> Распределение рисков
                </CardTitle>
                <button onClick={() => navigate('/risks')} className="text-xs text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 font-medium flex items-center gap-1">
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
                  {Object.entries(riskAnalytics.risks_by_criticality || {}).map(([c, v]) => {
                    const tot = Object.values(riskAnalytics.risks_by_criticality).reduce((a,b)=>a+b,0);
                    const pct = tot > 0 ? Math.round(v/tot*100) : 0;
                    return (
                      <div key={c} className="flex items-center gap-3">
                        <div className="w-28 text-sm font-medium text-slate-700 dark:text-slate-300 flex-shrink-0">{c}</div>
                        <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                          <div className={`h-full ${critColor(c)} transition-all duration-700`} style={{ width:`${pct}%` }} />
                        </div>
                        <div className="w-16 text-right text-sm text-slate-500 dark:text-slate-400 flex-shrink-0">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{v}</span> ({pct}%)
                        </div>
                      </div>
                    );
                  })}
                </TabsContent>
                <TabsContent value="status" className="space-y-3 mt-0">
                  {Object.entries(riskAnalytics.risks_by_status || {}).map(([s, v]) => {
                    const tot = Object.values(riskAnalytics.risks_by_status).reduce((a,b)=>a+b,0);
                    const pct = tot > 0 ? Math.round(v/tot*100) : 0;
                    return (
                      <div key={s} className="flex items-center gap-3">
                        <div className="w-28 text-sm font-medium text-slate-700 dark:text-slate-300 flex-shrink-0">{s}</div>
                        <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                          <div className={`h-full ${statColor(s)} transition-all duration-700`} style={{ width:`${pct}%` }} />
                        </div>
                        <div className="w-16 text-right text-sm text-slate-500 dark:text-slate-400 flex-shrink-0">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{v}</span> ({pct}%)
                        </div>
                      </div>
                    );
                  })}
                </TabsContent>
                <TabsContent value="owner" className="mt-0 space-y-2">
                  {Object.entries(riskAnalytics.risks_by_owner || {}).sort((a,b)=>b[1]-a[1]).map(([owner, v], idx) => {
                    const tot = Object.values(riskAnalytics.risks_by_owner).reduce((a,b)=>a+b,0);
                    const pct = tot > 0 ? Math.round(v/tot*100) : 0;
                    return (
                      <div key={owner} className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-600 text-xs font-bold text-slate-600 dark:text-slate-300 flex-shrink-0">{idx+1}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{owner}</span>
                            <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 ml-2 flex-shrink-0">{v} ({pct}%)</span>
                          </div>
                          <div className="bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                            <div className="h-full bg-cyan-500 transition-all duration-700" style={{ width:`${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        );

      case 'top_risks':
        if (!riskAnalytics?.top_risks?.length) return null;
        return (
          <Card key="top_risks" className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
            <CardHeader className="pb-2 pt-5 px-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-200">Топ-10 самых опасных рисков</CardTitle>
                <button onClick={() => navigate('/risks')} className="text-xs text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 font-medium flex items-center gap-1">
                  Все риски <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-5">
              <div className="space-y-1">
                <div className="grid grid-cols-[2rem_1fr_9rem_7rem_6rem] gap-3 px-2 pb-2 border-b border-slate-100 dark:border-slate-700">
                  {['#', 'Риск', 'Уровень', 'Критичность', 'Владелец'].map(h => (
                    <div key={h} className="text-xs text-slate-400 font-medium">{h}</div>
                  ))}
                </div>
                {riskAnalytics.top_risks.map((risk, idx) => (
                  <Tooltip key={risk.risk_number}>
                    <TooltipTrigger asChild>
                      <div onClick={() => navigate(`/risks?risk_id=${risk.id}`)}
                        className="grid grid-cols-[2rem_1fr_9rem_7rem_6rem] gap-3 items-center px-2 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/60 cursor-pointer transition-colors">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-600 text-xs font-bold text-slate-600 dark:text-slate-300">{idx+1}</div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{risk.risk_number}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{risk.scenario}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                            <div className={`h-full transition-all duration-500 ${critColor(risk.criticality)}`} style={{ width:`${Math.min((risk.risk_level/maxRiskLevel)*100,100)}%` }} />
                          </div>
                          <span className="text-sm font-black text-slate-700 dark:text-slate-300 w-5 text-right flex-shrink-0">{risk.risk_level}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${critBadge(risk.criticality)}`}>{risk.criticality}</span>
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
        );

      case 'recent_incidents':
        if (!recentIncidents.length) return null;
        return (
          <Card key="recent_incidents" className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
            <CardHeader className="pb-2 pt-5 px-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-slate-500" /> Последние инциденты
                </CardTitle>
                <button onClick={() => navigate('/incidents')} className="text-xs text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 font-medium flex items-center gap-1">
                  Все инциденты <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-5">
              <div className="space-y-1">
                <div className="grid grid-cols-[1fr_7rem_6rem_6rem_4rem_4rem] gap-3 px-2 pb-2 border-b border-slate-100 dark:border-slate-700">
                  {['Инцидент', 'Статус', 'Приоритет', 'Дата', 'MTTA', 'MTTR'].map(h => (
                    <div key={h} className="text-xs text-slate-400 font-medium">{h}</div>
                  ))}
                </div>
                {recentIncidents.map((inc, idx) => (
                  <div key={inc.id || idx} onClick={() => navigate('/incidents')}
                    className="grid grid-cols-[1fr_7rem_6rem_6rem_4rem_4rem] gap-3 items-center px-2 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/60 cursor-pointer transition-colors">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {inc.title || inc.name || inc.description?.slice(0,50) || `Инцидент ${idx+1}`}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statBadge(inc.status)} truncate`}>{inc.status||'—'}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{inc.priority||inc.criticality||'—'}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{inc.created_at ? new Date(inc.created_at).toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit',year:'2-digit'}) : '—'}</span>
                    <span className="text-xs text-center text-slate-500 dark:text-slate-400">{inc.mtta ? `${inc.mtta}ч` : '—'}</span>
                    <span className="text-xs text-center text-slate-500 dark:text-slate-400">{inc.mttr ? `${inc.mttr}ч` : '—'}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case 'vuln_stats':
        if (!vulnStats) return null;
        return (
          <Card key="vuln_stats" className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
            <CardHeader className="pb-2 pt-5 px-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-slate-500" /> Уязвимости по критичности
                </CardTitle>
                <button onClick={() => navigate('/vulnerabilities')} className="text-xs text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 font-medium flex items-center gap-1">
                  Все уязвимости <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-5 space-y-3">
              {Object.entries(vulnStats).sort((a,b)=>b[1]-a[1]).map(([k, v]) => {
                const tot = Object.values(vulnStats).reduce((a,b)=>a+b,0);
                const pct = tot > 0 ? Math.round(v/tot*100) : 0;
                return (
                  <div key={k} className="flex items-center gap-3">
                    <div className="w-28 text-sm font-medium text-slate-700 dark:text-slate-300 flex-shrink-0 truncate">{k}</div>
                    <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                      <div className={`h-full ${critColor(k)} transition-all duration-700`} style={{ width:`${pct}%` }} />
                    </div>
                    <div className="w-16 text-right text-sm text-slate-500 dark:text-slate-400 flex-shrink-0">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{v}</span> ({pct}%)
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );

      case 'asset_stats':
        if (!assetStats) return null;
        return (
          <Card key="asset_stats" className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
            <CardHeader className="pb-2 pt-5 px-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Server className="w-5 h-5 text-slate-500" /> Активы по критичности
                </CardTitle>
                <button onClick={() => navigate('/assets')} className="text-xs text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 font-medium flex items-center gap-1">
                  Все активы <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-5 space-y-3">
              {Object.entries(assetStats).sort((a,b)=>b[1]-a[1]).map(([k, v]) => {
                const tot = Object.values(assetStats).reduce((a,b)=>a+b,0);
                const pct = tot > 0 ? Math.round(v/tot*100) : 0;
                return (
                  <div key={k} className="flex items-center gap-3">
                    <div className="w-28 text-sm font-medium text-slate-700 dark:text-slate-300 flex-shrink-0 truncate">{k}</div>
                    <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                      <div className={`h-full ${critColor(k)} transition-all duration-700`} style={{ width:`${pct}%` }} />
                    </div>
                    <div className="w-16 text-right text-sm text-slate-500 dark:text-slate-400 flex-shrink-0">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{v}</span> ({pct}%)
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );

      default: return null;
    }
  };

  const hiddenSections = ALL_SECTIONS.filter(k => !visibleSections.includes(k));

  return (
    <TooltipProvider>
      <div className="space-y-5 animate-fade-in">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Дашборд</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Обзор состояния информационной безопасности</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PeriodSelector period={period} setPeriod={setPeriod} customFrom={customFrom} setCustomFrom={setCustomFrom} customTo={customTo} setCustomTo={setCustomTo} />
            <Button variant="outline" size="sm" onClick={exportPdf} disabled={exporting} className="gap-1.5 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              <Download className="w-4 h-4" />
              {exporting ? 'Генерация…' : 'PDF'}
            </Button>
            {/* Gear widget picker */}
            <div className="relative" ref={gearRef}>
              <button onClick={() => setShowGear(v => !v)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors border border-slate-200 dark:border-slate-700 text-sm font-medium">
                <Settings2 className="w-4 h-4" />
                <span className="hidden sm:inline">Разделы</span>
              </button>
              {showGear && (
                <div className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl w-64 p-2">
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 px-2 py-1.5 uppercase tracking-wider">Отображаемые разделы</p>
                  {visibleSections.map((key, idx) => {
                    const Meta = SECTION_META[key];
                    if (!Meta) return null;
                    const Icon = Meta.icon;
                    return (
                      <div key={key} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        <input type="checkbox" checked onChange={() => toggleSection(key)} className="w-4 h-4 accent-cyan-500 cursor-pointer flex-shrink-0" />
                        <Icon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="flex-1 text-sm text-slate-700 dark:text-slate-300 truncate">{Meta.label}</span>
                        <div className="flex gap-0.5 flex-shrink-0">
                          <button onClick={() => moveSection(key, -1)} disabled={idx === 0}
                            className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-700 disabled:opacity-25 rounded hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => moveSection(key, 1)} disabled={idx === visibleSections.length - 1}
                            className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-700 disabled:opacity-25 rounded hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {hiddenSections.length > 0 && (
                    <>
                      <div className="border-t border-slate-200 dark:border-slate-700 my-1.5" />
                      <p className="text-xs text-slate-400 dark:text-slate-500 px-2 pb-1">Скрытые:</p>
                      {hiddenSections.map(key => {
                        const Meta = SECTION_META[key];
                        if (!Meta) return null;
                        const Icon = Meta.icon;
                        return (
                          <div key={key} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors opacity-60">
                            <input type="checkbox" checked={false} onChange={() => toggleSection(key)} className="w-4 h-4 accent-cyan-500 cursor-pointer flex-shrink-0" />
                            <Icon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="flex-1 text-sm text-slate-500 dark:text-slate-400 truncate">{Meta.label}</span>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sections rendered in user-defined order */}
        <div className="space-y-5">
          {visibleSections.map(key => renderSection(key))}
        </div>

      </div>
    </TooltipProvider>
  );
};

export default Dashboard;
