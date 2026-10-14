import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { aiConfig } from '../src/config/aiConfig.js';
import { combatRulesConfig } from '../src/config/combatRulesConfig.js';
import { bladeTechniques } from '../src/config/movesConfig.js';
import { EnemyAI } from '../src/ai/EnemyAI.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { createRandom } from '../src/utils/random.js';
import { STEP, createSimulation, spawnFighter } from './helpers.js';

const POWERS = { powers: true };

function setup(attackerId, defenderX, defenderId = 'guardian', rules = POWERS) {
  const attacker = spawnFighter(400, 1, attackerId);
  const defender = spawnFighter(defenderX, -1, defenderId);
  const simulation = createSimulation([attacker, defender], rules);
  return { attacker, defender, simulation };
}

function run(simulation, seconds, perFrame = () => {}) {
  const events = [];
  for (let frame = 0; frame < Math.round(seconds / STEP); frame += 1) {
    perFrame(frame);
    simulation.step(STEP);
    events.push(...simulation.events);
  }
  return events;
}

function useTechnique(simulation, fighter, moveX) {
  fighter.intent.moveX = moveX;
  fighter.intent.special = true;
  simulation.step(STEP);
  fighter.intent.special = false;
  fighter.intent.moveX = 0;
}

function gapFor(attacker, reach, extra = 0) {
  return attacker.x + attacker.width / 2 + reach + extra;
}

describe('thrust', () => {
  it('reaches farther than a heavy attack but passes under a jump', () => {
    const { attacker, defender, simulation } = setup('haste', 0);
    defender.x = attacker.x + attacker.width / 2 + attacker.moves.heavy.hitbox.reach + defender.width / 2 + 40;
    useTechnique(simulation, attacker, 1);
    assert.equal(attacker.combat.attackType, 'thrust');
    const hits = run(simulation, 0.5).filter((event) => event.type === CombatEvent.HIT && event.attacker === attacker);
    assert.equal(hits.length, 1);

    const air = setup('haste', 0);
    air.defender.x = air.attacker.x + 160;
    air.defender.y = air.attacker.y - air.attacker.height * 0.75;
    air.defender.grounded = false;
    useTechnique(air.simulation, air.attacker, 1);
    const airHits = run(air.simulation, 0.4, () => { air.defender.y = air.attacker.y - air.attacker.height * 0.75; air.defender.vy = 0; })
      .filter((event) => event.type === CombatEvent.HIT && event.attacker === air.attacker);
    assert.equal(airHits.length, 0);
  });
});

describe('rising cut', () => {
  it('launches and hurts more an airborne target, and only pushes a grounded one', () => {
    const grounded = setup('bastion', 520);
    useTechnique(grounded.simulation, grounded.attacker, 1);
    const groundHit = run(grounded.simulation, 0.5).find((event) => event.type === CombatEvent.HIT);
    assert.ok(groundHit);
    assert.ok(grounded.defender.vy >= 0);

    const airborne = setup('bastion', 520);
    useTechnique(airborne.simulation, airborne.attacker, 1);
    let launched = 0;
    const airHit = run(airborne.simulation, 0.5, () => {
      if (airborne.defender.state !== FighterState.HIT) {
        airborne.defender.y = 480;
        airborne.defender.vy = 0;
        airborne.defender.grounded = false;
      }
    }).find((event) => event.type === CombatEvent.HIT);
    launched = airborne.defender.vy;
    assert.ok(airHit);
    assert.ok(airHit.damage > groundHit.damage * 1.2, `${airHit.damage} vs ${groundHit.damage}`);
    assert.ok(launched < 0 || airborne.defender.y < 480);
  });
});

