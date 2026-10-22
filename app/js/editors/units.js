import { h, clear, field, textIn, idIn, numIn, areaIn, checkIn, selectIn, masterList, editorLayout, slug, imgThumb, datalist, pickFile, readAsDataURL, toast, modal } from '../ui.js';
import { project, markDirty, uid, uniqueId, clone, prefix } from '../state.js';
import { picturePicker } from '../widgets.js';
import * as D from '../data.js';
import { allEquipmentIds } from '../refs.js';

let tab = 'equipment';
let cur = null;

const EQ_STATS = [
  ['soft_attack', 'Soft attack'], ['hard_attack', 'Hard attack'], ['defense', 'Defense'], ['breakthrough', 'Breakthrough'],
  ['ap_attack', 'Piercing'], ['armor_value', 'Armor'], ['hardness', 'Hardness (0–1)'], ['air_attack', 'Air attack'],
  ['reliability', 'Reliability (0–1)'], ['maximum_speed', 'Max speed (km/h)'], ['build_cost_ic', 'Production cost'],
];
const RESOURCES = ['steel', 'aluminium', 'tungsten', 'chromium', 'oil', 'rubber'];

const PRESETS = {
  line: { label: 'Line battalion (like infantry)', support: false, group: 'infantry', sprite: 'infantry', mapIcon: 'infantry', width: 2, manpower: 1000, training: 90, org: 60, hp: 25, suppression: 1, weight: 0.5, supply: 0.06, need: [{ eq: 'infantry_equipment', n: 100 }] },
  armor: { label: 'Armor battalion (like tanks)', support: false, group: 'armor', sprite: 'medium_armor', mapIcon: 'armored', width: 2, manpower: 500, training: 120, org: 10, hp: 2, suppression: 0, weight: 1, supply: 0.2, need: [{ eq: 'medium_tank_equipment', n: 50 }] },
  artillery: { label: 'Artillery battalion', support: false, group: 'infantry', sprite: 'artillery', mapIcon: 'infantry', width: 3, manpower: 500, training: 120, org: 0, hp: 0.6, suppression: 0, weight: 0.5, supply: 0.2, need: [{ eq: 'artillery_equipment', n: 12 }] },
  support: { label: 'Support company', support: true, group: 'support', sprite: 'engineer', mapIcon: 'infantry', width: 0, manpower: 300, training: 120, org: 20, hp: 2, suppression: 0, weight: 0.1, supply: 0.05, need: [{ eq: 'support_equipment', n: 20 }] },
  hq: { label: 'HQ / command company', support: true, group: 'support', sprite: 'signal_company', mapIcon: 'infantry', width: 0, manpower: 200, training: 120, org: 40, hp: 1, suppression: 0, weight: 0.1, supply: 0.04, need: [{ eq: 'support_equipment', n: 15 }] },
};

export function render(root) {
  const arr = tab === 'equipment' ? project.equipment : tab === 'subunits' ? project.subunits : project.models;
  if (cur && !arr.includes(cur)) cur = null;
  clear(root);
  const detail = h('div');
  const tabs = h('div', { class: 'tabs' });
  for (const [id, label] of [['equipment', 'Equipment'], ['subunits', 'Battalions & support companies'], ['models', '3D models']]) {
    tabs.append(h('button', { class: tab === id ? 'active' : '', onclick: () => { tab = id; cur = null; render(root); } }, label));
  }
  let list;
  if (tab === 'equipment') {
    list = masterList({
      items: arr, title: (e) => e.name, subtitle: (e) => `${e.id} · ${e.year}`, thumb: (e) => imgThumb(e.img, 'wide'), selected: () => cur, addLabel: 'New equipment',
      onAdd: () => { const e = newEquipment(); arr.push(e); cur = e; markDirty(); render(root); },
      onSelect: (e) => { cur = e; render(root); },
      onDelete: (e) => { arr.splice(arr.indexOf(e), 1); markDirty(); render(root); },
      onDuplicate: (e) => { const n = clone(e); n.uid = uid(); n.id = uniqueId(e.id + '_2', allEquipmentIds()); n.name += ' II'; n.year = Number(e.year) + 3; arr.push(n); cur = n; markDirty(); render(root); },
    });
  } else if (tab === 'subunits') {
    list = masterList({
      items: arr, title: (s) => s.name, subtitle: (s) => `${s.support ? 'support company' : 'battalion'} · ${s.id}`, thumb: (s) => imgThumb(s.img, 'square'), selected: () => cur, addLabel: 'New unit',
      onAdd: () => choosePreset(root),
      onSelect: (s) => { cur = s; render(root); },
      onDelete: (s) => { arr.splice(arr.indexOf(s), 1); markDirty(); render(root); },
      onDuplicate: (s) => { const n = clone(s); n.uid = uid(); n.id = uniqueId(s.id + '_2', arr.map((x) => x.id)); arr.push(n); cur = n; markDirty(); render(root); },
    });
  } else {
    list = masterList({
      items: arr, title: (m) => m.name, subtitle: (m) => m.meshName || 'no mesh yet', selected: () => cur, addLabel: 'New 3D model',
      onAdd: () => { const m = { uid: uid(), id: uniqueId(`${prefix()}_model`, arr.map((x) => x.id)), name: 'New model', mesh: '', meshName: '', texture: '', textureName: '', scale: 1, shape: '' }; arr.push(m); cur = m; markDirty(); render(root); },
      onSelect: (m) => { cur = m; render(root); },
      onDelete: (m) => { arr.splice(arr.indexOf(m), 1); markDirty(); render(root); },
    });
  }
  const intro = {
    equipment: 'Weapons, vehicles and support gear. Unlock them with a technology, then use them in a battalion.',
    subunits: 'Battalions go in the main division grid; support companies go in the support column. Pick the equipment they need — including your own.',
    models: 'Import a Paradox .mesh 3D model (exported with the PDX Blender/Maya tools) and its texture, then use it on a battalion. Advanced feature.',
  }[tab];
  root.append(editorLayout('Units & Equipment', intro, h('div', null, tabs, list), detail));
  if (!cur) { detail.append(h('div', { class: 'empty big' }, 'Select or add something.')); return; }
  if (tab === 'equipment') drawEquipment(cur, detail, list);
  else if (tab === 'subunits') drawSubunit(cur, detail, list);
  else drawModel(cur, detail, list);
}

