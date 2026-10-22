import { h, clear, toast, modal, confirmDlg, pickFile, readAsText } from './ui.js';
import { project, setProject, onDirty, loadAutosave, emptyProject, projectPath, setProjectPath } from './state.js';
import { buildMod, validate } from './export.js';
import { makeZip, download } from './zip.js';
import * as overview from './editors/overview.js';
import * as focus from './editors/focus.js';
import * as characters from './editors/characters.js';
import * as traits from './editors/traits.js';
import * as ideas from './editors/ideas.js';
import * as events from './editors/events.js';
import * as decisions from './editors/decisions.js';
import * as mechanics from './editors/mechanics.js';
import * as tech from './editors/tech.js';
import * as units from './editors/units.js';
import * as divisions from './editors/divisions.js';

const PAGES = [
  ['overview', '🏠', 'Overview', overview],
  ['focus', '🌳', 'Focus Trees', focus],
  ['characters', '👤', 'People', characters],
  ['traits', '⭐', 'Traits', traits],
  ['ideas', '🏳', 'National Spirits', ideas],
  ['events', '📜', 'Events', events],
  ['decisions', '📋', 'Decisions', decisions],
  ['mechanics', '⚖', 'Special Mechanics', mechanics],
  ['tech', '🔬', 'Technology', tech],
  ['units', '🛠', 'Units & Equipment', units],
  ['divisions', '🪖', 'Division Designer', divisions],
];

let page = 'overview';
let dirty = false;
const main = document.getElementById('main');
const nav = document.getElementById('nav');

const actions = {
  go: (p) => { page = p; draw(); },
  title: () => updateTitle(),
  exportMod,
  preview,
};

function draw() {
  clear(nav);
  for (const [id, icon, label] of PAGES) {
    nav.append(h('button', { class: 'nav-item' + (page === id ? ' active' : ''), onclick: () => actions.go(id) }, h('span', { class: 'nav-icon' }, icon), h('span', null, label)));
  }
  const mod = PAGES.find((p) => p[0] === page)[3];
  main.scrollTop = 0;
  mod.render(main, actions);
  updateTitle();
}

function updateTitle() {
  document.getElementById('mod-title').textContent = project.meta.name + (dirty ? ' •' : '');
  document.title = `${project.meta.name} — HOI4 Mod Studio`;
}

onDirty((silent) => { if (!silent) { dirty = true; updateTitle(); } });

async function saveProject(as) {
  const json = JSON.stringify(project, null, 1);
  const name = `${project.meta.folder || 'my_mod'}.hoi4proj.json`;
  if (window.desktop) {
    const p = !as && projectPath ? await window.desktop.saveProjectTo(projectPath, json) : await window.desktop.saveProject(json, name);
    if (!p) return;
    setProjectPath(p);
    toast('Saved to ' + p, 'ok');
  } else {
    download(new Blob([json], { type: 'application/json' }), name);
    toast('Project downloaded', 'ok');
  }
  dirty = false;
  updateTitle();
}

async function openProject() {
  if (dirty && !(await confirmDlg('Unsaved changes will be lost. Open another project?'))) return;
  try {
    let json, path = null;
    if (window.desktop) {
      const r = await window.desktop.openProject();
      if (!r) return;
      json = r.json; path = r.path;
    } else {
      const f = await pickFile('.json');
      if (!f) return;
      json = await readAsText(f);
    }
    const p = JSON.parse(json);
    if (p.format !== 'hoi4modstudio') throw new Error('Not a HOI4 Mod Studio project');
    setProject(p, path);
    dirty = false;
    page = 'overview';
    draw();
    toast('Project opened', 'ok');
  } catch (e) {
    toast('Could not open: ' + e.message, 'error');
  }
}

async function newProject() {
  if (dirty && !(await confirmDlg('Unsaved changes will be lost. Start a new project?'))) return;
  setProject(emptyProject());
  dirty = false;
  page = 'overview';
  draw();
}

