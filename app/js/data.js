// Reference data about vanilla Hearts of Iron IV used by dropdowns, pickers and helpers.

export const COUNTRIES = [
  ['GER', 'Germany'], ['ENG', 'United Kingdom'], ['FRA', 'France'], ['ITA', 'Italy'], ['SOV', 'Soviet Union'],
  ['USA', 'United States'], ['JAP', 'Japan'], ['CHI', 'China'], ['PRC', 'Communist China'], ['MAN', 'Manchukuo'],
  ['POL', 'Poland'], ['CZE', 'Czechoslovakia'], ['AUS', 'Austria'], ['HUN', 'Hungary'], ['ROM', 'Romania'],
  ['YUG', 'Yugoslavia'], ['GRE', 'Greece'], ['BUL', 'Bulgaria'], ['TUR', 'Turkey'], ['SPR', 'Spain'],
  ['POR', 'Portugal'], ['BEL', 'Belgium'], ['HOL', 'Netherlands'], ['LUX', 'Luxembourg'], ['SWI', 'Switzerland'],
  ['SWE', 'Sweden'], ['NOR', 'Norway'], ['DEN', 'Denmark'], ['FIN', 'Finland'], ['EST', 'Estonia'],
  ['LAT', 'Latvia'], ['LIT', 'Lithuania'], ['IRE', 'Ireland'], ['ALB', 'Albania'], ['CAN', 'Canada'],
  ['AST', 'Australia'], ['NZL', 'New Zealand'], ['SAF', 'South Africa'], ['RAJ', 'British Raj'], ['MEX', 'Mexico'],
  ['BRA', 'Brazil'], ['ARG', 'Argentina'], ['CHL', 'Chile'], ['PER', 'Persia'], ['IRQ', 'Iraq'],
  ['SAU', 'Saudi Arabia'], ['ETH', 'Ethiopia'], ['SIA', 'Siam'], ['MON', 'Mongolia'], ['TAN', 'Tannu Tuva'],
  ['SIK', 'Sinkiang'], ['GXC', 'Guangxi Clique'], ['YUN', 'Yunnan'], ['SHX', 'Shanxi'], ['XSM', 'Xibei San Ma'],
  ['PHI', 'Philippines'], ['EGY', 'Egypt'], ['AFG', 'Afghanistan'], ['NEP', 'Nepal'], ['VEN', 'Venezuela'],
  ['COL', 'Colombia'], ['ECU', 'Ecuador'], ['BOL', 'Bolivia'], ['PRU', 'Peru'], ['PAR', 'Paraguay'], ['URG', 'Uruguay'],
  ['CUB', 'Cuba'], ['GUA', 'Guatemala'], ['HON', 'Honduras'], ['ELS', 'El Salvador'], ['NIC', 'Nicaragua'],
  ['COS', 'Costa Rica'], ['PAN', 'Panama'], ['HAI', 'Haiti'], ['DOM', 'Dominican Republic'], ['LIB', 'Liberia'],
  ['YEM', 'Yemen'], ['OMA', 'Oman'], ['TIB', 'Tibet'], ['BHU', 'Bhutan'],
];

export const IDEOLOGIES = {
  democratic: ['conservatism', 'liberalism', 'socialism'],
  communism: ['marxism', 'leninism', 'stalinism', 'anti_revisionism', 'anarchist_communism'],
  fascism: ['nazism', 'fascism_ideology', 'falangism', 'rexism'],
  neutrality: ['despotism', 'oligarchism', 'anarchism', 'moderatism', 'centrism'],
};
export const MAIN_IDEOLOGIES = Object.keys(IDEOLOGIES);
export const SUB_IDEOLOGIES = Object.values(IDEOLOGIES).flat();

export const ADVISOR_SLOTS = [
  ['political_advisor', 'Political advisor'],
  ['theorist', 'Theorist'],
  ['army_chief', 'Chief of Army'],
  ['navy_chief', 'Chief of Navy'],
  ['air_chief', 'Chief of Air Force'],
  ['high_command', 'High Command'],
];

export const VANILLA_ADVISOR_TRAITS = [
  'silent_workhorse', 'compassionate_gentleman', 'democratic_reformer', 'fascist_demagogue', 'communist_revolutionary',
  'popular_figurehead', 'captain_of_industry', 'war_industrialist', 'financial_expert', 'quartermaster_general',
  'prince_of_terror', 'ideological_crusader', 'smooth_talking_charmer', 'backroom_backstabber', 'social_democrat',
  'military_theorist', 'naval_theorist', 'air_warfare_theorist', 'mass_combat', 'superior_firepower', 'grand_battleplan',
  'army_chief_offensive_1', 'army_chief_offensive_2', 'army_chief_offensive_3', 'army_chief_defensive_1',
  'army_chief_defensive_2', 'army_chief_drill_1', 'army_chief_drill_2', 'army_chief_organizational_1',
  'army_chief_morale_1', 'army_chief_reform_1', 'army_chief_planning_1', 'army_chief_maneuver_1',
  'navy_chief_naval_aviation_1', 'navy_chief_decisive_battle_1', 'navy_chief_commerce_raiding_1', 'navy_chief_reform_1',
  'air_chief_safety_1', 'air_chief_ground_support_1', 'air_chief_all_weather_1', 'air_chief_reform_1',
  'army_infantry_1', 'army_infantry_2', 'army_artillery_1', 'army_armored_1', 'army_cavalry_1', 'army_entrenchment_1',
  'army_logistics_1', 'army_regrouping_1', 'army_commando_1', 'army_concealment_1', 'navy_capital_ship_1',
  'navy_screen_1', 'navy_submarine_1', 'navy_carrier_1', 'air_bomber_interception_1', 'air_close_air_support_1',
  'air_strategic_bombing_1', 'air_tactical_bombing_1', 'air_naval_strike_1', 'air_air_superiority_1',
];

export const VANILLA_LEADER_TRAITS = [
  'dictator', 'war_industrialist', 'staunch_democrat', 'champion_of_peace', 'warmonger', 'ambitious', 'collaborator_king',
  'inexperienced_monarch', 'the_young_prince', 'popular_figurehead', 'pacifist', 'insubordinate', 'imperial_ambitions',
];

