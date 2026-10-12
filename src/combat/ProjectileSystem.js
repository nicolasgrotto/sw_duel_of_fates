import { ProjectileKind } from '../config/projectilesConfig.js';
import { FighterState } from '../entities/fighterStates.js';
import { CombatEvent } from './combatEvents.js';
import { resolveLevelBand } from './flowInteractions.js';
import { boxesOverlap, createBox, getHurtbox, isBladeInvulnerable, isInvulnerable } from './hitboxes.js';
import { isBarrierUp } from './PowerSystem.js';
import { isStormShieldUp } from './StormSystem.js';

function createProjectile() {
  return {
    active: false,
    kind: null,
    owner: -1,
    source: null,
    x: 0,
    y: 0,
    vx: 0,
    originX: 0,
    radius: 0,
    damage: 0,
    knockback: 0,
    stagger: 0,
    age: 0,
    returning: false,
    hit: false,
    reflected: false,
    distance: 0,
    range: Infinity,
    potency: null,
    level: 0,
  };
}

export function captureProjectiles(system) {
  return system.pool.map((projectile) => ({ ...projectile }));
}

export function restoreProjectiles(system, snapshot) {
  for (let i = 0; i < system.pool.length; i += 1) {
    Object.assign(system.pool[i], snapshot?.[i] ?? createProjectile());
  }
}

export function isSaberThrown(fighter) {
  return fighter.combat.saberThrown;
}

export class ProjectileSystem {
  constructor(combat, config) {
    this.combat = combat;
    this.config = config;
    this.pool = Array.from({ length: config.capacity }, createProjectile);
    this.fighters = [];
    this.box = createBox();
    this.hurtbox = createBox();
    this.contact = { attacker: null, defender: null, attack: null, attackType: null, evaded: false, x: 0, y: 0, damage: 0, armored: false };
  }

  clear() {
    for (const projectile of this.pool) {
      Object.assign(projectile, createProjectile());
    }
  }

  get activeCount() {
    let count = 0;
    for (const projectile of this.pool) {
      if (projectile.active) count += 1;
    }
    return count;
  }

  acquire(owner, kind, source) {
    const projectile = this.pool.find((candidate) => !candidate.active);
    if (!projectile) {
      return null;
    }
    projectile.active = true;
    projectile.kind = kind;
    projectile.owner = this.fighters.indexOf(owner);
    projectile.source = source;
    projectile.x = owner.x + owner.facing * owner.width / 2;
    projectile.y = owner.y - owner.height * this.config.height;
    projectile.originX = projectile.x;
    projectile.age = 0;
    projectile.returning = false;
    projectile.hit = false;
    projectile.reflected = false;
    projectile.distance = 0;
    projectile.range = Infinity;
    projectile.potency = null;
    return projectile;
  }

  spawnThrow(caster, power) {
    const size = resolveLevelBand(caster.flowLevel, this.config.throw.sizes);
    const projectile = this.acquire(caster, ProjectileKind.THROW, power.id);
    if (!projectile) {
      return;
    }
    projectile.vx = caster.facing * size.speed;
    projectile.radius = size.radius;
    projectile.level = caster.flowLevel;
    projectile.damage = size.damage;
    projectile.knockback = size.knockback;
    projectile.stagger = size.stagger;
  }

  spawnArsenal(caster, power, x, y) {
    const projectile = this.acquire(caster, ProjectileKind.THROW, power.id);
    if (!projectile) return null;
    const data = this.config.arsenal;
    projectile.x = x;
    projectile.y = y;
    projectile.vx = caster.facing * data.speed;
    projectile.radius = data.radius;
    projectile.damage = data.damage;
    projectile.knockback = data.knockback;
    projectile.stagger = data.stagger;
    return projectile;
  }

  spawnWave(caster, power) {
    const projectile = this.acquire(caster, ProjectileKind.WAVE, power.id);
    if (!projectile) return null;
    const data = this.config.wave;
    projectile.vx = caster.facing * data.speed;
    projectile.radius = power.waveByTier ? resolveLevelBand(caster.flowLevel, power.waveByTier).radius : data.radius;
    projectile.damage = data.damage;
    projectile.knockback = data.knockback;
    projectile.stagger = data.stagger;
    projectile.range = power.range;
    projectile.potency = caster.stats.power.potency;
    return projectile;
  }

  spawnSaber(owner, attackType) {
    const { saber } = this.config;
    const projectile = this.acquire(owner, ProjectileKind.SABER, attackType);
    if (!projectile) {
      return;
    }
    projectile.vx = owner.facing * saber.speed;
    projectile.radius = saber.radius;
    owner.combat.saberThrown = true;
  }

  update(fighters, dt) {
    this.fighters = fighters;
    for (const projectile of this.pool) {
      if (projectile.active) {
        this.advance(projectile, dt);
      }
    }
  }