describe('flurry', () => {
  it('hits four times on an open target and drains the guard four times', () => {
    const open = setup('echo', 520);
    useTechnique(open.simulation, open.attacker, 1);
    const hits = run(open.simulation, 0.8).filter((event) => event.type === CombatEvent.HIT && event.attacker === open.attacker);
    assert.equal(hits.length, bladeTechniques.flurry.hits);

    const guard = setup('echo', 520);
    guard.defender.stats.guardBreakThreshold = 0;
    guard.defender.intent.block = true;
    run(guard.simulation, 0.1, () => { guard.defender.intent.block = true; });
    const stamina = guard.defender.stamina;
    useTechnique(guard.simulation, guard.attacker, 1);
    const blocks = run(guard.simulation, 0.8, () => { guard.defender.intent.block = true; })
      .filter((event) => event.type === CombatEvent.BLOCK && event.attacker === guard.attacker);
    assert.equal(blocks.length, bladeTechniques.flurry.hits);
    assert.ok(guard.defender.stamina < stamina);
  });

  it('stops the string when one thrust is parried', () => {
    const { attacker, defender, simulation } = setup('echo', 520);
    run(simulation, 0.1, () => { defender.intent.block = true; });
    useTechnique(simulation, attacker, 1);
    let parried = false;
    const events = run(simulation, 0.8, () => {
      defender.intent.block = true;
      if (!parried && attacker.stateTime > attacker.moves.flurry.startup - STEP * 4) {
        defender.intent.blockPressed = true;
        parried = true;
      } else {
        defender.intent.blockPressed = false;
      }
    });
    const parries = events.filter((event) => [CombatEvent.PARRY, CombatEvent.PERFECT_PARRY].includes(event.type));
    assert.equal(parries.length, 1);
    const after = events.slice(events.indexOf(parries[0]) + 1).filter((event) => event.attacker === attacker && [CombatEvent.HIT, CombatEvent.BLOCK].includes(event.type));
    assert.equal(after.length, 0);
  });
});

describe('sweep', () => {
  it('unbalances a blocking target but misses a target in the air', () => {
    const guard = setup('ember', 520);
    run(guard.simulation, 0.1, () => { guard.defender.intent.block = true; });
    useTechnique(guard.simulation, guard.attacker, -1);
    assert.equal(guard.attacker.combat.attackType, 'sweep');
    let staggered = false;
    const events = run(guard.simulation, 0.8, () => {
      guard.defender.intent.block = true;
      staggered ||= guard.defender.state === FighterState.STAGGERED;
    });
    assert.ok(events.some((event) => event.type === CombatEvent.HIT && event.attacker === guard.attacker));
    assert.ok(staggered);

    const air = setup('ember', 520);
    useTechnique(air.simulation, air.attacker, -1);
    const airEvents = run(air.simulation, 0.8, () => {
      air.defender.y = air.attacker.y - air.attacker.height * 0.4;
      air.defender.vy = 0;
      air.defender.grounded = false;
    });
    assert.ok(!airEvents.some((event) => event.type === CombatEvent.HIT && event.attacker === air.attacker));
  });
});

describe('plunge', () => {
  it('starts only from the air, dives fast and counts as the air attack of the jump', () => {
    const ground = setup('shadow', 900);
    ground.attacker.intent.special = true;
    ground.simulation.step(STEP);
    assert.notEqual(ground.attacker.combat.attackType, 'plunge');

    const { attacker, defender, simulation } = setup('shadow', 560);
    attacker.intent.jump = true;
    simulation.step(STEP);
    attacker.intent.jump = false;
    run(simulation, 0.12);
    assert.equal(attacker.grounded, false);
    attacker.intent.special = true;
    simulation.step(STEP);
    attacker.intent.special = false;
    assert.equal(attacker.combat.attackType, 'plunge');
    assert.equal(attacker.combat.airAttackUsed, true);
    let fastest = 0;
    const events = run(simulation, 0.6, () => { fastest = Math.max(fastest, attacker.vy); });
    assert.ok(fastest >= bladeTechniques.plunge.dive * 0.9);
    assert.ok(events.some((event) => event.type === CombatEvent.HIT && event.attacker === attacker && event.defender === defender));
  });

  it('does nothing in the air without an air technique and needs powers', () => {
    for (const [id, rules] of [['guardian', POWERS], ['shadow', {}]]) {
      const { attacker, simulation } = setup(id, 900, 'guardian', rules);
      attacker.intent.jump = true;
      simulation.step(STEP);
      attacker.intent.jump = false;
      run(simulation, 0.12);
      attacker.intent.special = true;
      simulation.step(STEP);
      assert.notEqual(attacker.combat.attackType, 'plunge', id);
    }
  });
});