async function exportMod() {
  const issues = validate(project);
  const errors = issues.filter((i) => i.level === 'error');
  if (errors.length) {
    const go = await new Promise((res) => modal('Problems found', h('div', null,
      h('p', null, `${errors.length} error(s) may stop parts of the mod from working:`),
      h('ul', { class: 'issues' }, errors.slice(0, 15).map((i) => h('li', { class: 'error' }, `${i.where}: ${i.msg}`)))),
    [{ label: 'Go back and fix', onClick: () => res(false) }, { label: 'Export anyway', danger: true, onClick: () => res(true) }], { sticky: true }));
    if (!go) return;
  }
  try {
    const { folder, files } = await buildMod(project);
    if (window.desktop) {
      const def = await window.desktop.defaultModDir();
      const dir = await window.desktop.pickFolder(def);
      if (!dir) return;
      await window.desktop.writeFiles(dir, files);
      modal('Mod exported!', h('div', null,
        h('p', null, `Wrote ${files.length} files to:`), h('code', null, dir + '/' + folder),
        h('p', null, 'Open the Hearts of Iron IV launcher → Playsets → add your mod, then play.')),
      [{ label: 'Open folder', onClick: () => window.desktop.openFolder(dir + '/' + folder) }, { label: 'Done', primary: true }]);
    } else {
      download(makeZip(files), `${folder}.zip`);
      toast(`Exported ${files.length} files as ${folder}.zip`, 'ok');
    }
  } catch (e) {
    console.error(e);
    toast('Export failed: ' + e.message, 'error');
  }
}

async function preview() {
  const { files } = await buildMod(project);
  const text = files.filter((f) => typeof f.data === 'string');
  const list = h('div', { class: 'file-list' });
  const view = h('pre', { class: 'file-view' });
  text.forEach((f, i) => list.append(h('div', { class: 'file-item', onclick: (e) => { list.querySelectorAll('.sel').forEach((x) => x.classList.remove('sel')); e.currentTarget.classList.add('sel'); view.textContent = f.data; } }, f.path)));
  if (text[0]) view.textContent = text[0].data;
  const bin = files.length - text.length;
  modal('Generated files', h('div', null, h('div', { class: 'file-preview' }, list, view), bin ? h('p', { class: 'hint' }, `+ ${bin} picture/model files`) : null), [{ label: 'Close' }], { wide: true });
}

document.getElementById('btn-new').onclick = newProject;
document.getElementById('btn-open').onclick = openProject;
document.getElementById('btn-save').onclick = () => saveProject(false);
document.getElementById('btn-saveas').onclick = () => saveProject(true);
document.getElementById('btn-export').onclick = exportMod;
document.getElementById('btn-help').onclick = showHelp;

window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveProject(e.shiftKey); }
});
window.addEventListener('beforeunload', (e) => { if (dirty && !window.desktop) { e.preventDefault(); e.returnValue = ''; } });

function showHelp() {
  modal('How to use HOI4 Mod Studio', h('div', { class: 'help' },
    h('ol', null,
      h('li', null, 'On Overview, name your mod and add the countries you are changing.'),
      h('li', null, 'Build content in the sections on the left. Everything saves automatically while you work; use Save to keep a project file.'),
      h('li', null, 'Wherever you see "+ Add effect" or "+ Add condition", pick from the list instead of writing code. You can still type script by hand if you know it.'),
      h('li', null, 'Press Export mod and choose Documents/Paradox Interactive/Hearts of Iron IV/mod.'),
      h('li', null, 'Start the HOI4 launcher, add the mod to a playset and play.')),
    h('h4', null, 'Editing vanilla content'),
    h('ul', null,
      h('li', null, 'Focus Trees → Import: open a file from Hearts of Iron IV/common/national_focus. Then load its names from localisation/english/focus_*_l_english.yml in Tree settings.'),
      h('li', null, 'Traits → Import game file: change vanilla trait numbers (e.g. common/country_leader/00_traits.txt).'),
      h('li', null, 'Exported files that keep the vanilla file name replace that vanilla file.')),
    h('h4', null, 'Testing tips'),
    h('ul', null,
      h('li', null, 'Launch the game with the -debug option to see errors, and check Documents/Paradox Interactive/Hearts of Iron IV/logs/error.log.'),
      h('li', null, 'Console commands: "event mymod.1" fires an event, "focus.autocomplete" finishes focuses fast, "tdebug" shows ids.'))),
  [{ label: 'Got it', primary: true }], { wide: true });
}

// start
const saved = loadAutosave();
if (saved) setProject(saved);
else setProject(emptyProject());
dirty = false;
draw();
