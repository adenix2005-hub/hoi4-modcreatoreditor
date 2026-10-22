// Visual grid editor for focus trees and tech trees.
// Nodes sit on an integer grid (like HOI4's x/y). Drag to move, double-click empty space to add,
// use the toolbar link modes to connect nodes.
import { h, clear } from './ui.js';

const SVGNS = 'http://www.w3.org/2000/svg';

export function createGraph(cfg) {
  // cfg: { nodes(), cellW, cellH, nodeW, nodeH, renderNode(node, el), edges(), onMove(node,x,y), onSelect(node|null),
  //        onAdd(x,y), onLink(mode, from, to), linkModes:[{id,label,hint}], selected() }
  let zoom = cfg.zoom || 1;
  let mode = 'move';
  let linkFrom = null;
  const view = h('div', { class: 'graph-view', tabindex: 0 });
  const inner = h('div', { class: 'graph-inner' });
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.classList.add('graph-svg');
  inner.append(svg);
  view.append(inner);
  const status = h('span', { class: 'graph-status' });

  const toolbar = h('div', { class: 'graph-toolbar' });
  const modeBtns = {};
  const modes = [{ id: 'move', label: '✥ Select / Move', hint: 'Drag boxes to move them. Double-click empty space to add a new one.' }, ...(cfg.linkModes || [])];
  for (const m of modes) {
    modeBtns[m.id] = h('button', { class: 'small', title: m.hint, onclick: () => setMode(m.id) }, m.label);
    toolbar.append(modeBtns[m.id]);
  }
  toolbar.append(
    h('span', { class: 'sep' }),
    h('button', { class: 'small', title: 'Zoom out', onclick: () => setZoom(zoom / 1.2) }, '−'),
    h('button', { class: 'small', title: 'Zoom in', onclick: () => setZoom(zoom * 1.2) }, '+'),
    h('button', { class: 'small', title: 'Reset zoom', onclick: () => setZoom(1) }, '100%'),
    status,
  );

  function setMode(m) {
    mode = m;
    linkFrom = null;
    for (const [id, b] of Object.entries(modeBtns)) b.classList.toggle('active', id === m);
    const md = modes.find((x) => x.id === m);
    status.textContent = md ? md.hint : '';
    view.classList.toggle('linking', m !== 'move');
    draw();
  }
  function setZoom(z) {
    zoom = Math.max(0.3, Math.min(2, z));
    draw();
  }

  let bounds = { minX: 0, minY: 0 };
  const PAD = 2; // empty cells around the tree

  function cellToPx(x, y) {
    return [(x - bounds.minX + PAD) * cfg.cellW, (y - bounds.minY + PAD) * cfg.cellH];
  }

  function draw() {
    const nodes = cfg.nodes();
    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    bounds = { minX: Math.min(0, ...xs), minY: Math.min(0, ...ys), maxX: Math.max(10, ...xs), maxY: Math.max(6, ...ys) };
    const W = (bounds.maxX - bounds.minX + PAD * 2 + 1) * cfg.cellW;
    const H = (bounds.maxY - bounds.minY + PAD * 2 + 1) * cfg.cellH;
    inner.style.width = W + 'px';
    inner.style.height = H + 'px';
    inner.style.transform = `scale(${zoom})`;
    inner.style.backgroundSize = `${cfg.cellW}px ${cfg.cellH}px`;
    inner.style.backgroundPosition = `${(cfg.nodeW - cfg.cellW) / 2 + cfg.cellW / 2}px 0`;
    view.style.setProperty('--graph-w', W * zoom + 'px');
    view.querySelector('.graph-sizer')?.remove();
    view.append(h('div', { class: 'graph-sizer', style: { width: W * zoom + 'px', height: H * zoom + 'px' } }));
    // nodes
    inner.querySelectorAll('.gnode').forEach((n) => n.remove());
    const sel = cfg.selected && cfg.selected();
    for (const n of nodes) {
      const [px, py] = cellToPx(n.x, n.y);
      const el = h('div', { class: 'gnode' + (sel === n ? ' sel' : '') + (linkFrom === n ? ' linkfrom' : ''), style: { left: px + 'px', top: py + 'px', width: cfg.nodeW + 'px', height: cfg.nodeH + 'px' } });
      cfg.renderNode(n, el);
      attachNode(el, n);
      inner.append(el);
    }
    drawEdges(nodes);
  }

  function center(n, side) {
    const [px, py] = cellToPx(n.x, n.y);
    const cx = px + cfg.nodeW / 2;
    if (side === 'top') return [cx, py];
    if (side === 'bottom') return [cx, py + cfg.nodeH];
    return [cx, py + cfg.nodeH / 2];
  }

  function drawEdges(nodes) {
    clear(svg);
    svg.setAttribute('width', inner.style.width);
    svg.setAttribute('height', inner.style.height);
    const byId = new Map(nodes.map((n) => [n.id, n]));
    for (const e of cfg.edges()) {
      const a = byId.get(e.from);
      const b = byId.get(e.to);
      if (!a || !b) continue;
      const p = document.createElementNS(SVGNS, 'path');
      if (e.kind === 'exclusive') {
        const [x1, y1] = center(a, 'mid');
        const [x2, y2] = center(b, 'mid');
        p.setAttribute('d', `M${x1},${y1} L${x2},${y2}`);
        p.setAttribute('class', 'edge exclusive');
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        const t = document.createElementNS(SVGNS, 'text');
        t.setAttribute('x', mx);
        t.setAttribute('y', my + 5);
        t.setAttribute('class', 'edge-x');
        t.textContent = '✕';
        svg.append(p, t);
        continue;
      }
      const [x1, y1] = center(a, 'bottom');
      const [x2, y2] = center(b, 'top');
      const my = y2 - (cfg.cellH - cfg.nodeH) / 2;
      p.setAttribute('d', y2 > y1 ? `M${x1},${y1} L${x1},${my} L${x2},${my} L${x2},${y2}` : `M${x1},${y1} L${x2},${y2}`);
      p.setAttribute('class', 'edge ' + (e.kind || ''));
      svg.append(p);
    }
  }

  function attachNode(el, n) {
    el.addEventListener('pointerdown', (ev) => {
      if (ev.button !== 0) return;
      ev.stopPropagation();
      if (mode !== 'move') {
        if (!linkFrom) { linkFrom = n; cfg.onSelect && cfg.onSelect(n); draw(); status.textContent = 'Now click the box to connect it to (Esc to cancel).'; }
        else if (linkFrom !== n) { cfg.onLink(mode, linkFrom, n); linkFrom = null; setMode(mode); draw(); }
        return;
      }
      cfg.onSelect && cfg.onSelect(n);
      const startX = ev.clientX;
      const startY = ev.clientY;
      const [ox, oy] = cellToPx(n.x, n.y);
      let moved = false;
      el.setPointerCapture(ev.pointerId);
      const move = (e) => {
        const dx = (e.clientX - startX) / zoom;
        const dy = (e.clientY - startY) / zoom;
        if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
        if (!moved) return;
        el.style.left = ox + dx + 'px';
        el.style.top = oy + dy + 'px';
        el.classList.add('dragging');
      };
      const up = (e) => {
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerup', up);
        if (moved) {
          const dx = (e.clientX - startX) / zoom;
          const dy = (e.clientY - startY) / zoom;
          const nx = Math.round(n.x + dx / cfg.cellW);
          const ny = Math.round(n.y + dy / cfg.cellH);
          cfg.onMove(n, nx, ny);
        }
        draw();
      };
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', up);
    });
  }

  view.addEventListener('pointerdown', (ev) => {
    if (ev.target === view || ev.target === inner || ev.target === svg || ev.target.classList?.contains('graph-sizer')) {
      if (linkFrom) { linkFrom = null; setMode(mode); }
      else if (cfg.onSelect) { cfg.onSelect(null); draw(); }
    }
  });
  view.addEventListener('dblclick', (ev) => {
    if (ev.target.closest('.gnode')) return;
    const r = inner.getBoundingClientRect();
    const px = (ev.clientX - r.left) / zoom;
    const py = (ev.clientY - r.top) / zoom;
    const cx = Math.floor(px / cfg.cellW) - PAD + bounds.minX;
    const cy = Math.floor(py / cfg.cellH) - PAD + bounds.minY;
    cfg.onAdd && cfg.onAdd(cx, cy);
  });
  view.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { linkFrom = null; setMode('move'); }
    if ((e.key === 'Delete') && cfg.onDeleteKey && e.target === view) cfg.onDeleteKey();
  });
  view.addEventListener('wheel', (e) => {
    if (e.ctrlKey) { e.preventDefault(); setZoom(zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1)); }
  }, { passive: false });

  setMode('move');
    return { el: h('div', { class: 'graph' }, toolbar, view), draw, setMode, scrollToNode };

  function scrollToNode(n, instant) {
    const [px, py] = cellToPx(n.x, n.y);
    view.scrollTo({ left: (px + cfg.nodeW / 2) * zoom - view.clientWidth / 2, top: py * zoom - 40, behavior: instant ? 'auto' : 'smooth' });
  }
}
