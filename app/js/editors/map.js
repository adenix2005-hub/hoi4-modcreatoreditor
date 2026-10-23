// Node Map: techs, equipment, battalions, divisions, people, traits and countries as nodes.
// Wires are the real links between them — drag a wire to create a link, click it to remove.
import { h, clear, field, textIn, toast, imgThumb } from '../ui.js';
import { project, markDirty, uid, uniqueId, prefix } from '../state.js';
import { createNodeCanvas } from '../nodecanvas.js';
import * as D from '../data.js';
import { allTechIds } from '../refs.js';
import * as tech from './tech.js';
import * as units from './units.js';
import * as divisions from './divisions.js';
import * as characters from './characters.js';
import * as traits from './traits.js';
import * as countries from './countries.js';

let view = 'military';
let canvas = null;
let selected = null;

// ---------------------------------------------------------------- node kinds
const KINDS = {
  tech: {
    label: 'Technology', icon: '🔬', list: () => project.technologies, col: 0, cls: 'k-tech',
    ports: [['in', 'req', 'tech', 'Needs tech'], ['out', 'leads', 'tech', 'Leads to tech'], ['out', 'unlock', 'unlock', 'Unlocks']],
    sub: (t) => `${t.year} · ${t.folder.replace(/_folder$/, '')}${t.allowTags.length ? ' · ' + t.allowTags.join(' ') : ''}`,
    create: () => { const t = tech.newTech(0, 0, 'infantry_folder'); let y = 0; while (project.technologies.some((o) => o.folder === t.folder && o.x === t.x && o.y === y)) y++; t.y = y; project.technologies.push(t); return t; },
    open: (t, go) => { tech.select(t); go('tech'); },
  },
  equipment: {
    label: 'Equipment', icon: '🔫', list: () => project.equipment, col: 1, cls: 'k-equip',
    ports: [['in', 'unlock', 'unlock', 'Unlocked by'], ['out', 'uses', 'equip', 'Used by']],
    sub: (e) => `${e.type} · ${e.year} · soft ${e.soft_attack ?? 0} / hard ${e.hard_attack ?? 0}`,
    create: () => { const e = units.newEquipment(); project.equipment.push(e); return e; },
    open: (e, go) => { units.select(e, 'equipment'); go('units'); },
  },
  subunit: {
    label: 'Battalion / company', icon: '🪖', list: () => project.subunits, col: 2, cls: 'k-unit',
    ports: [['in', 'unlock', 'unlock', 'Unlocked by'], ['in', 'equip', 'equip', 'Uses equipment'], ['out', 'div', 'unit', 'Used in division']],
    sub: (s) => `${s.support ? 'support company' : 'battalion · width ' + s.width} · ${s.manpower} men`,
    create: (preset) => { const s = units.newSubunit(preset || 'line'); project.subunits.push(s); return s; },
    open: (s, go) => { units.select(s, 'subunits'); go('units'); },
  },
  division: {
    label: 'Division template', icon: '🎖', list: () => project.divisions, col: 3, cls: 'k-div',
    ports: [['in', 'units', 'unit', 'Battalions & companies']],
    sub: (d) => { const st = divisions.divisionStats(d); return `${d.tag || '—'} · width ${st.width} · ${st.battalions}+${st.companies}`; },
    create: () => { const d = divisions.blank(); project.divisions.push(d); return d; },
    open: (d, go) => { divisions.select(d); go('divisions'); },
  },
  country: {
    label: 'Country', icon: '🏳', list: () => project.countries, col: 0, cls: 'k-country', title: (c) => `${c.tag || '???'} ${c.name || ''}`,
    ports: [['out', 'people', 'country', 'People']],
    sub: (c) => (c.isNew ? 'new country' : 'vanilla country'),
    img: (c) => c.flag,
    create: () => { const c = countries.newCountry(''); c.tag = 'ZZ' + String(project.countries.length % 10); c.isNew = true; project.countries.push(c); return c; },
    open: (c, go) => { countries.select(c); go('countries'); },
  },
  ltrait: {
    label: 'Leader / advisor trait', icon: '⭐', list: () => project.leaderTraits, col: 0, cls: 'k-trait', row0: 'after-country',
    ports: [['out', 'give', 'ltrait', 'Given to']],
    sub: (t) => t.mods.map((m) => `${m.key} ${m.value}`).join(', ') || 'no bonuses yet',
    create: () => { const t = { uid: uid(), id: uniqueId(`${prefix()}_new_trait`, project.leaderTraits.map((x) => x.id)), name: 'New Trait', desc: '', mods: [], extra: '', file: '' }; project.leaderTraits.push(t); return t; },
    open: (t, go) => { traits.select(t, 'leader'); go('traits'); },
  },
  utrait: {
    label: 'General / admiral trait', icon: '🎯', list: () => project.unitTraits, col: 0, cls: 'k-trait',
    ports: [['out', 'give', 'utrait', 'Given to']],
    sub: (t) => t.mods.map((m) => `${m.key} ${m.value}`).join(', ') || 'no bonuses yet',
    create: () => { const t = { uid: uid(), id: uniqueId(`${prefix()}_new_unit_trait`, project.unitTraits.map((x) => x.id)), name: 'New Trait', desc: '', mods: [], extra: '', file: '', type: 'land', traitType: 'personality_trait', attack: 0, defense: 0, planning: 0, logistics: 0, maneuvering: 0, coordination: 0 }; project.unitTraits.push(t); return t; },
    open: (t, go) => { traits.select(t, 'unit'); go('traits'); },
  },
  person: {
    label: 'Person', icon: '👤', list: () => project.characters, col: 1, cls: 'k-person',
    ports: [['in', 'country', 'country', 'Country'], ['in', 'ltraits', 'ltrait', 'Leader/advisor traits'], ['in', 'utraits', 'utrait', 'General/admiral traits']],
    sub: (c) => [c.leader.on && 'Leader', c.advisor.on && 'Advisor', c.general.on && 'General', c.admiral.on && 'Admiral'].filter(Boolean).join(', ') || 'no role yet',
    img: (c) => c.portrait,
    create: () => { const c = characters.blank(); c.tag = project.countries[0]?.tag || ''; c.id = uniqueId(`${c.tag || 'TAG'}_new_person`, project.characters.map((x) => x.id)); project.characters.push(c); return c; },
    open: (c, go) => { characters.select(c); go('characters'); },
  },
};

