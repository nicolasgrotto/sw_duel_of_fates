export function convertLegacyRating(name, rating, { minRating, maxRating, legacyScale }) {
  const converted = name === 'flow'
    ? rating - legacyScale.flowShift
    : Math.floor(minRating + (rating - minRating) * legacyScale.ratingStep + 0.5);
  return Math.min(maxRating, Math.max(minRating, converted));
}

export function convertLegacyRatings(attributes, config, cap = config.maxRating) {
  const converted = {};
  for (const [name, rating] of Object.entries(attributes)) {
    converted[name] = Math.min(cap, convertLegacyRating(name, rating, config));
  }
  return converted;
}

export function convertLegacyPoints(points, { legacyScale }) {
  return Math.floor(points * legacyScale.ratingStep + 0.5);
}
