import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AiDecision, EnemyAI } from '../src/ai/EnemyAI.js';
import { isInPowerRange } from '../src/combat/PowerSystem.js';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { aiConfig } from '../src/config/aiConfig.js';
import { powersConfig } from '../src/config/powersConfig.js';
import { effectsConfig } from '../src/config/effectsConfig.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { captureFighter, restoreFighter, ReplayBuffer } from '../src/simulation/ReplayBuffer.js';
import { EffectsSystem } from '../src/systems/EffectsSystem.js';
import { createRandom } from '../src/utils/random.js';
import { STEP, createSimulation, spawnFighter } from './helpers.js';

const { absorb, storm, lightning } = powersConfig.powers;

function setup(id = 'absorb', reversed = false) {
  const caster = spawnFighter(500, 1, id === 'absorb' ? 'heron' : 'sovereign');
  const target = spawnFighter(650, -1, 'shadow');
  caster.stats = { ...caster.stats, flowLevel: 6, power: { ...caster.stats.power, potency: 1, gainScale: 1, loadout: { neutral: powersConfig.powers[id] } } };
  target.stats = { ...target.stats, flowLevel: 6, power: { ...target.stats.power, potency: 1 } };
  caster.flowMeter = target.flowMeter = 100;
  const fighters = reversed ? [target, caster] : [caster, target];
  return { caster, target, fighters, simulation: createSimulation(fighters, { powers: true }) };
}

function advance(s, frames) {
  for (let i = 0; i < frames; i++) s.simulation.step(STEP);
}

function openLightning(target) {
  target.combat.power = lightning;
  target.state = FighterState.CHANNELING;
  target.stateTime = lightning.startup;
  target.intent.powerHeld = true;
}

function arm(s) {
  assert.equal(s.simulation.combat.powers.tryCast(s.caster), true);
  advance(s, 4);
  assert.ok(s.caster.combat.absorbTime > 0);
}

describe('absorb', () => {
  it('removes an absorbed rock projectile but does not protect against blades', () => {
    const s = setup();
    arm(s);
    s.simulation.projectiles.fighters = s.fighters;
    s.simulation.projectiles.spawnThrow(s.target, powersConfig.powers.throw);
    const rock = s.simulation.projectiles.pool.find(p => p.active);
    rock.x = s.caster.x;
    s.simulation.projectiles.checkHit(rock);
    assert.equal(rock.active, false);
    assert.equal(s.caster.health, s.caster.stats.maxHealth);
    const contact = { attacker: s.target, defender: s.caster, attack: s.target.moves.light, attackType: 'light', x: s.caster.x, y: s.caster.y, damage: 0 };
    s.simulation.combat.resolveContact(contact);
    assert.ok(s.caster.health < s.caster.stats.maxHealth);
    assert.equal(s.caster.combat.absorbTime, 0);
  });

  it('reacts to reachable incoming preparation after the difficulty delay', () => {
    const s = setup();
    const ai = new EnemyAI({ self: s.caster, opponent: s.target, profile: aiConfig.profiles.balanced, difficulty: aiConfig.difficulties.hard, perception: aiConfig.perception, random: () => 0, rules: { powers: true } });
    for (const id of ['push', 'pull', 'throw', 'lightning', 'freeze', 'choke']) {
      s.target.combat.power = powersConfig.powers[id];
      s.target.state = s.target.combat.power.channel ? FighterState.CHANNELING : FighterState.CASTING;
      s.target.stateTime = ai.difficulty.reactionTime - STEP;
      assert.equal(ai.wantsSelfPower(absorb), false);
      s.target.stateTime = ai.difficulty.reactionTime;
      assert.equal(ai.tryDefendPower(), AiDecision.POWER, id);
      s.target.x = 1600;
      assert.equal(ai.wantsSelfPower(absorb), false);
      s.target.x = 650;
    }
  });

  for (const reversed of [false, true]) {
    for (const difference of [-4, -3, -2, -1, 0, 1, 2, 3, 4]) {
      it(`absorbs difference ${difference}, reversed ${reversed}`, () => {
        const s = setup('absorb', reversed);
        s.caster.stats.flowLevel = 6 + difference;
        arm(s);
        s.caster.flowMeter = 40;
        const fraction = difference >= 0 ? 1 : difference === -1 ? 0.5 : difference === -2 ? 0.25 : 0;
        const gain = difference >= 1 ? 1.5 : difference === 0 ? 1 : difference === -1 ? 0.5 : 0;
        s.simulation.combat.powers.strike(s.target, s.caster, lightning, 'tick', null);
        assert.equal(s.target.health, s.target.stats.maxHealth);
        assert.equal(s.caster.stats.maxHealth - s.caster.health, lightning.damage * (1 - fraction));
        assert.ok(s.caster.flowMeter >= 40 + absorb.absorbGain * lightning.cost * gain);
        if (fraction === 1) assert.ok(s.caster.combat.absorbTime > 0);
      });
    }
  }

  it('arms before other powers on the startup boundary in either order', () => {
    for (const reversed of [false, true]) {
      const s = setup('absorb', reversed);
      s.simulation.combat.powers.tryCast(s.caster);
      s.caster.stateTime = absorb.startup - STEP;
      openLightning(s.target);
      s.simulation.step(STEP);
      assert.equal(s.caster.health, s.caster.stats.maxHealth);
      assert.equal(s.target.health, s.target.stats.maxHealth);
      assert.ok(s.caster.combat.absorbTime > 0);
    }
  });

  it('expires, pays cost, gains per pulse with a cap and resets cleanly', () => {
    const s = setup();
    arm(s);
    s.caster.flowMeter = 40;
    for (let i = 0; i < 2; i++) s.simulation.combat.powers.strike(s.target, s.caster, lightning, 'tick', null);
    assert.equal(s.caster.flowMeter, 55);
    s.caster.flowMeter = 99;
    s.simulation.combat.powers.strike(s.target, s.caster, lightning, 'tick', null);
    assert.equal(s.caster.flowMeter, 100);
    advance(s, 40);
    assert.equal(s.caster.combat.absorbTime, 0);
    assert.ok(s.caster.combat.powerCooldown > 0);
    s.caster.combat.absorbTime = absorb.window;
    s.caster.clearAttack();
    assert.equal(s.caster.combat.absorbTime, 0);
    s.caster.combat.absorbTime = absorb.window;
    s.caster.resetForRound(500, 1);
    assert.equal(s.caster.combat.absorbTime, 0);
  });

  for (const id of ['push', 'pull', 'throw', 'choke', 'freeze']) {
    it(`absorbs ${id} without returning damage`, () => {
      const s = setup();
      arm(s);
      const incoming = powersConfig.powers[id];
      s.simulation.combat.powers.strike(s.target, s.caster, incoming, incoming.projectile ? 'impact' : 'active', null);
      assert.equal(s.caster.health, s.caster.stats.maxHealth);
      assert.equal(s.caster.combat.chokeTime, 0);
      assert.equal(s.caster.combat.freezeTime, 0);
      assert.equal(s.caster.vx, 0);
      assert.equal(s.target.health, s.target.stats.maxHealth);
      assert.ok(s.caster.combat.absorbTime > 0);
    });
  }

  it('scales status duration and push force at partial absorption', () => {
    for (const id of ['push', 'freeze', 'choke']) {
      const plain = setup();
      const partial = setup();
      for (const s of [plain, partial]) { s.caster.stats.flowLevel = 5; }
      partial.caster.combat.absorbTime = absorb.window;
      const p = powersConfig.powers[id];
      for (const s of [plain, partial]) s.simulation.combat.powers.strike(s.target, s.caster, p, 'active', null);
      assert.equal(partial.caster.vx, plain.caster.vx * 0.5);
      assert.equal(partial.caster.combat.freezeTime, plain.caster.combat.freezeTime * 0.5);
      assert.equal(partial.caster.combat.chokeTime, plain.caster.combat.chokeTime * 0.5);
    }
  });
});