const VIEWS = {
  military: { label: 'Technology → Equipment → Units → Divisions', kinds: ['tech', 'equipment', 'subunit', 'division'] },
  people: { label: 'Countries & Traits → People', kinds: ['country', 'ltrait', 'utrait', 'person'] },
};

const nodeId = (kind, item) => `${kind}:${item.uid || (item.uid = uid())}`;
const titleOf = (kind, item) => (KINDS[kind].title ? KINDS[kind].title(item) : item.name || item.id || '(unnamed)');

function layoutPos(kind, item, index) {
  project.mapLayout = project.mapLayout || {};
  const key = nodeId(kind, item);
  if (!project.mapLayout[key]) {
    const k = KINDS[kind];
    let col = k.col;
    let row = index;
    if (view === 'people') {
      // left column: countries, then leader traits, then unit traits
      if (kind === 'ltrait') row = project.countries.length + index + 1;
      if (kind === 'utrait') row = project.countries.length + project.leaderTraits.length + index + 2;
    }
    project.mapLayout[key] = { x: col * 330, y: row * 120 };
  }
  return project.mapLayout[key];
}

function buildNodes() {
  const out = [];
  for (const kind of VIEWS[view].kinds) {
    KINDS[kind].list().forEach((item, i) => {
      const pos = layoutPos(kind, item, i);
      out.push({ id: nodeId(kind, item), kind, item, get x() { return pos.x; }, set x(v) { pos.x = v; }, get y() { return pos.y; }, set y(v) { pos.y = v; } });
    });
  }
  return out;
}

