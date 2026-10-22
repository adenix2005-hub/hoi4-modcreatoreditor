// Lists of ids that exist in the project (used for pickers and validation).
import { project } from './state.js';
import * as D from './data.js';

export const allFocusIds = () => project.focusTrees.flatMap((t) => t.focuses.map((f) => f.id));
export const allIdeaIds = () => project.ideas.map((i) => i.id);
export const allEventIds = () => project.events.map((e) => e.id);
export const allTechIds = () => [...project.technologies.map((t) => t.id), ...D.VANILLA_TECHS];
export const allEquipmentIds = () => [...project.equipment.map((e) => e.id), ...D.VANILLA_EQUIPMENT];
export const allCharacterIds = () => project.characters.map((c) => c.id);
export const allMechVars = () => project.mechanics.map((m) => m.id);
export const allBopIds = () => project.bops.map((b) => b.id);
export const allTreeIds = () => project.focusTrees.map((t) => t.treeId);
export const allDecisionIds = () => [
  ...project.decisionCategories.flatMap((c) => c.decisions.map((d) => d.id)),
  ...project.mechanics.flatMap((m) => m.decisions.map((d) => d.id)),
  ...project.bops.flatMap((b) => b.decisions.map((d) => d.id)),
];
export const allLeaderTraitIds = () => [...project.leaderTraits.map((t) => t.id), ...D.VANILLA_LEADER_TRAITS, ...D.VANILLA_ADVISOR_TRAITS];
export const allUnitTraitIds = () => [...project.unitTraits.map((t) => t.id), ...D.VANILLA_UNIT_TRAITS];

export function allSubunits() {
  const out = {};
  for (const [id, s] of Object.entries(D.VANILLA_SUBUNITS)) out[id] = { ...s, id, vanilla: true };
  for (const s of project.subunits) {
    out[s.id] = {
      id: s.id, name: s.name || s.id, custom: true, support: !!s.support, group: s.support ? 'support' : s.group,
      width: Number(s.width) || 0, manpower: Number(s.manpower) || 0, org: Number(s.org) || 0, hp: Number(s.hp) || 0,
      need: Object.fromEntries((s.need || []).filter((n) => n.eq).map((n) => [n.eq, Number(n.n) || 0])),
      img: s.img, ...customSubunitCombat(s),
    };
  }
  return out;
}

// Combat stats of a custom battalion come from the equipment it uses.
function customSubunitCombat(s) {
  const st = { soft: 0, hard: 0, def: 0, bt: 0 };
  for (const n of s.need || []) {
    const eq = project.equipment.find((e) => e.id === n.eq);
    if (eq) {
      st.soft += Number(eq.soft_attack) || 0;
      st.hard += Number(eq.hard_attack) || 0;
      st.def += Number(eq.defense) || 0;
      st.bt += Number(eq.breakthrough) || 0;
    } else {
      const v = Object.values(D.VANILLA_SUBUNITS).find((u) => u.need[n.eq] !== undefined && Object.keys(u.need).length === 1);
      if (v) { st.soft += v.soft; st.hard += v.hard; st.def += v.def; st.bt += v.bt; }
    }
  }
  const mult = (k) => (s[k] !== undefined && s[k] !== '' ? Number(s[k]) : 1);
  return { soft: st.soft * mult('soft_mult'), hard: st.hard * mult('hard_mult'), def: st.def * mult('def_mult'), bt: st.bt * mult('bt_mult') };
}
