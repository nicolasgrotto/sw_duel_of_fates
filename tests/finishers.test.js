import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { combatRulesConfig } from '../src/config/combatRulesConfig.js';
import { finisherStyle } from '../src/config/fighterVisualConfig.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { drawFinisherPiece, getSeveredLimb } from '../src/rendering/finisherRenderer.js';
import { captureFighter, restoreFighter } from '../src/simulation/ReplayBuffer.js';
import { STEP, createSimulation, spawnFighter } from './helpers.js';

function finish(move, { finishers = true, attackerX = 500, defenderX = 580, defenderFacing = -1, id = 'shadow' } = {}) {
  const attacker = spawnFighter(attackerX, attackerX < defenderX ? 1 : -1, id);
  const defender = spawnFighter(defenderX, defenderFacing, 'guardian');
  defender.health = 1;
  const simulation = createSimulation([attacker, defender], { finishers });
  assert.ok(simulation.combat.tryAttack(attacker, move), move);
  const events = [];
  for (let frame = 0; frame < 90 && defender.isAlive; frame += 1) {
    simulation.step(STEP);
    events.push(...simulation.events);
  }
  return { attacker, defender, simulation, death: events.find((event) => event.type === CombatEvent.DEATH) };
}

function strike(move, defenderFacing) {
  const attacker = spawnFighter(500, 1, 'shadow');
  const defender = spawnFighter(580, defenderFacing, 'guardian');
  const simulation = createSimulation([attacker, defender], { finishers: true });
  defender.health = 1;
  simulation.combat.applyDamage({ attacker, defender, attack: attacker.moves[move], attackType: move, x: 0, y: 0 }, 10, 'blade');
  return defender;
}

function recordingRenderer() {
  const calls = [];
  const record = (name) => (...args) => {
    for (const value of args) if (typeof value === 'number') assert.ok(Number.isFinite(value), `${name} ${args}`);
    calls.push([name, ...args]);
  };
  return { calls, line: record('line'), fillCircle: record('fillCircle'), save() {}, restore() {}, setAlpha() {}, setBlendMode() {} };
}

describe('finisher selection', () => {
  it('picks the limb from the move data and records it in the fighter and the death event', () => {
    for (const [move, limb] of [['heavy', 'arm'], ['light', 'arm'], ['light3', 'leg'], ['forwardHeavy', 'leg']]) {
      const { defender, death } = finish(move);
      assert.equal(defender.state, FighterState.DEAD, move);
      assert.equal(defender.combat.finisherLimb, limb, move);
      assert.equal(death.finisher, limb, move);
      assert.equal(defender.combat.finisherDirection, 1, move);
    }
  });

  it('cuts the front limb from the front and the back limb from behind', () => {
    assert.equal(finish('heavy').defender.combat.finisherSide, 'front');
    assert.equal(strike('heavy', -1).combat.finisherSide, 'front');
    assert.equal(strike('heavy', 1).combat.finisherSide, 'back');
    assert.equal(strike('light3', 1).combat.finisherSide, 'back');
    const mirrored = finish('heavy', { attackerX: 580, defenderX: 500, defenderFacing: 1 });
    assert.equal(mirrored.defender.combat.finisherSide, 'front');
    assert.equal(mirrored.defender.combat.finisherDirection, -1);
  });

  it('keeps the normal knockout for aerial strikes, the thrown blade, powers and when the capability is off', () => {
    assert.equal(finish('heavy', { finishers: false }).defender.combat.finisherLimb, null);
    const caster = spawnFighter(500, 1, 'shadow');
    const target = spawnFighter(600, -1, 'guardian');
    const simulation = createSimulation([caster, target], { finishers: true, powers: true });
    target.health = 1;
    for (const [source, attackType, attack] of [['power', 'lightning', null], ['blade', 'air', caster.moves.air], ['blade', 'saberThrow', caster.moves.heavy]]) {
      target.restartState(FighterState.IDLE);
      target.health = 1;
      Object.assign(target.combat, { finisherLimb: null, finisherSide: null });
      const contact = { attacker: caster, defender: target, attack, attackType, x: target.x, y: target.y };
      simulation.combat.applyDamage(contact, 10, source);
      assert.equal(target.state, FighterState.DEAD, attackType);
      assert.equal(target.combat.finisherLimb, null, attackType);
      assert.equal(contact.finisher, null, attackType);
    }
    assert.equal(combatRulesConfig.finishers.limbs.saberThrow, undefined);
    assert.equal(combatRulesConfig.finishers.limbs.air, undefined);
  });

  it('cuts an arm when the blade lock damage knocks out', () => {
    const winner = spawnFighter(500, 1, 'shadow');
    const loser = spawnFighter(560, -1, 'guardian');
    const simulation = createSimulation([winner, loser], { finishers: true, bladeLock: true });
    loser.health = 1;
    simulation.combat.applyDamage({ attacker: winner, defender: loser, attackType: 'bladeLock', x: loser.x, y: loser.y }, 8, 'bladeLock');
    assert.equal(loser.combat.finisherLimb, 'arm');
  });

  it('does not change the winner, health, fall or timing when the capability is on', () => {
    const states = [true, false].map((finishers) => {
      const { attacker, defender } = finish('heavy', { finishers });
      return { attacker: [attacker.x, attacker.state, attacker.stamina], defender: [defender.x, defender.health, defender.state, defender.stateTime, defender.combat.fallDirection] };
    });
    assert.deepEqual(states[0], states[1]);
  });

  it('gives each fighter its own finisher in a double knockout', () => {
    const left = spawnFighter(500, 1, 'shadow');
    const right = spawnFighter(560, -1, 'shadow');
    const simulation = createSimulation([left, right], { finishers: true });
    left.health = 1;
    right.health = 1;
    simulation.combat.applyDamage({ attacker: left, defender: right, attack: left.moves.heavy, attackType: 'heavy', x: 0, y: 0 }, 10, 'blade');
    simulation.combat.applyDamage({ attacker: right, defender: left, attack: right.moves.light3, attackType: 'light3', x: 0, y: 0 }, 10, 'blade');
    assert.equal(right.combat.finisherLimb, 'arm');
    assert.equal(left.combat.finisherLimb, 'leg');
  });

  it('survives snapshots and clears on the next round', () => {
    const { defender } = finish('light3');
    const snapshot = captureFighter(defender);
    const copy = spawnFighter(0, 1, 'guardian');
    restoreFighter(copy, snapshot);
    for (const field of ['finisherLimb', 'finisherSide', 'finisherX', 'finisherY', 'finisherDirection']) assert.equal(copy.combat[field], defender.combat[field], field);
    defender.resetForRound(300, 1);
    assert.equal(defender.combat.finisherLimb, null);
    assert.equal(getSeveredLimb(defender, true), null);
  });
});

