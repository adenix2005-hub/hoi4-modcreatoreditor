// Project data model + autosave.

const AUTOSAVE_KEY = 'hoi4modstudio.autosave';

export const COLLECTIONS = [
  'countries', 'focusTrees', 'characters', 'leaderTraits', 'unitTraits', 'ideas', 'events',
  'decisionCategories', 'mechanics', 'bops', 'techFolders', 'technologies', 'startingTechs',
  'equipment', 'subunits', 'divisions', 'models', 'overrides',
];

export function emptyProject() {
  const p = {
    format: 'hoi4modstudio',
    version: 1,
    meta: {
      name: 'My Mod',
      folder: 'my_mod',
      prefix: 'mymod',
      version: '1.0',
      supported: '1.19.*',
      tags: ['Gameplay', 'National Focuses'],
      thumbnail: '',
    },
  };
  for (const c of COLLECTIONS) p[c] = [];
  return p;
}

export let project = emptyProject();
export let projectPath = null;
let dirtyTimer = null;
const listeners = new Set();

export function onDirty(fn) { listeners.add(fn); }

export function setProject(p, path = null) {
  project = migrate(p);
  projectPath = path;
  markDirty(true);
}

export function setProjectPath(p) { projectPath = p; }

export function migrate(p) {
  const base = emptyProject();
  const out = { ...base, ...p, meta: { ...base.meta, ...(p.meta || {}) } };
  for (const c of COLLECTIONS) if (!Array.isArray(out[c])) out[c] = [];
  return out;
}

export function markDirty(silent) {
  for (const fn of listeners) fn(silent);
  clearTimeout(dirtyTimer);
  dirtyTimer = setTimeout(autosave, 800);
}

function autosave() {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(project));
  } catch (e) {
    /* storage full or unavailable: the user can still save to a file */
  }
}

export function loadAutosave() {
  try {
    const s = localStorage.getItem(AUTOSAVE_KEY);
    if (s) return migrate(JSON.parse(s));
  } catch (e) { /* ignore */ }
  return null;
}

let counter = 0;
export function uid() {
  return Date.now().toString(36) + (++counter).toString(36) + Math.random().toString(36).slice(2, 6);
}

// Helpers for prefixed ids.
export function prefix() {
  return project.meta.prefix || 'mymod';
}

export function uniqueId(base, existing) {
  const set = new Set(existing);
  if (!set.has(base)) return base;
  let i = 2;
  while (set.has(base + '_' + i)) i++;
  return base + '_' + i;
}

export function clone(o) {
  return JSON.parse(JSON.stringify(o));
}

// Lists for pickers
export function countryTags() {
  return project.countries.map((c) => c.tag).filter(Boolean);
}