export const VANILLA_UNIT_TRAITS = [
  'offensive_doctrine', 'defensive_doctrine', 'panzer_leader', 'infantry_leader', 'organizer', 'trickster', 'skirmisher',
  'fortress_buster', 'commando', 'desert_fox', 'winter_specialist', 'engineer_officer', 'cavalry_officer', 'old_guard',
  'brilliant_strategist', 'inflexible_strategist', 'logistics_wizard', 'aggressive_assaulter', 'fast_planner',
  'politically_connected', 'war_hero', 'career_officer', 'harsh_leader', 'media_personality', 'infantry_officer',
  'armor_officer', 'artillery_officer', 'unyielding_defender', 'adaptable', 'hill_fighter', 'jungle_rat',
  'swamp_fox', 'urban_assault_specialist', 'ranger', 'trait_mountaineer', 'naval_invader', 'bearer_of_artillery',
  'seawolf', 'superior_tactician', 'spotter', 'blockade_runner', 'gentlemanly', 'air_controller', 'naval_lineage',
];

export const UNIT_TRAIT_TYPES = [
  ['personality_trait', 'Personality (shown at the top)'],
  ['assignable_trait', 'Assignable (earned / picked)'],
  ['basic_trait', 'Basic'],
  ['status_trait', 'Status'],
];
export const UNIT_TRAIT_FOR = [
  ['land', 'All army leaders'], ['corps_commander', 'Generals only'], ['field_marshal', 'Field marshals only'],
  ['navy', 'Admirals'], ['all', 'Everyone'],
];

// type: pct = percentage factor (0.1 = +10%), flat = flat number
export const MODIFIERS = [
  ['political_power_gain', 'Daily political power', 'flat', 'Politics'],
  ['political_power_factor', 'Political power gain', 'pct', 'Politics'],
  ['stability_factor', 'Stability', 'pct', 'Politics'],
  ['stability_weekly', 'Weekly stability', 'pct', 'Politics'],
  ['war_support_factor', 'War support', 'pct', 'Politics'],
  ['war_support_weekly', 'Weekly war support', 'pct', 'Politics'],
  ['command_power_gain', 'Daily command power', 'flat', 'Politics'],
  ['max_command_power', 'Max command power', 'flat', 'Politics'],
  ['drift_defence_factor', 'Ideology drift defence', 'pct', 'Politics'],
  ['democratic_drift', 'Democratic daily support', 'flat', 'Politics'],
  ['communism_drift', 'Communist daily support', 'flat', 'Politics'],
  ['fascism_drift', 'Fascist daily support', 'flat', 'Politics'],
  ['neutrality_drift', 'Non-aligned daily support', 'flat', 'Politics'],
  ['justify_war_goal_time', 'Justify wargoal time', 'pct', 'Politics'],
  ['trade_opinion_factor', 'Trade opinion', 'pct', 'Politics'],
  ['opinion_gain_monthly_factor', 'Monthly opinion gain', 'pct', 'Politics'],
  ['encryption_factor', 'Encryption', 'pct', 'Politics'],
  ['decryption_factor', 'Decryption', 'pct', 'Politics'],
  ['power_balance_daily', 'Balance of power daily change', 'flat', 'Politics'],
  ['power_balance_weekly', 'Balance of power weekly change', 'flat', 'Politics'],
  ['research_speed_factor', 'Research speed', 'pct', 'Economy'],
  ['production_speed_buildings_factor', 'Construction speed', 'pct', 'Economy'],
  ['production_speed_industrial_complex_factor', 'Civilian factory construction speed', 'pct', 'Economy'],
  ['production_speed_arms_factory_factor', 'Military factory construction speed', 'pct', 'Economy'],
  ['production_speed_infrastructure_factor', 'Infrastructure construction speed', 'pct', 'Economy'],
  ['industrial_capacity_factory', 'Factory output', 'pct', 'Economy'],
  ['industrial_capacity_dockyard', 'Dockyard output', 'pct', 'Economy'],
  ['consumer_goods_factor', 'Consumer goods', 'pct', 'Economy'],
  ['production_factory_max_efficiency_factor', 'Max factory efficiency', 'pct', 'Economy'],
  ['production_factory_efficiency_gain_factor', 'Factory efficiency growth', 'pct', 'Economy'],
  ['production_factory_start_efficiency_factor', 'Starting factory efficiency', 'pct', 'Economy'],
  ['local_resources_factor', 'Resource gain efficiency', 'pct', 'Economy'],
  ['monthly_population', 'Monthly population growth', 'pct', 'Economy'],
  ['conscription', 'Recruitable population (flat)', 'pct', 'Economy'],
  ['conscription_factor', 'Recruitable population factor', 'pct', 'Economy'],
  ['civilian_intel_factor', 'Civilian intel', 'pct', 'Economy'],
  ['army_attack_factor', 'Division attack', 'pct', 'Army'],
  ['army_defence_factor', 'Division defence', 'pct', 'Army'],
  ['army_org_factor', 'Division organisation', 'pct', 'Army'],
  ['army_morale_factor', 'Division recovery rate', 'pct', 'Army'],
  ['army_speed_factor', 'Division speed', 'pct', 'Army'],
  ['breakthrough_factor', 'Breakthrough', 'pct', 'Army'],
  ['army_infantry_attack_factor', 'Infantry attack', 'pct', 'Army'],
  ['army_infantry_defence_factor', 'Infantry defence', 'pct', 'Army'],
  ['army_armor_attack_factor', 'Armor attack', 'pct', 'Army'],
  ['army_armor_defence_factor', 'Armor defence', 'pct', 'Army'],
  ['army_artillery_attack_factor', 'Artillery attack', 'pct', 'Army'],
  ['land_reinforce_rate', 'Reinforce rate', 'pct', 'Army'],
  ['experience_gain_army', 'Daily army experience', 'flat', 'Army'],
  ['experience_gain_army_factor', 'Army experience gain', 'pct', 'Army'],
  ['max_planning', 'Max planning', 'pct', 'Army'],
  ['planning_speed', 'Planning speed', 'pct', 'Army'],
  ['supply_consumption_factor', 'Supply consumption', 'pct', 'Army'],
  ['attrition', 'Attrition', 'pct', 'Army'],
  ['recon_factor', 'Recon', 'pct', 'Army'],
  ['special_forces_cap', 'Special forces cap', 'pct', 'Army'],
  ['training_time_army_factor', 'Division training time', 'pct', 'Army'],
  ['minimum_training_level', 'Minimum training level', 'pct', 'Army'],
  ['naval_damage_factor', 'Naval damage', 'pct', 'Navy'],
  ['naval_defense_factor', 'Naval defence', 'pct', 'Navy'],
  ['naval_speed_factor', 'Naval speed', 'pct', 'Navy'],
  ['experience_gain_navy', 'Daily navy experience', 'flat', 'Navy'],
  ['air_attack_factor', 'Air attack', 'pct', 'Air'],
  ['air_defence_factor', 'Air defence', 'pct', 'Air'],
  ['air_agility_factor', 'Air agility', 'pct', 'Air'],
  ['air_superiority_efficiency', 'Air superiority efficiency', 'pct', 'Air'],
  ['experience_gain_air', 'Daily air experience', 'flat', 'Air'],
  ['air_ace_generation_chance_factor', 'Ace generation chance', 'pct', 'Air'],
];
export const MODIFIER_KEYS = MODIFIERS.map((m) => m[0]);
export function modifierInfo(key) {
  return MODIFIERS.find((m) => m[0] === key);
}

