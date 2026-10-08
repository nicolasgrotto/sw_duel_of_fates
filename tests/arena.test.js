import { it } from 'node:test';
import assert from 'node:assert/strict';
import { arenas } from '../src/arenas/arenaData.js';
import { gameConfig } from '../src/config/gameConfig.js';
import { texts } from '../src/config/uiConfig.js';
import { ArenaRenderer } from '../src/rendering/arenaRenderer.js';
import { AmbientSystem } from '../src/systems/AmbientSystem.js';
import { createRandom } from '../src/utils/random.js';
import { arena } from './helpers.js';

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
      assert.ok(['steam', 'dust', 'ripple', 'rain'].includes(config.kind), `${id}: ${config.kind}`);
      assert.equal(config.area.length, 2);
    }
  }
});
