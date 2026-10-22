import { h, clear, field, textIn, idIn, numIn, areaIn, checkIn, modal, toast, confirmDlg, pickFile, readAsText, datalist, slug, imgThumb, row } from '../ui.js';
import { project, markDirty, uid, prefix, uniqueId, clone } from '../state.js';
import { scriptBox, picturePicker, tagIn, chipList } from '../widgets.js';
import { createGraph } from '../graph.js';
import * as D from '../data.js';
import { parse, get, getAll, bare, unq, blockText } from '../pdx.js';
import { allFocusIds } from '../refs.js';

let curTree = null;
let curFocus = null;
let graph = null;
let propsEl = null;

export function newFocus(tree, x, y) {
  const tag = tree.tag || 'TAG';
  const id = uniqueId(`${tag}_new_focus`, allFocusIds());
  return { uid: uid(), id, name: 'New Focus', desc: '', icon: 'GFX_goal_unknown', img: '', x, y, cost: 10, prereq: [], exclusive: [], available: '', bypass: '', reward: '', aiFactor: 1, filters: [], extra: '', cancelIfInvalid: true, continueIfInvalid: false, availableIfCapitulated: false };
}

export function render(root) {
  if (curTree && !project.focusTrees.includes(curTree)) curTree = null;
  if (!curTree) curTree = project.focusTrees[0] || null;
  clear(root);
  const treeList = h('div', { class: 'tree-list' });
  const canvasCol = h('div', { class: 'focus-canvas' });
  propsEl = h('div', { class: 'focus-props' });
  root.append(h('div', { class: 'editor full' },
    h('div', { class: 'editor-head' }, h('h1', null, 'Focus Trees'), h('p', { class: 'intro' }, 'Build national focus trees visually. Double-click the grid to add a focus, drag to move it, and use the link buttons to connect focuses. Import a vanilla tree to edit or overhaul it.')),
    h('div', { class: 'focus-layout' }, treeList, canvasCol, propsEl)));
  drawTreeList(treeList, root);
  if (!curTree) {
    canvasCol.append(h('div', { class: 'empty big' }, h('p', null, 'No focus trees yet.'), h('button', { class: 'primary', onclick: () => addTree(root) }, '+ Create a focus tree'), h('p', null, 'or'), h('button', { onclick: () => importTree(root) }, 'Import an existing tree (.txt)')));
    return;
  }
  canvasCol.append(treeSettings(curTree, root));
  graph = createGraph({
    cellW: 100, cellH: 130, nodeW: 92, nodeH: 100,
    nodes: () => curTree.focuses,
    selected: () => curFocus,
    renderNode: (f, el) => {
      el.classList.add('focus-node');
      el.append(
        f.img ? h('img', { src: f.img, class: 'fn-icon' }) : h('div', { class: 'fn-icon ph', title: f.icon }, iconLabel(f.icon)),
        h('div', { class: 'fn-name' }, f.name || f.id),
        h('div', { class: 'fn-days' }, `${Math.round((Number(f.cost) || 0) * 7)}d`),
      );
      el.title = f.id;
    },
    edges: () => edgesOf(curTree),
    onMove: (f, x, y) => {
      if (curTree.focuses.some((o) => o !== f && o.x === x && o.y === y)) { toast('Another focus is already there', 'warn'); return; }
      f.x = x; f.y = y; markDirty(); drawProps();
    },
    onSelect: (f) => { curFocus = f; drawProps(); },
    onAdd: (x, y) => {
      if (curTree.focuses.some((o) => o.x === x && o.y === y)) return;
      const f = newFocus(curTree, x, y);
      curTree.focuses.push(f);
      curFocus = f;
      markDirty();
      graph.draw();
      drawProps();
      refreshTreeList();
    },
    onDeleteKey: () => curFocus && deleteFocus(curFocus),
    linkModes: [
      { id: 'prereq', label: '↓ Requires', hint: 'Click the FIRST focus, then the focus that needs it.' },
      { id: 'or', label: '↓ Requires one of', hint: 'Click a focus, then the child. It becomes an "either one" requirement together with the child\'s existing requirement.' },
      { id: 'exclusive', label: '✕ Mutually exclusive', hint: 'Click two focuses that cannot both be taken.' },
      { id: 'unlink', label: '✂ Remove link', hint: 'Click two connected focuses to remove the connection.' },
    ],
    onLink: (mode, a, b) => {
      link(curTree, mode, a, b);
      markDirty();
      drawProps();
    },
  });
  canvasCol.append(graph.el);
  graph.draw();
  drawProps();
  const first = curFocus || [...curTree.focuses].sort((a, b) => a.y - b.y || a.x - b.x)[0];
  if (first) requestAnimationFrame(() => graph.scrollToNode(first, true));
}

