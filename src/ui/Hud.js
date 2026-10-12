import { CombatEvent } from '../combat/combatEvents.js';
import { getPowerTier } from '../combat/flowInteractions.js';
import { powersConfig } from '../config/powersConfig.js';
import { colors, textStyles } from '../config/themeConfig.js';
import { layout, texts } from '../config/uiConfig.js';
import { TAU, approach, lerp } from '../utils/math.js';

const Side = Object.freeze({
  LEFT: 'left',
  RIGHT: 'right',
});

export function canLightCostMark(fighter, power) {
  return fighter.flowMeter >= power.cost && fighter.combat.powerCooldown === 0 && fighter.flowLevel >= (power.minFlowLevel ?? 0);
}

function placeCostMarks(marks, width) {
  const { minGap, spread } = layout.hud.costMark;
  marks.sort((a, b) => a.ratio - b.ratio);
  for (let index = 0; index < marks.length; index += 1) {
    marks[index].offset = 0;
  }
  for (let index = 1; index < marks.length; index += 1) {
    if ((marks[index].ratio - marks[index - 1].ratio) * width < minGap) {
      marks[index - 1].offset -= spread;
      marks[index].offset += spread;
    }
  }
  return marks;
}

function createCostMarks(fighter) {
  const loadout = fighter.stats.power?.loadout ?? null;
  const marks = [];
  for (const power of Object.values(loadout ?? {})) {
    if (power?.hudMark && colors[power.hudMark] && !marks.some((mark) => mark.power === power)) {
      marks.push({ power, ratio: power.cost / fighter.stats.power.max, color: colors[power.hudMark], offset: 0, lit: false, pulse: 0 });
    }
  }
  return placeCostMarks(marks, layout.hud.healthWidth);
}

function createSideState(fighter, side) {
  return {
    costMarks: createCostMarks(fighter),
    costLoadout: fighter.stats.power?.loadout ?? null,
    fighter,
    side,
    ghostHealth: fighter.health,
    ghostDelay: 0,
    lastHealth: fighter.health,
    rejectTime: 0,
    powerRejectTime: 0,
    exhaustion: 0,
  };
}

export class Hud {
  constructor(leftFighter, rightFighter, rounds = null, names = null, showPower = false) {
    this.showPower = showPower;
    this.names = names ?? [leftFighter.name, rightFighter.name];
    this.nameWidths = [null, null];
    this.sides = [createSideState(leftFighter, Side.LEFT), createSideState(rightFighter, Side.RIGHT)];
    this.time = 0;
    this.rounds = rounds;
  }

  update(dt) {
    this.time += dt;
    for (const state of this.sides) {
      this.updateGhost(state, dt);
      state.rejectTime = Math.max(0, state.rejectTime - dt);
      state.powerRejectTime = Math.max(0, state.powerRejectTime - dt);
      state.exhaustion = approach(state.exhaustion, state.fighter.combat.exhausted ? 1 : 0, layout.hud.exhaustFadeRate * dt);
      this.updateCostMarks(state, dt);
    }
  }

  updateCostMarks(state, dt) {
    const loadout = state.fighter.stats.power?.loadout ?? null;
    if (loadout !== state.costLoadout) {
      state.costLoadout = loadout;
      state.costMarks = createCostMarks(state.fighter);
    }
    for (const mark of state.costMarks) {
      const lit = canLightCostMark(state.fighter, mark.power);
      mark.pulse = lit && !mark.lit ? layout.hud.costMark.pulseDuration : Math.max(0, mark.pulse - dt);
      mark.lit = lit;
    }
  }

  handleEvents(events) {
    for (const event of events) {
      if (event.type === CombatEvent.ACTION_REJECTED) {
        this.flashRejected(event.attacker, event.attackType === 'power');
      }
    }
  }

