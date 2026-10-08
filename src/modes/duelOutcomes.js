import { isLastStage, nextArcadeRun } from './arcade.js';
import { nextSurvivalRun } from './survival.js';
import { ARCADE_UNLOCK, addUnlocks, findChallengeUnlocks } from './unlocks.js';
import { DuelMode } from '../states/duelModes.js';
import { StateId } from '../states/stateIds.js';
import { texts } from '../config/uiConfig.js';
import { formatText } from '../ui/formatText.js';

export function resolveDuelOutcome(result, { params, settings, character, survivalConfig }) {
  const playerWon = result.winnerSide === 0;
  const player = result.fighters[0];
  const progress = {};
  const screen = { duelParams: params };
  if (result.mode === DuelMode.SURVIVAL) {
    const run = params.survival;
    if (playerWon) {
      const next = nextSurvivalRun(run, player.health, player.maxHealth, survivalConfig.healRatio);
      Object.assign(screen, {
        title: formatText(texts.survival.winTitle, { wins: next.wins }),
        subtitle: formatText(texts.survival.health, { percent: Math.round(next.health / player.maxHealth * 100) }),
        summary: '', rematchLabel: texts.survival.next,
        rematchParams: { mode: DuelMode.SURVIVAL, survival: next },
      });
    } else {
      const best = settings.survivalBest ?? 0;
      if (run.wins > best) progress.survivalBest = run.wins;
      Object.assign(screen, {
        title: texts.survival.overTitle,
        subtitle: formatText(run.wins > best ? texts.survival.newRecord : texts.survival.score, { wins: run.wins, best: Math.max(best, run.wins) }),
        summary: '', rematchLabel: texts.survival.retry,
        rematchParams: { mode: DuelMode.SURVIVAL, survival: { ...run, wins: 0, health: null, seed: run.seed + 1 } },
      });
    }
  } else {
    let challengeLine = '';
    if (playerWon && (result.mode === DuelMode.VERSUS || result.mode === DuelMode.ARCADE)) {
      const unlocked = findChallengeUnlocks(character, result.stats[0], settings);
      if (unlocked.length) {
        progress.unlocks = addUnlocks(settings.unlocks, character.id, unlocked);
        challengeLine = formatText(texts.unlocks.unlocked, { color: unlocked.map((alt) => alt.name).join(', ') });
      }
    }
    if (result.mode === DuelMode.ARCADE && playerWon && isLastStage(params.arcade)) {
      const cleared = settings.arcadeCleared ?? [];
      let arcadeLine = '';
      if (!cleared.includes(character.id)) {
        progress.arcadeCleared = [...cleared, character.id];
        const color = character.altSaberColors.find((alt) => alt.id === ARCADE_UNLOCK);
        arcadeLine = color ? formatText(texts.unlocks.unlocked, { color: color.name }) : '';
      }
      Object.assign(screen, {
        title: texts.arcade.completeTitle,
        subtitle: formatText(texts.arcade.completeSubtitle, { name: player.name }),
        summary: '', unlockLine: [arcadeLine, challengeLine].filter(Boolean).join('   \u00b7   '),
        rematchLabel: texts.arcade.playAgain,
        rematchParams: { mode: DuelMode.ARCADE, arcade: { ...params.arcade, stage: 0 } },
      });
    } else {
      Object.assign(screen, {
        unlockLine: challengeLine, playerWon,
        winnerName: result.fighters[result.winnerSide]?.name,
        stats: { time: result.duration, ...result.stats[0] },
        opponentStats: { ...result.stats[1] }, names: result.fighters.map((fighter) => fighter.name),
      });
      if (result.mode === DuelMode.LOCAL) screen.title = formatText(texts.local.winner, { player: playerWon ? 1 : 2 });
      if (result.mode === DuelMode.ARCADE) {
        screen.rematchLabel = playerWon ? texts.arcade.nextFight : texts.arcade.retry;
        screen.rematchParams = playerWon ? { mode: DuelMode.ARCADE, arcade: nextArcadeRun(params.arcade) } : params;
      }
    }
  }
  return { state: StateId.GAME_OVER, params: screen, progress };
}
