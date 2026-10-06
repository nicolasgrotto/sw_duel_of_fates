import { afterimage } from '../config/fighterVisualConfig.js';
import { FighterState } from '../entities/fighterStates.js';
import { createPose } from './fighterPose.js';
import { drawFighterBody } from './fighterRenderer.js';

function createSample() {
  return {
    time: -Infinity,
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

  record(fighter, pose) {
    const time = fighter.animation.time;
    if (fighter.state !== FighterState.DODGING || time - this.lastSampleTime < afterimage.interval) {
      return;
    }

    this.lastSampleTime = time;
    this.newest = (this.newest + 1) % this.samples.length;
    const sample = this.samples[this.newest];
    sample.time = time;
    Object.assign(sample.pose, pose);
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
      if (age < 0 || age >= afterimage.duration) {
        continue;
      }
      renderer.save();
      renderer.setAlpha(afterimage.alpha * (1 - age / afterimage.duration));
      drawFighterBody(renderer, sample.ghost, sample.pose, floorY, false);
      renderer.restore();
    }
  }
}
