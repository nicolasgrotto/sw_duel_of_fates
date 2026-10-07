import { isHeavyAttack } from '../combat/attackPhases.js';
import { FighterState } from '../entities/fighterStates.js';

export class HabitMemory {
  constructor({ attackDecay, blockDecayPerSecond }) {
    this.attackDecay = attackDecay;
    this.blockDecayPerSecond = blockDecayPerSecond;
    this.heavy = 0;
    this.light = 0;
    this.blockTime = 0;
    this.totalTime = 0;
    this.lastAttack = null;
  }

  observe(opponent, dt) {
    const { attack, attackType } = opponent.combat;
    if (attack && attack !== this.lastAttack) {
      this.heavy *= this.attackDecay;
      this.light *= this.attackDecay;
      if (isHeavyAttack(attackType)) {
        this.heavy += 1;
      } else {
        this.light += 1;
      }
    }
    this.lastAttack = attack;

    const keep = Math.max(0, 1 - this.blockDecayPerSecond * dt);
    this.blockTime = this.blockTime * keep + (opponent.state === FighterState.BLOCKING ? dt : 0);
    this.totalTime = this.totalTime * keep + dt;
  }

  get heavyRatio() {
    const total = this.heavy + this.light;
    return total > 0 ? this.heavy / total : 0;
  }

  get lightRatio() {
    const total = this.heavy + this.light;
    return total > 0 ? this.light / total : 0;
  }

  get blockRatio() {
    return this.totalTime > 0 ? this.blockTime / this.totalTime : 0;
  }
}
