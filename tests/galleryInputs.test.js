import { it } from 'node:test';
import assert from 'node:assert/strict';
import { keyboardPresets } from '../src/config/controlsConfig.js';
import { galleryConfig } from '../src/config/galleryConfig.js';
import { layout, texts } from '../src/config/uiConfig.js';
import { Input } from '../src/core/Input.js';
import { Game } from '../src/core/Game.js';
import { TouchInput } from '../src/core/TouchInput.js';
import { GalleryDirector } from '../src/modes/GalleryDirector.js';
import { GalleryScene } from '../src/modes/GalleryScene.js';
import { GalleryPanel } from '../src/ui/GalleryPanel.js';
import { DuelState } from '../src/states/DuelState.js';
import { StateMachine } from '../src/core/StateMachine.js';
import { setLanguage } from '../src/ui/language.js';
import { createSimulation, spawnFighter } from './helpers.js';

function setup(bindings = keyboardPresets.classic, getGamepads = () => []) {
  const target = new EventTarget();
  target.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1560, height: 720 });
  const input = new Input({ bindings, target, getGamepads });
  const simulation = createSimulation([spawnFighter(400), spawnFighter(700, -1, 'shadow')], { powers: true, focusEvade: true });
  const director = new GalleryDirector({ ...galleryConfig.defaults, repeat: false });
  const scene = new GalleryScene(director, simulation);
  const panel = new GalleryPanel(scene, input, () => {});
  return { target, input, scene, director, panel };
}

function key(target, type, code) {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, { code, repeat: false });
  target.dispatchEvent(event);
}

for (const preset of ['classic', 'arrows']) {
  it(`maps gallery commands to the ${preset} keyboard preset and shows its bindings`, () => {
    const { target, input, director, scene, panel } = setup(keyboardPresets[preset]);
    const press = (code) => {
      key(target, 'keydown', code);
      panel.update();
      key(target, 'keyup', code);
      input.endFrame();
    };
    press('ArrowDown');
    assert.equal(director.item.id, 'pull');
    press('ArrowUp');
    assert.equal(director.item.id, 'push');
    press('ArrowRight');
    assert.equal(director.selection.tier, 2);
    press('ArrowLeft');
    assert.equal(director.selection.tier, 1);
    press(keyboardPresets[preset].block[0]);
    assert.equal(director.selection.target, 'blocking');
    press(keyboardPresets[preset].special[0]);
    assert.equal(director.selection.caster, 'shadow');
    assert.equal(scene.fighters[0].id, 'shadow');
    press(keyboardPresets[preset].lightAttack[0]);
    assert.equal(scene.launchPending, true);
    press(keyboardPresets[preset].heavyAttack[0]);
    assert.equal(director.selection.repeat, true);
    assert.match(panel.footer(), preset === 'classic' ? /J lançar/ : /Z lançar/);
    input.destroy();
  });
}

it('maps directional and equivalent combat buttons from the real gamepad input source', () => {
  const pad = { connected: true, mapping: 'standard', buttons: Array.from({ length: 16 }, () => ({ pressed: false })), axes: [0, 0] };
  const { input, director, scene, panel } = setup(keyboardPresets.classic, () => [pad]);
  const press = (button) => {
    pad.buttons[button].pressed = true;
    input.poll();
    panel.update();
    input.endFrame();
    pad.buttons[button].pressed = false;
    input.poll();
    input.endFrame();
  };
  press(13);
  assert.equal(director.item.id, 'pull');
  press(15);
  assert.equal(director.selection.tier, 2);
  press(4);
  assert.equal(director.selection.target, 'blocking');
  press(5);
  assert.equal(director.selection.caster, 'shadow');
  press(2);
  assert.equal(scene.launchPending, true);
  press(3);
  assert.equal(director.selection.repeat, true);
  assert.match(panel.footer(), /X lançar/);
  input.destroy();
});