function refreshTreeList() {
  const el = document.querySelector('.tree-list');
  if (el) drawTreeList(el, document.getElementById('main'));
}

function iconLabel(icon) {
  return String(icon || '').replace(/^GFX_(goal|focus)_(generic_)?/, '').replace(/_/g, ' ').slice(0, 26) || '?';
}

export function edgesOf(tree) {
  const out = [];
  const seen = new Set();
  for (const f of tree.focuses) {
    for (const g of f.prereq || []) for (const p of g) out.push({ from: p, to: f.id, kind: g.length > 1 ? 'or' : '' });
    for (const x of f.exclusive || []) {
      const k = [f.id, x].sort().join('|');
      if (!seen.has(k)) { seen.add(k); out.push({ from: f.id, to: x, kind: 'exclusive' }); }
    }
  }
  return out;
}

function link(tree, mode, a, b) {
  if (mode === 'prereq' || mode === 'or') {
    // parent should be the one above
    let parent = a, child = b;
    if (a.y > b.y) { parent = b; child = a; }
    if ((child.prereq || []).some((g) => g.includes(parent.id))) return;
    if (mode === 'or' && child.prereq.length) child.prereq[child.prereq.length - 1].push(parent.id);
    else child.prereq.push([parent.id]);
  } else if (mode === 'exclusive') {
    if (!a.exclusive.includes(b.id)) a.exclusive.push(b.id);
    if (!b.exclusive.includes(a.id)) b.exclusive.push(a.id);
  } else if (mode === 'unlink') {
    for (const [x, y] of [[a, b], [b, a]]) {
      x.prereq = x.prereq.map((g) => g.filter((id) => id !== y.id)).filter((g) => g.length);
      x.exclusive = x.exclusive.filter((id) => id !== y.id);
    }
  }
}

function drawTreeList(el, root) {
  clear(el);
  el.append(h('div', { class: 'tl-head' }, h('button', { class: 'primary small', onclick: () => addTree(root) }, '+ New tree'), h('button', { class: 'small', onclick: () => importTree(root) }, 'Import…')));
  for (const t of project.focusTrees) {
    el.append(h('div', { class: 'tl-item' + (t === curTree ? ' sel' : ''), onclick: () => { curTree = t; curFocus = null; render(root); } },
      h('div', { class: 'mi-title' }, t.name || t.treeId), h('div', { class: 'mi-sub' }, `${t.tag || '—'} · ${t.focuses.length} focuses${t.overhaul ? ' · replaces vanilla' : ''}`)));
  }
}

function addTree(root) {
  const t = { uid: uid(), treeId: '', tag: '', name: '', overhaul: false, fileName: '', default: false, continuousX: 50, continuousY: 1200, countryRaw: '', focuses: [] };
  const body = h('div', null,
    field('Country tag', tagIn(t, 'tag'), 'Which country gets this tree (e.g. GER). Leave empty for a generic tree.'),
    field('Tree name', textIn(t, 'name', { placeholder: 'e.g. German Reich overhaul' })),
    checkIn(t, 'overhaul', 'Completely replace this country\'s vanilla focus tree'),
  );
  modal('New focus tree', body, [{ label: 'Cancel' }, {
    label: 'Create', primary: true, onClick: () => {
      const tag = t.tag || 'generic';
      t.treeId = uniqueId(`${tag.toLowerCase()}_${prefix()}_focus`, project.focusTrees.map((x) => x.treeId));
      t.name = t.name || `${t.tag || 'Generic'} focus tree`;
      const first = newFocus(t, 5, 0);
      first.name = 'Starting Focus';
      first.id = uniqueId(`${t.tag || 'GEN'}_starting_focus`, allFocusIds());
      t.focuses.push(first);
      project.focusTrees.push(t);
      curTree = t;
      curFocus = first;
      markDirty();
      render(root);
    },
  }]);
}

