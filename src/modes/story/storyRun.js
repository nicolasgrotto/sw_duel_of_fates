import { evaluateCondition } from './conditions.js';
import { powersConfig } from '../../config/powersConfig.js';

export function getStartLoadout(alignment, config) {
  const power = config.protagonist.startPowers[alignment];
  return { slots: [config.slotOrder[0]], catalog: [power], loadout: { [config.slotOrder[0]]: power } };
}

export function createStoryRun(profile, difficulty, config) {
  return {
    protagonist: { ...profile, skin: profile.skin ?? 'base', attributes: { ...config.startAttributes } },
    difficulty,
    encounter: config.start,
    points: config.startPoints,
    ...getStartLoadout(profile.alignment, config),
    completed: [],
    ending: null,
  };
}

function fillEmptySlots({ slots, catalog, loadout }, config) {
  const filled = { ...loadout };
  for (const slot of config.slotOrder.filter((id) => slots.includes(id) && !filled[id])) {
    const free = catalog.find((power) => !Object.values(filled).includes(power));
    if (free) filled[slot] = free;
  }
  return filled;
}

function applyEncounterReward(build, encounter, alignment, config) {
  const reward = encounter.reward ?? {};
  const slots = reward.slot && !build.slots.includes(reward.slot) ? config.slotOrder.filter((id) => [...build.slots, reward.slot].includes(id)) : build.slots;
  const power = reward.powers?.[alignment];
  const catalog = power && !build.catalog.includes(power) ? [...build.catalog, power] : build.catalog;
  return { slots, catalog, loadout: fillEmptySlots({ slots, catalog, loadout: build.loadout }, config) };
}

export function getEncounterPoints(encounter, difficulty) {
  return encounter.reward?.points?.[difficulty] ?? 0;
}

export function setLoadoutPower(run, slot, power, config) {
  if (!run.slots.includes(slot) || !run.catalog.includes(power) || run.loadout[slot] === power) return run;
  const loadout = { ...run.loadout, [slot]: power };
  const previous = Object.keys(run.loadout).find((other) => other !== slot && run.loadout[other] === power);
  if (previous) loadout[previous] = run.loadout[slot];
  return { ...run, loadout: fillEmptySlots({ ...run, loadout }, config) };
}

export function cycleLoadoutPower(run, slot, step, config) {
  if (!run.slots.includes(slot) || run.catalog.length === 0) return run;
  const index = run.catalog.indexOf(run.loadout[slot]);
  const next = run.catalog[(index + step + run.catalog.length) % run.catalog.length];
  return setLoadoutPower(run, slot, next, config);
}

export function getSlotOpeningEncounter(slot, alignment, config) {
  return walkRoute(alignment, config).find((encounter) => encounter.reward?.slot === slot) ?? null;
}

function walkRoute(alignment, config) {
  const route = [];
  const context = { run: { protagonist: { alignment } }, result: { fighters: [{ healthRatio: 0 }] } };
  let encounter = config.encounters.find((candidate) => candidate.id === config.start);
  while (encounter && !route.includes(encounter)) {
    route.push(encounter);
    const { next } = resolveRoute(encounter, context);
    encounter = config.encounters.find((candidate) => candidate.id === next);
  }
  return route;
}

export function getCampaignBuild(alignment, config) {
  return walkRoute(alignment, config).reduce((build, encounter) => applyEncounterReward(build, encounter, alignment, config), getStartLoadout(alignment, config));
}

export function getRoutePoints(alignment, difficulty, config) {
  return config.startPoints + walkRoute(alignment, config).reduce((sum, encounter) => sum + getEncounterPoints(encounter, difficulty), 0);
}

export function getEncounter(run, config) {
  return config.encounters.find((encounter) => encounter.id === run.encounter) ?? null;
}

export function isStoryFinished(run) {
  return run.encounter === null;
}

export function getEncounterDifficulty(run, encounter, difficultyOrder) {
  if (encounter.difficulty) {
    return encounter.difficulty;
  }
  const index = difficultyOrder.indexOf(run.difficulty) + (encounter.aiOffset ?? 0);
  return difficultyOrder[Math.max(0, Math.min(difficultyOrder.length - 1, index))];
}

export function getStoryStage(run, config, difficultyOrder) {
  const encounter = getEncounter(run, config);
  return {
    encounterId: encounter.id,
    number: run.completed.length + 1,
    opponentCharacter: encounter.opponent,
    opponentVariant: encounter.opponentVariant ?? null,
    arena: encounter.arena,
    difficulty: getEncounterDifficulty(run, encounter, difficultyOrder),
    isBoss: false,
  };
}

export function getAttributeTotal(attributes) {
  return Object.values(attributes).reduce((sum, value) => sum + value, 0);
}

