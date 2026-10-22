// Turns the project into Hearts of Iron IV mod files.
import { indent, wrap, fmtNum, checkBraces } from './pdx.js';
import { toDDS, toPNG, toTGA, dataUrlToBytes, canvasToDDS } from './images.js';
import * as D from './data.js';
import { allSubunits } from './refs.js';
import { divisionStats } from './editors/divisions.js';

const T = (n) => '\t'.repeat(n);
const safe = (s) => String(s || '').replace(/[^A-Za-z0-9_]/g, '_');

class Out {
  constructor(p) {
    this.p = p;
    this.prefix = safe(p.meta.prefix || 'mymod').toLowerCase();
    this.files = [];
    this.loc = [];
    this.sprites = [];
    this.images = [];
    this.startup = {}; // tag -> [lines]
    this.startupGlobal = [];
    this.monthly = {}; // tag -> [lines]
    this.scriptedEffects = [];
  }
  file(path, data) { this.files.push({ path, data }); }
  l(key, text) { if (key) this.loc.push([key, text ?? '']); }
  sprite(name, path) { this.sprites.push([name, path]); }
  img(dataUrl, path, size, mode) { this.images.push({ dataUrl, path, size, mode }); }
  onStart(tag, line) { (this.startup[tag] = this.startup[tag] || []).push(line); }
}

function trig(text, depth) { return indent(text, depth); }

function mods(list, depth) {
  return (list || []).filter((m) => m.key).map((m) => `${T(depth)}${m.key} = ${fmtNum(m.value)}`).join('\n');
}

function block(key, body, depth) {
  const b = String(body || '').replace(/\s+$/, '');
  if (!b.trim()) return '';
  return `${T(depth)}${key} = {\n${b}\n${T(depth)}}\n`;
}