describe('new power integration', () => {
  for (const id of ['absorb', 'storm']) {
    it(`replays ${id} from an active snapshot exactly`, () => {
      const s = setup(id);
      if (id === 'absorb') arm(s);
      else {
        s.simulation.combat.powers.tryCast(s.caster);
        s.caster.intent.powerHeld = true;
        advance(s, 24);
      }
      if (id === 'absorb') openLightning(s.target);
      const buffer = new ReplayBuffer({ frames: 180, snapshotInterval: 30 });
      for (let i = 0; i < 100; i++) {
        buffer.record(s.fighters, STEP);
        s.simulation.step(STEP);
      }
      const expected = s.fighters.map(captureFighter);
      const playback = buffer.createPlayback();
      s.fighters.forEach((f, i) => restoreFighter(f, playback.snapshot.fighters[i]));
      const replay = createSimulation(s.fighters, { powers: true });
      for (let i = playback.firstStep; i < playback.lastStep; i++) replay.step(buffer.readStep(i, s.fighters));
      assert.deepEqual(s.fighters.map(captureFighter), expected);
    });
  }

  it('requests both abilities through AI intents and respects the flow threshold', () => {
    for (const id of ['absorb', 'storm']) {
      const s = setup(id);
      if (id === 'absorb') openLightning(s.target);
      const ai = new EnemyAI({ self: s.caster, opponent: s.target, profile: aiConfig.profiles.balanced, difficulty: aiConfig.difficulties.hard, perception: aiConfig.perception, random: () => 0, rules: { powers: true } });
      assert.equal(id === 'absorb' ? ai.tryDefendPower() : ai.tryPower(), AiDecision.POWER);
      ai.writeIntent(s.caster.intent);
      assert.equal(s.caster.intent.power, true);
      ai.powersEnabled = false;
      assert.equal(ai.tryPower(), null);
      s.caster.stats.flowLevel = storm.minFlowLevel - 1;
      assert.equal(ai.canUsePower(storm), false);
    }
  });

  it('keeps storm particles in the existing pool and reduces emission', () => {
    const s = setup('storm');
    const effects = new EffectsSystem(effectsConfig, null, createRandom(1), null);
    const particles = effects.particles.particles.slice();
    const event = { type: CombatEvent.POWER_PULSE, attacker: s.caster, attackType: 'storm' };
    effects.handleEvent(event);
    assert.equal(effects.particles.activeCount, powersConfig.render.storm.particles);
    for (let i = 0; i < 100; i++) effects.handleEvent(event);
    assert.equal(effects.particles.activeCount, effectsConfig.maxParticles);
    assert.ok(particles.every((p, i) => p === effects.particles.particles[i]));
    effects.particles.update(1, { gravity: 0, drag: 0 });
    effects.setReduced(true);
    effects.handleEvent(event);
    assert.equal(effects.particles.activeCount, powersConfig.render.storm.reducedParticles);
  });
});
