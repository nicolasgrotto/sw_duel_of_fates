import { it } from 'node:test';
import assert from 'node:assert/strict';
import { createFighter } from '../src/characters/characterFactory.js';
import { colors } from '../src/config/themeConfig.js';
import { computePose, createPose } from '../src/rendering/fighterPose.js';
import { drawFighterBody } from '../src/rendering/fighterRenderer.js';

function recordColors(fighter, overrideColor = null) {
  const used = [];
  const renderer = new Proxy({}, {
    get: (target, name) => (...args) => {
      if (name === 'fillCircle' || name === 'fillPolygon') used.push(args.at(-1));
      if (name === 'drawGlow') used.push(args[3]);
    },
  });
  drawFighterBody(renderer, fighter, computePose(fighter, createPose()), 600, false, overrideColor);
  return used;
}

const spawn = { x: 400, y: 600, facing: 1 };

it('draws the eclipse eyes only on dark fighters with a visible face', () => {
  assert.ok(recordColors(createFighter('shadow', spawn)).includes(colors.eclipseEyeIris));
  assert.ok(recordColors(createFighter('foretold', spawn, { variant: 'eclipse' })).includes(colors.eclipseEyePupil));
  assert.ok(!recordColors(createFighter('foretold', spawn, { variant: 'aurora' })).includes(colors.eclipseEyeIris));
  assert.ok(!recordColors(createFighter('guardian', spawn)).includes(colors.eclipseEyeIris));
  assert.ok(!recordColors(createFighter('foretold', spawn, { variant: 'eclipse', skin: 'skin-fallen' })).includes(colors.eclipseEyeIris));
  assert.ok(!recordColors(createFighter('shadow', spawn), colors.text).includes(colors.eclipseEyeIris));
});

it('draws hair and the face tone only on skins that declare them', () => {
  const duel = recordColors(createFighter('foretold', spawn, { skin: 'skin-duel' }));
  assert.ok(duel.includes(colors.duelHair));
  assert.ok(duel.includes(colors.duelFace));
  const base = recordColors(createFighter('foretold', spawn));
  assert.ok(!base.includes(colors.duelHair));
  assert.ok(!base.includes(colors.duelFace));
});
