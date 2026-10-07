import { it } from 'node:test';
import assert from 'node:assert/strict';
import { arenas } from '../src/arenas/arenaData.js';
import { ArenaRenderer } from '../src/rendering/arenaRenderer.js';
import { AmbientSystem } from '../src/systems/AmbientSystem.js';
import { createRandom } from '../src/utils/random.js';
import { arena } from './helpers.js';

it('pre-renders each static layer once and reuses it across renders', () => {
  const view = new ArenaRenderer({ layers: [{ rectangles: [[0, 0, 100, 50, 'wall']] }] });
  let builds = 0;
  let draws = 0;
  const renderer = {
    width: 1280, height: 720,
    createLayer: callback => { builds += 1; callback(renderer); return 'layer'; },
    drawLayer: () => { draws += 1; },
    fillRect: () => {}, line: () => {}, save: () => {}, restore: () => {}, setAlpha: () => {},
  };
  view.render(renderer, arena);
  view.render(renderer, arena);
  assert.equal(builds, 2);
  assert.equal(draws, 4);
});

it('keeps ambient particles bounded in a fixed pool with deterministic updates', () => {
  const first = new AmbientSystem(arenas.platform.ambient, arena, createRandom(1));
  const second = new AmbientSystem(arenas.platform.ambient, arena, createRandom(1));
  const particles = [...first.particles];
  first.update(20);
  second.update(20);
  assert.deepEqual(first.particles, second.particles);
  assert.equal(first.particles.length, arenas.platform.ambient.count);
  assert.equal(first.particles[0], particles[0]);
  assert.ok(first.particles.every(p => p.x >= arena.left && p.x <= arena.right && p.y >= 0 && p.y <= arena.floorY));
});