export function getUnearnedPoints(run, config) {
  return Math.max(0, config.budgets[run.difficulty] - getAttributeTotal(run.protagonist.attributes) - run.points);
}

export function isAttributeBudgetFull(run, config) {
  return getAttributeTotal(run.protagonist.attributes) >= config.budgets[run.difficulty];
}

export function canRaiseAttribute(run, attribute, config) {
  const { attributes } = run.protagonist;
  return run.points > 0
    && attribute in attributes
    && attributes[attribute] < config.ratingCap
    && !isAttributeBudgetFull(run, config);
}

export function raiseAttribute(run, attribute, config) {
  if (!canRaiseAttribute(run, attribute, config)) {
    return run;
  }
  const attributes = { ...run.protagonist.attributes, [attribute]: run.protagonist.attributes[attribute] + 1 };
  return { ...run, points: run.points - 1, protagonist: { ...run.protagonist, attributes } };
}

function resolveRoute(encounter, context) {
  for (const outcome of encounter.outcomes ?? []) {
    if (evaluateCondition(outcome.condition, context)) {
      return { next: outcome.next ?? null, ending: outcome.ending ?? null };
    }
  }
  return { next: encounter.next ?? null, ending: encounter.ending ?? null };
}

export function resolveStoryResult(run, result, config) {
  const encounter = getEncounter(run, config);
  if (result.winnerSide !== 0) {
    return { run, won: false, ending: null, unlocks: [], encounter };
  }
  const { next, ending } = resolveRoute(encounter, { result, run });
  const context = { result, run };
  const endingUnlocks = ending ? [
    ...config.endings[ending].unlocks,
    ...(config.endings[ending].conditionalUnlocks ?? []).filter((entry) => evaluateCondition(entry.condition, context)).flatMap((entry) => entry.ids),
  ] : [];
  const unlocks = [...(encounter.unlocks ?? []), ...endingUnlocks];
  return {
    won: true,
    encounter,
    ending,
    unlocks,
    run: {
      ...run,
      encounter: ending ? null : next,
      ending: ending ?? run.ending,
      points: run.points + Math.min(getEncounterPoints(encounter, run.difficulty), getUnearnedPoints(run, config)),
      ...applyEncounterReward(run, encounter, run.protagonist.alignment, config),
      completed: [...run.completed, encounter.id],
    },
  };
}

function isAlignedPower(power, alignment) {
  return Object.values(powersConfig.categories).some((category) => category.alignments.includes(alignment) && category.abilities.includes(power))
    && power in powersConfig.powers;
}

function isValidBuild({ slots, catalog, loadout }, alignment, config) {
  if (!Array.isArray(slots) || !Array.isArray(catalog) || !loadout || typeof loadout !== 'object' || Array.isArray(loadout)) return false;
  if (slots.length === 0 || slots.some((slot) => !config.slotOrder.includes(slot)) || new Set(slots).size !== slots.length) return false;
  if (catalog.some((power) => !isAlignedPower(power, alignment)) || new Set(catalog).size !== catalog.length) return false;
  const equipped = Object.entries(loadout);
  return equipped.every(([slot, power]) => slots.includes(slot) && catalog.includes(power))
    && new Set(equipped.map(([, power]) => power)).size === equipped.length
    && slots.every((slot) => loadout[slot] || catalog.length < slots.length);
}

function isRatingMap(attributes, config) {
  return Boolean(attributes) && Object.keys(config.startAttributes).every((name) => Number.isInteger(attributes[name]) && attributes[name] >= 1 && attributes[name] <= config.ratingCap);
}

export function sanitizeStoryRun(raw, config) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const { protagonist, difficulty, encounter, points, completed } = raw;
  const { alignments, styles, saberColors } = config.protagonist;
  const knownEncounter = encounter === null || config.encounters.some((candidate) => candidate.id === encounter);
  const validProtagonist = protagonist && typeof protagonist.name === 'string' && protagonist.name.length > 0
    && alignments.includes(protagonist.alignment) && protagonist.style in styles
    && typeof protagonist.saberColor === 'string' && isRatingMap(protagonist.attributes, config);
  if (!validProtagonist || !config.difficulties.includes(difficulty) || !knownEncounter || !Number.isInteger(points) || points < 0
    || !Array.isArray(completed) || !isValidBuild(raw, protagonist.alignment, config)) {
    return null;
  }
  const room = Math.max(0, config.budgets[difficulty] - getAttributeTotal(protagonist.attributes));
  return {
    ...raw,
    points: Math.min(points, room),
    protagonist: { ...protagonist, skin: config.protagonist.skins.some((skin) => skin.id === protagonist.skin) ? protagonist.skin : 'base',
      name: protagonist.name.slice(0, config.protagonist.maxNameLength), saberColor: saberColors.includes(protagonist.saberColor) ? protagonist.saberColor : saberColors[0] },
  };
}
