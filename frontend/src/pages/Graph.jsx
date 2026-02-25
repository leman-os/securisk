import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import * as d3 from 'd3';
import { GitBranch, RefreshCw, ZoomIn, ZoomOut, Maximize2, Info, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

/* ── node visual config ─────────────────────────────────────────── */
// shape: 'rect' | 'ellipse' | 'diamond' | 'circle'
const NODE_CFG = {
  asset:         { label: 'Актив',            color: '#0891b2', glow: '#67e8f9', r: 32, shape: 'rect' },
  risk:          { label: 'Риск',             color: '#ef4444', glow: '#fca5a5', r: 20, shape: 'ellipse' },
  threat:        { label: 'Угроза',           color: '#7c3aed', glow: '#c4b5fd', r: 20, shape: 'diamond' },
  vulnerability: { label: 'Уязвимость',       color: '#d97706', glow: '#fcd34d', r: 18, shape: 'circle' },
  risk_owner:    { label: 'Вл. риска',        color: '#16a34a', glow: '#86efac', r: 12, shape: 'circle' },
  asset_owner:   { label: 'Вл. актива',       color: '#0d9488', glow: '#5eead4', r: 12, shape: 'circle' },
};

/* link colors: more opaque for asset connections */
const LINK_COLOR = {
  threat_asset:       '#7c3aed99',   // Угроза → Актив
  vuln_asset:         '#d9770699',   // Уязвимость → Актив
  risk_asset:         '#ef444499',   // Риск → Актив
  risk_threat:        '#a78bfa55',   // Риск → Угроза (вспом.)
  risk_vulnerability: '#fbbf2455',   // Риск → Уязвимость (вспом.)
  threat_vuln:        '#f9731677',   // Угроза → Уязвимость
  risk_owner:         '#16a34a55',
  asset_owner:        '#0d948855',
};

/* nav target per type */
const NAV_PATH = {
  risk:          '/risks',
  asset:         '/assets',
  threat:        '/threats',
  vulnerability: '/vulnerabilities',
};

const nid = (type, id) => `${type}::${id}`;

/* split label into ≤3 lines of ≤12 chars each (asset nodes are bigger now) */
const wrapLines = (text, maxLen = 12, maxLines = 3) => {
  if (!text) return [''];
  if (text.length <= maxLen) return [text];
  const words = text.split(/[\s\-\/]+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const word = w.length > maxLen ? w.slice(0, maxLen - 1) + '…' : w;
    const attempt = cur ? `${cur} ${word}` : word;
    if (attempt.length <= maxLen) { cur = attempt; }
    else { if (cur) lines.push(cur); cur = word; }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, maxLines);
};

/* ── tooltip HTML ────────────────────────────────────────────────── */
const tooltipHTML = (d) => {
  const o = d.meta?.obj;
  const cfg = NODE_CFG[d.type];
  const rows = [];

  if (d.type === 'risk' && o) {
    if (o.risk_number)  rows.push(['Номер',       o.risk_number]);
    if (o.scenario)     rows.push(['Сценарий',    o.scenario.slice(0, 80) + (o.scenario.length > 80 ? '…' : '')]);
    if (o.criticality)  rows.push(['Критичность', o.criticality]);
    if (o.risk_level)   rows.push(['Уровень',     o.risk_level]);
    if (o.status)       rows.push(['Статус',      o.status]);
    if (o.owner)        rows.push(['Владелец',    o.owner]);
  } else if (d.type === 'asset' && o) {
    if (o.asset_number) rows.push(['Номер',       o.asset_number]);
    if (o.category)     rows.push(['Категория',   o.category]);
    if (o.criticality)  rows.push(['Критичность', o.criticality]);
    if (o.owner)        rows.push(['Владелец',    o.owner]);
    if (o.status)       rows.push(['Статус',      o.status]);
  } else if (d.type === 'threat' && o) {
    if (o.threat_number) rows.push(['Номер',      o.threat_number]);
    if (o.category)     rows.push(['Категория',   o.category]);
    if (o.source)       rows.push(['Источник',    o.source]);
    if (o.description)  rows.push(['Описание',    o.description.slice(0, 80) + (o.description.length > 80 ? '…' : '')]);
  } else if (d.type === 'vulnerability' && o) {
    if (o.vulnerability_number) rows.push(['Номер',  o.vulnerability_number]);
    if (o.severity)         rows.push(['Серьёзность', o.severity]);
    if (o.cvss_score != null) rows.push(['CVSS',      o.cvss_score]);
    if (o.vulnerability_type) rows.push(['Тип',       o.vulnerability_type]);
    if (o.status)           rows.push(['Статус',      o.status]);
  }

  const rowsHTML = rows.map(([k, v]) =>
    `<div style="display:flex;gap:8px;margin-top:3px;">
      <span style="color:#94a3b8;min-width:80px;flex-shrink:0;">${k}</span>
      <span style="color:#e2e8f0;">${v}</span>
    </div>`
  ).join('');

  return `
    <div style="font-weight:700;color:${cfg.color};font-size:10px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px;">${cfg.label}</div>
    <div style="font-size:13px;font-weight:600;color:#f8fafc;margin-bottom:6px;">${d.label}</div>
    ${rowsHTML}
    <div style="margin-top:8px;color:#64748b;font-size:10px;">Кликните для деталей</div>`;
};

/* ═══════════════════════════════════════════════════════════════════ */
const Graph = () => {
  const navigate  = useNavigate();
  const svgRef    = useRef(null);
  const simRef    = useRef(null);
  const zoomRef   = useRef(null);
  const tipRef    = useRef(null);

  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);

  /* ── fetch & build data ──────────────────────────────────────────── */
  const buildGraph = useCallback(async () => {
    setLoading(true);
    setSelected(null);
    if (tipRef.current) { tipRef.current.remove(); tipRef.current = null; }

    try {
      const [risksRes, assetsRes, threatsRes, vulnsRes] = await Promise.all([
        axios.get(`${API}/risks`,           { params: { limit: 500, skip: 0 } }),
        axios.get(`${API}/assets`,          { params: { limit: 500, skip: 0 } }),
        axios.get(`${API}/threats`,         { params: { limit: 500, skip: 0 } }),
        axios.get(`${API}/vulnerabilities`, { params: { limit: 500, skip: 0 } }),
      ]);

      const risks  = risksRes.data?.items   ?? risksRes.data   ?? [];
      const assets = assetsRes.data?.items  ?? assetsRes.data  ?? [];
      const threats= threatsRes.data?.items ?? threatsRes.data ?? [];
      const vulns  = vulnsRes.data?.items   ?? vulnsRes.data   ?? [];

      const nodes  = [];
      const links  = [];
      const nodeMap = new Map();

      const addNode = (id, type, label, meta = {}) => {
        if (nodeMap.has(id)) return;
        // label must come AFTER NODE_CFG spread so actual entity name wins
        const node = { id, type, meta, ...NODE_CFG[type], label };
        nodeMap.set(id, node);
        nodes.push(node);
      };

      /* entity nodes — use actual names */
      risks.forEach(r =>
        addNode(nid('risk', r.id), 'risk',
          r.scenario || r.risk_number || 'Риск', { obj: r }));
      assets.forEach(a =>
        addNode(nid('asset', a.id), 'asset',
          a.name || a.asset_number || 'Актив', { obj: a }));
      threats.forEach(t =>
        addNode(nid('threat', t.id), 'threat',
          t.description || t.threat_number || 'Угроза', { obj: t }));
      vulns.forEach(v =>
        addNode(nid('vulnerability', v.id), 'vulnerability',
          v.description || v.vulnerability_number || 'Уязвимость', { obj: v }));

      /* owner nodes */
      [...new Set(risks.filter(r => r.owner).map(r => r.owner))].forEach(o =>
        addNode(nid('risk_owner', o), 'risk_owner', o, {}));
      [...new Set(assets.filter(a => a.owner).map(a => a.owner))].forEach(o =>
        addNode(nid('asset_owner', o), 'asset_owner', o, {}));

      const addLink = (s, t, kind) => {
        if (nodeMap.has(s) && nodeMap.has(t)) links.push({ source: s, target: t, kind });
      };

      /* ── asset-centric link topology ────────────────────────────
         Base = Актив. Everything points to the asset it affects.
         Secondary edges show causal chain between non-asset nodes. */
      risks.forEach(r => {
        const src = nid('risk', r.id);
        // Risk → Asset (risk affects asset)
        (r.related_assets || []).forEach(id =>
          addLink(src, nid('asset', id), 'risk_asset'));
        // Risk → Threat / Vuln (causal chain, secondary)
        (r.related_threats || []).forEach(id =>
          addLink(src, nid('threat', id), 'risk_threat'));
        (r.related_vulnerabilities || []).forEach(id =>
          addLink(src, nid('vulnerability', id), 'risk_vulnerability'));
        if (r.owner) addLink(src, nid('risk_owner', r.owner), 'risk_owner');
      });
      assets.forEach(a => {
        const assetNode = nid('asset', a.id);
        // Threat → Asset (threat targets asset)
        (a.threats || []).forEach(id =>
          addLink(nid('threat', id), assetNode, 'threat_asset'));
        if (a.owner) addLink(assetNode, nid('asset_owner', a.owner), 'asset_owner');
      });
      threats.forEach(t => {
        // Vuln → Threat (vuln enables threat)
        if (t.related_vulnerability_id)
          addLink(nid('vulnerability', t.related_vulnerability_id),
                  nid('threat', t.id), 'threat_vuln');
      });
      vulns.forEach(v => {
        // Vuln → Asset (vulnerability resides in asset)
        if (v.related_asset_id)
          addLink(nid('vulnerability', v.id),
                  nid('asset', v.related_asset_id), 'vuln_asset');
      });

      /* filter isolated nodes */
      const connectedIds = new Set();
      links.forEach(l => { connectedIds.add(l.source); connectedIds.add(l.target); });
      const filteredNodes = nodes.filter(n => connectedIds.has(n.id));

      renderGraph({ nodes: filteredNodes, links });
    } catch (e) {
      console.error('Graph build error', e);
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line

  useEffect(() => { buildGraph(); return () => { tipRef.current?.remove(); }; }, [buildGraph]);

  /* ── D3 render ───────────────────────────────────────────────────── */
  const renderGraph = useCallback(({ nodes, links }) => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width  = svgRef.current?.clientWidth  || 900;
    const height = svgRef.current?.clientHeight || 620;

    const defs = svg.append('defs');

    /* glow filters */
    Object.entries(NODE_CFG).forEach(([type, cfg]) => {
      const f = defs.append('filter')
        .attr('id', `glow-${type}`)
        .attr('x', '-80%').attr('y', '-80%')
        .attr('width', '260%').attr('height', '260%');
      f.append('feGaussianBlur')
        .attr('in', 'SourceGraphic')
        .attr('stdDeviation', type === 'asset' ? '6' : '3')
        .attr('result', 'blur');
      const m = f.append('feMerge');
      m.append('feMergeNode').attr('in', 'blur');
      m.append('feMergeNode').attr('in', 'SourceGraphic');
    });

    /* zoom */
    const g    = svg.append('g').attr('class', 'graph-root');
    const zoom = d3.zoom().scaleExtent([0.05, 6])
      .on('zoom', e => g.attr('transform', e.transform));
    svg.call(zoom).on('dblclick.zoom', null);
    zoomRef.current = zoom;

    /* tooltip */
    const tip = d3.select(document.body).append('div')
      .style('position',        'fixed')
      .style('background',      '#0f172acc')
      .style('backdrop-filter', 'blur(8px)')
      .style('border',          '1px solid #334155')
      .style('color',           '#e2e8f0')
      .style('padding',         '10px 14px')
      .style('border-radius',   '10px')
      .style('font-size',       '12px')
      .style('line-height',     '1.5')
      .style('pointer-events',  'none')
      .style('opacity',         0)
      .style('z-index',         9999)
      .style('max-width',       '280px')
      .style('transition',      'opacity 0.15s');
    tipRef.current = tip.node();

    /* layers */
    const linkG = g.append('g');
    const nodeG = g.append('g');

    const linkSel = linkG.selectAll('line').data(links).enter().append('line')
      .attr('stroke',       d => LINK_COLOR[d.kind] ?? '#ffffff22')
      .attr('stroke-width', d => ['threat_asset','vuln_asset','risk_asset'].includes(d.kind) ? 1.8 : 1.1)
      .attr('stroke-linecap', 'round');

    /* drag */
    const drag = d3.drag()
      .on('start', (e, d) => { if (!e.active) simRef.current?.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on('drag',  (e, d) => { d.fx = e.x; d.fy = e.y; })
      .on('end',   (e, d) => { if (!e.active) simRef.current?.alphaTarget(0); d.fx = null; d.fy = null; });

    const nodeSel = nodeG.selectAll('g.node').data(nodes).enter()
      .append('g').attr('class', 'node').attr('data-type', d => d.type)
      .style('cursor', 'pointer')
      .call(drag)
      .on('mouseover', (e, d) => {
        tip.html(tooltipHTML(d))
          .style('left', `${e.clientX + 16}px`)
          .style('top',  `${e.clientY - 10}px`)
          .style('opacity', 1);
      })
      .on('mousemove', (e) => {
        tip.style('left', `${e.clientX + 16}px`)
           .style('top',  `${e.clientY - 10}px`);
      })
      .on('mouseout', () => tip.style('opacity', 0))
      .on('click', (e, d) => {
        e.stopPropagation();
        tip.style('opacity', 0);
        const connIds = new Set();
        links.forEach(l => {
          const sId = typeof l.source === 'object' ? l.source.id : l.source;
          const tId = typeof l.target === 'object' ? l.target.id : l.target;
          if (sId === d.id) connIds.add(tId);
          if (tId === d.id) connIds.add(sId);
        });
        setSelected({ node: d, connectedIds: connIds });
        highlight(d.id, connIds, nodeSel, linkSel);
      });

    svg.on('click', () => {
      setSelected(null);
      nodeSel.select('circle, rect, ellipse, polygon').attr('opacity', 1).attr('stroke-width', d => d.shape === 'rect' ? 2 : 1.5);
      nodeSel.selectAll('text').attr('opacity', 1);
      linkSel.attr('opacity', 1);
    });

    /* ── shapes per node type ── */
    // Актив → прямоугольник
    nodeSel.filter(d => d.shape === 'rect').append('rect')
      .attr('width',  d => d.r * 2)
      .attr('height', d => d.r * 1.2)
      .attr('x',      d => -d.r)
      .attr('y',      d => -d.r * 0.6)
      .attr('rx', 8).attr('ry', 8)
      .attr('fill',   d => d.color)
      .attr('stroke', '#ffffff66')
      .attr('stroke-width', 2)
      .attr('filter', d => `url(#glow-${d.type})`);

    // Риск → эллипс (шире, чем высокий)
    nodeSel.filter(d => d.shape === 'ellipse').append('ellipse')
      .attr('rx',     d => d.r * 1.4)
      .attr('ry',     d => d.r * 0.75)
      .attr('fill',   d => d.color + 'cc')
      .attr('stroke', '#ffffff33')
      .attr('stroke-width', 1.5)
      .attr('filter', d => `url(#glow-${d.type})`);

    // Угроза → ромб (diamond)
    nodeSel.filter(d => d.shape === 'diamond').append('polygon')
      .attr('points', d => {
        const s = d.r * 1.3;
        return `0,${-s} ${s},0 0,${s} ${-s},0`;
      })
      .attr('fill',   d => d.color + 'cc')
      .attr('stroke', '#ffffff33')
      .attr('stroke-width', 1.5)
      .attr('filter', d => `url(#glow-${d.type})`);

    // Уязвимость и владельцы → круг
    nodeSel.filter(d => d.shape === 'circle').append('circle')
      .attr('r',            d => d.r)
      .attr('fill',         d => d.type.endsWith('owner') ? d.color : d.color + 'bb')
      .attr('stroke',       d => d.type.endsWith('owner') ? '#ffffff44' : '#ffffff22')
      .attr('stroke-width', d => d.type.endsWith('owner') ? 1.5 : 1.5)
      .attr('filter',       d => `url(#glow-${d.type})`);

    /* ── labels ──────────────────────────────────────────────────────
       Assets (large r=32): text INSIDE the circle, white, wrapped to 3 lines
       Others: text BELOW circle, short truncation, readable via outline      */

    /* asset labels — inside circle */
    nodeSel.filter(d => d.type === 'asset').each(function(d) {
      const grp   = d3.select(this);
      const lines = wrapLines(d.label, 12, 3);
      const lineH = 10;
      const totalH = (lines.length - 1) * lineH;
      lines.forEach((line, i) => {
        grp.append('text')
          .text(line)
          .attr('text-anchor',       'middle')
          .attr('dominant-baseline', 'middle')
          .attr('y', -totalH / 2 + i * lineH)
          .attr('fill',        '#ffffff')
          .attr('font-size',   '7px')
          .attr('font-family', 'system-ui, sans-serif')
          .style('pointer-events', 'none')
          .style('user-select',   'none');
      });
    });

    /* risk / threat / vuln labels — inside their circle too, smaller */
    nodeSel.filter(d => d.type !== 'asset' && !d.type.endsWith('owner')).each(function(d) {
      const grp   = d3.select(this);
      const lines = wrapLines(d.label, 10, 2);
      const lineH = 9;
      const totalH = (lines.length - 1) * lineH;
      lines.forEach((line, i) => {
        grp.append('text')
          .text(line)
          .attr('text-anchor',       'middle')
          .attr('dominant-baseline', 'middle')
          .attr('y', -totalH / 2 + i * lineH)
          .attr('fill',        '#ffffff')
          .attr('font-size',   '6.5px')
          .attr('font-family', 'system-ui, sans-serif')
          .style('pointer-events', 'none')
          .style('user-select',   'none');
      });
    });

    /* owner labels — tiny, below */
    nodeSel.filter(d => d.type.endsWith('owner')).append('text')
      .text(d => d.label.length > 14 ? d.label.slice(0, 13) + '…' : d.label)
      .attr('text-anchor',  'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill',         '#e2e8f0')
      .attr('font-size',    '6px')
      .attr('font-family',  'system-ui, sans-serif')
      .attr('dy',           d => d.r + 9)
      .attr('opacity', 0.85)
      .style('pointer-events', 'none')
      .style('user-select',   'none');

    /* ── simulation — tighter clustering, nodes closer together ── */
    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id)
        .distance(d => {
          if (['threat_asset','vuln_asset','risk_asset'].includes(d.kind)) return 80;
          if (d.kind.endsWith('_owner')) return 50;
          return 65;
        })
        .strength(d => {
          if (['threat_asset','vuln_asset','risk_asset'].includes(d.kind)) return 0.9;
          if (d.kind.endsWith('_owner')) return 0.6;
          return 0.6;
        })
      )
      .force('charge',  d3.forceManyBody().strength(d => {
        if (d.type === 'asset') return -400;
        if (d.type.endsWith('owner')) return -80;
        return -150;
      }))
      .force('center',  d3.forceCenter(width / 2, height / 2).strength(0.08))
      .force('collide', d3.forceCollide().radius(d => d.r + 12).strength(0.7))
      .alphaDecay(0.025);

    simRef.current = sim;

    sim.on('tick', () => {
      /* offset line endpoints to circle edges + arrow gap */
      linkSel.each(function(d) {
        const sx = d.source.x, sy = d.source.y;
        const tx = d.target.x, ty = d.target.y;
        const dx = tx - sx, dy = ty - sy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const sr = d.source.r || 10;
        const tr = (d.target.r || 10) + 2;
        d3.select(this)
          .attr('x1', sx + (dx / dist) * sr)
          .attr('y1', sy + (dy / dist) * sr)
          .attr('x2', tx - (dx / dist) * tr)
          .attr('y2', ty - (dy / dist) * tr);
      });
      nodeSel.attr('transform', d => `translate(${d.x},${d.y})`);
    });

  }, []); // eslint-disable-line

  /* ── highlight on click ─────────────────────────────────────────── */
  const highlight = (id, connIds, ns, ls) => {
    // Handle all shape types
    ns.select('circle, rect, ellipse, polygon')
      .attr('opacity', d => (d.id === id || connIds.has(d.id)) ? 1 : 0.12)
      .attr('stroke-width', d => d.id === id ? 3.5 : (d.shape === 'rect' ? 2 : 1.5));
    ns.selectAll('text')
      .attr('opacity', d => (d.id === id || connIds.has(d.id)) ? 1 : 0.05);
    ls.attr('opacity', l => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      return (s === id || t === id) ? 1 : 0.04;
    });
  };

  /* ── zoom controls ──────────────────────────────────────────────── */
  const zoomBy    = f  => svgRef.current && d3.select(svgRef.current).transition().duration(250).call(zoomRef.current.scaleBy, f);
  const resetZoom = () => svgRef.current && d3.select(svgRef.current).transition().duration(400).call(zoomRef.current.transform, d3.zoomIdentity);

  /* ── open entity in its section ─────────────────────────────────── */
  const openEntity = (node) => {
    const path = NAV_PATH[node.type];
    if (!path || !node.meta?.obj?.id) return;
    navigate(path, { state: { openId: node.meta.obj.id } });
  };

  /* ── detail panel ───────────────────────────────────────────────── */
  const DetailPanel = () => {
    if (!selected) return null;
    const { node, connectedIds } = selected;
    const obj = node.meta?.obj;
    const cfg = NODE_CFG[node.type];
    const canNavigate = !!NAV_PATH[node.type] && !!obj?.id;

    const rows = [];
    if (node.type === 'risk' && obj) {
      rows.push(['Номер',       obj.risk_number]);
      rows.push(['Сценарий',    obj.scenario]);
      rows.push(['Критичность', obj.criticality]);
      rows.push(['Уровень',     obj.risk_level]);
      rows.push(['Статус',      obj.status]);
      rows.push(['Владелец',    obj.owner]);
    } else if (node.type === 'asset' && obj) {
      rows.push(['Номер',        obj.asset_number]);
      rows.push(['Название',     obj.name]);
      rows.push(['Категория',    obj.category]);
      rows.push(['Критичность',  obj.criticality]);
      rows.push(['Владелец',     obj.owner]);
      rows.push(['Статус',       obj.status]);
      if (obj.location) rows.push(['Расположение', obj.location]);
    } else if (node.type === 'threat' && obj) {
      rows.push(['Номер',    obj.threat_number]);
      rows.push(['Категория',obj.category]);
      rows.push(['Источник', obj.source]);
      if (obj.mitre_attack_id) rows.push(['MITRE', obj.mitre_attack_id]);
      if (obj.description)     rows.push(['Описание', obj.description]);
    } else if (node.type === 'vulnerability' && obj) {
      rows.push(['Номер',       obj.vulnerability_number]);
      rows.push(['Тип',         obj.vulnerability_type]);
      rows.push(['Серьёзность', obj.severity]);
      if (obj.cvss_score != null) rows.push(['CVSS', obj.cvss_score]);
      rows.push(['Статус',      obj.status]);
    } else if (node.type.endsWith('owner')) {
      rows.push(['Роль', cfg.label]);
    }

    return (
      <div className="absolute right-3 top-3 bottom-3 w-64 bg-slate-900/95 border border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden z-10">
        <div
          className="flex items-center justify-between px-4 py-3 border-b border-slate-700"
          style={{ borderLeftColor: cfg.color, borderLeftWidth: 3 }}
        >
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: cfg.color }}>
              {cfg.label}
            </div>
            <div className="text-sm font-bold text-white truncate mt-0.5">{node.label}</div>
          </div>
          <button
            onClick={() => setSelected(null)}
            className="p-1 hover:bg-slate-700 rounded-lg transition-colors ml-2 flex-shrink-0"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="space-y-1.5">
            {rows.filter(([, v]) => v != null && v !== '').map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <span className="text-xs text-slate-500 w-24 flex-shrink-0 pt-0.5">{k}</span>
                <span className="text-xs text-slate-300 flex-1 break-words">{String(v)}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500">Связей</div>
                <div className="text-lg font-bold text-white">{connectedIds.size}</div>
              </div>
              {canNavigate && (
                <Button
                  size="sm"
                  onClick={() => openEntity(node)}
                  className="gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Открыть
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* ── UI ─────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-full animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between px-1 pb-3 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-cyan-500" />
            Граф связей
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Активы — база · Угрозы, уязвимости и риски связаны с активами · Стрелки показывают направление связи
          </p>
        </div>
        <button
          onClick={buildGraph}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </button>
      </div>


      {/* Canvas */}
      <div className="relative flex-1 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950 min-h-0">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-slate-950/80">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500" />
              <span className="text-sm text-slate-400">Загрузка графа…</span>
            </div>
          </div>
        )}

        <svg ref={svgRef} className="w-full h-full" style={{ minHeight: 500 }} />

        {/* Zoom controls */}
        <div className="absolute left-3 bottom-3 flex flex-col gap-1.5 z-10">
          <button onClick={() => zoomBy(1.4)}   className="w-8 h-8 flex items-center justify-center bg-slate-800/90 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 transition-colors">
            <ZoomIn  className="w-4 h-4" />
          </button>
          <button onClick={() => zoomBy(1/1.4)} className="w-8 h-8 flex items-center justify-center bg-slate-800/90 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 transition-colors">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button onClick={resetZoom}           className="w-8 h-8 flex items-center justify-center bg-slate-800/90 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 transition-colors" title="Сбросить масштаб">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Hint */}
        {!loading && !selected && (
          <div className="absolute left-3 top-3 flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900/80 px-2.5 py-1.5 rounded-lg pointer-events-none z-10">
            <Info className="w-3.5 h-3.5 flex-shrink-0" />
            Наведите для деталей · Кликните для связей · Тащите узлы · Скролл — масштаб
          </div>
        )}

        {/* Legend */}
        {!loading && (
          <div className="absolute bottom-3 right-3 bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2.5 z-10 pointer-events-none">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Легенда</div>
            <div className="space-y-1.5">
              {Object.entries(NODE_CFG).map(([type, cfg]) => (
                <div key={type} className="flex items-center gap-2">
                  <svg width="18" height="16" style={{ flexShrink: 0 }}>
                    {cfg.shape === 'rect' && (
                      <rect x="1" y="3" width="16" height="10" rx="2" fill={cfg.color} fillOpacity="0.9" />
                    )}
                    {cfg.shape === 'ellipse' && (
                      <ellipse cx="9" cy="8" rx="8" ry="5" fill={cfg.color} fillOpacity="0.9" />
                    )}
                    {cfg.shape === 'diamond' && (
                      <polygon points="9,1 17,8 9,15 1,8" fill={cfg.color} fillOpacity="0.9" />
                    )}
                    {cfg.shape === 'circle' && (
                      <circle cx="9" cy="8" r={Math.min(cfg.r * 0.4 + 2, 7)} fill={cfg.color} fillOpacity="0.9" />
                    )}
                  </svg>
                  <span className="text-xs text-slate-300">{cfg.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <DetailPanel />
      </div>
    </div>
  );
};

export default Graph;
