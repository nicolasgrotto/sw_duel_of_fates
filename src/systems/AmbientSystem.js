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
    const { riseSpeed, driftSpeed, life, area } = this.config;
    for (const particle of this.particles) {
      particle.time += dt;
      particle.x += driftSpeed * dt;
      particle.y -= riseSpeed * dt;
      if (particle.time >= life || particle.y < area[0] || particle.y > area[1] || particle.x > this.bounds.right) {
        this.reset(particle);
      }
    }
  }
}
