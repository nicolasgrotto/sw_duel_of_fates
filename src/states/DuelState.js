import { createFighter } from '../characters/characterFactory.js';
import { CombatEvent } from '../combat/combatEvents.js';
import { createBox, getAttackHitbox, isAttackActive, isInvulnerable } from '../combat/hitboxes.js';
import { Action } from '../config/controlsConfig.js';
import { animation as animationStyle } from '../config/fighterVisualConfig.js';
import { gameConfig } from '../config/gameConfig.js';
import { colors, textStyles } from '../config/themeConfig.js';
import { DummyController } from '../controllers/DummyController.js';
import { PlayerController } from '../controllers/PlayerController.js';
import { DuelRenderer } from '../rendering/DuelRenderer.js';
import { DuelSimulation } from '../simulation/DuelSimulation.js';
import { GameState } from './GameState.js';
import { StateId } from './stateIds.js';

function createArenaBounds({ canvas, arena }) {
  return {
    left: arena.wallPadding,
    right: canvas.width - arena.wallPadding,
    floorY: arena.floorY,
  };
}

export class DuelState extends GameState {
  enter() {
    this.duelTime = 0;
    this.outcome = null;
    this.lastEvent = 'none';
    this.debugBox = createBox();
    this.dummy = new DummyController(gameConfig.duel.dummy);
    this.arena = createArenaBounds(gameConfig);
    this.participants = this.createParticipants();
    this.fighters = this.participants.map((participant) => participant.fighter);
    this.simulation = new DuelSimulation({
      arena: this.arena,
      fighters: this.fighters,
      physicsConfig: gameConfig.physics,
      combatConfig: gameConfig.combat,
      animationConfig: animationStyle,
    });
    this.view = new DuelRenderer();
  }

  createParticipants() {
    const { playerCharacter, opponentCharacter, spawnDistance } = gameConfig.duel;
    const centerX = (this.arena.left + this.arena.right) / 2;
    const { floorY } = this.arena;

    return [
      {
        fighter: createFighter(playerCharacter, { x: centerX - spawnDistance / 2, y: floorY, facing: 1 }),
        controller: new PlayerController(this.game.input),
      },
      {
        fighter: createFighter(opponentCharacter, { x: centerX + spawnDistance / 2, y: floorY, facing: -1 }),
        controller: this.dummy,
      },
    ];
  }

  update(dt) {
    if (this.game.input.wasPressed(Action.PAUSE)) {
      this.game.pushState(StateId.PAUSE);
      return;
    }

    if (this.game.debug.enabled && this.game.input.wasPressed(Action.CYCLE_DUMMY)) {
      this.dummy.cycleBehavior();
    }

    if (this.outcome) {
      this.outcome.time += dt;
      if (this.isResultVisible() && this.game.input.wasPressed(Action.CONFIRM)) {
        this.game.changeState(StateId.MENU);
        return;
      }
    } else {
      this.duelTime += dt;
      this.updateIntents(dt);
    }

    this.simulation.step(dt);
    this.rememberLastEvent();
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
      this.lastEvent = `${event.type} (${event.attacker.id} → ${event.defender.id})`;
    }
  }

  checkForDeath() {
    if (this.outcome) {
      return;
    }

    for (const event of this.simulation.events) {
      if (event.type === CombatEvent.DEATH) {
        this.outcome = { winner: event.attacker, loser: event.defender, time: 0 };
        this.clearAllIntents();
        return;
      }
    }
  }

  clearAllIntents() {
    for (const fighter of this.fighters) {
      fighter.clearIntent();
    }
  }

  isResultVisible() {
    return this.outcome !== null && this.outcome.time >= gameConfig.duel.resultDelay;
  }

  get player() {
    return this.participants[0].fighter;
  }

  render(renderer) {
    this.view.render(renderer, this.arena, this.fighters);

    if (this.isResultVisible()) {
      this.renderResult(renderer);
    } else {
      renderer.text('Esc  pausar', renderer.width / 2, renderer.height - 40, textStyles.hint);
    }
  }

  renderResult(renderer) {
    const centerX = renderer.width / 2;
    const centerY = renderer.height / 2;
    const title = this.outcome.winner === this.player ? 'VITÓRIA' : 'DERROTA';

    renderer.text(title, centerX, centerY - 120, textStyles.heading);
    renderer.text('Enter  voltar ao menu', centerX, centerY - 60, textStyles.hint);
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
      `dummy (F4): ${this.dummy.behavior}`,
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
