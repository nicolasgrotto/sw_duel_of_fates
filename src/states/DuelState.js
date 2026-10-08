import { arenas } from '../arenas/arenaData.js';
import { AmbientSystem } from '../systems/AmbientSystem.js';
import { EnemyAI } from '../ai/EnemyAI.js';
import { DuelAudio } from '../audio/DuelAudio.js';
import { characters } from '../characters/characterData.js';
import { createFighter } from '../characters/characterFactory.js';
import { getChainStep, isStrongAttack } from '../combat/attackPhases.js';
import { getFrameAdvantage } from '../combat/frameData.js';
import { CombatEvent } from '../combat/combatEvents.js';
import { createBox, getAttackHitbox, isAttackActive, isInvulnerable } from '../combat/hitboxes.js';
import { aiConfig } from '../config/aiConfig.js';
import { audioConfig } from '../config/audioConfig.js';
import { Action, keyBindings, twoPlayerBindings } from '../config/controlsConfig.js';
import { effectsConfig } from '../config/effectsConfig.js';
import { animation as animationStyle } from '../config/fighterVisualConfig.js';
import { gameConfig } from '../config/gameConfig.js';
import { powersConfig } from '../config/powersConfig.js';
import { colors, textStyles } from '../config/themeConfig.js';
import { layout, texts } from '../config/uiConfig.js';
import { ENCODED_INTENT_RANGE, IntentRecorder, encodeIntent } from '../controllers/IntentRecorder.js';
import { formatIntent } from '../ui/trainingInputs.js';
import { DummyController } from '../controllers/DummyController.js';
import { tutorialConfig } from '../config/tutorialConfig.js';
import { ParryChallenge } from '../modes/ParryChallenge.js';
import { TutorialDirector } from '../modes/TutorialDirector.js';
import { BannerKind, ModeBanner } from '../ui/ModeBanner.js';
import { getArcadeStage } from '../modes/arcade.js';
import { getSurvivalStage } from '../modes/survival.js';
import { createDuelResult } from '../modes/DuelResult.js';
import { resolveDuelOutcome } from '../modes/duelOutcomes.js';
import { Camera } from '../core/Camera.js';
import { PlayerController } from '../controllers/PlayerController.js';
import { DuelRenderer } from '../rendering/DuelRenderer.js';
import { createArenaBounds } from '../simulation/arenaBounds.js';
import { DuelSimulation } from '../simulation/DuelSimulation.js';
import { ReplayBuffer } from '../simulation/ReplayBuffer.js';
import { EffectsSystem } from '../systems/EffectsSystem.js';
import { TimeControl } from '../systems/TimeControl.js';
import { CombatMessage } from '../ui/CombatMessage.js';
import { formatText } from '../ui/formatText.js';
import { Hud } from '../ui/Hud.js';
import { Letterbox } from '../ui/Letterbox.js';
import { clamp } from '../utils/math.js';
import { formatActionKeys } from '../ui/keyLabels.js';
import { createRandom, createRandomSeed } from '../utils/random.js';
import { GameState } from './GameState.js';
import { DuelMode, createDuelRules, hasRoundLimit, usesDummy } from './duelModes.js';
import { StateId } from './stateIds.js';

function createFighterStats() {
  return { hits: 0, damage: 0, blocks: 0, parries: 0, perfectParries: 0, guardBreaks: 0, shoves: 0, counters: 0, feints: 0, airHits: 0, longestChain: 0, powerHits: 0 };
}

