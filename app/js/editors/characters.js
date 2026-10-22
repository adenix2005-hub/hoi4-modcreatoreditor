import { h, clear, field, textIn, idIn, numIn, areaIn, checkIn, selectIn, masterList, editorLayout, slug, imgThumb } from '../ui.js';
import { project, markDirty, uid, uniqueId, clone } from '../state.js';
import { picturePicker, tagIn, chipList } from '../widgets.js';
import * as D from '../data.js';
import { allLeaderTraitIds, allUnitTraitIds } from '../refs.js';

let cur = null;

function blank() {
  return {
    uid: uid(), id: '', name: 'New Person', tag: '', desc: '', portrait: '', portraitPath: '',
    leader: { on: false, ideology: 'despotism', traits: [], atStart: false },
    advisor: { on: false, slot: 'political_advisor', cost: 150, traits: [], ideaToken: '' },
    general: { on: false, type: 'corps_commander', skill: 3, attack: 3, defense: 3, planning: 3, logistics: 3, traits: [] },
    admiral: { on: false, skill: 3, attack: 3, defense: 3, maneuvering: 3, coordination: 3, traits: [] },
    recruit: true,
  };
}

function roles(c) {
  return [c.leader.on && 'Leader', c.advisor.on && 'Advisor', c.general.on && (c.general.type === 'field_marshal' ? 'Field Marshal' : 'General'), c.admiral.on && 'Admiral'].filter(Boolean).join(', ') || 'no role';
}

export function render(root) {
  if (cur && !project.characters.includes(cur)) cur = null;
  clear(root);
  const detail = h('div');
  const list = masterList({
    items: project.characters,
    title: (c) => c.name,
    subtitle: (c) => `${c.tag || '—'} · ${roles(c)}`,
    thumb: (c) => imgThumb(c.portrait, 'portrait'),
    selected: () => cur,
    addLabel: 'New person',
    empty: 'No people yet. Add leaders, advisors, generals and admirals here.',
    onAdd: () => {
      const c = blank();
      c.tag = project.countries[0]?.tag || '';
      c.id = uniqueId(`${c.tag || 'TAG'}_new_person`, project.characters.map((x) => x.id));
      project.characters.push(c);
      cur = c;
      markDirty();
      render(root);
    },
    onSelect: (c) => { cur = c; render(root); },
    onDelete: (c) => { project.characters.splice(project.characters.indexOf(c), 1); if (cur === c) cur = null; markDirty(); render(root); },
    onDuplicate: (c) => { const n = clone(c); n.uid = uid(); n.id = uniqueId(c.id + '_copy', project.characters.map((x) => x.id)); n.name += ' (copy)'; project.characters.push(n); cur = n; markDirty(); render(root); },
  });
  root.append(editorLayout('People: Leaders, Advisors & Generals', 'Create a person once, then give them one or more roles. Upload any picture as their portrait — it is converted for the game automatically.', list, detail));
  if (!cur) { detail.append(h('div', { class: 'empty big' }, 'Select or add a person.')); return; }
  const c = cur;
  const autoId = () => { if (!c._idEdited) { c.id = uniqueId(`${c.tag || 'TAG'}_${slug(c.name)}`, project.characters.filter((x) => x !== c).map((x) => x.id)); idBox.value = c.id; } };
  const idBox = idIn(c, 'id', { onChange: () => (c._idEdited = true) });
  detail.append(
    h('div', { class: 'grid-portrait' },
      h('div', null,
        field('Portrait', picturePicker(c, 'portrait', D.IMAGE_SIZES.portraitLarge, { onChange: () => list.redraw() })),
        field('…or existing game portrait path', textIn(c, 'portraitPath', { placeholder: 'gfx/leaders/GER/Portrait_Germany_Adolf_Hitler.dds' }))),
      h('div', null,
        field('Name', textIn(c, 'name', { onChange: () => { autoId(); list.redraw(); } })),
        field('Country', tagIn(c, 'tag', { onChange: () => { autoId(); list.redraw(); } })),
        field('Character id', idBox, 'Used by effects like "recruit_character".'),
        field('Description / biography', areaIn(c, 'desc', { rows: 3 })),
        checkIn(c, 'recruit', 'Available to this country from game start'),
      ),
    ),
    roleLeader(c, list),
    roleAdvisor(c, list),
    roleGeneral(c, list),
    roleAdmiral(c, list),
  );
}

function roleBox(title, obj, list, content, hint) {
  const body = h('div', { class: 'role-body' + (obj.on ? '' : ' hidden') }, content);
  const toggle = checkIn(obj, 'on', title, { onChange: (v) => { body.classList.toggle('hidden', !v); list.redraw(); } });
  return h('div', { class: 'role' }, h('div', { class: 'role-head' }, toggle, hint ? h('span', { class: 'hint' }, hint) : null), body);
}

function roleLeader(c, list) {
  const ideologies = Object.entries(D.IDEOLOGIES).flatMap(([main, subs]) => subs.map((s) => [s, `${s} (${main})`]));
  return roleBox('Country leader', c.leader, list, [
    h('div', { class: 'grid2' },
      field('Ideology', selectIn(c.leader, 'ideology', ideologies)),
      h('div', null, checkIn(c.leader, 'atStart', 'Make them the leader at game start'))),
    field('Leader traits', chipList(c.leader.traits, allLeaderTraitIds(), { placeholder: 'add trait…' }), 'Make your own traits in "Traits" and pick them here.'),
  ], 'Runs the country when their party is in power.');
}

function roleAdvisor(c, list) {
  return roleBox('Advisor / High command', c.advisor, list, [
    h('div', { class: 'grid2' },
      field('Slot', selectIn(c.advisor, 'slot', D.ADVISOR_SLOTS)),
      field('Political power cost', numIn(c.advisor, 'cost', { min: 0 }))),
    field('Advisor traits', chipList(c.advisor.traits, allLeaderTraitIds(), { placeholder: 'e.g. army_chief_offensive_2 or your own' }), 'The trait decides the bonus. Create custom ones under "Traits" to set exact buffs.'),
  ], 'Hireable in the politics screen.');
}

function roleGeneral(c, list) {
  return roleBox('General / Field marshal', c.general, list, [
    h('div', { class: 'grid3' },
      field('Rank', selectIn(c.general, 'type', [['corps_commander', 'General'], ['field_marshal', 'Field Marshal']])),
      field('Skill level', numIn(c.general, 'skill', { min: 1, max: 9 })),
      field('Attack', numIn(c.general, 'attack', { min: 1 })),
      field('Defense', numIn(c.general, 'defense', { min: 1 })),
      field('Planning', numIn(c.general, 'planning', { min: 1 })),
      field('Logistics', numIn(c.general, 'logistics', { min: 1 }))),
    field('Traits', chipList(c.general.traits, allUnitTraitIds(), { placeholder: 'e.g. panzer_leader' })),
  ]);
}

function roleAdmiral(c, list) {
  return roleBox('Admiral', c.admiral, list, [
    h('div', { class: 'grid3' },
      field('Skill level', numIn(c.admiral, 'skill', { min: 1, max: 9 })),
      field('Attack', numIn(c.admiral, 'attack', { min: 1 })),
      field('Defense', numIn(c.admiral, 'defense', { min: 1 })),
      field('Maneuvering', numIn(c.admiral, 'maneuvering', { min: 1 })),
      field('Coordination', numIn(c.admiral, 'coordination', { min: 1 }))),
    field('Traits', chipList(c.admiral.traits, allUnitTraitIds(), { placeholder: 'e.g. seawolf' })),
  ]);
}