// Params: n = name, l = label, t = type (num|text|tag|idea|event|focus|tech|equip|ideology|sub|bool|bop|mech|decision|character|state)
export const EFFECTS = [
  { id: 'pp', label: 'Add political power', cat: 'Politics', params: [{ n: 'a', l: 'Amount', t: 'num', d: 50 }], tpl: (p) => `add_political_power = ${p.a}` },
  { id: 'stab', label: 'Add stability', cat: 'Politics', params: [{ n: 'a', l: 'Amount (0.05 = 5%)', t: 'num', d: 0.05 }], tpl: (p) => `add_stability = ${p.a}` },
  { id: 'ws', label: 'Add war support', cat: 'Politics', params: [{ n: 'a', l: 'Amount (0.05 = 5%)', t: 'num', d: 0.05 }], tpl: (p) => `add_war_support = ${p.a}` },
  { id: 'cp', label: 'Add command power', cat: 'Politics', params: [{ n: 'a', l: 'Amount', t: 'num', d: 25 }], tpl: (p) => `add_command_power = ${p.a}` },
  { id: 'idea', label: 'Add national spirit', cat: 'Politics', params: [{ n: 'i', l: 'Spirit', t: 'idea' }], tpl: (p) => `add_ideas = ${p.i}` },
  { id: 'tidea', label: 'Add timed national spirit', cat: 'Politics', params: [{ n: 'i', l: 'Spirit', t: 'idea' }, { n: 'd', l: 'Days', t: 'num', d: 180 }], tpl: (p) => `add_timed_idea = { idea = ${p.i} days = ${p.d} }` },
  { id: 'ridea', label: 'Remove national spirit', cat: 'Politics', params: [{ n: 'i', l: 'Spirit', t: 'idea' }], tpl: (p) => `remove_ideas = ${p.i}` },
  { id: 'swap', label: 'Swap national spirit', cat: 'Politics', params: [{ n: 'r', l: 'Remove', t: 'idea' }, { n: 'a', l: 'Add', t: 'idea' }], tpl: (p) => `swap_ideas = { remove_idea = ${p.r} add_idea = ${p.a} }` },
  { id: 'politics', label: 'Change ruling party', cat: 'Politics', params: [{ n: 'i', l: 'Ideology', t: 'ideology', d: 'fascism' }, { n: 'e', l: 'Elections allowed', t: 'bool', d: 'no' }], tpl: (p) => `set_politics = { ruling_party = ${p.i} elections_allowed = ${p.e} }` },
  { id: 'pop', label: 'Add party popularity', cat: 'Politics', params: [{ n: 'i', l: 'Ideology', t: 'ideology', d: 'fascism' }, { n: 'a', l: 'Amount (0.1 = 10%)', t: 'num', d: 0.1 }], tpl: (p) => `add_popularity = { ideology = ${p.i} popularity = ${p.a} }` },
  { id: 'recruit', label: 'Recruit character (advisor/general)', cat: 'Politics', params: [{ n: 'c', l: 'Character', t: 'character' }], tpl: (p) => `recruit_character = ${p.c}` },
  { id: 'promote', label: 'Make character country leader', cat: 'Politics', params: [{ n: 'c', l: 'Character', t: 'character' }], tpl: (p) => `promote_character = ${p.c}` },
  { id: 'flag', label: 'Set country flag', cat: 'Flags & variables', params: [{ n: 'f', l: 'Flag name', t: 'text', d: 'my_flag' }], tpl: (p) => `set_country_flag = ${p.f}` },
  { id: 'clrflag', label: 'Clear country flag', cat: 'Flags & variables', params: [{ n: 'f', l: 'Flag name', t: 'text', d: 'my_flag' }], tpl: (p) => `clr_country_flag = ${p.f}` },
  { id: 'mech', label: 'Change custom mechanic value', cat: 'Flags & variables', params: [{ n: 'm', l: 'Mechanic', t: 'mech' }, { n: 'a', l: 'Amount (+/-)', t: 'num', d: 5 }], tpl: (p) => `add_to_variable = { ${p.m} = ${p.a} }\n${p.m}_update = yes` },
  { id: 'bop', label: 'Shift balance of power', cat: 'Flags & variables', params: [{ n: 'b', l: 'Balance of power', t: 'bop' }, { n: 'a', l: 'Amount (-1 to 1, + = right side)', t: 'num', d: 0.05 }], tpl: (p) => `add_power_balance_value = { id = ${p.b} value = ${p.a} }` },
  { id: 'var', label: 'Add to variable', cat: 'Flags & variables', params: [{ n: 'v', l: 'Variable', t: 'text', d: 'my_var' }, { n: 'a', l: 'Amount', t: 'num', d: 1 }], tpl: (p) => `add_to_variable = { ${p.v} = ${p.a} }` },
  { id: 'cevent', label: 'Fire country event', cat: 'Events', params: [{ n: 'e', l: 'Event', t: 'event' }, { n: 'd', l: 'Delay (days, 0 = now)', t: 'num', d: 0 }], tpl: (p) => (Number(p.d) > 0 ? `country_event = { id = ${p.e} days = ${p.d} }` : `country_event = ${p.e}`) },
  { id: 'nevent', label: 'Fire news event (everyone)', cat: 'Events', params: [{ n: 'e', l: 'Event', t: 'event' }], tpl: (p) => `every_country = { news_event = ${p.e} }` },
  { id: 'otherevent', label: 'Send event to another country', cat: 'Events', params: [{ n: 't', l: 'Country', t: 'tag' }, { n: 'e', l: 'Event', t: 'event' }], tpl: (p) => `${p.t} = { country_event = ${p.e} }` },
  { id: 'techbonus', label: 'Research bonus', cat: 'Research', params: [{ n: 'c', l: 'Tech category', t: 'techcat', d: 'industry' }, { n: 'b', l: 'Bonus (0.5 = 50%)', t: 'num', d: 0.5 }, { n: 'u', l: 'Uses', t: 'num', d: 1 }], tpl: (p) => `add_tech_bonus = { name = bonus_${p.c} bonus = ${p.b} uses = ${p.u} category = ${p.c} }` },
  { id: 'settech', label: 'Give technology', cat: 'Research', params: [{ n: 't', l: 'Technology', t: 'tech' }], tpl: (p) => `set_technology = { ${p.t} = 1 }` },
  { id: 'slot', label: 'Add research slot', cat: 'Research', params: [{ n: 'a', l: 'Slots', t: 'num', d: 1 }], tpl: (p) => `add_research_slot = ${p.a}` },
  { id: 'civ', label: 'Build civilian factory', cat: 'Economy', params: [{ n: 'a', l: 'Factories', t: 'num', d: 2 }], tpl: (p) => `random_owned_controlled_state = {\n\tprioritize = { 0 }\n\tadd_extra_state_shared_building_slots = ${p.a}\n\tadd_building_construction = { type = industrial_complex level = ${p.a} instant_build = yes }\n}` },
  { id: 'mil', label: 'Build military factory', cat: 'Economy', params: [{ n: 'a', l: 'Factories', t: 'num', d: 2 }], tpl: (p) => `random_owned_controlled_state = {\n\tadd_extra_state_shared_building_slots = ${p.a}\n\tadd_building_construction = { type = arms_factory level = ${p.a} instant_build = yes }\n}` },
  { id: 'dock', label: 'Build dockyard', cat: 'Economy', params: [{ n: 'a', l: 'Dockyards', t: 'num', d: 1 }], tpl: (p) => `random_owned_controlled_state = {\n\tlimit = { is_coastal = yes }\n\tadd_extra_state_shared_building_slots = ${p.a}\n\tadd_building_construction = { type = dockyard level = ${p.a} instant_build = yes }\n}` },
  { id: 'manpower', label: 'Add manpower', cat: 'Military', params: [{ n: 'a', l: 'Manpower', t: 'num', d: 10000 }], tpl: (p) => `add_manpower = ${p.a}` },
  { id: 'equip', label: 'Add equipment to stockpile', cat: 'Military', params: [{ n: 'e', l: 'Equipment', t: 'equip', d: 'infantry_equipment' }, { n: 'a', l: 'Amount', t: 'num', d: 1000 }], tpl: (p) => `add_equipment_to_stockpile = { type = ${p.e} amount = ${p.a} }` },
  { id: 'xp', label: 'Add army experience', cat: 'Military', params: [{ n: 'a', l: 'Amount', t: 'num', d: 25 }], tpl: (p) => `army_experience = ${p.a}` },
  { id: 'navxp', label: 'Add navy experience', cat: 'Military', params: [{ n: 'a', l: 'Amount', t: 'num', d: 25 }], tpl: (p) => `navy_experience = ${p.a}` },
  { id: 'airxp', label: 'Add air experience', cat: 'Military', params: [{ n: 'a', l: 'Amount', t: 'num', d: 25 }], tpl: (p) => `air_experience = ${p.a}` },
  { id: 'oob', label: 'Spawn division template/units (load OOB)', cat: 'Military', params: [{ n: 'o', l: 'OOB file name', t: 'text', d: 'GER_extra' }], tpl: (p) => `load_oob = "${p.o}"` },
  { id: 'wargoal', label: 'Create wargoal', cat: 'Diplomacy', params: [{ n: 't', l: 'Target', t: 'tag' }, { n: 'w', l: 'Type', t: 'text', d: 'topple_government' }], tpl: (p) => `create_wargoal = { target = ${p.t} type = ${p.w} }` },
  { id: 'war', label: 'Declare war', cat: 'Diplomacy', params: [{ n: 't', l: 'Target', t: 'tag' }, { n: 'w', l: 'Type', t: 'text', d: 'annex_everything' }], tpl: (p) => `declare_war_on = { target = ${p.t} type = ${p.w} }` },
  { id: 'annex', label: 'Annex country', cat: 'Diplomacy', params: [{ n: 't', l: 'Target', t: 'tag' }], tpl: (p) => `annex_country = { target = ${p.t} transfer_troops = yes }` },
  { id: 'puppet', label: 'Puppet country', cat: 'Diplomacy', params: [{ n: 't', l: 'Target', t: 'tag' }], tpl: (p) => `puppet = ${p.t}` },
  { id: 'faction', label: 'Create faction', cat: 'Diplomacy', params: [{ n: 'n', l: 'Faction name (loc key)', t: 'text', d: 'my_faction' }], tpl: (p) => `create_faction = ${p.n}` },
  { id: 'addfaction', label: 'Add country to faction', cat: 'Diplomacy', params: [{ n: 't', l: 'Country', t: 'tag' }], tpl: (p) => `add_to_faction = ${p.t}` },
  { id: 'guarantee', label: 'Guarantee independence', cat: 'Diplomacy', params: [{ n: 't', l: 'Country', t: 'tag' }], tpl: (p) => `give_guarantee = ${p.t}` },
  { id: 'opinion', label: 'Improve relations', cat: 'Diplomacy', params: [{ n: 't', l: 'Country', t: 'tag' }], tpl: (p) => `add_opinion_modifier = { target = ${p.t} modifier = medium_increase }` },
  { id: 'threat', label: 'Add world tension', cat: 'Diplomacy', params: [{ n: 'a', l: 'Amount', t: 'num', d: 5 }], tpl: (p) => `add_named_threat = { threat = ${p.a} name = WORLD_TENSION_EVENT }` },
  { id: 'release', label: 'Release country (needs cores)', cat: 'Diplomacy', params: [{ n: 't', l: 'Country', t: 'tag' }], tpl: (p) => `release = ${p.t}` },
  { id: 'releasepuppet', label: 'Release country as our puppet', cat: 'Diplomacy', params: [{ n: 't', l: 'Country', t: 'tag' }], tpl: (p) => `release_puppet = ${p.t}` },
  { id: 'state', label: 'Transfer state to us', cat: 'Diplomacy', params: [{ n: 's', l: 'State ID', t: 'num', d: 1 }], tpl: (p) => `transfer_state = ${p.s}` },
  { id: 'core', label: 'Add core on state', cat: 'Diplomacy', params: [{ n: 's', l: 'State ID', t: 'num', d: 1 }], tpl: (p) => `add_state_core = ${p.s}` },
  { id: 'claim', label: 'Add claim on state', cat: 'Diplomacy', params: [{ n: 's', l: 'State ID', t: 'num', d: 1 }], tpl: (p) => `add_state_claim = ${p.s}` },
  { id: 'tree', label: 'Switch focus tree', cat: 'Other', params: [{ n: 't', l: 'Focus tree', t: 'tree' }], tpl: (p) => `load_focus_tree = { tree = ${p.t} keep_completed = yes }` },
  { id: 'unlockdec', label: 'Activate mission/decision', cat: 'Other', params: [{ n: 'd', l: 'Decision', t: 'decision' }], tpl: (p) => `activate_mission = ${p.d}` },
  { id: 'tooltip', label: 'Custom tooltip text', cat: 'Other', params: [{ n: 't', l: 'Text', t: 'text', d: 'Something happens!' }], tpl: (p) => `custom_effect_tooltip = "${p.t}"` },
];

