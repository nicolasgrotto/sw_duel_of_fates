import { it } from 'node:test';
import assert from 'node:assert/strict';
import { arenas } from '../src/arenas/arenaData.js';
import { gameConfig } from '../src/config/gameConfig.js';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { effectsConfig } from '../src/config/effectsConfig.js';
import { animation as animationStyle } from '../src/config/fighterVisualConfig.js';
import { en } from '../src/config/locales/en.js';
import { ptBR } from '../src/config/locales/ptBR.js';
import { colors } from '../src/config/themeConfig.js';
import { texts } from '../src/config/uiConfig.js';
import { Camera } from '../src/core/Camera.js';
import { applyWind, createPose } from '../src/rendering/fighterPose.js';
import { EffectsSystem } from '../src/systems/EffectsSystem.js';
import { TimeControl } from '../src/systems/TimeControl.js';
import { ArenaRenderer } from '../src/rendering/arenaRenderer.js';
import { AmbientSystem } from '../src/systems/AmbientSystem.js';
import { createRandom } from '../src/utils/random.js';
import { arena, spawnFighter } from './helpers.js';

const AMBIENT_KINDS = ['steam', 'dust', 'ripple', 'rain', 'cloud', 'gust', 'shimmer'];
const NEW_ARENAS = ['saltFlats', 'skyDeck', 'snowPeak', 'eclipseCitadel'];
const MAX_AMBIENT_PARTICLES = 120;
const MAX_SHADE_ALPHA = 0.45;
const MIN_REFLECTION_COVER = 0.7;

function collectColorTokens(definition) {
  const tokens = [definition.floorColor, definition.floorEdgeColor];
  const shapeSets = [...definition.layers, definition.floorDetail].filter(Boolean);
  for (const shapes of shapeSets) {
    for (const rectangle of shapes.rectangles ?? []) tokens.push(rectangle[4]);
    for (const line of shapes.lines ?? []) tokens.push(line[4]);
    for (const polygon of shapes.polygons ?? []) tokens.push(polygon[0]);
    for (const circle of shapes.circles ?? []) tokens.push(circle[3]);
    for (const glow of shapes.glows ?? []) tokens.push(glow[3]);
    for (const arc of shapes.arcs ?? []) tokens.push(arc[5]);
  }
  for (const config of definition.ambient) tokens.push(config.color);
  if (definition.reflection) tokens.push(definition.reflection.cover);
  if (definition.shade) tokens.push(definition.shade.color);
  if (definition.impactDust) tokens.push(definition.impactDust.color);
  return tokens;
}

function createEffects() {
  const random = createRandom(5);
  return new EffectsSystem(effectsConfig, new Camera(effectsConfig, random), random, new TimeControl());
}

function hitEvent(defenderGrounded) {
  const attacker = spawnFighter(500, 1);
  const defender = spawnFighter(560, -1, 'shadow');
  defender.grounded = defenderGrounded;
  return { type: CombatEvent.HIT, attacker, defender, attackType: 'light', x: 540, y: 500 };
}

function activeParticles(effects) {
  return effects.particles.particles.filter((particle) => particle.active);
}

const testArena = {
  floorHeight: 32, floorColor: 'floor', floorEdgeColor: 'floorEdge', showWalls: false,
  reflection: null, crystals: [], crystalGlow: null, ambient: [],
  layers: [{ rectangles: [[0, 0, 100, 50, 'wall']] }],
};

it('pre-renders each static layer once and reuses it across renders', () => {
  const view = new ArenaRenderer(testArena);
  let builds = 0;
  let draws = 0;
  const renderer = {
    width: 1280, height: 720,
    createLayer: callback => { builds += 1; callback(renderer); return 'layer'; },
    drawLayer: () => { draws += 1; },
    fillRect: () => {}, line: () => {}, save: () => {}, restore: () => {}, setAlpha: () => {},
  };
  for (let frame = 0; frame < 2; frame += 1) {
    view.renderBackground(renderer, arena, [], []);
    view.renderFloor(renderer, arena);
  }
  assert.equal(builds, 2);
  assert.equal(draws, 4);
});

it('keeps ambient particles bounded in a fixed pool with deterministic updates', () => {
  const [config] = arenas.platform.ambient;
  const first = new AmbientSystem(config, arena, createRandom(1));
  const second = new AmbientSystem(config, arena, createRandom(1));
  const particles = [...first.particles];
  first.update(20);
  second.update(20);
  assert.deepEqual(first.particles, second.particles);
  assert.equal(first.particles.length, config.count);
  assert.equal(first.particles[0], particles[0]);
  assert.ok(first.particles.every(p => p.x >= arena.left && p.x <= arena.right && p.y >= 0 && p.y <= arena.floorY));
});

