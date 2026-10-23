// Node-based editing of HOI4 effects ("what happens") and triggers ("requirements").
// A graph is stored next to the script text (obj[key + 'Graph']) and compiled to script on every change,
// so the exporter keeps working with plain text. Text without a graph (old projects, imported vanilla
// files, hand-typed script) is converted into nodes when the editor opens.
import { h, clear, datalist } from './ui.js';
import { markDirty, uid } from './state.js';
import { createNodeCanvas, port } from './nodecanvas.js';
import { parse, serialize, get, indent } from './pdx.js';
import * as D from './data.js';
import { optionsFor } from './widgets.js';

// ------------------------------------------------------------------ node types
const FLOW = {
  if: { title: 'If…', cat: 'Flow', cls: 'flow', params: [], cond: 'cond', branches: [['then', 'Then'], ['else', 'Otherwise']], help: 'Does "Then" when all conditions are true, otherwise "Otherwise".' },
  scope: { title: 'In another country', cat: 'Flow', cls: 'flow', params: [{ n: 't', l: 'Country', t: 'tag', d: 'GER' }], branches: [['do', 'Do']], help: 'Runs the connected effects for that country.' },
  every: { title: 'For every country…', cat: 'Flow', cls: 'flow', params: [], cond: 'limit', condLabel: 'Only countries that…', branches: [['do', 'Do']] },
  state: { title: 'In one of our states…', cat: 'Flow', cls: 'flow', params: [], cond: 'limit', condLabel: 'Only states that…', branches: [['do', 'Do']] },
  random: { title: 'Random chance', cat: 'Flow', cls: 'flow', params: [{ n: 'c', l: 'Chance %', t: 'num', d: 50 }], branches: [['do', 'Do']] },
  hidden: { title: 'Hidden (no tooltip)', cat: 'Flow', cls: 'flow', params: [], branches: [['do', 'Do']] },
  raw: { title: 'Script', cat: 'Flow', cls: 'raw', params: [{ n: 'text', l: '', t: 'code', d: '' }], help: 'Any HOI4 script you type yourself.' },
};
const LOGIC = {
  and: { title: 'All of these', cls: 'logic' },
  or: { title: 'Any of these', cls: 'logic' },
  not: { title: 'None of these', cls: 'logic' },
  tscope: { title: 'Country check', cls: 'logic', params: [{ n: 't', l: 'Country', t: 'tag', d: 'GER' }], help: 'Checks the connected conditions for that country.' },
  rawt: { title: 'Script condition', cls: 'raw', params: [{ n: 'text', l: '', t: 'code', d: '' }] },
};

const effectDef = (id) => D.EFFECTS.find((e) => e.id === id);
const triggerDef = (id) => D.TRIGGERS.find((e) => e.id === id);

export function nodeDef(type) {
  if (type === 'start') return { title: 'Start', cls: 'start', params: [] };
  if (type === 'req') return { title: 'Requirements', cls: 'start', params: [] };
  if (type.startsWith('eff:')) { const e = effectDef(type.slice(4)); return e && { title: e.label, cls: 'effect', params: e.params, cat: e.cat }; }
  if (type.startsWith('trg:')) { const t = triggerDef(type.slice(4)); return t && { title: t.label, cls: 'cond', params: t.params }; }
  if (FLOW[type]) return FLOW[type];
  if (LOGIC[type]) return { params: [], ...LOGIC[type] };
  return null;
}

const isCondType = (t) => t.startsWith('trg:') || !!LOGIC[t];
const isEffectType = (t) => t === 'start' || t.startsWith('eff:') || !!FLOW[t];

export function makeNode(type, x = 0, y = 0, params) {
  const def = nodeDef(type);
  const p = {};
  for (const prm of def?.params || []) p[prm.n] = prm.d ?? (optionsFor(prm.t) || [])[0] ?? '';
  return { id: uid(), type, x, y, params: { ...p, ...(params || {}) } };
}

