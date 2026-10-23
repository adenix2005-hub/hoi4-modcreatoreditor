import { h, clear, field, textIn, idIn, numIn, areaIn, selectIn, masterList, editorLayout, slug, toast, pickFile, readAsText } from '../ui.js';
import { project, markDirty, uid, uniqueId, clone, prefix } from '../state.js';
import { modifierList } from '../widgets.js';
import * as D from '../data.js';
import { parse, get, unq, blockText } from '../pdx.js';

let tab = 'leader';
let cur = null;

export function select(t, which) { tab = which; cur = t; }

export function render(root) {
  const arr = tab === 'leader' ? project.leaderTraits : project.unitTraits;
  if (cur && !arr.includes(cur)) cur = null;
  clear(root);
  const detail = h('div');
  const tabs = h('div', { class: 'tabs' },
    h('button', { class: tab === 'leader' ? 'active' : '', onclick: () => { tab = 'leader'; cur = null; render(root); } }, 'Leader & advisor traits'),
    h('button', { class: tab === 'unit' ? 'active' : '', onclick: () => { tab = 'unit'; cur = null; render(root); } }, 'General & admiral traits'));
  const list = masterList({
    items: arr,
    title: (t) => t.name || t.id,
    subtitle: (t) => (t.file ? `overrides ${t.file} · ` : '') + `${t.mods.length} bonus${t.mods.length === 1 ? '' : 'es'}`,
    selected: () => cur,
    addLabel: 'New trait',
    extraButtons: h('button', { title: 'Import a game traits file to change vanilla trait values', onclick: () => importTraits(root) }, 'Import game file…'),
    onAdd: () => {
      const t = { uid: uid(), id: uniqueId(`${prefix()}_new_trait`, arr.map((x) => x.id)), name: 'New Trait', desc: '', mods: [], extra: '', file: '' };
      if (tab === 'unit') Object.assign(t, { type: 'land', traitType: 'personality_trait', attack: 0, defense: 0, planning: 0, logistics: 0, maneuvering: 0, coordination: 0 });
      arr.push(t);
      cur = t;
      markDirty();
      render(root);
    },
    onSelect: (t) => { cur = t; render(root); },
    onDelete: (t) => { arr.splice(arr.indexOf(t), 1); markDirty(); render(root); },
    onDuplicate: (t) => { const n = clone(t); n.uid = uid(); n.id = uniqueId(t.id + '_copy', arr.map((x) => x.id)); n.file = ''; arr.push(n); cur = n; markDirty(); render(root); },
  });
  root.append(editorLayout('Traits', 'Create traits with exact bonuses, then give them to people in "People". To change a vanilla trait\'s numbers, import the game file (e.g. Hearts of Iron IV/common/country_leader/00_traits.txt), edit, and export — the mod then overrides that file.', h('div', null, tabs, list), detail));
  if (!cur) { detail.append(h('div', { class: 'empty big' }, 'Select or add a trait.')); return; }
  const t = cur;
  let idTouched = false;
  const idBox = idIn(t, 'id', { onChange: () => (idTouched = true) });
  detail.append(
    t.file ? h('div', { class: 'notice' }, `Imported from ${t.file}. Exporting rewrites that whole file, replacing the vanilla version.`) : '',
    h('div', { class: 'grid2' },
      field('Name', textIn(t, 'name', { onChange: () => { if (!idTouched && !t.file) { t.id = `${prefix()}_${slug(t.name)}`; idBox.value = t.id; } list.redraw(); } })),
      field('Trait id', idBox)),
    field('Description (optional)', areaIn(t, 'desc', { rows: 2 })),
  );
  if (tab === 'unit') {
    detail.append(h('div', { class: 'grid3' },
      field('Who can have it', selectIn(t, 'type', D.UNIT_TRAIT_FOR)),
      field('Kind', selectIn(t, 'traitType', D.UNIT_TRAIT_TYPES)),
      h('div'),
      field('+ Attack skill', numIn(t, 'attack')),
      field('+ Defense skill', numIn(t, 'defense')),
      field('+ Planning skill', numIn(t, 'planning')),
      field('+ Logistics skill', numIn(t, 'logistics')),
      field('+ Maneuvering (admirals)', numIn(t, 'maneuvering')),
      field('+ Coordination (admirals)', numIn(t, 'coordination'))));
  }
  detail.append(
    field(tab === 'unit' ? 'Bonuses to their army' : 'Bonuses to the country', modifierList(t.mods, { empty: 'No bonuses yet — add some!' })),
    h('details', null, h('summary', null, 'Advanced: extra raw script'), areaIn(t, 'extra', { code: true, rows: 4 })),
  );
}

async function importTraits(root) {
  const f = await pickFile('.txt');
  if (!f) return;
  try {
    const ast = parse(await readAsText(f));
    const blk = get(ast, 'leader_traits');
    if (!Array.isArray(blk)) { toast('No "leader_traits" found in that file', 'error'); return; }
    const arr = tab === 'leader' ? project.leaderTraits : project.unitTraits;
    let n = 0;
    for (const node of blk) {
      if (!node.k || !Array.isArray(node.v)) continue;
      const b = node.v;
      const t = { uid: uid(), id: node.k, name: node.k, desc: '', mods: [], extra: '', file: f.name };
      const rest = [];
      if (tab === 'leader') {
        for (const x of b) {
          if (typeof x.v === 'string' && x.k && isFinite(Number(x.v)) && x.k !== 'random' && x.k !== 'sprite') t.mods.push({ key: x.k, value: Number(x.v) });
          else rest.push(x);
        }
      } else {
        Object.assign(t, { type: unq(get(b, 'type')) || 'land', traitType: unq(get(b, 'trait_type')) || 'personality_trait', attack: Number(get(b, 'attack_skill')) || 0, defense: Number(get(b, 'defense_skill')) || 0, planning: Number(get(b, 'planning_skill')) || 0, logistics: Number(get(b, 'logistics_skill')) || 0, maneuvering: Number(get(b, 'maneuvering_skill')) || 0, coordination: Number(get(b, 'coordination_skill')) || 0 });
        const known = new Set(['type', 'trait_type', 'attack_skill', 'defense_skill', 'planning_skill', 'logistics_skill', 'maneuvering_skill', 'coordination_skill', 'modifier']);
        const mod = get(b, 'modifier');
        if (Array.isArray(mod)) for (const x of mod) {
          if (typeof x.v === 'string' && isFinite(Number(x.v))) t.mods.push({ key: x.k, value: Number(x.v) });
        }
        if (Array.isArray(mod) && mod.some((x) => !(typeof x.v === 'string' && isFinite(Number(x.v))))) t.extraModifier = blockText(mod.filter((x) => !(typeof x.v === 'string' && isFinite(Number(x.v)))));
        for (const x of b) if (!known.has(x.k)) rest.push(x);
      }
      t.extra = blockText(rest);
      const existing = arr.findIndex((x) => x.id === t.id && x.file === f.name);
      if (existing >= 0) arr[existing] = t; else arr.push(t);
      n++;
    }
    markDirty();
    toast(`Imported ${n} traits from ${f.name}`, 'ok');
    render(root);
  } catch (e) {
    toast('Import failed: ' + e.message, 'error');
  }
}
