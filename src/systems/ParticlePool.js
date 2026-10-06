function createParticle() {
  return {
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    maxLife: 0,
    size: 0,
    color: '',
  };
}

export class ParticlePool {
  constructor(capacity) {
    this.particles = Array.from({ length: capacity }, createParticle);
    this.activeCount = 0;
    this.cursor = 0;
  }

  acquire() {
    const { particles } = this;

    for (let checked = 0; checked < particles.length; checked += 1) {
      const particle = particles[this.cursor];
      this.cursor = (this.cursor + 1) % particles.length;

      if (!particle.active) {
        particle.active = true;
        this.activeCount += 1;
        return particle;
      }
    }
    return null;
  }

  update(dt, { gravity, drag }) {
    const damping = Math.exp(-drag * dt);

    for (const particle of this.particles) {
      if (!particle.active) {
        continue;
      }

      particle.life -= dt;
      if (particle.life <= 0) {
        particle.active = false;
        this.activeCount -= 1;
        continue;
      }

      particle.vy += gravity * dt;
      particle.vx *= damping;
      particle.vy *= damping;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
    }
  }
}