export function emptyGraph(kind) {
  return { kind, nodes: [makeNode(kind === 'trigger' ? 'req' : 'start', kind === 'trigger' ? 520 : 0, 0)], edges: [] };
}

// ------------------------------------------------------------------ compile graph -> script
const block = (key, inner) => (inner.trim() ? `${key} = {\n${indent(inner, 1)}\n}` : `${key} = { }`);

export function compile(g) {
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  const outEdge = (id, p) => g.edges.find((e) => e.from === id && e.fromPort === p);
  const inputs = (id, p) => g.edges.filter((e) => e.to === id && e.toPort === p).map((e) => byId.get(e.from)).filter(Boolean).sort((a, b) => a.y - b.y || a.x - b.x);

  const condText = (n, seen) => {
    if (!n || seen.has(n.id)) return '';
    seen.add(n.id);
    const kids = () => inputs(n.id, 'cond').map((k) => condText(k, seen)).filter(Boolean).join('\n');
    if (n.type.startsWith('trg:')) { const d = triggerDef(n.type.slice(4)); return d ? d.tpl(n.params) : ''; }
    if (n.type === 'and') return block('AND', kids());
    if (n.type === 'or') return block('OR', kids());
    if (n.type === 'not') return block('NOT', kids());
    if (n.type === 'tscope') return block(n.params.t || 'ROOT', kids());
    if (n.type === 'rawt') return (n.params.text || '').trim();
    return '';
  };
  const conds = (id, p) => inputs(id, p).map((k) => condText(k, new Set())).filter(Boolean).join('\n');

  const chain = (id, seen) => {
    const out = [];
    let n = id && byId.get(id);
    while (n && !seen.has(n.id)) {
      seen.add(n.id);
      out.push(effText(n, seen));
      const e = outEdge(n.id, 'next');
      n = e && byId.get(e.to);
    }
    return out.filter(Boolean).join('\n');
  };
  const branch = (n, p, seen) => { const e = outEdge(n.id, p); return e ? chain(e.to, seen) : ''; };
  const effText = (n, seen) => {
    if (n.type === 'start') return '';
    if (n.type.startsWith('eff:')) { const d = effectDef(n.type.slice(4)); return d ? d.tpl(n.params) : ''; }
    switch (n.type) {
      case 'if': {
        const c = conds(n.id, 'cond');
        const then = branch(n, 'then', seen);
        const els = branch(n, 'else', seen);
        let s = block('if', (c ? block('limit', c) + '\n' : '') + then);
        if (els.trim()) s += '\n' + block('else', els);
        return s;
      }
      case 'scope': return block(n.params.t || 'ROOT', branch(n, 'do', seen));
      case 'every': { const c = conds(n.id, 'limit'); return block('every_country', (c ? block('limit', c) + '\n' : '') + branch(n, 'do', seen)); }
      case 'state': { const c = conds(n.id, 'limit'); return block('random_owned_controlled_state', (c ? block('limit', c) + '\n' : '') + branch(n, 'do', seen)); }
      case 'random': return block('random', `chance = ${Number(n.params.c) || 0}\n` + branch(n, 'do', seen));
      case 'hidden': return block('hidden_effect', branch(n, 'do', seen));
      case 'raw': return (n.params.text || '').trim();
      default: return '';
    }
  };

  if (g.kind === 'trigger') {
    const root = g.nodes.find((n) => n.type === 'req');
    return root ? conds(root.id, 'cond') : '';
  }
  const start = g.nodes.find((n) => n.type === 'start');
  return start ? chain(start.id, new Set()) : '';
}

