import { it } from 'node:test';
import assert from 'node:assert/strict';
import { BUDGET, evaluateBudget, parseArgs, runOrder, selectGameFrames, summarizeCpu, summarizeWall } from '../tools/perfBudget.js';

it('alternates A/B as ABBA per round and keeps a single directory in order', () => {
  assert.deepEqual(runOrder(2, 2), [0, 1, 1, 0, 0, 1, 1, 0]);
  assert.deepEqual(runOrder(1, 3), [0, 0, 0]);
});

it('reads cases, rounds and directories from the command line', () => {
  const options = parseArgs(['--cases', 'normal,stress', '--rounds', '3', 'a', 'b']);
  assert.deepEqual(options.cases, ['normal', 'stress']);
  assert.equal(options.rounds, 3);
  assert.equal(options.dirs.length, 2);
  assert.throws(() => parseArgs(['--unknown', '1']));
  assert.throws(() => parseArgs(['a', 'b', 'c']));
});

it('keeps only the game animation frames from the trace, in time order', () => {
  const events = [
    { name: 'FireAnimationFrame', ph: 'X', ts: 30, dur: 3000, tdur: 2000, args: { data: { id: 7 } } },
    { name: 'FireAnimationFrame', ph: 'X', ts: 10, dur: 1500, tdur: 1000, args: { data: { id: 5 } } },
    { name: 'FireAnimationFrame', ph: 'X', ts: 20, dur: 900, tdur: 800, args: { data: { id: 6 } } },
    { name: 'Paint', ph: 'X', ts: 25, dur: 100, tdur: 100, args: { data: { id: 5 } } },
  ];
  assert.deepEqual(selectGameFrames(events, [5, 7]), [{ cpu: 1, wall: 1.5 }, { cpu: 2, wall: 3 }]);
});

it('projects the mean CPU per frame by the throttle and checks the budget', () => {
  const frames = Array.from({ length: 120 }, (_, index) => ({ cpu: index < 60 ? 1 : 2, wall: 2 }));
  const cpu = summarizeCpu(frames, 6, 60);
  assert.equal(cpu.mean, 1.5);
  assert.equal(cpu.maxWindow, 2);
  assert.equal(cpu.projected, 9);
  const wallAtOne = summarizeWall([{ updateMs: 0.2, renderMs: 1.2 }, { updateMs: 0.3, renderMs: 1.4 }], [{ interval: 16.7, steps: 1 }, { interval: 33.4, steps: 2 }]);
  assert.equal(wallAtOne.maxWindowRender, 1.4);
  assert.equal(wallAtOne.multiStepShare, 0.5);
  const budget = evaluateBudget(cpu, wallAtOne, 6);
  assert.ok(budget.projectedRender <= BUDGET.renderMs);
  assert.equal(budget.pass, true);
  assert.equal(evaluateBudget({ projected: BUDGET.frameMs + 1 }, wallAtOne, 6).pass, false);
});
