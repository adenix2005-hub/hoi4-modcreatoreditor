import { h, clear, field, textIn, idIn, areaIn, masterList, editorLayout, slug, imgThumb, selectIn } from '../ui.js';
import { project, markDirty, uid, uniqueId, clone, prefix } from '../state.js';
import { modifierList, picturePicker, scriptBox } from '../widgets.js';
import * as D from '../data.js';

let cur = null;

export function render(root) {
  if (cur && !project.ideas.includes(cur)) cur = null;
  clear(root);
  const detail = h('div');
  const list = masterList({
    items: project.ideas,
    title: (i) => i.name || i.id,
    subtitle: (i) => i.id,
    thumb: (i) => imgThumb(i.img, 'square'),
    selected: () => cur,
    addLabel: 'New spirit',
    onAdd: () => {
      const i = { uid: uid(), id: uniqueId(`${prefix()}_new_spirit`, project.ideas.map((x) => x.id)), name: 'New National Spirit', desc: '', img: '', picture: 'generic_morale_bonus', mods: [], allowed: '', category: 'country', extra: '' };
      project.ideas.push(i);
      cur = i;
      markDirty();
      render(root);
    },
    onSelect: (i) => { cur = i; render(root); },
    onDelete: (i) => { project.ideas.splice(project.ideas.indexOf(i), 1); markDirty(); render(root); },
    onDuplicate: (i) => { const n = clone(i); n.uid = uid(); n.id = uniqueId(i.id + '_copy', project.ideas.map((x) => x.id)); project.ideas.push(n); cur = n; markDirty(); render(root); },
  });
  root.append(editorLayout('National Spirits', 'Country-wide bonuses and maluses. Give them out with the "Add national spirit" effect from focuses, events and decisions.', list, detail));
  if (!cur) { detail.append(h('div', { class: 'empty big' }, 'Select or add a national spirit.')); return; }
  const i = cur;
  let touched = false;
  const idBox = idIn(i, 'id', { onChange: () => (touched = true) });
  detail.append(
    h('div', { class: 'grid2' },
      field('Name', textIn(i, 'name', { onChange: () => { if (!touched) { i.id = `${prefix()}_${slug(i.name)}`; idBox.value = i.id; } list.redraw(); } })),
      field('Spirit id', idBox)),
    field('Description', areaIn(i, 'desc', { rows: 2 })),
    field('Picture', picturePicker(i, 'img', D.IMAGE_SIZES.idea, { vanillaKey: 'picture', vanillaList: D.IDEA_PICTURES, onChange: () => list.redraw() })),
    field('Bonuses', modifierList(i.mods)),
    h('details', null, h('summary', null, 'Advanced'),
      field('Category', selectIn(i, 'category', [['country', 'National spirit'], ['hidden_ideas', 'Hidden (not shown)']])),
      field('Allowed (who can ever have it)', scriptBox(i, 'allowed', 'trigger', { rows: 2 })),
      field('Extra raw script', areaIn(i, 'extra', { code: true, rows: 3 }))),
  );
}