// ------------------------------------------------------------------ decompile script -> graph
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function buildMatchers(catalog) {
  const out = [];
  for (const def of catalog) {
    const variants = [false, true];
    const seenRe = new Set();
    for (const zeroNums of variants) {
      const vals = {};
      const marks = [];
      def.params.forEach((p, i) => {
        if (p.t === 'num') {
          if (zeroNums) { vals[p.n] = 0; return; }
          vals[p.n] = 9876500 + i;
          marks.push([String(9876500 + i), p.n]);
        } else {
          vals[p.n] = `QZX${i}QZX`;
          marks.push([`QZX${i}QZX`, p.n]);
        }
      });
      let re = reEsc(norm(def.tpl(vals)));
      const used = new Set();
      for (const [m, n] of marks) {
        re = re.split(reEsc(m)).join('\u0000' + n + '\u0000');
      }
      re = re.replace(/\u0000(\w+)\u0000/g, (_, n) => {
        if (used.has(n)) return `\\k<${n}>`;
        used.add(n);
        return `(?<${n}>[^{}=]+?)`;
      });
      if (seenRe.has(re)) continue;
      seenRe.add(re);
      const zeros = zeroNums ? def.params.filter((p) => p.t === 'num').map((p) => p.n) : [];
      out.push({ def, re: new RegExp('^' + re + '$'), zeros });
    }
  }
  return out;
}

let EFF_M = null;
let TRG_M = null;
function matchStmt(text, kind) {
  if (!EFF_M) { EFF_M = buildMatchers(D.EFFECTS); TRG_M = buildMatchers(D.TRIGGERS); }
  const t = norm(text);
  for (const m of kind === 'trigger' ? TRG_M : EFF_M) {
    const r = m.re.exec(t);
    if (r) {
      const params = {};
      for (const p of m.def.params) params[p.n] = r.groups?.[p.n] !== undefined ? r.groups[p.n].trim() : (m.zeros.includes(p.n) ? 0 : p.d ?? '');
      for (const p of m.def.params) if (p.t === 'num' && params[p.n] !== '' && isFinite(Number(params[p.n]))) params[p.n] = Number(params[p.n]);
      return { def: m.def, params };
    }
  }
  return null;
}

const stmtText = (s) => serialize([s]).trim();
const isTag = (k) => /^[A-Z][A-Z0-9]{2}$/.test(k || '');

