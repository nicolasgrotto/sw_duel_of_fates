import { FighterState } from '../entities/fighterStates.js';
import { AttackPhase, getAttackPhase, isSaberAttack } from './attackPhases.js';

export function createBox() {
  return { left: 0, right: 0, top: 0, bottom: 0 };
}

export function getAttackHitbox(fighter, attack, box) {
  const { reach, top, bottom } = attack.hitbox;
  const farX = fighter.x + fighter.facing * (fighter.width / 2 + reach);

  box.left = Math.min(fighter.x, farX);
  box.right = Math.max(fighter.x, farX);
  box.top = fighter.y - fighter.height * top;
  box.bottom = fighter.y - fighter.height * bottom;
  return box;
}

export function getHurtbox(fighter, box) {
  box.left = fighter.left;
  box.right = fighter.right;
  box.top = fighter.top;
  box.bottom = fighter.y;
  return box;
}

export function boxesOverlap(a, b) {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

export function isAttackActive(fighter) {
  const { attack } = fighter.combat;
  return attack !== null && getAttackPhase(attack, fighter.stateTime) === AttackPhase.ACTIVE;
}

export function isSaberStrikeActive(fighter) {
  return isAttackActive(fighter) && isSaberAttack(fighter.combat.attackType);
}

export function hasActiveHitbox(fighter) {
  return !fighter.combat.hasHit && isAttackActive(fighter);
}

export function isInvulnerable(fighter) {
  return fighter.state === FighterState.DODGING && fighter.stateTime < fighter.combat.dodgeProfile.invulnerableTime;
}

export function hasHurtbox(fighter) {
  return fighter.isAlive && !isInvulnerable(fighter);
}
