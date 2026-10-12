import { it } from 'node:test';
import assert from 'node:assert/strict';
import { CombatSystem } from '../src/combat/CombatSystem.js';
import { motionStyles } from '../src/config/fighterVisualConfig.js';
import { computePose, createPose, getEvadeVariant } from '../src/rendering/fighterPose.js';
import { arena, combatConfig, spawnStandardFighter } from './helpers.js';

it('alternates the evade pose with the streak and shows the evading variant on success', () => {
  const fighter = spawnStandardFighter(500, 1);
  const combat = new CombatSystem(arena, combatConfig);
  const variants = motionStyles.standard.evade;
  combat.tryEvade(fighter);
  fighter.stateTime = 0;
  const angles = [];
  for (let streak = 0; streak < variants.length; streak += 1) {
    fighter.combat.evadeStreak = streak;
    assert.equal(getEvadeVariant(fighter), variants[streak]);
    angles.push(computePose(fighter, createPose()).shoulderX);
  }
  assert.equal(new Set(angles).size, variants.length);
  fighter.combat.evadeStreak = variants.length;
  assert.equal(getEvadeVariant(fighter), variants[0]);
  assert.equal(getEvadeVariant(fighter, true), variants[variants.length - 1]);
});

it('keeps the first evade pose of the standard style identical to the v2 pose', () => {
  assert.deepEqual(motionStyles.standard.evade[0], { lean: -22, crouch: 8, bladeOffset: 0 });
});
