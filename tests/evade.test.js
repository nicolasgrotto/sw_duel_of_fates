import { it } from 'node:test';
import assert from 'node:assert/strict';
import { CombatSystem } from '../src/combat/CombatSystem.js';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { isInvulnerable } from '../src/combat/hitboxes.js';
import { evadeConfig } from '../src/config/evadeConfig.js';
import { captureFighter, ReplayBuffer, restoreFighter } from '../src/simulation/ReplayBuffer.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { STEP, arena, combatConfig, createSimulation, spawnFighter } from './helpers.js';

it('starts a free short evade and leaves recovery vulnerable until its end', () => {
  const fighter = spawnFighter(500);
  fighter.stamina = 0;
  const combat = new CombatSystem(arena, combatConfig);
  assert.equal(combat.tryEvade(fighter), true);
  assert.equal(fighter.stamina, 0);
  assert.equal(fighter.state, FighterState.DODGING);
  assert.equal(isInvulnerable(fighter), true);
  fighter.stateTime = evadeConfig.profile.invulnerableTime;
  assert.equal(isInvulnerable(fighter), false);
  combat.applyActionMovement(fighter);
  assert.equal(fighter.vx, 0);
  fighter.stateTime = evadeConfig.profile.duration - STEP;
  combat.updateTimers(fighter, STEP);
  assert.equal(fighter.state, FighterState.DODGING);
  fighter.stateTime = evadeConfig.profile.duration;
  combat.updateTimers(fighter, STEP);
  assert.equal(fighter.state, FighterState.IDLE);
});

function contactSetup(time) {
  const attacker = spawnFighter(500);
  const defender = spawnFighter(560, -1, 'shadow');
  const combat = new CombatSystem(arena, combatConfig);
  combat.tryAttack(attacker, 'light');
  attacker.stateTime = attacker.moves.light.startup;
  combat.tryEvade(defender);
  defender.stateTime = time;
  return { attacker, defender, combat };
}

it('emits one success for a real overlap and immediately frees the defender', () => {
  const { attacker, defender, combat } = contactSetup(0);
  const health = defender.health;
  combat.resolveHits([attacker, defender]);
  assert.equal(defender.health, health);
  assert.equal(defender.state, FighterState.IDLE);
  assert.equal(defender.combat.evadeSucceeded, true);
  assert.equal(attacker.combat.hasHit, true);
  assert.equal(combat.events.filter(e => e.type === CombatEvent.EVADE_SUCCESS).length, 1);
  combat.resolveHits([attacker, defender]);
  assert.equal(defender.health, health);
  assert.equal(combat.events.filter(e => e.type === CombatEvent.EVADE_SUCCESS).length, 1);
});

it('takes a hit during unsuccessful recovery and does not reward a distant miss', () => {
  const { attacker, defender, combat } = contactSetup(evadeConfig.profile.invulnerableTime);
  combat.resolveHits([attacker, defender]);
  assert.ok(defender.health < defender.stats.maxHealth);
  assert.equal(defender.state, FighterState.HIT);
  const distant = contactSetup(0);
  distant.attacker.x = 200;
  distant.combat.resolveHits([distant.attacker, distant.defender]);
  assert.equal(distant.defender.state, FighterState.DODGING);
  assert.equal(distant.combat.events.some(e => e.type === CombatEvent.EVADE_SUCCESS), false);
});

it('respects the enabled flag and complete archetype override without changing dash', () => {
  const fighter = spawnFighter(500);
  const combat = new CombatSystem(arena, combatConfig);
  const enabled = evadeConfig.enabled;
  try {
    evadeConfig.enabled = false;
    assert.equal(combat.tryEvade(fighter), false);
    assert.equal(combat.tryDodge(fighter), true);
  } finally {
    evadeConfig.enabled = enabled;
  }
  fighter.stats.evade = { ...evadeConfig.profile, duration: 0.6 };
  assert.equal(combat.tryEvade(fighter), true);
  assert.equal(fighter.combat.dodgeProfile.duration, 0.6);
});