function newEquipment() {
  return {
    uid: uid(), id: uniqueId(`${prefix()}_new_equipment`, allEquipmentIds()), name: 'New Equipment', desc: '', img: '', type: 'infantry', year: 1936,
    soft_attack: 3, hard_attack: 0.5, defense: 20, breakthrough: 2, ap_attack: 1, armor_value: 0, hardness: 0, air_attack: 0, reliability: 0.9, maximum_speed: 4, build_cost_ic: 0.5,
    resources: { steel: 1 }, model: '', extra: '',
  };
}

function drawEquipment(e, detail, list) {
  let touched = false;
  const idBox = idIn(e, 'id', { onChange: () => (touched = true) });
  const res = h('div', { class: 'grid3' }, RESOURCES.map((r) => field(r, numIn(e.resources, r, { min: 0, allowEmpty: true }))));
  detail.append(
    h('div', { class: 'grid2' },
      field('Name', textIn(e, 'name', { onChange: () => { if (!touched) { e.id = `${prefix()}_${slug(e.name)}`; idBox.value = e.id; } list.redraw(); } })),
      field('Equipment id', idBox)),
    field('Description', areaIn(e, 'desc', { rows: 2 })),
    h('div', { class: 'grid2' },
      field('Kind', selectIn(e, 'type', D.EQUIPMENT_TYPES)),
      field('Year', numIn(e, 'year'))),
    field('Picture (production screen)', picturePicker(e, 'img', D.IMAGE_SIZES.equipment, { onChange: () => list.redraw() })),
    h('div', { class: 'section' }, h('h3', null, 'Stats'), h('div', { class: 'grid4' }, EQ_STATS.map(([k, l]) => field(l, numIn(e, k))))),
    h('div', { class: 'section' }, h('h3', null, 'Resources needed per factory'), res),
    h('details', null, h('summary', null, 'Advanced'),
      field('3D model entity (optional)', textIn(e, 'model', { list: datalist(project.models.map((m) => m.id + '_entity')), placeholder: 'e.g. my_tank_entity' })),
      field('Extra raw script', areaIn(e, 'extra', { code: true, rows: 3 }))),
    h('p', { class: 'hint' }, 'Remember to unlock it: add it to a technology\'s "Unlocks equipment", or give it to a country at start in Divisions → starting stockpile.'),
  );
}

function choosePreset(root) {
  const body = h('div', { class: 'preset-list' });
  const make = (key) => {
    const p = PRESETS[key];
    const s = {
      uid: uid(), id: uniqueId(`${prefix()}_${key}_unit`, project.subunits.map((x) => x.id)), name: 'New ' + p.label.split(' (')[0], desc: '', img: '',
      support: p.support, group: p.group, sprite: p.sprite, mapIcon: p.mapIcon, width: p.width, manpower: p.manpower, training: p.training, org: p.org, hp: p.hp,
      suppression: p.suppression, weight: p.weight, supply: p.supply, need: clone(p.need), soft_mult: 1, hard_mult: 1, def_mult: 1, bt_mult: 1, extra: p.extraMods || '', model: '',
    };
    project.subunits.push(s);
    cur = s;
    markDirty();
    document.querySelector('.modal-back')?.remove();
    render(root);
  };
  for (const k of Object.keys(PRESETS)) body.append(h('button', { class: 'preset', onclick: () => make(k) }, PRESETS[k].label));
  modal('Start from…', body, [{ label: 'Cancel' }]);
}

