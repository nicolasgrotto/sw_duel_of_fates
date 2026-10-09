import { aiConfig } from '../config/aiConfig.js';
import { audioConfig } from '../config/audioConfig.js';
import { loadSettings, loadStory, saveSettings } from './settingsStorage.js';
import { storyConfig } from '../config/storyConfig.js';
import { sanitizeStoryRun } from '../modes/story/storyRun.js';
import { Action, keyBindings, keyboardPresets, keyboardPresetOrder, remappableActions, twoPlayerBindings } from '../config/controlsConfig.js';
import { createCustomBindings, sanitizeCustomBindings } from './keyBindings.js';
import { gameConfig } from '../config/gameConfig.js';
import { TouchInput } from './TouchInput.js';
import { TouchControls } from '../ui/TouchControls.js';
import { layout, texts } from '../config/uiConfig.js';
import { colors, textStyles } from '../config/themeConfig.js';
import { createState } from '../states/stateFactory.js';
import { StateId } from '../states/stateIds.js';
import { DebugOverlay } from '../utils/debug.js';
import { AudioManager } from './AudioManager.js';
import { GameLoop } from './GameLoop.js';
import { Input } from './Input.js';
import { Renderer } from './Renderer.js';
import { StateMachine } from './StateMachine.js';

export class Game {
  constructor(canvas, { coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false, getViewport = () => ({ width: window.innerWidth, height: window.innerHeight }) } = {}) {
    this.coarsePointer = coarsePointer;
    this.getViewport = getViewport;
    this.portrait = false;
    this.renderer = new Renderer(canvas, gameConfig.canvas);
    const getGamepads = () => navigator.getGamepads?.() ?? [];
    this.input = new Input({ bindings: keyBindings, target: window, getGamepads });
    this.secondInput = new Input({ bindings: twoPlayerBindings.p2, target: window, getGamepads, gamepadSlot: 1 });
    this.touch = new TouchInput({ target: canvas });
    this.input.addSource(this.touch);
    this.touchControls = new TouchControls(this.touch);
    this.states = new StateMachine();
    this.settings = loadSettings(
      { keyboardPreset: 'classic', difficulty: aiConfig.defaultDifficulty, reducedEffects: coarsePointer, sound: true, music: true, parryChallengeBest: 0, arcadeCleared: [], finalReplay: true, customBindings: {}, unlocks: {}, survivalBest: 0, powers: true },
      globalThis.localStorage,
      gameConfig.settingsStorageKey,
      { difficulty: aiConfig.difficultyOrder, keyboardPreset: keyboardPresetOrder },
    );
    this.settings.customBindings = sanitizeCustomBindings(this.settings.customBindings, remappableActions);
    this.story = sanitizeStoryRun(loadStory(globalThis.localStorage, gameConfig.settingsStorageKey), storyConfig);
    this.audio = new AudioManager(audioConfig);
    this.applySettings();
    this.unlockAudio = () => this.audio.unlock();
    window.addEventListener('keydown', this.unlockAudio, { once: true });
    window.addEventListener('pointerdown', this.unlockAudio, { once: true });
    this.debug = new DebugOverlay(gameConfig.debug);
    this.loop = new GameLoop({
      ...gameConfig.loop,
      update: (dt) => this.update(dt),
      render: (alpha) => this.render(alpha),
    });
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
  }

  start() {
    this.resizeObserver.observe(this.renderer.canvas);
    this.handleResize();
    this.renderer.canvas.focus();
    this.changeState(StateId.MENU);
    this.loop.start();
  }

  applySettings() {
    this.input.setBindings(this.getKeyboardBindings());
    this.audio.setSfxEnabled(this.settings.sound);
    this.audio.setMusicEnabled(this.settings.music);
  }

  getKeyboardBindings() {
    const { keyboardPreset, customBindings } = this.settings;
    if (keyboardPreset === 'custom') {
      return createCustomBindings(keyBindings, customBindings, remappableActions);
    }
    return keyboardPresets[keyboardPreset];
  }

  saveSettings() {
    saveSettings(this.settings, globalThis.localStorage, gameConfig.settingsStorageKey, this.story);
  }

  changeState(id, params) {
    const state = createState(id, this, params);
    state.id = id;
    this.touch.setContext(id === StateId.DUEL ? 'duel' : 'menu', id !== StateId.MENU);
    this.states.change(state);
  }

  pushState(id, params) {
    const state = createState(id, this, params);
    state.id = id;
    this.touch.setContext(id === StateId.DUEL ? 'duel' : 'menu', id !== StateId.MENU);
    this.states.push(state);
  }

  popState() {
    this.states.pop();
    const id = this.states.current?.id;
    this.touch.setContext(id === StateId.DUEL ? 'duel' : 'menu', id !== StateId.MENU);
  }

  handleResize() {
    const viewport = this.getViewport();
    const wasPortrait = this.portrait;
    this.portrait = this.coarsePointer && viewport.height > viewport.width;
    this.touch.enabled = !this.portrait;
    if (this.portrait) {
      this.input.handleBlur();
      this.secondInput.handleBlur();
    } else if (wasPortrait) {
      this.input.handleFocus();
      this.secondInput.handleFocus();
    }
    this.renderer.fitToDisplay(Math.min(window.devicePixelRatio || 1, gameConfig.canvas.maxPixelRatio));
  }

  update(dt) {
    this.input.pollGamepads();
    this.secondInput.pollGamepads();
    if (this.input.wasPressed(Action.TOGGLE_DEBUG)) {
      this.debug.toggle();
    }

    if (!this.portrait) this.states.update(dt);
    this.input.endFrame();
    this.secondInput.endFrame();
  }

  render() {
    this.renderer.clear(colors.background);
    if (this.portrait) {
      this.renderer.text(texts.touch.rotate, this.renderer.width / 2, layout.touch.rotateY, textStyles.heading);
      this.renderer.text(texts.touch.landscape, this.renderer.width / 2, layout.touch.rotateHintY, textStyles.hint);
      return;
    }
    this.states.render(this.renderer);
    this.touchControls.render(this.renderer, this.input.lastInputKind === 'touch');
    this.debug.render(this.renderer, this.states, this.loop.timings);
  }
}
