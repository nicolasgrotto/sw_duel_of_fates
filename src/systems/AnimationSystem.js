import { TAU, clamp, smoothTowards } from '../utils/math.js';

function wrapAngle(angle) {
  return ((angle % TAU) + TAU) % TAU;
}

export class AnimationSystem {
  constructor({ strideLength, walkBlendRate, airBlendRate }) {
    this.strideLength = strideLength;
    this.walkBlendRate = walkBlendRate;
    this.airBlendRate = airBlendRate;
  }

  update(fighters, dt) {
    for (const fighter of fighters) {
      this.updateFighter(fighter, dt);
    }
  }

  updateFighter(fighter, dt) {
    const { animation } = fighter;
    const forwardSpeed = fighter.vx * fighter.facing;
    const speedRatio = clamp(Math.abs(fighter.vx) / fighter.stats.movement.walkSpeed, 0, 1);
    const walkTarget = fighter.grounded ? speedRatio : 0;
    const airTarget = fighter.grounded ? 0 : 1;

    animation.time += dt;
    if (fighter.grounded) {
      animation.walkPhase = wrapAngle(animation.walkPhase + ((forwardSpeed * dt) / this.strideLength) * Math.PI);
    }
    animation.walkBlend = smoothTowards(animation.walkBlend, walkTarget, this.walkBlendRate, dt);
    animation.airBlend = smoothTowards(animation.airBlend, airTarget, this.airBlendRate, dt);
  }
}
