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
    particle.x = randomRange(this.random, [this.bounds.left, this.bounds.right]);
    particle.y = this.bounds.floorY * this.random();
    particle.time = 0;
  }

  update(dt) {
    const { riseSpeed, driftSpeed, life } = this.config;
    for (const particle of this.particles) {
      particle.time += dt;
      particle.x += driftSpeed * dt;
      particle.y -= riseSpeed * dt;
      if (particle.time >= life || particle.y < 0 || particle.x > this.bounds.right) {
        this.reset(particle);
      }
    }
  }
}
