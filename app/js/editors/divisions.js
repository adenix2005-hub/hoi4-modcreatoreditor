import { h, clear, field, textIn, numIn, checkIn, masterList, editorLayout, modal } from '../ui.js';
import { project, markDirty, uid, clone } from '../state.js';
import { tagIn } from '../widgets.js';
import { allSubunits } from '../refs.js';

let cur = null;
const COLS = 5;
const ROWS = 5;

function blank() {
  return {
    uid: uid(), name: 'New Division', tag: project.countries[0]?.tag || '',
    grid: Array.from({ length: COLS }, () => Array(ROWS).fill('')),
    support: Array(5).fill(''),
    units: [], experience: 0, stockpile: true, priority: 1,
  };
}

export function divisionStats(d) {
  const all = allSubunits();
  const ids = [...d.grid.flat(), ...d.support].filter(Boolean);
  const st = { width: 0, manpower: 0, hp: 0, soft: 0, hard: 0, def: 0, bt: 0, orgSum: 0, orgN: 0, need: {}, battalions: 0, companies: 0 };
  for (const id of ids) {
    const u = all[id];
    if (!u) continue;
    if (u.support) st.companies++; else st.battalions++;
    st.width += u.width || 0;
    st.manpower += u.manpower || 0;
    st.hp += u.hp || 0;
    st.soft += u.soft || 0;
    st.hard += u.hard || 0;
    st.def += u.def || 0;
    st.bt += u.bt || 0;
    if (!u.support || u.org) { st.orgSum += u.org || 0; st.orgN++; }
    for (const [eq, n] of Object.entries(u.need || {})) st.need[eq] = (st.need[eq] || 0) + n;
  }
  st.org = st.orgN ? st.orgSum / st.orgN : 0;
  return st;
}

