import { createFighter } from '../characters/characterFactory.js';
import { Action } from '../config/controlsConfig.js';
import { gameConfig } from '../config/gameConfig.js';
import { colors, textStyles } from '../config/themeConfig.js';
import { PlayerController } from '../controllers/PlayerController.js';
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
    this.participants = this.createParticipants();
    this.fighters = this.participants.map((participant) => participant.fighter);
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
    this.renderArena(renderer);

    for (const fighter of this.fighters) {
      renderer.fillRect(fighter.left, fighter.top, fighter.width, fighter.height, fighter.appearance.cloakColor);
    }

    renderer.text('Esc  pausar', renderer.width / 2, renderer.height - 40, textStyles.hint);
  }

  renderArena(renderer) {
    const { left, right, floorY } = this.arena;

    renderer.fillRect(0, floorY, renderer.width, renderer.height - floorY, colors.floor);
    renderer.line(0, floorY, renderer.width, floorY, colors.floorEdge, 2);
    renderer.line(left, 0, left, floorY, colors.wall, 2);
    renderer.line(right, 0, right, floorY, colors.wall, 2);
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
