// Headless checks: script parser round-trip, focus import, and that every generated file is well-formed.
import assert from 'node:assert/strict';
import { parse, serialize, checkBraces } from '../app/js/pdx.js';

// Minimal browser stand-ins so the modules load in Node.
globalThis.localStorage = { getItem: () => null, setItem: () => {} };

const state = await import('../app/js/state.js');
const { setProject, emptyProject } = state;
const { buildMod, validate } = await import('../app/js/export.js');
const { importFocusFile, parseLoc } = await import('../app/js/editors/focus.js');

let passed = 0;

// Every UI module must at least parse (editors are not otherwise loaded in Node).
import { readdirSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
for (const dir of ['app/js', 'app/js/editors']) {
  for (const f of readdirSync(new URL(`../${dir}/`, import.meta.url))) {
    if (!f.endsWith('.js')) continue;
    const src = readFileSync(new URL(`../${dir}/${f}`, import.meta.url));
    try { execFileSync(process.execPath, ['--input-type=module', '--check'], { input: src, stdio: 'pipe' }); }
    catch (e) { console.error('FAIL syntax', `${dir}/${f}`, String(e.stderr)); process.exitCode = 1; }
  }
}
const test = async (name, fn) => {
  try { await fn(); passed++; console.log('ok  ', name); } catch (e) { console.error('FAIL', name, '\n', e); process.exitCode = 1; }
};

await test('parser round-trip', () => {
  const src = 'a = { b = 1 c = "x y" d = { e f g } }\nh >= 2 # comment\n';
  const ast = parse(src);
  assert.equal(ast[0].k, 'a');
  assert.equal(ast[1].op, '>=');
  assert.deepEqual(parse(serialize(ast)), ast);
});

await test('focus import resolves relative positions', () => {
  const trees = importFocusFile(`focus_tree = { id = t country = { factor = 0 modifier = { add = 10 tag = GER } }
    focus = { id = a x = 5 y = 0 cost = 10 completion_reward = { add_political_power = 50 } }
    focus = { id = b relative_position_id = a x = -1 y = 1 prerequisite = { focus = a } mutually_exclusive = { focus = c } custom_thing = yes }
    focus = { id = c relative_position_id = b x = 2 y = 0 prerequisite = { focus = a } } }`, 'germany.txt');
  const t = trees[0];
  assert.equal(t.tag, 'GER');
  const b = t.focuses.find((f) => f.id === 'b');
  const c = t.focuses.find((f) => f.id === 'c');
  assert.deepEqual([b.x, b.y, c.x, c.y], [4, 1, 6, 1]);
  assert.deepEqual(b.prereq, [['a']]);
  assert.match(b.extra, /custom_thing = yes/);
  assert.match(t.focuses[0].reward, /add_political_power = 50/);
});

await test('localisation parser', () => {
  const m = parseLoc('l_english:\n KEY:0 "Hello"\n OTHER: "World" # c\n');
  assert.deepEqual(m, { KEY: 'Hello', OTHER: 'World' });
});

await test('full project exports well-formed files', async () => {
  const p = emptyProject();
  p.countries.push({ tag: 'GER', name: 'Germany' });
  p.countries.push({ tag: 'NRD', name: 'Nordic Union', isNew: true, adj: 'Nordic', def: 'the Nordic Union', color: '#336699', culture: 'western_european',
    flag: '', ideoFlags: {}, ideoNames: { communism: "Nordic People's Republic" }, existsAtStart: true, states: ['110', '111'], cores: ['112'], capital: '110',
    ruling: 'democratic', popularity: { democratic: 50, communism: 10, fascism: 10, neutrality: 20 }, elections: true, stability: 0.6, warSupport: 0.2, researchSlots: 3, convoys: 20, basicTechs: true });
  p.focusTrees.push({ treeId: 'ger_tree', tag: 'GER', name: 'T', overhaul: true, focuses: [
    { id: 'GER_a', name: 'A', icon: 'GFX_goal_unknown', x: 0, y: 0, cost: 10, prereq: [], exclusive: ['GER_b'], reward: 'add_political_power = 50', available: '', bypass: '', filters: [], aiFactor: 1 },
    { id: 'GER_b', name: 'B', icon: 'GFX_goal_unknown', x: 2, y: 0, cost: 5, prereq: [], exclusive: ['GER_a'], reward: '', available: 'has_war = no', bypass: '', filters: [], aiFactor: 1 },
    { id: 'GER_c', name: 'C', icon: 'GFX_goal_unknown', x: 1, y: 1, cost: 5, prereq: [['GER_a', 'GER_b']], exclusive: [], reward: 'if = {\n\tlimit = { has_war = yes }\n\tadd_stability = 0.1\n}', available: '', bypass: '', filters: ['FOCUS_FILTER_POLITICAL'], aiFactor: 2 },
  ] });
  p.characters.push({ id: 'GER_bob', name: 'Bob', tag: 'GER', desc: 'A man', portrait: '', portraitPath: 'gfx/leaders/GER/x.dds', recruit: true,
    leader: { on: true, ideology: 'nazism', traits: ['mymod_t'], atStart: true }, advisor: { on: true, slot: 'army_chief', cost: 100, traits: ['army_chief_offensive_1'] },
    general: { on: true, type: 'field_marshal', skill: 4, attack: 3, defense: 2, planning: 3, logistics: 1, traits: [] }, admiral: { on: false, traits: [] } });
  p.leaderTraits.push({ id: 'mymod_t', name: 'T', mods: [{ key: 'stability_factor', value: 0.1 }], extra: '' });
  p.unitTraits.push({ id: 'mymod_u', name: 'U', type: 'land', traitType: 'personality_trait', attack: 1, mods: [{ key: 'army_attack_factor', value: 0.05 }], extra: '' });
  p.ideas.push({ id: 'mymod_i', name: 'I', picture: 'generic_morale_bonus', mods: [{ key: 'political_power_gain', value: 0.5 }], allowed: '', category: 'country' });
  p.events.push({ id: 'mymod.1', kind: 'country', title: 'E "quoted"', desc: 'line1\nline2', mode: 'dated', date: '1938.3.1', tag: 'GER', trigger: '', options: [{ name: 'Ok', effects: 'add_stability = 0.05', ai: 1, trigger: '' }] });
  p.events.push({ id: 'mymod.2', kind: 'news', title: 'N', desc: '', mode: 'scripted', options: [] });
  p.decisionCategories.push({ id: 'mymod_cat', name: 'Cat', tag: 'GER', priority: 100, decisions: [
    { id: 'mymod_d', name: 'D', cost: 25, daysRemove: 30, effect: 'add_ideas = mymod_i', removeEffect: 'remove_ideas = mymod_i', ai: 1 },
    { id: 'mymod_m', name: 'M', cost: 0, mission: true, missionDays: 60, activation: 'has_war = yes', available: 'has_war = no', effect: '', timeoutEffect: 'add_stability = -0.1', ai: 1 },
  ] });
  p.mechanics.push({ id: 'GER_par', name: 'Paranoia', tag: 'GER', min: 0, max: 100, start: 20, monthly: 1, stages: [{ name: 'Low', min: 0, max: 50, mods: [] }, { name: 'High', min: 50, max: 101, mods: [{ key: 'stability_factor', value: -0.1 }] }], atMax: 'add_stability = -0.2', atMin: '', decisions: [] });
  p.bops.push({ id: 'GER_bop', name: 'BoP', tag: 'GER', initial: 0, left: { name: 'L' }, right: { name: 'R' }, ranges: [
    { name: 'mid', min: -0.1, max: 0.1, mods: [] }, { name: 'left', min: -1, max: -0.1, mods: [{ key: 'stability_factor', value: 0.1 }] }, { name: 'right', min: 0.1, max: 1, mods: [] }], decisions: [] });
  p.equipment.push({ id: 'mymod_rifle', name: 'Rifle', type: 'infantry', year: 1936, soft_attack: 4, defense: 20, build_cost_ic: 0.5, resources: { steel: 1 } });
  p.subunits.push({ id: 'mymod_hq', name: 'HQ', support: true, group: 'support', sprite: 'signal_company', mapIcon: 'infantry', width: 0, manpower: 200, training: 90, org: 40, hp: 1, suppression: 0, weight: 0.1, supply: 0.04, need: [{ eq: 'mymod_rifle', n: 10 }], soft_mult: 1.2 });
  p.technologies.push({ id: 'mymod_tech', name: 'Tech', folder: 'infantry_folder', x: 0, y: 0, year: 1936, cost: 1.5, categories: ['infantry_weapons'], leadsTo: [], xor: [], enableEquip: ['mymod_rifle'], enableUnits: ['mymod_hq'], mods: [], allowTags: ['GER', 'ITA'], ai: 1 });
  p.startingTechs.push({ tag: 'ALL', techs: ['infantry_weapons1'] });
  const grid = Array.from({ length: 5 }, () => Array(5).fill(''));
  grid[0][0] = 'infantry'; grid[0][1] = 'infantry'; grid[1][0] = 'artillery_brigade';
  p.divisions.push({ name: 'Inf', tag: 'GER', grid, support: ['mymod_hq', '', '', '', ''], units: [{ count: 2, location: 6521 }], experience: 0.2, stockpile: true });
  setProject(p);

  const issues = validate(state.project).filter((i) => i.level === 'error');
  assert.deepEqual(issues, []);
  const { files } = await buildMod(state.project);
  const text = files.filter((f) => typeof f.data === 'string');
  assert.ok(text.length > 15, 'expected many files, got ' + text.length);
  for (const f of text) {
    if (f.path.endsWith('.yml') || f.path.endsWith('.mod')) continue;
    assert.equal(checkBraces(f.data), null, `unbalanced braces in ${f.path}`);
    assert.doesNotMatch(f.data, /undefined|NaN|\[object/, `bad value in ${f.path}`);
    parse(f.data);
  }
  const get = (end) => text.find((f) => f.path.endsWith(end)).data;
  assert.match(get('mymod_on_actions.txt'), /set_technology = \{ mymod_tech = 1 popup = no \}/);
  assert.match(get('mymod_on_actions.txt'), /load_oob = "GER_mymod"/);
  assert.match(get('mymod_technologies.txt'), /enable_equipments = \{ mymod_rifle_1 \}/);
  assert.match(get('mymod_units.txt'), /soft_attack = 0\.2/);
  assert.match(get('mymod_l_english.yml'), /^﻿l_english:/);
  assert.match(get('mymod_l_english.yml'), /mymod\.1\.t:0 "E \\"quoted\\""/);
  assert.match(get('mymod_events.txt'), /date > 1938\.2\.28/);
  assert.match(get('mymod_bop.txt'), /side = \{\s+id = GER_bop_left/);
  assert.match(get('mymod_countries.txt'), /NRD = "countries\/Nordic Union.txt"/);
  assert.match(get('countries/Nordic Union.txt'), /color = \{ 51 102 153 \}/);
  const hist = get('NRD - Nordic Union.txt');
  assert.match(hist, /capital = 110/);
  assert.match(hist, /democratic = 56/); // 50/90 scaled to 100%
  assert.match(get('mymod_on_actions.txt'), /110 = \{ transfer_state_to = NRD add_core_of = NRD \}/);
  assert.match(get('mymod_on_actions.txt'), /112 = \{ add_core_of = NRD \}/);
  assert.match(get('mymod_l_english.yml'), /NRD_communism:0 "Nordic People's Republic"/);
});

console.log(`\n${passed} passed`);
