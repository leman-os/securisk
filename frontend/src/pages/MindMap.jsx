import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { API } from '../App';
import * as d3 from 'd3';
import { Network, Search, X, ZoomIn, ZoomOut, Maximize2, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

/* ── constants ── */
const LEVEL_COLOR = {
  'Критический': '#ef4444',
  'Высокий':     '#f97316',
  'Средний':     '#eab308',
  'Низкий':      '#22c55e',
};

const CAT_CFG = [
  { key: 'assets',          label: 'Активы',     color: '#0891b2', bg: '#e0f2fe' },
  { key: 'threats',         label: 'Угрозы',     color: '#7c3aed', bg: '#ede9fe' },
  { key: 'vulnerabilities', label: 'Уязвимости', color: '#d97706', bg: '#fef3c7' },
];

const CAT_R = 180;   // center → category
const LEAF_R = 350;  // center → leaf
const DUR = 450;     // animation duration ms

/* ── pure helpers (outside component — no stale closure risk) ── */
const wrapLabel = (text, maxLen = 14) => {
  if (!text) return ['—'];
  const s = String(text).trim();
  if (s.length <= maxLen) return [s];
  const words = s.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const word = w.length > maxLen ? w.slice(0, maxLen - 1) + '…' : w;
    const attempt = cur ? `${cur} ${word}` : word;
    if (attempt.length <= maxLen) { cur = attempt; }
    else { if (cur) lines.push(cur); cur = word; if (lines.length >= 2) break; }
  }
  if (cur && lines.length < 3) lines.push(cur);
  return lines.slice(0, 3);
};

/* Quadratic bezier pulled 15% toward origin for an organic curve */
const qPath = (x1, y1, x2, y2) => {
  const mx = (x1 + x2) / 2 * 0.85;
  const my = (y1 + y2) / 2 * 0.85;
  return `M${x1},${y1} Q${mx},${my} ${x2},${y2}`;
};

/* Compute radial positions for categories and visible leaves */
const computePositions = (catItems, collapsed) => {
  const cats = catItems.map((cat, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI / 3) * i;
    return {
      key: cat.key, label: cat.label, color: cat.color, bg: cat.bg,
      items: cat.items, count: cat.items.length,
      angle, x: CAT_R * Math.cos(angle), y: CAT_R * Math.sin(angle),
      collapsed: !!collapsed[cat.key],
    };
  });

  const leaves = [];
  cats.forEach(cat => {
    if (cat.collapsed || cat.items.length === 0) return;
    const n = cat.items.length;
    const maxHalf = (65 * Math.PI) / 180;
    const minGap  = (22 * Math.PI) / 180;
    const half = n === 1 ? 0 : Math.min(maxHalf, ((n - 1) * minGap) / 2);
    cat.items.forEach((item, ii) => {
      const a = n === 1 ? cat.angle : cat.angle - half + (2 * half / (n - 1)) * ii;
      leaves.push({
        id: `leaf-${cat.key}-${item.id}`,
        catKey: cat.key, color: cat.color, bg: cat.bg,
        angle: a, x: LEAF_R * Math.cos(a), y: LEAF_R * Math.sin(a),
        catX: cat.x, catY: cat.y, item,
      });
    });
  });
  return { cats, leaves };
};

