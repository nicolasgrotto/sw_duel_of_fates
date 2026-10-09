export function getFlowDifference(caster, target) {
  return caster.flowLevel - target.flowLevel;
}

export function resolveInteraction(table, flowDifference) {
  for (const band of table) {
    if (flowDifference >= band.atLeast) {
      return band;
    }
  }
  return table[table.length - 1];
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