function treeSettings(t, root) {
  const details = h('details', { class: 'tree-settings' });
  details.append(h('summary', null, `⚙ Tree settings — ${t.name || t.treeId} (${t.tag || 'no country'})`));
  details.append(h('div', { class: 'grid3' },
    field('Tree name', textIn(t, 'name', { onChange: () => drawTreeList(root.querySelector('.tree-list'), root) })),
    field('Tree id', idIn(t, 'treeId')),
    field('Country tag', tagIn(t, 'tag')),
    field('File name (optional)', textIn(t, 'fileName', { placeholder: 'auto' }), 'To fully remove a vanilla tree, use its file name, e.g. germany.txt'),
    field('Continuous focus position', row(numIn(t, 'continuousX'), numIn(t, 'continuousY'))),
    h('div', null, checkIn(t, 'overhaul', 'Replace vanilla tree for this country'), checkIn(t, 'default', 'Default tree for countries without one')),
  ));
  if (t.countryRaw) details.append(field('Imported country selection (script)', areaIn(t, 'countryRaw', { code: true, rows: 3 })));
  details.append(h('div', { class: 'row' },
    h('button', { class: 'small', onclick: () => autoLayout(t) }, 'Tidy layout'),
    h('button', { class: 'small', onclick: async () => { const f = await pickFile('.yml,.yaml,.txt'); if (f) { const n = applyLocalisation(t, await readAsText(f)); toast(`Loaded ${n} names/descriptions`); render(root); } } }, 'Load names from localisation .yml'),
    h('button', { class: 'small danger', onclick: async () => { if (await confirmDlg(`Delete the whole tree "${t.name}"?`)) { project.focusTrees.splice(project.focusTrees.indexOf(t), 1); curTree = null; markDirty(); render(root); } } }, 'Delete tree'),
  ));
  return details;
}

function autoLayout(t) {
  // Simple tidy: keep rows, remove overlaps by shifting right.
  const rows = {};
  for (const f of t.focuses) (rows[f.y] = rows[f.y] || []).push(f);
  for (const r of Object.values(rows)) {
    r.sort((a, b) => a.x - b.x);
    for (let i = 1; i < r.length; i++) if (r[i].x <= r[i - 1].x) r[i].x = r[i - 1].x + 1;
  }
  markDirty();
  graph && graph.draw();
}

function deleteFocus(f) {
  confirmDlg(`Delete focus "${f.name || f.id}"?`).then((ok) => {
    if (!ok) return;
    curTree.focuses.splice(curTree.focuses.indexOf(f), 1);
    for (const o of curTree.focuses) {
      o.prereq = o.prereq.map((g) => g.filter((id) => id !== f.id)).filter((g) => g.length);
      o.exclusive = o.exclusive.filter((id) => id !== f.id);
    }
    curFocus = null;
    markDirty();
    graph.draw();
    drawProps();
    refreshTreeList();
  });
}

function renameFocus(f, oldId) {
  if (oldId === f.id) return;
  for (const t of project.focusTrees) for (const o of t.focuses) {
    o.prereq = o.prereq.map((g) => g.map((id) => (id === oldId ? f.id : id)));
    o.exclusive = o.exclusive.map((id) => (id === oldId ? f.id : id));
  }
}

