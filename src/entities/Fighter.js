import { FighterState, LOCOMOTION_STATES } from './fighterStates.js';

function createIntent() {
  return {
    moveX: 0,
    jump: false,
    lightAttack: false,
    heavyAttack: false,
    block: false,
    dodge: false,
  };
}

export class Fighter {
  constructor({ id, name, stats, appearance, x, y, facing }) {
    this.id = id;
    this.name = name;
    this.stats = stats;
    this.appearance = appearance;

    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing;
    this.grounded = true;

    this.health = stats.maxHealth;
    this.stamina = stats.maxStamina;

    this.state = FighterState.IDLE;
    this.stateTime = 0;

    this.intent = createIntent();
    this.animation = {
      time: 0,
      walkPhase: 0,
      walkBlend: 0,
      airBlend: 0,
    };
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

  setState(state) {
    if (this.state === state) {
      return;
    }
    this.state = state;
    this.stateTime = 0;
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
    intent.dodge = false;
  }
}
