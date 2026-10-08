import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { colors } from '../src/config/themeConfig.js';
import { layout } from '../src/config/uiConfig.js';
import { Hud } from '../src/ui/Hud.js';
import { STEP, repeat, spawnFighter } from './helpers.js';

function createHud() {
  const left = spawnFighter(300, 1);
  const right = spawnFighter(900, -1, 'shadow');
  return { left, right, hud: new Hud(left, right) };
}

describe('Hud', () => {
  it('keeps the ghost bar during the delay and then shrinks it to the health', () => {
    const { left, hud } = createHud();
    const [leftState] = hud.sides;

    left.health -= 30;
    hud.update(STEP);
    assert.equal(leftState.ghostHealth, left.stats.maxHealth);

    repeat(Math.ceil(layout.hud.ghostDelay / STEP) + 2, () => hud.update(STEP));
    assert.ok(leftState.ghostHealth < left.stats.maxHealth);

    repeat(120, () => hud.update(STEP));
    assert.equal(leftState.ghostHealth, left.health);
  });

  it('restarts the delay when a new hit lands', () => {
    const { left, hud } = createHud();
    const [leftState] = hud.sides;
    left.health -= 10;
    repeat(Math.ceil(layout.hud.ghostDelay / STEP) + 5, () => hud.update(STEP));
    const ghostBefore = leftState.ghostHealth;

    left.health -= 10;
    hud.update(STEP);

    assert.equal(leftState.ghostHealth, ghostBefore);
  });

  it('detects low health', () => {
    const { left, hud } = createHud();

    assert.equal(hud.isLowHealth(left), false);
    left.health = left.stats.maxHealth * layout.hud.lowHealthRatio - 1;
    assert.equal(hud.isLowHealth(left), true);
  });

  it('draws mirrored bars: the right bar empties toward the center', () => {
    const { right, hud } = createHud();
    right.health = right.stats.maxHealth / 2;
    right.stamina = 0;
    const rects = [];
    const renderer = {
      width: 1280,
      text: () => {},
      save: () => {},
      restore: () => {},
      setAlpha: () => {},
      fillRect: (x, y, width, height, color) => rects.push({ x, width, color }),
    };

    hud.render(renderer);

    const { margin, healthWidth } = layout.hud;
    const rightHealth = rects.find((rect) => rect.x > 640 && rect.width === healthWidth / 2);
    assert.equal(rightHealth.x + rightHealth.width, 1280 - margin);
  });

  it('flashes the stamina bar of a fighter whose action was rejected', () => {
    const { left, hud } = createHud();
    const [leftState, rightState] = hud.sides;

    hud.handleEvents([{ type: CombatEvent.ACTION_REJECTED, attacker: left }]);

    assert.equal(leftState.rejectTime, layout.hud.rejectFlashDuration);
    assert.equal(rightState.rejectTime, 0);
    assert.equal(hud.getStaminaColor(rightState), colors.hudStamina);

    repeat(Math.ceil(layout.hud.rejectFlashDuration / STEP) + 1, () => hud.update(STEP));
    assert.equal(leftState.rejectTime, 0);
    assert.equal(hud.getStaminaColor(leftState), colors.hudStamina);
  });
});

it('mirrors round markers and fills only the won rounds', () => {
  const left = spawnFighter(300, 1);
  const right = spawnFighter(900, -1, 'shadow');
  const hud = new Hud(left, right, { wins: [1, 0], roundsToWin: 2 });
  const marks = [];
  const renderer = {
    width: 1280,
    fillRect: (x, y, width, height, color) => marks.push({ x, filled: true, color }),
    strokeRect: (x, y, width, height, color) => marks.push({ x, filled: false, color }),
  };
  hud.renderRounds(renderer, true);
  hud.renderRounds(renderer, false);
  assert.deepEqual(marks.map(mark => mark.filled), [true, false, false, false]);
  assert.equal(marks[0].x, layout.hud.margin);
  assert.equal(marks[2].x + layout.hud.roundSize, 1280 - layout.hud.margin);
});

describe('Hud power meter', () => {
  function renderColors(showPower) {
    const left = spawnFighter(300, 1, 'mirror');
    const right = spawnFighter(900, -1, 'shadow');
    const hud = new Hud(left, right, null, null, showPower);
    const fills = [];
    hud.render({
      width: 1280,
      text: () => {},
      save: () => {},
      restore: () => {},
      setAlpha: () => {},
      strokeRect: () => {},
      fillRect: (x, y, width, height, color) => fills.push(color),
    });
    return fills;
  }

  it('draws the meter in the tier color only when powers are on', () => {
    assert.ok(!renderColors(false).includes(colors.powerTierSteady));
    assert.ok(renderColors(true).includes(colors.powerTierSteady));
  });
});
