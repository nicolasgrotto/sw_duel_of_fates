import { arenas } from '../arenas/arenaData.js';
import { AmbientSystem } from '../systems/AmbientSystem.js';
import { EnemyAI } from '../ai/EnemyAI.js';
import { DuelAudio } from '../audio/DuelAudio.js';
import { characters } from '../characters/characterData.js';
import { createFighter } from '../characters/characterFactory.js';
import { isStrongAttack } from '../combat/attackPhases.js';
import { getFrameAdvantage } from '../combat/frameData.js';
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
    this.stats = { hits: 0, blocks: 0, parries: 0, perfectParries: 0, guardBreaks: 0 };
    this.roundWins = [0, 0];
    this.roundNumber = 1;
    this.lastEvent = 'none';
    this.frameDataLine = '';
    this.debugBox = createBox();
    this.mode = this.params.mode ?? DuelMode.VERSUS;
    this.random = createRandom(createRandomSeed());
    this.arena = createArenaBounds(gameConfig);
    this.ambient = new AmbientSystem(arenas[gameConfig.duel.arena].ambient, this.arena, createRandom(createRandomSeed()));
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
      perfectParryDuckDuration: audioConfig.music.perfectParryDuckDuration,
    });
    this.hud = this.createHud();
    this.message = new CombatMessage();
    this.showRoundIntro();
    this.pauseHint = formatText(texts.duel.pauseHint, { pause: formatActionKeys(keyBindings, Action.PAUSE) });
  }

  createHud() {
    const rounds = this.isTraining ? null : { wins: this.roundWins, roundsToWin: gameConfig.duel.roundsToWin };
    return new Hud(this.fighters[0], this.fighters[1], rounds);
  }

  showRoundIntro() {
    const isFinal = !this.isTraining && this.roundWins.every((wins) => wins === gameConfig.duel.roundsToWin - 1);
    const text = isFinal ? texts.duel.finalRound : formatText(texts.duel.intro, { number: this.roundNumber });
    this.message.show(text, layout.messages.introDuration);
  }

  finishRound() {
    if (!this.isTraining && this.outcome.winner && this.roundWins.some((wins) => wins >= gameConfig.duel.roundsToWin)) {
      this.showResult();
      return;
    }
    this.startNextRound();
  }

  startNextRound() {
    const centerX = (this.arena.left + this.arena.right) / 2;
    const half = gameConfig.duel.spawnDistance / 2;
    this.fighters[0].resetForRound(centerX - half, 1);
    this.fighters[1].resetForRound(centerX + half, -1);
    this.participants[0].controller.clearCapturedInput();
    if (this.isTraining) {
      this.opponentController.attackTimer = 0;
    } else {
      this.opponentController = this.createOpponentController(this.fighters[1], this.player, gameConfig.duel.opponentCharacter);
      this.participants[1].controller = this.opponentController;
    }
    this.camera = new Camera(effectsConfig, this.random);
    this.timeControl = new TimeControl();
    this.effects = new EffectsSystem(effectsConfig, this.camera, this.random, this.timeControl);
    this.effects.setReduced(this.game.settings.reducedEffects);
    this.view = new DuelRenderer();
    this.hud = this.createHud();
    this.outcome = null;
    this.introTime = 0;
    this.frameDataLine = '';
    this.roundNumber += 1;
    this.showRoundIntro();
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
        this.finishRound();
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

    this.ambient.update(dt);
    this.effects.update(dt);
    this.camera.frame(
      Math.min(this.fighters[0].left, this.fighters[1].left),
      Math.max(this.fighters[0].right, this.fighters[1].right),
      gameConfig.canvas.width, this.arena.floorY, dt,
    );
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
    for (const event of this.simulation.events) {
      const type = event.type === CombatEvent.HIT && isStrongAttack(event.attackType) ? 'heavyHit' : event.type;
      this.game.input.rumble?.(type, this.game.settings.reducedEffects);
    }
    this.hud.handleEvents(this.simulation.events);
    this.rememberLastEvent();
    this.countPlayerStats();
    this.updateFrameData();
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
      } else if (event.type === CombatEvent.PARRY && event.defender === this.player) {
        this.stats.parries += 1;
      } else if (event.type === CombatEvent.PERFECT_PARRY && event.defender === this.player) {
        this.stats.perfectParries += 1;
      } else if (event.type === CombatEvent.GUARD_BREAK && event.attacker === this.player) {
        this.stats.guardBreaks += 1;
      }
    }
  }

  updateFrameData() {
    if (!this.isTraining) {
      return;
    }
    for (const event of this.simulation.events) {
      const result = texts.training.results[event.type];
      if (event.attacker !== this.player || !result) {
        continue;
      }
      const advantage = getFrameAdvantage(event.attacker, event.defender);
      if (advantage === null) {
        continue;
      }
      const rounded = Math.round(advantage * 100) / 100;
      const sign = rounded < 0 ? '−' : '+';
      this.frameDataLine = formatText(texts.training.frameData, {
        attack: texts.training.attacks[event.attackType],
        result,
        advantage: sign + Math.abs(rounded).toFixed(2).replace('.', ','),
      });
    }
  }

  showResult() {
    this.game.pushState(StateId.GAME_OVER, {
      duelParams: this.params,
      playerWon: this.outcome.winner === this.player,
      winnerName: this.outcome.winner.name,
      stats: { time: this.duelTime, ...this.stats },
    });
  }

  checkForDeath() {
    if (this.outcome) {
      return;
    }

    for (const event of this.simulation.events) {
      if (event.type === CombatEvent.DEATH) {
        const winner = this.fighters.every((fighter) => !fighter.isAlive) ? null : event.attacker;
        this.outcome = { winner, loser: event.defender, time: 0 };
        if (winner && !this.isTraining) {
          this.roundWins[this.fighters.indexOf(winner)] += 1;
        }
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
    this.view.render(renderer, this.arena, this.fighters, this.effects, this.camera, this.ambient);
    this.hud.render(renderer);
    this.message.render(renderer);

    if (this.isTraining && this.frameDataLine) {
      renderer.text(this.frameDataLine, renderer.width / 2, layout.hud.frameDataY, textStyles.hint);
    }
    if (!this.outcome) {
      renderer.text(this.pauseHint, renderer.width / 2, layout.hud.pauseHintY, textStyles.hint);
    }
  }

  renderDebug(renderer) {
    renderer.save();
    this.camera.applyTransform(renderer);
    for (const fighter of this.fighters) {
      const hurtboxColor = isInvulnerable(fighter) ? colors.debugInvulnerable : colors.debugBody;
      renderer.strokeRect(fighter.left, fighter.top, fighter.width, fighter.height, hurtboxColor);

      if (isAttackActive(fighter)) {
        const box = getAttackHitbox(fighter, fighter.combat.attack, this.debugBox);
        renderer.strokeRect(box.left, box.top, box.right - box.left, box.bottom - box.top, colors.debugHitbox, 2);
      }
    }
    renderer.restore();
  }

  getDebugInfo() {
    const lines = [
      `round: ${this.roundNumber}  wins: ${this.roundWins.join(" / ")}`,
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
        `  parry ${fighter.combat.parryArmed ? fighter.combat.parryTime.toFixed(2) : '-'}  lockout ${fighter.combat.parryLockout.toFixed(2)}  buffer ${fighter.combat.bufferedAction ?? '-'}`,
      );
    }

    return lines;
  }
}
