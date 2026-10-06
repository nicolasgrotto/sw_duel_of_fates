import { saberTrail } from '../config/fighterVisualConfig.js';

function createSample() {
  return { time: -Infinity, baseX: 0, baseY: 0, tipX: 0, tipY: 0 };
}

export class SaberTrail {
  constructor() {
    this.samples = Array.from({ length: saberTrail.maxSamples }, createSample);
    this.newest = -1;
    this.quad = [0, 0, 0, 0, 0, 0, 0, 0];
  }

  record(time, blade) {
    if (this.newest >= 0 && this.samples[this.newest].time === time) {
      return;
    }

    this.newest = (this.newest + 1) % this.samples.length;
    const sample = this.samples[this.newest];
    sample.time = time;
    sample.baseX = blade.baseX;
    sample.baseY = blade.baseY;
    sample.tipX = blade.tipX;
    sample.tipY = blade.tipY;
  }

  getSample(stepsBack) {
    const { length } = this.samples;
    return this.samples[(this.newest - stepsBack + length * 2) % length];
  }

  draw(renderer, now, color) {
    if (this.newest < 0) {
      return;
    }

    renderer.save();
    renderer.setBlendMode('lighter');

    for (let i = 0; i < this.samples.length - 1; i += 1) {
      const current = this.getSample(i);
      const previous = this.getSample(i + 1);
      const age = now - current.time;

      if (age >= saberTrail.duration || now - previous.time >= saberTrail.duration) {
        break;
      }

      this.setQuad(current, previous);
      renderer.setAlpha(saberTrail.alpha * (1 - age / saberTrail.duration));
      renderer.fillPolygon(this.quad, color);
    }

    renderer.restore();
  }

  setQuad(current, previous) {
    const { quad } = this;
    quad[0] = current.baseX;
    quad[1] = current.baseY;
    quad[2] = current.tipX;
    quad[3] = current.tipY;
    quad[4] = previous.tipX;
    quad[5] = previous.tipY;
    quad[6] = previous.baseX;
    quad[7] = previous.baseY;
  }
}
