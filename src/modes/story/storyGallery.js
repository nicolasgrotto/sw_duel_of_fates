export const StoryEntryKind = Object.freeze({
  ENCOUNTER: 'encounter',
  ENDING: 'ending',
});

export function createStorySeen() {
  return { encounters: {}, endings: {} };
}

export function markStorySeen(seen, { encounterId, ending, protagonist }) {
  const witness = { alignment: protagonist.alignment, name: protagonist.name };
  const next = {
    encounters: { ...seen?.encounters, [encounterId]: witness },
    endings: { ...seen?.endings },
  };
  if (ending) next.endings[ending] = witness;
  return next;
}

function findEndingArena(endingId, encounters) {
  const source = encounters.find((encounter) => encounter.ending === endingId
    || encounter.outcomes?.some((outcome) => outcome.ending === endingId));
  return source?.arena ?? null;
}

export function buildStoryGallery(config, seen, run = null) {
  const encounters = seen?.encounters ?? {};
  const endings = seen?.endings ?? {};
  const runWitness = run ? { alignment: run.protagonist.alignment, name: run.protagonist.name } : null;
  const entries = config.encounters.map((encounter) => ({
    kind: StoryEntryKind.ENCOUNTER,
    id: encounter.id,
    arena: encounter.arena,
    witness: encounters[encounter.id] ?? (run?.completed.includes(encounter.id) ? runWitness : null),
  }));
  for (const id of Object.keys(config.endings)) {
    const witness = endings[id] ?? (run?.ending === id ? runWitness : null);
    entries.push({ kind: StoryEntryKind.ENDING, id, arena: findEndingArena(id, config.encounters), witness });
  }
  return entries;
}
