import { DISPLAY_FONT } from './config/themeConfig.js';
import { Game } from './core/Game.js';

document.fonts?.load(`16px ${DISPLAY_FONT}`).catch(() => {});

const canvas = document.getElementById('game');
const game = new Game(canvas);

game.start();