/* ── component ── */
const MindMap = ({ user }) => {
  const [risks, setRisks]               = useState([]);
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [mapData, setMapData]           = useState(null);
  const [detail, setDetail]             = useState(null);
  const [search, setSearch]             = useState('');
  const [loading, setLoading]           = useState(false);

  const svgRef   = useRef(null);
  const zoomRef  = useRef(null);
  const linkGRef = useRef(null);
  const nodeGRef = useRef(null);
  /* mutable state read by D3 callbacks — no stale closures */
  const stateRef = useRef({ catItems: [], collapsed: {} });

  /* fetch risk list */
  useEffect(() => {
    axios.get(`${API}/risks`, { params: { limit: 1000 } })
      .then(r => setRisks(r.data.items || []))
      .catch(() => {});
  }, []);

  /* fetch related entities when risk selected */
  const loadMapData = useCallback(async (risk) => {
    setLoading(true);
    setDetail(null);
    stateRef.current.collapsed = {};
    try {
      const params = { limit: 1000 };
      const [ar, tr, vr] = await Promise.all([
        axios.get(`${API}/assets`,          { params }),
        axios.get(`${API}/threats`,         { params }),
        axios.get(`${API}/vulnerabilities`, { params }),
      ]);
      const am = Object.fromEntries((ar.data.items || ar.data).map(a => [a.id, a]));
      const tm = Object.fromEntries((tr.data.items || tr.data).map(t => [t.id, t]));
      const vm = Object.fromEntries((vr.data.items || vr.data).map(v => [v.id, v]));
      setMapData({
        risk,
        assets:          (risk.related_assets          || []).map(id => am[id]).filter(Boolean),
        threats:         (risk.related_threats          || []).map(id => tm[id]).filter(Boolean),
        vulnerabilities: (risk.related_vulnerabilities  || []).map(id => vm[id]).filter(Boolean),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedRisk) loadMapData(selectedRisk);
    else { setMapData(null); setDetail(null); }
  }, [selectedRisk, loadMapData]);

  /* ── D3 update — reads only from refs, fully stable ── */
  const update = useCallback((animated = true) => {
    const { catItems, collapsed } = stateRef.current;
    const linkG = linkGRef.current;
    const nodeG = nodeGRef.current;
    if (!linkG || !nodeG) return;

    const dur = animated ? DUR : 0;
    const { cats, leaves } = computePositions(catItems, collapsed);

    /* links */
    const linkData = [
      ...cats.map(c => ({
        id: `lkc-${c.key}`, x1: 0, y1: 0, x2: c.x, y2: c.y,
        color: c.color, w: 2.5, op: 0.6, cx: c.x, cy: c.y,
      })),
      ...leaves.map(lf => {
        const c = cats.find(c => c.key === lf.catKey);
        return {
          id: `lkl-${lf.id}`, x1: c ? c.x : 0, y1: c ? c.y : 0, x2: lf.x, y2: lf.y,
          color: lf.color, w: 1.5, op: 0.4, cx: c ? c.x : 0, cy: c ? c.y : 0,
        };
      }),
    ];

    const linkSel = linkG.selectAll('path.mm-link').data(linkData, d => d.id);
    linkSel.exit().transition().duration(dur).attr('stroke-opacity', 0).remove();
    const lkEnter = linkSel.enter().append('path').attr('class', 'mm-link')
      .attr('fill', 'none').attr('stroke', d => d.color)
      .attr('stroke-width', d => d.w).attr('stroke-linecap', 'round')
      .attr('stroke-opacity', 0)
      .attr('d', d => qPath(d.x1, d.y1, d.cx, d.cy));
    linkSel.merge(lkEnter).transition().duration(dur)
      .attr('stroke-opacity', d => d.op)
      .attr('d', d => qPath(d.x1, d.y1, d.x2, d.y2));

    /* category nodes */
    const catSel = nodeG.selectAll('g.mm-cat').data(cats, d => d.key);
    catSel.exit().transition().duration(dur).attr('opacity', 0).remove();

    const catEnter = catSel.enter().append('g').attr('class', 'mm-cat')
      .attr('cursor', 'pointer').attr('opacity', 0)
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .on('click', (ev, d) => {
        stateRef.current.collapsed[d.key] = !stateRef.current.collapsed[d.key];
        update(true);
        ev.stopPropagation();
      })
      .on('mouseenter', function () {
        d3.select(this).select('.cat-pill').attr('stroke-width', 3).attr('filter', 'url(#mm-glow)');
      })
      .on('mouseleave', function () {
        d3.select(this).select('.cat-pill').attr('stroke-width', 2).attr('filter', null);
      });

    catEnter.append('rect').attr('class', 'cat-pill').attr('rx', 20).attr('height', 40)
      .attr('fill', d => d.bg).attr('stroke', d => d.color).attr('stroke-width', 2);
    catEnter.append('text').attr('class', 'cat-label')
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
      .attr('fill', d => d.color).attr('font-size', '12px').attr('font-weight', '700');
    const badge = catEnter.append('g').attr('class', 'cat-badge');
    badge.append('circle').attr('r', 12).attr('fill', d => d.color);
    badge.append('text').attr('class', 'badge-num')
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
      .attr('fill', '#fff').attr('font-size', '10px').attr('font-weight', '700');
    catEnter.append('text').attr('class', 'cat-hint')
      .attr('text-anchor', 'middle').attr('y', 32)
      .attr('fill', d => d.color).attr('font-size', '8px').attr('opacity', 0.55);

    const catAll = catSel.merge(catEnter);
    catAll.transition().duration(dur).attr('opacity', 1)
      .attr('transform', d => `translate(${d.x},${d.y})`);
    catAll.each(function (d) {
      const g = d3.select(this);
      const pillW = Math.max(104, d.label.length * 8 + 32);
      g.select('.cat-pill').attr('x', -pillW / 2).attr('y', -20).attr('width', pillW);
      g.select('.cat-label').attr('y', 0).text(d.label);
      g.select('.cat-badge').attr('transform', `translate(${pillW / 2 + 2},-20)`)
        .style('display', d.count > 0 ? null : 'none');
      g.select('.badge-num').text(d.collapsed ? `+${d.count}` : d.count);
      g.select('.cat-hint').text(d.collapsed ? '▼  развернуть' : '▲  свернуть');
    });

    /* leaf nodes */
    const leafSel = nodeG.selectAll('g.mm-leaf').data(leaves, d => d.id);
    leafSel.exit().transition().duration(dur)
      .attr('opacity', 0).attr('transform', d => `translate(${d.catX},${d.catY})`).remove();

    const lfEnter = leafSel.enter().append('g').attr('class', 'mm-leaf')
      .attr('cursor', 'pointer').attr('opacity', 0)
      .attr('transform', d => `translate(${d.catX},${d.catY})`)
      .on('click', (ev, d) => {
        setDetail({ item: d.item, catKey: d.catKey, color: d.color });
        ev.stopPropagation();
      })
      .on('mouseenter', function () {
        d3.select(this).select('.lf-circle').attr('r', 30).attr('stroke-width', 2.5).attr('filter', 'url(#mm-glow)');
        d3.select(this).selectAll('.lf-lbl').attr('font-weight', '600');
      })
      .on('mouseleave', function () {
        d3.select(this).select('.lf-circle').attr('r', 26).attr('stroke-width', 1.5).attr('filter', null);
        d3.select(this).selectAll('.lf-lbl').attr('font-weight', '400');
      });

    lfEnter.append('circle').attr('class', 'lf-circle')
      .attr('r', 26).attr('fill', d => d.bg).attr('stroke', d => d.color).attr('stroke-width', 1.5);
    lfEnter.each(function (d) {
      const g = d3.select(this);
      const right = Math.cos(d.angle) >= -0.1;
      const lx = right ? 32 : -32;
      const anchor = right ? 'start' : 'end';
      const lines = wrapLabel(d.item.name || d.item.title || d.item.description || '?');
      lines.forEach((line, i) => {
        g.append('text').attr('class', 'lf-lbl')
          .attr('x', lx).attr('y', (i - (lines.length - 1) / 2) * 13)
          .attr('text-anchor', anchor).attr('dominant-baseline', 'middle')
          .attr('fill', '#374151').attr('font-size', '10px').attr('pointer-events', 'none')
          .text(line);
      });
    });

    leafSel.merge(lfEnter).transition().duration(dur)
      .attr('opacity', 1).attr('transform', d => `translate(${d.x},${d.y})`);
  }, []); // stable — reads only refs

  /* init canvas when mapData changes */
  useEffect(() => {
    if (!mapData || !svgRef.current) return;
    const { risk, assets, threats, vulnerabilities } = mapData;
    const svgEl = svgRef.current;
    const W = svgEl.clientWidth || 860;
    const H = svgEl.clientHeight || 560;

    d3.select(svgEl).selectAll('*').remove();
    const svg = d3.select(svgEl);

    /* glow filter */
    const defs = svg.append('defs');
    const flt = defs.append('filter').attr('id', 'mm-glow')
      .attr('x', '-60%').attr('y', '-60%').attr('width', '220%').attr('height', '220%');
    flt.append('feGaussianBlur').attr('in', 'SourceAlpha').attr('stdDeviation', 5).attr('result', 'blur');
    const mg = flt.append('feMerge');
    mg.append('feMergeNode').attr('in', 'blur');
    mg.append('feMergeNode').attr('in', 'SourceGraphic');

    const g = svg.append('g');
    linkGRef.current = g.append('g').attr('class', 'mm-links');
    nodeGRef.current = g.append('g').attr('class', 'mm-nodes');

    /* zoom */
    const zoom = d3.zoom().scaleExtent([0.2, 4])
      .on('zoom', ev => g.attr('transform', ev.transform.toString()));
    zoomRef.current = zoom;
    svg.call(zoom);
    svg.call(zoom.transform, d3.zoomIdentity.translate(W / 2, H / 2));
    svg.on('click', () => setDetail(null));

    /* center risk node */
    const rc = LEVEL_COLOR[risk.level] || '#64748b';
    const center = nodeGRef.current.append('g').attr('class', 'node-risk').attr('cursor', 'default');
    center.append('circle').attr('r', 68)
      .attr('fill', rc).attr('fill-opacity', 0.05)
      .attr('stroke', rc).attr('stroke-width', 1).attr('stroke-dasharray', '6,4').attr('stroke-opacity', 0.35);
    center.append('circle').attr('r', 58)
      .attr('fill', rc).attr('fill-opacity', 0.1)
      .attr('stroke', rc).attr('stroke-width', 2.5).attr('filter', 'url(#mm-glow)');
    const rlines = wrapLabel(risk.name || risk.risk_number || 'Риск', 18);
    const yOff = risk.level ? -8 : 0;
    rlines.forEach((line, i) => {
      center.append('text')
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
        .attr('y', (i - (rlines.length - 1) / 2) * 14 + yOff)
        .attr('fill', rc).attr('font-size', '11px').attr('font-weight', '700').text(line);
    });
    if (risk.level) {
      center.append('text').attr('text-anchor', 'middle')
        .attr('y', rlines.length * 7 + yOff + 10)
        .attr('fill', rc).attr('fill-opacity', 0.75).attr('font-size', '9px').text(risk.level);
    }

    stateRef.current = {
      catItems: CAT_CFG.map(c => ({
        ...c,
        items: c.key === 'assets' ? assets : c.key === 'threats' ? threats : vulnerabilities,
      })),
      collapsed: {},
    };
    update(false);
  }, [mapData, update]); // eslint-disable-line

  /* zoom controls */
  const zoomIn  = () => svgRef.current && d3.select(svgRef.current).transition().call(zoomRef.current.scaleBy, 1.4);
  const zoomOut = () => svgRef.current && d3.select(svgRef.current).transition().call(zoomRef.current.scaleBy, 0.7);
  const fit = () => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().call(
      zoomRef.current.transform,
      d3.zoomIdentity.translate(svgRef.current.clientWidth / 2, svgRef.current.clientHeight / 2)
    );
  };

  const filteredRisks = risks.filter(r =>
    !search ||
    (r.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.risk_number || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.scenario || '').toLowerCase().includes(search.toLowerCase())
  );

  const DETAIL_TITLE  = { assets: 'Актив', threats: 'Угроза', vulnerabilities: 'Уязвимость' };
  const DETAIL_FIELDS = {
    assets:          [{ k: 'type', l: 'Тип' }, { k: 'category', l: 'Категория' }, { k: 'criticality', l: 'Критичность' }, { k: 'owner', l: 'Владелец' }, { k: 'status', l: 'Статус' }, { k: 'description', l: 'Описание' }],
    threats:         [{ k: 'source', l: 'Источник' }, { k: 'category', l: 'Категория' }, { k: 'severity', l: 'Серьёзность' }, { k: 'mitre_attack_id', l: 'MITRE ATT&CK' }, { k: 'description', l: 'Описание' }],
    vulnerabilities: [{ k: 'type', l: 'Тип' }, { k: 'severity', l: 'Критичность' }, { k: 'cvss', l: 'CVSS' }, { k: 'status', l: 'Статус' }, { k: 'description', l: 'Описание' }],
  };

  return (
    <div className="flex gap-4" style={{ height: 'calc(100vh - 3rem)' }}>

      {/* ── Left: risk list ── */}
      <aside className="w-72 flex-shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col min-h-0 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <Network className="w-5 h-5 text-cyan-600" />
            <h2 className="text-base font-semibold dark:text-white">Ментальная карта</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
            <Input placeholder="Поиск рисков…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredRisks.length === 0 && (
            <p className="text-center text-sm text-slate-400 py-6">Риски не найдены</p>
          )}
          {filteredRisks.map(r => {
            const isActive = selectedRisk?.id === r.id;
            const lc = LEVEL_COLOR[r.level] || '#64748b';
            return (
              <button key={r.id} onClick={() => setSelectedRisk(isActive ? null : r)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all text-sm border ${isActive ? 'bg-cyan-50 dark:bg-cyan-900/30 border-cyan-300 dark:border-cyan-700' : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-transparent'}`}>
                <div className="flex items-start justify-between gap-2">
                  <span className={`font-medium truncate ${isActive ? 'text-cyan-700 dark:text-cyan-300' : 'text-slate-800 dark:text-slate-200'}`}>
                    {r.name || r.risk_number || `Риск ${r.id.slice(-4)}`}
                  </span>
                  {r.level && (
                    <span className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded font-semibold" style={{ background: `${lc}22`, color: lc }}>{r.level}</span>
                  )}
                </div>
                {r.scenario && <p className="text-xs text-slate-400 mt-0.5 truncate">{r.scenario}</p>}
              </button>
            );
          })}
        </div>
        {selectedRisk && (
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex-shrink-0">
            <div className="text-xs text-slate-500 mb-1">Выбран риск:</div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{selectedRisk.name || selectedRisk.risk_number}</span>
              <button onClick={() => setSelectedRisk(null)} className="text-slate-400 hover:text-slate-600 flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        )}
      </aside>

      {/* ── Right: canvas ── */}
      <div className="flex-1 min-w-0 min-h-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col overflow-hidden">

        {/* toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <div className="text-sm text-slate-500 dark:text-slate-400 truncate min-w-0">
            {mapData ? (
              <span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{mapData.risk.name || mapData.risk.risk_number}</span>
                {' — '}
                <span className="text-cyan-600">{mapData.assets.length}</span> активов ·{' '}
                <span className="text-violet-600">{mapData.threats.length}</span> угроз ·{' '}
                <span className="text-amber-600">{mapData.vulnerabilities.length}</span> уязвимостей
                <span className="ml-3 text-xs opacity-40 hidden xl:inline">
                  Клик на категории — свернуть/развернуть · Клик на узле — детали
                </span>
              </span>
            ) : 'Выберите риск из списка слева'}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            <Button variant="ghost" size="sm" onClick={zoomIn}  title="Приблизить"><ZoomIn  className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" onClick={zoomOut} title="Отдалить">  <ZoomOut className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" onClick={fit}     title="По размеру"><Maximize2 className="w-4 h-4" /></Button>
            {selectedRisk && (
              <Button variant="ghost" size="sm" onClick={() => loadMapData(selectedRisk)} title="Обновить"><RefreshCw className="w-4 h-4" /></Button>
            )}
          </div>
        </div>

        {/* canvas */}
        <div className="flex-1 relative overflow-hidden min-h-0">
          {!selectedRisk && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none select-none">
              <Network className="w-20 h-20 text-slate-200 dark:text-slate-700" />
              <p className="text-sm font-medium text-slate-400 dark:text-slate-600">Выберите риск из списка слева</p>
              <p className="text-xs text-slate-300 dark:text-slate-700">Карта покажет связанные активы, угрозы и уязвимости</p>
            </div>
          )}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-slate-900/70 z-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-600" />
            </div>
          )}
          <svg ref={svgRef} className="w-full h-full" style={{ cursor: 'grab' }} />

          {/* Detail panel — slides in from right */}
          {detail && (
            <div
              className="absolute top-3 right-3 bottom-3 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden z-20"
              onClick={ev => ev.stopPropagation()}
            >
              <div className="p-4 flex-shrink-0 border-b border-slate-100 dark:border-slate-700"
                style={{ borderTopWidth: 3, borderTopColor: detail.color }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: detail.color }}>
                      {DETAIL_TITLE[detail.catKey] || detail.catKey}
                    </div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight break-words">
                      {detail.item.name || detail.item.title || detail.item.description || '—'}
                    </div>
                  </div>
                  <button onClick={() => setDetail(null)} className="text-slate-400 hover:text-slate-600 flex-shrink-0 mt-0.5">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {(DETAIL_FIELDS[detail.catKey] || []).map(f => {
                  const val = detail.item[f.k];
                  if (!val) return null;
                  return (
                    <div key={f.k}>
                      <div className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold mb-0.5">{f.l}</div>
                      <div className="text-sm text-slate-700 dark:text-slate-300 break-words">{String(val)}</div>
                    </div>
                  );
                })}
                {(DETAIL_FIELDS[detail.catKey] || []).every(f => !detail.item[f.k]) && (
                  <p className="text-sm text-slate-400 italic">Нет дополнительных данных</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* legend */}
        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 flex items-center gap-5 flex-wrap flex-shrink-0">
          {CAT_CFG.map(c => (
            <div key={c.key} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded flex-shrink-0" style={{ background: c.color }} />
              <span className="text-xs text-slate-500 dark:text-slate-400">{c.label}</span>
            </div>
          ))}
          <span className="text-xs text-slate-300 dark:text-slate-700 ml-auto hidden lg:block">
            Колесо — масштаб · Перетаскивание — панорама · Клик на категории — свернуть/развернуть · Клик на узле — детали
          </span>
        </div>
      </div>
    </div>
  );
};

export default MindMap;