  advance(projectile, dt) {
    projectile.age += dt;
    if (projectile.kind === ProjectileKind.SABER) {
      this.steerSaber(projectile, dt);
    }
    const travel = projectile.kind === ProjectileKind.WAVE ? Math.min(Math.abs(projectile.vx * dt), projectile.range - projectile.distance) : Math.abs(projectile.vx * dt);
    projectile.x += Math.sign(projectile.vx) * travel;
    projectile.distance += travel;
    if (!projectile.active) {
      return;
    }
    if (projectile.kind !== ProjectileKind.SABER && this.isOutside(projectile)) {
      this.release(projectile);
      return;
    }
    if (projectile.kind === ProjectileKind.THROW && projectile.age >= this.config.throw.maxLifetime) {
      this.release(projectile);
      return;
    }
    this.checkHit(projectile);
    if (projectile.kind === ProjectileKind.WAVE && projectile.distance >= projectile.range) this.release(projectile);
  }

  isOutside(projectile) {
    const { arena } = this.combat;
    return projectile.x - projectile.radius <= arena.left || projectile.x + projectile.radius >= arena.right;
  }

  steerSaber(projectile, dt) {
    const owner = this.fighters[projectile.owner];
    const { saber } = this.config;
    if (!owner || projectile.age >= saber.maxLifetime) {
      this.release(projectile);
      return;
    }
    if (!projectile.returning && (Math.abs(projectile.x - projectile.originX) >= owner.moves[projectile.source].throwRange || this.isOutside(projectile))) {
      this.turnBack(projectile);
    }
    if (!projectile.returning) {
      return;
    }
    const direction = Math.sign(owner.x - projectile.x);
    projectile.vx = direction * saber.speed;
    const targetY = owner.y - owner.height * this.config.height;
    projectile.y += (targetY - projectile.y) * Math.min(1, saber.returnHeightRate * dt);
    if (Math.abs(owner.x - projectile.x) <= owner.width / 2 + saber.speed * dt) {
      this.release(projectile);
    }
  }

  turnBack(projectile) {
    projectile.returning = true;
    projectile.hit = false;
  }

  release(projectile) {
    if (projectile.kind === ProjectileKind.SABER) {
      const owner = this.fighters[projectile.owner];
      if (owner) owner.combat.saberThrown = false;
    }
    projectile.active = false;
  }

  checkHit(projectile) {
    if (projectile.hit) {
      return;
    }
    const owner = this.fighters[projectile.owner];
    const { box } = this;
    box.left = projectile.x - projectile.radius;
    box.right = projectile.x + projectile.radius;
    box.top = projectile.y - projectile.radius;
    box.bottom = projectile.y + projectile.radius;
    for (const target of this.fighters) {
      if (target === owner || !target.isAlive || isInvulnerable(target) || projectile.kind === ProjectileKind.SABER && isBladeInvulnerable(target) || !boxesOverlap(box, getHurtbox(target, this.hurtbox))) {
        continue;
      }
      if (this.combat.powers.arsenals.block(target, projectile, owner)) return;
      if (projectile.kind === ProjectileKind.WAVE && this.reflectWave(projectile, owner, target)) return;
      projectile.hit = true;
      if (projectile.kind !== ProjectileKind.SABER) {
        this.combat.powers.strike(owner, target, this.combat.powers.config.powers[projectile.source], 'impact', projectile);
        this.release(projectile);
      } else {
        this.strikeWithSaber(projectile, owner, target);
      }
      return;
    }
  }

  reflectWave(projectile, owner, target) {
    if (projectile.reflected || target.combat.absorbTime > 0 || isBarrierUp(target) || isStormShieldUp(target)
      || target.state !== FighterState.BLOCKING || target.combat.saberThrown || !target.combat.parryArmed
      || target.combat.parryTime >= target.stats.parry.perfectWindow || Math.sign(projectile.vx) !== -target.facing) return false;
    projectile.owner = this.fighters.indexOf(target);
    projectile.vx = -projectile.vx;
    projectile.reflected = true;
    target.combat.parryArmed = false;
    target.combat.parryLockout = target.stats.parry.lockout;
    this.combat.emit(CombatEvent.WAVE_REFLECT, { attacker: target, defender: owner, attackType: projectile.source, x: projectile.x, y: projectile.y });
    return true;
  }

  strikeWithSaber(projectile, owner, target) {
    const { contact, combat } = this;
    contact.attacker = owner;
    contact.defender = target;
    contact.attack = owner.moves[projectile.source];
    contact.attackType = projectile.source;
    contact.x = projectile.x;
    contact.y = projectile.y;
    contact.damage = 0;
    contact.armored = false;
    if (isBarrierUp(target) || isStormShieldUp(target)) {
      combat.emit(CombatEvent.POWER_ABSORBED, contact);
    } else if (target.state === FighterState.BLOCKING && Math.sign(projectile.vx) === -target.facing) {
      combat.resolveBlock(contact);
    } else {
      combat.applyHit(contact);
    }
    if (!projectile.returning) {
      this.turnBack(projectile);
      projectile.hit = true;
    }
  }
}