it('describes every selectable arena with the fields the renderer needs', () => {
  for (const id of gameConfig.duel.arenaOrder) {
    const definition = arenas[id];
    assert.ok(definition, id);
    for (const field of ['floorHeight', 'floorColor', 'floorEdgeColor', 'layers', 'crystals', 'crystalShape', 'ambient']) {
      assert.ok(field in definition, `${id}.${field}`);
    }
    assert.ok(texts.arenas[id] && texts.arenaDescriptions[id], id);
    for (const config of definition.ambient) {
      assert.ok(AMBIENT_KINDS.includes(config.kind), `${id}: ${config.kind}`);
      assert.equal(config.area.length, 2);
    }
  }
});

it('adds the four new arenas to the selectable order with names and descriptions in both languages', () => {
  for (const id of NEW_ARENAS) {
    assert.ok(gameConfig.duel.arenaOrder.includes(id), id);
    for (const table of [ptBR, en]) {
      assert.ok(table.ui.arenas[id] && table.ui.arenaDescriptions[id], id);
    }
  }
});

it('uses only palette tokens and keeps every arena inside the ambient and darkness budgets', () => {
  for (const [id, definition] of Object.entries(arenas)) {
    for (const token of collectColorTokens(definition)) {
      assert.ok(token in colors, `${id}: ${token}`);
    }
    const particles = definition.ambient.reduce((sum, config) => sum + config.count, 0);
    assert.ok(particles <= MAX_AMBIENT_PARTICLES, `${id}: ${particles}`);
    if (definition.shade) assert.ok(definition.shade.alpha > 0 && definition.shade.alpha <= MAX_SHADE_ALPHA, id);
    if (definition.reflection) assert.ok(definition.reflection.coverAlpha >= MIN_REFLECTION_COVER, id);
  }
});

it('wraps drifting particles across the screen instead of resetting them at the edge', () => {
  const config = { kind: 'dust', layer: 'air', area: [0, 600], count: 1, color: 'arenaSnow', alpha: 0.5, radius: 1, riseSpeed: 0, driftSpeed: -300, life: 100, streak: 0, wrapMargin: 30 };
  const ambient = new AmbientSystem(config, arena, createRandom(3));
  const [particle] = ambient.particles;
  particle.x = arena.left - 29;
  particle.y = 300;
  particle.time = 1;
  ambient.update(0.01);
  assert.ok(particle.x > arena.right, `${particle.x}`);
  assert.equal(particle.y, 300);
  for (let step = 0; step < 600; step += 1) {
    ambient.update(1 / 60);
    assert.ok(particle.x >= arena.left - 30 && particle.x <= arena.right + 30, `${particle.x}`);
  }
});

it('blows the cloth toward the wind on both sides and keeps it within the limit', () => {
  const { wind } = arenas.skyDeck;
  const right = spawnFighter(400, 1);
  const left = spawnFighter(800, -1);
  const rightPose = applyWind(createPose(), right, wind);
  const leftPose = applyWind(createPose(), left, wind);
  assert.ok(rightPose.clothSway > 0);
  assert.ok(leftPose.clothSway < 0);
  const running = createPose();
  running.clothSway = animationStyle.maxClothSway;
  assert.ok(applyWind(running, right, wind).clothSway <= wind.maxSway);
});

it('draws the eclipse shade only in arenas that define one', () => {
  let fills = 0;
  const renderer = { width: 1280, height: 720, save: () => {}, restore: () => {}, setAlpha: () => {}, fillRect: () => { fills += 1; } };
  const bounds = { ...arena, overscan: 32 };
  new ArenaRenderer(arenas.refinery).renderShade(renderer, bounds);
  assert.equal(fills, 0);
  new ArenaRenderer(arenas.eclipseCitadel).renderShade(renderer, bounds);
  assert.equal(fills, 1);
});

it('raises salt dust only when a grounded fighter is hit in an arena with impact dust', () => {
  const salt = createEffects();
  salt.arenaDust = arenas.saltFlats.impactDust;
  salt.handleEvent(hitEvent(true));
  const dust = activeParticles(salt).filter((particle) => particle.color === colors.arenaSaltDust);
  assert.equal(dust.length, arenas.saltFlats.impactDust.count);
  assert.ok(dust.every((particle) => particle.y === 600 && particle.vx > 0 && particle.vy < 0));

  const airborne = createEffects();
  airborne.arenaDust = arenas.saltFlats.impactDust;
  airborne.handleEvent(hitEvent(false));
  assert.equal(activeParticles(airborne).filter((particle) => particle.color === colors.arenaSaltDust).length, 0);
});
