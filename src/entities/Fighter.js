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
  };
}

function createCombat() {
  return {
    attack: null,
    attackType: null,
    hasHit: false,
    attackConnected: false,
    airAttackUsed: false,
    lungeApplied: false,
    stunDuration: 0,
    blockstun: 0,
    dodgeDirection: 0,
    fallDirection: 0,
    staminaRegenDelay: 0,
    bufferedAction: null,
    bufferTime: 0,
    parryArmed: false,
    parryTime: 0,
    parryLockout: 0,
    riposteTime: 0,
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
    this.restartState(FighterState.IDLE);
    Object.assign(this.combat, createCombat());
    this.clearIntent();
    this.animation.time = 0;
    this.animation.walkPhase = 0;
    this.animation.walkBlend = 0;
    this.animation.airBlend = 0;
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
  }
}
