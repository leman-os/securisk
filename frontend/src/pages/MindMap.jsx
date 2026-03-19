import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { API } from '../App';
import * as d3 from 'd3';
import { Network, Search, X, ZoomIn, ZoomOut, Maximize2, RefreshCw, AlertTriangle, Server, Zap, Bug } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

/* ── colors ── */
const LEVEL_COLOR = {
  Критический: '#ef4444', Высокий: '#f97316', Средний: '#eab308', Низкий: '#22c55e',
};
const SEVER_COLOR = {
  Critical: '#ef4444',     High: '#f97316',     Medium: '#eab308',     Low: '#22c55e',
  Критический: '#ef4444', Высокий: '#f97316',  Средний: '#eab308',   Низкий: '#22c55e',
  Критическая: '#ef4444', Высокая: '#f97316',  Средняя: '#eab308',   Низкая: '#22c55e',
};

/* ── root mode config ── */
const ROOT_MODES = [
  { key: 'risks',           label: 'Риск',       shortLabel: 'Риски',      Icon: AlertTriangle, color: '#dc2626', bg: '#fef2f2' },
  { key: 'assets',          label: 'Актив',      shortLabel: 'Активы',     Icon: Server,        color: '#0891b2', bg: '#ecfeff' },
  { key: 'threats',         label: 'Угроза',     shortLabel: 'Угрозы',     Icon: Zap,           color: '#7c3aed', bg: '#f5f3ff' },
  { key: 'vulnerabilities', label: 'Уязвимость', shortLabel: 'Уязвимости', Icon: Bug,           color: '#ea580c', bg: '#fff7ed' },
];

/* ── branch configs per root mode ── */
const BRANCH_CFG = {
  risks:           [
    { key: 'assets',          label: 'Активы',     color: '#0891b2', bg: '#ecfeff' },
    { key: 'threats',         label: 'Угрозы',     color: '#7c3aed', bg: '#f5f3ff' },
    { key: 'vulnerabilities', label: 'Уязвимости', color: '#ea580c', bg: '#fff7ed' },
  ],
  assets:          [
    { key: 'risks',           label: 'Риски',      color: '#dc2626', bg: '#fef2f2' },
    { key: 'threats',         label: 'Угрозы',     color: '#7c3aed', bg: '#f5f3ff' },
    { key: 'vulnerabilities', label: 'Уязвимости', color: '#ea580c', bg: '#fff7ed' },
  ],
  threats:         [
    { key: 'risks',           label: 'Риски',      color: '#dc2626', bg: '#fef2f2' },
    { key: 'assets',          label: 'Активы',     color: '#0891b2', bg: '#ecfeff' },
    { key: 'vulnerabilities', label: 'Уязвимости', color: '#ea580c', bg: '#fff7ed' },
  ],
  vulnerabilities: [
    { key: 'risks',           label: 'Риски',      color: '#dc2626', bg: '#fef2f2' },
    { key: 'assets',          label: 'Активы',     color: '#0891b2', bg: '#ecfeff' },
    { key: 'threats',         label: 'Угрозы',     color: '#7c3aed', bg: '#f5f3ff' },
  ],
};

/* ── detail fields per entity type ── */
const DETAIL_FIELDS = {
  risks:           [
    { k: 'risk_number', l: 'Номер' },
    { k: 'scenario',    l: 'Сценарий' },
    { k: 'level',       l: 'Критичность' },
    { k: 'risk_level',  l: 'Уровень риска' },
    { k: 'owner',       l: 'Владелец' },
    { k: 'status',      l: 'Статус' },
    { k: 'description', l: 'Описание' },
  ],
  assets:          [
    { k: 'type',        l: 'Тип' },
    { k: 'category',    l: 'Категория' },
    { k: 'criticality', l: 'Критичность' },
    { k: 'owner',       l: 'Владелец' },
    { k: 'status',      l: 'Статус' },
    { k: 'description', l: 'Описание' },
  ],
  threats:         [
    { k: 'source',          l: 'Источник' },
    { k: 'category',        l: 'Категория' },
    { k: 'severity',        l: 'Серьёзность' },
    { k: 'mitre_attack_id', l: 'MITRE ATT&CK' },
    { k: 'description',     l: 'Описание' },
  ],
  vulnerabilities: [
    { k: 'type',        l: 'Тип' },
    { k: 'severity',    l: 'Критичность' },
    { k: 'cvss',        l: 'CVSS' },
    { k: 'status',      l: 'Статус' },
    { k: 'description', l: 'Описание' },
  ],
};

