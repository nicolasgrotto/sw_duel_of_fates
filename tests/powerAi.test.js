import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AiDecision, EnemyAI } from '../src/ai/EnemyAI.js';
import { aiConfig } from '../src/config/aiConfig.js';
import { powersConfig } from '../src/config/powersConfig.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { createRandom } from '../src/utils/random.js';
import { STEP, createSimulation, spawnFighter } from './helpers.js';

const CAREFUL = { ...aiConfig.difficulties.normal, mistakeChance: 0, attackTell: 0, powerMultiplier: 10, powerAware: true };
const SINGLE_STEP = { ...aiConfig.profiles.balanced, priorities: ['power'] };
const DEFENSE_STEP = { ...aiConfig.profiles.balanced, blockChance: 10, priorities: ['defend'] };

function setup(selfId, opponentId, gap, { profile = SINGLE_STEP, difficulty = CAREFUL, rules = { powers: true } } = {}) {
  const self = spawnFighter(800, -1, selfId);
  const opponent = spawnFighter(0, 1, opponentId);
  opponent.x = self.x - (self.width + opponent.width) / 2 - gap;
  self.flowMeter = 100;
  opponent.flowMeter = 100;
  const ai = new EnemyAI({ self, opponent, profile, difficulty, perception: aiConfig.perception, random: () => 0, rules });
  return { self, opponent, ai };
}

function think(ai) {
  ai.think();
  ai.writeIntent(ai.self.intent);
  return ai.decision;
}

describe('AI powers', () => {
  it('casts lightning from range and holds the channel', () => {
    const { ai, self } = setup('shadow', 'guardian', 200);
    assert.equal(think(ai), AiDecision.POWER);
    assert.equal(self.intent.power, true);
    assert.equal(self.intent.moveX, 0);
    assert.equal(self.intent.powerHeld, true);
  });

  it('steps forward to pull from far away', () => {
    const { ai, self } = setup('shadow', 'guardian', 340);
    assert.equal(think(ai), AiDecision.POWER);
    assert.equal(Math.sign(self.intent.moveX), -1);
  });

  it('only repels when the opponent is close', () => {
    assert.equal(think(setup('guardian', 'shadow', 200).ai), AiDecision.WAIT);
    assert.equal(think(setup('guardian', 'shadow', 60).ai), AiDecision.POWER);
  });

  it('skips a power the opponent would resist, unless it does not know better', () => {
    const resisted = setup('shadow', 'guardian', 200);
    resisted.opponent.stats = { ...resisted.opponent.stats, flowLevel: 9 };
    assert.equal(think(resisted.ai), AiDecision.WAIT);
    const naive = setup('shadow', 'guardian', 200, { difficulty: { ...CAREFUL, powerAware: false } });
    naive.opponent.stats = { ...naive.opponent.stats, flowLevel: 9 };
    assert.equal(think(naive.ai), AiDecision.POWER);
  });

  it('repels a guarding opponent only when the push cannot be blocked', () => {
    const even = setup('guardian', 'shadow', 60);
    even.opponent.setState(FighterState.BLOCKING);
    assert.equal(think(even.ai), AiDecision.WAIT);
    const stronger = setup('guardian', 'shadow', 60);
    stronger.opponent.setState(FighterState.BLOCKING);
    stronger.self.stats = { ...stronger.self.stats, flowLevel: stronger.opponent.flowLevel + 3 };
    assert.equal(think(stronger.ai), AiDecision.POWER);
  });

  it('waits for meter and cooldown and never casts in the classic rules', () => {
    const empty = setup('shadow', 'guardian', 200);
    empty.self.flowMeter = 10;
    assert.equal(think(empty.ai), AiDecision.WAIT);
    const cooling = setup('shadow', 'guardian', 200);
    cooling.self.combat.powerCooldown = 0.5;
    assert.equal(think(cooling.ai), AiDecision.WAIT);
    assert.equal(think(setup('shadow', 'guardian', 200, { rules: {} }).ai), AiDecision.WAIT);
  });

  it('answers an incoming power with the barrier or the guard', () => {
    const light = setup('guardian', 'shadow', 200, { profile: DEFENSE_STEP });
    light.opponent.combat.power = powersConfig.powers.lightning;
    light.opponent.restartState(FighterState.CHANNELING);
    assert.equal(think(light.ai), AiDecision.POWER);
    assert.equal(Math.sign(light.self.intent.moveX), 1);
    assert.equal(light.self.intent.powerHeld, true);

    const dark = setup('shadow', 'guardian', 60, { profile: DEFENSE_STEP });
    dark.opponent.combat.power = powersConfig.powers.push;
    dark.opponent.restartState(FighterState.CASTING);
    assert.equal(think(dark.ai), AiDecision.BLOCK);
    assert.equal(dark.self.intent.block, true);
  });

  it('plays full duels with powers without timeouts', () => {
    let casts = 0;
    for (const seed of [5, 6, 7]) {
      const fighters = [spawnFighter(420, 1, 'guardian'), spawnFighter(860, -1, 'echo')];
      const simulation = createSimulation(fighters, { powers: true });
      const random = createRandom(seed);
      const controllers = fighters.map((self, index) => new EnemyAI({
        self, opponent: fighters[1 - index], profile: aiConfig.profiles[self.id], difficulty: aiConfig.difficulties.hard,
        perception: aiConfig.perception, random, rules: { powers: true },
      }));
      for (let index = 0; index < 60 * 120 && fighters.every((fighter) => fighter.isAlive); index += 1) {
        controllers.forEach((controller, side) => controller.updateIntent(fighters[side].intent, STEP));
        simulation.step(STEP);
        casts += simulation.events.filter((event) => event.type === 'powerStart').length;
      }
      assert.ok(fighters.some((fighter) => !fighter.isAlive), `seed ${seed}`);
    }
    assert.ok(casts > 0);
  });
});
