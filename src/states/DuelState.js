import { EnemyAI } from '../ai/EnemyAI.js';
import { DuelAudio } from '../audio/DuelAudio.js';
import { characters } from '../characters/characterData.js';
import { createFighter } from '../characters/characterFactory.js';
import { CombatEvent } from '../combat/combatEvents.js';
import { createBox, getAttackHitbox, isAttackActive, isInvulnerable } from '../combat/hitboxes.js';
import { aiConfig } from '../config/aiConfig.js';
import { audioConfig } from '../config/audioConfig.js';
import { Action, keyBindings } from '../config/controlsConfig.js';
import { effectsConfig } from '../config/effectsConfig.js';
import { animation as animationStyle } from '../config/fighterVisualConfig.js';
import { gameConfig } from '../config/gameConfig.js';
import { colors, textStyles } from '../config/themeConfig.js';
import { layout, texts } from '../config/uiConfig.js';
import { DummyController } from '../controllers/DummyController.js';
import { Camera } from '../core/Camera.js';
import { PlayerController } from '../controllers/PlayerController.js';
import { DuelRenderer } from '../rendering/DuelRenderer.js';
import { createArenaBounds } from '../simulation/arenaBounds.js';
import { DuelSimulation } from '../simulation/DuelSimulation.js';
import { EffectsSystem } from '../systems/EffectsSystem.js';
import { TimeControl } from '../systems/TimeControl.js';
import { CombatMessage } from '../ui/CombatMessage.js';
import { formatText } from '../ui/formatText.js';
import { Hud } from '../ui/Hud.js';
import { formatActionKeys } from '../ui/keyLabels.js';
import { createRandom, createRandomSeed } from '../utils/random.js';
import { GameState } from './GameState.js';
import { DuelMode } from './duelModes.js';
import { StateId } from './stateIds.js';

export class DuelState extends GameState {
  enter() {
    this.duelTime = 0;
    this.introTime = 0;
    this.outcome = null;
    this.stats = { hits: 0, blocks: 0 };
    this.lastEvent = 'none';
    this.debugBox = createBox();
    this.mode = this.params.mode ?? DuelMode.VERSUS;
    this.random = createRandom(createRandomSeed());
    this.arena = createArenaBounds(gameConfig);
    this.participants = this.createParticipants();
    this.opponentController = this.participants[1].controller;
    this.fighters = this.participants.map((participant) => participant.fighter);
    this.simulation = new DuelSimulation({
      arena: this.arena,
      fighters: this.fighters,
      physicsConfig: gameConfig.physics,
      combatConfig: gameConfig.combat,
      animationConfig: animationStyle,
    });
    this.camera = new Camera(effectsConfig, this.random);
    this.timeControl = new TimeControl();
    this.effects = new EffectsSystem(effectsConfig, this.camera, this.random, this.timeControl);
    this.effects.setReduced(this.game.settings.reducedEffects);
    this.view = new DuelRenderer();
    this.duelAudio = new DuelAudio(this.game.audio, {
      arenaWidth: gameConfig.canvas.width,
      stereoWidth: audioConfig.stereoWidth,
      hum: audioConfig.hum,
      musicDuckDuration: audioConfig.music.duckDuration,
    });
    this.hud = new Hud(this.fighters[0], this.fighters[1]);
    this.message = new CombatMessage();
    this.message.show(texts.duel.intro, layout.messages.introDuration);
    this.pauseHint = formatText(texts.duel.pauseHint, { pause: formatActionKeys(keyBindings, Action.PAUSE) });
  }

  createParticipants() {
    const { playerCharacter, opponentCharacter, spawnDistance } = gameConfig.duel;
    const centerX = (this.arena.left + this.arena.right) / 2;
    const { floorY } = this.arena;

    const player = createFighter(playerCharacter, { x: centerX - spawnDistance / 2, y: floorY, facing: 1 });
    const opponent = createFighter(opponentCharacter, { x: centerX + spawnDistance / 2, y: floorY, facing: -1 });

    return [
      { fighter: player, controller: new PlayerController(this.game.input) },
      { fighter: opponent, controller: this.createOpponentController(opponent, player, opponentCharacter) },
    ];
  }

  createOpponentController(opponent, player, characterId) {
    if (this.mode === DuelMode.TRAINING) {
      return new DummyController(gameConfig.duel.dummy);
    }

    return new EnemyAI({
      self: opponent,
      opponent: player,
      profile: aiConfig.profiles[characters[characterId].aiProfile],
      difficulty: aiConfig.difficulties[this.game.settings.difficulty],
      perception: aiConfig.perception,
      random: this.random,
    });
  }

  get isTraining() {
    return this.mode === DuelMode.TRAINING;
  }

