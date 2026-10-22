// Reusable editing widgets: script builder, modifier list, picture picker, tag picker.
import { h, clear, modal, field, datalist, pickFile, readAsDataURL, toast } from './ui.js';
import { project, markDirty } from './state.js';
import * as D from './data.js';
import { normalizeUpload } from './images.js';
import { checkBraces } from './pdx.js';
import { allEventIds, allFocusIds, allIdeaIds, allTechIds, allEquipmentIds, allCharacterIds, allMechVars, allBopIds, allDecisionIds, allTreeIds } from './refs.js';

// Values offered for each param type in the builder
function optionsFor(t) {
  switch (t) {
    case 'tag': return [...new Set([...project.countries.map((c) => c.tag), ...D.COUNTRIES.map((c) => c[0])])];
    case 'idea': return allIdeaIds();
    case 'event': return allEventIds();
    case 'focus': return allFocusIds();
    case 'tech': return allTechIds();
    case 'equip': return allEquipmentIds();
    case 'ideology': return D.MAIN_IDEOLOGIES;
    case 'bool': return ['yes', 'no'];
    case 'character': return allCharacterIds();
    case 'mech': return allMechVars();
    case 'bop': return allBopIds();
    case 'decision': return allDecisionIds();
    case 'tree': return allTreeIds();
    case 'techcat': return D.TECH_CATEGORIES;
    default: return null;
  }
}

function paramInput(p, values) {
  const opts = optionsFor(p.t);
  const def = p.d ?? (opts && opts[0]) ?? '';
  values[p.n] = def;
  let el;
  if (p.t === 'bool' || p.t === 'ideology') {
    el = h('select', null, opts.map((o) => h('option', { value: o, selected: o === def }, o)));
    el.addEventListener('change', () => (values[p.n] = el.value));
  } else {
    el = h('input', { type: p.t === 'num' ? 'number' : 'text', step: 'any', value: def, list: opts ? datalist(opts) : null });
    el.addEventListener('input', () => (values[p.n] = el.value));
  }
  return field(p.l, el, opts && !opts.length ? 'Nothing created yet — type a name.' : null);
}

// Opens the "add effect/trigger" picker. Calls onInsert(text).
export function openBuilder(kind, onInsert) {
  const catalog = kind === 'trigger' ? D.TRIGGERS : D.EFFECTS;
  const search = h('input', { type: 'search', placeholder: 'Search… (e.g. "factory", "event", "war")' });
  const list = h('div', { class: 'builder-list' });
  const form = h('div', { class: 'builder-form' }, h('p', { class: 'hint' }, 'Pick something on the left.'));
  let current = null;
  let values = {};
  const pick = (entry) => {
    current = entry;
    values = {};
    clear(form);
    form.append(h('h4', null, entry.label));
    for (const p of entry.params) form.append(paramInput(p, values));
    if (!entry.params.length) form.append(h('p', { class: 'hint' }, 'No settings needed.'));
    draw();
  };
  const draw = () => {
    clear(list);
    const q = search.value.toLowerCase();
    let lastCat = null;
    for (const e of catalog) {
      if (q && !(e.label + ' ' + (e.cat || '')).toLowerCase().includes(q)) continue;
      if (e.cat && e.cat !== lastCat) { list.append(h('div', { class: 'builder-cat' }, e.cat)); lastCat = e.cat; }
      list.append(h('div', { class: 'builder-item' + (current === e ? ' sel' : ''), onclick: () => pick(e), ondblclick: () => { pick(e); } }, e.label));
    }
  };
  search.addEventListener('input', draw);
  draw();
  modal(kind === 'trigger' ? 'Add a condition' : 'Add an effect', h('div', { class: 'builder' }, h('div', { class: 'builder-left' }, search, list), form), [
    { label: 'Cancel' },
    {
      label: 'Insert', primary: true, onClick: () => {
        if (!current) { toast('Pick an entry first', 'warn'); return false; }
        onInsert(current.tpl(values));
      },
    },
  ], { wide: true });
}

