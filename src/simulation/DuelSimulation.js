import { CombatSystem } from '../combat/CombatSystem.js';
import { AnimationSystem } from '../systems/AnimationSystem.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { MovementSystem } from '../systems/MovementSystem.js';
import { PhysicsSystem } from '../systems/PhysicsSystem.js';
import { StaminaSystem } from '../systems/StaminaSystem.js';

export class DuelSimulation {
  constructor({ arena, fighters, physicsConfig, combatConfig, animationConfig, rules = {} }) {
    this.arena = arena;
    this.fighters = fighters;
    this.rules = rules;
    this.combat = new CombatSystem(arena, combatConfig, { rules, friction: physicsConfig.actionFriction });
    this.movement = new MovementSystem(physicsConfig, arena);
    this.physics = new PhysicsSystem(physicsConfig, arena);
    this.collision = new CollisionSystem(arena);
    this.stamina = new StaminaSystem();
    this.animator = new AnimationSystem(animationConfig);
  }

  get events() {
    return this.combat.events;
  }

  get projectiles() {
    return this.combat.projectiles;
  }

  step(dt) {
    const { fighters } = this;

    for (const fighter of fighters) {
      fighter.advanceStateTime(dt);
    }

    this.combat.update(fighters, dt);
    this.movement.applyIntents(fighters, dt);
    this.physics.update(fighters, dt);
    this.collision.update(fighters);
    this.movement.updateStates(fighters);
    this.combat.resolveHits(fighters);
    this.combat.projectiles.update(fighters, dt);
    this.stamina.update(fighters, dt);
    this.combat.powers.update(fighters, dt);
    this.animator.update(fighters, dt);
  }
}
