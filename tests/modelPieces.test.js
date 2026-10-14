import { it } from 'node:test';
import assert from 'node:assert/strict';
import { characters } from '../src/characters/characterData.js';
import { createFighterFromCharacter } from '../src/characters/characterFactory.js';
import { faceDetails } from '../src/config/fighterVisualConfig.js';
import { colors } from '../src/config/themeConfig.js';
import { computePose, createPose } from '../src/rendering/fighterPose.js';
import { drawFighterBody } from '../src/rendering/fighterRenderer.js';
import { drawSaber } from '../src/rendering/saberRenderer.js';

const PALETTE_NAMES = ['trim', 'body', 'cloak', 'glove'];
const HILT_STYLES = ['grip', 'ringed', 'guard', 'bands', 'center', 'curved'];
const OVERRIDE = '#ffffff';

function collectColors(details) {
  return Object.values(details).flatMap((piece) => (typeof piece === 'object' ? [piece.color, piece.buckle].filter(Boolean) : []));
}

function recordingRenderer() {
  const calls = [];
  const record = (name) => (...args) => {
    for (const value of args) if (typeof value === 'number') assert.ok(Number.isFinite(value), `${name} ${args}`);
    calls.push([name, ...args]);
  };
  return {
    calls, width: 1280, height: 720,
    line: record('line'), polyline: record('polyline'), fillPolygon: record('fillPolygon'), fillCircle: record('fillCircle'), fillEllipse: record('fillEllipse'),
    drawGlow: record('drawGlow'), save() {}, restore() {}, setAlpha() {}, setBlendMode() {}, translate() {}, scale() {}, rotate() {},
  };
}

function colorOf(call) {
  return call.find((value) => typeof value === 'string' && value.startsWith('#'));
}

it('gives every character valid pieces, hair and hilt, with colors from the outfit or the theme', () => {
  for (const [id, character] of Object.entries(characters)) {
    const { details, hairStyle, hairColor, hiltStyle } = character.appearance;
    for (const name of collectColors(details ?? {})) assert.ok(PALETTE_NAMES.includes(name) || name in colors, `${id}: ${name}`);
    if (hairStyle) {
      assert.ok(['ponytail', 'tied', ...Object.keys(faceDetails.hair)].includes(hairStyle), `${id}: ${hairStyle}`);
      assert.ok(hairColor, id);
    }
    if (details?.beard) assert.ok(details.beard.style in faceDetails.beard, id);
    if (hiltStyle) assert.ok(HILT_STYLES.includes(hiltStyle), `${id}: ${hiltStyle}`);
    for (const variant of Object.values(character.variants ?? {})) if (variant.hiltStyle) assert.ok(HILT_STYLES.includes(variant.hiltStyle), id);
  }
});

it('keeps the pieces of the base outfit on every alternate outfit', () => {
  for (const character of Object.values(characters)) {
    for (const skin of character.skins ?? []) {
      const fighter = createFighterFromCharacter(character, { x: 0, y: 0, facing: 1 }, { skin: skin.id });
      assert.deepEqual(fighter.appearance.details, character.appearance.details, `${character.id} ${skin.id}`);
      assert.equal(fighter.appearance.hiltStyle, character.appearance.hiltStyle, `${character.id} ${skin.id}`);
    }
  }
});

it('draws every piece of every character, walking and attacking, in the single override color of a hit flash', () => {
  for (const character of Object.values(characters)) {
    for (const mode of ['idle', 'walk', 'heavy']) {
      const fighter = createFighterFromCharacter(character, { x: 400, y: 600, facing: 1 });
      if (mode === 'walk') {
        fighter.restartState('WALKING');
        fighter.vx = 200;
      }
      if (mode === 'heavy') {
        fighter.restartState('HEAVY_ATTACK');
        fighter.combat.attack = fighter.moves.heavy;
        fighter.stateTime = fighter.moves.heavy.startup * 0.8;
      }
      const pose = computePose(fighter, createPose());
      const plain = recordingRenderer();
      drawFighterBody(plain, fighter, pose, 600, false);
      const flash = recordingRenderer();
      drawFighterBody(flash, fighter, pose, 600, false, OVERRIDE);
      const colored = flash.calls.filter((call) => colorOf(call));
      assert.ok(colored.every((call) => colorOf(call) === OVERRIDE), `${character.id} ${mode}`);
      assert.ok(plain.calls.length > 0);
      const saber = recordingRenderer();
      drawSaber(saber, fighter, pose);
      assert.ok(saber.calls.length > 0);
    }
  }
});

it('draws more for a dressed character than for the same body without pieces', () => {
  for (const id of ['guardian', 'forge', 'elder', 'reaper']) {
    const dressed = createFighterFromCharacter(characters[id], { x: 400, y: 600, facing: 1 });
    const bare = createFighterFromCharacter(characters[id], { x: 400, y: 600, facing: 1 });
    bare.appearance = { ...bare.appearance, details: null, hiltStyle: null };
    const pose = computePose(dressed, createPose());
    const withPieces = recordingRenderer();
    const without = recordingRenderer();
    drawFighterBody(withPieces, dressed, pose, 600, false);
    drawFighterBody(without, bare, pose, 600, false);
    assert.ok(withPieces.calls.length > without.calls.length, id);
  }
});
