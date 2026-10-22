import { h, clear, field, textIn, idIn, numIn, areaIn, masterList, editorLayout, slug, confirmDlg } from '../ui.js';
import { project, markDirty, uid, uniqueId, clone } from '../state.js';
import { modifierList, picturePicker, tagIn, scriptBox } from '../widgets.js';
import * as D from '../data.js';
import { newDecision, decisionForm } from './decisions.js';

let tab = 'bop';
let cur = null;
let curDec = null;

export function render(root) {
  const arr = tab === 'bop' ? project.bops : project.mechanics;
  if (cur && !arr.includes(cur)) cur = null;
  clear(root);
  const detail = h('div');
  const tabs = h('div', { class: 'tabs' },
    h('button', { class: tab === 'bop' ? 'active' : '', onclick: () => { tab = 'bop'; cur = null; render(root); } }, 'Balance of Power'),
    h('button', { class: tab === 'meter' ? 'active' : '', onclick: () => { tab = 'meter'; cur = null; render(root); } }, 'Custom meters'));
  const list = masterList({
    items: arr,
    title: (m) => m.name || m.id,
    subtitle: (m) => `${m.tag || '—'} · ${m.id}`,
    selected: () => cur,
    addLabel: tab === 'bop' ? 'New balance of power' : 'New meter',
    empty: tab === 'bop' ? 'A balance of power is a slider between two sides (like the Soviet or Spanish ones).' : 'A meter is a value (0–100 etc.) with stages that give bonuses — like Stalin\'s paranoia or US congress support.',
    onAdd: () => {
      const tag = project.countries[0]?.tag || 'TAG';
      const m = tab === 'bop' ? newBop(tag) : newMeter(tag);
      arr.push(m);
      cur = m;
      curDec = null;
      markDirty();
      render(root);
    },
    onSelect: (m) => { cur = m; curDec = null; render(root); },
    onDelete: (m) => { arr.splice(arr.indexOf(m), 1); markDirty(); render(root); },
    onDuplicate: (m) => { const n = clone(m); n.uid = uid(); n.id = uniqueId(m.id + '_copy', arr.map((x) => x.id)); n.decisions = []; arr.push(n); cur = n; markDirty(); render(root); },
  });
  root.append(editorLayout('Special Mechanics', 'Custom systems for a country, each with its own decision tab. Change their value from any focus, event or decision with the "Shift balance of power" / "Change custom mechanic value" effects, and check them with the matching conditions.', h('div', null, tabs, list), detail));
  if (!cur) { detail.append(h('div', { class: 'empty big' }, 'Select or create a mechanic.')); return; }
  if (tab === 'bop') drawBop(cur, detail, list);
  else drawMeter(cur, detail, list);
  detail.append(decisionsSection(cur));
}

function newBop(tag) {
  return {
    uid: uid(), id: uniqueId(`${tag}_bop`, project.bops.map((x) => x.id)), name: 'Balance of Power', desc: '', tag, initial: 0,
    left: { name: 'Hardliners', img: '' }, right: { name: 'Reformists', img: '' },
    ranges: [
      { uid: uid(), name: 'Hardliners dominate', min: -1, max: -0.6, mods: [{ key: 'stability_factor', value: 0.1 }, { key: 'political_power_factor', value: -0.1 }], onActivate: '' },
      { uid: uid(), name: 'Hardliners lead', min: -0.6, max: -0.1, mods: [{ key: 'stability_factor', value: 0.05 }], onActivate: '' },
      { uid: uid(), name: 'Balanced', min: -0.1, max: 0.1, mods: [], onActivate: '' },
      { uid: uid(), name: 'Reformists lead', min: 0.1, max: 0.6, mods: [{ key: 'political_power_factor', value: 0.05 }], onActivate: '' },
      { uid: uid(), name: 'Reformists dominate', min: 0.6, max: 1, mods: [{ key: 'political_power_factor', value: 0.1 }, { key: 'stability_factor', value: -0.1 }], onActivate: '' },
    ],
    decisions: [],
  };
}