const CAT_R  = 190;
const LEAF_R = 370;
const DUR    = 450;

/* ── pure helpers ── */
const wrapLabel = (text, maxLen = 13) => {
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

const qPath = (x1, y1, x2, y2) => {
  const mx = (x1 + x2) / 2 * 0.82;
  const my = (y1 + y2) / 2 * 0.82;
  return `M${x1},${y1} Q${mx},${my} ${x2},${y2}`;
};

const getEntityName = (type, item) => {
  if (type === 'risks') return item.name || item.risk_number || 'Риск';
  return item.name || item.title || item.id?.slice(-6) || '—';
};

const getEntityBadge = (type, item) => {
  if (type === 'risks')           return item.level;
  if (type === 'assets')          return item.criticality;
  if (type === 'threats')         return item.severity || item.category;
  if (type === 'vulnerabilities') return item.severity;
  return null;
};

const getEntityColor = (type, item) => {
  const b = getEntityBadge(type, item);
  return SEVER_COLOR[b] || LEVEL_COLOR[b] || null;
};

const getLeafSubLabel = (branchKey, item) => {
  if (branchKey === 'risks')           return item.risk_level != null ? `Уровень ${item.risk_level}` : (item.level || '');
  if (branchKey === 'assets')          return item.criticality || '';
  if (branchKey === 'threats')         return item.source || item.category || '';
  if (branchKey === 'vulnerabilities') return item.severity || (item.cvss != null ? `CVSS ${item.cvss}` : '');
  return '';
};

/* Radial layout */
const computePositions = (catItems, collapsed) => {
  const cats = catItems.map((cat, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI / 3) * i;
    return { ...cat, angle, x: CAT_R * Math.cos(angle), y: CAT_R * Math.sin(angle), collapsed: !!collapsed[cat.key] };
  });
  const leaves = [];
  cats.forEach(cat => {
    if (cat.collapsed || !cat.items?.length) return;
    const n = cat.items.length;
    const half = n === 1 ? 0 : Math.min((68 * Math.PI) / 180, ((n - 1) * (20 * Math.PI) / 180) / 2);
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

/* Compute map data from cached allData */
const computeMapData = (rootMode, item, allData) => {
  const { risks, assetsMap, threatsMap, vulnsMap } = allData;
  if (rootMode === 'risks') {
    return {
      assets:          (item.related_assets         || []).map(id => assetsMap[id]).filter(Boolean),
      threats:         (item.related_threats         || []).map(id => threatsMap[id]).filter(Boolean),
      vulnerabilities: (item.related_vulnerabilities || []).map(id => vulnsMap[id]).filter(Boolean),
    };
  }
  if (rootMode === 'assets') {
    const rel = risks.filter(r => (r.related_assets || []).includes(item.id));
    return {
      risks: rel,
      threats:         [...new Set(rel.flatMap(r => r.related_threats || []))].map(id => threatsMap[id]).filter(Boolean),
      vulnerabilities: [...new Set(rel.flatMap(r => r.related_vulnerabilities || []))].map(id => vulnsMap[id]).filter(Boolean),
    };
  }
  if (rootMode === 'threats') {
    const rel = risks.filter(r => (r.related_threats || []).includes(item.id));
    return {
      risks: rel,
      assets:          [...new Set(rel.flatMap(r => r.related_assets || []))].map(id => assetsMap[id]).filter(Boolean),
      vulnerabilities: [...new Set(rel.flatMap(r => r.related_vulnerabilities || []))].map(id => vulnsMap[id]).filter(Boolean),
    };
  }
  // vulnerabilities
  const rel = risks.filter(r => (r.related_vulnerabilities || []).includes(item.id));
  return {
    risks: rel,
    assets:  [...new Set(rel.flatMap(r => r.related_assets  || []))].map(id => assetsMap[id]).filter(Boolean),
    threats: [...new Set(rel.flatMap(r => r.related_threats || []))].map(id => threatsMap[id]).filter(Boolean),
  };
};

/* ── component ── */
const MindMap = () => {
  const [rootMode, setRootMode]         = useState('risks');
  const [allData, setAllData]           = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [mapData, setMapData]           = useState(null);
  const [detail, setDetail]             = useState(null);
  const [search, setSearch]             = useState('');
  const [loadingData, setLoadingData]   = useState(true);

  const svgRef   = useRef(null);
  const zoomRef  = useRef(null);
  const linkGRef = useRef(null);
  const nodeGRef = useRef(null);
  const stateRef = useRef({ catItems: [], collapsed: {} });

  /* load all entities once */
  useEffect(() => {
    setLoadingData(true);
    const p = { limit: 1000 };
    Promise.all([
      axios.get(`${API}/risks`,           { params: p }),
      axios.get(`${API}/assets`,          { params: p }),
      axios.get(`${API}/threats`,         { params: p }),
      axios.get(`${API}/vulnerabilities`, { params: p }),
    ]).then(([rr, ar, tr, vr]) => {
      const risks   = rr.data.items || [];
      const assets  = ar.data.items || [];
      const threats = tr.data.items || [];
      const vulns   = vr.data.items || [];
      setAllData({
        risks, assets, threats, vulns,
        risksMap:   Object.fromEntries(risks.map(x => [x.id, x])),
        assetsMap:  Object.fromEntries(assets.map(x => [x.id, x])),
        threatsMap: Object.fromEntries(threats.map(x => [x.id, x])),
        vulnsMap:   Object.fromEntries(vulns.map(x => [x.id, x])),
      });
    }).catch(() => {}).finally(() => setLoadingData(false));
  }, []);

  /* clear selection on mode change */
  useEffect(() => {
    setSelectedItem(null);
    setMapData(null);
    setDetail(null);
    stateRef.current = { catItems: [], collapsed: {} };
  }, [rootMode]);

  /* compute map data when selection changes */
  useEffect(() => {
    if (!selectedItem || !allData) { setMapData(null); return; }
    const branches = computeMapData(rootMode, selectedItem, allData);
    setMapData({ root: selectedItem, rootMode, branches });
    setDetail(null);
    stateRef.current.collapsed = {};
  }, [selectedItem, rootMode, allData]);

  /* ── D3 update — reads only refs, fully stable ── */
  const update = useCallback((animated = true) => {
    const { catItems, collapsed } = stateRef.current;
    const linkG = linkGRef.current;
    const nodeG = nodeGRef.current;
    if (!linkG || !nodeG) return;
    const dur = animated ? DUR : 0;
    const { cats, leaves } = computePositions(catItems, collapsed);

    /* links */
    const linkData = [
      ...cats.map(c => ({ id: `lkc-${c.key}`, x1: 0, y1: 0, x2: c.x, y2: c.y, color: c.color, w: 2.5, op: 0.5, cx: c.x, cy: c.y })),
      ...leaves.map(lf => {
        const c = cats.find(c => c.key === lf.catKey);
        return { id: `lkl-${lf.id}`, x1: c?.x ?? 0, y1: c?.y ?? 0, x2: lf.x, y2: lf.y, color: lf.color, w: 1.5, op: 0.35, cx: c?.x ?? 0, cy: c?.y ?? 0 };
      }),
    ];
    const linkSel = linkG.selectAll('path.mm-link').data(linkData, d => d.id);
    linkSel.exit().transition().duration(dur).attr('stroke-opacity', 0).remove();
    const lkEnter = linkSel.enter().append('path').attr('class', 'mm-link')
      .attr('fill', 'none').attr('stroke', d => d.color).attr('stroke-width', d => d.w)
      .attr('stroke-linecap', 'round').attr('stroke-opacity', 0)
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
      .on('click', (ev, d) => { stateRef.current.collapsed[d.key] = !stateRef.current.collapsed[d.key]; update(true); ev.stopPropagation(); })
      .on('mouseenter', function () { d3.select(this).select('.cat-pill').attr('stroke-width', 2.5).attr('filter', 'url(#mm-glow)'); })
      .on('mouseleave', function () { d3.select(this).select('.cat-pill').attr('stroke-width', 1.5).attr('filter', null); });

    catEnter.append('rect').attr('class', 'cat-pill').attr('rx', 18).attr('height', 36)
      .attr('fill', d => d.bg).attr('stroke', d => d.color).attr('stroke-width', 1.5);
    catEnter.append('text').attr('class', 'cat-label')
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
      .attr('fill', d => d.color).attr('font-size', '11.5px').attr('font-weight', '700').attr('pointer-events', 'none');
    const badge = catEnter.append('g').attr('class', 'cat-badge');
    badge.append('circle').attr('r', 10).attr('fill', d => d.color);
    badge.append('text').attr('class', 'badge-num').attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
      .attr('fill', '#fff').attr('font-size', '9px').attr('font-weight', '700').attr('pointer-events', 'none');
    catEnter.append('text').attr('class', 'cat-hint').attr('text-anchor', 'middle').attr('y', 28)
      .attr('fill', d => d.color).attr('font-size', '7.5px').attr('opacity', 0.5).attr('pointer-events', 'none');

    const catAll = catSel.merge(catEnter);
    catAll.transition().duration(dur).attr('opacity', 1).attr('transform', d => `translate(${d.x},${d.y})`);
    catAll.each(function (d) {
      const g = d3.select(this);
      const pillW = Math.max(96, d.label.length * 8 + 28);
      g.select('.cat-pill').attr('x', -pillW / 2).attr('y', -18).attr('width', pillW);
      g.select('.cat-label').attr('y', 0).text(d.label);
      g.select('.cat-badge').attr('transform', `translate(${pillW / 2 + 2},-18)`).style('display', d.count > 0 ? null : 'none');
      g.select('.badge-num').text(d.collapsed ? `+${d.count}` : d.count);
      g.select('.cat-hint').text(d.collapsed ? '▼ развернуть' : d.count > 0 ? '▲ свернуть' : '');
    });

    /* leaf nodes */
    const leafSel = nodeG.selectAll('g.mm-leaf').data(leaves, d => d.id);
    leafSel.exit().transition().duration(dur).attr('opacity', 0).attr('transform', d => `translate(${d.catX},${d.catY})`).remove();
    const lfEnter = leafSel.enter().append('g').attr('class', 'mm-leaf')
      .attr('cursor', 'pointer').attr('opacity', 0)
      .attr('transform', d => `translate(${d.catX},${d.catY})`)
      .on('click', (ev, d) => { setDetail({ item: d.item, catKey: d.catKey, color: d.color }); ev.stopPropagation(); })
      .on('mouseenter', function () {
        d3.select(this).select('.lf-circle').transition().duration(120).attr('r', 32).attr('stroke-width', 2.5).attr('filter', 'url(#mm-glow)');
      })
      .on('mouseleave', function () {
        d3.select(this).select('.lf-circle').transition().duration(120).attr('r', 27).attr('stroke-width', 1.5).attr('filter', null);
      });

    lfEnter.each(function (d) {
      const g = d3.select(this);
      const right = Math.cos(d.angle) >= -0.1;
      const lx = right ? 35 : -35;
      const anchor = right ? 'start' : 'end';
      const name = getEntityName(d.catKey, d.item);
      const sub  = getLeafSubLabel(d.catKey, d.item);
      const ec   = getEntityColor(d.catKey, d.item);

      if (ec) {
        g.append('circle').attr('class', 'lf-ring').attr('r', 32)
          .attr('fill', 'none').attr('stroke', ec).attr('stroke-width', 1.5)
          .attr('stroke-opacity', 0.45).attr('stroke-dasharray', '5,3');
      }
      g.append('circle').attr('class', 'lf-circle').attr('r', 27)
        .attr('fill', ec ? `${ec}15` : d.bg).attr('stroke', ec || d.color).attr('stroke-width', 1.5);

      const lines = wrapLabel(name, 13);
      const totalTextH = lines.length * 13 + (sub ? 13 : 0);
      let yOff = -totalTextH / 2 + 6;
      lines.forEach(line => {
        g.append('text').attr('class', 'lf-lbl')
          .attr('x', lx).attr('y', yOff).attr('text-anchor', anchor).attr('dominant-baseline', 'middle')
          .attr('fill', '#374151').attr('font-size', '10px').attr('pointer-events', 'none').text(line);
        yOff += 13;
      });
      if (sub) {
        g.append('text').attr('class', 'lf-sub')
          .attr('x', lx).attr('y', yOff).attr('text-anchor', anchor).attr('dominant-baseline', 'middle')
          .attr('fill', ec || d.color).attr('font-size', '8.5px').attr('font-weight', '600')
          .attr('pointer-events', 'none').text(sub);
      }
    });
    leafSel.merge(lfEnter).transition().duration(dur).attr('opacity', 1).attr('transform', d => `translate(${d.x},${d.y})`);
  }, []);

  /* init / clear canvas */
  useEffect(() => {
    if (!svgRef.current) return;
    if (!mapData) {
      d3.select(svgRef.current).selectAll('*').remove();
      linkGRef.current = null;
      nodeGRef.current = null;
      return;
    }

    const { root, rootMode: rm, branches } = mapData;
    const svgEl = svgRef.current;
    const W = svgEl.clientWidth  || 860;
    const H = svgEl.clientHeight || 560;

    d3.select(svgEl).selectAll('*').remove();
    const svg = d3.select(svgEl);

    /* defs */
    const defs = svg.append('defs');
    // glow filter
    const flt = defs.append('filter').attr('id', 'mm-glow').attr('x', '-60%').attr('y', '-60%').attr('width', '220%').attr('height', '220%');
    flt.append('feGaussianBlur').attr('in', 'SourceAlpha').attr('stdDeviation', 5).attr('result', 'blur');
    const mg = flt.append('feMerge');
    mg.append('feMergeNode').attr('in', 'blur');
    mg.append('feMergeNode').attr('in', 'SourceGraphic');
    // shadow filter
    const shd = defs.append('filter').attr('id', 'mm-shadow').attr('x', '-20%').attr('y', '-20%').attr('width', '140%').attr('height', '140%');
    shd.append('feDropShadow').attr('dx', 0).attr('dy', 2).attr('stdDeviation', 8).attr('flood-opacity', 0.14);
    // dot grid pattern
    const pat = defs.append('pattern').attr('id', 'mm-grid').attr('width', 28).attr('height', 28).attr('patternUnits', 'userSpaceOnUse');
    pat.append('circle').attr('cx', 14).attr('cy', 14).attr('r', 1.2).attr('fill', '#94a3b8').attr('fill-opacity', 0.18);
    // center radial gradient
    const modeCfg = ROOT_MODES.find(m => m.key === rm);
    const rc = LEVEL_COLOR[root.level] || SEVER_COLOR[root.criticality] || SEVER_COLOR[root.severity] || modeCfg?.color || '#64748b';
    const grad = defs.append('radialGradient').attr('id', 'mm-cgrad').attr('cx', '35%').attr('cy', '35%').attr('r', '65%');
    grad.append('stop').attr('offset', '0%').attr('stop-color', rc).attr('stop-opacity', 0.28);
    grad.append('stop').attr('offset', '100%').attr('stop-color', rc).attr('stop-opacity', 0.06);

    /* background grid (fixed — outside zoom group) */
    svg.append('rect').attr('width', '100%').attr('height', '100%').attr('fill', 'url(#mm-grid)').attr('pointer-events', 'none');

    const g = svg.append('g');
    linkGRef.current = g.append('g').attr('class', 'mm-links');
    nodeGRef.current = g.append('g').attr('class', 'mm-nodes');

    /* zoom */
    const zoom = d3.zoom().scaleExtent([0.15, 4]).on('zoom', ev => g.attr('transform', ev.transform.toString()));
    zoomRef.current = zoom;
    svg.call(zoom);
    svg.call(zoom.transform, d3.zoomIdentity.translate(W / 2, H / 2));
    svg.on('click', () => setDetail(null));

    /* ── center node ── */
    const center = nodeGRef.current.append('g').attr('class', 'node-root').attr('cursor', 'default');

    // animated pulse ring
    const pulse = center.append('circle').attr('r', 78).attr('fill', 'none')
      .attr('stroke', rc).attr('stroke-width', 1.5).attr('stroke-opacity', 0.12);
    pulse.append('animate').attr('attributeName', 'r').attr('values', '74;90;74').attr('dur', '3.5s').attr('repeatCount', 'indefinite');
    pulse.append('animate').attr('attributeName', 'stroke-opacity').attr('values', '0.08;0.28;0.08').attr('dur', '3.5s').attr('repeatCount', 'indefinite');

    // inner glow ring
    center.append('circle').attr('r', 68).attr('fill', 'none')
      .attr('stroke', rc).attr('stroke-width', 1).attr('stroke-opacity', 0.2).attr('stroke-dasharray', '6,4');

    // main filled circle
    center.append('circle').attr('r', 62).attr('fill', 'url(#mm-cgrad)')
      .attr('stroke', rc).attr('stroke-width', 2.5).attr('filter', 'url(#mm-shadow)');
    center.append('circle').attr('r', 62).attr('fill', 'none')
      .attr('stroke', rc).attr('stroke-width', 2).attr('stroke-opacity', 0.7).attr('filter', 'url(#mm-glow)');

    // type label (top, small)
    center.append('text').attr('text-anchor', 'middle').attr('y', -36)
      .attr('fill', rc).attr('font-size', '8.5px').attr('font-weight', '800')
      .attr('letter-spacing', '0.1em').attr('opacity', 0.65)
      .text((modeCfg?.label || rm).toUpperCase());

    // entity name
    const nameStr = getEntityName(rm, root);
    const metricText = rm === 'risks'
      ? (root.risk_level != null ? `Уровень ${root.risk_level}` : null)
      : getEntityBadge(rm, root);
    const nameLines = wrapLabel(nameStr, 15);
    const totalH = nameLines.length * 14 + (metricText ? 22 : 0);
    let ny = -totalH / 2 + 7;
    nameLines.forEach(line => {
      center.append('text').attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
        .attr('y', ny).attr('fill', rc).attr('font-size', '11.5px').attr('font-weight', '800').text(line);
      ny += 14;
    });

    // metric badge
    if (metricText) {
      const bw = metricText.length * 6.5 + 18;
      const bg2 = center.append('g').attr('transform', `translate(0,${ny + 4})`);
      bg2.append('rect').attr('rx', 8).attr('height', 17).attr('x', -bw / 2).attr('y', -8.5).attr('width', bw)
        .attr('fill', rc).attr('fill-opacity', 0.14).attr('stroke', rc).attr('stroke-width', 1).attr('stroke-opacity', 0.35);
      bg2.append('text').attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
        .attr('fill', rc).attr('font-size', '8.5px').attr('font-weight', '700').text(metricText);
    }

    /* init branches */
    stateRef.current = {
      catItems: BRANCH_CFG[rm].map(c => ({ ...c, items: branches[c.key] || [], count: (branches[c.key] || []).length })),
      collapsed: {},
    };
    update(false);
  }, [mapData, update]); // eslint-disable-line

  /* zoom controls */
  const zoomIn  = () => svgRef.current && d3.select(svgRef.current).transition().call(zoomRef.current.scaleBy, 1.4);
  const zoomOut = () => svgRef.current && d3.select(svgRef.current).transition().call(zoomRef.current.scaleBy, 0.7);
  const fit     = () => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().call(
      zoomRef.current.transform,
      d3.zoomIdentity.translate(svgRef.current.clientWidth / 2, svgRef.current.clientHeight / 2)
    );
  };
  const refresh = () => {
    if (!selectedItem || !allData) return;
    const branches = computeMapData(rootMode, selectedItem, allData);
    setMapData({ root: selectedItem, rootMode, branches });
  };

  /* current entity list */
  const currentList = allData
    ? { risks: allData.risks, assets: allData.assets, threats: allData.threats, vulnerabilities: allData.vulns }[rootMode] || []
    : [];

  const filtered = currentList.filter(item => {
    if (!search) return true;
    const name  = getEntityName(rootMode, item).toLowerCase();
    const extra = (item.scenario || item.description || item.category || item.source || '').toLowerCase();
    return name.includes(search.toLowerCase()) || extra.includes(search.toLowerCase());
  });

  const modeCfg     = ROOT_MODES.find(m => m.key === rootMode);
  const branchCounts = mapData ? BRANCH_CFG[rootMode].map(b => ({ ...b, count: (mapData.branches[b.key] || []).length })) : [];

  return (
    <div className="flex gap-4" style={{ height: 'calc(100vh - 3rem)' }}>

      {/* ── Left panel ── */}
      <aside className="w-72 flex-shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col min-h-0 overflow-hidden">

        {/* Header + mode tabs */}
        <div className="p-3 pb-2 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <Network className="w-4 h-4 text-cyan-600" />
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">Ментальная карта</h2>
          </div>
          {/* Mode selector */}
          <div className="grid grid-cols-4 gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            {ROOT_MODES.map(({ key, label, Icon, color }) => (
              <button key={key} onClick={() => setRootMode(key)} title={label}
                className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-xs font-semibold transition-all ${
                  rootMode === key
                    ? 'bg-white dark:bg-slate-700 shadow-sm'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                <Icon className="w-4 h-4 transition-colors" style={{ color: rootMode === key ? color : undefined }} />
                <span style={{ fontSize: '9px', color: rootMode === key ? color : undefined }}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
            <Input placeholder={`Поиск: ${modeCfg?.shortLabel || ''}…`} value={search}
              onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {loadingData && (
            <div className="flex flex-col items-center gap-2 py-10">
              <div className="animate-spin rounded-full h-7 w-7 border-2 border-t-transparent" style={{ borderColor: modeCfg?.color }} />
              <span className="text-xs text-slate-400">Загрузка данных…</span>
            </div>
          )}
          {!loadingData && filtered.length === 0 && (
            <p className="text-center text-xs text-slate-400 py-8">Ничего не найдено</p>
          )}
          {!loadingData && filtered.map(item => {
            const isActive = selectedItem?.id === item.id;
            const badge    = getEntityBadge(rootMode, item);
            const ec       = getEntityColor(rootMode, item) || modeCfg?.color;
            const name     = getEntityName(rootMode, item);
            const sub      = item.scenario || item.description || item.category || item.source || '';
            return (
              <button key={item.id} onClick={() => setSelectedItem(isActive ? null : item)}
                className="w-full text-left px-3 py-2 rounded-lg transition-all text-xs border"
                style={isActive
                  ? { borderColor: modeCfg?.color, background: `${modeCfg?.color}12`, borderWidth: 1.5 }
                  : { borderColor: 'transparent' }}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight">{name}</span>
                  {badge && (
                    <span className="flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap"
                      style={{ background: `${ec}22`, color: ec }}>{badge}</span>
                  )}
                </div>
                {sub && <p className="text-slate-400 dark:text-slate-500 mt-0.5 truncate text-[10px] leading-tight">{sub.slice(0, 55)}</p>}
              </button>
            );
          })}
        </div>

        {/* Selected footer */}
        {selectedItem && (
          <div className="px-3 py-2.5 border-t border-slate-200 dark:border-slate-800 flex-shrink-0"
            style={{ background: `${modeCfg?.color}0a` }}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[8.5px] font-black uppercase tracking-widest mb-0.5" style={{ color: modeCfg?.color }}>
                  {modeCfg?.label}
                </div>
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                  {getEntityName(rootMode, selectedItem)}
                </div>
              </div>
              <button onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {branchCounts.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {branchCounts.map(b => (
                  <span key={b.key} className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
                    style={{ background: `${b.color}18`, color: b.color }}>{b.count} {b.label}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </aside>

      {/* ── Right: canvas ── */}
      <div className="flex-1 min-w-0 min-h-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex-shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {mapData ? (
              <>
                <div className="flex items-center gap-1.5 min-w-0">
                  {modeCfg && <modeCfg.Icon className="w-4 h-4 flex-shrink-0" style={{ color: modeCfg.color }} />}
                  <span className="font-semibold text-sm text-slate-700 dark:text-slate-200 truncate">
                    {getEntityName(rootMode, mapData.root)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
                  {branchCounts.map(b => (
                    <span key={b.key} className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: `${b.color}18`, color: b.color }}>
                      {b.count} {b.label}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <span className="text-sm text-slate-400 dark:text-slate-500">
                Выберите {modeCfg?.label?.toLowerCase() || 'элемент'} из списка слева
              </span>
            )}
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <Button variant="ghost" size="sm" onClick={zoomIn}  title="Приблизить"><ZoomIn  className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" onClick={zoomOut} title="Отдалить">  <ZoomOut className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" onClick={fit}     title="По центру"><Maximize2 className="w-4 h-4" /></Button>
            {selectedItem && <Button variant="ghost" size="sm" onClick={refresh} title="Обновить"><RefreshCw className="w-4 h-4" /></Button>}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden min-h-0">
          {/* Empty state */}
          {!selectedItem && !loadingData && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 pointer-events-none select-none z-10">
              <div className="w-24 h-24 rounded-full flex items-center justify-center"
                style={{ background: `${modeCfg?.color}10`, border: `2px dashed ${modeCfg?.color}35` }}>
                {modeCfg && <modeCfg.Icon className="w-11 h-11" style={{ color: `${modeCfg.color}55` }} />}
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">
                  Выберите {modeCfg?.label?.toLowerCase() || 'элемент'} из списка
                </p>
                <p className="text-xs text-slate-300 dark:text-slate-700 mt-1">
                  Карта покажет связанные объекты
                </p>
              </div>
              {/* Mode quick-switch pills */}
              <div className="flex items-center gap-2 pointer-events-auto">
                {ROOT_MODES.map(({ key, label, Icon, color }) => (
                  <button key={key} onClick={() => setRootMode(key)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                    style={key === rootMode
                      ? { borderWidth: 1.5, borderStyle: 'solid', borderColor: color, color, background: `${color}12` }
                      : { borderWidth: 1, borderStyle: 'solid', borderColor: '#e2e8f0', color: '#94a3b8' }}
                  >
                    <Icon className="w-3 h-3" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <svg ref={svgRef} className="w-full h-full" style={{ cursor: 'grab' }} />

          {/* Detail panel */}
          {detail && (
            <div className="absolute top-3 right-3 bottom-3 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-700 flex flex-col overflow-hidden z-20"
              onClick={ev => ev.stopPropagation()}>
              <div className="px-4 py-3 flex-shrink-0 border-b border-slate-100 dark:border-slate-700"
                style={{ borderTopWidth: 3, borderTopColor: detail.color }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[8.5px] font-black uppercase tracking-widest mb-1.5" style={{ color: detail.color }}>
                      {ROOT_MODES.find(m => m.key === detail.catKey)?.label || detail.catKey}
                    </div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug break-words">
                      {getEntityName(detail.catKey, detail.item)}
                    </div>
                    {(() => {
                      const badge = getEntityBadge(detail.catKey, detail.item);
                      const ec    = getEntityColor(detail.catKey, detail.item) || detail.color;
                      return badge ? (
                        <span className="inline-block mt-1.5 text-[9px] px-2 py-0.5 rounded font-bold"
                          style={{ background: `${ec}22`, color: ec }}>{badge}</span>
                      ) : null;
                    })()}
                  </div>
                  <button onClick={() => setDetail(null)} className="text-slate-400 hover:text-slate-600 flex-shrink-0 mt-0.5">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {(DETAIL_FIELDS[detail.catKey] || []).map(f => {
                  const val = detail.item[f.k];
                  if (!val && val !== 0) return null;
                  return (
                    <div key={f.k}>
                      <div className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-0.5">{f.l}</div>
                      <div className="text-xs text-slate-700 dark:text-slate-300 break-words leading-relaxed">{String(val)}</div>
                    </div>
                  );
                })}
                {(DETAIL_FIELDS[detail.catKey] || []).every(f => !detail.item[f.k] && detail.item[f.k] !== 0) && (
                  <p className="text-xs text-slate-400 italic">Нет дополнительных данных</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 flex items-center gap-4 flex-wrap flex-shrink-0">
          {mapData && BRANCH_CFG[rootMode].map(c => (
            <div key={c.key} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: c.color }} />
              <span className="text-xs text-slate-500 dark:text-slate-400">{c.label}</span>
            </div>
          ))}
          <span className="text-xs text-slate-300 dark:text-slate-700 ml-auto hidden lg:block">
            Колесо — масштаб · Перетаскивание — панорама · Клик на категории — свернуть · Клик на узле — детали
          </span>
        </div>
      </div>
    </div>
  );
};

export default MindMap;
