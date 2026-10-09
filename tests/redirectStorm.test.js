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

const { redirect, storm, lightning } = powersConfig.powers;

function setup(id = 'redirect', reversed = false) {
  const caster = spawnFighter(500, 1, id === 'redirect' ? 'heron' : 'sovereign');
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
  assert.ok(s.caster.combat.redirectTime > 0);
}

describe('redirect', () => {
  for (const reversed of [false, true]) {
    for (const difference of [-4, -3, -2, -1, 0, 1, 2, 3, 4]) {
      it(`resolves difference ${difference} with reversed fighters ${reversed}`, () => {
        const s = setup('redirect', reversed);
        s.caster.stats.flowLevel = 6 + difference;
        arm(s);
        s.caster.flowMeter = 40;
        openLightning(s.target);
        s.simulation.step(STEP);
        const reflected = difference >= 1 ? 6 : difference === 0 ? 4.5 : difference === -1 ? 1.5 : 0;
        const received = difference >= 0 ? 0 : difference === -1 ? 1.5 : difference === -2 ? 3 : 8;
        assert.equal(s.target.stats.maxHealth - s.target.health, reflected);
        assert.equal(s.caster.stats.maxHealth - s.caster.health, received);
        assert.equal(s.caster.combat.redirectTime, 0);
        assert.equal(s.target.state, difference >= -1 ? FighterState.STAGGERED : FighterState.CHANNELING);
        if (difference <= -3) assert.equal(s.caster.state, FighterState.STAGGERED);
        if (difference >= 0) assert.ok(s.caster.flowMeter > 40 + (difference > 0 ? 11 : 7));
      });
    }
  }

  it('arms before incoming ticks regardless of fighter order on the startup boundary', () => {
    for (const reversed of [false, true]) {
      const s = setup('redirect', reversed);
      s.simulation.combat.powers.tryCast(s.caster);
      s.caster.stateTime = redirect.startup - STEP;
      openLightning(s.target);
      s.simulation.step(STEP);
      assert.equal(s.caster.health, s.caster.stats.maxHealth);
      assert.ok(s.target.health < s.target.stats.maxHealth);
    }
  });

  it('expires, pays cost, finishes with cooldown and resets on interruption and round', () => {
    const s = setup();
    s.simulation.combat.powers.tryCast(s.caster);
    assert.equal(s.caster.flowMeter, 100 - redirect.cost);
    advance(s, 40);
    assert.equal(s.caster.combat.redirectTime, 0);
    assert.ok(s.caster.combat.powerCooldown > 0);
    openLightning(s.target);
    s.simulation.step(STEP);
    assert.ok(s.caster.health < s.caster.stats.maxHealth);
    s.caster.combat.redirectTime = redirect.window;
    s.caster.clearAttack();
    assert.equal(s.caster.combat.redirectTime, 0);
    s.caster.combat.redirectTime = redirect.window;
    s.caster.resetForRound(500, 1);
    assert.equal(s.caster.combat.redirectTime, 0);
  });

  it('does not redirect a closed channel or another power', () => {
    const s = setup();
    arm(s);
    openLightning(s.target);
    s.target.combat.powerEndTime = s.target.stateTime;
    s.simulation.step(STEP);
    assert.equal(s.caster.health, s.caster.stats.maxHealth);
    assert.ok(s.caster.combat.redirectTime > 0);
    s.simulation.combat.powers.affect(s.target, s.caster, powersConfig.powers.push, 'active');
    assert.ok(s.caster.health < s.caster.stats.maxHealth);
    assert.equal(s.caster.combat.redirectTime, 0);
  });
});