// Script textarea + "Add…" helper button. kind = 'effect' | 'trigger'
export function scriptBox(obj, key, kind, opts = {}) {
  const ta = h('textarea', { class: 'code', rows: opts.rows || 4, spellcheck: 'false', placeholder: opts.placeholder || (kind === 'trigger' ? 'Leave empty = always' : 'Leave empty = nothing happens') });
  ta.value = obj[key] || '';
  const err = h('div', { class: 'script-err' });
  const check = () => { const e = checkBraces(ta.value); err.textContent = e ? '⚠ ' + e : ''; };
  ta.addEventListener('input', () => { obj[key] = ta.value; markDirty(); check(); });
  check();
  const add = h('button', {
    class: 'small', onclick: () => openBuilder(kind, (text) => {
      ta.value = (ta.value.trim() ? ta.value.replace(/\s+$/, '') + '\n' : '') + text;
      obj[key] = ta.value;
      markDirty();
      check();
    }),
  }, kind === 'trigger' ? '+ Add condition' : '+ Add effect');
  return h('div', { class: 'script-box' }, h('div', { class: 'script-tools' }, add, opts.help ? h('span', { class: 'hint' }, opts.help) : null), ta, err);
}

// List of { key, value } modifier rows.
export function modifierList(arr, opts = {}) {
  const wrap = h('div', { class: 'mods' });
  const dl = datalist(D.MODIFIERS.map((m) => [m[0], m[1]]));
  const draw = () => {
    clear(wrap);
    if (!arr.length) wrap.append(h('div', { class: 'hint' }, opts.empty || 'No bonuses yet.'));
    arr.forEach((m, i) => {
      const info = D.modifierInfo(m.key);
      const keyIn = h('input', { type: 'text', value: m.key, list: dl, placeholder: 'modifier' });
      const valIn = h('input', { type: 'number', step: 'any', value: m.value });
      const desc = h('span', { class: 'mod-desc' });
      const upd = () => {
        const inf = D.modifierInfo(m.key);
        const v = Number(m.value) || 0;
        const shown = inf && inf[2] === 'pct' ? `${v > 0 ? '+' : ''}${Math.round(v * 1000) / 10}%` : `${v > 0 ? '+' : ''}${v}`;
        desc.textContent = (inf ? inf[1] : 'custom modifier') + ': ' + shown;
        desc.className = 'mod-desc ' + (v > 0 ? 'pos' : v < 0 ? 'neg' : '');
      };
      keyIn.addEventListener('input', () => { m.key = keyIn.value.trim(); markDirty(); upd(); });
      valIn.addEventListener('input', () => { m.value = valIn.value === '' ? 0 : Number(valIn.value); markDirty(); upd(); });
      upd();
      wrap.append(h('div', { class: 'mod-row' }, keyIn, valIn, desc, h('button', { class: 'icon danger', title: 'Remove', onclick: () => { arr.splice(i, 1); markDirty(); draw(); } }, '✕')));
      void info;
    });
    wrap.append(h('div', { class: 'mod-add' },
      h('button', { class: 'small', onclick: () => openModifierPicker((key) => { const inf = D.modifierInfo(key); arr.push({ key, value: inf && inf[2] === 'pct' ? 0.1 : 1 }); markDirty(); draw(); }) }, '+ Add bonus'),
      h('span', { class: 'hint' }, ' 0.1 = +10% for percentage bonuses. Use negative numbers for maluses.'),
    ));
  };
  draw();
  return wrap;
}

export function openModifierPicker(onPick) {
  const search = h('input', { type: 'search', placeholder: 'Search bonuses…' });
  const list = h('div', { class: 'builder-list tall' });
  let close;
  const draw = () => {
    clear(list);
    const q = search.value.toLowerCase();
    let last = null;
    for (const m of D.MODIFIERS) {
      if (q && !(m[0] + ' ' + m[1]).toLowerCase().includes(q)) continue;
      if (m[3] !== last) { list.append(h('div', { class: 'builder-cat' }, m[3])); last = m[3]; }
      list.append(h('div', { class: 'builder-item', onclick: () => { onPick(m[0]); close(); } }, m[1], h('span', { class: 'hint' }, '  ' + m[0])));
    }
    list.append(h('div', { class: 'builder-item', onclick: () => { onPick(search.value.trim() || 'custom_modifier'); close(); } }, h('i', null, 'Use a custom modifier name: "' + (search.value || '…') + '"')));
  };
  search.addEventListener('input', draw);
  draw();
  close = modal('Add a bonus', h('div', null, search, list), [{ label: 'Cancel' }]);
}

