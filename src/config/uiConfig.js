export const texts = {
  menu: {
    duel: 'Duelar',
    training: 'Treino',
    difficulty: 'Dificuldade: {level}',
    controls: 'Controles',
    navigation: '{up}  e  {down}  escolher   ·   {confirm}  confirmar',
  },
  controls: {
    title: 'CONTROLES',
    back: '{back}  voltar',
    actions: {
      moveLeft: 'Mover para a esquerda',
      moveRight: 'Mover para a direita',
      jump: 'Pular',
      lightAttack: 'Ataque rápido',
      heavyAttack: 'Ataque forte',
      block: 'Bloquear (segurar)',
      dodge: 'Esquivar',
      pause: 'Pausar',
      toggleDebug: 'Debug',
    },
  },
  duel: {
    intro: 'DUELO',
    knockout: 'K.O.',
    pauseHint: '{pause}  pausar',
  },
  pause: {
    title: 'PAUSADO',
    resume: 'Continuar',
    restart: 'Reiniciar duelo',
    quit: 'Sair para o menu',
  },
  result: {
    victory: 'VITÓRIA',
    defeat: 'DERROTA',
    winner: '{name} venceu o duelo',
    stats: 'Tempo  {time} s   ·   Golpes acertados  {hits}   ·   Defesas  {blocks}',
    rematch: 'Revanche',
    menu: 'Menu principal',
  },
};

export const difficultyNames = {
  easy: 'Fácil',
  normal: 'Normal',
  hard: 'Difícil',
};

export const controlsScreenActions = [
  'moveLeft',
  'moveRight',
  'jump',
  'lightAttack',
  'heavyAttack',
  'block',
  'dodge',
  'pause',
  'toggleDebug',
];

export const layout = {
  menu: {
    titleY: 230,
    firstItemY: 370,
    itemSpacing: 52,
    footerY: 660,
  },
  menuList: {
    markerWidth: 18,
    markerGap: 16,
    markerThickness: 2,
  },
  controls: {
    titleY: 110,
    firstRowY: 200,
    rowSpacing: 42,
    columnGap: 16,
    footerY: 660,
  },
  pause: {
    titleY: 250,
    firstItemY: 340,
    itemSpacing: 52,
  },
  result: {
    titleY: 210,
    winnerY: 275,
    statsY: 320,
    firstItemY: 420,
    itemSpacing: 52,
  },
  hud: {
    margin: 40,
    nameY: 32,
    healthY: 48,
    healthWidth: 440,
    healthHeight: 10,
    staminaGap: 6,
    staminaHeight: 4,
    ghostDelay: 0.4,
    ghostSpeed: 0.6,
    lowHealthRatio: 0.25,
    lowHealthBlinkPeriod: 0.8,
    lowHealthDimAlpha: 0.45,
    pauseHintY: 690,
  },
  messages: {
    y: 300,
    introDuration: 1,
    knockoutDuration: 1.2,
    fadeTime: 0.3,
  },
};