function drawProps() {
  if (!propsEl) return;
  clear(propsEl);
  const f = curFocus;
  if (!f || !curTree || !curTree.focuses.includes(f)) {
    propsEl.append(h('div', { class: 'empty' },
      h('p', null, 'Click a focus to edit it.'),
      h('p', { class: 'hint' }, 'Tips: double-click empty grid to add • drag to move • "Requires" links: click parent, then child • Ctrl+scroll to zoom • Delete key removes the selected focus.')));
    return;
  }
  let oldId = f.id;
  const idInput = idIn(f, 'id', { onChange: () => { renameFocus(f, oldId); oldId = f.id; graph.draw(); } });
  const days = h('span', { class: 'hint' }, `= ${Math.round((Number(f.cost) || 0) * 7)} days`);
  propsEl.append(
    h('div', { class: 'props-head' }, h('h3', null, f.name || f.id),
      h('div', null,
        h('button', { class: 'small', title: 'Duplicate', onclick: () => duplicate(f) }, 'Duplicate'),
        h('button', { class: 'small danger', onclick: () => deleteFocus(f) }, 'Delete'))),
    field('Name', textIn(f, 'name', { onChange: () => graph.draw() })),
    field('Description', areaIn(f, 'desc', { rows: 3 })),
    field('Focus id', idInput, 'Unique code name. Other things refer to this.'),
    field('Icon', picturePicker(f, 'img', D.IMAGE_SIZES.focus, { vanillaKey: 'icon', vanillaList: D.FOCUS_ICONS, onChange: () => graph.draw() })),
    h('div', { class: 'grid2' },
      field('Cost (weeks)', h('div', null, numIn(f, 'cost', { min: 0, onChange: () => { days.textContent = `= ${Math.round((Number(f.cost) || 0) * 7)} days`; graph.draw(); } }), days)),
      field('AI interest', numIn(f, 'aiFactor', { min: 0 }), '0 = AI never picks, 1 = normal, 10 = loves it'),
      field('Grid X', numIn(f, 'x', { onChange: () => graph.draw() })),
      field('Grid Y', numIn(f, 'y', { onChange: () => graph.draw() })),
    ),
    prereqView(f),
    field('Completion reward', scriptBox(f, 'reward', 'effect', { rows: 5, help: 'What happens when the focus completes.' })),
    field('Available when', scriptBox(f, 'available', 'trigger', { rows: 2 })),
    field('Bypass when', scriptBox(f, 'bypass', 'trigger', { rows: 2, placeholder: 'Skip this focus automatically when…' })),
    field('Search filters', chipList(f.filters, D.FOCUS_FILTERS, { placeholder: 'FOCUS_FILTER_…' })),
    h('details', null, h('summary', null, 'Advanced'),
      checkIn(f, 'cancelIfInvalid', 'Cancel if it becomes unavailable'),
      checkIn(f, 'continueIfInvalid', 'Continue even if it becomes unavailable'),
      checkIn(f, 'availableIfCapitulated', 'Available while capitulated'),
      field('Select effect (runs when picked)', scriptBox(f, 'selectEffect', 'effect', { rows: 2 })),
      field('Extra raw script inside the focus', areaIn(f, 'extra', { code: true, rows: 3 }))),
  );
}

function prereqView(f) {
  const box = h('div', { class: 'section' }, h('h3', null, 'Connections'));
  const name = (id) => (curTree.focuses.find((x) => x.id === id) || {}).name || id;
  if (!f.prereq.length && !f.exclusive.length) box.append(h('div', { class: 'hint' }, 'None. Use the link buttons above the grid to connect focuses.'));
  f.prereq.forEach((g, gi) => {
    box.append(h('div', { class: 'conn' }, h('b', null, g.length > 1 ? 'Requires ONE of: ' : 'Requires: '),
      g.map((id, i) => h('span', { class: 'chip' }, name(id), h('button', { class: 'chip-x', onclick: () => { g.splice(i, 1); if (!g.length) f.prereq.splice(gi, 1); markDirty(); graph.draw(); drawProps(); } }, '×'))),
      gi > 0 ? h('button', { class: 'small', title: 'Merge with the group above into an "either one" requirement', onclick: () => { f.prereq[gi - 1].push(...g); f.prereq.splice(gi, 1); markDirty(); graph.draw(); drawProps(); } }, 'make "one of" with above') : null));
  });
  if (f.exclusive.length) box.append(h('div', { class: 'conn' }, h('b', null, 'Mutually exclusive with: '), f.exclusive.map((id) => h('span', { class: 'chip' }, name(id)))));
  return box;
}

function duplicate(f) {
  const c = clone(f);
  c.uid = uid();
  c.id = uniqueId(f.id + '_copy', allFocusIds());
  c.exclusive = [];
  let x = f.x + 1;
  while (curTree.focuses.some((o) => o.x === x && o.y === f.y)) x++;
  c.x = x;
  curTree.focuses.push(c);
  curFocus = c;
  markDirty();
  graph.draw();
  drawProps();
}

// ---------- import ----------
async function importTree(root) {
  const file = await pickFile('.txt');
  if (!file) return;
  try {
    const text = await readAsText(file);
    const trees = importFocusFile(text, file.name);
    if (!trees.length) { toast('No focus_tree found in that file', 'error'); return; }
    for (const t of trees) project.focusTrees.push(t);
    curTree = trees[0];
    curFocus = null;
    markDirty();
    render(root);
    toast(`Imported ${trees.reduce((a, t) => a + t.focuses.length, 0)} focuses. Tip: load the localisation .yml in Tree settings to get the real names.`, 'ok');
  } catch (e) {
    console.error(e);
    toast('Import failed: ' + e.message, 'error');
  }
}

const KNOWN_FOCUS_KEYS = new Set(['id', 'icon', 'x', 'y', 'relative_position_id', 'cost', 'prerequisite', 'mutually_exclusive', 'available', 'bypass', 'completion_reward', 'ai_will_do', 'search_filters', 'cancel_if_invalid', 'continue_if_invalid', 'available_if_capitulated', 'select_effect', 'text']);