// Picture picker: stores a data URL in obj[key]. Vanilla GFX name stored in obj[vanillaKey] when given.
export function picturePicker(obj, key, size, opts = {}) {
  const [w, hgt] = size;
  const preview = h('div', { class: 'pic-preview', style: { width: Math.min(w, 160) + 'px', height: Math.round(Math.min(w, 160) * hgt / w) + 'px' } });
  const draw = () => {
    clear(preview);
    if (obj[key]) preview.append(h('img', { src: obj[key] }));
    else preview.append(h('span', null, opts.vanillaKey && obj[opts.vanillaKey] ? obj[opts.vanillaKey] : 'No picture'));
  };
  draw();
  const upload = h('button', {
    class: 'small', onclick: async () => {
      const f = await pickFile('image/png,image/jpeg,image/webp,image/gif,image/bmp');
      if (!f) return;
      try {
        obj[key] = await normalizeUpload(await readAsDataURL(f), Math.max(w * 2, 256), Math.max(hgt * 2, 256));
        markDirty();
        draw();
        opts.onChange && opts.onChange();
      } catch (e) { toast('Could not read that image', 'error'); }
    },
  }, 'Upload picture…');
  const remove = h('button', { class: 'small', onclick: () => { obj[key] = ''; markDirty(); draw(); opts.onChange && opts.onChange(); } }, 'Remove');
  let vanilla = null;
  if (opts.vanillaKey) {
    const inp = h('input', { type: 'text', value: obj[opts.vanillaKey] || '', list: opts.vanillaList ? datalist(opts.vanillaList) : null, placeholder: 'or a vanilla picture name' });
    inp.addEventListener('input', () => { obj[opts.vanillaKey] = inp.value.trim(); markDirty(); draw(); opts.onChange && opts.onChange(); });
    vanilla = h('div', { class: 'pic-vanilla' }, h('span', { class: 'hint' }, 'Or use a game picture: '), inp);
  }
  return h('div', { class: 'pic' }, preview, h('div', { class: 'pic-actions' }, upload, remove, h('div', { class: 'hint' }, `Any PNG/JPG works — it is resized to ${w}×${hgt} and converted to ${opts.ext || '.dds'} on export.`), vanilla));
}

// Country picker input with all known tags.
export function tagIn(obj, key, opts = {}) {
  const tags = [...project.countries.map((c) => [c.tag, c.name]), ...D.COUNTRIES.filter((c) => !project.countries.some((p) => p.tag === c[0]))];
  if (opts.allowAll) tags.unshift(['ALL', 'All countries']);
  const el = h('input', { type: 'text', value: obj[key] || '', list: datalist(tags), placeholder: opts.placeholder || 'e.g. GER', class: 'tag-in' });
  el.addEventListener('input', () => { obj[key] = el.value.trim().toUpperCase(); markDirty(); opts.onChange && opts.onChange(obj[key]); });
  el.addEventListener('blur', () => { el.value = obj[key] || ''; });
  return el;
}

// Editable list of strings (chips) with suggestions
export function chipList(arr, suggestions, opts = {}) {
  const wrap = h('div', { class: 'chips' });
  const dl = datalist(suggestions);
  const draw = () => {
    clear(wrap);
    arr.forEach((v, i) => wrap.append(h('span', { class: 'chip' }, v, h('button', { class: 'chip-x', onclick: () => { arr.splice(i, 1); markDirty(); draw(); opts.onChange && opts.onChange(); } }, '×'))));
    const inp = h('input', { type: 'text', list: dl, placeholder: opts.placeholder || 'add…', class: 'chip-in' });
    let done = false;
    const add = () => {
      if (done) return;
      done = true;
      const v = inp.value.trim();
      inp.value = '';
      if (v && !arr.includes(v)) { arr.push(v); markDirty(); opts.onChange && opts.onChange(); }
      draw();
      const ni = wrap.querySelector('.chip-in');
      ni && ni.focus();
    };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
    inp.addEventListener('change', () => { if (!done && inp.isConnected && inp.value && suggestions.some((s) => (Array.isArray(s) ? s[0] : s) === inp.value)) add(); });
    wrap.append(inp);
  };
  draw();
  return wrap;
}