let nodes = [];
const find = (id) => nodes.find((n) => n.id === id);

// ---------------------------------------------------------------- relations
function buildEdges() {
  const e = [];
  const idx = (kind, pred) => nodes.filter((n) => n.kind === kind && pred(n.item));
  if (view === 'military') {
    for (const t of nodes.filter((n) => n.kind === 'tech')) {
      for (const to of idx('tech', (x) => t.item.leadsTo.includes(x.id))) e.push({ from: t.id, fromPort: 'leads', to: to.id, toPort: 'req', cls: 'exec' });
      for (const to of idx('equipment', (x) => t.item.enableEquip.includes(x.id))) e.push({ from: t.id, fromPort: 'unlock', to: to.id, toPort: 'unlock', cls: 'unlock' });
      for (const to of idx('subunit', (x) => t.item.enableUnits.includes(x.id))) e.push({ from: t.id, fromPort: 'unlock', to: to.id, toPort: 'unlock', cls: 'unlock' });
    }
    for (const eq of nodes.filter((n) => n.kind === 'equipment')) {
      for (const to of idx('subunit', (s) => (s.need || []).some((x) => x.eq === eq.item.id))) e.push({ from: eq.id, fromPort: 'uses', to: to.id, toPort: 'equip', cls: 'uses' });
    }
    for (const su of nodes.filter((n) => n.kind === 'subunit')) {
      for (const to of idx('division', (d) => [...d.grid.flat(), ...d.support].includes(su.item.id))) e.push({ from: su.id, fromPort: 'div', to: to.id, toPort: 'units', cls: 'exec' });
    }
  } else {
    for (const c of nodes.filter((n) => n.kind === 'country')) {
      for (const to of idx('person', (p) => p.tag && p.tag === c.item.tag)) e.push({ from: c.id, fromPort: 'people', to: to.id, toPort: 'country', cls: 'exec' });
    }
    for (const t of nodes.filter((n) => n.kind === 'ltrait')) {
      for (const to of idx('person', (p) => p.leader.traits.includes(t.item.id) || p.advisor.traits.includes(t.item.id))) e.push({ from: t.id, fromPort: 'give', to: to.id, toPort: 'ltraits', cls: 'trait' });
    }
    for (const t of nodes.filter((n) => n.kind === 'utrait')) {
      for (const to of idx('person', (p) => p.general.traits.includes(t.item.id) || p.admiral.traits.includes(t.item.id))) e.push({ from: t.id, fromPort: 'give', to: to.id, toPort: 'utraits', cls: 'trait' });
    }
  }
  return e;
}

function link(a, b, on) {
  const A = a.item;
  const B = b.item;
  const toggle = (arr, v) => { const i = arr.indexOf(v); if (on && i < 0) arr.push(v); if (!on && i >= 0) arr.splice(i, 1); };
  if (a.kind === 'tech' && b.kind === 'tech') toggle(A.leadsTo, B.id);
  else if (a.kind === 'tech' && b.kind === 'equipment') toggle(A.enableEquip, B.id);
  else if (a.kind === 'tech' && b.kind === 'subunit') toggle(A.enableUnits, B.id);
  else if (a.kind === 'equipment' && b.kind === 'subunit') {
    B.need = B.need || [];
    if (on && !B.need.some((x) => x.eq === A.id)) B.need.push({ eq: A.id, n: B.support ? 20 : 100 });
    if (!on) B.need = B.need.filter((x) => x.eq !== A.id);
  } else if (a.kind === 'subunit' && b.kind === 'division') {
    if (on) {
      if (A.support) {
        const i = B.support.indexOf('');
        if (i < 0) { toast('The support column is full', 'warn'); return; }
        B.support[i] = A.id;
      } else {
        // first empty slot, filling column by column
        let placed = false;
        for (const col of B.grid) { const i = col.indexOf(''); if (i >= 0) { col[i] = A.id; placed = true; break; } }
        if (!placed) { toast('That division is full', 'warn'); return; }
      }
    } else {
      B.grid = B.grid.map((col) => col.map((x) => (x === A.id ? '' : x)));
      B.support = B.support.map((x) => (x === A.id ? '' : x));
    }
  } else if (a.kind === 'country' && b.kind === 'person') {
    B.tag = on ? A.tag : '';
  } else if (a.kind === 'ltrait' && b.kind === 'person') {
    if (on) {
      if (B.advisor.on && !B.leader.on) toggle(B.advisor.traits, A.id);
      else { B.leader.on = true; toggle(B.leader.traits, A.id); }
    } else { toggle(B.leader.traits, A.id); toggle(B.advisor.traits, A.id); }
  } else if (a.kind === 'utrait' && b.kind === 'person') {
    if (on) {
      if (B.admiral.on && !B.general.on) toggle(B.admiral.traits, A.id);
      else { B.general.on = true; toggle(B.general.traits, A.id); }
    } else { toggle(B.general.traits, A.id); toggle(B.admiral.traits, A.id); }
  } else return;
  markDirty();
}

