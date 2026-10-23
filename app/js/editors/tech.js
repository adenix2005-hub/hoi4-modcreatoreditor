import { h, clear, field, textIn, idIn, numIn, areaIn, selectIn, toast, confirmDlg, slug, editorLayout, masterList } from '../ui.js';
import { project, markDirty, uid, uniqueId, prefix, clone } from '../state.js';
import { modifierList, picturePicker, chipList } from '../widgets.js';
import { createGraph } from '../graph.js';
import * as D from '../data.js';
import { allTechIds, allEquipmentIds, allSubunits } from '../refs.js';

let tab = 'tree';
let folder = 'infantry_folder';
let cur = null;
let graph = null;
let props = null;
let curStart = null;

function folderOptions() {
  return [...D.TECH_FOLDERS, ...project.techFolders.map((f) => [f.id, f.name + ' (custom tab)'])];
}

export function render(root) {
  clear(root);
  const tabs = h('div', { class: 'tabs' });
  for (const [id, label] of [['tree', 'Technology tree'], ['start', 'Starting techs per country'], ['folders', 'New tech tabs (experimental)']]) {
    tabs.append(h('button', { class: tab === id ? 'active' : '', onclick: () => { tab = id; render(root); } }, label));
  }
  const body = h('div', { class: 'tech-body' });
  root.append(h('div', { class: 'editor full' },
    h('div', { class: 'editor-head' }, h('h1', null, 'Technology'), h('p', { class: 'intro' }, 'Add your own technologies to any research tab, decide which countries can research them, and set which techs each country (or every country) starts with.'), tabs),
    body));
  if (tab === 'tree') drawTree(body, root);
  else if (tab === 'start') drawStart(body, root);
  else drawFolders(body, root);
}

function drawTree(body, root) {
  const techs = () => project.technologies.filter((t) => t.folder === folder);
  if (cur && !project.technologies.includes(cur)) cur = null;
  const folderSel = selectIn({ folder }, 'folder', folderOptions(), { onChange: (v) => { folder = v; cur = null; render(root); } });
  props = h('div', { class: 'focus-props' });
  const canvas = h('div', { class: 'focus-canvas' });
  canvas.append(h('div', { class: 'row tech-top' }, h('b', null, 'Research tab: '), folderSel,
    h('span', { class: 'hint' }, ' Only your own techs are shown here. Double-click to add one. Link them with "Leads to".')));
  graph = createGraph({
    cellW: 170, cellH: 90, nodeW: 158, nodeH: 64,
    nodes: techs,
    selected: () => cur,
    renderNode: (t, el) => {
      el.classList.add('tech-node');
      el.append(t.img ? h('img', { src: t.img, class: 'tn-icon' }) : h('div', { class: 'tn-icon ph' }, '⚙'),
        h('div', { class: 'tn-text' }, h('div', { class: 'fn-name' }, t.name || t.id), h('div', { class: 'fn-days' }, String(t.year))));
      if (t.allowTags.length) el.append(h('div', { class: 'tn-tags' }, t.allowTags.join(' ')));
    },
    edges: () => techs().flatMap((t) => [
      ...t.leadsTo.map((x) => ({ from: t.id, to: x })),
      ...(t.xor || []).filter((x) => t.id < x).map((x) => ({ from: t.id, to: x, kind: 'exclusive' })),
    ]),
    onMove: (t, x, y) => { t.x = x; t.y = y; markDirty(); drawProps(); },
    onSelect: (t) => { cur = t; drawProps(); },
    onAdd: (x, y) => {
      const t = newTech(x, y, folder);
      project.technologies.push(t);
      cur = t;
      markDirty();
      graph.draw();
      drawProps();
    },
    linkModes: [
      { id: 'lead', label: '→ Leads to', hint: 'Click the earlier tech, then the tech it unlocks.' },
      { id: 'xor', label: '✕ Either/or', hint: 'Click two techs — researching one blocks the other.' },
      { id: 'unlink', label: '✂ Remove link', hint: 'Click two linked techs.' },
    ],
    onLink: (mode, a, b) => {
      if (mode === 'lead') { if (!a.leadsTo.includes(b.id)) a.leadsTo.push(b.id); }
      else if (mode === 'xor') { a.xor = a.xor || []; b.xor = b.xor || []; if (!a.xor.includes(b.id)) a.xor.push(b.id); if (!b.xor.includes(a.id)) b.xor.push(a.id); }
      else for (const [x, y] of [[a, b], [b, a]]) { x.leadsTo = x.leadsTo.filter((i) => i !== y.id); x.xor = (x.xor || []).filter((i) => i !== y.id); }
      markDirty();
      drawProps();
    },
  });
  canvas.append(graph.el);
  body.append(h('div', { class: 'focus-layout no-list' }, canvas, props));
  graph.draw();
  drawProps();
}

