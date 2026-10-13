import { randomRange } from '../utils/random.js';

export class AmbientSystem {
  constructor(config, bounds, random) {
    this.config = config;
    this.bounds = bounds;
    this.random = random;
    this.particles = Array.from({ length: config.count }, () => ({ x: 0, y: 0, time: 0 }));
    for (const particle of this.particles) {
      this.reset(particle);
      particle.time = random() * config.life;
    }
  }

  reset(particle) {
    const [top, bottom] = this.config.area;
    particle.x = randomRange(this.random, [this.bounds.left, this.bounds.right]);
    particle.y = randomRange(this.random, [top, bottom]);
    particle.time = 0;
  }

  update(dt) {
    const { riseSpeed, driftSpeed, life, area, wrapMargin } = this.config;
    for (const particle of this.particles) {
      particle.time += dt;
      particle.x += driftSpeed * dt;
      particle.y -= riseSpeed * dt;
      if (wrapMargin !== undefined) {
        this.wrap(particle, wrapMargin);
      }
      if (particle.time >= life || particle.y < area[0] || particle.y > area[1] || this.isOutside(particle.x, wrapMargin)) {
        this.reset(particle);
      }
    }
  }

  wrap(particle, margin) {
    const { left, right } = this.bounds;
    const span = right - left + margin * 2;
    if (particle.x < left - margin) {
      particle.x += span;
    } else if (particle.x > right + margin) {
      particle.x -= span;
    }
  }

  isOutside(x, wrapMargin) {
    return wrapMargin === undefined && x > this.bounds.right;
  }
}