export class DuelState extends GameState {
  enter() {
    this.duelTime = 0;
    this.introTime = 0;
    this.outcome = null;
    this.fighterStats = [createFighterStats(), createFighterStats()];
    this.stats = this.fighterStats[0];
    this.roundWins = [0, 0];
    this.roundNumber = 1;
    this.lastEvent = 'none';
    this.frameDataLine = '';
    this.inputsLine = '';
    this.inputSignature = -1;
    this.recorderSignature = '';
    this.recorderLine = '';
    this.trainingHitboxes = false;
    this.recorder = new IntentRecorder(gameConfig.duel.training.recordingFrames);
    this.debugBox = createBox();
    this.mode = this.params.mode ?? DuelMode.VERSUS;
    this.arcadeStage = this.mode === DuelMode.ARCADE ? getArcadeStage(this.params.arcade, gameConfig.arcade, gameConfig.duel.arenaOrder) : null;
    this.survivalStage = this.mode === DuelMode.SURVIVAL ? this.createSurvivalStage() : null;
    this.ladderStage = this.arcadeStage ?? this.survivalStage;
    this.ladderRun = this.params.arcade ?? this.params.survival ?? null;
    this.roundsToWin = this.survivalStage ? 1 : gameConfig.duel.roundsToWin;
    this.playerCharacter = this.ladderStage ? this.ladderRun.playerCharacter : (this.params.playerCharacter ?? gameConfig.duel.playerCharacter);
    this.opponentCharacter = this.ladderStage ? this.ladderStage.opponentCharacter : (this.params.opponentCharacter ?? gameConfig.duel.opponentCharacter);
    this.difficultyId = this.ladderStage ? this.ladderStage.difficulty : this.game.settings.difficulty;
    this.rules = this.params.rules ?? createDuelRules(this.mode, this.game.settings, powersConfig.modes);
    this.enraged = false;
    this.random = createRandom(createRandomSeed());
    if (this.isLocal) {
      this.game.input.setBindings(twoPlayerBindings.p1);
    }
    this.arena = createArenaBounds(gameConfig);
    this.arenaId = this.ladderStage ? this.ladderStage.arena : (this.params.arena ?? gameConfig.duel.arena);
    this.arenaDefinition = arenas[this.arenaId];
    this.ambients = this.arenaDefinition.ambient.map((config) => new AmbientSystem(config, this.arena, createRandom(createRandomSeed())));
    this.game.touch?.setFeatures(this.rules.powers ? ['powers'] : []);
    this.participants = this.createParticipants();
    this.opponentController = this.participants[1].controller;
    this.fighters = this.participants.map((participant) => participant.fighter);
    if (this.survivalStage) {
      this.applySurvivalHealth();
    }
    this.simulation = new DuelSimulation({
      arena: this.arena,
      fighters: this.fighters,
      physicsConfig: gameConfig.physics,
      combatConfig: gameConfig.combat,
      animationConfig: animationStyle,
      rules: this.rules,
    });
    this.camera = new Camera(effectsConfig, this.random);
    this.timeControl = new TimeControl();
    this.effects = new EffectsSystem(effectsConfig, this.camera, this.random, this.timeControl);
    this.effects.setReduced(this.game.settings.reducedEffects);
    this.view = new DuelRenderer(this.arenaDefinition);
    this.duelAudio = new DuelAudio(this.game.audio, {
      arenaWidth: gameConfig.canvas.width,
      stereoWidth: audioConfig.stereoWidth,
      hum: audioConfig.hum,
      musicDuckDuration: audioConfig.music.duckDuration,
      perfectParryDuckDuration: audioConfig.music.perfectParryDuckDuration,
      tension: audioConfig.music.tension,
      heartbeat: audioConfig.music.heartbeat,
    });
    this.hud = this.createHud();
    this.message = new CombatMessage();
    this.letterbox = new Letterbox(layout.letterbox);
    this.ignited = false;
    this.replayBuffer = new ReplayBuffer(gameConfig.replay, this.fighters.length);
    this.replayShown = false;
    this.createDirector();
    this.showRoundIntro();
    this.pauseHint = formatText(texts.duel.pauseHint, { pause: formatActionKeys(this.game.input.bindings ?? keyBindings, Action.PAUSE) });
  }

  createDirector() {
    this.director = null;
    this.banner = null;
    this.modeFinished = false;
    const bindings = this.game.input.bindings ?? keyBindings;
    if (this.mode === DuelMode.TUTORIAL) {
      this.director = new TutorialDirector(tutorialConfig.steps);
      this.banner = new ModeBanner(BannerKind.TUTORIAL, this.director, bindings);
    } else if (this.mode === DuelMode.CHALLENGE) {
      this.director = new ParryChallenge(tutorialConfig.challenge);
      this.banner = new ModeBanner(BannerKind.CHALLENGE, this.director, bindings);
    } else if (this.ladderStage) {
      const kind = this.survivalStage ? BannerKind.SURVIVAL : BannerKind.ARCADE;
      this.banner = new ModeBanner(kind, { ...this.ladderStage, opponentName: this.fighters[1].name }, bindings);
      this.banner.update();
    }
    this.applyDummyBehavior();
  }

