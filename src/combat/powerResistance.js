export function getLevelDifference(caster, target) {
  return target.flowLevel - caster.flowLevel;
}

export function resolvePowerOutcome(rule, levelDifference) {
  for (const band of rule) {
    if (levelDifference <= band.upTo) {
      return band;
    }
  }
  return rule[rule.length - 1];
}

export function getPowerTier(level, tiers) {
  let tier = tiers[0];
  for (const candidate of tiers) {
    if (level >= candidate.minLevel) {
      tier = candidate;
    }
  }
  return tier;
}
