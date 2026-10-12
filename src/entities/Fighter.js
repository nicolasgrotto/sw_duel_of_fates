import { FighterState, LOCOMOTION_STATES } from './fighterStates.js';

function createIntent() {
  return {
    moveX: 0,
    jump: false,
    lightAttack: false,
    heavyAttack: false,
    block: false,
    blockPressed: false,
    dodge: false,
    evade: false,
    special: false,
    specialHeld: false,
    power: false,
    powerHeld: false,
  };
}

function createCombat() {
  return {
    attack: null,
    attackType: null,
    hasHit: false,
    attackConnected: false,
    airAttackUsed: false,
    airDashUsed: false,
    saberThrown: false,
    wallJumpSide: 0,
    jumpsUsed: 0,
    lungeApplied: false,
    stunDuration: 0,
    blockstun: 0,
    dodgeDirection: 0,
    dodgeProfile: null,
    evading: false,
    evadeSucceeded: false,
    evadeStreak: 0,
    passThrough: false,
    armorHits: 0,
    chargeTime: 0,
    fallDirection: 0,
    staminaRegenDelay: 0,
    exhausted: false,
    exhaustionTime: 0,
    exhaustionCause: null,
    exhaustionSpendCount: 0,
    exhaustionBlockCount: 0,
    exhaustionGuardBreakCount: 0,
    exhaustionDrainCount: 0,
    exhaustionBladeLockCount: 0,
    wound: null,
    woundUsed: false,
    woundArmCount: 0,
    woundLegCount: 0,
    autoEvadeCount: 0,
    wrathExtraDamage: 0,
    lockTime: 0,
    lockPresses: 0,
    lockLastPress: 0,
    lockOpponent: -1,
    lockCooldown: 0,
    lockPressHeld: false,
    lockReleaseGuard: 0,
    lockCount: 0,
    lockWinCount: 0,
    lockDrawCount: 0,
    lockEndCount: 0,
    lockDurationTotal: 0,
    bufferedAction: null,
    bufferTime: 0,
    parryArmed: false,
    parryTime: 0,
    parryLockout: 0,
    riposteTime: 0,
    power: null,
    powerMode: null,
    bladeHitSequence: 0,
    powerEndTime: 0,
    powerTick: 0,
    powerTargeted: false,
    powerCooldown: 0,
    absorbTime: 0,
    powerTargetX: 0,
    powerTargetY: 0,
    statusLevel: 0,
    confuseTime: 0,
    confuseElapsed: 0,
    fracture: null,
    fractures: [],
    stormWaveHits: [],
    stormFractureHits: [],
    rainActive: false,
    rain: null,
    stormPhase: null,
    stormMarks: [],
    stormNextStrike: 0,
    stormTarget: -1,
    chokeTime: 0,
    chokeSource: -1,
    chokeTarget: -1,
    chokeAttempted: false,
    chokeMaxChannel: 0,
    chokeRelease: 0,
    chokeY: 0,
    chokeDamageRate: 0,
    freezeTime: 0,
    focusTime: 0,
    focusEnd: 'reset',
    focusScale: 1,
    healTime: 0,
    healEnd: 'reset',
    healRate: 0,
    healCap: 0,
    sanctuaryTime: 0,
    sanctuaryShield: 0,
    sanctuaryEnd: 'reset',
    wrathTime: 0,
    wrathArmorHits: 0,
    wrathEnd: 'reset',
    wrathDamageDealtScale: 1,
    wrathDamageTakenScale: 1,
  };
}

export class Fighter {
  constructor({ id, name, stats, appearance, sound = null, x, y, facing }) {
    this.id = id;
    this.name = name;
    this.stats = stats;
    this.appearance = appearance;
    this.sound = sound;

    this.x = x;
    this.y = y;
    this.floorY = y;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing;
    this.grounded = true;

    this.health = stats.maxHealth;
    this.stamina = stats.maxStamina;
    this.flowMeter = stats.power?.start ?? 0;

    this.state = FighterState.IDLE;
    this.stateTime = 0;

    this.combat = createCombat();

    this.intent = createIntent();
    this.animation = {
      time: 0,
      walkPhase: 0,
      walkBlend: 0,
      airBlend: 0,
    };
  }

  resetForRound(x, facing) {
    this.x = x;
    this.y = this.floorY;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing;
    this.grounded = true;
    this.health = this.stats.maxHealth;
    this.stamina = this.stats.maxStamina;
    this.flowMeter = this.stats.power?.start ?? 0;
    this.restartState(FighterState.IDLE);
    Object.assign(this.combat, createCombat());
    this.clearIntent();
    this.animation.time = 0;
    this.animation.walkPhase = 0;
    this.animation.walkBlend = 0;
    this.animation.airBlend = 0;
  }

  get flowLevel() {
    return this.stats.flowLevel;
  }

  get moves() {
    return this.stats.attacks;
  }

  get width() {
    return this.stats.body.width;
  }

  get height() {
    return this.stats.body.height;
  }

  get left() {
    return this.x - this.width / 2;
  }

  get right() {
    return this.x + this.width / 2;
  }

  get top() {
    return this.y - this.height;
  }

  get canMove() {
    return LOCOMOTION_STATES.has(this.state);
  }

  get canAct() {
    return this.grounded && (this.state === FighterState.IDLE || this.state === FighterState.WALKING);
  }

  get isAlive() {
    return this.state !== FighterState.DEAD;
  }

  setState(state) {
    if (this.state === state) {
      return;
    }
    this.state = state;
    this.stateTime = 0;
  }

  restartState(state) {
    this.state = state;
    this.stateTime = 0;
  }

  clearAttack() {
    this.combat.attack = null;
    this.combat.attackType = null;
    this.combat.hasHit = false;
    this.combat.attackConnected = false;
    this.combat.lungeApplied = false;
    this.clearPower();
  }

  clearPower() {
    this.combat.chokeTarget = -1;
    this.combat.chokeAttempted = false;
    this.combat.chokeMaxChannel = 0;
    this.combat.absorbTime = 0;
    this.combat.stormPhase = null;
    this.combat.stormMarks.length = 0;
    this.combat.stormNextStrike = 0;
    this.combat.stormTarget = -1;
    this.combat.power = null;
    this.combat.powerMode = null;
    this.combat.powerEndTime = 0;
    this.combat.powerTick = 0;
    this.combat.powerTargeted = false;
  }

  advanceStateTime(dt) {
    this.stateTime += dt;
  }

  clearIntent() {
    const { intent } = this;
    intent.moveX = 0;
    intent.jump = false;
    intent.lightAttack = false;
    intent.heavyAttack = false;
    intent.block = false;
    intent.blockPressed = false;
    intent.dodge = false;
    intent.evade = false;
    intent.special = false;
    intent.specialHeld = false;
    intent.power = false;
    intent.powerHeld = false;
  }
}
