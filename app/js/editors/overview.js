import { h, clear, field, textIn, idIn, toast } from '../ui.js';
import { project, markDirty, uid } from '../state.js';
import { picturePicker, chipList, tagIn } from '../widgets.js';
import * as D from '../data.js';
import { validate } from '../export.js';

export function render(root, actions) {
  clear(root);
  const m = project.meta;
  const counts = [
    ['Focus trees', project.focusTrees.length, 'focus'], ['People', project.characters.length, 'characters'],
    ['Traits', project.leaderTraits.length + project.unitTraits.length, 'traits'], ['National spirits', project.ideas.length, 'ideas'],
    ['Events', project.events.length, 'events'], ['Decision tabs', project.decisionCategories.length, 'decisions'],
    ['Special mechanics', project.mechanics.length + project.bops.length, 'mechanics'], ['Technologies', project.technologies.length, 'tech'],
    ['Equipment & units', project.equipment.length + project.subunits.length, 'units'], ['Division templates', project.divisions.length, 'divisions'],
  ];
  const countries = h('div', null,
    project.countries.length ? h('div', { class: 'chips' }, project.countries.map((c) => h('span', { class: 'chip', style: { paddingRight: '10px' } }, `${c.tag || '???'} ${c.name || ''}${c.isNew ? ' (new)' : ''}`))) : h('div', { class: 'hint' }, 'None yet.'),
    h('div', { class: 'row', style: { marginTop: '8px' } }, h('button', { class: 'small', onclick: () => actions.go('countries') }, 'Manage countries / create a new one →')));
  const issuesBox = h('div');
  const runCheck = () => {
    clear(issuesBox);
    const issues = validate(project);
    if (!issues.length) { issuesBox.append(h('div', { class: 'ok-box' }, '✔ No problems found.')); return; }
    issuesBox.append(h('ul', { class: 'issues' }, issues.map((i) => h('li', { class: i.level }, h('b', null, i.level === 'error' ? 'Error' : 'Warning'), ` — ${i.where}: ${i.msg}`))));
  };
  root.append(h('div', { class: 'editor overview' },
    h('div', { class: 'editor-head' }, h('h1', null, 'Mod Overview'), h('p', { class: 'intro' }, 'Set up your mod, pick the countries you are working on, then use the sections on the left. When you are ready, press "Export mod" — it writes a ready-to-play mod into your Hearts of Iron IV mod folder.')),
    h('div', { class: 'overview-grid' },
      h('div', { class: 'section' }, h('h3', null, 'Mod settings'),
        field('Mod name', textIn(m, 'name', { onChange: () => actions.title() })),
        h('div', { class: 'grid2' },
          field('Folder name', idIn(m, 'folder'), 'Folder inside Documents/Paradox Interactive/Hearts of Iron IV/mod'),
          field('Script prefix', idIn(m, 'prefix'), 'Short code put in front of generated names, e.g. "mymod".'),
          field('Mod version', textIn(m, 'version')),
          field('Game version', textIn(m, 'supported'), 'The version shown bottom-left in the HOI4 launcher, e.g. 1.19.* (only affects the launcher warning)')),
        field('Launcher tags', chipList(m.tags, ['Gameplay', 'National Focuses', 'Events', 'Technologies', 'Military', 'Alternative History', 'Balance', 'Graphics', 'Historical', 'Ideologies', 'Map', 'Fixes', 'Translation', 'Utilities'])),
        field('Thumbnail', picturePicker(m, 'thumbnail', D.IMAGE_SIZES.modThumb)),
      ),
      h('div', null,
        h('div', { class: 'section' }, h('h3', null, 'Countries in this mod'), h('p', { class: 'hint' }, 'Vanilla countries you are changing and brand-new countries you create.'), countries),
        h('div', { class: 'section' }, h('h3', null, 'What\'s in the mod'),
          h('div', { class: 'count-grid' }, counts.map(([l, n, page]) => h('button', { class: 'count', onclick: () => actions.go(page) }, h('b', null, n), h('span', null, l))))),
        h('div', { class: 'section' }, h('h3', null, 'Export'),
          h('div', { class: 'row' },
            h('button', { class: 'primary big', onclick: () => actions.exportMod() }, '⬇ Export mod'),
            h('button', { onclick: runCheck }, 'Check for problems'),
            h('button', { onclick: () => actions.preview() }, 'Preview files')),
          h('p', { class: 'hint' }, window.desktop ? 'Choose your HOI4 "mod" folder. The mod then appears in the game launcher\'s Playsets.' : 'In the browser version the mod downloads as a .zip — unzip it into Documents/Paradox Interactive/Hearts of Iron IV/mod.'),
          issuesBox),
      )),
  ));
  void toast;
}
