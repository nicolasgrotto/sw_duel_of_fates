import { FighterState } from '../entities/fighterStates.js';
import { approach } from '../utils/math.js';

function findOpponent(fighter, fighters) {
  for (const other of fighters) {
    if (other !== fighter) {
      return other;
    }
  }
  return null;
}

export class MovementSystem {
  constructor({ restingSpeed, actionFriction }) {
    this.restingSpeed = restingSpeed;
    this.actionFriction = actionFriction;
  }

  applyIntents(fighters, dt) {
    for (const fighter of fighters) {
      if (fighter.state === FighterState.BLOCKING && fighter.stats.blockWalkSpeed > 0) {
        this.applyBlockWalk(fighter, dt);
        continue;
      }
      if (!fighter.canMove) {
        this.applyActionFriction(fighter, dt);
        continue;
      }
      this.faceOpponent(fighter, findOpponent(fighter, fighters));
      this.applyJump(fighter);
      this.applyHorizontalMovement(fighter, dt);
    }
  }

  updateStates(fighters) {
    for (const fighter of fighters) {
      if (!fighter.canMove) {
        continue;
      }
      fighter.setState(this.resolveLocomotionState(fighter));
    }
  }

  applyActionFriction(fighter, dt) {
    if (fighter.state === FighterState.DODGING || (!fighter.grounded && fighter.combat.attack?.airborne)) {
      return;
    }
    fighter.vx = approach(fighter.vx, 0, this.actionFriction * dt);
  }

  applyBlockWalk(fighter, dt) {
    const targetSpeed = fighter.intent.moveX * fighter.stats.blockWalkSpeed;
    fighter.vx = approach(fighter.vx, targetSpeed, fighter.stats.movement.groundAcceleration * dt);
  }

  faceOpponent(fighter, opponent) {
    if (!opponent || !fighter.grounded || opponent.x === fighter.x) {
      return;
    }
    fighter.facing = opponent.x > fighter.x ? 1 : -1;
  }

  applyJump(fighter) {
    if (!fighter.intent.jump || !fighter.grounded) {
      return;
    }
    fighter.vy = -fighter.stats.movement.jumpVelocity;
    fighter.grounded = false;
  }

  applyHorizontalMovement(fighter, dt) {
    const { movement } = fighter.stats;
    const { moveX } = fighter.intent;
    const movingBackward = moveX !== 0 && Math.sign(moveX) !== fighter.facing;
    const speedMultiplier = movingBackward ? movement.backwardSpeedMultiplier : 1;
    const targetSpeed = moveX * movement.walkSpeed * speedMultiplier;

    fighter.vx = approach(fighter.vx, targetSpeed, this.getAcceleration(fighter) * dt);
  }

  getAcceleration(fighter) {
    const { movement } = fighter.stats;

    if (!fighter.grounded) {
      return movement.airAcceleration;
    }
    return fighter.intent.moveX === 0 ? movement.groundDeceleration : movement.groundAcceleration;
  }

  resolveLocomotionState(fighter) {
    if (!fighter.grounded) {
      return FighterState.JUMPING;
    }
    if (fighter.intent.moveX !== 0 || Math.abs(fighter.vx) > this.restingSpeed) {
      return FighterState.WALKING;
    }
    return FighterState.IDLE;
  }
}
