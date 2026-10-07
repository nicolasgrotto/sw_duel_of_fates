import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AiDecision, EnemyAI } from '../src/ai/EnemyAI.js';
import { canReach, getGap, isPunishable, isThreatening } from '../src/ai/perception.js';
import { aiConfig, AiProfile, Difficulty } from '../src/config/aiConfig.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { createRandom } from '../src/utils/random.js';
import { STEP, createSimulation, repeat, spawnFighter } from './helpers.js';

const PERFECT = {
  reactionTime: 0.1,
  defenseMultiplier: 1,
  mistakeChance: 0,
  attackCooldown: 0.5,
  parryChance: 0,
  perfectParryChance: 0,
  shoveMultiplier: 1,
};

const DEFENSES = new Set([AiDecision.BLOCK, AiDecision.PARRY]);

function startAttack(fighter, attackType, time = 0) {
  fighter.combat.attack = fighter.stats.attacks[attackType];
  fighter.combat.attackType = attackType;
  fighter.restartState(attackType === 'heavy' ? FighterState.HEAVY_ATTACK : FighterState.ATTACKING);
  fighter.stateTime = time;
}

function createDuel(gap, { roll = 0.99, difficulty = PERFECT, profile = AiProfile.BALANCED } = {}) {
  const self = spawnFighter(800, -1, 'shadow');
  const opponent = spawnFighter(0, 1, 'guardian');
  opponent.x = self.x - (self.width + opponent.width) / 2 - gap;
  const ai = new EnemyAI({
    self,
    opponent,
    profile: aiConfig.profiles[profile],
    difficulty,
    perception: aiConfig.perception,
    random: () => roll,
  });
  return { self, opponent, ai };
}

function think(ai) {
  ai.updateIntent(ai.self.intent, STEP);
  return ai.self.intent;
}

describe('perception', () => {
  it('measures the gap between the bodies', () => {
    const { self, opponent } = createDuel(50);

    assert.equal(getGap(self, opponent), 50);
  });

  it('knows when an attack can reach', () => {
    const { self, opponent } = createDuel(50);
    const attack = self.stats.attacks.light;

    assert.equal(canReach(self, opponent, attack, 10), true);
    opponent.x -= attack.hitbox.reach;
    assert.equal(canReach(self, opponent, attack, 10), false);
  });

  it('sees a threat only while the opponent attack is coming and close', () => {
    const { self, opponent } = createDuel(50);
    const attack = opponent.stats.attacks.light;

    assert.equal(isThreatening(opponent, self, 20), false);
    startAttack(opponent, 'light');
    assert.equal(isThreatening(opponent, self, 20), true);
    startAttack(opponent, 'light', attack.startup + attack.active + 0.01);
    assert.equal(isThreatening(opponent, self, 20), false);
  });

  it('sees recovery, hit and stun as chances to punish', () => {
    const { opponent } = createDuel(50);
    const attack = opponent.stats.attacks.heavy;

    assert.equal(isPunishable(opponent), false);
    startAttack(opponent, 'heavy', attack.startup + attack.active + 0.01);
    assert.equal(isPunishable(opponent), true);
    opponent.clearAttack();
    opponent.restartState(FighterState.STUNNED);
    assert.equal(isPunishable(opponent), true);
  });
});