  applyDummyBehavior() {
    if (this.director) {
      this.opponentController.setBehavior(this.director.dummyBehavior);
    }
  }

  updateBossEnrage() {
    const boss = this.fighters[1];
    if (!this.ladderStage?.isBoss || this.enraged || !this.isPlaying()) {
      return;
    }
    if (boss.health / boss.stats.maxHealth >= gameConfig.arcade.enrageHealthRatio) {
      return;
    }
    this.enraged = true;
    this.opponentController.difficulty = aiConfig.difficulties[gameConfig.arcade.enragedDifficulty];
    this.message.show(texts.arcade.enraged, layout.messages.knockoutDuration);
    this.letterbox.pulse(layout.letterbox.perfectParryAmount, layout.messages.knockoutDuration);
  }

  updateDirector(dt) {
    if (!this.director || !this.isPlaying()) {
      return;
    }
    this.director.update(dt, this.player);
    this.applyDummyBehavior();
    this.banner.update();
    if (this.director.isFinished && !this.modeFinished) {
      this.modeFinished = true;
      this.showModeResult();
    }
  }

  showModeResult() {
    if (this.mode === DuelMode.TUTORIAL) {
      this.game.pushState(StateId.GAME_OVER, {
        duelParams: this.params,
        title: texts.tutorial.doneTitle,
        subtitle: texts.tutorial.doneSubtitle,
        summary: '',
        rematchLabel: texts.tutorial.goToChallenge,
        rematchParams: { mode: DuelMode.CHALLENGE },
      });
      return;
    }
    const { score, parries, perfectParries, hitsTaken } = this.director;
    const best = this.game.settings.parryChallengeBest ?? 0;
    if (score > best) {
      this.game.settings.parryChallengeBest = score;
      this.game.saveSettings();
    }
    this.game.pushState(StateId.GAME_OVER, {
      duelParams: this.params,
      title: texts.tutorial.challengeDoneTitle,
      subtitle: formatText(score > best ? texts.tutorial.newRecord : texts.tutorial.score, { score, best: Math.max(best, score) }),
      summary: formatText(texts.tutorial.challengeSummary, { parries, perfectParries, hitsTaken }),
      rematchLabel: texts.tutorial.tryAgain,
      rematchParams: this.params,
    });
  }

  keepFightersAlive() {
    for (const fighter of this.fighters) {
      if (fighter.isAlive) {
        fighter.health = fighter.stats.maxHealth;
      }
    }
  }

  get usesDummy() {
    return usesDummy(this.mode);
  }

  get hasRoundLimit() {
    return hasRoundLimit(this.mode);
  }

  createHud() {
    const rounds = this.hasRoundLimit ? { wins: this.roundWins, roundsToWin: this.roundsToWin } : null;
    const names = this.isLocal ? this.fighters.map((fighter, index) => formatText(texts.local.hudName, { player: index + 1, name: fighter.name })) : null;
    return new Hud(this.fighters[0], this.fighters[1], rounds, names, this.rules.powers);
  }

  showRoundIntro() {
    const isFinal = this.hasRoundLimit && this.roundsToWin > 1 && this.roundWins.every((wins) => wins === this.roundsToWin - 1);
    const text = isFinal ? texts.duel.finalRound : formatText(texts.duel.intro, { number: this.roundNumber });
    this.message.show(text, layout.messages.introDuration);
  }

  finishRound() {
    if (this.hasRoundLimit && this.outcome.winner && this.roundWins.some((wins) => wins >= this.roundsToWin)) {
      if (this.shouldShowReplay()) {
        this.replayShown = true;
        this.game.pushState(StateId.REPLAY, {
          playback: this.replayBuffer.createPlayback(),
          fighters: this.fighters,
          arenaId: this.arenaId,
          rules: this.rules,
        });
        return;
      }
      this.showResult();
      return;
    }
    this.startNextRound();
  }

  createSurvivalStage() {
    const roster = Object.keys(characters).filter((id) => characters[id].selectable);
    return getSurvivalStage(this.params.survival, roster, gameConfig.survival, gameConfig.duel.arenaOrder);
  }

  applySurvivalHealth() {
    const { health } = this.params.survival;
    if (health !== null) {
      this.player.health = health;
    }
  }

  shouldShowReplay() {
    return !this.survivalStage && !this.replayShown && this.game.settings.finalReplay !== false && this.replayBuffer.hasReplay();
  }

