export const FighterState = Object.freeze({
  IDLE: 'IDLE',
  WALKING: 'WALKING',
  JUMPING: 'JUMPING',
  ATTACKING: 'ATTACKING',
  HEAVY_ATTACK: 'HEAVY_ATTACK',
  BLOCKING: 'BLOCKING',
  DODGING: 'DODGING',
  HIT: 'HIT',
  STAGGERED: 'STAGGERED',
  STUNNED: 'STUNNED',
  DEAD: 'DEAD',
});

export const LOCOMOTION_STATES = Object.freeze(
  new Set([FighterState.IDLE, FighterState.WALKING, FighterState.JUMPING]),
);
