import { h, clear, field, textIn, numIn, checkIn, selectIn, masterList, editorLayout, imgThumb, modal, toast } from '../ui.js';
import { project, markDirty, uid } from '../state.js';
import { picturePicker, tagIn, chipList } from '../widgets.js';
import * as D from '../data.js';

let cur = null;

export const CULTURES = [
  ['western_european', 'Western European'], ['eastern_european', 'Eastern European'], ['middle_eastern', 'Middle Eastern'],
  ['african', 'African'], ['southamerican', 'South American'], ['commonwealth', 'Commonwealth'], ['asian', 'Asian'],
];

const IDEO_LABEL = { democratic: 'Democratic', communism: 'Communist', fascism: 'Fascist', neutrality: 'Non-aligned' };

export function newCountry(tag = '') {
  return {
    uid: uid(), tag, name: 'New Country', isNew: true, adj: '', def: '', color: '#7a5c9e', culture: 'western_european',
    flag: '', ideoFlags: { democratic: '', communism: '', fascism: '', neutrality: '' },
    ideoNames: { democratic: '', communism: '', fascism: '', neutrality: '' },
    existsAtStart: true, states: [], cores: [], capital: '',
    ruling: 'neutrality', popularity: { democratic: 20, communism: 10, fascism: 10, neutrality: 60 },
    elections: false, stability: 0.5, warSupport: 0.3, researchSlots: 3, convoys: 10, basicTechs: true,
  };
}

function usedTags() {
  return new Set([...project.countries.map((c) => c.tag), ...D.COUNTRIES.map((c) => c[0])]);
}

function suggestTag(name, self) {
  const used = usedTags();
  if (self) used.delete(self.tag);
  const letters = String(name || 'NEW').toUpperCase().replace(/[^A-Z]/g, '') + 'XYZ';
  for (let i = 1; i < letters.length; i++) for (let j = i + 1; j < letters.length; j++) {
    const t = letters[0] + letters[i] + letters[j];
    if (!used.has(t)) return t;
  }
  for (let n = 0; n < 1000; n++) { const t = 'Z' + String(n).padStart(2, '0'); if (!used.has(t)) return t; }
  return 'ZZZ';
}