describe('technique clash', () => {
  it('interrupts both techniques with a big symmetric clash, without damage', () => {
    const left = spawnFighter(520, 1, 'mirror');
    const right = spawnFighter(760, -1, 'haste');
    const simulation = createSimulation([left, right], POWERS);
    const health = [left.health, right.health];
    const stamina = [left.stamina, right.stamina];
    left.intent.moveX = 1;
    right.intent.moveX = -1;
    left.intent.special = true;
    right.intent.special = true;
    simulation.step(STEP);
    left.intent.special = false;
    right.intent.special = false;
    const events = run(simulation, 0.4, () => { left.intent.moveX = 0; right.intent.moveX = 0; });
    const clash = events.find((event) => event.type === CombatEvent.TECHNIQUE_CLASH);
    assert.ok(clash);
    assert.ok(!events.some((event) => event.type === CombatEvent.HIT));
    assert.deepEqual([left.health, right.health], health);
    const { staminaLoss } = combatRulesConfig.techniqueClash;
    assert.ok(left.stamina <= stamina[0] - bladeTechniques.thrust.staminaCost - staminaLoss + 1e-6 + 30);
    assert.equal(left.combat.attack, null);
    assert.equal(right.combat.attack, null);
    assert.ok(left.vx < 0 || left.x < 520);
  });

  it('leaves a technique against a normal heavy to the usual clash rules', () => {
    const left = spawnFighter(520, 1, 'mirror');
    const right = spawnFighter(700, -1, 'guardian');
    const simulation = createSimulation([left, right], POWERS);
    left.intent.moveX = 1;
    left.intent.special = true;
    right.intent.heavyAttack = true;
    simulation.step(STEP);
    left.intent.special = false;
    right.intent.heavyAttack = false;
    const events = run(simulation, 0.5, () => { left.intent.moveX = 0; });
    assert.ok(!events.some((event) => event.type === CombatEvent.TECHNIQUE_CLASH));
  });
});

describe('techniques and the AI', () => {
  it('keeps the rising cut for airborne targets most of the time and the sweep for a standing guard', () => {
    const self = spawnFighter(400, 1, 'bastion');
    const opponent = spawnFighter(560, -1, 'guardian');
    const ai = new EnemyAI({ self, opponent, profile: Object.values(aiConfig.profiles)[0], difficulty: aiConfig.difficulties.hard,
      perception: aiConfig.perception, random: createRandom(3), rules: POWERS });
    let grounded = 0;
    for (let i = 0; i < 400; i += 1) grounded += ai.suitsTechnique(self.moves.risingCut) ? 1 : 0;
    opponent.grounded = false;
    let airborne = 0;
    for (let i = 0; i < 400; i += 1) airborne += ai.suitsTechnique(self.moves.risingCut) ? 1 : 0;
    assert.equal(airborne, 400);
    assert.ok(grounded > 60 && grounded < 200, `${grounded}`);
    const sweep = bladeTechniques.sweep;
    opponent.grounded = true;
    opponent.setState(FighterState.BLOCKING);
    assert.equal(ai.suitsTechnique(sweep), true);
    opponent.grounded = false;
    assert.equal(ai.suitsTechnique(sweep), false);
  });

  it('plans the plunge only when falling onto a nearby opponent from above', () => {
    const self = spawnFighter(500, 1, 'shadow');
    const opponent = spawnFighter(560, -1, 'guardian');
    const ai = new EnemyAI({ self, opponent, profile: { ...Object.values(aiConfig.profiles)[0], techniqueChance: 1 }, difficulty: { ...aiConfig.difficulties.hard, specialMultiplier: 1 },
      perception: aiConfig.perception, random: createRandom(3), rules: POWERS });
    self.y = 460;
    self.grounded = false;
    assert.equal(ai.tryAirTechnique(), true);
    ai.attackCooldown = 0;
    self.y = 600;
    assert.equal(ai.tryAirTechnique(), false);
  });
});