export function render(root) {
  if (cur && !project.divisions.includes(cur)) cur = null;
  clear(root);
  const detail = h('div');
  const list = masterList({
    items: project.divisions,
    title: (d) => d.name,
    subtitle: (d) => { const s = divisionStats(d); return `${d.tag || '—'} · width ${s.width} · ${s.battalions} btn`; },
    selected: () => cur,
    addLabel: 'New division',
    onAdd: () => { const d = blank(); project.divisions.push(d); cur = d; markDirty(); render(root); },
    onSelect: (d) => { cur = d; render(root); },
    onDelete: (d) => { project.divisions.splice(project.divisions.indexOf(d), 1); markDirty(); render(root); },
    onDuplicate: (d) => { const n = clone(d); n.uid = uid(); n.name += ' (copy)'; project.divisions.push(n); cur = n; markDirty(); render(root); },
  });
  root.append(editorLayout('Division Designer', 'Design division templates for a country, including your own battalions and support companies. You can also place ready-made divisions on the map at game start.', list, detail));
  if (!cur) { detail.append(h('div', { class: 'empty big' }, 'Select or add a division template.')); return; }
  const d = cur;
  const all = allSubunits();
  const statsBox = h('div', { class: 'div-stats' });
  const gridBox = h('div', { class: 'div-designer' });
  const drawStats = () => {
    clear(statsBox);
    const s = divisionStats(d);
    const row = (l, v) => h('div', { class: 'stat' }, h('span', null, l), h('b', null, v));
    statsBox.append(h('div', null,
      h('h4', null, 'Stats (approximate)'),
      row('Combat width', s.width), row('Manpower', s.manpower.toLocaleString()), row('Organisation', s.org.toFixed(1)), row('HP', s.hp.toFixed(1)),
      row('Soft attack', s.soft.toFixed(1)), row('Hard attack', s.hard.toFixed(1)), row('Defense', s.def.toFixed(1)), row('Breakthrough', s.bt.toFixed(1)),
      h('h4', null, 'Equipment needed'),
      Object.keys(s.need).length ? Object.entries(s.need).map(([eq, n]) => row(eq, n)) : h('div', { class: 'hint' }, 'none'),
    ));
  };
  const slot = (id, onPick, support) => {
    const u = id && all[id];
    return h('div', { class: 'div-slot' + (u ? ' filled' : '') + (support ? ' support' : ''), title: u ? u.name : 'Empty — click to add', onclick: () => pickUnit(support, (nid) => { onPick(nid); markDirty(); drawGrid(); list.redraw(); }) },
      u ? [u.img ? h('img', { src: u.img }) : h('div', { class: 'slot-icon' }, (u.name || id).slice(0, 2).toUpperCase()), h('div', { class: 'slot-name' }, u.name || id)] : h('span', { class: 'plus' }, '+'));
  };
  const drawGrid = () => {
    clear(gridBox);
    const sup = h('div', { class: 'div-col support-col' }, h('div', { class: 'col-head' }, 'Support'));
    d.support.forEach((id, i) => sup.append(slot(id, (n) => (d.support[i] = n), true)));
    const cols = h('div', { class: 'div-cols' });
    d.grid.forEach((col, ci) => {
      const c = h('div', { class: 'div-col' }, h('div', { class: 'col-head' }, `Column ${ci + 1}`));
      col.forEach((id, ri) => c.append(slot(id, (n) => (d.grid[ci][ri] = n), false)));
      cols.append(c);
    });
    gridBox.append(sup, cols, statsBox);
    drawStats();
  };
  drawGrid();
  const unitsBox = h('div');
  const drawUnits = () => {
    clear(unitsBox);
    d.units.forEach((u, i) => unitsBox.append(h('div', { class: 'grid3' },
      field('How many', numIn(u, 'count', { min: 1 })),
      field('Province id (location)', numIn(u, 'location', { min: 1 }), 'Find ids in-game with the "tdebug" console command.'),
      h('div', null, h('button', { class: 'small danger', onclick: () => { d.units.splice(i, 1); markDirty(); drawUnits(); } }, 'Remove')))));
    unitsBox.append(h('button', { class: 'small', onclick: () => { d.units.push({ count: 1, location: 1 }); markDirty(); drawUnits(); } }, '+ Place divisions on the map'));
  };
  drawUnits();
  detail.append(
    h('div', { class: 'grid3' }, field('Template name', textIn(d, 'name', { onChange: () => list.redraw() })), field('Country', tagIn(d, 'tag', { onChange: () => list.redraw() })), field('Starting experience (0–1)', numIn(d, 'experience', { min: 0, max: 1 }))),
    h('p', { class: 'hint' }, 'Click a slot to put a battalion or company in it. Click a filled slot to change or clear it.'),
    gridBox,
    h('div', { class: 'section' }, h('h3', null, 'Divisions at game start'), unitsBox,
      checkIn(d, 'stockpile', 'Also give the country enough equipment to fill these divisions')),
  );
}

function pickUnit(support, onPick) {
  const all = allSubunits();
  const groups = {};
  for (const [id, u] of Object.entries(all)) {
    if (!!u.support !== !!support) continue;
    const g = u.custom ? 'Your units' : (u.group || 'other');
    (groups[g] = groups[g] || []).push([id, u]);
  }
  let close;
  const body = h('div', { class: 'unit-picker' },
    Object.entries(groups).map(([g, us]) => h('div', null, h('div', { class: 'builder-cat' }, g),
      h('div', { class: 'unit-grid' }, us.map(([id, u]) => h('button', { class: 'unit-btn', onclick: () => { onPick(id); close(); } },
        u.img ? h('img', { src: u.img }) : null, h('span', null, u.name), h('small', null, support ? '' : `width ${u.width}`)))))),
  );
  close = modal(support ? 'Pick a support company' : 'Pick a battalion', body, [{ label: 'Clear slot', danger: true, onClick: () => onPick('') }, { label: 'Cancel' }], { wide: true });
}
