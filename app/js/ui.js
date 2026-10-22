// Small DOM toolkit used by all editors.
import { markDirty } from './state.js';

export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'html') el.innerHTML = v;
      else if (k in el && typeof v !== 'string') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  appendAll(el, children);
  return el;
}

function appendAll(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export function clear(el) {
  el.replaceChildren();
  return el;
}

export function slug(s) {
  return String(s || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48) || 'item';
}

export function toast(msg, type = 'info') {
  const box = document.getElementById('toasts');
  const t = h('div', { class: 'toast ' + type }, msg);
  box.append(t);
  setTimeout(() => t.classList.add('hide'), 3200);
  setTimeout(() => t.remove(), 3800);
}

export function modal(title, body, buttons = [{ label: 'Close' }], opts = {}) {
  const back = h('div', { class: 'modal-back' });
  const close = () => back.remove();
  const btns = buttons.map((b) =>
    h('button', {
      class: b.primary ? 'primary' : b.danger ? 'danger' : '',
      onclick: async () => {
        if (b.onClick && (await b.onClick()) === false) return;
        close();
      },
    }, b.label),
  );
  const box = h('div', { class: 'modal' + (opts.wide ? ' wide' : '') }, h('h2', null, title), h('div', { class: 'modal-body' }, body), h('div', { class: 'modal-buttons' }, btns));
  back.append(box);
  back.addEventListener('mousedown', (e) => { if (e.target === back && !opts.sticky) close(); });
  document.body.append(back);
  const first = box.querySelector('input,select,textarea');
  if (first) setTimeout(() => first.focus(), 30);
  return close;
}

export function confirmDlg(msg) {
  return new Promise((res) => {
    modal('Are you sure?', h('p', null, msg), [
      { label: 'Cancel', onClick: () => res(false) },
      { label: 'Yes', danger: true, onClick: () => res(true) },
    ], { sticky: true });
  });
}

export function promptDlg(title, value = '', hint = '') {
  return new Promise((res) => {
    const inp = h('input', { type: 'text', value });
    let done = false;
    const close = modal(title, h('div', null, hint ? h('p', { class: 'hint' }, hint) : null, inp), [
      { label: 'Cancel', onClick: () => { done = true; res(null); } },
      { label: 'OK', primary: true, onClick: () => { done = true; res(inp.value.trim()); } },
    ], { sticky: true });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !done) { done = true; res(inp.value.trim()); close(); }
    });
  });
}

// ---------- bound inputs (edit an object's property in place) ----------
function after(opts, val) {
  markDirty();
  if (opts && opts.onChange) opts.onChange(val);
}

export function textIn(obj, key, opts = {}) {
  const el = h('input', { type: 'text', value: obj[key] ?? '', placeholder: opts.placeholder || '', list: opts.list || null });
  el.addEventListener('input', () => {
    obj[key] = opts.transform ? opts.transform(el.value) : el.value;
    after(opts, obj[key]);
  });
  if (opts.transform) el.addEventListener('blur', () => { el.value = obj[key] ?? ''; });
  return el;
}

export function idIn(obj, key, opts = {}) {
  return textIn(obj, key, { ...opts, transform: (v) => v.replace(/[^A-Za-z0-9_.]/g, '_') });
}

export function numIn(obj, key, opts = {}) {
  const el = h('input', { type: 'number', value: obj[key] ?? '', step: opts.step ?? 'any', min: opts.min ?? null, max: opts.max ?? null });
  el.addEventListener('input', () => {
    obj[key] = el.value === '' ? (opts.allowEmpty ? '' : 0) : Number(el.value);
    after(opts, obj[key]);
  });
  return el;
}

export function areaIn(obj, key, opts = {}) {
  const el = h('textarea', { rows: opts.rows || 3, placeholder: opts.placeholder || '', spellcheck: opts.code ? 'false' : 'true', class: opts.code ? 'code' : '' });
  el.value = obj[key] ?? '';
  el.addEventListener('input', () => { obj[key] = el.value; after(opts, el.value); });
  return el;
}

export function selectIn(obj, key, options, opts = {}) {
  const el = h('select');
  const norm = options.map((o) => (Array.isArray(o) ? o : [o, o]));
  if (opts.empty !== undefined) norm.unshift(['', opts.empty]);
  const cur = obj[key] ?? '';
  if (cur !== '' && !norm.some((o) => o[0] === cur)) norm.push([cur, cur + ' (custom)']);
  for (const [v, l] of norm) el.append(h('option', { value: v, selected: v === cur }, l));
  el.addEventListener('change', () => { obj[key] = el.value; after(opts, el.value); });
  return el;
}

