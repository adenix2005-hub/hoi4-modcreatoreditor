import { h, clear, field, textIn, idIn, numIn, areaIn, checkIn, masterList, editorLayout, slug, imgThumb, confirmDlg } from '../ui.js';
import { project, markDirty, uid, uniqueId, clone, prefix } from '../state.js';
import { scriptBox, picturePicker, tagIn } from '../widgets.js';
import * as D from '../data.js';
import { allDecisionIds } from '../refs.js';

let curCat = null;
let curDec = null;

export function newDecision(base) {
  return {
    uid: uid(), id: uniqueId(base || `${prefix()}_new_decision`, allDecisionIds()), name: 'New Decision', desc: '', icon: 'generic_decision', img: '',
    cost: 50, fireOnce: false, daysRemove: 0, daysReEnable: 0, visible: '', available: '', effect: '', removeEffect: '',
    ai: 1, mission: false, missionDays: 60, timeoutEffect: '', activation: '', selectable: false,
  };
}

// The form for one decision; used here and by the mechanics editor.
export function decisionForm(d, onRename) {
  let touched = false;
  const idBox = idIn(d, 'id', { onChange: () => (touched = true) });
  const missionBox = h('div', { class: d.mission ? '' : 'hidden' },
    h('div', { class: 'grid2' }, field('Days until timeout', numIn(d, 'missionDays', { min: 1 })), h('div', null, checkIn(d, 'selectable', 'Player can also click it to complete early'))),
    field('Starts automatically when', scriptBox(d, 'activation', 'trigger', { rows: 2 })),
    field('If the timer runs out', scriptBox(d, 'timeoutEffect', 'effect', { rows: 2 })));
  return h('div', null,
    h('div', { class: 'grid2' },
      field('Name', textIn(d, 'name', { onChange: () => { if (!touched) { d.id = uniqueId(`${prefix()}_${slug(d.name)}`, allDecisionIds().filter((x) => x !== d.id)); idBox.value = d.id; } onRename && onRename(); } })),
      field('Decision id', idBox)),
    field('Description', areaIn(d, 'desc', { rows: 2 })),
    field('Icon', picturePicker(d, 'img', D.IMAGE_SIZES.decision, { vanillaKey: 'icon', vanillaList: D.DECISION_ICONS })),
    h('div', { class: 'grid3' },
      field('Political power cost', numIn(d, 'cost', { min: 0 })),
      field('Lasts (days, 0 = instant)', numIn(d, 'daysRemove', { min: 0 }), 'If set, "When it ends" runs after this many days.'),
      field('Cooldown before reuse (days)', numIn(d, 'daysReEnable', { min: 0 })),
      field('AI interest', numIn(d, 'ai', { min: 0 }))),
    h('div', { class: 'row' }, checkIn(d, 'fireOnce', 'Can only be taken once'), checkIn(d, 'mission', 'This is a mission (timer that counts down)', { onChange: (v) => missionBox.classList.toggle('hidden', !v) })),
    missionBox,
    field('Visible when', scriptBox(d, 'visible', 'trigger', { rows: 2 })),
    field('Can be taken when', scriptBox(d, 'available', 'trigger', { rows: 2 })),
    field(d.mission ? 'When completed' : 'Effect', scriptBox(d, 'effect', 'effect', { rows: 4 })),
    field('When it ends (only if "Lasts" > 0)', scriptBox(d, 'removeEffect', 'effect', { rows: 2 })),
  );
}

