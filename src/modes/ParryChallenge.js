import { CombatEvent } from '../combat/combatEvents.js';

export class ParryChallenge {
  constructor({ duration, points }) {
    this.duration = duration;
    this.points = points;
    this.timeLeft = duration;
    this.score = 0;
    this.parries = 0;
    this.perfectParries = 0;
    this.hitsTaken = 0;
  }

  get isFinished() {
    return this.timeLeft <= 0;
  }

  get dummyBehavior() {
    return 'heavy';
  }

  update(dt) {
    this.timeLeft = Math.max(0, this.timeLeft - dt);
  }

  handleEvents(events, player) {
    if (this.isFinished) {
      return;
    }
    for (const event of events) {
      if (event.type === CombatEvent.PARRY && event.defender === player) {
        this.parries += 1;
        this.score += this.points.parry;
      } else if (event.type === CombatEvent.PERFECT_PARRY && event.defender === player) {
        this.perfectParries += 1;
        this.score += this.points.perfectParry;
      } else if (event.type === CombatEvent.HIT && event.defender === player) {
        this.hitsTaken += 1;
      }
    }
  }
}
