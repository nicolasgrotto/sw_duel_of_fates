import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StateMachine } from '../src/core/StateMachine.js';

function createState(name, log) {
  return {
    name,
    enter: () => log.push(`${name}:enter`),
    exit: () => log.push(`${name}:exit`),
    resume: () => log.push(`${name}:resume`),
    update: (dt) => log.push(`${name}:update:${dt}`),
    render: () => log.push(`${name}:render`),
  };
}

describe('StateMachine', () => {
  it('starts empty', () => {
    const machine = new StateMachine();

    assert.equal(machine.current, null);
    assert.doesNotThrow(() => machine.update(1));
    assert.equal(machine.pop(), null);
  });

  it('enters the new state on push', () => {
    const log = [];
    const machine = new StateMachine();
    const menu = createState('menu', log);

    machine.push(menu);

    assert.equal(machine.current, menu);
    assert.deepEqual(log, ['menu:enter']);
  });

  it('exits every state on change', () => {
    const log = [];
    const machine = new StateMachine();

    machine.push(createState('duel', log));
    machine.push(createState('pause', log));
    machine.change(createState('menu', log));

    assert.equal(machine.stack.length, 1);
    assert.deepEqual(log, ['duel:enter', 'pause:enter', 'pause:exit', 'duel:exit', 'menu:enter']);
  });

  it('returns to the previous state on pop', () => {
    const log = [];
    const machine = new StateMachine();
    const duel = createState('duel', log);

    machine.push(duel);
    machine.push(createState('pause', log));
    machine.pop();

    assert.equal(machine.current, duel);
    assert.deepEqual(log.slice(-2), ['pause:exit', 'duel:resume']);
  });

  it('updates only the state on top', () => {
    const log = [];
    const machine = new StateMachine();

    machine.push(createState('duel', log));
    machine.push(createState('pause', log));
    log.length = 0;
    machine.update(0.5);

    assert.deepEqual(log, ['pause:update:0.5']);
  });

  it('renders every state from bottom to top', () => {
    const log = [];
    const machine = new StateMachine();

    machine.push(createState('duel', log));
    machine.push(createState('pause', log));
    log.length = 0;
    machine.render();

    assert.deepEqual(log, ['duel:render', 'pause:render']);
  });
});
