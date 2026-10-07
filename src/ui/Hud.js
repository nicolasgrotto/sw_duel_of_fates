import { CombatEvent } from '../combat/combatEvents.js';
import { colors, textStyles } from '../config/themeConfig.js';
import { layout } from '../config/uiConfig.js';
import { approach } from '../utils/math.js';

const Side = Object.freeze({
  LEFT: 'left',
  RIGHT: 'right',
});

function createSideState(fighter, side) {
  return {
    fighter,
    side,
    ghostHealth: fighter.health,
    ghostDelay: 0,
    lastHealth: fighter.health,
    rejectTime: 0,
  };
}

export class Hud {
  constructor(leftFighter, rightFighter, rounds = null) {
    this.sides = [createSideState(leftFighter, Side.LEFT), createSideState(rightFighter, Side.RIGHT)];
    this.time = 0;
    this.rounds = rounds;
  }

  update(dt) {
    this.time += dt;
    for (const state of this.sides) {
      this.updateGhost(state, dt);
      state.rejectTime = Math.max(0, state.rejectTime - dt);
    }
  }

  handleEvents(events) {
    for (const event of events) {
      if (event.type === CombatEvent.ACTION_REJECTED) {
        this.flashRejected(event.attacker);
      }
    }
  }

  flashRejected(fighter) {
    for (const state of this.sides) {
      if (state.fighter === fighter) {
        state.rejectTime = layout.hud.rejectFlashDuration;
      }
    }
  }

  getStaminaColor(state) {
    if (state.rejectTime <= 0) {
      return colors.hudStamina;
    }
    const period = layout.hud.rejectBlinkPeriod;
    return state.rejectTime % period >= period / 2 ? colors.hudDanger : colors.hudStamina;
  }

  updateGhost(state, dt) {
    const { fighter } = state;
    const { ghostDelay, ghostSpeed } = layout.hud;

    if (fighter.health < state.lastHealth) {
      state.ghostDelay = ghostDelay;
    }
    state.lastHealth = fighter.health;

    if (fighter.health >= state.ghostHealth) {
      state.ghostHealth = fighter.health;
      return;
    }
    if (state.ghostDelay > 0) {
      state.ghostDelay = Math.max(0, state.ghostDelay - dt);
      return;
    }
    state.ghostHealth = approach(state.ghostHealth, fighter.health, ghostSpeed * fighter.stats.maxHealth * dt);
  }

  isLowHealth(fighter) {
    return fighter.health / fighter.stats.maxHealth < layout.hud.lowHealthRatio;
  }

  isBlinkDimmed() {
    const period = layout.hud.lowHealthBlinkPeriod;
    return this.time % period >= period / 2;
  }

  render(renderer) {
    for (const state of this.sides) {
      this.renderSide(renderer, state);
    }
  }

  renderSide(renderer, state) {
    const { fighter, side } = state;
    const { margin, nameY, healthY, healthWidth, healthHeight, staminaGap, staminaHeight } = layout.hud;
    const isLeft = side === Side.LEFT;
    const barX = isLeft ? margin : renderer.width - margin - healthWidth;
    const staminaY = healthY + healthHeight + staminaGap;
    const { maxHealth, maxStamina } = fighter.stats;

    renderer.text(fighter.name, isLeft ? margin : renderer.width - margin, nameY, isLeft ? textStyles.hudNameLeft : textStyles.hudNameRight);

    renderer.fillRect(barX, healthY, healthWidth, healthHeight, colors.hudTrack);
    this.fillBar(renderer, barX, healthY, healthWidth, healthHeight, state.ghostHealth / maxHealth, isLeft, colors.hudGhost);
    this.renderHealth(renderer, fighter, barX, isLeft);

    renderer.fillRect(barX, staminaY, healthWidth, staminaHeight, colors.hudTrack);
    this.fillBar(renderer, barX, staminaY, healthWidth, staminaHeight, fighter.stamina / maxStamina, isLeft, this.getStaminaColor(state));
    this.renderRounds(renderer, isLeft);
    if (state.rejectTime > 0) {
      renderer.strokeRect(barX, staminaY, healthWidth, staminaHeight, this.getStaminaColor(state));
    }
  }

  renderRounds(renderer, isLeft) {
    if (!this.rounds) {
      return;
    }
    const { margin, roundY, roundSize, roundGap } = layout.hud;
    const won = this.rounds.wins[isLeft ? 0 : 1];
    for (let index = 0; index < this.rounds.roundsToWin; index += 1) {
      const offset = index * (roundSize + roundGap);
      const x = isLeft ? margin + offset : renderer.width - margin - roundSize - offset;
      if (index < won) {
        renderer.fillRect(x, roundY, roundSize, roundSize, colors.hudHealth);
      } else {
        renderer.strokeRect(x, roundY, roundSize, roundSize, colors.hudTrack);
      }
    }
  }

  renderHealth(renderer, fighter, barX, isLeft) {
    const { healthY, healthWidth, healthHeight } = layout.hud;
    const ratio = fighter.health / fighter.stats.maxHealth;
    const lowHealth = this.isLowHealth(fighter);

    renderer.save();
    if (lowHealth && this.isBlinkDimmed()) {
      renderer.setAlpha(layout.hud.lowHealthDimAlpha);
    }
    this.fillBar(renderer, barX, healthY, healthWidth, healthHeight, ratio, isLeft, lowHealth ? colors.hudDanger : colors.hudHealth);
    renderer.restore();
  }

  fillBar(renderer, x, y, width, height, ratio, anchoredLeft, color) {
    const filledWidth = width * Math.max(0, Math.min(1, ratio));
    const startX = anchoredLeft ? x : x + width - filledWidth;
    renderer.fillRect(startX, y, filledWidth, height, color);
  }
}
