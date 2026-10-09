export function getFlowDifference(caster, target) {
  return caster.flowLevel - target.flowLevel;
}

export function resolveInteraction(table, flowDifference) {
  const { bands } = table;
  for (const band of bands) {
    if (flowDifference >= band.atLeast) {
      return band;
    }
  }
  return bands[bands.length - 1];
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
