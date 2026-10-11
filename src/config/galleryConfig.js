export const galleryConfig = {
  levels: [1, 6, 8, 10],
  targets: ['idle', 'blocking', 'barrier', 'redirect', 'airborne', 'attacking'],
  attackPower: 'lightning',
  reactionLead: 0.1,
  defaults: { ability: 'push', tier: 1, target: 'idle', caster: 'guardian', repeat: true },
  cycleDelay: 0.8,
  distanceRatio: 0.6,
  minGap: 30,
  selfGap: 260,
};