describe('EnemyAI decisions', () => {
  it('approaches when the opponent is far', () => {
    const { ai } = createDuel(400);

    const intent = think(ai);

    assert.equal(ai.decision, AiDecision.APPROACH);
    assert.equal(intent.moveX, -1);
  });

  it('attacks when the opponent is in reach', () => {
    const { ai } = createDuel(40, { roll: 0 });

    const intent = think(ai);

    assert.equal(ai.decision, AiDecision.ATTACK);
    assert.ok(intent.lightAttack || intent.heavyAttack);
  });

  it('waits for the cooldown before attacking again', () => {
    const { ai } = createDuel(40, { roll: 0 });
    think(ai);

    repeat(Math.ceil(PERFECT.reactionTime / STEP) + 2, () => think(ai));

    assert.ok(ai.attackCooldown > 0);
    assert.notEqual(ai.decision, AiDecision.ATTACK);
  });

  it('blocks a coming attack when the defense roll succeeds', () => {
    const { ai, opponent } = createDuel(40, { roll: 0 });
    startAttack(opponent, 'heavy');

    const intent = think(ai);

    assert.equal(ai.decision, AiDecision.BLOCK);
    assert.equal(intent.block, true);
  });

  it('does not defend when the defense roll fails', () => {
    const { ai, opponent } = createDuel(40, { roll: 0.99 });
    startAttack(opponent, 'heavy');

    think(ai);

    assert.notEqual(ai.decision, AiDecision.BLOCK);
    assert.notEqual(ai.decision, AiDecision.DODGE);
  });

  it('counters an opponent in recovery', () => {
    const { ai, opponent } = createDuel(40, { roll: 0 });
    const attack = opponent.stats.attacks.heavy;
    startAttack(opponent, 'heavy', attack.startup + attack.active + 0.01);

    const intent = think(ai);

    assert.equal(ai.decision, AiDecision.COUNTER);
    assert.ok(intent.lightAttack || intent.heavyAttack);
  });

  it('uses a heavy attack to punish a stunned opponent', () => {
    const { ai, opponent } = createDuel(40, { roll: 0 });
    opponent.restartState(FighterState.STUNNED);

    const intent = think(ai);

    assert.equal(intent.heavyAttack, true);
  });

  it('guards when the opponent is in reach and it cannot attack', () => {
    const { ai } = createDuel(40, { roll: 0 });
    ai.attackCooldown = 10;

    const intent = think(ai);

    assert.equal(ai.decision, AiDecision.GUARD);
    assert.equal(intent.block, true);
  });

  it('does not guard when the opponent is far', () => {
    const { ai } = createDuel(400, { roll: 0 });
    ai.attackCooldown = 10;

    think(ai);

    assert.equal(ai.decision, AiDecision.APPROACH);
  });

  it('backs away to recover stamina', () => {
    const { ai, self } = createDuel(40);
    self.stamina = 5;

    const intent = think(ai);

    assert.equal(ai.decision, AiDecision.RECOVER);
    assert.equal(intent.moveX, 1);
  });

  it('hesitates on a mistake', () => {
    const { ai } = createDuel(400, { roll: 0, difficulty: { ...PERFECT, mistakeChance: 0.5 } });

    const intent = think(ai);

    assert.equal(ai.decision, AiDecision.HESITATE);
    assert.equal(intent.moveX, 0);
  });

  it('reacts only after its reaction time', () => {
    const { ai, opponent } = createDuel(40, { roll: 0, difficulty: { ...PERFECT, reactionTime: 0.3 } });
    ai.attackCooldown = 10;
    think(ai);

    startAttack(opponent, 'heavy');
    think(ai);
    assert.notEqual(ai.decision, AiDecision.BLOCK);

    repeat(Math.ceil(0.3 / STEP), () => think(ai));
    assert.equal(ai.decision, AiDecision.BLOCK);
  });

  it('times a parry against a heavy attack it can read', () => {
    const { ai, opponent, self } = createDuel(40, { roll: 0, difficulty: { ...PERFECT, parryChance: 1, perfectParryChance: 1 } });
    const attack = opponent.stats.attacks.heavy;
    startAttack(opponent, 'heavy');

    let intent = think(ai);
    assert.equal(ai.decision, AiDecision.PARRY);
    assert.equal(intent.blockPressed, false);

    const expectedDelay = attack.startup - self.stats.parry.perfectWindow / 2;
    let pressedAt = null;
    for (let time = STEP; time < attack.startup + STEP; time += STEP) {
      opponent.stateTime += STEP;
      intent = think(ai);
      if (intent.blockPressed) {
        pressedAt = time;
        break;
      }
    }

    assert.ok(pressedAt !== null);
    assert.ok(Math.abs(pressedAt - expectedDelay) <= STEP * 1.5);
    assert.equal(intent.block, true);
  });

  it('never tries to parry a light attack', () => {
    const { ai, opponent } = createDuel(40, { roll: 0, difficulty: { ...PERFECT, parryChance: 1 } });
    startAttack(opponent, 'light');

    think(ai);

    assert.notEqual(ai.decision, AiDecision.PARRY);
  });

  it('shoves an opponent that keeps blocking up close', () => {
    const { ai, opponent } = createDuel(20, { roll: 0 });
    opponent.restartState(FighterState.BLOCKING);

    const intent = think(ai);

    assert.equal(ai.decision, AiDecision.SHOVE);
    assert.equal(intent.block, true);
    assert.equal(intent.lightAttack, true);
  });

  it('only writes the intent and never changes the fighters', () => {
    const { ai, self, opponent } = createDuel(40, { roll: 0 });
    const intent = self.intent;
    startAttack(opponent, 'light');
    Object.freeze(self);
    Object.freeze(opponent);
    Object.freeze(self.combat);
    Object.freeze(opponent.combat);

    assert.doesNotThrow(() => repeat(30, () => ai.updateIntent(intent, STEP)));
  });

  it('defends more often on hard than on easy', () => {
    const countBlocks = (difficulty) => {
      const random = createRandom(11);
      let blocks = 0;
      repeat(300, () => {
        const { ai, opponent } = createDuel(40, { difficulty: aiConfig.difficulties[difficulty] });
        ai.random = random;
        startAttack(opponent, 'heavy');
        think(ai);
        blocks += DEFENSES.has(ai.decision) ? 1 : 0;
      });
      return blocks;
    };

    assert.ok(countBlocks(Difficulty.HARD) > countBlocks(Difficulty.EASY) * 2);
  });
});

describe('EnemyAI in a duel', () => {
  it('defeats an idle opponent using only intents', () => {
    const player = spawnFighter(400, 1);
    const enemy = spawnFighter(840, -1, 'shadow');
    const simulation = createSimulation([player, enemy]);
    const ai = new EnemyAI({
      self: enemy,
      opponent: player,
      profile: aiConfig.profiles[AiProfile.AGGRESSIVE],
      difficulty: aiConfig.difficulties[Difficulty.HARD],
      perception: aiConfig.perception,
      random: createRandom(5),
    });

    for (let time = 0; time < 60 && player.isAlive; time += STEP) {
      ai.updateIntent(enemy.intent, STEP);
      simulation.step(STEP);
    }

    assert.equal(player.state, FighterState.DEAD);
    assert.equal(enemy.health, enemy.stats.maxHealth);
  });
});