  update(dt) {
    if (this.game.input.wasPressed(Action.PAUSE)) {
      this.game.pushState(StateId.PAUSE, { duelParams: this.params });
      return;
    }

    if (this.isTraining && this.game.debug.enabled && this.game.input.wasPressed(Action.CYCLE_DUMMY)) {
      this.opponentController.cycleBehavior();
    }

    if (this.outcome) {
      this.outcome.time += dt;
      if (this.outcome.time >= gameConfig.duel.resultDelay) {
        this.showResult();
        return;
      }
    } else if (this.isIntroPlaying()) {
      this.introTime += dt;
      this.clearAllIntents();
    }

    if (this.isPlaying()) {
      this.captureInputs();
    }

    const simulationDt = this.timeControl.scale(dt);
    if (simulationDt > 0) {
      this.stepSimulation(simulationDt);
    }

    this.effects.update(simulationDt > 0 ? simulationDt : dt);
    this.camera.update(dt);
    this.hud.update(dt);
    this.message.update(dt);
    this.duelAudio.update(this.fighters);
  }

  exit() {
    this.duelAudio.stop();
  }

  captureInputs() {
    for (const { controller } of this.participants) {
      controller.captureInput?.();
    }
  }

  isPlaying() {
    return !this.outcome && !this.isIntroPlaying();
  }

  stepSimulation(dt) {
    if (this.isPlaying()) {
      this.duelTime += dt;
      this.updateIntents(dt);
    }

    this.simulation.step(dt);
    this.effects.handleEvents(this.simulation.events);
    this.duelAudio.handleEvents(this.simulation.events);
    this.hud.handleEvents(this.simulation.events);
    this.rememberLastEvent();
    this.countPlayerStats();
    this.checkForDeath();
  }

  updateIntents(dt) {
    for (const { fighter, controller } of this.participants) {
      controller.updateIntent(fighter.intent, dt);
    }
  }

  rememberLastEvent() {
    const { events } = this.simulation;
    if (events.length > 0) {
      const event = events[events.length - 1];
      const target = event.defender ? ` → ${event.defender.id}` : '';
      this.lastEvent = `${event.type} (${event.attacker.id}${target})`;
    }
  }

  countPlayerStats() {
    for (const event of this.simulation.events) {
      if (event.type === CombatEvent.HIT && event.attacker === this.player) {
        this.stats.hits += 1;
      } else if (event.type === CombatEvent.BLOCK && event.defender === this.player) {
        this.stats.blocks += 1;
      }
    }
  }

  showResult() {
    this.game.pushState(StateId.GAME_OVER, {
      duelParams: this.params,
      playerWon: this.outcome.winner === this.player,
      winnerName: this.outcome.winner.name,
      stats: { time: this.duelTime, hits: this.stats.hits, blocks: this.stats.blocks },
    });
  }

  checkForDeath() {
    if (this.outcome) {
      return;
    }

    for (const event of this.simulation.events) {
      if (event.type === CombatEvent.DEATH) {
        this.outcome = { winner: event.attacker, loser: event.defender, time: 0 };
        this.clearAllIntents();
        this.message.show(texts.duel.knockout, layout.messages.knockoutDuration);
        return;
      }
    }
  }

  clearAllIntents() {
    for (const fighter of this.fighters) {
      fighter.clearIntent();
    }
  }

  isIntroPlaying() {
    return this.introTime < layout.messages.introDuration;
  }

  get player() {
    return this.participants[0].fighter;
  }

  render(renderer) {
    this.view.render(renderer, this.arena, this.fighters, this.effects, this.camera);
    this.hud.render(renderer);
    this.message.render(renderer);

    if (!this.outcome) {
      renderer.text(this.pauseHint, renderer.width / 2, layout.hud.pauseHintY, textStyles.hint);
    }
  }

  renderDebug(renderer) {
    for (const fighter of this.fighters) {
      const hurtboxColor = isInvulnerable(fighter) ? colors.debugInvulnerable : colors.debugBody;
      renderer.strokeRect(fighter.left, fighter.top, fighter.width, fighter.height, hurtboxColor);

      if (isAttackActive(fighter)) {
        const box = getAttackHitbox(fighter, fighter.combat.attack, this.debugBox);
        renderer.strokeRect(box.left, box.top, box.right - box.left, box.bottom - box.top, colors.debugHitbox, 2);
      }
    }
  }

  getDebugInfo() {
    const lines = [
      `duel time: ${this.duelTime.toFixed(2)}s`,
      this.isTraining
        ? `dummy (F4): ${this.opponentController.behavior}`
        : `ai: ${this.opponentController.decision} (${this.game.settings.difficulty})`,
      `last event: ${this.lastEvent}`,
    ];

    for (const fighter of this.fighters) {
      lines.push(
        `${fighter.id}: ${fighter.state}  hp ${fighter.health.toFixed(0)}  st ${fighter.stamina.toFixed(0)}`,
        `  pos ${fighter.x.toFixed(0)}, ${fighter.y.toFixed(0)}  vel ${fighter.vx.toFixed(0)}, ${fighter.vy.toFixed(0)}`,
      );
    }

    return lines;
  }
}