  startNextRound() {
    const centerX = (this.arena.left + this.arena.right) / 2;
    const half = gameConfig.duel.spawnDistance / 2;
    this.fighters[0].resetForRound(centerX - half, 1);
    this.fighters[1].resetForRound(centerX + half, -1);
    if (this.survivalStage) {
      this.applySurvivalHealth();
    }
    this.participants[0].controller.clearCapturedInput();
    if (this.usesDummy) {
      this.opponentController.attackTimer = 0;
    } else {
      this.opponentController = this.createOpponentController(this.fighters[1], this.player, this.opponentCharacter);
      this.participants[1].controller = this.opponentController;
    }
    this.camera = new Camera(effectsConfig, this.random);
    this.timeControl = new TimeControl();
    this.effects = new EffectsSystem(effectsConfig, this.camera, this.random, this.timeControl);
    this.effects.setReduced(this.game.settings.reducedEffects);
    this.view = new DuelRenderer(this.arenaDefinition);
    this.hud = this.createHud();
    this.outcome = null;
    this.introTime = 0;
    this.frameDataLine = '';
    this.recorder.rewind();
    this.inputsLine = '';
    this.inputSignature = '';
    this.roundNumber += 1;
    this.replayBuffer.clear();
    this.ignited = false;
    this.enraged = false;
    this.showRoundIntro();
  }

  createParticipants() {
    const { spawnDistance } = gameConfig.duel;
    const { playerCharacter, opponentCharacter } = this;
    const centerX = (this.arena.left + this.arena.right) / 2;
    const { floorY } = this.arena;

    const playerSaberColor = this.ladderRun ? this.ladderRun.playerSaberColor : this.params.playerSaberColor;
    const player = createFighter(playerCharacter, { x: centerX - spawnDistance / 2, y: floorY, facing: 1 }, { saberColor: playerSaberColor });
    const opponent = createFighter(opponentCharacter, { x: centerX + spawnDistance / 2, y: floorY, facing: -1 }, { saberColor: this.params.opponentSaberColor });

    return [
      { fighter: player, controller: new PlayerController(this.game.input) },
      { fighter: opponent, controller: this.createOpponentController(opponent, player, opponentCharacter) },
    ];
  }

  createOpponentController(opponent, player, characterId) {
    if (this.isLocal) {
      return new PlayerController(this.game.secondInput);
    }
    if (this.usesDummy) {
      const dummy = new DummyController(gameConfig.duel.dummy, this.random);
      dummy.setFighters(opponent, player);
      return dummy;
    }

    return new EnemyAI({
      self: opponent,
      opponent: player,
      profile: aiConfig.profiles[characters[characterId].aiProfile],
      difficulty: aiConfig.difficulties[this.difficultyId],
      perception: aiConfig.perception,
      random: this.random,
    });
  }

  get isTraining() {
    return this.mode === DuelMode.TRAINING;
  }