function newMeter(tag) {
  return {
    uid: uid(), id: uniqueId(`${tag}_paranoia`, project.mechanics.map((x) => x.id)), name: 'Paranoia', desc: 'How suspicious the leadership is.', tag,
    min: 0, max: 100, start: 30, monthly: 1, img: '',
    stages: [
      { uid: uid(), name: 'Calm', min: 0, max: 30, mods: [{ key: 'political_power_factor', value: 0.05 }] },
      { uid: uid(), name: 'Suspicious', min: 30, max: 70, mods: [{ key: 'stability_factor', value: -0.05 }] },
      { uid: uid(), name: 'Paranoid', min: 70, max: 101, mods: [{ key: 'stability_factor', value: -0.15 }, { key: 'army_org_factor', value: -0.1 }] },
    ],
    atMax: '', atMin: '',
    decisions: [],
  };
}

function bar(segments, marker, lo, hi) {
  const wrap = h('div', { class: 'mech-bar' });
  const span = hi - lo || 1;
  const colors = ['#8b3a3a', '#a0603a', '#7a7a5a', '#4f7a4f', '#3a6a8b', '#6a4f8b'];
  segments.forEach((s, i) => {
    const a = Math.max(lo, Math.min(hi, Number(s.min)));
    const b = Math.max(lo, Math.min(hi, Number(s.max)));
    wrap.append(h('div', { class: 'mech-seg', title: `${s.name}: ${s.min} → ${s.max}`, style: { left: ((a - lo) / span) * 100 + '%', width: Math.max(0, ((b - a) / span) * 100) + '%', background: colors[i % colors.length] } }, s.name));
  });
  wrap.append(h('div', { class: 'mech-marker', title: 'Starting value', style: { left: ((Math.max(lo, Math.min(hi, marker)) - lo) / span) * 100 + '%' } }));
  return wrap;
}

function drawBop(b, detail, list) {
  const barBox = h('div');
  const drawBar = () => { clear(barBox); barBox.append(h('div', { class: 'row bop-labels' }, h('b', null, '◀ ' + b.left.name), h('span', { class: 'grow' }), h('b', null, b.right.name + ' ▶')), bar(b.ranges, Number(b.initial), -1, 1)); };
  drawBar();
  const ranges = h('div');
  const drawRanges = () => {
    clear(ranges);
    b.ranges.sort((x, y) => x.min - y.min);
    b.ranges.forEach((r, i) => {
      ranges.append(h('div', { class: 'option-card' },
        h('div', { class: 'grid4' },
          field('Stage name', textIn(r, 'name', { onChange: drawBar })),
          field('From', numIn(r, 'min', { min: -1, max: 1, onChange: drawBar })),
          field('To', numIn(r, 'max', { min: -1, max: 1, onChange: drawBar })),
          h('button', { class: 'icon danger', onclick: () => { b.ranges.splice(i, 1); markDirty(); drawRanges(); drawBar(); } }, '✕')),
        field('Bonuses while in this stage', modifierList(r.mods)),
        h('details', null, h('summary', null, 'Effect when entering this stage'), scriptBox(r, 'onActivate', 'effect', { rows: 2 }))));
    });
    ranges.append(h('button', { onclick: () => { b.ranges.push({ uid: uid(), name: 'New stage', min: 0, max: 0.1, mods: [], onActivate: '' }); markDirty(); drawRanges(); drawBar(); } }, '+ Add stage'));
  };
  drawRanges();
  let touched = false;
  const idBox = idIn(b, 'id', { onChange: () => (touched = true) });
  detail.append(
    h('div', { class: 'grid3' },
      field('Name', textIn(b, 'name', { onChange: () => { if (!touched) { b.id = `${b.tag || 'TAG'}_${slug(b.name)}`; idBox.value = b.id; } list.redraw(); } })),
      field('Id', idBox),
      field('Country', tagIn(b, 'tag'))),
    field('Description', areaIn(b, 'desc', { rows: 2 })),
    h('div', { class: 'grid3' },
      field('Left side name', textIn(b.left, 'name', { onChange: drawBar })),
      field('Right side name', textIn(b.right, 'name', { onChange: drawBar })),
      field('Starting value (-1 left … 1 right)', numIn(b, 'initial', { min: -1, max: 1, onChange: drawBar }))),
    h('div', { class: 'grid2' },
      field('Left side icon', picturePicker(b.left, 'img', D.IMAGE_SIZES.bopSide)),
      field('Right side icon', picturePicker(b.right, 'img', D.IMAGE_SIZES.bopSide))),
    barBox,
    h('div', { class: 'section' }, h('h3', null, 'Stages'), h('p', { class: 'hint' }, 'Values go from -1 (fully left) to 1 (fully right). Tip: add "Balance of power daily change" as a bonus to make it drift.'), ranges),
  );
}

