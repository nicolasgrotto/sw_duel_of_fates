import { it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { EnemyAI } from '../src/ai/EnemyAI.js';
import { aiConfig } from '../src/config/aiConfig.js';
import { powersConfig } from '../src/config/powersConfig.js';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { Fighter } from '../src/entities/Fighter.js';
import { ReplayBuffer, captureFighter, restoreFighter } from '../src/simulation/ReplayBuffer.js';
import { captureProjectiles, restoreProjectiles } from '../src/combat/ProjectileSystem.js';
import { STEP, createSimulation, spawnFighter } from './helpers.js';

const RULES = { powers: true, exhaustion: true, wounds: true, focusEvade: true };

it('counts exhaustion entries by cause without counting guard-break extensions as reentry', () => {
  const fighter = spawnFighter(400);
  const { combat } = createSimulation([fighter], RULES);
  for (const [cause, field] of [['spend', 'exhaustionSpendCount'], ['block', 'exhaustionBlockCount'], ['guardBreak', 'exhaustionGuardBreakCount'], ['drain', 'exhaustionDrainCount']]) {
    fighter.resetForRound(400, 1);
    combat.spendStamina(fighter, fighter.stamina, cause);
    assert.equal(fighter.combat[field], 1);
    combat.spendStamina(fighter, 1, 'guardBreak');
    assert.equal(fighter.combat[field], 1);
    if (cause !== 'guardBreak') assert.equal(fighter.combat.exhaustionGuardBreakCount, 0);
  }
  fighter.resetForRound(400, 1);
  assert.equal(fighter.combat.exhaustionDrainCount, 0);
});

it('keeps wound counts after healing and resets every counter for a new round', () => {
  for (const [move, field] of [['heavy', 'woundArmCount'], ['forwardHeavy', 'woundLegCount']]) {
    const attacker = spawnFighter(400);
    const defender = spawnFighter(1000, -1);
    const { combat } = createSimulation([attacker, defender], RULES);
    defender.combat.exhausted = true;
    combat.applyHit({ attacker, defender, attack: attacker.moves[move], attackType: move });
    assert.equal(defender.combat[field], 1);
    combat.powers.applySelf(defender, powersConfig.powers.heal);
    combat.statuses.update([defender], powersConfig.powers.heal.duration);
    assert.equal(defender.combat.wound, null);
    assert.equal(defender.combat[field], 1);
    defender.resetForRound(1000, -1);
    assert.equal(defender.combat[field], 0);
  }
});

it('counts only paid automatic evades and effective additional wrath damage', () => {
  const attacker = spawnFighter(400);
  const defender = spawnFighter(1000, -1);
  const { combat } = createSimulation([attacker, defender], RULES);
  defender.flowMeter = 100;
  combat.powers.applySelf(defender, powersConfig.powers.focus);
  combat.resolveContact({ attacker, defender, attack: attacker.moves.light, attackType: 'light' });
  assert.equal(defender.combat.autoEvadeCount, 1);
  combat.tryEvade(defender);
  combat.resolveContact({ attacker, defender, attack: attacker.moves.light, attackType: 'light', evaded: true });
  assert.equal(defender.combat.autoEvadeCount, 1);
  combat.powers.applySelf(attacker, powersConfig.powers.wrath);
  combat.dealPowerDamage(attacker, defender, powersConfig.powers.push, 10, CombatEvent.POWER_HIT);
  assert.equal(attacker.combat.wrathExtraDamage, 2);
  combat.applyStatusDamage(defender, attacker, 1);
  assert.equal(attacker.combat.wrathExtraDamage, 2);
  defender.health = 11;
  combat.dealPowerDamage(attacker, defender, powersConfig.powers.push, 10, CombatEvent.POWER_HIT);
  assert.equal(attacker.combat.wrathExtraDamage, 3);
  attacker.resetForRound(400, 1);
  assert.equal(attacker.combat.wrathExtraDamage, 0);
  defender.resetForRound(1000, -1);
  assert.equal(defender.combat.autoEvadeCount, 0);
});

it('replays actual recorded AI intents from a snapshot with all five consequences active', () => {
  const fighters = [spawnFighter(400), spawnFighter(470, -1, 'shadow')];
  const simulation = createSimulation(fighters, RULES);
  const protectedFighter = fighters[0];
  protectedFighter.flowMeter = 100;
  protectedFighter.combat.wound = 'arm';
  protectedFighter.combat.woundUsed = true;
  simulation.combat.spendStamina(protectedFighter, protectedFighter.stamina, 'guardBreak');
  for (const id of ['heal', 'focus', 'wrath']) simulation.combat.powers.applySelf(protectedFighter, powersConfig.powers[id]);
  const ai = new EnemyAI({
    self: fighters[1], opponent: protectedFighter, rules: RULES, random: () => 0,
    perception: aiConfig.perception,
    profile: { ...aiConfig.profiles.balanced, priorities: ['attack'], attackChance: 1, heavyChance: 0 },
    difficulty: { ...aiConfig.difficulties.normal, mistakeChance: 0, attackTell: 0, defenseMultiplier: 0 },
  });
  const buffer = new ReplayBuffer({ frames: 90, snapshotInterval: 15 });
  for (let step = 0; step < 150; step += 1) {
    fighters.forEach((fighter) => fighter.clearIntent());
    ai.updateIntent(fighters[1].intent, STEP);
    buffer.record(fighters, STEP, simulation.projectiles);
    simulation.step(STEP);
  }
  const playback = buffer.createPlayback();
  const active = playback.snapshot.fighters[0].combat;
  assert.equal(active.exhausted, true);
  assert.equal(active.wound, 'arm');
  for (const effect of ['heal', 'focus', 'wrath']) assert.ok(active[`${effect}Time`] > 0, effect);
  const clones = fighters.map((fighter, index) => {
    const clone = new Fighter({ id: fighter.id, name: fighter.name, stats: fighter.stats, appearance: fighter.appearance, sound: fighter.sound, x: fighter.x, y: fighter.floorY, facing: fighter.facing });
    restoreFighter(clone, playback.snapshot.fighters[index]);
    return clone;
  });
  const replay = createSimulation(clones, RULES);
  restoreProjectiles(replay.projectiles, playback.snapshot.projectiles);
  for (let step = playback.firstStep; step < playback.lastStep; step += 1) replay.step(buffer.readStep(step, clones));
  assert.deepEqual(clones.map(captureFighter), fighters.map(captureFighter));
  assert.deepEqual(captureProjectiles(replay.projectiles), captureProjectiles(simulation.projectiles));
  assert.ok(protectedFighter.combat.autoEvadeCount > 0);
});

it('reports the new simulator counters only with new rules or an equipped wrath', () => {
  const args = ['tools/simulate.js', '--duels', '1', '--maxSeconds', '0.1'];
  const legacy = execFileSync(process.execPath, args, { encoding: 'utf8' });
  assert.doesNotMatch(legacy, /avg exhaustion|avg wounds|avg auto evades|avg wrath extra damage/);
  const expanded = execFileSync(process.execPath, [...args, '--rules', 'powers,exhaustion,wounds,focusEvade'], { encoding: 'utf8' });
  assert.match(expanded, /avg exhaustion: spend 0.00  block 0.00  guardBreak 0.00  drain 0.00/);
  assert.match(expanded, /avg wounds: arm 0.00  leg 0.00/);
  assert.match(expanded, /avg auto evades: 0.00/);
  assert.match(expanded, /avg wrath extra damage: 0.00/);
  const wrath = execFileSync(process.execPath, [...args, '--rules', 'powers', '--set', 'loadouts.shadow.powers.forward=wrath'], { encoding: 'utf8' });
  assert.match(wrath, /avg wrath extra damage:/);
});
