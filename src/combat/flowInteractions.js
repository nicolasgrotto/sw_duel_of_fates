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

export function resolveLevelBand(level, bands) {
  let band = bands[0];
  for (const candidate of bands) {
    if (level >= candidate.minLevel) {
      band = candidate;
    }
  }
  return band;
}

export function getPowerTier(level, tiers) {
  return resolveLevelBand(level, tiers);
}
