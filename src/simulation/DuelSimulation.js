import { CombatSystem } from '../combat/CombatSystem.js';
import { BladeLockSystem } from '../combat/BladeLockSystem.js';
import { AnimationSystem } from '../systems/AnimationSystem.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { MovementSystem } from '../systems/MovementSystem.js';
import { PhysicsSystem } from '../systems/PhysicsSystem.js';
import { StaminaSystem } from '../systems/StaminaSystem.js';
import { CombatEvent } from '../combat/combatEvents.js';
import { resolveCombatRules } from '../config/combatRulesConfig.js';
import { FighterState } from '../entities/fighterStates.js';

export class DuelSimulation {
  constructor({ arena, fighters, physicsConfig, combatConfig, animationConfig, rules = {} }) {
    this.arena = arena;
    this.fighters = fighters;
    this.normalFighters = [];
    this.rules = resolveCombatRules(rules);
    this.combat = new CombatSystem(arena, combatConfig, { rules: this.rules, friction: physicsConfig.actionFriction });
    this.bladeLocks = new BladeLockSystem(this.combat, fighters, arena);
    this.combat.bladeLocks = this.bladeLocks;
    this.movement = new MovementSystem(physicsConfig, arena);
    this.physics = new PhysicsSystem(physicsConfig, arena);
    this.collision = new CollisionSystem(arena);
    this.stamina = new StaminaSystem(this.rules, (fighter) => this.combat.emitAction(CombatEvent.EXHAUSTION_RECOVERED, fighter, null));
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
      if (fighter.state !== FighterState.BLADE_LOCK) fighter.advanceStateTime(dt);
    }

    this.combat.update(fighters, dt);
    this.collectNormalFighters();
    this.movement.applyIntents(this.normalFighters, dt);
    this.physics.update(this.normalFighters, dt);
    this.collision.update(this.normalFighters);
    this.movement.updateStates(this.normalFighters);
    this.combat.resolveHits(fighters);
    this.combat.projectiles.update(fighters, dt);
    this.collectNormalFighters();
    this.stamina.update(this.normalFighters, dt);
    this.combat.statuses.update(this.normalFighters, dt);
    this.combat.powers.update(this.normalFighters, dt);
    this.animator.update(fighters, dt);
    this.bladeLocks.update(dt);
  }

  collectNormalFighters() {
    this.normalFighters.length = 0;
    for (const fighter of this.fighters) {
      if (fighter.state !== FighterState.BLADE_LOCK) this.normalFighters.push(fighter);
    }
  }
}
