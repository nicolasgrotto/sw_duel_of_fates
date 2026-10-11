export function getMoveX(fighter) {
  return fighter.combat.confuseTime > 0 ? -fighter.intent.moveX : fighter.intent.moveX;
}
