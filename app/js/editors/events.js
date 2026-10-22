import { h, clear, field, textIn, idIn, numIn, areaIn, checkIn, selectIn, masterList, editorLayout, imgThumb } from '../ui.js';
import { project, markDirty, uid, clone, prefix } from '../state.js';
import { scriptBox, picturePicker, tagIn } from '../widgets.js';
import * as D from '../data.js';

let cur = null;

function nextId() {
  const ns = prefix();
  let n = 1;
  const ids = new Set(project.events.map((e) => e.id));
  while (ids.has(`${ns}.${n}`)) n++;
  return `${ns}.${n}`;
}

export function newOption(name = 'OK') {
  return { uid: uid(), name, effects: '', ai: 1, trigger: '' };
}

const MODE_LABEL = { scripted: 'Fired by focus/decision/event', dated: 'On a date', condition: 'When conditions are met' };

export function render(root) {
  if (cur && !project.events.includes(cur)) cur = null;
  clear(root);
  const detail = h('div');
  const list = masterList({
    items: project.events,
    title: (e) => e.title || e.id,
    subtitle: (e) => `${e.id} · ${MODE_LABEL[e.mode]}${e.mode === 'dated' ? ' ' + e.date : ''}`,
    thumb: (e) => imgThumb(e.img, 'wide'),
    selected: () => cur,
    addLabel: 'New event',
    onAdd: () => {
      const e = { uid: uid(), id: nextId(), kind: 'country', title: 'New Event', desc: '', img: '', picture: 'GFX_report_event_generic_read_write', mode: 'scripted', date: '1936.6.1', tag: project.countries[0]?.tag || '', trigger: '', mtth: 1, fireOnce: true, hidden: false, immediate: '', major: false, options: [newOption('Interesting.')] };
      project.events.push(e);
      cur = e;
      markDirty();
      render(root);
    },
    onSelect: (e) => { cur = e; render(root); },
    onDelete: (e) => { project.events.splice(project.events.indexOf(e), 1); markDirty(); render(root); },
    onDuplicate: (e) => { const n = clone(e); n.uid = uid(); n.id = nextId(); project.events.push(n); cur = n; markDirty(); render(root); },
  });
  root.append(editorLayout('Events', 'Pop-up events with choices. "Fired by" events are triggered from a focus, decision or another event (use "Fire country event"). Dated events happen on a specific day; condition events happen as soon as their conditions are true.', list, detail));
  if (!cur) { detail.append(h('div', { class: 'empty big' }, 'Select or add an event.')); return; }
  const e = cur;
  const preview = h('div', { class: 'event-preview' });
  const drawPreview = () => {
    clear(preview);
    preview.append(
      h('div', { class: 'ev-title' }, e.title || e.id),
      e.img ? h('img', { src: e.img, class: 'ev-pic' }) : h('div', { class: 'ev-pic ph' }, e.picture || 'picture'),
      h('div', { class: 'ev-desc' }, e.desc || 'Event description…'),
      e.options.map((o) => h('div', { class: 'ev-opt' }, o.name || '…')),
    );
  };
  drawPreview();
  const modeBox = h('div');
  const drawMode = () => {
    clear(modeBox);
    if (e.mode === 'dated') {
      modeBox.append(h('div', { class: 'grid2' }, field('Date (YYYY.M.D)', textIn(e, 'date', { placeholder: '1938.3.12' })), field('Country', tagIn(e, 'tag', { allowAll: e.kind === 'news' }))),
        field('Extra conditions (optional)', scriptBox(e, 'trigger', 'trigger', { rows: 2 })));
    } else if (e.mode === 'condition') {
      modeBox.append(h('div', { class: 'grid2' }, field('Country (optional)', tagIn(e, 'tag')), field('Average days until it fires', numIn(e, 'mtth', { min: 1 }))),
        field('Conditions', scriptBox(e, 'trigger', 'trigger', { rows: 3 })));
    } else {
      modeBox.append(h('p', { class: 'hint' }, `Fire it from anywhere with the effect: country_event = ${e.id}`));
    }
  };
  drawMode();
  const opts = h('div');
  const drawOpts = () => {
    clear(opts);
    e.options.forEach((o, i) => {
      opts.append(h('div', { class: 'option-card' },
        h('div', { class: 'row' }, h('b', null, `Option ${String.fromCharCode(65 + i)}`),
          h('span', { class: 'grow' }),
          i > 0 ? h('button', { class: 'icon', title: 'Move up', onclick: () => { e.options.splice(i - 1, 0, e.options.splice(i, 1)[0]); markDirty(); drawOpts(); drawPreview(); } }, '↑') : null,
          h('button', { class: 'icon danger', title: 'Remove', onclick: () => { e.options.splice(i, 1); markDirty(); drawOpts(); drawPreview(); } }, '✕')),
        h('div', { class: 'grid2' }, field('Button text', textIn(o, 'name', { onChange: drawPreview })), field('AI chance (weight)', numIn(o, 'ai', { min: 0 }))),
        field('Effects', scriptBox(o, 'effects', 'effect', { rows: 3 })),
        h('details', null, h('summary', null, 'Only show this option if…'), scriptBox(o, 'trigger', 'trigger', { rows: 2 }))));
    });
    opts.append(h('button', { onclick: () => { e.options.push(newOption('Another choice')); markDirty(); drawOpts(); drawPreview(); } }, '+ Add option'));
  };
  drawOpts();
  detail.append(
    h('div', { class: 'event-grid' },
      h('div', null,
        h('div', { class: 'grid2' },
          field('Event id', idIn(e, 'id'), 'namespace.number'),
          field('Type', selectIn(e, 'kind', [['country', 'Country event'], ['news', 'News event (everyone sees it)']], { onChange: drawMode }))),
        field('Title', textIn(e, 'title', { onChange: () => { drawPreview(); list.redraw(); } })),
        field('Description', areaIn(e, 'desc', { rows: 4, onChange: drawPreview })),
        field('Picture', picturePicker(e, 'img', D.IMAGE_SIZES.event, { vanillaKey: 'picture', vanillaList: D.EVENT_PICTURES, onChange: drawPreview })),
        field('When does it happen?', selectIn(e, 'mode', Object.entries(MODE_LABEL), { onChange: () => { drawMode(); list.redraw(); } })),
        modeBox,
        h('div', { class: 'row' }, checkIn(e, 'fireOnce', 'Only once'), checkIn(e, 'hidden', 'Hidden (no pop-up, just runs effects)'), checkIn(e, 'major', 'Major (everyone sees news)')),
        field('Immediate effects (run when the event opens)', scriptBox(e, 'immediate', 'effect', { rows: 2 })),
      ),
      h('div', null, h('div', { class: 'hint' }, 'Preview'), preview),
    ),
    h('div', { class: 'section' }, h('h3', null, 'Options'), opts),
  );
}
