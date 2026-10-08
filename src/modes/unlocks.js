export const ARCADE_UNLOCK = 'arcade';

export function isAltColorUnlocked(character, alt, settings) {
  if (alt.id === ARCADE_UNLOCK) {
    return (settings.arcadeCleared ?? []).includes(character.id);
  }
  return (settings.unlocks?.[character.id] ?? []).includes(alt.id);
}

export function getSaberOptions(character, settings) {
  return [
    { id: 'default', name: character.info.saberName, color: character.appearance.saberColor, unlocked: true, alt: null },
    ...character.altSaberColors.map((alt) => ({
      id: alt.id,
      name: alt.name,
      color: alt.color,
      unlocked: isAltColorUnlocked(character, alt, settings),
      alt,
    })),
  ];
}

export function findChallengeUnlocks(character, stats, settings) {
  return character.altSaberColors.filter((alt) => (
    alt.challenge && !isAltColorUnlocked(character, alt, settings) && stats[alt.challenge.stat] >= alt.challenge.target
  ));
}

export function addUnlocks(unlocks, characterId, alts) {
  const current = unlocks?.[characterId] ?? [];
  return { ...unlocks, [characterId]: [...current, ...alts.map((alt) => alt.id)] };
}