export const TRIGGERS = [
  { id: 'tag', label: 'Is country', params: [{ n: 't', l: 'Country', t: 'tag' }], tpl: (p) => `tag = ${p.t}` },
  { id: 'otag', label: 'Is original country (also after civil war)', params: [{ n: 't', l: 'Country', t: 'tag' }], tpl: (p) => `original_tag = ${p.t}` },
  { id: 'gov', label: 'Has government', params: [{ n: 'i', l: 'Ideology', t: 'ideology', d: 'fascism' }], tpl: (p) => `has_government = ${p.i}` },
  { id: 'nogov', label: 'Does NOT have government', params: [{ n: 'i', l: 'Ideology', t: 'ideology', d: 'fascism' }], tpl: (p) => `NOT = { has_government = ${p.i} }` },
  { id: 'date', label: 'After date', params: [{ n: 'd', l: 'Date (YYYY.M.D)', t: 'text', d: '1938.1.1' }], tpl: (p) => `date > ${p.d}` },
  { id: 'focus', label: 'Has completed focus', params: [{ n: 'f', l: 'Focus', t: 'focus' }], tpl: (p) => `has_completed_focus = ${p.f}` },
  { id: 'flag', label: 'Has country flag', params: [{ n: 'f', l: 'Flag', t: 'text', d: 'my_flag' }], tpl: (p) => `has_country_flag = ${p.f}` },
  { id: 'noflag', label: 'Does NOT have country flag', params: [{ n: 'f', l: 'Flag', t: 'text', d: 'my_flag' }], tpl: (p) => `NOT = { has_country_flag = ${p.f} }` },
  { id: 'idea', label: 'Has national spirit', params: [{ n: 'i', l: 'Spirit', t: 'idea' }], tpl: (p) => `has_idea = ${p.i}` },
  { id: 'war', label: 'Is at war', params: [], tpl: () => `has_war = yes` },
  { id: 'peace', label: 'Is at peace', params: [], tpl: () => `has_war = no` },
  { id: 'warwith', label: 'At war with', params: [{ n: 't', l: 'Country', t: 'tag' }], tpl: (p) => `has_war_with = ${p.t}` },
  { id: 'pp', label: 'Political power above', params: [{ n: 'a', l: 'Amount', t: 'num', d: 100 }], tpl: (p) => `has_political_power > ${p.a}` },
  { id: 'stab', label: 'Stability above', params: [{ n: 'a', l: 'Amount (0.5 = 50%)', t: 'num', d: 0.5 }], tpl: (p) => `has_stability > ${p.a}` },
  { id: 'ws', label: 'War support above', params: [{ n: 'a', l: 'Amount (0.5 = 50%)', t: 'num', d: 0.5 }], tpl: (p) => `has_war_support > ${p.a}` },
  { id: 'fact', label: 'Factories above', params: [{ n: 'a', l: 'Number', t: 'num', d: 30 }], tpl: (p) => `num_of_factories > ${p.a}` },
  { id: 'faction', label: 'Is in a faction', params: [], tpl: () => `is_in_faction = yes` },
  { id: 'nofaction', label: 'Is NOT in a faction', params: [], tpl: () => `is_in_faction = no` },
  { id: 'puppet', label: 'Is a puppet', params: [], tpl: () => `is_subject = yes` },
  { id: 'tension', label: 'World tension above', params: [{ n: 'a', l: 'Amount (0.5 = 50%)', t: 'num', d: 0.5 }], tpl: (p) => `threat > ${p.a}` },
  { id: 'owns', label: 'Owns state', params: [{ n: 's', l: 'State ID', t: 'num', d: 1 }], tpl: (p) => `owns_state = ${p.s}` },
  { id: 'controls', label: 'Controls state', params: [{ n: 's', l: 'State ID', t: 'num', d: 1 }], tpl: (p) => `controls_state = ${p.s}` },
  { id: 'tech', label: 'Has technology', params: [{ n: 't', l: 'Tech', t: 'tech' }], tpl: (p) => `has_tech = ${p.t}` },
  { id: 'mech', label: 'Custom mechanic value above', params: [{ n: 'm', l: 'Mechanic', t: 'mech' }, { n: 'a', l: 'Value', t: 'num', d: 50 }], tpl: (p) => `check_variable = { ${p.m} > ${p.a} }` },
  { id: 'mechb', label: 'Custom mechanic value below', params: [{ n: 'm', l: 'Mechanic', t: 'mech' }, { n: 'a', l: 'Value', t: 'num', d: 50 }], tpl: (p) => `check_variable = { ${p.m} < ${p.a} }` },
  { id: 'bop', label: 'Balance of power above', params: [{ n: 'b', l: 'Balance of power', t: 'bop' }, { n: 'a', l: 'Value (-1 to 1)', t: 'num', d: 0.5 }], tpl: (p) => `has_power_balance = { id = ${p.b} value > ${p.a} }` },
  { id: 'capit', label: 'Has capitulated', params: [], tpl: () => `has_capitulated = yes` },
  { id: 'ai', label: 'Is AI controlled', params: [], tpl: () => `is_ai = yes` },
  { id: 'player', label: 'Is player controlled', params: [], tpl: () => `is_ai = no` },
  { id: 'exists', label: 'Country exists', params: [{ n: 't', l: 'Country', t: 'tag' }], tpl: (p) => `country_exists = ${p.t}` },
];