describe('storm', () => {
  it('requires configured flow, meter and enabled rules', () => {
    const s = setup('storm');
    const powers = s.simulation.combat.powers;
    s.caster.stats.flowLevel = storm.minFlowLevel - 1;
    assert.equal(powers.tryCast(s.caster), false);
    assert.equal(s.caster.flowMeter, 100);
    s.caster.stats.flowLevel = storm.minFlowLevel;
    s.caster.flowMeter = storm.cost - 1;
    assert.equal(powers.canCast(s.caster, storm), false);
    s.caster.flowMeter = storm.cost;
    assert.equal(powers.canCast(s.caster, storm), true);
    powers.enabled = false;
    assert.equal(powers.tryCast(s.caster), false);
  });

  it('uses a circular area centered on the body, including behind and above', () => {
    const s = setup('storm');
    const radius = storm.range;
    for (const [dx, dy, inside] of [[radius, 0, true], [-radius, 0, true], [0, -radius, true], [radius + 1, 0, false], [radius * 0.75, -radius * 0.75, false]]) {
      s.target.x = s.caster.x + dx;
      s.target.y = s.caster.y - s.caster.height / 2 + s.target.height / 2 + dy;
      assert.equal(isInPowerRange(s.caster, s.target, storm), inside);
      const before = s.target.health;
      s.simulation.combat.powers.affect(s.caster, s.target, storm, 'tick');
      assert.equal(before - s.target.health, inside ? storm.damage * storm.intensity : 0);
    }
  });

  for (const reversed of [false, true]) {
    for (const difference of [-4, -3, -2, -1, 0, 1, 2, 3, 4]) {
      it(`applies area interaction ${difference}, reversed ${reversed}`, () => {
        const s = setup('storm', reversed);
        s.target.stats.flowLevel = s.caster.flowLevel - difference;
        s.target.state = FighterState.BLOCKING;
        s.simulation.combat.powers.affect(s.caster, s.target, storm, 'tick');
        const scale = difference >= 3 ? 1.2 : difference >= -1 ? 0.25 : difference === -2 ? 0.125 : 0;
        assert.ok(Math.abs(s.target.stats.maxHealth - s.target.health - storm.damage * storm.intensity * scale) < 1e-9);
      });
    }
  }

  it('ticks while held, emits pulses without a target, stops on release and recovers', () => {
    const s = setup('storm');
    s.target.x = 1100;
    s.simulation.combat.powers.tryCast(s.caster);
    s.caster.intent.powerHeld = true;
    let pulses = 0;
    for (let i = 0; i < 45; i++) {
      s.simulation.step(STEP);
      pulses += s.simulation.events.filter(e => e.type === CombatEvent.POWER_PULSE).length;
    }
    assert.ok(pulses >= 2);
    assert.equal(s.target.health, s.target.stats.maxHealth);
    assert.ok(s.caster.flowMeter < 100 - storm.cost);
    s.caster.intent.powerHeld = false;
    advance(s, 30);
    assert.equal(s.caster.combat.power, null);
    assert.ok(s.caster.combat.powerCooldown > 0);
  });

  it('respects barrier and invulnerability, and ends at max duration or interruption', () => {
    const s = setup('storm');
    s.target.combat.power = powersConfig.powers.barrier;
    s.target.state = FighterState.CHANNELING;
    s.target.stateTime = powersConfig.powers.barrier.startup;
    s.simulation.combat.powers.affect(s.caster, s.target, storm, 'tick');
    assert.equal(s.target.health, s.target.stats.maxHealth);
    s.target.clearAttack();
    s.target.state = FighterState.DODGING;
    s.target.stateTime = 0;
    s.target.combat.dodgeProfile = s.target.stats.dodge;
    s.simulation.combat.powers.affect(s.caster, s.target, storm, 'tick');
    assert.equal(s.target.health, s.target.stats.maxHealth);
    s.target.state = FighterState.IDLE;
    s.target.x = 1100;
    s.simulation.combat.powers.tryCast(s.caster);
    s.caster.intent.powerHeld = true;
    advance(s, 125);
    assert.equal(s.caster.combat.power, null);
    s.caster.combat.powerCooldown = 0;
    s.caster.flowMeter = 100;
    s.simulation.combat.powers.tryCast(s.caster);
    s.caster.clearAttack();
    assert.equal(s.caster.combat.power, null);
  });
});

describe('new power integration', () => {
  for (const id of ['redirect', 'storm']) {
    it(`replays ${id} from an active snapshot exactly`, () => {
      const s = setup(id);
      if (id === 'redirect') arm(s);
      else {
        s.simulation.combat.powers.tryCast(s.caster);
        s.caster.intent.powerHeld = true;
        advance(s, 24);
      }
      if (id === 'redirect') openLightning(s.target);
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
    for (const id of ['redirect', 'storm']) {
      const s = setup(id);
      if (id === 'redirect') openLightning(s.target);
      const ai = new EnemyAI({ self: s.caster, opponent: s.target, profile: aiConfig.profiles.balanced, difficulty: aiConfig.difficulties.hard, perception: aiConfig.perception, random: () => 0, rules: { powers: true } });
      assert.equal(id === 'redirect' ? ai.tryDefendPower() : ai.tryPower(), AiDecision.POWER);
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