export function select(t) { tab = 'tree'; if (t) folder = t.folder; cur = t; }

export function newTech(x, y, inFolder) {
  const folder = inFolder || 'infantry_folder';
  return {
    uid: uid(), id: uniqueId(`${prefix()}_new_tech`, allTechIds()), name: 'New Technology', desc: '', img: '', folder, x, y,
    year: 1936, cost: 1.5, categories: [], leadsTo: [], xor: [], enableEquip: [], enableUnits: [], mods: [], allowTags: [], ai: 1, extra: '', vanillaParent: '',
  };
}

function drawProps() {
  clear(props);
  const t = cur;
  if (!t) { props.append(h('div', { class: 'empty' }, h('p', null, 'Click a technology to edit it, or double-click the grid to add one.'))); return; }
  let oldId = t.id;
  let touched = false;
  const idBox = idIn(t, 'id', { onChange: () => { touched = true; rename(t, oldId); oldId = t.id; graph.draw(); } });
  const subunitIds = Object.entries(allSubunits()).map(([id, s]) => [id, s.name]);
  props.append(
    h('div', { class: 'props-head' }, h('h3', null, t.name),
      h('div', null,
        h('button', { class: 'small', onclick: () => { const c = clone(t); c.uid = uid(); c.id = uniqueId(t.id + '_2', allTechIds()); c.x += 1; c.leadsTo = []; c.xor = []; project.technologies.push(c); cur = c; markDirty(); graph.draw(); drawProps(); } }, 'Duplicate'),
        h('button', { class: 'small danger', onclick: async () => { if (await confirmDlg(`Delete "${t.name}"?`)) { project.technologies.splice(project.technologies.indexOf(t), 1); for (const o of project.technologies) { o.leadsTo = o.leadsTo.filter((i) => i !== t.id); o.xor = (o.xor || []).filter((i) => i !== t.id); } cur = null; markDirty(); graph.draw(); drawProps(); } } }, 'Delete'))),
    field('Name', textIn(t, 'name', { onChange: () => { if (!touched) { const n = uniqueId(`${prefix()}_${slug(t.name)}`, allTechIds().filter((x) => x !== t.id)); rename(Object.assign(t, { id: n }), oldId); oldId = n; idBox.value = n; } graph.draw(); } })),
    field('Description', areaIn(t, 'desc', { rows: 2 })),
    field('Tech id', idBox),
    field('Picture', picturePicker(t, 'img', D.IMAGE_SIZES.tech, { onChange: () => graph.draw() })),
    h('div', { class: 'grid2' },
      field('Year', numIn(t, 'year', { onChange: () => graph.draw() })),
      field('Research cost', numIn(t, 'cost', { min: 0 }), '1 = ~100 days. Vanilla uses 1–2.5'),
      field('Grid X', numIn(t, 'x', { onChange: () => graph.draw() })),
      field('Grid Y', numIn(t, 'y', { onChange: () => graph.draw() })),
      field('Tab', selectIn(t, 'folder', folderOptions(), { onChange: () => { cur = null; graph.draw(); drawProps(); } })),
      field('AI interest', numIn(t, 'ai', { min: 0 }))),
    field('Only these countries can research it', chipList(t.allowTags, [...project.countries.map((c) => c.tag), ...D.COUNTRIES.map((c) => c[0])], { placeholder: 'empty = everyone; type a tag…', onChange: () => graph.draw() })),
    field('Unlocks equipment', chipList(t.enableEquip, allEquipmentIds(), { placeholder: 'equipment id…' })),
    field('Unlocks battalions / companies', chipList(t.enableUnits, subunitIds, { placeholder: 'unit id…' })),
    field('Research categories (for research bonuses)', chipList(t.categories, D.TECH_CATEGORIES, { placeholder: 'e.g. infantry_weapons' })),
    field('Bonuses when researched', modifierList(t.mods)),
    field('Unlocked by a vanilla tech (optional)', textIn(t, 'vanillaParent', { list: null, placeholder: 'e.g. infantry_weapons1' }), 'Note: this rewrites nothing in vanilla; it just checks you own that tech before researching.'),
    h('details', null, h('summary', null, 'Advanced: extra raw script'), areaIn(t, 'extra', { code: true, rows: 3 })),
  );
}

