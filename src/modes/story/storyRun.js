import { evaluateCondition } from './conditions.js';

const NEUTRAL_SLOT = 'neutral';

export function createStoryRun(profile, difficulty, config) {
  return {
    protagonist: { ...profile, attributes: { ...config.startAttributes } },
    difficulty,
    encounter: config.start,
    points: config.startPoints,
    slots: [NEUTRAL_SLOT],
    completed: [],
    ending: null,
  };
}

export function getEncounter(run, config) {
  return config.encounters.find((encounter) => encounter.id === run.encounter) ?? null;
}

export function isStoryFinished(run) {
  return run.encounter === null;
}

export function getEncounterDifficulty(run, encounter, difficultyOrder) {
  const index = difficultyOrder.indexOf(run.difficulty) + (encounter.aiOffset ?? 0);
  return difficultyOrder[Math.max(0, Math.min(difficultyOrder.length - 1, index))];
}

export function getStoryStage(run, config, difficultyOrder) {
  const encounter = getEncounter(run, config);
  return {
    encounterId: encounter.id,
    number: run.completed.length + 1,
    opponentCharacter: encounter.opponent,
    arena: encounter.arena,
    difficulty: getEncounterDifficulty(run, encounter, difficultyOrder),
    isBoss: false,
  };
}

export function getAttributeTotal(attributes) {
  return Object.values(attributes).reduce((sum, value) => sum + value, 0);
}

export function canRaiseAttribute(run, attribute, config) {
  const { attributes } = run.protagonist;
  return run.points > 0
    && attribute in attributes
    && attributes[attribute] < config.ratingCaps[run.difficulty]
    && getAttributeTotal(attributes) < config.budgets[run.difficulty];
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

function unlockSlots(run, encounter, loadouts) {
  if (!encounter.reward?.powers) {
    return run.slots;
  }
  return Object.keys(loadouts[run.protagonist.alignment] ?? {});
}

export function resolveStoryResult(run, result, config, loadouts) {
  const encounter = getEncounter(run, config);
  if (result.winnerSide !== 0) {
    return { run, won: false, ending: null, unlocks: [], encounter };
  }
  const { next, ending } = resolveRoute(encounter, { result, run });
  const unlocks = [...(encounter.unlocks ?? []), ...(ending ? config.endings[ending].unlocks : [])];
  return {
    won: true,
    encounter,
    ending,
    unlocks,
    run: {
      ...run,
      encounter: ending ? null : next,
      ending: ending ?? run.ending,
      points: run.points + config.pointsPerVictory,
      slots: unlockSlots(run, encounter, loadouts),
      completed: [...run.completed, encounter.id],
    },
  };
}

function isRatingMap(attributes, config) {
  return Boolean(attributes) && Object.keys(config.startAttributes).every((name) => Number.isInteger(attributes[name]) && attributes[name] >= 1);
}

export function sanitizeStoryRun(raw, config) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const { protagonist, difficulty, encounter, points, slots, completed } = raw;
  const { alignments, styles, saberColors } = config.protagonist;
  const knownEncounter = encounter === null || config.encounters.some((candidate) => candidate.id === encounter);
  const validProtagonist = protagonist && typeof protagonist.name === 'string' && protagonist.name.length > 0
    && alignments.includes(protagonist.alignment) && protagonist.style in styles
    && typeof protagonist.saberColor === 'string' && isRatingMap(protagonist.attributes, config);
  if (!validProtagonist || !config.difficulties.includes(difficulty) || !knownEncounter || !Number.isInteger(points) || points < 0
    || !Array.isArray(slots) || !Array.isArray(completed)) {
    return null;
  }
  return {
    ...raw,
    protagonist: { ...protagonist, name: protagonist.name.slice(0, config.protagonist.maxNameLength), saberColor: saberColors.includes(protagonist.saberColor) ? protagonist.saberColor : saberColors[0] },
  };
}