function drawMeter(m, detail, list) {
  const barBox = h('div');
  const drawBar = () => { clear(barBox); barBox.append(bar(m.stages, Number(m.start), Number(m.min), Number(m.max))); };
  drawBar();
  const stages = h('div');
  const drawStages = () => {
    clear(stages);
    m.stages.sort((x, y) => x.min - y.min);
    m.stages.forEach((s, i) => {
      stages.append(h('div', { class: 'option-card' },
        h('div', { class: 'grid4' },
          field('Stage name', textIn(s, 'name', { onChange: drawBar })),
          field('From (≥)', numIn(s, 'min', { onChange: drawBar })),
          field('To (<)', numIn(s, 'max', { onChange: drawBar })),
          h('button', { class: 'icon danger', onclick: () => { m.stages.splice(i, 1); markDirty(); drawStages(); drawBar(); } }, '✕')),
        field('Bonuses while in this stage (shown as a national spirit)', modifierList(s.mods))));
    });
    stages.append(h('button', { onclick: () => { m.stages.push({ uid: uid(), name: 'New stage', min: 0, max: 10, mods: [] }); markDirty(); drawStages(); drawBar(); } }, '+ Add stage'));
  };
  drawStages();
  let touched = false;
  const idBox = idIn(m, 'id', { onChange: () => (touched = true) });
  detail.append(
    h('div', { class: 'grid3' },
      field('Name', textIn(m, 'name', { onChange: () => { if (!touched) { m.id = `${m.tag || 'TAG'}_${slug(m.name)}`; idBox.value = m.id; } list.redraw(); } })),
      field('Variable id', idBox, 'Script name of the value.'),
      field('Country', tagIn(m, 'tag'))),
    field('Description', areaIn(m, 'desc', { rows: 2 })),
    h('div', { class: 'grid4' },
      field('Minimum', numIn(m, 'min', { onChange: drawBar })),
      field('Maximum', numIn(m, 'max', { onChange: drawBar })),
      field('Starting value', numIn(m, 'start', { onChange: drawBar })),
      field('Change per month', numIn(m, 'monthly'), 'Automatic drift (0 = none)')),
    field('Tab banner picture', picturePicker(m, 'img', D.IMAGE_SIZES.decisionCat)),
    barBox,
    h('div', { class: 'section' }, h('h3', null, 'Stages'), stages),
    h('div', { class: 'grid2' },
      field('When it hits the maximum', scriptBox(m, 'atMax', 'effect', { rows: 2 })),
      field('When it hits the minimum', scriptBox(m, 'atMin', 'effect', { rows: 2 }))),
  );
}

function decisionsSection(m) {
  const box = h('div', { class: 'section' }, h('h3', null, 'Decisions in this mechanic\'s tab'), h('p', { class: 'hint' }, tab === 'bop' ? 'Tip: use "Shift balance of power" in the effect to move the slider.' : 'Tip: use "Change custom mechanic value" in the effect to raise or lower the meter.'));
  const decList = h('div', { class: 'dec-list' });
  const decDetail = h('div');
  const drawList = () => {
    clear(decList);
    for (const d of m.decisions) {
      decList.append(h('div', { class: 'dec-item' + (d === curDec ? ' sel' : ''), onclick: () => { curDec = d; draw(); } },
        h('span', { class: 'grow' }, d.name || d.id), h('span', { class: 'pp' }, `${d.cost}`),
        h('button', { class: 'icon danger', onclick: async (ev) => { ev.stopPropagation(); if (await confirmDlg(`Delete "${d.name}"?`)) { m.decisions.splice(m.decisions.indexOf(d), 1); if (curDec === d) curDec = null; markDirty(); draw(); } } }, '✕')));
    }
    decList.append(h('button', {
      onclick: () => {
        const d = newDecision(`${m.id}_decision`);
        d.effect = tab === 'bop' ? `add_power_balance_value = { id = ${m.id} value = 0.05 }` : `add_to_variable = { ${m.id} = -5 }\n${m.id}_update = yes`;
        m.decisions.push(d); curDec = d; markDirty(); draw();
      },
    }, '+ Add decision'));
  };
  const draw = () => {
    drawList();
    clear(decDetail);
    if (curDec && m.decisions.includes(curDec)) decDetail.append(decisionForm(curDec, drawList));
    else decDetail.append(h('div', { class: 'hint' }, 'Select a decision to edit it.'));
  };
  draw();
  box.append(h('div', { class: 'dec-split' }, decList, decDetail));
  return box;
}
