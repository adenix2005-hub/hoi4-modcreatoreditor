// Parser/serializer for Paradox script (the "key = { ... }" text format HOI4 uses).
// A block is an array of nodes: { k, op, v } for "k op v", or { v } for a bare value.
// v is either a string token (quotes kept) or a nested block (array).

const OPS = new Set(['=', '<', '>', '<=', '>=', '!=', '==', '?=']);

export function tokenize(text) {
  const toks = [];
  let i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    if (c === '﻿' || c === ' ' || c === '\t' || c === '\r' || c === '\n') { i++; continue; }
    if (c === '#') { while (i < n && text[i] !== '\n') i++; continue; }
    if (c === '{' || c === '}') { toks.push(c); i++; continue; }
    if (c === '"') {
      let j = i + 1;
      while (j < n && text[j] !== '"') { if (text[j] === '\\') j++; j++; }
      toks.push(text.slice(i, j + 1));
      i = j + 1;
      continue;
    }
    if (c === '<' || c === '>' || c === '!' || c === '=' || c === '?') {
      if (text[i + 1] === '=') { toks.push(c + '='); i += 2; } else { toks.push(c); i++; }
      continue;
    }
    let j = i;
    while (j < n && !/[\s{}#="<>!]/.test(text[j])) j++;
    if (j === i) j++;
    toks.push(text.slice(i, j));
    i = j;
  }
  return toks;
}

export function parse(text) {
  const toks = tokenize(text);
  let pos = 0;
  function block() {
    const out = [];
    while (pos < toks.length) {
      const t = toks[pos];
      if (t === '}') { pos++; return out; }
      if (t === '{') { pos++; out.push({ v: block() }); continue; }
      pos++;
      if (OPS.has(toks[pos])) {
        const op = toks[pos++];
        if (toks[pos] === '{') { pos++; out.push({ k: t, op, v: block() }); }
        else if (pos < toks.length) out.push({ k: t, op, v: toks[pos++] });
      } else {
        out.push({ v: t });
      }
    }
    return out;
  }
  return block();
}

export function serialize(blk, depth = 0) {
  const pad = '\t'.repeat(depth);
  let s = '';
  for (const n of blk) {
    if (n.k === undefined) {
      if (Array.isArray(n.v)) s += `${pad}{\n${serialize(n.v, depth + 1)}${pad}}\n`;
      else s += `${pad}${n.v}\n`;
    } else if (Array.isArray(n.v)) {
      if (!n.v.length) s += `${pad}${n.k} ${n.op} { }\n`;
      else if (n.v.every((x) => x.k === undefined && !Array.isArray(x.v)) && n.v.length <= 8) s += `${pad}${n.k} ${n.op} { ${n.v.map((x) => x.v).join(' ')} }\n`;
      else s += `${pad}${n.k} ${n.op} {\n${serialize(n.v, depth + 1)}${pad}}\n`;
    } else {
      s += `${pad}${n.k} ${n.op} ${n.v}\n`;
    }
  }
  return s;
}

export const unq = (v) => (typeof v === 'string' && v.startsWith('"') ? v.slice(1, -1) : v);
export const get = (blk, key) => { const n = blk && blk.find((x) => x.k === key); return n ? n.v : undefined; };
export const getAll = (blk, key) => (blk ? blk.filter((x) => x.k === key).map((x) => x.v) : []);
export const bare = (blk) => (blk ? blk.filter((x) => x.k === undefined && !Array.isArray(x.v)).map((x) => x.v) : []);

// Turn a block back into script text (used to keep effects/triggers editable as text)
export function blockText(blk) {
  if (!blk || !Array.isArray(blk)) return '';
  return serialize(blk, 0).trimEnd();
}

// Re-indent a free-form script snippet the user typed so it nests properly.
export function indent(text, depth) {
  const pad = '\t'.repeat(depth);
  return String(text || '')
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .filter((l, i, a) => l.trim() || (i > 0 && i < a.length - 1))
    .map((l) => pad + l.replace(/^\s+/, (m) => m.replace(/ {4}/g, '\t')))
    .join('\n');
}

// Writes "key = {\n<body>\n}" with proper indentation, or nothing when body is blank.
export function wrap(key, body, depth) {
  const t = String(body || '').trim();
  if (!t) return '';
  const pad = '\t'.repeat(depth);
  return `${pad}${key} = {\n${indent(t, depth + 1)}\n${pad}}\n`;
}

// Checks curly braces are balanced; returns an error message or null.
export function checkBraces(text) {
  let d = 0;
  let line = 1;
  let inStr = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '\n') line++;
    if (c === '"') inStr = !inStr;
    if (inStr) continue;
    if (c === '#') { while (i < text.length && text[i] !== '\n') i++; line++; continue; }
    if (c === '{') d++;
    if (c === '}') { d--; if (d < 0) return `Extra "}" on line ${line}`; }
  }
  return d > 0 ? `Missing ${d} closing "}"` : null;
}

export function fmtNum(n) {
  const x = Number(n);
  if (!isFinite(x)) return '0';
  return String(Math.round(x * 1000) / 1000);
}

export function quote(s) {
  return '"' + String(s ?? '').replace(/"/g, "'") + '"';
}
