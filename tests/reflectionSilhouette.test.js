import { it } from 'node:test';
import assert from 'node:assert/strict';
import { characters } from '../src/characters/characterData.js';
import { createFighterFromCharacter } from '../src/characters/characterFactory.js';
import { computePose, createPose } from '../src/rendering/fighterPose.js';
import { drawFighterBody, drawFighterSilhouette } from '../src/rendering/fighterRenderer.js';

const SILHOUETTE = '#123456';
const MAX_SILHOUETTE_SHAPES = 9;

function recordingRenderer() {
  const calls = [];
  const record = (name) => (...args) => {
    for (const value of args) if (typeof value === 'number') assert.ok(Number.isFinite(value), `${name} ${args}`);
    calls.push([name, ...args]);
  };
  return {
    calls,
    line: record('line'), polyline: record('polyline'), fillPolygon: record('fillPolygon'), fillCircle: record('fillCircle'), fillEllipse: record('fillEllipse'),
    drawGlow: record('drawGlow'), setBlendMode: record('setBlendMode'), setAlpha() {}, save() {}, restore() {}, translate() {}, scale() {}, rotate() {},
  };
}

function colorOf(call) {
  return call.find((value) => typeof value === 'string' && value.startsWith('#'));
}

function spawn(id) {
  const fighter = createFighterFromCharacter(characters[id], { x: 500, y: 600, facing: 1 });
  return { fighter, pose: computePose(fighter, createPose()) };
}

it('draws every character reflection as a few shapes of a single color, cheaper than the body', () => {
  for (const id of Object.keys(characters)) {
    const { fighter, pose } = spawn(id);
    const silhouette = recordingRenderer();
    const body = recordingRenderer();
    drawFighterSilhouette(silhouette, fighter, pose, SILHOUETTE);
    drawFighterBody(body, fighter, pose, 600, false, null, null, true);
    assert.ok(silhouette.calls.length >= 6, id);
    assert.ok(silhouette.calls.length <= MAX_SILHOUETTE_SHAPES, `${id}: ${silhouette.calls.length}`);
    assert.ok(silhouette.calls.length < body.calls.length, id);
    assert.ok(silhouette.calls.every((call) => colorOf(call) === SILHOUETTE), id);
  }
});

it('leaves the severed part out of the reflection without embers', () => {
  const { fighter, pose } = spawn('guardian');
  const whole = recordingRenderer();
  drawFighterSilhouette(whole, fighter, pose, SILHOUETTE);
  const headless = recordingRenderer();
  drawFighterSilhouette(headless, fighter, pose, SILHOUETTE, 'frontHead');
  assert.ok(headless.calls.length < whole.calls.length);
  for (const severed of ['frontArm', 'backArm', 'frontLeg', 'backLeg']) {
    const cut = recordingRenderer();
    drawFighterSilhouette(cut, fighter, pose, SILHOUETTE, severed);
    assert.equal(cut.calls.length, whole.calls.length, severed);
    assert.ok(cut.calls.every((call) => call[0] !== 'setBlendMode' && colorOf(call) === SILHOUETTE), severed);
  }
});
