export const ProjectileKind = Object.freeze({
  THROW: 'throw',
  SABER: 'saber',
});

export const projectilesConfig = {
  capacity: 6,
  height: 0.55,
  saber: {
    speed: 900,
    range: 380,
    radius: 26,
    returnHeightRate: 8,
    maxLifetime: 1.6,
  },
  throw: {
    maxLifetime: 2,
    sizes: [
      { id: 'small', minLevel: 1, radius: 10, damage: 6, speed: 760, knockback: 320, stagger: 0.24, cost: 30, cooldown: 1 },
      { id: 'medium', minLevel: 4, radius: 15, damage: 8, speed: 700, knockback: 460, stagger: 0.3, cost: 34, cooldown: 1.1 },
      { id: 'large', minLevel: 6, radius: 22, damage: 11, speed: 620, knockback: 640, stagger: 0.38, cost: 40, cooldown: 1.3 },
      { id: 'huge', minLevel: 9, radius: 30, damage: 14, speed: 560, knockback: 820, stagger: 0.46, cost: 44, cooldown: 1.4 },
      { id: 'max', minLevel: 10, radius: 38, damage: 17, speed: 520, knockback: 980, stagger: 0.55, cost: 48, cooldown: 1.5 },
    ],
  },
  render: {
    fragmentPoints: [1, 0.15, 0.55, 0.85, -0.35, 0.95, -1, 0.1, -0.6, -0.8, 0.4, -0.9],
    fragmentSpin: 7,
    fragmentGlowScale: 2.4,
    fragmentGlowAlpha: 0.35,
    fragmentEdgeWidth: 1.5,
    saberSpin: 18,
    saberLengthScale: 1.6,
    saberGlowScale: 1.1,
    saberGlowAlpha: 0.5,
  },
};