export const IDEOLOGY_TYPES = ['democratic', 'communism', 'fascism', 'neutrality'];

export const TECH_CATEGORIES = [
  'infantry_weapons', 'night_vision', 'support_tech', 'artillery', 'rocketry', 'cat_anti_tank', 'cat_anti_air',
  'armor', 'cat_light_armor', 'cat_medium_armor', 'cat_heavy_armor', 'motorized_equipment', 'cat_mechanized_equipment',
  'electronics', 'radar_tech', 'computing_tech', 'encryption_tech', 'decryption_tech', 'nuclear', 'industry',
  'synth_resources', 'construction_tech', 'excavation_tech', 'air_equipment', 'naval_equipment', 'land_doctrine',
  'naval_doctrine', 'air_doctrine', 'cat_mobile_warfare', 'cat_superior_firepower', 'cat_grand_battle_plan',
  'cat_mass_assault', 'marine_tech', 'mountaineers_tech', 'para_tech', 'train_tech', 'jet_technology',
];

export const TECH_FOLDERS = [
  ['infantry_folder', 'Infantry'], ['support_folder', 'Support'], ['armour_folder', 'Armor'], ['artillery_folder', 'Artillery'],
  ['naval_folder', 'Naval'], ['air_techs_folder', 'Air'], ['electronics_folder', 'Engineering'], ['industry_folder', 'Industry'],
  ['land_doctrine_folder', 'Land doctrine'], ['naval_doctrine_folder', 'Naval doctrine'], ['air_doctrine_folder', 'Air doctrine'],
];