  flashRejected(fighter, power = false) {
    for (const state of this.sides) {
      if (state.fighter === fighter && power) {
        state.powerRejectTime = layout.hud.rejectFlashDuration;
      } else if (state.fighter === fighter) {
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
    const viewLeft = renderer.viewLeft ?? 0;
    const viewRight = viewLeft + (renderer.viewWidth ?? renderer.width);
    const barX = isLeft ? viewLeft + margin : viewRight - margin - healthWidth;
    const staminaY = healthY + healthHeight + staminaGap;
    const { maxHealth, maxStamina } = fighter.stats;

    renderer.text(this.names[isLeft ? 0 : 1], isLeft ? viewLeft + margin : viewRight - margin, nameY, isLeft ? textStyles.hudNameLeft : textStyles.hudNameRight);

    renderer.fillRect(barX, healthY, healthWidth, healthHeight, colors.hudTrack);
    this.fillBar(renderer, barX, healthY, healthWidth, healthHeight, state.ghostHealth / maxHealth, isLeft, colors.hudGhost);
    this.renderHealth(renderer, fighter, barX, isLeft);

    renderer.fillRect(barX, staminaY, healthWidth, staminaHeight, colors.hudTrack);
    this.fillBar(renderer, barX, staminaY, healthWidth, staminaHeight, fighter.stamina / maxStamina, isLeft, this.getStaminaColor(state));
    this.renderExhaustion(renderer, state, barX, staminaY, fighter.stamina / maxStamina, isLeft);
    this.renderWound(renderer, fighter, isLeft, viewLeft, viewRight);
    this.renderPower(renderer, state, barX, staminaY + staminaHeight, isLeft);
    this.renderRounds(renderer, isLeft, viewLeft, viewRight);
    if (state.rejectTime > 0) {
      renderer.strokeRect(barX, staminaY, healthWidth, staminaHeight, this.getStaminaColor(state));
    }
  }

  renderExhaustion(renderer, state, barX, staminaY, ratio, isLeft) {
    if (state.exhaustion <= 0) {
      return;
    }
    const { healthWidth, staminaHeight, exhaustPulsePeriod, exhaustMinAlpha } = layout.hud;
    const pulse = (Math.cos((this.time / exhaustPulsePeriod) * TAU) + 1) / 2;
    renderer.save();
    renderer.setAlpha(state.exhaustion * (exhaustMinAlpha + (1 - exhaustMinAlpha) * pulse));
    renderer.strokeRect(barX, staminaY, healthWidth, staminaHeight, colors.hudExhausted);
    this.fillBar(renderer, barX, staminaY, healthWidth, staminaHeight, ratio, isLeft, colors.hudExhausted);
    renderer.restore();
  }

  renderWound(renderer, fighter, isLeft, viewLeft, viewRight) {
    const { wound } = fighter.combat;
    if (!wound) {
      return;
    }
    const { margin, nameY, woundGap } = layout.hud;
    const index = isLeft ? 0 : 1;
    this.nameWidths[index] ??= renderer.measureText(this.names[index], isLeft ? textStyles.hudNameLeft : textStyles.hudNameRight);
    const nameWidth = this.nameWidths[index];
    const x = isLeft ? viewLeft + margin + nameWidth + woundGap : viewRight - margin - nameWidth - woundGap;
    renderer.text(texts.hud.wounds[wound], x, nameY, isLeft ? textStyles.hudWoundLeft : textStyles.hudWoundRight);
  }

  renderPower(renderer, state, barX, y, isLeft) {
    if (!this.showPower) {
      return;
    }
    const { fighter } = state;
    const { healthWidth, powerGap, powerHeight } = layout.hud;
    const barY = y + powerGap;
    const tierColor = getPowerTier(fighter.flowLevel, powersConfig.tiers).color;
    const period = layout.hud.rejectBlinkPeriod;
    const color = state.powerRejectTime > 0 && state.powerRejectTime % period >= period / 2 ? colors.hudDanger : tierColor;
    renderer.fillRect(barX, barY, healthWidth, powerHeight, colors.hudTrack);
    this.fillBar(renderer, barX, barY, healthWidth, powerHeight, fighter.flowMeter / fighter.stats.power.max, isLeft, color);
    this.renderCostMarks(renderer, state, barX, barY + powerHeight / 2, isLeft);
  }

  renderCostMarks(renderer, state, barX, centerY, isLeft) {
    const mark = layout.hud.costMark;
    const width = layout.hud.healthWidth;
    for (const cost of state.costMarks) {
      const x = (isLeft ? barX + cost.ratio * width : barX + width - cost.ratio * width) + cost.offset;
      renderer.fillRect(x - mark.width / 2, centerY - mark.height / 2, mark.width, mark.height, cost.lit ? cost.color : colors.hudMarkIdle);
      if (!cost.lit) {
        continue;
      }
      renderer.save();
      renderer.setBlendMode('lighter');
      renderer.drawGlow(x, centerY, mark.glowRadius, cost.color, mark.glowAlpha);
      if (cost.pulse > 0) {
        const progress = cost.pulse / mark.pulseDuration;
        renderer.drawGlow(x, centerY, lerp(mark.glowRadius, mark.pulseRadius, 1 - progress), cost.color, mark.pulseAlpha * progress);
      }
      renderer.restore();
    }
  }

  renderRounds(renderer, isLeft, viewLeft = 0, viewRight = renderer.width) {
    if (!this.rounds) {
      return;
    }
    const { margin, roundY, roundSize, roundGap } = layout.hud;
    const won = this.rounds.wins[isLeft ? 0 : 1];
    for (let index = 0; index < this.rounds.roundsToWin; index += 1) {
      const offset = index * (roundSize + roundGap);
      const x = isLeft ? viewLeft + margin + offset : viewRight - margin - roundSize - offset;
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