function locText(s) {
  return String(s ?? '').replace(/\r?\n/g, '\\n').replace(/"/g, '\\"');
}

// ---------------------------------------------------------------- focus trees
function exportFocusTrees(o) {
  const usedNames = new Set();
  for (const t of o.p.focusTrees) {
    let fileName = (t.fileName || `${safe(t.treeId)}.txt`).replace(/[\\/]/g, '');
    if (!fileName.endsWith('.txt')) fileName += '.txt';
    if (usedNames.has(fileName)) fileName = fileName.replace(/\.txt$/, `_${usedNames.size}.txt`);
    usedNames.add(fileName);
    let s = 'focus_tree = {\n';
    s += `\tid = ${t.treeId}\n`;
    if (t.countryRaw && t.countryRaw.trim()) s += `\tcountry = {\n${indent(t.countryRaw, 2)}\n\t}\n`;
    else if (t.tag) s += `\tcountry = {\n\t\tfactor = 0\n\t\tmodifier = {\n\t\t\tadd = ${t.overhaul ? 50 : 20}\n\t\t\ttag = ${t.tag}\n\t\t}\n\t}\n`;
    else s += `\tcountry = {\n\t\tfactor = ${t.default ? 1 : 0}\n\t}\n`;
    s += `\tdefault = ${t.default ? 'yes' : 'no'}\n`;
    s += `\tcontinuous_focus_position = { x = ${fmtNum(t.continuousX ?? 50)} y = ${fmtNum(t.continuousY ?? 1200)} }\n`;
    if (t.treeExtra) s += indent(t.treeExtra, 1) + '\n';
    for (const f of t.focuses) {
      s += '\n\tfocus = {\n';
      s += `\t\tid = ${f.id}\n`;
      let icon = f.icon || 'GFX_goal_unknown';
      if (f.img) {
        icon = `GFX_focus_${safe(f.id)}`;
        const path = `gfx/interface/goals/${o.prefix}/${safe(f.id)}.dds`;
        o.sprite(icon, path);
        o.img(f.img, path, D.IMAGE_SIZES.focus, 'contain');
      }
      s += `\t\ticon = ${icon}\n`;
      s += `\t\tx = ${Math.round(f.x)}\n\t\ty = ${Math.round(f.y)}\n`;
      s += `\t\tcost = ${fmtNum(f.cost)}\n`;
      for (const g of f.prereq || []) if (g.length) s += `\t\tprerequisite = { ${g.map((id) => `focus = ${id}`).join(' ')} }\n`;
      if ((f.exclusive || []).length) s += `\t\tmutually_exclusive = { ${f.exclusive.map((id) => `focus = ${id}`).join(' ')} }\n`;
      s += wrap('available', f.available, 2);
      s += wrap('bypass', f.bypass, 2);
      if (f.cancelIfInvalid === false) s += '\t\tcancel_if_invalid = no\n';
      if (f.continueIfInvalid) s += '\t\tcontinue_if_invalid = yes\n';
      if (f.availableIfCapitulated) s += '\t\tavailable_if_capitulated = yes\n';
      if ((f.filters || []).length) s += `\t\tsearch_filters = { ${f.filters.join(' ')} }\n`;
      if (f.aiRaw) s += `\t\tai_will_do = {\n${indent(f.aiRaw, 3)}\n\t\t}\n`;
      else s += `\t\tai_will_do = { factor = ${fmtNum(f.aiFactor ?? 1)} }\n`;
      s += wrap('select_effect', f.selectEffect, 2);
      s += wrap('completion_reward', f.reward, 2);
      if (f.extra && f.extra.trim()) s += indent(f.extra, 2) + '\n';
      s += '\t}\n';
      if (f.name && f.name !== f.id) o.l(f.id, f.name);
      if (f.desc) o.l(f.id + '_desc', f.desc);
    }
    s += '}\n';
    o.file(`common/national_focus/${fileName}`, s);
  }
}

// ---------------------------------------------------------------- characters
function exportCharacters(o) {
  if (!o.p.characters.length) return;
  let s = 'characters = {\n';
  for (const c of o.p.characters) {
    const tag = c.tag || 'TAG';
    let large = c.portraitPath || '';
    let small = '';
    if (c.portrait) {
      large = `gfx/leaders/${tag}/${o.prefix}_${safe(c.id)}.dds`;
      small = `gfx/interface/ideas/${o.prefix}/${safe(c.id)}_small.dds`;
      o.img(c.portrait, large, D.IMAGE_SIZES.portraitLarge, 'cover');
      o.img(c.portrait, small, D.IMAGE_SIZES.portraitSmall, 'cover');
    }
    s += `\t${c.id} = {\n\t\tname = ${c.id}\n`;
    o.l(c.id, c.name);
    if (large) {
      const pic = `{ large = "${large}"${small ? ` small = "${small}"` : ''} }`;
      s += '\t\tportraits = {\n';
      if (c.leader.on || c.advisor.on) s += `\t\t\tcivilian = ${pic}\n`;
      if (c.general.on) s += `\t\t\tarmy = ${pic}\n`;
      if (c.admiral.on) s += `\t\t\tnavy = ${pic}\n`;
      s += '\t\t}\n';
    }
    if (c.leader.on) {
      s += '\t\tcountry_leader = {\n';
      if (c.desc) { s += `\t\t\tdesc = ${c.id}_desc\n`; }
      s += `\t\t\tideology = ${c.leader.ideology}\n`;
      s += `\t\t\ttraits = { ${c.leader.traits.join(' ')} }\n`;
      s += '\t\t\texpire = "1965.1.1.1"\n\t\t\tid = -1\n\t\t}\n';
    }
    if (c.advisor.on) {
      const ledger = { army_chief: 'army', high_command: 'army', navy_chief: 'navy', air_chief: 'air' }[c.advisor.slot];
      s += '\t\tadvisor = {\n';
      s += `\t\t\tslot = ${c.advisor.slot}\n`;
      s += `\t\t\tidea_token = ${c.advisor.ideaToken || c.id + '_advisor'}\n`;
      if (ledger) s += `\t\t\tledger = ${ledger}\n`;
      s += `\t\t\tallowed = { original_tag = ${tag} }\n`;
      s += `\t\t\ttraits = { ${c.advisor.traits.join(' ')} }\n`;
      s += `\t\t\tcost = ${fmtNum(c.advisor.cost)}\n`;
      s += '\t\t\tai_will_do = { factor = 1 }\n\t\t}\n';
    }
    if (c.general.on) {
      const g = c.general;
      s += `\t\t${g.type === 'field_marshal' ? 'field_marshal' : 'corps_commander'} = {\n`;
      s += `\t\t\ttraits = { ${g.traits.join(' ')} }\n`;
      s += `\t\t\tskill = ${fmtNum(g.skill)}\n\t\t\tattack_skill = ${fmtNum(g.attack)}\n\t\t\tdefense_skill = ${fmtNum(g.defense)}\n\t\t\tplanning_skill = ${fmtNum(g.planning)}\n\t\t\tlogistics_skill = ${fmtNum(g.logistics)}\n\t\t\tlegacy_id = -1\n\t\t}\n`;
    }
    if (c.admiral.on) {
      const a = c.admiral;
      s += '\t\tnavy_leader = {\n';
      s += `\t\t\ttraits = { ${a.traits.join(' ')} }\n`;
      s += `\t\t\tskill = ${fmtNum(a.skill)}\n\t\t\tattack_skill = ${fmtNum(a.attack)}\n\t\t\tdefense_skill = ${fmtNum(a.defense)}\n\t\t\tmaneuvering_skill = ${fmtNum(a.maneuvering)}\n\t\t\tcoordination_skill = ${fmtNum(a.coordination)}\n\t\t\tlegacy_id = -1\n\t\t}\n`;
    }
    s += '\t}\n';
    if (c.desc) o.l(c.id + '_desc', c.desc);
    if (c.recruit !== false && c.tag) o.onStart(c.tag, `recruit_character = ${c.id}`);
    if (c.leader.on && c.leader.atStart && c.tag) o.onStart(c.tag, `promote_character = ${c.id}`);
  }
  s += '}\n';
  o.file(`common/characters/${o.prefix}_characters.txt`, s);
}

// ---------------------------------------------------------------- traits
function groupByFile(items, def) {
  const g = {};
  for (const it of items) (g[it.file || def] = g[it.file || def] || []).push(it);
  return g;
}

function exportTraits(o) {
  for (const [file, list] of Object.entries(groupByFile(o.p.leaderTraits, `${o.prefix}_traits.txt`))) {
    let s = 'leader_traits = {\n';
    for (const t of list) {
      s += `\t${t.id} = {\n`;
      if (!t.file) s += '\t\trandom = no\n';
      const m = mods(t.mods, 2);
      if (m) s += m + '\n';
      if (t.extra) s += indent(t.extra, 2) + '\n';
      s += '\t}\n';
      if (t.name && t.name !== t.id) o.l(t.id, t.name);
      if (t.desc) o.l(t.id + '_desc', t.desc);
    }
    o.file(`common/country_leader/${file}`, s + '}\n');
  }
  for (const [file, list] of Object.entries(groupByFile(o.p.unitTraits, `${o.prefix}_unit_traits.txt`))) {
    let s = 'leader_traits = {\n';
    for (const t of list) {
      s += `\t${t.id} = {\n\t\ttype = ${t.type || 'land'}\n\t\ttrait_type = ${t.traitType || 'personality_trait'}\n`;
      for (const [k, key] of [['attack', 'attack_skill'], ['defense', 'defense_skill'], ['planning', 'planning_skill'], ['logistics', 'logistics_skill'], ['maneuvering', 'maneuvering_skill'], ['coordination', 'coordination_skill']]) {
        if (Number(t[k])) s += `\t\t${key} = ${fmtNum(t[k])}\n`;
      }
      const m = mods(t.mods, 3);
      if (m || t.extraModifier) s += `\t\tmodifier = {\n${m}${m && t.extraModifier ? '\n' : ''}${t.extraModifier ? indent(t.extraModifier, 3) : ''}\n\t\t}\n`;
      if (t.extra) s += indent(t.extra, 2) + '\n';
      s += '\t}\n';
      if (t.name && t.name !== t.id) o.l(t.id, t.name);
      if (t.desc) o.l(t.id + '_desc', t.desc);
    }
    o.file(`common/unit_leader/${file}`, s + '}\n');
  }
}

// ---------------------------------------------------------------- ideas (+ meter stages)
function ideaBlock(o, i, depth) {
  let s = `${T(depth)}${i.id} = {\n`;
  let pic = i.picture || 'generic_morale_bonus';
  if (i.img) {
    pic = safe(i.id);
    const path = `gfx/interface/ideas/${o.prefix}/${safe(i.id)}.dds`;
    o.sprite(`GFX_idea_${pic}`, path);
    o.img(i.img, path, D.IMAGE_SIZES.idea, 'contain');
  }
  s += `${T(depth + 1)}picture = ${pic}\n`;
  s += wrap('allowed', i.allowed, depth + 1);
  const m = mods(i.mods, depth + 2);
  if (m) s += `${T(depth + 1)}modifier = {\n${m}\n${T(depth + 1)}}\n`;
  if (i.extra) s += indent(i.extra, depth + 1) + '\n';
  s += `${T(depth)}}\n`;
  o.l(i.id, i.name);
  if (i.desc) o.l(i.id + '_desc', i.desc);
  return s;
}

function exportIdeas(o) {
  const country = o.p.ideas.filter((i) => i.category !== 'hidden_ideas');
  const hidden = o.p.ideas.filter((i) => i.category === 'hidden_ideas');
  const stageIdeas = [];
  for (const m of o.p.mechanics) {
    m.stages.forEach((st, idx) => stageIdeas.push({ id: `${m.id}_stage_${idx + 1}`, name: `${m.name}: ${st.name}`, desc: m.desc, picture: 'generic_political_support', img: m.img ? '' : '', mods: st.mods, allowed: '', extra: '' }));
  }
  if (!country.length && !hidden.length && !stageIdeas.length) return;
  let s = 'ideas = {\n';
  if (country.length || stageIdeas.length) {
    s += '\tcountry = {\n';
    for (const i of [...country, ...stageIdeas]) s += ideaBlock(o, i, 2);
    s += '\t}\n';
  }
  if (hidden.length) {
    s += '\thidden_ideas = {\n';
    for (const i of hidden) s += ideaBlock(o, i, 2);
    s += '\t}\n';
  }
  o.file(`common/ideas/${o.prefix}_ideas.txt`, s + '}\n');
}

// ---------------------------------------------------------------- events
function exportEvents(o) {
  if (!o.p.events.length) return;
  const namespaces = [...new Set(o.p.events.map((e) => e.id.includes('.') ? e.id.slice(0, e.id.lastIndexOf('.')) : o.prefix))];
  let s = namespaces.map((n) => `add_namespace = ${n}`).join('\n') + '\n';
  for (const e of o.p.events) {
    const kw = e.kind === 'news' ? 'news_event' : 'country_event';
    s += `\n${kw} = {\n\tid = ${e.id}\n\ttitle = ${e.id}.t\n\tdesc = ${e.id}.d\n`;
    let pic = e.picture || 'GFX_report_event_generic_read_write';
    if (e.img) {
      pic = `GFX_${e.kind === 'news' ? 'news' : 'report'}_event_${o.prefix}_${safe(e.id)}`;
      const path = `gfx/event_pictures/${o.prefix}_${safe(e.id)}.dds`;
      const size = e.kind === 'news' ? [397, 153] : D.IMAGE_SIZES.event;
      o.sprite(pic, path);
      o.img(e.img, path, size, 'cover');
    }
    s += `\tpicture = ${pic}\n`;
    if (e.mode === 'scripted') s += '\tis_triggered_only = yes\n';
    else {
      const cond = [];
      if (e.tag && e.tag !== 'ALL') cond.push(`tag = ${e.tag}`);
      if (e.mode === 'dated' && e.date) cond.push(`date > ${prevDay(e.date)}`);
      if (e.trigger && e.trigger.trim()) cond.push(e.trigger.trim());
      s += `\ttrigger = {\n${indent(cond.join('\n'), 2)}\n\t}\n`;
      s += `\tmean_time_to_happen = { days = ${e.mode === 'dated' ? 1 : Math.max(1, Number(e.mtth) || 1)} }\n`;
    }
    if (e.fireOnce || e.mode === 'dated') s += '\tfire_only_once = yes\n';
    if (e.hidden) s += '\thidden = yes\n';
    if (e.major) s += '\tmajor = yes\n';
    s += wrap('immediate', e.immediate, 1);
    o.l(`${e.id}.t`, e.title);
    o.l(`${e.id}.d`, e.desc);
    const opts = e.options.length ? e.options : [{ name: 'OK', effects: '', ai: 1 }];
    opts.forEach((op, i) => {
      const key = `${e.id}.${String.fromCharCode(97 + i)}`;
      s += `\toption = {\n\t\tname = ${key}\n\t\tai_chance = { factor = ${fmtNum(op.ai ?? 1)} }\n`;
      s += wrap('trigger', op.trigger, 2);
      if (op.effects && op.effects.trim()) s += indent(op.effects, 2) + '\n';
      s += '\t}\n';
      o.l(key, op.name);
    });
    s += '}\n';
  }
  o.file(`events/${o.prefix}_events.txt`, s);
}

function prevDay(d) {
  const [y, m, day] = String(d).split('.').map(Number);
  if (!y) return d;
  const dt = new Date(Date.UTC(y, (m || 1) - 1, day || 1));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return `${dt.getUTCFullYear()}.${dt.getUTCMonth() + 1}.${dt.getUTCDate()}`;
}

// ---------------------------------------------------------------- decisions
function decisionText(o, d, depth) {
  const t = T(depth);
  let s = `${t}${d.id} = {\n`;
  let icon = d.icon || 'generic_decision';
  if (d.img) {
    icon = safe(d.id);
    const path = `gfx/interface/decisions/${o.prefix}/${safe(d.id)}.dds`;
    o.sprite(`GFX_decision_${icon}`, path);
    o.img(d.img, path, D.IMAGE_SIZES.decision, 'contain');
  }
  s += `${t}\ticon = ${icon}\n`;
  if (Number(d.cost)) s += `${t}\tcost = ${fmtNum(d.cost)}\n`;
  if (d.fireOnce) s += `${t}\tfire_only_once = yes\n`;
  s += wrap('visible', d.visible, depth + 1);
  if (d.mission) {
    s += `${t}\tdays_mission_timeout = ${Math.max(1, Number(d.missionDays) || 30)}\n`;
    s += `${t}\tis_good = yes\n`;
    if (d.selectable) s += `${t}\tselectable_mission = yes\n`;
    s += wrap('activation', d.activation, depth + 1);
    s += wrap('available', d.available, depth + 1);
    s += wrap('complete_effect', d.effect, depth + 1);
    s += wrap('timeout_effect', d.timeoutEffect, depth + 1);
  } else {
    s += wrap('available', d.available, depth + 1);
    if (Number(d.daysRemove)) s += `${t}\tdays_remove = ${fmtNum(d.daysRemove)}\n`;
    if (Number(d.daysReEnable)) s += `${t}\tdays_re_enable = ${fmtNum(d.daysReEnable)}\n`;
    s += wrap('complete_effect', d.effect, depth + 1);
    if (Number(d.daysRemove)) s += wrap('remove_effect', d.removeEffect, depth + 1);
  }
  s += `${t}\tai_will_do = { factor = ${fmtNum(d.ai ?? 1)} }\n`;
  s += `${t}}\n`;
  o.l(d.id, d.name);
  if (d.desc) o.l(d.id + '_desc', d.desc);
  return s;
}

function categoryText(o, c) {
  let s = `${c.id} = {\n`;
  s += `\ticon = ${c.icon || 'generic_political_actions'}\n`;
  if (c.img) {
    const name = `GFX_decision_cat_picture_${safe(c.id)}`;
    const path = `gfx/interface/decisions/${o.prefix}/${safe(c.id)}_picture.dds`;
    o.sprite(name, path);
    o.img(c.img, path, D.IMAGE_SIZES.decisionCat, 'cover');
    s += `\tpicture = ${name}\n`;
  }
  s += `\tpriority = ${fmtNum(c.priority ?? 100)}\n`;
  const allowed = [c.tag ? `original_tag = ${c.tag}` : '', c.allowed || ''].filter((x) => x.trim()).join('\n');
  s += wrap('allowed', allowed, 1);
  s += wrap('visible', c.visible, 1);
  s += '}\n';
  o.l(c.id, c.name);
  if (c.desc) o.l(c.id + '_desc', c.desc);
  return s;
}

function exportDecisions(o) {
  const cats = [...o.p.decisionCategories];
  for (const m of o.p.mechanics) {
    cats.push({
      id: `${m.id}_category`, name: m.name, tag: m.tag, icon: 'generic_political_actions', img: m.img, priority: 150,
      desc: `${m.desc ? m.desc + '\n\n' : ''}Current ${m.name}: [?${m.id}|0] (from ${fmtNum(m.min)} to ${fmtNum(m.max)})`,
      allowed: '', visible: '', decisions: m.decisions,
    });
  }
  for (const b of o.p.bops) {
    cats.push({ id: `${b.id}_category`, name: b.name, tag: b.tag, icon: 'generic_political_actions', priority: 150, desc: b.desc, allowed: '', visible: '', decisions: b.decisions });
  }
  if (!cats.length) return;
  o.file(`common/decisions/categories/${o.prefix}_categories.txt`, cats.map((c) => categoryText(o, c)).join('\n'));
  let s = '';
  for (const c of cats) {
    s += `${c.id} = {\n`;
    for (const d of c.decisions) s += decisionText(o, d, 1);
    s += '}\n\n';
  }
  o.file(`common/decisions/${o.prefix}_decisions.txt`, s);
}

// ---------------------------------------------------------------- mechanics
function exportMechanics(o) {
  if (!o.p.mechanics.length) return;
  let se = '';
  for (const m of o.p.mechanics) {
    const v = m.id;
    let s = `${v}_update = {\n`;
    s += `\tclamp_variable = { var = ${v} min = ${fmtNum(m.min)} max = ${fmtNum(m.max)} }\n`;
    const stageIds = m.stages.map((_, i) => `${v}_stage_${i + 1}`);
    m.stages.forEach((st, i) => {
      const others = stageIds.filter((_, j) => j !== i);
      s += '\tif = {\n\t\tlimit = {\n';
      s += `\t\t\tNOT = { check_variable = { ${v} < ${fmtNum(st.min)} } }\n`;
      s += `\t\t\tcheck_variable = { ${v} < ${fmtNum(st.max)} }\n`;
      s += `\t\t\tNOT = { has_idea = ${stageIds[i]} }\n\t\t}\n`;
      for (const x of others) s += `\t\tif = { limit = { has_idea = ${x} } remove_ideas = ${x} }\n`;
      s += `\t\tadd_ideas = ${stageIds[i]}\n\t}\n`;
    });
    if (m.atMax && m.atMax.trim()) {
      s += `\tif = {\n\t\tlimit = { NOT = { check_variable = { ${v} < ${fmtNum(m.max)} } } NOT = { has_country_flag = ${v}_at_max } }\n\t\tset_country_flag = ${v}_at_max\n${indent(m.atMax, 2)}\n\t}\n`;
      s += `\tif = { limit = { check_variable = { ${v} < ${fmtNum(m.max)} } } clr_country_flag = ${v}_at_max }\n`;
    }
    if (m.atMin && m.atMin.trim()) {
      s += `\tif = {\n\t\tlimit = { NOT = { check_variable = { ${v} > ${fmtNum(m.min)} } } NOT = { has_country_flag = ${v}_at_min } }\n\t\tset_country_flag = ${v}_at_min\n${indent(m.atMin, 2)}\n\t}\n`;
      s += `\tif = { limit = { check_variable = { ${v} > ${fmtNum(m.min)} } } clr_country_flag = ${v}_at_min }\n`;
    }
    s += '}\n';
    se += s + '\n';
    if (m.tag) {
      o.onStart(m.tag, `set_variable = { ${v} = ${fmtNum(m.start)} }`);
      o.onStart(m.tag, `${v}_update = yes`);
      if (Number(m.monthly)) (o.monthly[m.tag] = o.monthly[m.tag] || []).push(`add_to_variable = { ${v} = ${fmtNum(m.monthly)} }`, `${v}_update = yes`);
    }
    o.l(v, m.name);
  }
  o.file(`common/scripted_effects/${o.prefix}_effects.txt`, se);
}

async function placeholderIcon(letter, color) {
  if (typeof document === 'undefined') return new Uint8Array(0); // headless tests
  const c = document.createElement('canvas');
  c.width = 38; c.height = 38;
  const x = c.getContext('2d');
  x.fillStyle = color; x.beginPath(); x.arc(19, 19, 17, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#fff'; x.font = 'bold 20px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText((letter || '?').slice(0, 1).toUpperCase(), 19, 20);
  return canvasToDDS(c);
}

async function exportBops(o) {
  if (!o.p.bops.length) return;
  let s = '';
  for (const b of o.p.bops) {
    const left = `${b.id}_left`;
    const right = `${b.id}_right`;
    const rangeText = (r, i, depth) => {
      const rid = `${b.id}_range_${i + 1}`;
      o.l(rid, r.name);
      let t = `${T(depth)}range = {\n${T(depth + 1)}id = ${rid}\n${T(depth + 1)}min = ${fmtNum(r.min)}\n${T(depth + 1)}max = ${fmtNum(r.max)}\n`;
      const m = mods(r.mods, depth + 2);
      if (m) t += `${T(depth + 1)}modifier = {\n${m}\n${T(depth + 1)}}\n`;
      t += wrap('on_activate', r.onActivate, depth + 1);
      return t + `${T(depth)}}\n`;
    };
    const sorted = [...b.ranges].sort((x, y) => x.min - y.min);
    const center = [], leftR = [], rightR = [];
    sorted.forEach((r, i) => {
      if (Number(r.max) <= 0 && Number(r.min) < 0) leftR.push([r, i]);
      else if (Number(r.min) >= 0 && Number(r.max) > 0) rightR.push([r, i]);
      else center.push([r, i]);
    });
    s += `${b.id} = {\n\tinitial_value = ${fmtNum(b.initial)}\n\tleft_side = ${left}\n\tright_side = ${right}\n\tdecision_category = ${b.id}_category\n`;
    for (const [r, i] of center.slice(0, 1)) s += rangeText(r, i, 1);
    for (const [sideId, side, rs, color] of [[left, b.left, leftR, '#8b3a3a'], [right, b.right, rightR, '#3a6a8b']]) {
      const icon = `GFX_bop_${safe(sideId)}`;
      const path = `gfx/interface/bop/${o.prefix}/${safe(sideId)}.dds`;
      o.sprite(icon, path);
      if (side.img) o.img(side.img, path, D.IMAGE_SIZES.bopSide, 'contain');
      else o.file(path, await placeholderIcon(side.name, color));
      s += `\tside = {\n\t\tid = ${sideId}\n\t\ticon = ${icon}\n`;
      for (const [r, i] of rs) s += rangeText(r, i, 2);
      s += '\t}\n';
      o.l(sideId, side.name);
    }
    s += '}\n\n';
    o.l(b.id, b.name);
    if (b.tag) o.onStart(b.tag, `set_power_balance = { id = ${b.id} left_side = ${left} right_side = ${right} set_default = yes }`);
  }
  o.file(`common/bop/${o.prefix}_bop.txt`, s);
}

// ---------------------------------------------------------------- tech
function exportTech(o) {
  const p = o.p;
  const variantOf = (id) => (p.equipment.some((e) => e.id === id) ? `${id}_1` : id);
  if (p.technologies.length) {
    let s = 'technologies = {\n';
    for (const t of p.technologies) {
      s += `\t${t.id} = {\n`;
      s += `\t\tresearch_cost = ${fmtNum(t.cost)}\n\t\tstart_year = ${fmtNum(t.year)}\n`;
      s += `\t\tfolder = {\n\t\t\tname = ${t.folder}\n\t\t\tposition = { x = ${Math.round(t.x)} y = ${Math.round(t.y)} }\n\t\t}\n`;
      for (const n of t.leadsTo) s += `\t\tpath = {\n\t\t\tleads_to_tech = ${n}\n\t\t\tresearch_cost_coeff = 1\n\t\t}\n`;
      if ((t.xor || []).length) s += `\t\txor = { ${t.xor.join(' ')} }\n`;
      if (t.enableEquip.length) s += `\t\tenable_equipments = { ${t.enableEquip.map(variantOf).join(' ')} }\n`;
      if (t.enableUnits.length) s += `\t\tenable_subunits = { ${t.enableUnits.join(' ')} }\n`;
      const allow = [];
      if (t.allowTags.length === 1) allow.push(`tag = ${t.allowTags[0]}`);
      else if (t.allowTags.length > 1) allow.push(`OR = {\n${t.allowTags.map((x) => `\ttag = ${x}`).join('\n')}\n}`);
      if (t.vanillaParent) allow.push(`has_tech = ${t.vanillaParent}`);
      s += wrap('allow', allow.join('\n'), 2);
      const m = mods(t.mods, 2);
      if (m) s += m + '\n';
      if (t.categories.length) s += `\t\tcategories = { ${t.categories.join(' ')} }\n`;
      s += `\t\tai_will_do = { factor = ${fmtNum(t.ai ?? 1)} }\n`;
      if (t.extra) s += indent(t.extra, 2) + '\n';
      s += '\t}\n';
      o.l(t.id, t.name);
      if (t.desc) o.l(t.id + '_desc', t.desc);
      if (t.img) {
        const path = `gfx/interface/technologies/${o.prefix}/${safe(t.id)}.dds`;
        o.sprite(`GFX_${t.id}_medium`, path);
        o.img(t.img, path, D.IMAGE_SIZES.tech, 'contain');
      }
    }
    o.file(`common/technologies/${o.prefix}_technologies.txt`, s + '}\n');
  }
  const newCats = [...new Set(p.technologies.flatMap((t) => t.categories))].filter((c) => !D.TECH_CATEGORIES.includes(c));
  if (p.techFolders.length || newCats.length) {
    let s = '';
    if (p.techFolders.length) s += `technology_folders = {\n${p.techFolders.map((f) => `\t${f.id}`).join('\n')}\n}\n`;
    if (newCats.length) s += `technology_categories = {\n${newCats.map((c) => `\t${c}`).join('\n')}\n}\n`;
    o.file(`common/technology_tags/${o.prefix}_technology_tags.txt`, s);
    for (const c of newCats) o.l(c, c.replace(/_/g, ' '));
  }
  if (p.techFolders.length) {
    let g = 'guiTypes = {\n';
    for (const f of p.techFolders) {
      g += `\tcontainerWindowType = {\n\t\tname = "${f.id}"\n\t\tposition = { x = 0 y = 0 }\n\t\tsize = { width = 100% height = 100% }\n\t\tclipping = no\n\t\tverticalScrollbar = "right_vertical_slider"\n\t\thorizontalScrollbar = "bottom_horizontal_slider"\n\t\tscroll_wheel_factor = 40\n\t\tsmooth_scrolling = yes\n`;
      g += `\t\tgridboxtype = {\n\t\t\tname = "techtree_stripes"\n\t\t\tposition = { x = 0 y = 30 }\n\t\t\tsize = { width = 100% height = 100% }\n\t\t\tslotsize = { width = 70 height = 0 }\n\t\t\tformat = "LEFT"\n\t\t}\n\t}\n`;
      o.l(f.id, f.name);
      o.l(f.id + '_name', f.name);
      o.l(f.id + '_desc', f.name);
    }
    o.file(`interface/${o.prefix}_techfolders.gui`, g + '}\n');
  }
  for (const st of p.startingTechs) {
    if (!st.techs.length) continue;
    const line = `set_technology = { ${st.techs.map((t) => `${t} = 1`).join(' ')} popup = no }`;
    if (st.tag === 'ALL') o.startupGlobal.push(`every_country = { ${line} }`);
    else if (st.tag) o.onStart(st.tag, line);
  }
}

// ---------------------------------------------------------------- equipment & units
const INTERFACE_CAT = { infantry: 'interface_category_land', support: 'interface_category_land', motorized: 'interface_category_land', mechanized: 'interface_category_land', artillery: 'interface_category_artillery', anti_tank: 'interface_category_anti_tank', anti_air: 'interface_category_anti_air', armor: 'interface_category_armor' };

function exportUnits(o) {
  const p = o.p;
  const enabledEq = new Set(p.technologies.flatMap((t) => t.enableEquip));
  const enabledUnits = new Set(p.technologies.flatMap((t) => t.enableUnits));
  if (p.equipment.length) {
    let s = 'equipments = {\n';
    for (const e of p.equipment) {
      s += `\t${e.id} = {\n\t\tyear = ${fmtNum(e.year)}\n\t\tis_archetype = yes\n\t\tis_buildable = no\n\t\ttype = ${e.type}\n\t\tgroup_by = archetype\n\t\tinterface_category = ${INTERFACE_CAT[e.type] || 'interface_category_land'}\n`;
      for (const k of ['reliability', 'maximum_speed', 'defense', 'breakthrough', 'soft_attack', 'hard_attack', 'ap_attack', 'air_attack', 'armor_value', 'hardness', 'build_cost_ic']) {
        if (e[k] !== '' && e[k] !== undefined) s += `\t\t${k} = ${fmtNum(e[k])}\n`;
      }
      const res = Object.entries(e.resources || {}).filter(([, v]) => Number(v) > 0);
      if (res.length) s += `\t\tresources = { ${res.map(([k, v]) => `${k} = ${fmtNum(v)}`).join(' ')} }\n`;
      if (e.extra) s += indent(e.extra, 2) + '\n';
      s += '\t}\n';
      s += `\t${e.id}_1 = {\n\t\tyear = ${fmtNum(e.year)}\n\t\tarchetype = ${e.id}\n\t\tpriority = 10\n\t\tvisual_level = 0\n\t\tactive = ${enabledEq.has(e.id) || enabledEq.has(e.id + '_1') ? 'no' : 'yes'}\n\t}\n`;
      o.l(e.id, e.name);
      o.l(`${e.id}_1`, e.name);
      o.l(`${e.id}_short`, e.name);
      o.l(`${e.id}_1_short`, e.name);
      if (e.desc) { o.l(e.id + '_desc', e.desc); o.l(e.id + '_1_desc', e.desc); }
      if (e.img) {
        const path = `gfx/interface/technologies/${o.prefix}/${safe(e.id)}_eq.dds`;
        o.sprite(`GFX_${e.id}_medium`, path);
        o.sprite(`GFX_${e.id}_1_medium`, path);
        o.img(e.img, path, D.IMAGE_SIZES.equipment, 'contain');
      }
    }
    o.file(`common/units/equipment/${o.prefix}_equipment.txt`, s + '}\n');
  }
  if (p.subunits.length) {
    let s = 'sub_units = {\n';
    for (const u of p.subunits) {
      const group = u.support ? 'support' : u.group || 'infantry';
      const type = { infantry: 'infantry', mobile: 'motorized', armor: 'armor', support: 'support' }[group];
      const cats = u.support ? 'category_support_battalions category_army' : group === 'armor' ? 'category_front_line category_all_armor category_army' : 'category_front_line category_all_infantry category_army';
      s += `\t${u.id} = {\n\t\tsprite = ${u.sprite || 'infantry'}\n\t\tmap_icon_category = ${u.mapIcon || 'infantry'}\n\t\tpriority = 600\n\t\tai_priority = 100\n`;
      s += `\t\tactive = ${enabledUnits.has(u.id) ? 'no' : 'yes'}\n\t\ttype = { ${type} }\n\t\tgroup = ${group}\n\t\tcategories = { ${cats} }\n`;
      s += `\t\tcombat_width = ${fmtNum(u.support ? 0 : u.width)}\n\t\tmax_strength = ${fmtNum(u.hp)}\n\t\tmax_organisation = ${fmtNum(u.org)}\n\t\tdefault_morale = 0.3\n`;
      s += `\t\tmanpower = ${fmtNum(u.manpower)}\n\t\ttraining_time = ${fmtNum(u.training)}\n\t\tsuppression = ${fmtNum(u.suppression)}\n\t\tweight = ${fmtNum(u.weight)}\n\t\tsupply_consumption = ${fmtNum(u.supply)}\n`;
      for (const [k, key] of [['soft_mult', 'soft_attack'], ['hard_mult', 'hard_attack'], ['def_mult', 'defense'], ['bt_mult', 'breakthrough']]) {
        const v = Number(u[k] ?? 1);
        if (isFinite(v) && v !== 1) s += `\t\t${key} = ${fmtNum(v - 1)}\n`;
      }
      const need = (u.need || []).filter((n) => n.eq && Number(n.n) > 0);
      if (need.length) s += `\t\tneed = {\n${need.map((n) => `\t\t\t${n.eq} = ${fmtNum(n.n)}`).join('\n')}\n\t\t}\n`;
      if (u.extra) s += indent(u.extra, 2) + '\n';
      s += '\t}\n';
      o.l(u.id, u.name);
      if (u.desc) o.l(u.id + '_desc', u.desc);
      if (u.img) {
        for (const sz of ['medium', 'small']) {
          const path = `gfx/interface/counters/divisions_${sz}/${o.prefix}_${safe(u.id)}.dds`;
          o.sprite(`GFX_unit_${u.id}_icon_${sz}`, path);
          o.img(u.img, path, sz === 'medium' ? D.IMAGE_SIZES.unitIcon : [24, 24], 'contain');
        }
      }
    }
    o.file(`common/units/${o.prefix}_units.txt`, s + '}\n');
  }
}

function exportModels(o) {
  const p = o.p;
  const clones = p.equipment.filter((e) => e.model);
  if (!p.models.length && !clones.length) return;
  let s = '';
  for (const m of p.models) {
    if (!m.mesh) continue;
    const meshFile = `gfx/models/${o.prefix}/${safe(m.id)}.mesh`;
    o.file(meshFile, dataUrlToBytes(m.mesh));
    let tex = '';
    if (m.texture) {
      tex = `${safe(m.id)}_diffuse.dds`;
      if (/\.dds$/i.test(m.textureName || '')) o.file(`gfx/models/${o.prefix}/${tex}`, dataUrlToBytes(m.texture));
      else o.images.push({ dataUrl: m.texture, path: `gfx/models/${o.prefix}/${tex}`, size: null });
    }
    s += `objectTypes = {\n\tpdxmesh = {\n\t\tname = "${m.id}_mesh"\n\t\tfile = "${meshFile}"\n\t\tscale = ${fmtNum(m.scale || 1)}\n`;
    if (tex) s += `\t\tmeshsettings = {\n\t\t\tname = "${m.shape || m.id + 'Shape'}"\n\t\t\tindex = 0\n\t\t\ttexture_diffuse = "${tex}"\n\t\t\tshader = "PdxMeshStandard"\n\t\t}\n`;
    s += '\t}\n}\n';
    s += `entity = {\n\tname = "${m.id}_entity"\n\tpdxmesh = "${m.id}_mesh"\n\tdefault_state = "idle"\n\tstate = { name = "idle" state_time = 1 }\n\tstate = { name = "move" state_time = 1 }\n\tstate = { name = "attack" state_time = 1 }\n\tscale = ${fmtNum(m.scale || 1)}\n}\n\n`;
  }
  for (const e of clones) s += `entity = {\n\tname = "${e.id}_entity"\n\tclone = "${e.model}"\n}\n`;
  o.file(`gfx/entities/${o.prefix}_models.asset`, s);
}

// ---------------------------------------------------------------- divisions
function exportDivisions(o) {
  const all = allSubunits();
  const byTag = {};
  for (const d of o.p.divisions) if (d.tag) (byTag[d.tag] = byTag[d.tag] || []).push(d);
  for (const [tag, divs] of Object.entries(byTag)) {
    const oob = `${tag}_${o.prefix}`;
    let s = '';
    let units = '';
    const stock = {};
    for (const d of divs) {
      s += `division_template = {\n\tname = "${d.name.replace(/"/g, "'")}"\n\tregiments = {\n`;
      d.grid.forEach((col, x) => {
        col.filter(Boolean).forEach((id, y) => { s += `\t\t${id} = { x = ${x} y = ${y} }\n`; });
      });
      s += '\t}\n';
      const sup = d.support.filter(Boolean);
      if (sup.length) s += `\tsupport = {\n${sup.map((id, y) => `\t\t${id} = { x = 0 y = ${y} }`).join('\n')}\n\t}\n`;
      s += `\tpriority = ${fmtNum(d.priority ?? 1)}\n}\n\n`;
      let count = 0;
      for (const u of d.units) {
        for (let i = 0; i < Math.max(1, Number(u.count) || 1); i++) {
          units += `\tdivision = {\n\t\tdivision_template = "${d.name.replace(/"/g, "'")}"\n\t\tlocation = ${Math.round(Number(u.location) || 1)}\n\t\tstart_experience_factor = ${fmtNum(d.experience || 0)}\n\t}\n`;
          count++;
        }
      }
      if (d.stockpile && count) {
        const st = divisionStats(d);
        for (const [eq, n] of Object.entries(st.need)) stock[eq] = (stock[eq] || 0) + n * count;
      }
      void all;
    }
    // Give the techs that unlock any custom units/equipment these templates use.
    const needTechs = new Set();
    for (const d of divs) {
      const ids = [...d.grid.flat(), ...d.support].filter(Boolean);
      for (const id of ids) {
        for (const t of o.p.technologies) if (t.enableUnits.includes(id)) needTechs.add(t.id);
        const su = o.p.subunits.find((x) => x.id === id);
        for (const n of su ? su.need : []) for (const t of o.p.technologies) if (t.enableEquip.includes(n.eq)) needTechs.add(t.id);
      }
    }
    if (needTechs.size) o.onStart(tag, `set_technology = { ${[...needTechs].map((t) => `${t} = 1`).join(' ')} popup = no }`);
    if (units) s += `units = {\n${units}}\n`;
    o.file(`history/units/${oob}.txt`, s);
    for (const [eq, n] of Object.entries(stock)) o.onStart(tag, `add_equipment_to_stockpile = { type = ${eq} amount = ${Math.ceil(n * 1.1)} producer = ${tag} }`);
    o.onStart(tag, `load_oob = "${oob}"`);
  }
}


// ---------------------------------------------------------------- new countries
const BASIC_TECHS = ['infantry_weapons', 'infantry_weapons1', 'tech_support', 'tech_engineers', 'tech_recon', 'gw_artillery', 'interwar_antiair', 'early_fighter', 'gwtank_chassis', 'trench_warfare', 'fleet_in_being'];

function hexRGB(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  const n = m ? parseInt(m[1], 16) : 0x7a5c9e;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function exportCountries(o) {
  const list = o.p.countries.filter((c) => c.isNew && /^[A-Z][A-Z0-9]{2}$/.test(c.tag || ''));
  if (!list.length) return;
  let tags = '';
  for (const c of list) {
    const file = (c.name || c.tag).replace(/[^A-Za-z0-9 _-]/g, '').trim() || c.tag;
    tags += `${c.tag} = "countries/${file}.txt"\n`;
    const [r, g, b] = hexRGB(c.color);
    const cul = c.culture || 'western_european';
    o.file(`common/countries/${file}.txt`, `graphical_culture = ${cul}_gfx\ngraphical_culture_2d = ${cul}_2d\n\ncolor = { ${r} ${g} ${b} }\n`);
    // history
    const pop = c.popularity || {};
    const ideos = ['democratic', 'communism', 'fascism', 'neutrality'];
    let total = ideos.reduce((a, i) => a + (Number(pop[i]) || 0), 0);
    if (!total) { pop.neutrality = 100; total = 100; }
    const scaled = ideos.map((i) => [i, Math.round(((Number(pop[i]) || 0) * 100) / total)]);
    scaled[3][1] += 100 - scaled.reduce((a, x) => a + x[1], 0);
    let hs = '';
    if (c.existsAtStart && c.capital) hs += `capital = ${Math.round(Number(c.capital))}\n\n`;
    hs += `set_research_slots = ${fmtNum(c.researchSlots ?? 3)}\nset_stability = ${fmtNum(c.stability ?? 0.5)}\nset_war_support = ${fmtNum(c.warSupport ?? 0.3)}\nset_convoys = ${fmtNum(c.convoys ?? 0)}\n\n`;
    if (c.basicTechs !== false) hs += `set_technology = {\n${BASIC_TECHS.map((t) => `\t${t} = 1`).join('\n')}\n}\n\n`;
    hs += `set_politics = {\n\truling_party = ${c.ruling || 'neutrality'}\n\tlast_election = "1934.1.1"\n\telection_frequency = 48\n\telections_allowed = ${c.elections ? 'yes' : 'no'}\n}\n\n`;
    hs += `set_popularities = {\n${scaled.map(([i, v]) => `\t${i} = ${v}`).join('\n')}\n}\n`;
    o.file(`history/countries/${c.tag} - ${file}.txt`, hs);
    // flags
    const flagSets = [['', c.flag], ...ideos.map((i) => ['_' + i, (c.ideoFlags || {})[i]])];
    for (const [suffix, img] of flagSets) {
      if (!img) continue;
      o.img(img, `gfx/flags/${c.tag}${suffix}.tga`, [82, 52]);
      o.img(img, `gfx/flags/medium/${c.tag}${suffix}.tga`, [41, 26]);
      o.img(img, `gfx/flags/small/${c.tag}${suffix}.tga`, [10, 7]);
    }
    // names
    const adj = c.adj || c.name;
    const def = c.def || c.name;
    o.l(c.tag, c.name);
    o.l(`${c.tag}_DEF`, def);
    o.l(`${c.tag}_ADJ`, adj);
    for (const i of ideos) {
      const n = (c.ideoNames || {})[i];
      o.l(`${c.tag}_${i}`, n || c.name);
      o.l(`${c.tag}_${i}_DEF`, n || def);
      o.l(`${c.tag}_${i}_ADJ`, adj);
    }
    // territory at start
    const ids = (arr) => (arr || []).map((x) => Math.round(Number(x))).filter((x) => x > 0);
    if (c.existsAtStart) for (const s of ids(c.states)) o.startupGlobal.push(`${s} = { transfer_state_to = ${c.tag} add_core_of = ${c.tag} }`);
    for (const s of ids(c.cores)) o.startupGlobal.push(`${s} = { add_core_of = ${c.tag} }`);
    if (c.existsAtStart && Number(c.capital) > 0) o.onStart(c.tag, `set_capital = { state = ${Math.round(Number(c.capital))} }`);
  }
  o.file(`common/country_tags/${o.prefix}_countries.txt`, tags);
}

// ---------------------------------------------------------------- on_actions, gfx, loc, descriptor
function exportOnActions(o) {
  const tags = Object.keys(o.startup);
  const mtags = Object.keys(o.monthly);
  if (!tags.length && !o.startupGlobal.length && !mtags.length) return;
  let s = 'on_actions = {\n';
  if (tags.length || o.startupGlobal.length) {
    s += `\ton_startup = {\n\t\teffect = {\n\t\t\tif = {\n\t\t\t\tlimit = { NOT = { has_global_flag = ${o.prefix}_started } }\n\t\t\t\tset_global_flag = ${o.prefix}_started\n`;
    for (const l of o.startupGlobal) s += indent(l, 4) + '\n';
    for (const t of tags) {
      s += `\t\t\t\tif = {\n\t\t\t\t\tlimit = { country_exists = ${t} }\n\t\t\t\t\t${t} = {\n${indent(o.startup[t].join('\n'), 6)}\n\t\t\t\t\t}\n\t\t\t\t}\n`;
    }
    s += '\t\t\t}\n\t\t}\n\t}\n';
  }
  if (mtags.length) {
    s += '\ton_monthly = {\n\t\teffect = {\n';
    for (const t of mtags) s += `\t\t\tif = {\n\t\t\t\tlimit = { tag = ${t} }\n${indent(o.monthly[t].join('\n'), 4)}\n\t\t\t}\n`;
    s += '\t\t}\n\t}\n';
  }
  o.file(`common/on_actions/${o.prefix}_on_actions.txt`, s + '}\n');
}

async function finish(o) {
  // images
  for (const im of o.images) {
    try {
      const size = im.size || [512, 512];
      if (im.path.endsWith('.tga')) o.file(im.path, await toTGA(im.dataUrl, size[0], size[1]));
      else o.file(im.path, await toDDS(im.dataUrl, size[0], size[1], im.mode || 'cover'));
    } catch (e) {
      console.warn('image failed', im.path, e);
    }
  }
  if (o.sprites.length) {
    const seen = new Set();
    let s = 'spriteTypes = {\n';
    for (const [name, path] of o.sprites) {
      if (seen.has(name)) continue;
      seen.add(name);
      s += `\tspriteType = {\n\t\tname = "${name}"\n\t\ttexturefile = "${path}"\n\t}\n`;
    }
    o.file(`interface/${o.prefix}.gfx`, s + '}\n');
  }
  if (o.loc.length) {
    const seen = new Set();
    let s = '\uFEFFl_english:\n';
    for (const [k, v] of o.loc) {
      if (seen.has(k)) continue;
      seen.add(k);
      s += ` ${k}:0 "${locText(v)}"\n`;
    }
    o.file(`localisation/english/${o.prefix}_l_english.yml`, s);
  }
  const m = o.p.meta;
  let desc = `version="${m.version || '1.0'}"\ntags={\n${(m.tags || []).map((t) => `\t"${t}"`).join('\n')}\n}\nname="${(m.name || 'My Mod').replace(/"/g, "'")}"\nsupported_version="${m.supported || '1.19.*'}"\n`;
  if (m.thumbnail) {
    o.file('thumbnail.png', await toPNG(m.thumbnail, 256, 256, 'cover'));
    desc += 'picture="thumbnail.png"\n';
  }
  o.file('descriptor.mod', desc);
}

export async function buildMod(project) {
  const o = new Out(project);
  exportCountries(o);
  exportFocusTrees(o);
  exportCharacters(o);
  exportTraits(o);
  exportIdeas(o);
  exportEvents(o);
  exportDecisions(o);
  exportMechanics(o);
  await exportBops(o);
  exportTech(o);
  exportUnits(o);
  exportModels(o);
  exportDivisions(o);
  exportOnActions(o);
  await finish(o);
  const folder = safe(project.meta.folder || 'my_mod');
  const m = project.meta;
  const outer = `version="${m.version || '1.0'}"\ntags={\n${(m.tags || []).map((t) => `\t"${t}"`).join('\n')}\n}\nname="${(m.name || 'My Mod').replace(/"/g, "'")}"\nsupported_version="${m.supported || '1.19.*'}"\npath="mod/${folder}"\n`;
  return {
    folder,
    files: [...o.files.map((f) => ({ path: `${folder}/${f.path}`, data: f.data })), { path: `${folder}.mod`, data: outer }],
  };
}

// ---------------------------------------------------------------- validation
export function validate(p) {
  const issues = [];
  const warn = (where, msg) => issues.push({ level: 'warn', where, msg });
  const err = (where, msg) => issues.push({ level: 'error', where, msg });
  const idOk = (id) => /^[A-Za-z0-9_.]+$/.test(id || '');
  if (!/^[a-z0-9_]+$/i.test(p.meta.prefix || '')) err('Mod settings', 'Script prefix may only contain letters, numbers and _.');
  if (!p.meta.folder) err('Mod settings', 'Folder name is empty.');

  const seen = new Map();
  const dupe = (kind, id, where) => {
    const k = kind + ':' + id;
    if (seen.has(k)) err(where, `Duplicate id "${id}" (also used in ${seen.get(k)}).`);
    else seen.set(k, where);
  };
  const scriptCheck = (where, label, text) => {
    const e = text && checkBraces(text);
    if (e) err(where, `${label}: ${e}`);
  };

  for (const c of p.countries.filter((x) => x.isNew)) {
    const w = `Country "${c.name}"`;
    if (!/^[A-Z][A-Z0-9]{2}$/.test(c.tag || '')) err(w, 'Tag must be 3 characters: a capital letter then letters/digits.');
    if (D.COUNTRIES.some((x) => x[0] === c.tag)) err(w, `Tag ${c.tag} is already a vanilla country.`);
    dupe('tag', c.tag, w);
    if (c.existsAtStart && !(c.states || []).length) err(w, 'Exists at start but owns no states — it would not exist. Add state ids or untick "Exists at game start".');
    if (c.existsAtStart && (c.states || []).length && !c.capital) warn(w, 'No capital state set.');
    if (c.existsAtStart && c.capital && !(c.states || []).map(String).includes(String(c.capital))) warn(w, 'Capital is not one of its states.');
    if (!c.flag) warn(w, 'No flag — the game will show a blank flag.');
  }
  for (const t of p.focusTrees) {
    const where = `Focus tree "${t.name}"`;
    if (!t.treeId) err(where, 'Tree id is empty.');
    const ids = new Set(t.focuses.map((f) => f.id));
    const pos = new Set();
    for (const f of t.focuses) {
      const fw = `${where} → ${f.name || f.id}`;
      if (!idOk(f.id)) err(fw, `Invalid focus id "${f.id}".`);
      dupe('focus', f.id, fw);
      const k = f.x + ',' + f.y;
      if (pos.has(k)) warn(fw, `Overlaps another focus at x=${f.x}, y=${f.y}.`);
      pos.add(k);
      for (const g of f.prereq) for (const id of g) if (!ids.has(id)) warn(fw, `Requires "${id}", which is not in this tree.`);
      for (const id of f.exclusive) if (!ids.has(id)) warn(fw, `Mutually exclusive with missing focus "${id}".`);
      scriptCheck(fw, 'Completion reward', f.reward);
      scriptCheck(fw, 'Available', f.available);
      scriptCheck(fw, 'Bypass', f.bypass);
    }
    if (!t.tag && !t.default && !t.countryRaw) warn(where, 'No country set — no one will get this tree (unless loaded with "Switch focus tree").');
  }
  for (const c of p.characters) {
    const w = `Person "${c.name}"`;
    if (!idOk(c.id)) err(w, 'Invalid id.');
    dupe('char', c.id, w);
    if (!c.tag) warn(w, 'No country set.');
    if (!c.leader.on && !c.advisor.on && !c.general.on && !c.admiral.on) warn(w, 'Has no role (leader/advisor/general/admiral).');
    if (!c.portrait && !c.portraitPath) warn(w, 'No portrait — the game will show a blank one.');
  }
  for (const t of [...p.leaderTraits, ...p.unitTraits]) { if (!idOk(t.id)) err(`Trait "${t.name}"`, 'Invalid id.'); scriptCheck(`Trait "${t.name}"`, 'Extra script', t.extra); }
  for (const i of p.ideas) { dupe('idea', i.id, `Spirit "${i.name}"`); if (!idOk(i.id)) err(`Spirit "${i.name}"`, 'Invalid id.'); }
  for (const e of p.events) {
    const w = `Event "${e.title}"`;
    dupe('event', e.id, w);
    if (!/^[A-Za-z0-9_]+\.\d+$/.test(e.id)) err(w, `Event id "${e.id}" must look like namespace.number (e.g. ${p.meta.prefix}.1).`);
    if (e.mode === 'dated' && !/^\d{4}\.\d{1,2}\.\d{1,2}$/.test(e.date || '')) err(w, 'Date must look like 1938.3.12');
    if (e.mode !== 'scripted' && !e.tag && !(e.trigger || '').trim()) warn(w, 'No country or condition — it would fire for every country.');
    for (const o of e.options) scriptCheck(w, `Option "${o.name}"`, o.effects);
  }
  const decs = [...p.decisionCategories.flatMap((c) => c.decisions.map((d) => [c.name, d])), ...p.mechanics.flatMap((m) => m.decisions.map((d) => [m.name, d])), ...p.bops.flatMap((b) => b.decisions.map((d) => [b.name, d]))];
  for (const [cn, d] of decs) {
    const w = `Decision "${d.name}" (${cn})`;
    dupe('decision', d.id, w);
    if (!idOk(d.id)) err(w, 'Invalid id.');
    scriptCheck(w, 'Effect', d.effect);
    scriptCheck(w, 'Available', d.available);
  }
  for (const m of p.mechanics) {
    const w = `Meter "${m.name}"`;
    if (!m.tag) err(w, 'Needs a country.');
    if (Number(m.min) >= Number(m.max)) err(w, 'Minimum must be below maximum.');
    if (!m.stages.length) warn(w, 'Has no stages, so it gives no bonuses.');
  }
  for (const b of p.bops) {
    const w = `Balance of power "${b.name}"`;
    if (!b.tag) err(w, 'Needs a country.');
    const center = b.ranges.filter((r) => !(Number(r.max) <= 0 && Number(r.min) < 0) && !(Number(r.min) >= 0 && Number(r.max) > 0));
    if (center.length > 1) err(w, 'Only one stage may cross the middle (0). Split it at 0.');
    for (const r of b.ranges) if (Number(r.min) >= Number(r.max)) err(w, `Stage "${r.name}": "From" must be below "To".`);
  }
  for (const t of p.technologies) {
    const w = `Tech "${t.name}"`;
    dupe('tech', t.id, w);
    if (!idOk(t.id)) err(w, 'Invalid id.');
  }
  for (const e of p.equipment) {
    dupe('equip', e.id, `Equipment "${e.name}"`);
    if (!p.technologies.some((t) => t.enableEquip.includes(e.id))) warn(`Equipment "${e.name}"`, 'Not unlocked by any of your techs, so every country can build it from the start.');
  }
  for (const u of p.subunits) {
    dupe('unit', u.id, `Unit "${u.name}"`);
    if (!(u.need || []).length) warn(`Unit "${u.name}"`, 'Needs no equipment.');
  }
  for (const d of p.divisions) {
    const w = `Division "${d.name}"`;
    if (!d.tag) err(w, 'Needs a country.');
    if (!d.grid.flat().some(Boolean)) err(w, 'Has no battalions.');
    const all = allSubunits();
    for (const id of [...d.grid.flat(), ...d.support].filter(Boolean)) if (!all[id]) err(w, `Uses unknown unit "${id}".`);
  }
  return issues;
}