  update(dt) {
    if (this.isPausePressed()) {
      this.game.pushState(StateId.PAUSE, { duelParams: this.params });
      return;
    }

    if (this.isTraining) {
      if (this.game.input.wasPressed(Action.CYCLE_DUMMY)) {
        this.opponentController.cycleBehavior();
        this.recorder.stop();
      }
      if (this.game.input.wasPressed(Action.RECORD_DUMMY)) {
        this.recorder.toggleRecording();
      }
      if (this.game.input.wasPressed(Action.PLAY_DUMMY)) {
        this.recorder.startPlayback();
      }
      if (this.game.input.wasPressed(Action.TRAINING_HITBOXES)) {
        this.trainingHitboxes = !this.trainingHitboxes;
      }
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
    this.updateIgnition();

    if (this.isPlaying()) {
      this.captureInputs();
    }

    const simulationDt = this.timeControl.scale(dt);
    if (simulationDt > 0) {
      this.stepSimulation(simulationDt);
    }

    this.updateTrainingStatus();
    this.updateDirector(dt);
    this.updateBossEnrage();
    for (const ambient of this.ambients) {
      ambient.update(dt);
    }
    this.effects.update(dt);
    this.camera.frame(
      Math.min(this.fighters[0].left, this.fighters[1].left),
      Math.max(this.fighters[0].right, this.fighters[1].right),
      gameConfig.canvas.width, this.arena.floorY, dt,
    );
    this.camera.update(dt);
    this.hud.update(dt);
    this.letterbox.setTarget(this.isPlaying() ? 0 : 1);
    this.letterbox.update(dt);
    this.message.update(dt);
    this.duelAudio.update(this.fighters);
    this.duelAudio.updateMusic(this.fighters, this.getHeartbeatFighter(), dt);
  }

  exit() {
    this.duelAudio.stop();
    if (this.isLocal) {
      this.game.applySettings();
    }
  }

  get isLocal() {
    return this.mode === DuelMode.LOCAL;
  }

  isPausePressed() {
    return this.game.input.wasPressed(Action.PAUSE) || (this.isLocal && this.game.secondInput.wasPressed(Action.PAUSE));
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

    if (this.isPlaying()) {
      this.updateTrainingInputs();
    }
    this.replayBuffer.record(this.fighters, dt);
    this.simulation.step(dt);
    this.effects.handleEvents(this.simulation.events);
    this.duelAudio.handleEvents(this.simulation.events);
    for (const event of this.simulation.events) {
      const type = event.type === CombatEvent.HIT && isStrongAttack(event.attackType) ? 'heavyHit' : event.type;
      this.game.input.rumble?.(type, this.game.settings.reducedEffects);
      if (event.type === CombatEvent.PERFECT_PARRY) {
        this.letterbox.pulse(layout.letterbox.perfectParryAmount, layout.letterbox.perfectParryDuration);
      }
    }
    this.hud.handleEvents(this.simulation.events);
    if (this.director) {
      this.director.handleEvents(this.simulation.events, this.player);
      this.keepFightersAlive();
    }
    this.rememberLastEvent();
    this.countPlayerStats();
    this.updateFrameData();
    this.checkForDeath();
  }

  updateIntents(dt) {
    for (const { fighter, controller } of this.participants) {
      if (this.isTraining && fighter !== this.player && this.recorder.play(fighter.intent, fighter.facing)) {
        continue;
      }
      controller.updateIntent(fighter.intent, dt);
    }
  }

  updateTrainingInputs() {
    if (!this.isTraining) {
      return;
    }
    this.recorder.record(this.player.intent, this.player.facing);
    const [player, dummy] = this.fighters;
    const signature = encodeIntent(player.intent, 1) * ENCODED_INTENT_RANGE + encodeIntent(dummy.intent, 1);
    if (signature !== this.inputSignature) {
      this.inputSignature = signature;
      this.inputsLine = formatText(texts.training.inputs, {
        player: formatIntent(player.intent),
        dummy: formatIntent(dummy.intent),
      });
    }
  }

  updateTrainingStatus() {
    if (!this.isTraining) {
      return;
    }
    const signature = this.recorder.mode + this.recorder.length;
    if (signature !== this.recorderSignature) {
      this.recorderSignature = signature;
      this.recorderLine = formatText(texts.training.recorder, {
        mode: texts.training.recorderModes[this.recorder.mode], seconds: (this.recorder.length * gameConfig.loop.fixedStep).toFixed(1).replace('.', ','),
      });
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
      this.countEvent(event);
    }
  }

  statsOf(fighter) {
    return this.fighterStats[this.fighters.indexOf(fighter)];
  }

  countEvent(event) {
    switch (event.type) {
      case CombatEvent.HIT: {
        const stats = this.statsOf(event.attacker);
        stats.hits += 1;
        stats.damage += event.damage;
        stats.longestChain = Math.max(stats.longestChain, getChainStep(event.attackType));
        stats.airHits += event.attackType?.startsWith('air') ? 1 : 0;
        break;
      }
      case CombatEvent.POWER_HIT: {
        const stats = this.statsOf(event.attacker);
        stats.powerHits += 1;
        stats.damage += event.damage;
        break;
      }
      case CombatEvent.BLOCK:
        this.statsOf(event.defender).blocks += 1;
        break;
      case CombatEvent.PARRY:
        this.statsOf(event.defender).parries += 1;
        break;
      case CombatEvent.PERFECT_PARRY:
        this.statsOf(event.defender).perfectParries += 1;
        break;
      case CombatEvent.GUARD_BREAK:
        this.statsOf(event.attacker).guardBreaks += 1;
        break;
      case CombatEvent.SHOVE:
        this.statsOf(event.attacker).shoves += 1;
        break;
      case CombatEvent.COUNTER:
        this.statsOf(event.defender).counters += 1;
        break;
      case CombatEvent.FEINT:
        this.statsOf(event.attacker).feints += 1;
        break;
      default:
        break;
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
    const result = createDuelResult({
      fighters: this.fighters, winner: this.outcome.winner, stats: this.fighterStats,
      duration: this.duelTime, mode: this.mode,
    });
    const outcome = resolveDuelOutcome(result, {
      params: this.params, settings: this.game.settings,
      character: characters[this.playerCharacter], survivalConfig: gameConfig.survival,
    });
    if (Object.keys(outcome.progress).length) {
      Object.assign(this.game.settings, outcome.progress);
      this.game.saveSettings();
    }
    this.game.pushState(outcome.state, outcome.params);
  }

  getHeartbeatFighter() {
    if (!this.isLocal) {
      return this.player;
    }
    const [first, second] = this.fighters;
    return first.health <= second.health ? first : second;
  }

  checkForDeath() {
    if (this.outcome) {
      return;
    }

    for (const event of this.simulation.events) {
      if (event.type === CombatEvent.DEATH) {
        const winner = this.fighters.every((fighter) => !fighter.isAlive) ? null : event.attacker;
        this.outcome = { winner, loser: event.defender, time: 0 };
        if (winner && this.hasRoundLimit) {
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

  updateIgnition() {
    if (!this.ignited && this.introTime >= layout.ignition.delay) {
      this.ignited = true;
      this.duelAudio.playIgnition();
    }
  }

  getBladeExtension() {
    const { delay, duration } = layout.ignition;
    return clamp((this.introTime - delay) / duration, 0, 1);
  }

  isIntroPlaying() {
    return this.introTime < layout.messages.introDuration;
  }

  get player() {
    return this.participants[0].fighter;
  }

  render(renderer) {
    this.view.render(renderer, this.arena, this.fighters, this.effects, this.camera, this.ambients, this.getBladeExtension());
    if (this.isTraining && this.trainingHitboxes && !this.game.debug.enabled) {
      this.renderDebug(renderer);
    }
    this.letterbox.render(renderer);
    this.hud.render(renderer);
    this.banner?.render(renderer);
    this.message.render(renderer);

    if (this.isTraining) {
      renderer.text(this.inputsLine, renderer.width / 2, layout.hud.inputsY, textStyles.hint);
      renderer.text(this.recorderLine, layout.hud.margin, layout.hud.recorderY, textStyles.trainingStatus);
    }
    if (this.isTraining && this.frameDataLine) {
      renderer.text(this.frameDataLine, renderer.width / 2, layout.hud.frameDataY, textStyles.hint);
    }
    if (!this.outcome && this.game.input.lastInputKind !== 'touch') {
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
      `input: ${this.game.input.lastInputKind ?? 'keyboard'}  touch pointers: ${this.game.touch?.pointers.size ?? 0}`,
      `duel time: ${this.duelTime.toFixed(2)}s`,
      this.usesDummy
        ? `dummy (F4): ${this.opponentController.behavior}`
        : `ai: ${this.opponentController.decision} (${this.game.settings.difficulty})`,
      `last event: ${this.lastEvent}`,
    ];

    for (const fighter of this.fighters) {
      lines.push(
        `${fighter.id}: ${fighter.state}  hp ${fighter.health.toFixed(0)}  st ${fighter.stamina.toFixed(0)}  flow ${this.rules.powers ? fighter.powerMeter.toFixed(0) : 'off'}`,
        `  ratings ${Object.values(fighter.stats.attributes).join("/")}  flow ${fighter.powerLevel}`,
        `  jumps ${fighter.combat.jumpsUsed}/${fighter.stats.movement.maxJumps}  evade ${fighter.combat.evading ? fighter.stateTime.toFixed(2) : '-'}`,
        `  pos ${fighter.x.toFixed(0)}, ${fighter.y.toFixed(0)}  vel ${fighter.vx.toFixed(0)}, ${fighter.vy.toFixed(0)}`,
        `  parry ${fighter.combat.parryArmed ? fighter.combat.parryTime.toFixed(2) : '-'}  lockout ${fighter.combat.parryLockout.toFixed(2)}  buffer ${fighter.combat.bufferedAction ?? '-'}`,
      );
    }

    return lines;
  }
}
