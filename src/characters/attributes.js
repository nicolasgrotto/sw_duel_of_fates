export function getRatingLimit(name, config, apex = false) {
  return apex && name === config.apexAttribute ? config.apexRating : config.maxRating;
}

export function applyAttributes(base, attributes, config, { apex = false } = {}) {
  const ratings = { ...config.defaults, ...attributes };
  for (const name of Object.keys(config.defaults)) {
    if (!Number.isInteger(ratings[name]) || ratings[name] < config.minRating || ratings[name] > getRatingLimit(name, config, apex)) {
      throw new RangeError(`Invalid attribute: ${name}=${ratings[name]}`);
    }
  }
  const multiplier = (name) => config.multipliers[ratings[name]];
  const rounded = (value) => Math.round(value * config.precision) / config.precision;
  const agility = multiplier('agility');
  const mobility = agility * base.abilityMobilityScale;
  const attacks = {};
  for (const [id, move] of Object.entries(base.attacks)) {
    attacks[id] = { ...move, damage: rounded(base.damage[id] * multiplier('blade')) };
    if (move.dash) attacks[id].dash = { ...move.dash, speed: rounded(move.dash.speed * mobility) };
    if (move.leap) attacks[id].leap = { ...move.leap, speedX: rounded(move.leap.speedX * mobility), speedY: rounded(move.leap.speedY * mobility) };
  }
  const { damage, guardCostScale, guardPushbackScale, evadeWindowScale, abilityMobilityScale, ...stats } = base;
  return {
    ...stats,
    attributes: ratings,
    maxHealth: rounded(base.maxHealth * multiplier('health')),
    maxStamina: rounded(base.maxStamina * multiplier('stamina')),
    stamina: { ...base.stamina, regenPerSecond: rounded(base.stamina.regenPerSecond * multiplier('stamina')) },
    movement: { ...base.movement, walkSpeed: rounded(base.movement.walkSpeed * agility), jumpVelocity: rounded(base.movement.jumpVelocity * agility) },
    dodge: { ...base.dodge, speed: rounded(base.dodge.speed * agility) },
    evade: { ...base.evade, invulnerableTime: rounded(base.evade.invulnerableTime * evadeWindowScale * agility) },
    parry: { ...base.parry, perfectWindow: rounded(Math.max(0, Math.min(base.parry.window, base.parry.perfectWindow + (ratings.blade - config.baseRating) * config.perfectParryBonus))) },
    blockStaminaScale: rounded(base.blockStaminaScale * guardCostScale / multiplier('defense')),
    blockPushbackScale: rounded(base.blockPushbackScale * guardPushbackScale / multiplier('defense')),
    guardBreakThreshold: Math.max(0, base.guardBreakThreshold + (config.baseRating - ratings.defense) * config.guardBreakStep),
    wallJump: base.wallJump ? { ...base.wallJump, speed: rounded(base.wallJump.speed * mobility) } : null,
    attacks,
    powerLevel: ratings.flow,
  };
}
