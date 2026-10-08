export function clampToArena(fighter, arena) {
  const minX = arena.left + fighter.width / 2;
  const maxX = arena.right - fighter.width / 2;

  if (fighter.x < minX) {
    fighter.x = minX;
    fighter.vx = Math.max(fighter.vx, 0);
  } else if (fighter.x > maxX) {
    fighter.x = maxX;
    fighter.vx = Math.min(fighter.vx, 0);
  }
}

export class PhysicsSystem {
  constructor({ gravity, maxFallSpeed }, arena) {
    this.gravity = gravity;
    this.maxFallSpeed = maxFallSpeed;
    this.arena = arena;
  }

  update(fighters, dt) {
    for (const fighter of fighters) {
      this.integrate(fighter, dt);
      this.resolveFloor(fighter);
      clampToArena(fighter, this.arena);
    }
  }

  integrate(fighter, dt) {
    if (!fighter.grounded) {
      fighter.vy = Math.min(fighter.vy + this.gravity * dt, this.maxFallSpeed);
    }
    fighter.x += fighter.vx * dt;
    fighter.y += fighter.vy * dt;
  }

  resolveFloor(fighter) {
    const { floorY } = this.arena;

    if (fighter.y >= floorY) {
      fighter.y = floorY;
      fighter.vy = Math.min(fighter.vy, 0);
      fighter.grounded = true;
      fighter.combat.jumpsUsed = 0;
    } else {
      fighter.grounded = false;
    }
  }
}
