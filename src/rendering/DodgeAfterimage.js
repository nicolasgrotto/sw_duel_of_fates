import { afterimage } from '../config/fighterVisualConfig.js';
import { FighterState } from '../entities/fighterStates.js';
import { computePose, createPose } from './fighterPose.js';
import { drawFighterBody } from './fighterRenderer.js';

function createSample() {
  return {
    time: -Infinity,
    duration: afterimage.duration,
    alpha: afterimage.alpha,
    pose: createPose(),
    ghost: { x: 0, y: 0, facing: 1, width: 0, height: 0, appearance: null },
  };
}

export class DodgeAfterimage {
  constructor() {
    this.samples = Array.from({ length: afterimage.count }, createSample);
    this.newest = -1;
    this.lastSampleTime = -Infinity;
  }

  record(fighter, pose, success = false) {
    const time = fighter.animation.time;
    const style = fighter.combat.evading || success ? afterimage.evade : afterimage;
    if ((!success && fighter.state !== FighterState.DODGING) || time - this.lastSampleTime < style.interval) {
      return;
    }

    this.lastSampleTime = time;
    this.newest = (this.newest + 1) % this.samples.length;
    const sample = this.samples[this.newest];
    sample.time = time;
    sample.duration = style.duration;
    sample.alpha = style.alpha;
    if (success) computePose(fighter, sample.pose, true);
    else Object.assign(sample.pose, pose);
    sample.ghost.x = fighter.x;
    sample.ghost.y = fighter.y;
    sample.ghost.facing = fighter.facing;
    sample.ghost.width = fighter.width;
    sample.ghost.height = fighter.height;
    sample.ghost.appearance = fighter.appearance;
  }

  draw(renderer, now, floorY) {
    for (const sample of this.samples) {
      const age = now - sample.time;
      if (age < 0 || age >= sample.duration) {
        continue;
      }
      renderer.save();
      renderer.setAlpha(sample.alpha * (1 - age / sample.duration));
      drawFighterBody(renderer, sample.ghost, sample.pose, floorY, false);
      renderer.restore();
    }
  }
}
