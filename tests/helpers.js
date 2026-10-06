import { createFighter } from '../src/characters/characterFactory.js';
import { animation as animationStyle } from '../src/config/fighterVisualConfig.js';
import { DuelSimulation } from '../src/simulation/DuelSimulation.js';

export const STEP = 1 / 60;

export const arena = {
  left: 40,
  right: 1240,
  floorY: 600,
};

export const physicsConfig = {
  gravity: 2400,
  maxFallSpeed: 1400,
  restingSpeed: 5,
  actionFriction: 1400,
};

export function spawnFighter(x, facing = 1, characterId = 'guardian') {
  return createFighter(characterId, { x, y: arena.floorY, facing });
}

export function repeat(times, callback) {
  for (let i = 0; i < times; i += 1) {
    callback(i);
  }
}

export function createSimulation(fighters) {
  return new DuelSimulation({
    arena,
    fighters,
    physicsConfig,
    animationConfig: animationStyle,
  });
}