export function decompile(text, kind) {
  const g = { kind, nodes: [], edges: [] };
  const add = (type, params) => { const n = makeNode(type, 0, 0, params); g.nodes.push(n); return n; };
  const link = (a, ap, b, bp) => g.edges.push({ from: a.id, fromPort: ap, to: b.id, toPort: bp });
  let ast = [];
  try { ast = parse(text || ''); } catch (e) { ast = null; }

  const condNodes = (stmts) => {
    const out = [];
    for (const s of stmts || []) {
      const m = matchStmt(stmtText(s), 'trigger');
      if (m) { out.push(add('trg:' + m.def.id, m.params)); continue; }
      if (Array.isArray(s.v) && s.op === '=' && ['AND', 'OR', 'NOT'].includes(s.k)) {
        const n = add(s.k.toLowerCase());
        for (const c of condNodes(s.v)) link(c, 'out', n, 'cond');
        out.push(n);
        continue;
      }
      if (Array.isArray(s.v) && s.op === '=' && isTag(s.k)) {
        const n = add('tscope', { t: s.k });
        for (const c of condNodes(s.v)) link(c, 'out', n, 'cond');
        out.push(n);
        continue;
      }
      out.push(add('rawt', { text: stmtText(s) }));
    }
    return out;
  };

  // returns [first, last] of a chain built from statements
  const chainNodes = (stmts) => {
    const list = [];
    for (let i = 0; i < (stmts || []).length; i++) {
      const s = stmts[i];
      const m = matchStmt(stmtText(s), 'effect');
      if (m) { list.push(add('eff:' + m.def.id, m.params)); continue; }
      const blk = Array.isArray(s.v) && s.op === '=' ? s.v : null;
      const withLimit = (type, params) => {
        const n = add(type, params);
        const lim = get(blk, 'limit');
        if (Array.isArray(lim)) for (const c of condNodes(lim)) link(c, 'out', n, FLOW[type].cond);
        const body = blk.filter((x) => x.k !== 'limit');
        return [n, body];
      };
      let node = null;
      if (blk && s.k === 'if') {
        const [n, body] = withLimit('if');
        const [f] = chainNodes(body);
        if (f) link(n, 'then', f, 'prev');
        const nx = stmts[i + 1];
        if (nx && nx.k === 'else' && Array.isArray(nx.v)) {
          const [ef] = chainNodes(nx.v);
          if (ef) link(n, 'else', ef, 'prev');
          i++;
        }
        node = n;
      } else if (blk && s.k === 'every_country') {
        const [n, body] = withLimit('every');
        const [f] = chainNodes(body);
        if (f) link(n, 'do', f, 'prev');
        node = n;
      } else if (blk && s.k === 'random_owned_controlled_state') {
        const [n, body] = withLimit('state');
        const [f] = chainNodes(body);
        if (f) link(n, 'do', f, 'prev');
        node = n;
      } else if (blk && s.k === 'random' && get(blk, 'chance') !== undefined) {
        const n = add('random', { c: Number(get(blk, 'chance')) || 0 });
        const [f] = chainNodes(blk.filter((x) => x.k !== 'chance'));
        if (f) link(n, 'do', f, 'prev');
        node = n;
      } else if (blk && s.k === 'hidden_effect') {
        const n = add('hidden');
        const [f] = chainNodes(blk);
        if (f) link(n, 'do', f, 'prev');
        node = n;
      } else if (blk && isTag(s.k)) {
        const n = add('scope', { t: s.k });
        const [f] = chainNodes(blk);
        if (f) link(n, 'do', f, 'prev');
        node = n;
      } else {
        node = add('raw', { text: stmtText(s) });
      }
      list.push(node);
    }
    for (let i = 1; i < list.length; i++) link(list[i - 1], 'next', list[i], 'prev');
    return [list[0], list[list.length - 1]];
  };

  if (kind === 'trigger') {
    const root = add('req');
    if (ast === null) { const r = add('rawt', { text }); link(r, 'out', root, 'cond'); }
    else for (const c of condNodes(ast)) link(c, 'out', root, 'cond');
  } else {
    const start = add('start');
    if (ast === null) { const r = add('raw', { text }); link(start, 'next', r, 'prev'); }
    else { const [f] = chainNodes(ast); if (f) link(start, 'next', f, 'prev'); }
  }
  layout(g);
  return g;
}

// ------------------------------------------------------------------ automatic layout
const COLW = 270;
function estHeight(n) {
  const def = nodeDef(n.type) || { params: [] };
  let hgt = 44 + (def.params || []).length * 50;
  if (n.type === 'raw' || n.type === 'rawt') hgt = 44 + Math.min(10, String(n.params.text || '').split('\n').length) * 17 + 20;
  if (def.branches) hgt += def.branches.length * 26;
  if (def.cond) hgt += 26;
  return hgt;
}

