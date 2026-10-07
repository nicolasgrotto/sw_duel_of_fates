import { FighterState } from '../entities/fighterStates.js';
import { clampToArena } from './PhysicsSystem.js';

function horizontalOverlap(a, b) {
  return Math.min(a.right, b.right) - Math.max(a.left, b.left);
}

function overlapsVertically(a, b) {
  return a.top < b.y && b.top < a.y;
}

function isPassingThrough(fighter) {
  return fighter.state === FighterState.DODGING && fighter.combat.passThrough;
}

function isAtLeftWall(fighter, arena) {
  return fighter.left <= arena.left;
}

export class CollisionSystem {
  constructor(arena) {
    this.arena = arena;
  }

  update(fighters) {
    for (let i = 0; i < fighters.length; i += 1) {
      for (let j = i + 1; j < fighters.length; j += 1) {
        this.separate(fighters[i], fighters[j]);
      }
    }
  }

  separate(a, b) {
    const overlap = horizontalOverlap(a, b);
    if (overlap <= 0 || !overlapsVertically(a, b) || isPassingThrough(a) || isPassingThrough(b)) {
      return;
    }

    const left = a.x <= b.x ? a : b;
    const right = left === a ? b : a;

    left.x -= overlap / 2;
    right.x += overlap / 2;
    clampToArena(left, this.arena);
    clampToArena(right, this.arena);

    const remaining = horizontalOverlap(left, right);
    if (remaining <= 0) {
      return;
    }

    if (isAtLeftWall(left, this.arena)) {
      right.x += remaining;
    } else {
      left.x -= remaining;
    }
  }
}
