import { TAU, lerp } from '../utils/math.js';

function createSample() {
  return { x: 0, y: 0, state: null, stateTime: 0, time: 0, walkPhase: 0, walkBlend: 0, airBlend: 0 };
}

function readSample(fighter, sample) {
  const { animation } = fighter;
  sample.x = fighter.x;
  sample.y = fighter.y;
  sample.state = fighter.state;
  sample.stateTime = fighter.stateTime;
  sample.time = animation.time;
  sample.walkPhase = animation.walkPhase;
  sample.walkBlend = animation.walkBlend;
  sample.airBlend = animation.airBlend;
}

function writeSample(fighter, sample) {
  const { animation } = fighter;
  fighter.x = sample.x;
  fighter.y = sample.y;
  fighter.stateTime = sample.stateTime;
  animation.time = sample.time;
  animation.walkPhase = sample.walkPhase;
  animation.walkBlend = sample.walkBlend;
  animation.airBlend = sample.airBlend;
}

function copySample(from, to) {
  to.x = from.x;
  to.y = from.y;
  to.state = from.state;
  to.stateTime = from.stateTime;
  to.time = from.time;
  to.walkPhase = from.walkPhase;
  to.walkBlend = from.walkBlend;
  to.airBlend = from.airBlend;
}

function lerpAngle(from, to, amount) {
  const difference = ((((to - from) % TAU) + TAU * 1.5) % TAU) - TAU / 2;
  return (((from + difference * amount) % TAU) + TAU) % TAU;
}

function lerpForward(from, to, amount) {
  return to >= from ? lerp(from, to, amount) : to;
}

export class RenderInterpolation {
  constructor({ maxDistance }) {
    this.maxDistance = maxDistance;
    this.entries = new Map();
  }

  getEntry(fighter) {
    let entry = this.entries.get(fighter);
    if (!entry) {
      entry = { previous: createSample(), current: createSample(), actual: createSample(), blended: createSample(), ready: false };
      this.entries.set(fighter, entry);
    }
    return entry;
  }

  capture(fighters) {
    for (const fighter of fighters) {
      const entry = this.getEntry(fighter);
      copySample(entry.current, entry.previous);
      readSample(fighter, entry.current);
      if (!entry.ready) {
        copySample(entry.current, entry.previous);
        entry.ready = true;
      }
    }
  }

  blend(entry, amount) {
    const { previous, current, blended } = entry;
    const continuous = Math.hypot(current.x - previous.x, current.y - previous.y) <= this.maxDistance;
    const sameState = previous.state === current.state;
    blended.x = continuous ? lerp(previous.x, current.x, amount) : current.x;
    blended.y = continuous ? lerp(previous.y, current.y, amount) : current.y;
    blended.stateTime = sameState ? lerpForward(previous.stateTime, current.stateTime, amount) : current.stateTime;
    blended.time = lerpForward(previous.time, current.time, amount);
    blended.walkPhase = continuous ? lerpAngle(previous.walkPhase, current.walkPhase, amount) : current.walkPhase;
    blended.walkBlend = lerp(previous.walkBlend, current.walkBlend, amount);
    blended.airBlend = lerp(previous.airBlend, current.airBlend, amount);
    return blended;
  }

  apply(fighters, amount) {
    for (const fighter of fighters) {
      const entry = this.getEntry(fighter);
      readSample(fighter, entry.actual);
      if (entry.ready) {
        writeSample(fighter, this.blend(entry, amount));
      }
    }
  }

  restore(fighters) {
    for (const fighter of fighters) {
      writeSample(fighter, this.getEntry(fighter).actual);
    }
  }
}
