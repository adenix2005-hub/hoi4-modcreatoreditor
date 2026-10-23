// Free-form node canvas: draggable nodes with ports, bezier wires, pan & zoom.
// Used by the script node editor and the Node Map.
import { h, clear } from './ui.js';

const SVGNS = 'http://www.w3.org/2000/svg';

// cfg: {
//   nodes(): [{id,x,y}], edges(): [{from, fromPort, to, toPort, cls?}],
//   renderNode(node) -> HTMLElement (must contain .nc-head as drag handle, and port elements
//                       with data-port, data-dir="in|out", data-kind),
//   canConnect(outPortInfo, inPortInfo) -> bool, onConnect(edge), onDisconnect(edge),
//   onMove(node, x, y), onSelect(node|null), onDblClick(node), onBackground(x, y, clientX, clientY),
//   onDelete(node)
// }
export function createNodeCanvas(cfg) {
  let zoom = 1;
  let panX = 40;
  let panY = 40;
  let selected = null;
  const view = h('div', { class: 'nc-view', tabindex: 0 });
  const world = h('div', { class: 'nc-world' });
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.classList.add('nc-svg');
  const tempPath = document.createElementNS(SVGNS, 'path');
  tempPath.classList.add('nc-wire', 'temp');
  world.append(svg);
  view.append(world);
  const nodeEls = new Map();

  function applyTransform() {
    world.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
    view.style.backgroundSize = `${24 * zoom}px ${24 * zoom}px`;
    view.style.backgroundPosition = `${panX}px ${panY}px`;
  }

  function toWorld(clientX, clientY) {
    const r = view.getBoundingClientRect();
    return [(clientX - r.left - panX) / zoom, (clientY - r.top - panY) / zoom];
  }

  function portPos(nodeId, portId, dir) {
    const el = nodeEls.get(nodeId);
    if (!el) return null;
    const p = el.querySelector(`[data-port="${CSS.escape(portId)}"][data-dir="${dir}"]`);
    if (!p) return null;
    const pr = p.getBoundingClientRect();
    return toWorld(pr.left + pr.width / 2, pr.top + pr.height / 2);
  }

  function wirePath(a, b) {
    const dx = Math.max(40, Math.abs(b[0] - a[0]) * 0.5);
    return `M${a[0]},${a[1]} C${a[0] + dx},${a[1]} ${b[0] - dx},${b[1]} ${b[0]},${b[1]}`;
  }

  function drawWires() {
    clear(svg);
    for (const e of cfg.edges()) {
      const a = portPos(e.from, e.fromPort, 'out');
      const b = portPos(e.to, e.toPort, 'in');
      if (!a || !b) continue;
      const hit = document.createElementNS(SVGNS, 'path');
      hit.setAttribute('d', wirePath(a, b));
      hit.classList.add('nc-wire-hit');
      const p = document.createElementNS(SVGNS, 'path');
      p.setAttribute('d', wirePath(a, b));
      p.classList.add('nc-wire');
      if (e.cls) p.classList.add(e.cls);
      const title = document.createElementNS(SVGNS, 'title');
      title.textContent = 'Click to remove this connection';
      hit.append(title);
      hit.addEventListener('click', (ev) => { ev.stopPropagation(); cfg.onDisconnect && cfg.onDisconnect(e); draw(); });
      svg.append(p, hit);
    }
    svg.append(tempPath);
  }

  function draw() {
    world.querySelectorAll('.nc-node').forEach((n) => n.remove());
    nodeEls.clear();
    for (const n of cfg.nodes()) {
      const el = cfg.renderNode(n);
      el.classList.add('nc-node');
      if (selected === n) el.classList.add('sel');
      el.style.left = n.x + 'px';
      el.style.top = n.y + 'px';
      nodeEls.set(n.id, el);
      attach(el, n);
      world.append(el);
    }
    applyTransform();
    // wires need laid-out ports
    drawWires();
  }

  function select(n) {
    selected = n;
    nodeEls.forEach((el, id) => el.classList.toggle('sel', !!n && id === n.id));
    cfg.onSelect && cfg.onSelect(n);
  }

  function attach(el, n) {
    const head = el.querySelector('.nc-head') || el;
    head.addEventListener('pointerdown', (ev) => {
      if (ev.button !== 0 || ev.target.closest('input,select,textarea,button')) return;
      ev.stopPropagation();
      select(n);
      const sx = ev.clientX;
      const sy = ev.clientY;
      const ox = n.x;
      const oy = n.y;
      head.setPointerCapture(ev.pointerId);
      const move = (e) => {
        n.x = Math.round(ox + (e.clientX - sx) / zoom);
        n.y = Math.round(oy + (e.clientY - sy) / zoom);
        el.style.left = n.x + 'px';
        el.style.top = n.y + 'px';
        drawWires();
      };
      const up = () => {
        head.removeEventListener('pointermove', move);
        head.removeEventListener('pointerup', up);
        if (n.x !== ox || n.y !== oy) cfg.onMove && cfg.onMove(n, n.x, n.y);
      };
      head.addEventListener('pointermove', move);
      head.addEventListener('pointerup', up);
    });
    el.addEventListener('pointerdown', (ev) => { if (!ev.target.closest('[data-port]')) { ev.stopPropagation(); if (selected !== n) select(n); } });
    el.addEventListener('dblclick', (ev) => { if (!ev.target.closest('input,select,textarea,button')) cfg.onDblClick && cfg.onDblClick(n); });
    el.querySelectorAll('[data-port]').forEach((p) => {
      p.addEventListener('pointerdown', (ev) => {
        ev.stopPropagation();
        ev.preventDefault();
        startWire(n, p, ev);
      });
    });
  }

  function portInfo(nodeId, p) {
    return { node: nodeId, port: p.dataset.port, dir: p.dataset.dir, kind: p.dataset.kind };
  }

  function startWire(n, p, ev) {
    const info = portInfo(n.id, p);
    const anchor = portPos(n.id, info.port, info.dir);
    view.classList.add('wiring');
    const move = (e) => {
      const m = toWorld(e.clientX, e.clientY);
      tempPath.setAttribute('d', info.dir === 'out' ? wirePath(anchor, m) : wirePath(m, anchor));
      document.querySelectorAll('.nc-port.hot').forEach((x) => x.classList.remove('hot'));
      const t = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-port]');
      if (t && t !== p) {
        const tn = t.closest('.nc-node');
        const tid = [...nodeEls.entries()].find(([, v]) => v === tn)?.[0];
        const ti = portInfo(tid, t);
        const [o, i] = info.dir === 'out' ? [info, ti] : [ti, info];
        if (o.dir === 'out' && i.dir === 'in' && o.node !== i.node && cfg.canConnect(o, i)) t.classList.add('hot');
      }
    };
    const up = (e) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      view.classList.remove('wiring');
      tempPath.setAttribute('d', '');
      document.querySelectorAll('.nc-port.hot').forEach((x) => x.classList.remove('hot'));
      const t = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-port]');
      if (!t || t === p) {
        // dropped on empty space: let the host offer to create a connected node
        if (!t && cfg.onDropWire) cfg.onDropWire(info, ...toWorld(e.clientX, e.clientY), e.clientX, e.clientY);
        return;
      }
      const tn = t.closest('.nc-node');
      const tid = [...nodeEls.entries()].find(([, v]) => v === tn)?.[0];
      if (tid === undefined) return;
      const ti = portInfo(tid, t);
      const [o, i] = info.dir === 'out' ? [info, ti] : [ti, info];
      if (o.dir !== 'out' || i.dir !== 'in' || o.node === i.node || !cfg.canConnect(o, i)) return;
      cfg.onConnect({ from: o.node, fromPort: o.port, to: i.node, toPort: i.port });
      draw();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  // pan
  view.addEventListener('pointerdown', (ev) => {
    if (ev.target.closest('.nc-node')) return;
    view.focus();
    select(null);
    const sx = ev.clientX;
    const sy = ev.clientY;
    const ox = panX;
    const oy = panY;
    view.setPointerCapture(ev.pointerId);
    view.classList.add('panning');
    const move = (e) => { panX = ox + e.clientX - sx; panY = oy + e.clientY - sy; applyTransform(); };
    const up = () => { view.removeEventListener('pointermove', move); view.removeEventListener('pointerup', up); view.classList.remove('panning'); };
    view.addEventListener('pointermove', move);
    view.addEventListener('pointerup', up);
  });
  view.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = view.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    const nz = Math.max(0.25, Math.min(2, zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
    panX = mx - ((mx - panX) * nz) / zoom;
    panY = my - ((my - panY) * nz) / zoom;
    zoom = nz;
    applyTransform();
  }, { passive: false });
  view.addEventListener('dblclick', (e) => {
    if (e.target.closest('.nc-node')) return;
    const [x, y] = toWorld(e.clientX, e.clientY);
    cfg.onBackground && cfg.onBackground(x, y, e.clientX, e.clientY);
  });
  view.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.nc-node')) return;
    e.preventDefault();
    const [x, y] = toWorld(e.clientX, e.clientY);
    cfg.onBackground && cfg.onBackground(x, y, e.clientX, e.clientY);
  });
  view.addEventListener('keydown', (e) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selected && !e.target.closest('input,textarea,select')) {
      cfg.onDelete && cfg.onDelete(selected);
      selected = null;
      draw();
    }
  });

  function fit() {
    const ns = cfg.nodes();
    if (!ns.length) { panX = 40; panY = 40; zoom = 1; applyTransform(); return; }
    const minX = Math.min(...ns.map((n) => n.x));
    const minY = Math.min(...ns.map((n) => n.y));
    const maxX = Math.max(...ns.map((n) => n.x + (nodeEls.get(n.id)?.offsetWidth || 200)));
    const maxY = Math.max(...ns.map((n) => n.y + (nodeEls.get(n.id)?.offsetHeight || 100)));
    const w = view.clientWidth || 800;
    const hh = view.clientHeight || 500;
    zoom = Math.max(0.3, Math.min(1, Math.min((w - 60) / (maxX - minX || 1), (hh - 60) / (maxY - minY || 1))));
    panX = 30 - minX * zoom;
    panY = 30 - minY * zoom;
    applyTransform();
    drawWires();
  }

  function viewCenter() {
    const r = view.getBoundingClientRect();
    return toWorld(r.left + r.width / 2 - 100, r.top + r.height / 2 - 40);
  }

  function zoomBy(f) { zoom = Math.max(0.25, Math.min(2, zoom * f)); applyTransform(); }

  applyTransform();
  return { el: view, draw, drawWires, fit, viewCenter, zoomBy, select, get selected() { return selected; } };
}

// helper to build a port element
export function port(id, dir, kind, label, extraCls = '') {
  return h('div', { class: `nc-port-row ${dir} ${extraCls}` },
    dir === 'in' ? h('span', { class: `nc-port ${kind}`, 'data-port': id, 'data-dir': dir, 'data-kind': kind, title: label }) : null,
    label ? h('span', { class: 'nc-port-label' }, label) : null,
    dir === 'out' ? h('span', { class: `nc-port ${kind}`, 'data-port': id, 'data-dir': dir, 'data-kind': kind, title: label }) : null);
}
