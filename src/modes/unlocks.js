export const ARCADE_UNLOCK = 'arcade';

export function isAltColorUnlocked(character, alt, settings) {
  if ((settings.unlocks?.[character.id] ?? []).includes(alt.id)) return true;
  return alt.id === ARCADE_UNLOCK && (settings.arcadeCleared ?? []).includes(character.id);
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
  return { ...unlocks, [characterId]: [...new Set([...current, ...alts.map((alt) => alt.id)])] };
}

export function getSkinOptions(character, settings) {
  return (character.skins ?? []).map((skin) => ({
    ...skin,
    unlocked: !skin.unlock || (settings.unlocks?.[character.id] ?? []).includes(skin.id)
      || (skin.unlock === ARCADE_UNLOCK && (settings.arcadeCleared ?? []).includes(character.id)),
  }));
}

export function unlockAllCosmetics(unlocks, characters) {
  let next = unlocks ?? {};
  for (const character of characters) {
    const owned = next[character.id] ?? [];
    const skins = (character.skins ?? []).filter((skin) => skin.unlock && !owned.includes(skin.id));
    const colors = (character.altSaberColors ?? []).filter((alt) => !owned.includes(alt.id));
    if (skins.length || colors.length) next = addUnlocks(next, character.id, [...skins, ...colors]);
  }
  return next;
}

export function unlockProgressSkins(unlocks, characters, milestone) {
  let next = unlocks ?? {};
  for (const character of characters) {
    const skins = (character.skins ?? []).filter((skin) => skin.unlock === milestone);
    if (skins.length) next = addUnlocks(next, character.id, skins);
  }
  return next;
}