export const VANILLA_TECHS = [
  'infantry_weapons', 'infantry_weapons1', 'infantry_weapons2', 'improved_infantry_weapons', 'improved_infantry_weapons_2',
  'advanced_infantry_weapons', 'advanced_infantry_weapons2', 'infantry_at', 'infantry_at2', 'night_vision', 'night_vision2',
  'support_weapons', 'support_weapons2', 'support_weapons3', 'support_weapons4', 'tech_support', 'tech_engineers', 'tech_engineers2',
  'tech_recon', 'tech_recon2', 'tech_military_police', 'tech_maintenance_company', 'tech_field_hospital', 'tech_logistics_company',
  'tech_signal_company', 'paratroopers', 'paratroopers2', 'marines', 'marines2', 'tech_mountaineers', 'tech_mountaineers2',
  'motorised_infantry', 'mechanised_infantry', 'mechanised_infantry2', 'armored_car1', 'gw_artillery', 'interwar_artillery',
  'artillery1', 'artillery2', 'artillery3', 'interwar_antiair', 'antiair1', 'antiair2', 'interwar_antitank', 'antitank1',
  'antitank2', 'rocket_artillery', 'rocket_artillery2', 'gwtank_chassis', 'basic_light_tank_chassis', 'improved_light_tank_chassis',
  'basic_medium_tank_chassis', 'improved_medium_tank_chassis', 'basic_heavy_tank_chassis', 'improved_heavy_tank_chassis',
  'basic_machine_tools', 'improved_machine_tools', 'advanced_machine_tools', 'concentrated_industry', 'concentrated_industry2',
  'dispersed_industry', 'dispersed_industry2', 'fuel_silos', 'fuel_refining', 'synth_oil_experiments', 'construction1',
  'construction2', 'construction3', 'excavation1', 'excavation2', 'electronic_mechanical_engineering', 'radio', 'radio_detection',
  'mechanical_computing', 'computing_machine', 'basic_encryption', 'basic_decryption', 'early_fighter', 'fighter1', 'fighter2',
  'early_bomber', 'CAS1', 'naval_bomber1', 'early_destroyer', 'basic_destroyer', 'early_light_cruiser', 'early_submarine',
  'grand_battle_plan', 'trench_warfare', 'mobile_warfare', 'superior_firepower', 'mass_assault', 'fleet_in_being',
  'trade_interdiction', 'base_strike', 'air_superiority', 'formation_flying', 'strategic_destruction', 'battlefield_support',
];

export const VANILLA_EQUIPMENT = [
  'infantry_equipment', 'infantry_equipment_0', 'infantry_equipment_1', 'infantry_equipment_2', 'infantry_equipment_3',
  'support_equipment', 'support_equipment_1', 'artillery_equipment', 'artillery_equipment_1', 'anti_tank_equipment',
  'anti_tank_equipment_1', 'anti_air_equipment', 'anti_air_equipment_1', 'rocket_artillery_equipment', 'motorized_equipment',
  'motorized_equipment_1', 'mechanized_equipment', 'mechanized_equipment_1', 'armored_car_equipment', 'light_tank_equipment',
  'medium_tank_equipment', 'heavy_tank_equipment', 'train_equipment', 'convoy', 'fighter_equipment', 'cas_equipment',
  'tac_bomber_equipment',
];

