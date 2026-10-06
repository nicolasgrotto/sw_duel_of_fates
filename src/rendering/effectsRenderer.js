export function drawImpactLights(renderer, lights) {
  renderer.save();
  renderer.setBlendMode('lighter');
  for (const light of lights) {
    if (light.active) {
      renderer.drawGlow(light.x, light.y, light.radius, light.color, light.alpha);
    }
  }
  renderer.restore();
}

export function drawParticles(renderer, particles, streakTime) {
  renderer.save();
  renderer.setBlendMode('lighter');
  for (const particle of particles) {
    if (!particle.active) {
      continue;
    }
    renderer.setAlpha(particle.life / particle.maxLife);
    renderer.line(
      particle.x,
      particle.y,
      particle.x - particle.vx * streakTime,
      particle.y - particle.vy * streakTime,
      particle.color,
      particle.size,
    );
  }
  renderer.restore();
}

export function drawFlash(renderer, flash) {
  if (flash.alpha <= 0) {
    return;
  }
  renderer.save();
  renderer.setBlendMode('lighter');
  renderer.setAlpha(flash.alpha);
  renderer.fillRect(0, 0, renderer.width, renderer.height, flash.color);
  renderer.restore();
}
