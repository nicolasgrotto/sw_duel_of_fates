export const fighterArchetypes = {
  guardian: {
    maxHealth: 100,
    maxStamina: 100,
    body: {
      width: 46,
      height: 150,
    },
    movement: {
      walkSpeed: 260,
      backwardSpeedMultiplier: 0.75,
      groundAcceleration: 2200,
      groundDeceleration: 2800,
      airAcceleration: 900,
      jumpVelocity: 820,
    },
  },
  shadow: {
    maxHealth: 110,
    maxStamina: 90,
    body: {
      width: 50,
      height: 154,
    },
    movement: {
      walkSpeed: 240,
      backwardSpeedMultiplier: 0.7,
      groundAcceleration: 2000,
      groundDeceleration: 2600,
      airAcceleration: 800,
      jumpVelocity: 800,
    },
  },
};