export const EQUIPMENT_TYPES = [
  ['infantry', 'Infantry weapons'], ['support', 'Support equipment'], ['artillery', 'Artillery'], ['anti_tank', 'Anti-tank'],
  ['anti_air', 'Anti-air'], ['motorized', 'Motorized / trucks'], ['mechanized', 'Mechanized / APC'], ['armor', 'Tanks'],
];

// Approximate 1936-level stats for vanilla battalions/companies (used for the division designer preview)
export const VANILLA_SUBUNITS = {
  infantry: { name: 'Infantry', group: 'infantry', width: 2, manpower: 1000, org: 60, hp: 25, soft: 6, hard: 1, def: 22, bt: 3, need: { infantry_equipment: 100 } },
  motorized: { name: 'Motorized', group: 'mobile', width: 2, manpower: 1200, org: 60, hp: 25, soft: 6, hard: 1, def: 22, bt: 3, need: { infantry_equipment: 100, motorized_equipment: 35 } },
  mechanized: { name: 'Mechanized', group: 'mobile', width: 2, manpower: 1200, org: 60, hp: 30, soft: 8, hard: 2, def: 28, bt: 6, need: { infantry_equipment: 100, mechanized_equipment: 50 } },
  cavalry: { name: 'Cavalry', group: 'mobile', width: 2, manpower: 1200, org: 70, hp: 25, soft: 5, hard: 1, def: 20, bt: 3, need: { infantry_equipment: 120 } },
  mountaineers: { name: 'Mountaineers', group: 'infantry', width: 2, manpower: 1000, org: 70, hp: 20, soft: 6, hard: 1, def: 24, bt: 3, need: { infantry_equipment: 100, support_equipment: 20 } },
  marine: { name: 'Marines', group: 'infantry', width: 2, manpower: 1000, org: 70, hp: 20, soft: 6, hard: 1, def: 22, bt: 3, need: { infantry_equipment: 100, support_equipment: 20 } },
  paratrooper: { name: 'Paratroopers', group: 'infantry', width: 2, manpower: 1000, org: 70, hp: 20, soft: 6, hard: 1, def: 22, bt: 3, need: { infantry_equipment: 100, support_equipment: 20 } },
  artillery_brigade: { name: 'Artillery', group: 'infantry', width: 3, manpower: 500, org: 0, hp: 0.6, soft: 25, hard: 2, def: 10, bt: 6, need: { artillery_equipment: 12 } },
  anti_tank_brigade: { name: 'Anti-Tank', group: 'infantry', width: 1, manpower: 500, org: 0, hp: 0.6, soft: 2, hard: 18, def: 4, bt: 1, need: { anti_tank_equipment: 12 } },
  anti_air_brigade: { name: 'Anti-Air', group: 'infantry', width: 1, manpower: 500, org: 0, hp: 0.6, soft: 2, hard: 2, def: 4, bt: 1, need: { anti_air_equipment: 12 } },
  rocket_artillery_brigade: { name: 'Rocket Artillery', group: 'infantry', width: 3, manpower: 500, org: 0, hp: 0.6, soft: 30, hard: 2, def: 8, bt: 8, need: { rocket_artillery_equipment: 12 } },
  light_armor: { name: 'Light Tanks', group: 'armor', width: 2, manpower: 500, org: 10, hp: 2, soft: 10, hard: 6, def: 4, bt: 30, need: { light_tank_equipment: 60 } },
  medium_armor: { name: 'Medium Tanks', group: 'armor', width: 2, manpower: 500, org: 10, hp: 2, soft: 18, hard: 15, def: 6, bt: 40, need: { medium_tank_equipment: 50 } },
  heavy_armor: { name: 'Heavy Tanks', group: 'armor', width: 2, manpower: 500, org: 10, hp: 2, soft: 20, hard: 20, def: 10, bt: 50, need: { heavy_tank_equipment: 40 } },
  // support companies
  engineer: { name: 'Engineers', group: 'support', support: true, width: 0, manpower: 300, org: 20, hp: 2, soft: 0, hard: 0, def: 3, bt: 0, need: { infantry_equipment: 30, support_equipment: 10 } },
  recon: { name: 'Recon', group: 'support', support: true, width: 0, manpower: 100, org: 30, hp: 2, soft: 0, hard: 0, def: 0, bt: 0, need: { infantry_equipment: 40 } },
  artillery: { name: 'Support Artillery', group: 'support', support: true, width: 0, manpower: 300, org: 0, hp: 0.2, soft: 15, hard: 1, def: 6, bt: 4, need: { artillery_equipment: 12 } },
  anti_air: { name: 'Support Anti-Air', group: 'support', support: true, width: 0, manpower: 300, org: 0, hp: 0.2, soft: 1, hard: 1, def: 2, bt: 0, need: { anti_air_equipment: 6 } },
  anti_tank: { name: 'Support Anti-Tank', group: 'support', support: true, width: 0, manpower: 300, org: 0, hp: 0.2, soft: 1, hard: 10, def: 2, bt: 0, need: { anti_tank_equipment: 6 } },
  field_hospital: { name: 'Field Hospital', group: 'support', support: true, width: 0, manpower: 500, org: 0, hp: 0.5, soft: 0, hard: 0, def: 0, bt: 0, need: { support_equipment: 30 } },
  logistics_company: { name: 'Logistics Company', group: 'support', support: true, width: 0, manpower: 100, org: 0, hp: 0.5, soft: 0, hard: 0, def: 0, bt: 0, need: { support_equipment: 30 } },
  maintenance_company: { name: 'Maintenance Company', group: 'support', support: true, width: 0, manpower: 300, org: 0, hp: 0.5, soft: 0, hard: 0, def: 0, bt: 0, need: { support_equipment: 30 } },
  military_police: { name: 'Military Police', group: 'support', support: true, width: 0, manpower: 300, org: 20, hp: 1, soft: 0, hard: 0, def: 0, bt: 0, need: { infantry_equipment: 30, support_equipment: 10 } },
  signal_company: { name: 'Signal Company', group: 'support', support: true, width: 0, manpower: 300, org: 0, hp: 0.5, soft: 0, hard: 0, def: 0, bt: 0, need: { support_equipment: 30 } },
};

