import { getChainStep } from '../combat/attackPhases.js';

const EITHER_ROLE = 'either';

function hasRole(goal, event, player) {
  if (goal.role === EITHER_ROLE) {
    return event.attacker === player || event.defender === player;
  }
  return event[goal.role] === player;
}

function matchesGoal(goal, event, player) {
  if (!goal.events.includes(event.type) || !hasRole(goal, event, player)) {
    return false;
  }
  if (goal.attackTypes && !goal.attackTypes.includes(event.attackType)) {
    return false;
  }
  return getChainStep(event.attackType) >= goal.minChainStep;
}

export class TutorialDirector {
  constructor(steps) {
    this.steps = steps;
    this.index = 0;
    this.progress = 0;
    this.walkedForward = false;
    this.walkedBackward = false;
  }

  get step() {
    return this.steps[this.index] ?? null;
  }

  get isFinished() {
    return this.index >= this.steps.length;
  }

  get dummyBehavior() {
    return this.step ? this.step.dummy : this.steps[this.steps.length - 1].dummy;
  }

  update(dt, player) {
    const { step } = this;
    if (step?.goal.type === 'streak') {
      this.updateStreak(step, player);
      return;
    }
    if (!step || step.goal.type !== 'move' || player.intent.moveX === 0) {
      return;
    }
    if (Math.sign(player.intent.moveX) === player.facing) {
      this.walkedForward = true;
    } else {
      this.walkedBackward = true;
    }
    if (this.walkedForward && this.walkedBackward) {
      this.advance();
    }
  }

  updateStreak(step, player) {
    this.progress = Math.min(step.count, player.combat[step.goal.field]);
    if (this.progress >= step.count) {
      this.advance();
    }
  }

  handleEvents(events, player) {
    for (const event of events) {
      const { step } = this;
      if (step?.goal.resetOn?.includes(event.type) && event.defender === player) {
        this.progress = 0;
        continue;
      }
      if (step && step.goal.type === 'event' && matchesGoal(step.goal, event, player)) {
        this.progress += 1;
        if (this.progress >= step.count) {
          this.advance();
        }
      }
    }
  }

  advance() {
    this.index += 1;
    this.progress = 0;
    this.walkedForward = false;
    this.walkedBackward = false;
  }
}
