import { Action } from '../config/controlsConfig.js';
import { keyComboSeparator, texts } from '../config/uiConfig.js';
import { formatActionKeys } from './keyLabels.js';
import { formatText } from './formatText.js';

export function countLightChain(moves) {
  let count = 1;
  let move = moves.light;
  while (move.cancelsInto.length > 0) {
    move = moves[move.cancelsInto[0]];
    count += 1;
  }
  return count;
}

function keys(bindings, ...actions) {
  return actions.map((action) => formatActionKeys(bindings, action)).join(keyComboSeparator);
}

export function buildMoveList(character, bindings) {
  const labels = texts.moveList.moves;
  const forward = formatActionKeys(bindings, Action.MOVE_RIGHT);
  return [
    { label: formatText(labels.lightChain, { count: countLightChain(character.moves) }), keys: keys(bindings, Action.LIGHT_ATTACK) },
    { label: labels.heavy, keys: keys(bindings, Action.HEAVY_ATTACK) },
    { label: labels.forwardHeavy, keys: `${forward}${keyComboSeparator}${formatActionKeys(bindings, Action.HEAVY_ATTACK)}` },
    { label: labels.air, keys: keys(bindings, Action.JUMP) },
    { label: labels.parry, keys: keys(bindings, Action.BLOCK) },
    { label: labels.riposte, keys: keys(bindings, Action.LIGHT_ATTACK) },
    { label: labels.shove, keys: keys(bindings, Action.BLOCK, Action.LIGHT_ATTACK) },
    { label: labels.dodge, keys: keys(bindings, Action.DODGE) },
    { label: labels.evade, keys: keys(bindings, Action.EVADE) },
    { label: character.info.ability, keys: keys(bindings, Action.SPECIAL) },
    { label: character.info.trait, keys: labels.passive },
  ];
}
