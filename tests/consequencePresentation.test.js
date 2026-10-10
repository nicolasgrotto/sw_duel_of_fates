import { it } from 'node:test';
import assert from 'node:assert/strict';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { Camera } from '../src/core/Camera.js';
import { effectsConfig } from '../src/config/effectsConfig.js';
import { animation as animationStyle } from '../src/config/fighterVisualConfig.js';
import { colors } from '../src/config/themeConfig.js';
import { layout, texts } from '../src/config/uiConfig.js';
import { SoundName } from '../src/audio/soundNames.js';
import { DuelAudio } from '../src/audio/DuelAudio.js';
import { computePose, createPose } from '../src/rendering/fighterPose.js';
import { EffectsSystem } from '../src/systems/EffectsSystem.js';
import { TimeControl } from '../src/systems/TimeControl.js';
import { Hud } from '../src/ui/Hud.js';
import { degreesToRadians } from '../src/utils/math.js';
import { createRandom } from '../src/utils/random.js';
import { STEP, repeat, spawnFighter } from './helpers.js';

function createRecordingRenderer() {
  const calls = [];
  const renderer = new Proxy({ width: 1280, height: 720 }, {
    get(target, name) {
      if (name in target) return target[name];
      if (name === 'measureText') return () => 60;
      return (...args) => calls.push({ name, args });
    },
  });
  return { renderer, calls };
}

it('fades the exhausted stamina color in and out and marks the wound beside the name', () => {
  const left = spawnFighter(300, 1);
  const right = spawnFighter(900, -1, 'shadow');
  const hud = new Hud(left, right);
  left.combat.exhausted = true;
  left.combat.wound = 'arm';
  repeat(Math.ceil(1 / (layout.hud.exhaustFadeRate * STEP)) + 1, () => hud.update(STEP));
  assert.equal(hud.sides[0].exhaustion, 1);

  const { renderer, calls } = createRecordingRenderer();
  hud.render(renderer);
  assert.ok(calls.some(({ name, args }) => name === 'strokeRect' && args.includes(colors.hudExhausted)));
  assert.ok(calls.some(({ name, args }) => name === 'text' && args[0] === texts.hud.wounds.arm));
  assert.ok(!calls.some(({ name, args }) => name === 'text' && args[0] === texts.hud.wounds.leg));

  left.combat.exhausted = false;
  repeat(Math.ceil(1 / (layout.hud.exhaustFadeRate * STEP)) + 1, () => hud.update(STEP));
  assert.equal(hud.sides[0].exhaustion, 0);
});

it('sparks on a wound and lights the fighter when the heal clears it', () => {
  const random = createRandom(3);
  const effects = new EffectsSystem(effectsConfig, new Camera(effectsConfig, random), random, new TimeControl());
  const attacker = spawnFighter(500, 1);
  const defender = spawnFighter(560, -1, 'shadow');
  effects.handleEvents([{ type: CombatEvent.WOUND, attacker, defender, attackType: 'heavy', x: 540, y: 500 }]);
  assert.ok(effects.particles.activeCount >= effectsConfig.recipes.woundSpark.count[0]);
  effects.handleEvents([{ type: CombatEvent.WOUND_HEALED, attacker: defender, defender: null, attackType: 'arm', x: 560, y: 500 }]);
  assert.ok(effects.lights.some((light) => light.active && light.x === defender.x));
});

it('plays the exhaustion, wound and wrath sounds', () => {
  const played = [];
  const audio = { play: (name) => played.push(name), playAt: (name) => played.push(name), startLoop: () => {}, stopLoop: () => {}, setLoopVolume: () => {} };
  const duel = new DuelAudio(audio, { arenaWidth: 1280, stereoWidth: 0.6 });
  const fighter = spawnFighter(640);
  duel.handleEvents([
    { type: CombatEvent.EXHAUSTION, attacker: fighter, defender: null, attackType: 'spend', x: 640, y: 500 },
    { type: CombatEvent.WOUND, attacker: fighter, defender: fighter, attackType: 'heavy', x: 640, y: 500 },
    { type: CombatEvent.POWER_ACTIVE, attacker: fighter, defender: null, attackType: 'wrath', x: 640, y: 500 },
  ]);
  const names = played.map((entry) => entry.name ?? entry);
  assert.deepEqual(names, [SoundName.EXHAUSTED, SoundName.WOUND, SoundName.WRATH]);
});

it('lowers the guard and deepens the breath only while exhausted', () => {
  const fighter = spawnFighter(400, 1, 'shadow');
  const rested = computePose(fighter, createPose()).bladeAngle;
  fighter.combat.exhausted = true;
  const tired = computePose(fighter, createPose()).bladeAngle;
  assert.ok(Math.abs(tired - rested - degreesToRadians(animationStyle.exhaustedDroopDegrees)) < 1e-9);
});