// Vanilla "sprite" names used by sub_units. These pick the 3D model and the counter icon.
export const UNIT_SPRITES = [
  'infantry', 'motorized', 'mechanized', 'cavalry', 'mountaineers', 'marine', 'paratrooper', 'artillery', 'anti_tank',
  'anti_air', 'light_armor', 'medium_armor', 'heavy_armor', 'armored_car', 'engineer', 'recon', 'field_hospital',
  'logistics_company', 'military_police', 'maintenance_company', 'signal_company', 'rocket_artillery',
];
export const MAP_ICON_CATEGORIES = ['infantry', 'armored', 'other'];

export const FOCUS_ICONS = [
  'GFX_goal_unknown', 'GFX_goal_generic_construct_civ_factory', 'GFX_goal_generic_construct_mil_factory',
  'GFX_goal_generic_construct_infrastructure', 'GFX_goal_generic_production', 'GFX_goal_generic_production2',
  'GFX_goal_generic_army_doctrines', 'GFX_goal_generic_army_motorized', 'GFX_goal_generic_army_tanks',
  'GFX_goal_generic_army_artillery', 'GFX_goal_generic_army_artillery2', 'GFX_goal_generic_allies_build_infantry',
  'GFX_goal_generic_small_arms', 'GFX_goal_generic_special_forces', 'GFX_goal_generic_air_doctrine',
  'GFX_goal_generic_air_fighter', 'GFX_goal_generic_air_bomber', 'GFX_goal_generic_air_production',
  'GFX_goal_generic_navy_doctrines_tactics', 'GFX_goal_generic_navy_battleship', 'GFX_goal_generic_navy_submarine',
  'GFX_goal_generic_construct_naval_dockyard', 'GFX_goal_generic_political_pressure', 'GFX_goal_generic_propaganda',
  'GFX_goal_generic_national_unity', 'GFX_goal_generic_demand_territory', 'GFX_goal_generic_attack_',
  'GFX_goal_generic_major_war', 'GFX_goal_generic_more_territorial_claims', 'GFX_goal_generic_alliance',
  'GFX_goal_generic_positive_trade_relations', 'GFX_goal_generic_neutrality_focus', 'GFX_goal_generic_fortify_city',
  'GFX_goal_generic_occupy_states_ongoing_war', 'GFX_goal_generic_scientific_exchange', 'GFX_goal_generic_secret_weapon',
  'GFX_goal_generic_research', 'GFX_goal_generic_radar', 'GFX_goal_generic_consumer_goods',
  'GFX_goal_support_fascism', 'GFX_goal_support_communism', 'GFX_goal_support_democracy',
  'GFX_focus_generic_industry_1', 'GFX_focus_generic_industry_2', 'GFX_focus_generic_industry_3',
  'GFX_focus_research', 'GFX_focus_generic_self_management',
];

export const DECISION_ICONS = [
  'generic_political_actions', 'generic_economy', 'generic_industry', 'generic_military', 'generic_research',
  'generic_prepare_civil_war', 'generic_form_nation', 'generic_decision', 'generic_civil_support', 'generic_construction',
  'generic_operation', 'generic_nationalism', 'generic_tank', 'generic_army_support', 'generic_air', 'generic_naval',
  'generic_propaganda', 'generic_police_action', 'generic_reichskommissariats', 'oppression', 'eng_trade_unions_support',
  'border_war', 'decision_generic_ignite_civil_war', 'hol_attract_foreign_investors',
];

export const DECISION_CAT_ICONS = ['generic_political_actions', 'generic_economy', 'generic_industry', 'generic_military', 'generic_research', 'generic_operation', 'generic_prepare_civil_war', 'generic_form_nation'];

export const EVENT_PICTURES = [
  'GFX_report_event_generic_read_write', 'GFX_report_event_journalists_speech', 'GFX_report_event_soldiers_marching',
  'GFX_report_event_generic_rally', 'GFX_report_event_generic_factory', 'GFX_report_event_generic_sign_treaty1',
  'GFX_report_event_generic_sign_treaty2', 'GFX_report_event_politics_speech', 'GFX_report_event_military_planning',
  'GFX_report_event_tanks_parade', 'GFX_report_event_fighter_planes', 'GFX_report_event_degaulle_churchill',
  'GFX_report_event_hitler_parade', 'GFX_report_event_stalin_speech', 'GFX_report_event_chinese_soldiers_fighting',
  'GFX_report_event_gathering_protest', 'GFX_report_event_riots', 'GFX_report_event_spanish_civil_war',
];

export const IDEA_PICTURES = [
  'generic_morale_bonus', 'generic_pp_unity_bonus', 'generic_production_bonus', 'generic_research_bonus',
  'generic_manpower_bonus', 'generic_infantry_bonus', 'generic_army_support', 'generic_air_bonus', 'generic_navy_bonus',
  'generic_political_support', 'generic_democratic_drift_bonus', 'generic_fascism_drift_bonus',
  'generic_communism_drift_bonus', 'generic_neutrality_drift_bonus', 'generic_construction', 'generic_disorganized_army',
  'generic_exhausted', 'generic_economic_crisis',
];

export const FOCUS_FILTERS = [
  'FOCUS_FILTER_POLITICAL', 'FOCUS_FILTER_RESEARCH', 'FOCUS_FILTER_INDUSTRY', 'FOCUS_FILTER_STABILITY',
  'FOCUS_FILTER_WAR_SUPPORT', 'FOCUS_FILTER_MANPOWER', 'FOCUS_FILTER_ANNEXATION', 'FOCUS_FILTER_MILITARY_CHARACTER',
  'FOCUS_FILTER_ARMY_XP', 'FOCUS_FILTER_NAVY_XP', 'FOCUS_FILTER_AIR_XP', 'FOCUS_FILTER_HISTORICAL',
];

// Sizes HOI4 expects for each kind of picture
export const IMAGE_SIZES = {
  portraitLarge: [156, 210],
  portraitSmall: [65, 67],
  focus: [94, 86],
  event: [210, 176],
  idea: [64, 64],
  decision: [40, 40],
  decisionCat: [522, 82],
  tech: [64, 64],
  equipment: [137, 74],
  unitIcon: [43, 43],
  bopSide: [38, 38],
  modThumb: [256, 256],
};
