import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { IntentRecorder, encodeIntent, decodeIntent } from '../src/controllers/IntentRecorder.js';
import { spawnFighter } from './helpers.js';

describe('intent recording', () => {
  it('replays taps and held guard in order and mirrors forward movement', () => {
    const recorder = new IntentRecorder(10);
    const player = spawnFighter(400);
    const dummy = spawnFighter(900, -1);
    recorder.toggleRecording();
    player.intent.moveX = 1;
    player.intent.block = true;
    player.intent.blockPressed = true;
    recorder.record(player.intent, player.facing);
    player.intent.blockPressed = false;
    player.intent.lightAttack = true;
    recorder.record(player.intent, player.facing);
    recorder.startPlayback();
    recorder.play(dummy.intent, dummy.facing);
    assert.equal(dummy.intent.moveX, -1);
    assert.equal(dummy.intent.blockPressed, true);
    assert.equal(dummy.intent.block, true);
    assert.equal(dummy.intent.lightAttack, false);
    recorder.play(dummy.intent, dummy.facing);
    assert.equal(dummy.intent.blockPressed, false);
    assert.equal(dummy.intent.lightAttack, true);
    recorder.play(dummy.intent, dummy.facing);
    assert.equal(dummy.intent.blockPressed, true);
    assert.equal(dummy.intent.lightAttack, false);
  });

  it('stops at the fixed capacity and preserves the buffer for playback', () => {
    const recorder = new IntentRecorder(2);
    const fighter = spawnFighter(400);
    const frames = recorder.frames;
    recorder.toggleRecording();
    recorder.record(fighter.intent, 1);
    recorder.record(fighter.intent, 1);
    recorder.record(fighter.intent, 1);
    assert.equal(recorder.length, 2);
    assert.equal(recorder.mode, 'idle');
    assert.equal(recorder.frames, frames);
    assert.equal(recorder.startPlayback(), true);
    recorder.stop();
    assert.equal(recorder.length, 2);
    recorder.toggleRecording();
    assert.equal(recorder.length, 0);
  });

  it('does not start playback when no input was recorded', () => {
    const recorder = new IntentRecorder(2);
    assert.equal(recorder.startPlayback(), false);
    assert.equal(recorder.mode, 'idle');
  });
});

it('appends evade without changing legacy intent bits', () => {
  const fighter = spawnFighter(400);
  fighter.intent.specialHeld = true;
  const legacy = encodeIntent(fighter.intent, 1);
  assert.equal(legacy, 513);
  fighter.intent.evade = true;
  assert.equal(encodeIntent(fighter.intent, 1), legacy | 1024);
  decodeIntent(legacy, fighter.intent, 1);
  assert.equal(fighter.intent.evade, false);
});
