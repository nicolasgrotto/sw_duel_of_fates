import { captureProjectiles } from '../combat/ProjectileSystem.js';
import { decodeIntent, encodeIntent } from '../controllers/IntentRecorder.js';

export const REPLAY_STATIC_FIELDS = Object.freeze(['id', 'name', 'stats', 'appearance', 'sound', 'floorY', 'intent']);

const ABSOLUTE_FACING = 1;

export function captureFighter(fighter) {
  return {
    x: fighter.x,
    y: fighter.y,
    vx: fighter.vx,
    vy: fighter.vy,
    facing: fighter.facing,
    grounded: fighter.grounded,
    health: fighter.health,
    stamina: fighter.stamina,
    flowMeter: fighter.flowMeter,
    state: fighter.state,
    stateTime: fighter.stateTime,
    combat: { ...fighter.combat },
    animation: { ...fighter.animation },
  };
}

export function restoreFighter(fighter, snapshot) {
  const { combat, animation, ...scalars } = snapshot;
  Object.assign(fighter, scalars);
  Object.assign(fighter.combat, combat);
  Object.assign(fighter.animation, animation);
  fighter.clearIntent();
}

export class ReplayBuffer {
  constructor({ frames, snapshotInterval }, fighterCount = 2) {
    this.frames = frames;
    this.snapshotInterval = snapshotInterval;
    this.intents = Array.from({ length: fighterCount }, () => new Uint16Array(frames));
    this.steps = new Float64Array(frames);
    this.snapshots = Array.from({ length: Math.ceil(frames / snapshotInterval) + 1 }, () => null);
    this.count = 0;
  }

  record(fighters, dt, projectiles = null) {
    if (this.count % this.snapshotInterval === 0) {
      const slot = (this.count / this.snapshotInterval) % this.snapshots.length;
      this.snapshots[slot] = { step: this.count, fighters: fighters.map(captureFighter), projectiles: projectiles ? captureProjectiles(projectiles) : null };
    }
    const index = this.count % this.frames;
    for (let i = 0; i < fighters.length; i += 1) {
      this.intents[i][index] = encodeIntent(fighters[i].intent, ABSOLUTE_FACING);
    }
    this.steps[index] = dt;
    this.count += 1;
  }

  clear() {
    this.count = 0;
    this.snapshots.fill(null);
  }

  findStartSnapshot() {
    const oldestStep = Math.max(0, this.count - this.frames);
    let start = null;
    for (const snapshot of this.snapshots) {
      if (snapshot && snapshot.step >= oldestStep && snapshot.step < this.count && (!start || snapshot.step < start.step)) {
        start = snapshot;
      }
    }
    return start;
  }

  hasReplay() {
    return this.findStartSnapshot() !== null;
  }

  createPlayback() {
    const start = this.findStartSnapshot();
    return { snapshot: start, firstStep: start.step, lastStep: this.count, buffer: this };
  }

  readStep(step, fighters) {
    const index = step % this.frames;
    for (let i = 0; i < fighters.length; i += 1) {
      decodeIntent(this.intents[i][index], fighters[i].intent, ABSOLUTE_FACING);
    }
    return this.steps[index];
  }
}