export function layout(g) {
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  const outEdge = (id, p) => g.edges.find((e) => e.from === id && e.fromPort === p);
  const inputs = (id, p) => g.edges.filter((e) => e.to === id && e.toPort === p).map((e) => byId.get(e.from)).filter(Boolean);
  const placed = new Set();
  let cursor = 0;

  // place a condition subtree; returns its height
  const placeCond = (n, x, y) => {
    if (placed.has(n.id)) return 0;
    placed.add(n.id);
    n.x = x; n.y = y;
    let used = 0;
    for (const k of inputs(n.id, 'cond')) used += placeCond(k, x - COLW, y + used) + 14;
    return Math.max(estHeight(n), used - 14);
  };
  const placeCondsBelow = (n, p, x) => {
    for (const c of inputs(n.id, p)) cursor += placeCond(c, x, cursor) + 20;
  };

  const placeChain = (first, x, y) => {
    const chainList = [];
    let n = first;
    while (n && !placed.has(n.id)) {
      placed.add(n.id);
      n.x = x; n.y = y;
      chainList.push(n);
      x += COLW;
      const e = outEdge(n.id, 'next');
      n = e && byId.get(e.to);
    }
    const rowH = Math.max(80, ...chainList.map(estHeight));
    cursor = Math.max(cursor, y + rowH + 40);
    for (const c of chainList) {
      const def = nodeDef(c.type) || {};
      if (def.cond) placeCondsBelow(c, def.cond, c.x - COLW + 40);
      for (const [bp] of def.branches || []) {
        const e = outEdge(c.id, bp);
        if (e && byId.get(e.to) && !placed.has(e.to)) placeChain(byId.get(e.to), c.x + 60, cursor);
      }
    }
  };

  if (g.kind === 'trigger') {
    const root = g.nodes.find((n) => n.type === 'req');
    if (root) {
      placed.add(root.id);
      root.x = COLW * 2; root.y = 0;
      let y = 0;
      for (const c of inputs(root.id, 'cond')) y += placeCond(c, COLW, y) + 20;
    }
  } else {
    const start = g.nodes.find((n) => n.type === 'start');
    if (start) placeChain(start, 0, 0);
  }
  // anything left over (disconnected) goes at the bottom
  let x = 0;
  for (const n of g.nodes) if (!placed.has(n.id)) { n.x = x; n.y = cursor + 40; x += COLW; }
}

// ------------------------------------------------------------------ readable summary
export function describe(text, kind) {
  const g = decompile(text || '', kind);
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  const outEdge = (id, p) => g.edges.find((e) => e.from === id && e.fromPort === p);
  const inputs = (id, p) => g.edges.filter((e) => e.to === id && e.toPort === p).map((e) => byId.get(e.from)).filter(Boolean);
  const lines = [];
  const label = (n) => {
    const def = nodeDef(n.type);
    if (n.type === 'raw' || n.type === 'rawt') return 'Script: ' + norm(n.params.text).slice(0, 60);
    const vals = (def?.params || []).map((p) => n.params[p.n]).filter((v) => v !== '' && v !== undefined);
    return (def?.title || n.type) + (vals.length ? ': ' + vals.join(', ') : '');
  };
  const condLine = (n, d) => {
    lines.push('  '.repeat(d) + '• ' + label(n));
    for (const k of inputs(n.id, 'cond')) condLine(k, d + 1);
  };
  const chainLines = (n, d, seen = new Set()) => {
    while (n && !seen.has(n.id) && lines.length < 40) {
      seen.add(n.id);
      if (n.type !== 'start') {
        lines.push('  '.repeat(d) + '• ' + label(n));
        const def = nodeDef(n.type) || {};
        if (def.cond) for (const k of inputs(n.id, def.cond)) condLine(k, d + 2);
        for (const [bp, bl] of def.branches || []) {
          const e = outEdge(n.id, bp);
          if (e) { lines.push('  '.repeat(d + 1) + bl + ':'); chainLines(byId.get(e.to), d + 2, seen); }
        }
      }
      const e = outEdge(n.id, 'next');
      n = e && byId.get(e.to);
    }
  };
  if (kind === 'trigger') { const r = g.nodes.find((n) => n.type === 'req'); for (const k of inputs(r.id, 'cond')) condLine(k, 0); }
  else chainLines(g.nodes.find((n) => n.type === 'start'), 0);
  return lines;
}

// ------------------------------------------------------------------ editor window
export function graphFor(obj, key, kind) {
  const g = obj[key + 'Graph'];
  if (g && g.kind === kind && norm(compile(g)) === norm(obj[key] || '')) return g;
  return decompile(obj[key] || '', kind);
}