// ---------------------------------------------------------------- rendering
function renderEntity(n, actions) {
  const k = KINDS[n.kind];
  const img = k.img ? k.img(n.item) : n.item.img;
  const card = h('div', { class: `nc-card entity ${k.cls}` },
    h('div', { class: 'nc-head' }, h('span', null, k.icon), h('span', { class: 'nc-title' }, titleOf(n.kind, n.item))),
    h('div', { class: 'nc-body' },
      img ? h('img', { src: img, class: 'map-img' }) : null,
      h('div', { class: 'map-sub' }, k.label + ' · ' + k.sub(n.item)),
      k.ports.map(([dir, id, kind, label]) => h('div', { class: `nc-port-row ${dir}` },
        dir === 'in' ? h('span', { class: `nc-port link p-${kind}`, 'data-port': id, 'data-dir': 'in', 'data-kind': kind, title: label }) : null,
        h('span', { class: 'nc-port-label' }, label),
        dir === 'out' ? h('span', { class: `nc-port link p-${kind}`, 'data-port': id, 'data-dir': 'out', 'data-kind': kind, title: label }) : null)),
    ));
  void actions;
  return card;
}

function inspector(box, actions) {
  clear(box);
  if (!selected) {
    box.append(h('div', { class: 'hint' }, 'Click a node to see it here. Double-click a node to open it in its full editor.'));
    return;
  }
  const k = KINDS[selected.kind];
  const item = selected.item;
  box.append(
    h('div', { class: 'row' }, h('b', null, `${k.icon} ${k.label}`), h('span', { class: 'grow' }),
      h('button', { class: 'small primary', onclick: () => k.open(item, actions.go) }, 'Open full editor →')),
    selected.kind === 'country' ? null : field('Name', textIn(item, 'name', { onChange: () => canvas.draw() })),
    h('div', { class: 'hint' }, 'id: ' + (item.id || item.tag || '')),
  );
}