it('replays evade contacts and timers to the exact full snapshot', () => {
  const fighters = [spawnFighter(500), spawnFighter(560, -1, 'shadow')];
  const sim = createSimulation(fighters);
  const buffer = new ReplayBuffer({ frames: 120, snapshotInterval: 30 });
  for (let step = 0; step < 100; step++) {
    fighters[0].intent.lightAttack = step === 0 || step === 45;
    fighters[1].intent.evade = step === 6 || step === 30;
    buffer.record(fighters, STEP);
    sim.step(STEP);
    fighters.forEach(f => f.clearIntent());
  }
  const playback = buffer.createPlayback();
  const clones = [spawnFighter(500), spawnFighter(560, -1, 'shadow')];
  clones.forEach((f, i) => restoreFighter(f, playback.snapshot.fighters[i]));
  const replay = createSimulation(clones);
  for (let step = playback.firstStep; step < playback.lastStep; step++) replay.step(buffer.readStep(step, clones));
  assert.deepEqual(clones.map(captureFighter), fighters.map(captureFighter));
});

function evadeNextAttack(attacker, defender, combat) {
  attacker.restartState(FighterState.IDLE);
  attacker.clearAttack();
  defender.restartState(FighterState.IDLE);
  combat.tryAttack(attacker, 'light');
  attacker.stateTime = attacker.moves.light.startup;
  combat.tryEvade(defender);
  defender.stateTime = 0;
  combat.resolveHits([attacker, defender]);
}

it('counts consecutive manual evade successes, one per contact', () => {
  const { attacker, defender, combat } = contactSetup(0);
  combat.resolveHits([attacker, defender]);
  combat.resolveHits([attacker, defender]);
  assert.equal(defender.combat.evadeStreak, 1);
  evadeNextAttack(attacker, defender, combat);
  evadeNextAttack(attacker, defender, combat);
  assert.equal(defender.combat.evadeStreak, 3);
  assert.equal(combat.events.filter((event) => event.type === CombatEvent.EVADE_SUCCESS).length, 3);
});

it('breaks the evade streak on a failed evade, damage, attacking and round reset', () => {
  const failed = contactSetup(0);
  failed.combat.resolveHits([failed.attacker, failed.defender]);
  failed.combat.tryEvade(failed.defender);
  failed.defender.stateTime = failed.defender.combat.dodgeProfile.duration;
  failed.combat.updateTimers(failed.defender, STEP);
  assert.equal(failed.defender.combat.evadeStreak, 0);
  assert.equal(failed.defender.state, FighterState.IDLE);

  const hit = contactSetup(evadeConfig.profile.invulnerableTime);
  hit.defender.combat.evadeStreak = 2;
  hit.combat.resolveHits([hit.attacker, hit.defender]);
  assert.equal(hit.defender.combat.evadeStreak, 0);

  const attack = contactSetup(0);
  attack.combat.resolveHits([attack.attacker, attack.defender]);
  attack.combat.tryAttack(attack.defender, 'light');
  assert.equal(attack.defender.combat.evadeStreak, 0);

  const round = contactSetup(0);
  round.combat.resolveHits([round.attacker, round.defender]);
  round.defender.resetForRound(560, -1);
  assert.equal(round.defender.combat.evadeStreak, 0);
});

it('replays a run of evade successes from a snapshot taken mid-sequence', () => {
  const fighters = [spawnFighter(500), spawnFighter(560, -1, 'shadow')];
  const sim = createSimulation(fighters);
  const buffer = new ReplayBuffer({ frames: 200, snapshotInterval: 30 });
  const attackSteps = [0, 50, 100];
  const evadeSteps = attackSteps.map((step) => step + 6);
  let maxStreak = 0;
  for (let step = 0; step < 150; step++) {
    fighters[0].intent.lightAttack = attackSteps.includes(step);
    fighters[1].intent.evade = evadeSteps.includes(step);
    buffer.record(fighters, STEP);
    sim.step(STEP);
    maxStreak = Math.max(maxStreak, fighters[1].combat.evadeStreak);
    fighters.forEach((fighter) => fighter.clearIntent());
  }
  assert.ok(maxStreak >= 2);
  const playback = buffer.createPlayback();
  const clones = [spawnFighter(500), spawnFighter(560, -1, 'shadow')];
  clones.forEach((fighter, index) => restoreFighter(fighter, playback.snapshot.fighters[index]));
  const replay = createSimulation(clones);
  for (let step = playback.firstStep; step < playback.lastStep; step++) replay.step(buffer.readStep(step, clones));
  assert.deepEqual(clones.map(captureFighter), fighters.map(captureFighter));
});