export function importFocusFile(text, fileName) {
  const ast = parse(text);
  const out = [];
  for (const n of ast) {
    if (n.k !== 'focus_tree' || !Array.isArray(n.v)) continue;
    const b = n.v;
    const countryBlk = get(b, 'country');
    let tag = '';
    if (Array.isArray(countryBlk)) {
      const m = blockText(countryBlk).match(/tag\s*=\s*([A-Z0-9]{3})/);
      if (m) tag = m[1];
    }
    const cfp = get(b, 'continuous_focus_position');
    const t = {
      uid: uid(), treeId: unq(get(b, 'id')) || slug(fileName), tag, name: (tag ? tag + ' ' : '') + '(imported ' + fileName + ')',
      overhaul: true, fileName, default: get(b, 'default') === 'yes',
      continuousX: Array.isArray(cfp) ? Number(get(cfp, 'x')) || 50 : 50, continuousY: Array.isArray(cfp) ? Number(get(cfp, 'y')) || 1200 : 1200,
      countryRaw: Array.isArray(countryBlk) ? blockText(countryBlk) : '', treeExtra: '',
      focuses: [],
    };
    const rel = {};
    const extraTree = [];
    for (const fn of b) {
      if (fn.k === 'focus' && Array.isArray(fn.v)) {
        const fb = fn.v;
        const f = {
          uid: uid(), id: unq(get(fb, 'id')), name: '', desc: '', icon: unq(get(fb, 'icon')) || 'GFX_goal_unknown', img: '',
          x: Number(get(fb, 'x')) || 0, y: Number(get(fb, 'y')) || 0, cost: Number(get(fb, 'cost')) || 10,
          prereq: getAll(fb, 'prerequisite').filter(Array.isArray).map((g) => getAll(g, 'focus').map(unq)).filter((g) => g.length),
          exclusive: getAll(fb, 'mutually_exclusive').filter(Array.isArray).flatMap((g) => getAll(g, 'focus').map(unq)),
          available: blockText(get(fb, 'available')), bypass: blockText(get(fb, 'bypass')), reward: blockText(get(fb, 'completion_reward')),
          selectEffect: blockText(get(fb, 'select_effect')),
          aiFactor: 1, filters: bare(get(fb, 'search_filters')),
          cancelIfInvalid: get(fb, 'cancel_if_invalid') !== 'no', continueIfInvalid: get(fb, 'continue_if_invalid') === 'yes', availableIfCapitulated: get(fb, 'available_if_capitulated') === 'yes',
          extra: '',
        };
        const ai = get(fb, 'ai_will_do');
        if (Array.isArray(ai)) {
          if (ai.length === 1 && ai[0].k === 'factor') f.aiFactor = Number(ai[0].v) || 0;
          else f.aiRaw = blockText(ai);
        }
        f.name = f.id;
        const relId = unq(get(fb, 'relative_position_id'));
        if (relId) rel[f.id] = relId;
        f.extra = blockText(fb.filter((x) => !KNOWN_FOCUS_KEYS.has(x.k)));
        t.focuses.push(f);
      } else if (!['id', 'country', 'default', 'continuous_focus_position'].includes(fn.k)) {
        extraTree.push(fn);
      }
    }
    // resolve relative positions into absolute ones
    const byId = new Map(t.focuses.map((f) => [f.id, f]));
    const resolved = new Set();
    const resolve = (f, depth = 0) => {
      if (resolved.has(f.id) || depth > 200) return;
      const r = rel[f.id];
      if (r && byId.has(r)) { const p = byId.get(r); resolve(p, depth + 1); f.x += p.x; f.y += p.y; }
      resolved.add(f.id);
    };
    t.focuses.forEach((f) => resolve(f));
    t.treeExtra = blockText(extraTree);
    out.push(t);
  }
  return out;
}

export function applyLocalisation(tree, text) {
  const map = parseLoc(text);
  let n = 0;
  for (const f of tree.focuses) {
    if (map[f.id]) { f.name = map[f.id]; n++; }
    if (map[f.id + '_desc']) { f.desc = map[f.id + '_desc']; n++; }
  }
  return n;
}

export function parseLoc(text) {
  const map = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_.\-]+):\d*\s*"(.*)"\s*(#.*)?$/);
    if (m) map[m[1]] = m[2].replace(/\\n/g, '\n');
  }
  return map;
}

void datalist; void imgThumb;