describe('finisher drawing', () => {
  it('shows the severed limb only for a knocked out fighter with the option on', () => {
    const { defender, attacker } = finish('heavy');
    assert.equal(getSeveredLimb(defender, true), 'frontArm');
    assert.equal(getSeveredLimb(defender, false), null);
    assert.equal(getSeveredLimb(attacker, true), null);
    const off = recordingRenderer();
    drawFinisherPiece(off, defender, 600, false);
    assert.equal(off.calls.length, 0);
  });

  it('draws the same piece for the same knockout time, lands it on the floor and keeps it there', () => {
    const { defender } = finish('light3');
    const floorY = defender.floorY;
    const at = (time) => {
      defender.stateTime = time;
      const renderer = recordingRenderer();
      drawFinisherPiece(renderer, defender, floorY, true);
      return renderer.calls;
    };
    assert.deepEqual(at(0.3), at(0.3));
    const resting = at(5);
    assert.deepEqual(resting, at(9).map((call, index) => (call[0] === 'fillCircle' ? resting[index] : call)));
    const [, x1, y1, x2, y2] = resting[0];
    assert.ok(Math.abs(y1 - y2) < 1e-6, 'lies flat');
    assert.ok(y1 <= floorY && y1 > floorY - defender.height * 0.1, 'rests on the floor');
    assert.ok(Math.sign((x1 + x2) / 2 - defender.combat.finisherX) === defender.combat.finisherDirection);
    assert.ok(finisherStyle.emberDuration < 5);
  });

  it('drops the hilt with the blade arm', () => {
    const { defender } = finish('heavy');
    defender.stateTime = 0.2;
    const renderer = recordingRenderer();
    drawFinisherPiece(renderer, defender, defender.floorY, true);
    assert.equal(renderer.calls.filter((call) => call[0] === 'line').length, 2);
    const back = strike('heavy', 1);
    back.stateTime = 0.2;
    const backRenderer = recordingRenderer();
    drawFinisherPiece(backRenderer, back, back.floorY, true);
    assert.equal(backRenderer.calls.filter((call) => call[0] === 'line').length, 1);
  });
});
