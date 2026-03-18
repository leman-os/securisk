import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { API } from '../App';
import * as d3 from 'd3';
import {
  Network, Search, X, ZoomIn, ZoomOut, Maximize2, RefreshCw, Info,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/* ── constants ───────────────────────────────────────────────────── */
const LEVEL_COLOR = {
  'Критический': '#ef4444',
  'Высокий':     '#f97316',
  'Средний':     '#eab308',
  'Низкий':      '#22c55e',
};

const CAT_CFG = [
  { key: 'assets',          label: 'Активы',        color: '#0891b2', icon: '🖥',  type: 'asset',         angle: -Math.PI / 2 },
  { key: 'threats',         label: 'Угрозы',        color: '#7c3aed', icon: '⚡',  type: 'threat',        angle: -Math.PI / 2 + (2 * Math.PI / 3) },
  { key: 'vulnerabilities', label: 'Уязвимости',    color: '#d97706', icon: '🔓',  type: 'vulnerability', angle: -Math.PI / 2 + (4 * Math.PI / 3) },
];

const CAT_R  = 190;   // center → category
const LEAF_R = 140;   // category → leaf
const SPREAD = 0.75 * Math.PI; // max fan angle per category (radians)

/* ── helpers ─────────────────────────────────────────────────────── */
const truncate = (s, n = 18) => (!s ? '' : s.length <= n ? s : s.slice(0, n - 1) + '…');

const wrapText = (sel, maxWidth) => {
  sel.each(function () {
    const text  = d3.select(this);
    const words = (text.text() || '').split(/\s+/).reverse();
    let word, line = [], lineNumber = 0;
    const lineHeight = 1.2;
    const y = text.attr('y') || 0;
    const dy = parseFloat(text.attr('dy')) || 0;
    let tspan = text.text(null).append('tspan').attr('x', 0).attr('y', y).attr('dy', `${dy}em`);
    while ((word = words.pop())) {
      line.push(word);
      tspan.text(line.join(' '));
      if (tspan.node().getComputedTextLength() > maxWidth) {
        line.pop();
        tspan.text(line.join(' '));
        line = [word];
        tspan = text.append('tspan').attr('x', 0).attr('y', y)
          .attr('dy', `${++lineNumber * lineHeight + dy}em`).text(word);
      }
    }
  });
};

/* ── main component ──────────────────────────────────────────────── */
const MindMap = ({ user }) => {
  const [risks, setRisks]               = useState([]);
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [mapData, setMapData]           = useState(null);
  const [search, setSearch]             = useState('');
  const [loading, setLoading]           = useState(false);
  const [tooltip, setTooltip]           = useState(null); // { label, details, x, y }
  const svgRef  = useRef(null);
  const zoomRef = useRef(null);

  /* fetch risk list */
  useEffect(() => {
    axios.get(`${API}/risks`).then(r => setRisks(r.data)).catch(() => {});
  }, []);

  /* fetch related entities for selected risk */
  const loadMapData = useCallback(async (risk) => {
    setLoading(true);
    setTooltip(null);
    try {
      const [ar, tr, vr] = await Promise.all([
        axios.get(`${API}/assets`),
        axios.get(`${API}/threats`),
        axios.get(`${API}/vulnerabilities`),
      ]);
      const assetMap  = Object.fromEntries(ar.data.map(a => [a.id, a]));
      const threatMap = Object.fromEntries(tr.data.map(t => [t.id, t]));
      const vulnMap   = Object.fromEntries(vr.data.map(v => [v.id, v]));

      setMapData({
        risk,
        assets:          (risk.related_assets          || []).map(id => assetMap[id]).filter(Boolean),
        threats:         (risk.related_threats          || []).map(id => threatMap[id]).filter(Boolean),
        vulnerabilities: (risk.related_vulnerabilities  || []).map(id => vulnMap[id]).filter(Boolean),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedRisk) loadMapData(selectedRisk);
    else setMapData(null);
  }, [selectedRisk, loadMapData]);

  /* render D3 mind map */
  useEffect(() => {
    if (!mapData || !svgRef.current) return;
    renderMap(mapData);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapData]);

  const renderMap = ({ risk, assets, threats, vulnerabilities }) => {
    const svgEl  = svgRef.current;
    const W      = svgEl.clientWidth  || 860;
    const H      = svgEl.clientHeight || 560;
    const svg    = d3.select(svgEl);
    svg.selectAll('*').remove();

    /* defs */
    const defs = svg.append('defs');
    const filter = defs.append('filter').attr('id', 'mm-glow');
    filter.append('feGaussianBlur').attr('stdDeviation', 3).attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    /* root group */
    const g = svg.append('g').attr('transform', `translate(${W / 2},${H / 2})`);

    /* zoom */
    const zoom = d3.zoom()
      .scaleExtent([0.25, 4])
      .on('zoom', ev => {
        g.attr('transform',
          `translate(${W / 2 + ev.transform.x},${H / 2 + ev.transform.y}) scale(${ev.transform.k})`);
      });
    zoomRef.current = zoom;
    svg.call(zoom).on('dblclick.zoom', null);

    /* ── build node/link data ── */
    const catData = [
      { ...CAT_CFG[0], items: assets },
      { ...CAT_CFG[1], items: threats },
      { ...CAT_CFG[2], items: vulnerabilities },
    ];

    const allNodes = [];
    const allLinks = [];

    // risk center
    const riskNode = {
      id: 'risk', type: 'risk', x: 0, y: 0,
      label: risk.name || risk.scenario,
      sub: `${risk.level || '—'} | ${risk.owner || ''}`,
      color: LEVEL_COLOR[risk.level] || '#64748b',
      risk,
    };
    allNodes.push(riskNode);

    // categories + leaves
    catData.forEach(cat => {
      const cx = CAT_R * Math.cos(cat.angle);
      const cy = CAT_R * Math.sin(cat.angle);
      const catNode = {
        id: cat.key, type: 'category',
        x: cx, y: cy,
        label: cat.label,
        count: cat.items.length,
        color: cat.color,
        icon: cat.icon,
      };
      allNodes.push(catNode);
      allLinks.push({ s: 'risk', t: cat.key, thick: true, color: cat.color });

      const n   = cat.items.length;
      const fan = n <= 1 ? 0 : Math.min(SPREAD, (n - 1) * 0.5);

      cat.items.forEach((item, i) => {
        const leafAngle = n <= 1 ? cat.angle : cat.angle - fan / 2 + (fan / (n - 1)) * i;
        const lx = cx + LEAF_R * Math.cos(leafAngle);
        const ly = cy + LEAF_R * Math.sin(leafAngle);
        const leafId = `${cat.type}-${item.id}`;
        allNodes.push({
          id: leafId, type: cat.type,
          x: lx, y: ly,
          label: item.name || item.title || item.description || '—',
          color: cat.color,
          item,
        });
        allLinks.push({ s: cat.key, t: leafId, thick: false, color: cat.color });
      });
    });

    const nodeById = Object.fromEntries(allNodes.map(n => [n.id, n]));

    /* ── links ── */
    const linkG = g.append('g').attr('class', 'mm-links');
    allLinks.forEach(lk => {
      const src = nodeById[lk.s];
      const tgt = nodeById[lk.t];
      if (!src || !tgt) return;
      const mx = (src.x + tgt.x) / 2;
      const my = (src.y + tgt.y) / 2 - (lk.thick ? 18 : 8);
      linkG.append('path')
        .attr('d', `M${src.x},${src.y} Q${mx},${my} ${tgt.x},${tgt.y}`)
        .attr('fill', 'none')
        .attr('stroke', lk.color)
        .attr('stroke-width', lk.thick ? 2.5 : 1.5)
        .attr('stroke-opacity', lk.thick ? 0.7 : 0.5);
    });

    /* ── nodes ── */
    const nodeG = g.append('g').attr('class', 'mm-nodes');

    allNodes.forEach(nd => {
      const ng = nodeG.append('g')
        .attr('transform', `translate(${nd.x},${nd.y})`)
        .attr('cursor', 'pointer')
        .on('mouseenter', (ev) => {
          let details = [];
          if (nd.type === 'risk') {
            details = [
              `Уровень: ${nd.risk.level || '—'}`,
              `Вероятность: ${nd.risk.probability || '—'}`,
              `Воздействие: ${nd.risk.impact || '—'}`,
              `Владелец: ${nd.risk.owner || '—'}`,
            ];
          } else if (nd.type === 'category') {
            details = [`Связано: ${nd.count} элем.`];
          } else if (nd.item) {
            const item = nd.item;
            details = [
              item.type        ? `Тип: ${item.type}`               : null,
              item.category    ? `Категория: ${item.category}`      : null,
              item.severity    ? `Критичность: ${item.severity}`    : null,
              item.cvss        ? `CVSS: ${item.cvss}`               : null,
              item.status      ? `Статус: ${item.status}`           : null,
              item.description ? `${item.description.slice(0, 80)}${item.description.length > 80 ? '…' : ''}` : null,
            ].filter(Boolean);
          }
          const rect = svgEl.getBoundingClientRect();
          setTooltip({ label: nd.label, details, x: ev.clientX - rect.left, y: ev.clientY - rect.top });
        })
        .on('mouseleave', () => setTooltip(null));

      if (nd.type === 'risk') {
        /* large ellipse */
        ng.append('ellipse')
          .attr('rx', 64).attr('ry', 38)
          .attr('fill', nd.color)
          .attr('fill-opacity', 0.18)
          .attr('stroke', nd.color)
          .attr('stroke-width', 2.5)
          .attr('filter', 'url(#mm-glow)');
        const lines = truncate(nd.label, 22).match(/.{1,20}(\s|$)/g) || [nd.label];
        lines.slice(0, 2).forEach((line, i) => {
          ng.append('text')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('y', lines.length === 1 ? 0 : (i - 0.5) * 14)
            .attr('fill', nd.color)
            .attr('font-size', '11px')
            .attr('font-weight', '700')
            .text(line.trim());
        });
        ng.append('text')
          .attr('text-anchor', 'middle')
          .attr('y', 30)
          .attr('fill', nd.color)
          .attr('fill-opacity', 0.8)
          .attr('font-size', '9px')
          .text(nd.sub);

      } else if (nd.type === 'category') {
        /* rounded rect */
        ng.append('rect')
          .attr('x', -42).attr('y', -18)
          .attr('width', 84).attr('height', 36)
          .attr('rx', 18)
          .attr('fill', nd.color)
          .attr('fill-opacity', 0.15)
          .attr('stroke', nd.color)
          .attr('stroke-width', 2);
        ng.append('text')
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('fill', nd.color)
          .attr('font-size', '11px')
          .attr('font-weight', '700')
          .text(`${nd.icon} ${nd.label}`);
        if (nd.count > 0) {
          ng.append('circle')
            .attr('cx', 38).attr('cy', -16)
            .attr('r', 10)
            .attr('fill', nd.color);
          ng.append('text')
            .attr('x', 38).attr('y', -16)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('fill', '#fff')
            .attr('font-size', '9px')
            .attr('font-weight', '700')
            .text(nd.count);
        }

      } else {
        /* leaf circle */
        ng.append('circle')
          .attr('r', 24)
          .attr('fill', nd.color)
          .attr('fill-opacity', 0.12)
          .attr('stroke', nd.color)
          .attr('stroke-width', 1.5);
        const lbl = truncate(nd.label, 16);
        const words = lbl.split(/\s+/);
        if (words.length <= 2) {
          words.forEach((w, i) => {
            ng.append('text')
              .attr('text-anchor', 'middle')
              .attr('y', words.length === 1 ? 0 : (i - 0.5) * 11)
              .attr('fill', nd.color)
              .attr('font-size', '9px')
              .attr('dominant-baseline', 'middle')
              .text(w);
          });
        } else {
          ng.append('text')
            .attr('text-anchor', 'middle')
            .attr('y', -5)
            .attr('fill', nd.color)
            .attr('font-size', '9px')
            .text(words.slice(0, 2).join(' '));
          ng.append('text')
            .attr('text-anchor', 'middle')
            .attr('y', 7)
            .attr('fill', nd.color)
            .attr('font-size', '9px')
            .text(words.slice(2, 4).join(' '));
        }
      }
    });
  };

  /* zoom controls */
  const handleZoomIn  = () => { if (svgRef.current && zoomRef.current) d3.select(svgRef.current).transition().call(zoomRef.current.scaleBy, 1.4); };
  const handleZoomOut = () => { if (svgRef.current && zoomRef.current) d3.select(svgRef.current).transition().call(zoomRef.current.scaleBy, 0.7); };
  const handleFit     = () => { if (svgRef.current && zoomRef.current) d3.select(svgRef.current).transition().call(zoomRef.current.transform, d3.zoomIdentity); };

  const filteredRisks = risks.filter(r =>
    !search ||
    (r.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.risk_number || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.scenario || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full gap-4">

      {/* ── Left: risk selector ── */}
      <aside className="w-72 flex-shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <Network className="w-5 h-5 text-cyan-600" />
            <h2 className="text-base font-semibold dark:text-white">Ментальная карта</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Поиск рисков..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredRisks.length === 0 && (
            <p className="text-center text-sm text-slate-400 py-6">Риски не найдены</p>
          )}
          {filteredRisks.map(r => {
            const isActive = selectedRisk?.id === r.id;
            const lvlColor = LEVEL_COLOR[r.level] || '#64748b';
            return (
              <button
                key={r.id}
                onClick={() => setSelectedRisk(isActive ? null : r)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all text-sm ${
                  isActive
                    ? 'bg-cyan-50 dark:bg-cyan-900/30 border border-cyan-300 dark:border-cyan-700'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={`font-medium truncate ${isActive ? 'text-cyan-700 dark:text-cyan-300' : 'text-slate-800 dark:text-slate-200'}`}>
                    {r.name || r.risk_number || `Риск ${r.id.slice(-4)}`}
                  </span>
                  {r.level && (
                    <span className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded font-semibold"
                      style={{ background: `${lvlColor}22`, color: lvlColor }}>
                      {r.level}
                    </span>
                  )}
                </div>
                {r.scenario && (
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{r.scenario}</p>
                )}
              </button>
            );
          })}
        </div>
        {selectedRisk && (
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Выбран риск:</div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                {selectedRisk.name || selectedRisk.risk_number}
              </span>
              <button onClick={() => setSelectedRisk(null)} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* ── Right: mind map canvas ── */}
      <div className="flex-1 min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col overflow-hidden relative">

        {/* toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            {mapData && (
              <>
                <Badge variant="outline" className="text-xs gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-500 inline-block"></span>
                  {mapData.assets.length} активов
                </Badge>
                <Badge variant="outline" className="text-xs gap-1">
                  <span className="w-2 h-2 rounded-full bg-violet-500 inline-block"></span>
                  {mapData.threats.length} угроз
                </Badge>
                <Badge variant="outline" className="text-xs gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                  {mapData.vulnerabilities.length} уязвимостей
                </Badge>
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handleZoomIn}  title="Приблизить"><ZoomIn  className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" onClick={handleZoomOut} title="Отдалить">  <ZoomOut className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" onClick={handleFit}     title="По размеру"><Maximize2 className="w-4 h-4" /></Button>
            {selectedRisk && (
              <Button variant="ghost" size="sm" onClick={() => loadMapData(selectedRisk)} title="Обновить">
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* SVG canvas */}
        <div className="flex-1 relative overflow-hidden">
          {!selectedRisk && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-400 dark:text-slate-600">
              <Network className="w-16 h-16 opacity-30" />
              <p className="text-sm font-medium">Выберите риск для построения ментальной карты</p>
              <p className="text-xs opacity-70">Список рисков — в панели слева</p>
            </div>
          )}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-slate-900/60 z-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-600"></div>
            </div>
          )}
          <svg
            ref={svgRef}
            className="w-full h-full"
            style={{ cursor: 'grab' }}
          />
        </div>

        {/* Legend */}
        {mapData && (
          <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 flex items-center gap-5 flex-wrap">
            <span className="text-xs text-slate-500 font-medium">Обозначения:</span>
            {[
              { color: LEVEL_COLOR[mapData.risk.level] || '#64748b', label: 'Риск (центр)' },
              { color: '#0891b2',  label: 'Активы' },
              { color: '#7c3aed',  label: 'Угрозы' },
              { color: '#d97706',  label: 'Уязвимости' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: item.color }}></div>
                <span className="text-xs text-slate-600 dark:text-slate-400">{item.label}</span>
              </div>
            ))}
            <span className="text-xs text-slate-400 ml-auto hidden sm:block">Прокрутка / жест — масштаб · Перетаскивание — перемещение</span>
          </div>
        )}
      </div>

      {/* Hover tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none bg-slate-900 dark:bg-slate-950 text-white rounded-lg shadow-xl p-3 max-w-xs border border-slate-700"
          style={{ left: tooltip.x + 14, top: tooltip.y - 10 }}
        >
          <div className="font-semibold text-sm mb-1">{tooltip.label}</div>
          {tooltip.details.map((d, i) => (
            <div key={i} className="text-xs text-slate-300">{d}</div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MindMap;