function paramControl(node, p, onChange) {
  const opts = optionsFor(p.t);
  const val = node.params[p.n] ?? '';
  let el;
  if (p.t === 'code') {
    el = h('textarea', { class: 'code nc-code', rows: Math.min(10, Math.max(2, String(val).split('\n').length)), spellcheck: 'false', placeholder: 'type HOI4 script…' });
    el.value = val;
  } else if (p.t === 'bool' || p.t === 'ideology') {
    el = h('select', null, opts.map((o) => h('option', { value: o, selected: o === val }, o)));
  } else {
    el = h('input', { type: p.t === 'num' ? 'number' : 'text', step: 'any', value: val, list: opts ? datalist(opts) : null, class: p.t === 'tag' ? 'tag-in' : '' });
  }
  const upd = () => { node.params[p.n] = p.t === 'num' ? (el.value === '' ? '' : Number(el.value)) : p.t === 'tag' ? el.value.toUpperCase() : el.value; onChange(); };
  el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', upd);
  return h('label', { class: 'nc-param' }, p.l ? h('span', null, p.l) : null, el);
}

function renderScriptNode(n, onChange) {
  const def = nodeDef(n.type) || { title: n.type, params: [] };
  const isCond = isCondType(n.type) && n.type !== 'req';
  const el = h('div', { class: `nc-card ${def.cls || ''}` });
  const head = h('div', { class: 'nc-head' });
  if (isEffectType(n.type) && n.type !== 'start') head.append(h('span', { class: 'nc-port exec', 'data-port': 'prev', 'data-dir': 'in', 'data-kind': 'exec', title: 'Comes after' }));
  head.append(h('span', { class: 'nc-title', title: def.help || '' }, def.title));
  if (isEffectType(n.type)) head.append(h('span', { class: 'nc-port exec', 'data-port': 'next', 'data-dir': 'out', 'data-kind': 'exec', title: 'Then do' }));
  if (isCond) head.append(h('span', { class: 'nc-port cond', 'data-port': 'out', 'data-dir': 'out', 'data-kind': 'cond', title: 'Connect to an If, a logic node or Requirements' }));
  el.append(head);
  const body = h('div', { class: 'nc-body' });
  for (const p of def.params || []) body.append(paramControl(n, p, onChange));
  if (def.cond) body.append(port(def.cond, 'in', 'cond', def.condLabel || 'Conditions'));
  if (LOGIC[n.type] && n.type !== 'rawt') body.append(port('cond', 'in', 'cond', n.type === 'tscope' ? 'Checks' : 'Items'));
  if (n.type === 'req') body.append(port('cond', 'in', 'cond', 'All of these must be true'));
  if (n.type === 'start') body.append(h('div', { class: 'nc-hint' }, 'Drag from ▶ to add what happens, in order.'));
  for (const [bp, bl] of def.branches || []) body.append(port(bp, 'out', 'exec', bl, 'branch'));
  el.append(body);
  return el;
}