export function checkIn(obj, key, label, opts = {}) {
  const box = h('input', { type: 'checkbox', checked: !!obj[key] });
  box.addEventListener('change', () => { obj[key] = box.checked; after(opts, box.checked); });
  return h('label', { class: 'check' }, box, ' ', label);
}

export function field(label, input, hint) {
  return h('div', { class: 'field' }, h('label', null, label), input, hint ? h('div', { class: 'hint' }, hint) : null);
}

export function row(...items) {
  return h('div', { class: 'row' }, items);
}

export function section(title, ...content) {
  return h('div', { class: 'section' }, h('h3', null, title), content);
}

let dlCounter = 0;
export function datalist(values) {
  const id = 'dl' + ++dlCounter;
  const dl = h('datalist', { id }, values.map((v) => (Array.isArray(v) ? h('option', { value: v[0] }, v[1]) : h('option', { value: v }))));
  document.getElementById('datalists').append(dl);
  return id;
}

// Reads a file chosen by the user as a data URL
export function pickFile(accept) {
  return new Promise((res) => {
    const inp = h('input', { type: 'file', accept, style: { display: 'none' } });
    inp.addEventListener('change', () => {
      const f = inp.files[0];
      inp.remove();
      res(f || null);
    });
    document.body.append(inp);
    inp.click();
  });
}

export function readAsDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export function readAsText(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsText(file);
  });
}

// Master/detail list used by most editors.
// cfg: { items, title(item), subtitle(item), onAdd(), onSelect(item), selected, onDelete(item), onDuplicate(item), addLabel, empty, extraButtons }
export function masterList(cfg) {
  const wrap = h('div', { class: 'master' });
  const search = h('input', { type: 'search', placeholder: 'Search…', class: 'master-search' });
  const list = h('div', { class: 'master-list' });
  const draw = () => {
    clear(list);
    const q = search.value.toLowerCase();
    const items = cfg.items.filter((it) => !q || (cfg.title(it) + ' ' + (cfg.subtitle ? cfg.subtitle(it) : '')).toLowerCase().includes(q));
    if (!items.length) list.append(h('div', { class: 'empty' }, cfg.empty || 'Nothing here yet.'));
    for (const it of items) {
      const sel = cfg.selected && cfg.selected() === it;
      list.append(
        h('div', { class: 'master-item' + (sel ? ' sel' : ''), onclick: () => cfg.onSelect(it) },
          cfg.thumb ? cfg.thumb(it) : null,
          h('div', { class: 'mi-text' }, h('div', { class: 'mi-title' }, cfg.title(it) || '(unnamed)'), cfg.subtitle ? h('div', { class: 'mi-sub' }, cfg.subtitle(it)) : null),
          h('div', { class: 'mi-actions' },
            cfg.onDuplicate ? h('button', { class: 'icon', title: 'Duplicate', onclick: (e) => { e.stopPropagation(); cfg.onDuplicate(it); } }, '⧉') : null,
            cfg.onDelete ? h('button', { class: 'icon danger', title: 'Delete', onclick: async (e) => { e.stopPropagation(); if (await confirmDlg(`Delete "${cfg.title(it)}"?`)) cfg.onDelete(it); } }, '✕') : null,
          ),
        ),
      );
    }
  };
  search.addEventListener('input', draw);
  wrap.append(
    h('div', { class: 'master-head' }, h('button', { class: 'primary', onclick: cfg.onAdd }, '+ ' + (cfg.addLabel || 'Add')), cfg.extraButtons || null),
    search,
    list,
  );
  draw();
  wrap.redraw = draw;
  return wrap;
}

export function editorLayout(title, intro, master, detail) {
  return h('div', { class: 'editor' },
    h('div', { class: 'editor-head' }, h('h1', null, title), intro ? h('p', { class: 'intro' }, intro) : null),
    h('div', { class: 'editor-body' }, master, h('div', { class: 'detail' }, detail)),
  );
}

export function imgThumb(src, cls = '') {
  return src ? h('img', { src, class: 'thumb ' + cls }) : h('div', { class: 'thumb ph ' + cls }, '?');
}