it('uses gallery taps in wide view coordinates without exposing combat buttons', () => {
  const { target, input, director, scene, panel } = setup();
  const touch = new TouchInput({ target, getView: () => ({ width: 1560, offsetX: 140 }) });
  input.addSource(touch);
  touch.setContext('gallery', true);
  let pointerId = 0;
  const tap = (x, y) => {
    const id = ++pointerId;
    touch.handleDown({ pointerType: 'touch', pointerId: id, clientX: x + 140, clientY: y, preventDefault() {} });
    input.poll();
    panel.update();
    touch.handleUp({ pointerId: id });
    input.endFrame();
  };
  tap(layout.gallery.nextX, layout.banner.titleY);
  assert.equal(director.item.id, 'pull');
  tap(layout.gallery.firstTierX + layout.gallery.tierSpacing * 3, layout.gallery.tiersY);
  assert.equal(director.selection.tier, 3);
  tap(layout.gallery.targetX, layout.gallery.footerY);
  assert.equal(director.selection.target, 'blocking');
  tap(layout.gallery.castX, layout.gallery.footerY);
  assert.equal(scene.launchPending, true);
  tap(layout.gallery.repeatX, layout.gallery.footerY);
  assert.equal(director.selection.repeat, true);
  tap(layout.gallery.casterX, layout.gallery.footerY);
  assert.notEqual(director.selection.caster, 'guardian');
  assert.equal(input.isDown('lightAttack'), false);
  assert.equal(touch.joystick, null);
  input.destroy();
});

it('reads both gallery languages and the minimum-level warning from locale tables', () => {
  const { input, scene, panel } = setup();
  for (const [language, word, warning] of [['pt-BR', 'nível', 'Exige nível 6'], ['en', 'level', 'Needs level 6']]) {
    setLanguage(language);
    assert.ok(panel.detail.includes(word));
    scene.changeSelection('ability', 'storm');
    scene.changeSelection('tier', 0);
    assert.equal(panel.detail, warning);
    scene.changeSelection('tier', 1);
    assert.ok(panel.detail.includes(texts.gallery.tiers.steady));
  }
  setLanguage('pt-BR');
  input.destroy();
});

it('describes blade techniques without flow tiers and ignores tier taps for them', () => {
  const { input, scene, panel, director } = setup();
  scene.changeSelection('ability', 'spin');
  assert.equal(panel.showsTiers, false);
  assert.ok(panel.detail.startsWith('Técnica de lâmina'));
  assert.ok(!panel.detail.includes('nível'));
  const tier = director.selection.tier;
  panel.handleTap({ x: layout.gallery.firstTierX, y: layout.gallery.tiersY });
  assert.equal(director.selection.tier, tier);
  input.destroy();
});

it('exits with Back and restores gallery touch context after a real pause stack transition', () => {
  const { target, input } = setup();
  const transitions = [];
  const contexts = [];
  const states = new StateMachine();
  const game = {
    input, states,
    settings: { difficulty: 'normal', gallery: galleryConfig.defaults },
    audio: { isReady: false, play() {}, setMusicTension() {} },
    touch: { setFeatures() {}, setContext: (mode) => contexts.push(mode) },
    saveSettings() {},
    reportUpdateSafety() {},
    changeState: (id) => transitions.push(id),
    pushState: (id) => {
      transitions.push(id);
      states.push({ id, enter() {}, exit() {} });
    },
  };
  const duel = new DuelState(game, { mode: 'gallery' });
  duel.id = 'duel';
  states.push(duel);
  key(target, 'keydown', 'KeyP');
  duel.update(1 / 60);
  assert.equal(transitions.at(-1), 'pause');
  key(target, 'keyup', 'KeyP');
  input.endFrame();
  Game.prototype.popState.call(game);
  assert.equal(states.current, duel);
  assert.equal(contexts.at(-1), 'gallery');
  key(target, 'keydown', 'Escape');
  duel.update(1 / 60);
  assert.equal(transitions.at(-1), 'menu');
  duel.exit();
  input.destroy();
});
