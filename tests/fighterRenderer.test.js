import { it } from 'node:test';
import assert from 'node:assert/strict';
import { colors } from '../src/config/themeConfig.js';
import { drawFighterBody } from '../src/rendering/fighterRenderer.js';
import { computePose, createPose } from '../src/rendering/fighterPose.js';
import { spawnFighter } from './helpers.js';

it('uses hit flash for every body part of both silhouettes without changing their appearance', () => {
  for (const id of ['guardian', 'shadow']) {
    const fighter = spawnFighter(500, 1, id);
    const appearance = structuredClone(fighter.appearance);
    const drawn = [];
    const renderer = {
      save: () => {}, restore: () => {}, translate: () => {}, scale: () => {}, rotate: () => {},
      polyline: (points, color) => drawn.push(color),
      fillPolygon: (points, color) => drawn.push(color),
      fillCircle: (x, y, radius, color) => drawn.push(color),
      fillEllipse: (x, y, rx, ry, color) => drawn.push(color),
      line: (x1, y1, x2, y2, color) => drawn.push(color),
    };
    drawFighterBody(renderer, fighter, computePose(fighter, createPose()), 600, false, colors.hitFlash);
    assert.ok(drawn.length >= 8);
    assert.ok(drawn.every(color => color === colors.hitFlash));
    assert.deepEqual(fighter.appearance, appearance);
  }
});