function drawSubunit(s, detail, list) {
  let touched = false;
  const idBox = idIn(s, 'id', { onChange: () => (touched = true) });
  const needBox = h('div');
  const eqList = datalist(allEquipmentIds());
  const drawNeed = () => {
    clear(needBox);
    s.need.forEach((n, i) => {
      const eq = h('input', { type: 'text', value: n.eq, list: eqList, placeholder: 'equipment id' });
      eq.addEventListener('input', () => { n.eq = eq.value.trim(); markDirty(); });
      needBox.append(h('div', { class: 'mod-row' }, eq, numIn(n, 'n', { min: 0 }), h('button', { class: 'icon danger', onclick: () => { s.need.splice(i, 1); markDirty(); drawNeed(); } }, '✕')));
    });
    needBox.append(h('button', { class: 'small', onclick: () => { s.need.push({ eq: project.equipment[0]?.id || 'infantry_equipment', n: 10 }); markDirty(); drawNeed(); } }, '+ Add equipment'));
  };
  drawNeed();
  const sprites = [...D.UNIT_SPRITES, ...project.models.map((m) => m.id)];
  detail.append(
    h('div', { class: 'grid2' },
      field('Name', textIn(s, 'name', { onChange: () => { if (!touched) { s.id = `${prefix()}_${slug(s.name)}`; idBox.value = s.id; } list.redraw(); } })),
      field('Unit id', idBox)),
    field('Description', areaIn(s, 'desc', { rows: 2 })),
    h('div', { class: 'row' }, checkIn(s, 'support', 'Support company (goes in the support column, no combat width)', { onChange: (v) => { if (v) { s.group = 'support'; s.width = 0; } else if (s.group === 'support') s.group = 'infantry'; render(document.getElementById('main')); } })),
    h('div', { class: 'grid3' },
      s.support ? null : field('Type', selectIn(s, 'group', [['infantry', 'Infantry'], ['mobile', 'Mobile / motorized'], ['armor', 'Armor']])),
      field('3D model / look', selectIn(s, 'sprite', sprites), 'Vanilla look, or one of your imported 3D models.'),
      field('Map counter', selectIn(s, 'mapIcon', D.MAP_ICON_CATEGORIES))),
    field('Unit icon', picturePicker(s, 'img', D.IMAGE_SIZES.unitIcon, { onChange: () => list.redraw() })),
    h('div', { class: 'section' }, h('h3', null, 'Equipment needed'), needBox),
    h('div', { class: 'section' }, h('h3', null, 'Base stats'), h('div', { class: 'grid4' },
      field('Combat width', numIn(s, 'width', { min: 0 })), field('Manpower', numIn(s, 'manpower', { min: 0 })),
      field('Training days', numIn(s, 'training', { min: 0 })), field('Organisation', numIn(s, 'org', { min: 0 })),
      field('HP', numIn(s, 'hp', { min: 0 })), field('Suppression', numIn(s, 'suppression', { min: 0 })),
      field('Weight', numIn(s, 'weight', { min: 0 })), field('Supply use', numIn(s, 'supply', { min: 0 })))),
    h('div', { class: 'section' }, h('h3', null, 'How well it uses its equipment (1 = 100%)'), h('div', { class: 'grid4' },
      field('Soft attack ×', numIn(s, 'soft_mult')), field('Hard attack ×', numIn(s, 'hard_mult')),
      field('Defense ×', numIn(s, 'def_mult')), field('Breakthrough ×', numIn(s, 'bt_mult')))),
    h('details', null, h('summary', null, 'Advanced: extra raw script (e.g. terrain bonuses, initiative)'), areaIn(s, 'extra', { code: true, rows: 4, placeholder: 'forest = { attack = 0.1 }' })),
    h('p', { class: 'hint' }, 'New units start locked. Unlock it with a technology ("Unlocks battalions"), or it is unlocked automatically for countries that get it in a division template from the Divisions page.'),
  );
}

function drawModel(m, detail, list) {
  const info = h('div', { class: 'hint' });
  const upd = () => { info.textContent = `Mesh: ${m.meshName || 'none'} · Texture: ${m.textureName || 'none'}`; list.redraw(); };
  upd();
  detail.append(
    h('div', { class: 'grid2' }, field('Name', textIn(m, 'name', { onChange: () => list.redraw() })), field('Model id', idIn(m, 'id'), 'Pick this id as a battalion\'s "3D model / look".')),
    h('div', { class: 'row' },
      h('button', { onclick: async () => { const f = await pickFile('.mesh'); if (!f) return; m.mesh = await readAsDataURL(f); m.meshName = f.name; markDirty(); upd(); toast('Mesh loaded', 'ok'); } }, 'Choose .mesh file…'),
      h('button', { onclick: async () => { const f = await pickFile('.dds,.png,.jpg'); if (!f) return; m.texture = await readAsDataURL(f); m.textureName = f.name; markDirty(); upd(); } }, 'Choose texture (diffuse)…')),
    info,
    h('div', { class: 'grid2' },
      field('Scale', numIn(m, 'scale', { min: 0 })),
      field('Mesh shape name', textIn(m, 'shape', { placeholder: 'e.g. tank_bodyShape' }), 'The object name inside the .mesh (from your 3D tool). Needed for the texture to apply.')),
    h('div', { class: 'notice' }, 'The exporter copies the mesh to gfx/models/, writes a gfx/entities .asset file and names the entity "<model id>_entity". Map units use it automatically when a battalion uses this model id. Animations are not generated — the model will be static.'),
  );
}