export function render(root) {
  if (curCat && !project.decisionCategories.includes(curCat)) { curCat = null; curDec = null; }
  if (curDec && (!curCat || !curCat.decisions.includes(curDec))) curDec = null;
  clear(root);
  const detail = h('div');
  const list = masterList({
    items: project.decisionCategories,
    title: (c) => c.name || c.id,
    subtitle: (c) => `${c.tag || 'any country'} · ${c.decisions.length} decisions`,
    thumb: (c) => imgThumb(c.img, 'wide'),
    selected: () => curCat,
    addLabel: 'New tab',
    empty: 'No decision tabs yet.',
    onAdd: () => {
      const c = { uid: uid(), id: uniqueId(`${prefix()}_new_category`, project.decisionCategories.map((x) => x.id)), name: 'New Decision Tab', desc: '', tag: project.countries[0]?.tag || '', icon: 'generic_political_actions', img: '', visible: '', allowed: '', priority: 100, decisions: [] };
      project.decisionCategories.push(c);
      curCat = c;
      curDec = null;
      markDirty();
      render(root);
    },
    onSelect: (c) => { curCat = c; curDec = null; render(root); },
    onDelete: (c) => { project.decisionCategories.splice(project.decisionCategories.indexOf(c), 1); markDirty(); render(root); },
    onDuplicate: (c) => { const n = clone(c); n.uid = uid(); n.id = uniqueId(c.id + '_copy', project.decisionCategories.map((x) => x.id)); n.decisions.forEach((d) => { d.uid = uid(); d.id = uniqueId(d.id + '_copy', allDecisionIds()); }); project.decisionCategories.push(n); curCat = n; markDirty(); render(root); },
  });
  root.append(editorLayout('Decisions', 'Decision tabs show up in the Decisions screen. Each tab holds decisions (one-click actions costing political power) and missions (timers). Restrict a tab to one country with its tag.', list, detail));
  if (!curCat) { detail.append(h('div', { class: 'empty big' }, 'Select or add a decision tab.')); return; }
  const c = curCat;
  let touched = false;
  const idBox = idIn(c, 'id', { onChange: () => (touched = true) });
  detail.append(
    h('div', { class: 'section' }, h('h3', null, 'Tab settings'),
      h('div', { class: 'grid3' },
        field('Tab name', textIn(c, 'name', { onChange: () => { if (!touched) { c.id = `${prefix()}_${slug(c.name)}`; idBox.value = c.id; } list.redraw(); } })),
        field('Tab id', idBox),
        field('Country', tagIn(c, 'tag', { placeholder: 'empty = everyone' }))),
      field('Description', areaIn(c, 'desc', { rows: 2 })),
      field('Banner picture', picturePicker(c, 'img', D.IMAGE_SIZES.decisionCat, { vanillaKey: 'icon', vanillaList: D.DECISION_CAT_ICONS, onChange: () => list.redraw() })),
      h('details', null, h('summary', null, 'More conditions'),
        field('Tab visible when', scriptBox(c, 'visible', 'trigger', { rows: 2 })),
        field('Tab exists for (allowed)', scriptBox(c, 'allowed', 'trigger', { rows: 2, help: 'Checked once at game start.' })),
        field('Sort priority', numIn(c, 'priority')))),
  );
  const decBox = h('div', { class: 'section' }, h('h3', null, 'Decisions in this tab'));
  const decList = h('div', { class: 'dec-list' });
  const decDetail = h('div');
  const drawList = () => {
    clear(decList);
    for (const d of c.decisions) {
      decList.append(h('div', { class: 'dec-item' + (d === curDec ? ' sel' : ''), onclick: () => { curDec = d; drawDecs(); } },
        d.img ? h('img', { src: d.img, class: 'dec-icon' }) : h('div', { class: 'dec-icon ph' }, '◆'),
        h('span', { class: 'grow' }, d.name || d.id), h('span', { class: 'pp' }, `${d.cost}`),
        h('button', { class: 'icon danger', onclick: async (ev) => { ev.stopPropagation(); if (await confirmDlg(`Delete decision "${d.name}"?`)) { c.decisions.splice(c.decisions.indexOf(d), 1); if (curDec === d) curDec = null; markDirty(); drawDecs(); } } }, '✕')));
    }
    decList.append(h('button', { onclick: () => { const d = newDecision(); c.decisions.push(d); curDec = d; markDirty(); drawDecs(); } }, '+ Add decision'));
  };
  const drawDecs = () => {
    drawList();
    clear(decDetail);
    if (curDec) decDetail.append(decisionForm(curDec, drawList));
    else decDetail.append(h('div', { class: 'hint' }, 'Select a decision to edit it.'));
  };
  drawDecs();
  decBox.append(h('div', { class: 'dec-split' }, decList, decDetail));
  detail.append(decBox);
}