function rename(t, oldId) {
  if (t.id === oldId) return;
  for (const o of project.technologies) {
    o.leadsTo = o.leadsTo.map((i) => (i === oldId ? t.id : i));
    o.xor = (o.xor || []).map((i) => (i === oldId ? t.id : i));
  }
}

function drawStart(body) {
  if (curStart && !project.startingTechs.includes(curStart)) curStart = null;
  const detail = h('div');
  const rootEl = h('div');
  const redraw = () => { clear(body); drawStart(body); };
  const list = masterList({
    items: project.startingTechs,
    title: (s) => (s.tag === 'ALL' ? 'All countries' : s.tag || '(pick a country)'),
    subtitle: (s) => `${s.techs.length} techs`,
    selected: () => curStart,
    addLabel: 'Add country',
    onAdd: () => { const s = { uid: uid(), tag: project.countries[0]?.tag || 'ALL', techs: [] }; project.startingTechs.push(s); curStart = s; markDirty(); redraw(); },
    onSelect: (s) => { curStart = s; redraw(); },
    onDelete: (s) => { project.startingTechs.splice(project.startingTechs.indexOf(s), 1); markDirty(); redraw(); },
  });
  if (curStart) {
    const s = curStart;
    const tagOpts = [['ALL', 'All countries'], ...project.countries.map((c) => [c.tag, `${c.tag} – ${c.name}`]), ...D.COUNTRIES.filter((c) => !project.countries.some((p) => p.tag === c[0])).map((c) => [c[0], `${c[0]} – ${c[1]}`])];
    detail.append(
      field('Country', selectIn(s, 'tag', tagOpts, { onChange: () => list.redraw() })),
      field('Technologies they start the game with', chipList(s.techs, allTechIds(), { placeholder: 'type a tech id…', onChange: () => list.redraw() }),
        'Added on top of what they already have in vanilla. Works for your own techs and vanilla ones.'),
    );
  } else detail.append(h('div', { class: 'empty big' }, 'Pick a country (or "All countries") and list the techs they start with.'));
  rootEl.append(editorLayout('', null, list, detail));
  body.append(rootEl);
}

function drawFolders(body, root) {
  const box = h('div', { class: 'section' });
  box.append(h('div', { class: 'notice' }, 'Experimental: HOI4 tech tabs also need interface (GUI) work. The exporter writes a folder definition and a basic GUI window. If the tab button does not appear in game, add a button for it to interface/countrytechtreeview.gui, or simply place your techs in a vanilla tab instead.'));
  for (const f of project.techFolders) {
    box.append(h('div', { class: 'option-card' }, h('div', { class: 'grid3' },
      field('Tab name', textIn(f, 'name')),
      field('Tab id', idIn(f, 'id')),
      h('button', { class: 'icon danger', onclick: async () => { if (await confirmDlg('Delete tab?')) { project.techFolders.splice(project.techFolders.indexOf(f), 1); markDirty(); render(root); } } }, '✕'))));
  }
  box.append(h('button', { onclick: () => { project.techFolders.push({ uid: uid(), id: uniqueId(`${prefix()}_folder`, project.techFolders.map((x) => x.id)), name: 'My Research' }); markDirty(); render(root); } }, '+ Add tech tab'));
  body.append(box);
  void toast;
}