export function render(root, actions) {
  clear(root);
  nodes = buildNodes();
  if (selected && !nodes.some((n) => n.id === selected.id)) selected = null;
  const insp = h('div', { class: 'map-inspector' });
  const adds = h('div', { class: 'row' }, VIEWS[view].kinds.flatMap((kind) => {
    const k = KINDS[kind];
    if (kind === 'subunit') return [h('button', { class: 'small', onclick: () => addEntity(kind, 'line', null, actions, root) }, '+ Battalion'), h('button', { class: 'small', onclick: () => addEntity(kind, 'support', null, actions, root) }, '+ Support company')];
    return [h('button', { class: 'small', onclick: () => addEntity(kind, null, null, actions, root) }, `+ ${k.label}`)];
  }));
  const viewTabs = h('div', { class: 'tabs' }, Object.entries(VIEWS).map(([id, v]) => h('button', { class: view === id ? 'active' : '', onclick: () => { view = id; selected = null; render(root, actions); } }, v.label)));
  const box = h('div', { class: 'map-canvas' });
  root.append(h('div', { class: 'editor full' },
    h('div', { class: 'editor-head' }, h('h1', null, 'Node Map'),
      h('p', { class: 'intro' }, 'Everything as connected nodes. Drag from a dot on one node to a dot on another to link them (e.g. a technology unlocks equipment, equipment is used by a battalion, a battalion goes in a division, a trait goes to a person). Click a wire to remove that link. Double-click a node to open its full editor. Drop a wire on empty space to create a new connected node.'),
      viewTabs, adds),
    h('div', { class: 'map-layout' }, box, insp)));
  canvas = createNodeCanvas({
    nodes: () => nodes,
    edges: buildEdges,
    renderNode: (n) => renderEntity(n, actions),
    canConnect: (o, i) => o.kind === i.kind,
    onConnect: (e) => { link(find(e.from), find(e.to), true); refreshNodes(); },
    onDisconnect: (e) => { link(find(e.from), find(e.to), false); refreshNodes(); },
    onMove: () => markDirty(),
    onSelect: (n) => { selected = n; inspector(insp, actions); },
    onDblClick: (n) => KINDS[n.kind].open(n.item, actions.go),
    onDelete: () => toast('Delete items from their own editor (double-click the node).', 'warn'),
    onDropWire: (info, x, y, cx, cy) => dropMenu(info, x, y, cx, cy, actions, root),
    onBackground: () => {},
  });
  box.append(canvas.el);
  canvas.draw();
  inspector(insp, actions);
  requestAnimationFrame(() => canvas.fit());
  if (!nodes.length) box.append(h('div', { class: 'map-empty' }, 'Nothing here yet — use the + buttons above to add nodes.'));

  function refreshNodes() { canvas.draw(); }
}

function addEntity(kind, preset, at, actions, root, wire) {
  const item = KINDS[kind].create(preset);
  markDirty();
  if (at) { project.mapLayout = project.mapLayout || {}; project.mapLayout[nodeId(kind, item)] = { x: Math.round(at[0]), y: Math.round(at[1]) }; }
  else {
    // put it at the bottom of its own column
    project.mapLayout = project.mapLayout || {};
    const col = KINDS[kind].col * 330;
    const ys = buildNodes().filter((n) => n.item !== item && Math.abs(n.x - col) < 160).map((n) => n.y);
    project.mapLayout[nodeId(kind, item)] = { x: col, y: ys.length ? Math.max(...ys) + 150 : 0 };
  }
  nodes = buildNodes();
  const n = nodes.find((x) => x.item === item);
  if (wire && n) {
    const other = find(wire.node);
    if (wire.dir === 'out') link(other, n, true); else link(n, other, true);
  }
  selected = n;
  render(root, actions);
}

// What can be created when a wire is dropped on empty space
function dropMenu(info, x, y, cx, cy, actions, root) {
  const options = [];
  for (const kind of VIEWS[view].kinds) {
    for (const [dir, , pk] of KINDS[kind].ports) {
      if (pk === info.kind && dir !== info.dir) {
        if (kind === 'subunit') { options.push([kind, 'line', '+ New battalion']); options.push([kind, 'support', '+ New support company']); }
        else options.push([kind, null, `+ New ${KINDS[kind].label.toLowerCase()}`]);
        break;
      }
    }
  }
  if (!options.length) return;
  document.querySelector('.ne-quick')?.remove();
  const box = h('div', { class: 'ne-quick', style: { left: Math.min(cx, window.innerWidth - 280) + 'px', top: Math.min(cy, window.innerHeight - 200) + 'px' } },
    h('div', { class: 'hint' }, 'Create and connect:'),
    options.map(([kind, preset, label]) => h('div', { class: 'ne-pal-item', onclick: () => { box.remove(); addEntity(kind, preset, [x, y], actions, root, info); } }, label)));
  document.body.append(box);
  const off = (e) => { if (!box.contains(e.target)) { box.remove(); document.removeEventListener('pointerdown', off, true); } };
  setTimeout(() => document.addEventListener('pointerdown', off, true), 0);
}

void D; void allTechIds; void imgThumb;