// fields: [{ obj, key, kind: 'effect'|'trigger', label }]
export function openNodeEditor({ title, fields, active = 0, onClose }) {
  let tab = active;
  const graphs = fields.map((f) => graphFor(f.obj, f.key, f.kind));
  const back = h('div', { class: 'ne-back' });
  const win = h('div', { class: 'ne-win' });
  const tabsEl = h('div', { class: 'ne-tabs' });
  const palette = h('div', { class: 'ne-palette' });
  const canvasBox = h('div', { class: 'ne-canvas' });
  const preview = h('pre', { class: 'ne-preview' });
  const previewBox = h('details', { class: 'ne-preview-box' }, h('summary', null, 'Generated script'), preview);
  let canvas = null;
  let addOffset = 0;

  const save = () => {
    const f = fields[tab];
    const g = graphs[tab];
    f.obj[f.key + 'Graph'] = g;
    f.obj[f.key] = compile(g);
    preview.textContent = f.obj[f.key] || '(empty)';
    markDirty();
  };
  const close = () => { save(); back.remove(); document.removeEventListener('keydown', esc); onClose && onClose(); };
  const esc = (e) => { if (e.key === 'Escape' && !e.target.closest('input,textarea')) close(); };
  document.addEventListener('keydown', esc);

  function connect(g, edge) {
    const fromN = g.nodes.find((n) => n.id === edge.from);
    // an output can only go to one place: replace old wire
    g.edges = g.edges.filter((e) => !(e.from === edge.from && e.fromPort === edge.fromPort));
    if (fromN && isCondType(fromN.type)) g.edges = g.edges.filter((e) => e.from !== edge.from);
    // don't allow loops in the "then do" chain
    g.edges.push(edge);
  }

  function addNode(type, x, y, wireFrom) {
    const g = graphs[tab];
    const n = makeNode(type, x, y);
    g.nodes.push(n);
    if (wireFrom) {
      const kind = wireFrom.kind;
      if (wireFrom.dir === 'out') {
        if (kind === 'exec' && isEffectType(type)) connect(g, { from: wireFrom.node, fromPort: wireFrom.port, to: n.id, toPort: 'prev' });
        if (kind === 'cond' && LOGIC[type] && type !== 'rawt') connect(g, { from: wireFrom.node, fromPort: wireFrom.port, to: n.id, toPort: 'cond' });
      } else {
        if (kind === 'exec' && isEffectType(type)) connect(g, { from: n.id, fromPort: 'next', to: wireFrom.node, toPort: wireFrom.port });
        if (kind === 'cond' && isCondType(type)) connect(g, { from: n.id, fromPort: 'out', to: wireFrom.node, toPort: wireFrom.port });
      }
    }
    save();
    canvas.draw();
    canvas.select(n);
    return n;
  }

  function paletteEntries(kindFilter) {
    const f = fields[tab];
    const out = [];
    const effects = f.kind === 'effect';
    if (effects && (!kindFilter || kindFilter === 'exec')) {
      for (const [id, d] of Object.entries(FLOW)) out.push({ type: id, label: d.title, cat: '⚙ Flow & logic', cls: d.cls });
      for (const e of D.EFFECTS) out.push({ type: 'eff:' + e.id, label: e.label, cat: '▶ ' + e.cat, cls: 'effect' });
    }
    if (!kindFilter || kindFilter === 'cond') {
      for (const [id, d] of Object.entries(LOGIC)) out.push({ type: id, label: d.title, cat: '◆ Combine conditions', cls: d.cls });
      for (const t of D.TRIGGERS) out.push({ type: 'trg:' + t.id, label: t.label, cat: '◆ Conditions', cls: 'cond' });
    }
    return out;
  }

  function drawPalette() {
    clear(palette);
    const search = h('input', { type: 'search', placeholder: 'Search nodes…' });
    const list = h('div', { class: 'ne-pal-list' });
    const drawList = () => {
      clear(list);
      const q = search.value.toLowerCase();
      let last = null;
      for (const e of paletteEntries()) {
        if (q && !(e.label + ' ' + e.cat).toLowerCase().includes(q)) continue;
        if (e.cat !== last) { list.append(h('div', { class: 'builder-cat' }, e.cat)); last = e.cat; }
        list.append(h('div', {
          class: 'ne-pal-item ' + e.cls,
          title: 'Click to add',
          onclick: () => { const [x, y] = canvas.viewCenter(); addOffset = (addOffset + 30) % 180; addNode(e.type, x + addOffset, y + addOffset); },
        }, e.label));
      }
    };
    search.addEventListener('input', drawList);
    drawList();
    palette.append(h('div', { class: 'hint' }, 'Click a node to add it. Drag between the coloured dots to connect. Click a wire to remove it. Delete key removes the selected node.'), search, list);
  }

  // quick-add menu at a screen position (double-click, right-click, or wire dropped on empty space)
  function quickAdd(x, y, cx, cy, wireFrom) {
    document.querySelector('.ne-quick')?.remove();
    const kindFilter = wireFrom ? wireFrom.kind : null;
    let entries = paletteEntries(kindFilter);
    if (wireFrom && wireFrom.kind === 'cond' && wireFrom.dir === 'out') entries = entries.filter((e) => LOGIC[e.type] && e.type !== 'rawt');
    const box = h('div', { class: 'ne-quick', style: { left: Math.min(cx, window.innerWidth - 280) + 'px', top: Math.min(cy, window.innerHeight - 340) + 'px' } });
    const search = h('input', { type: 'search', placeholder: 'Add node…' });
    const list = h('div', { class: 'ne-pal-list' });
    const drawList = () => {
      clear(list);
      const q = search.value.toLowerCase();
      for (const e of entries.filter((e) => !q || (e.label + ' ' + e.cat).toLowerCase().includes(q)).slice(0, 60)) {
        list.append(h('div', { class: 'ne-pal-item ' + e.cls, onclick: () => { box.remove(); addNode(e.type, x, y, wireFrom); } }, e.label));
      }
    };
    search.addEventListener('input', drawList);
    search.addEventListener('keydown', (e) => { if (e.key === 'Escape') box.remove(); if (e.key === 'Enter') list.querySelector('.ne-pal-item')?.click(); });
    drawList();
    box.append(search, list);
    document.body.append(box);
    setTimeout(() => search.focus(), 10);
    const off = (e) => { if (!box.contains(e.target)) { box.remove(); document.removeEventListener('pointerdown', off, true); } };
    setTimeout(() => document.addEventListener('pointerdown', off, true), 0);
  }

  function drawTab() {
    clear(tabsEl);
    fields.forEach((f, i) => tabsEl.append(h('button', { class: i === tab ? 'active' : '', onclick: () => { save(); tab = i; drawTab(); } }, f.label)));
    const g = graphs[tab];
    clear(canvasBox);
    canvas = createNodeCanvas({
      nodes: () => g.nodes,
      edges: () => g.edges.map((e) => ({ ...e, cls: g.nodes.find((n) => n.id === e.from && isCondType(n.type)) ? 'cond' : 'exec' })),
      renderNode: (n) => renderScriptNode(n, () => { save(); canvas.drawWires(); }),
      canConnect: (o, i) => o.kind === i.kind,
      onConnect: (e) => { connect(g, e); save(); },
      onDisconnect: (e) => { g.edges = g.edges.filter((x) => !(x.from === e.from && x.fromPort === e.fromPort && x.to === e.to && x.toPort === e.toPort)); save(); },
      onMove: () => markDirty(),
      onDelete: (n) => {
        if (n.type === 'start' || n.type === 'req') return;
        g.nodes = g.nodes.filter((x) => x !== n);
        g.edges = g.edges.filter((e) => e.from !== n.id && e.to !== n.id);
        save();
      },
      onBackground: (x, y, cx, cy) => quickAdd(x, y, cx, cy, null),
      onDropWire: (info, x, y, cx, cy) => quickAdd(x, y, cx, cy, info),
    });
    canvasBox.append(canvas.el);
    canvas.draw();
    requestAnimationFrame(() => canvas.fit());
    drawPalette();
    save();
  }

  win.append(
    h('div', { class: 'ne-top' },
      h('div', { class: 'ne-title' }, '🧩 ', title),
      tabsEl,
      h('span', { class: 'grow' }),
      h('button', { class: 'small', onclick: () => { layout(graphs[tab]); save(); canvas.draw(); canvas.fit(); } }, 'Tidy layout'),
      h('button', { class: 'small', onclick: () => canvas.fit() }, 'Fit view'),
      h('button', { class: 'small', onclick: () => canvas.zoomBy(1 / 1.2) }, '−'),
      h('button', { class: 'small', onclick: () => canvas.zoomBy(1.2) }, '+'),
      h('button', { class: 'primary', onclick: close }, 'Done')),
    h('div', { class: 'ne-main' }, palette, h('div', { class: 'ne-center' }, canvasBox, previewBox)),
  );
  back.append(win);
  document.body.append(back);
  drawTab();
}