export function render(root) {
  if (cur && !project.countries.includes(cur)) cur = null;
  clear(root);
  const detail = h('div');
  const list = masterList({
    items: project.countries,
    title: (c) => `${c.tag || '???'} – ${c.name || ''}`,
    subtitle: (c) => (c.isNew ? 'new country' : 'existing country (vanilla)'),
    thumb: (c) => (c.isNew ? imgThumb(c.flag, 'wide') : h('div', { class: 'thumb ph wide' }, c.tag || '?')),
    selected: () => cur,
    addLabel: 'New country',
    extraButtons: h('button', { onclick: () => { const c = { uid: uid(), tag: '', name: '', isNew: false }; project.countries.push(c); cur = c; markDirty(); render(root); } }, '+ Existing country'),
    onAdd: () => { const c = newCountry(); c.tag = suggestTag(c.name); project.countries.push(c); cur = c; markDirty(); render(root); },
    onSelect: (c) => { cur = c; render(root); },
    onDelete: (c) => { project.countries.splice(project.countries.indexOf(c), 1); markDirty(); render(root); },
  });
  root.append(editorLayout('Countries', 'Add vanilla countries you are changing (so they appear first in pickers), or create brand-new countries with their own tag, flag, colour, territory and politics.', list, detail));
  if (!cur) { detail.append(h('div', { class: 'empty big' }, 'Select a country, or create a new one.')); return; }
  const c = cur;
  if (!c.isNew) {
    detail.append(h('div', { class: 'grid2' },
      field('Country tag', tagIn(c, 'tag', { onChange: (v) => { const k = D.COUNTRIES.find((x) => x[0] === v); if (k && !c.name) c.name = k[1]; list.redraw(); } })),
      field('Name (for your reference)', textIn(c, 'name', { onChange: () => list.redraw() }))),
      h('p', { class: 'hint' }, 'This is a vanilla country — nothing is changed about it by itself. Use the other sections (focus trees, people, events…) to change it.'),
      h('button', { onclick: () => { Object.assign(c, { ...newCountry(c.tag), uid: c.uid, tag: suggestTag(c.name), name: c.name || 'New Country' }); markDirty(); render(root); } }, 'Turn into a brand-new country instead'));
    return;
  }
  const tagWarn = h('div', { class: 'script-err' });
  const checkTag = () => {
    const t = c.tag || '';
    tagWarn.textContent = !/^[A-Z][A-Z0-9]{2}$/.test(t) ? '⚠ Tag must be 3 characters: a capital letter, then letters/digits (e.g. NRD).'
      : D.COUNTRIES.some((x) => x[0] === t) ? '⚠ This tag is already used by a vanilla country.'
        : project.countries.filter((x) => x.tag === t).length > 1 ? '⚠ Another country in this mod uses this tag.' : '';
  };
  checkTag();
  const tagInput = h('input', { type: 'text', value: c.tag, maxlength: 3, class: 'tag-in' });
  tagInput.addEventListener('input', () => { c.tag = tagInput.value.toUpperCase(); c._tagEdited = true; markDirty(); checkTag(); list.redraw(); });
  const colorIn = h('input', { type: 'color', value: c.color || '#7a5c9e', class: 'color-in' });
  colorIn.addEventListener('input', () => { c.color = colorIn.value; markDirty(); });
  const popBox = h('div');
  const drawPop = () => {
    clear(popBox);
    const total = D.MAIN_IDEOLOGIES.reduce((a, i) => a + (Number(c.popularity[i]) || 0), 0);
    popBox.append(h('div', { class: 'grid4' }, D.MAIN_IDEOLOGIES.map((i) => field(IDEO_LABEL[i] + ' %', numIn(c.popularity, i, { min: 0, max: 100, onChange: () => { totalEl.textContent = totalText(); } })))));
    const totalText = () => { const t = D.MAIN_IDEOLOGIES.reduce((a, i) => a + (Number(c.popularity[i]) || 0), 0); return `Total: ${t}%` + (t !== 100 ? ' (will be scaled to 100%)' : ''); };
    const totalEl = h('div', { class: 'hint' }, totalText());
    popBox.append(totalEl);
    void total;
  };
  drawPop();
  detail.append(
    h('div', { class: 'grid-portrait' },
      h('div', null,
        field('Flag', picturePicker(c, 'flag', [82, 52], { ext: '.tga', onChange: () => list.redraw() })),
        field('Map colour', colorIn)),
      h('div', null,
        h('div', { class: 'grid2' },
          field('Tag', h('div', null, tagInput, tagWarn), '3-letter code used everywhere in script.'),
          field('Name', textIn(c, 'name', { onChange: () => { if (!c._tagEdited) { c.tag = suggestTag(c.name, c); tagInput.value = c.tag; checkTag(); } list.redraw(); } }))),
        h('div', { class: 'grid2' },
          field('Adjective', textIn(c, 'adj', { placeholder: 'e.g. Nordic' })),
          field('Name with article', textIn(c, 'def', { placeholder: 'e.g. the Nordic Union' }))),
        field('Unit models & portrait style', selectIn(c, 'culture', CULTURES), 'Picks which vanilla 3D models and generic portraits it uses.'),
      )),
    h('div', { class: 'section' }, h('h3', null, 'Territory'),
      checkIn(c, 'existsAtStart', 'Exists at game start (takes the states below from their owners)', { onChange: () => render(root) }),
      field(c.existsAtStart ? 'States it owns' : 'States it has cores on (so it can be released later)', chipList(c.existsAtStart ? c.states : c.cores, [], { placeholder: 'type a state id and press Enter' }),
        'State ids: in game open the console and type "tdebug", then hover a state. Example: 64 = Berlin.'),
      c.existsAtStart ? h('div', { class: 'grid2' },
        field('Capital state', textIn(c, 'capital', { placeholder: 'state id, e.g. 64' })),
        field('Also cores on (optional)', chipList(c.cores, [], { placeholder: 'state id…' }))) : h('p', { class: 'hint' }, 'Release it later from a focus/decision/event with the "Release country" effect.'),
    ),
    h('div', { class: 'section' }, h('h3', null, 'Politics at start'),
      h('div', { class: 'grid3' },
        field('Ruling party', selectIn(c, 'ruling', D.MAIN_IDEOLOGIES.map((i) => [i, IDEO_LABEL[i]]))),
        h('div', null, checkIn(c, 'elections', 'Elections allowed')),
        h('div')),
      popBox,
      h('div', { class: 'grid4' },
        field('Stability (0–1)', numIn(c, 'stability', { min: 0, max: 1 })),
        field('War support (0–1)', numIn(c, 'warSupport', { min: 0, max: 1 })),
        field('Research slots', numIn(c, 'researchSlots', { min: 1, max: 10 })),
        field('Convoys', numIn(c, 'convoys', { min: 0 }))),
      checkIn(c, 'basicTechs', 'Start with basic 1936 technologies (rifles, support, engineers, recon…)'),
      h('p', { class: 'hint' }, 'Leader: create a person in "People" with this tag, tick "Country leader" and "Make them the leader at game start". Divisions: use the Division Designer with this tag.'),
    ),
    h('details', { class: 'section' }, h('summary', null, 'Names & flags per ideology (optional)'),
      h('p', { class: 'hint' }, 'E.g. "People\'s Republic of …" when communist. Leave empty to use the normal name/flag.'),
      D.MAIN_IDEOLOGIES.map((i) => h('div', { class: 'option-card' },
        h('b', null, IDEO_LABEL[i]),
        h('div', { class: 'grid2' },
          field('Name', textIn(c.ideoNames, i, { placeholder: c.name })),
          field('Flag', picturePicker(c.ideoFlags, i, [82, 52], { ext: '.tga' })))))),
  );
  void modal; void toast;
}
