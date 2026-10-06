import { createFighter } from '../characters/characterFactory.js';
import { Action } from '../config/controlsConfig.js';
import { animation as animationStyle } from '../config/fighterVisualConfig.js';
import { gameConfig } from '../config/gameConfig.js';
import { colors, textStyles } from '../config/themeConfig.js';
import { PlayerController } from '../controllers/PlayerController.js';
import { DuelRenderer } from '../rendering/DuelRenderer.js';
import { AnimationSystem } from '../systems/AnimationSystem.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { MovementSystem } from '../systems/MovementSystem.js';
import { PhysicsSystem } from '../systems/PhysicsSystem.js';
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
    this.arena = createArenaBounds(gameConfig);
    this.movement = new MovementSystem(gameConfig.physics);
    this.physics = new PhysicsSystem(gameConfig.physics, this.arena);
    this.collision = new CollisionSystem(this.arena);
    this.animator = new AnimationSystem(animationStyle);
    this.participants = this.createParticipants();
    this.fighters = this.participants.map((participant) => participant.fighter);
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
        controller: null,
      },
    ];
  }

  update(dt) {
    if (this.game.input.wasPressed(Action.PAUSE)) {
      this.game.pushState(StateId.PAUSE);
      return;
    }

    this.duelTime += dt;
    this.updateIntents();

    for (const fighter of this.fighters) {
      fighter.advanceStateTime(dt);
    }

    this.movement.applyIntents(this.fighters, dt);
    this.physics.update(this.fighters, dt);
    this.collision.update(this.fighters);
    this.movement.updateStates(this.fighters);
    this.animator.update(this.fighters, dt);
  }

  updateIntents() {
    for (const { fighter, controller } of this.participants) {
      if (controller) {
        controller.updateIntent(fighter.intent);
      } else {
        fighter.clearIntent();
      }
    }
  }

  render(renderer) {
    this.view.render(renderer, this.arena, this.fighters);
    renderer.text('Esc  pausar', renderer.width / 2, renderer.height - 40, textStyles.hint);
  }

  renderDebug(renderer) {
    for (const fighter of this.fighters) {
      renderer.strokeRect(fighter.left, fighter.top, fighter.width, fighter.height, colors.debugBody);
    }
  }

  getDebugInfo() {
    const lines = [`duel time: ${this.duelTime.toFixed(2)}s`];

    for (const fighter of this.fighters) {
      lines.push(
        `${fighter.id}: ${fighter.state}`,
        `  pos ${fighter.x.toFixed(0)}, ${fighter.y.toFixed(0)}  vel ${fighter.vx.toFixed(0)}, ${fighter.vy.toFixed(0)}`,
      );
    }

    return lines;
  }
}
