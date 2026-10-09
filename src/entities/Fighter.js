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
    passThrough: false,
    armorHits: 0,
    chargeTime: 0,
    fallDirection: 0,
    staminaRegenDelay: 0,
    bufferedAction: null,
    bufferTime: 0,
    parryArmed: false,
    parryTime: 0,
    parryLockout: 0,
    riposteTime: 0,
    power: null,
    powerEndTime: 0,
    powerTick: 0,
    powerTargeted: false,
    powerCooldown: 0,
    redirectTime: 0,
    powerTargetX: 0,
    powerTargetY: 0,
    statusLevel: 0,
    chokeTime: 0,
    chokeDamageRate: 0,
    freezeTime: 0,
    focusTime: 0,
    focusScale: 1,
    healTime: 0,
    healRate: 0,
    healCap: 0,
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
    this.combat.redirectTime = 0;
    this.combat.power = null;
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
