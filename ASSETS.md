# ASSETS

Registro de origem e licença de todo asset do projeto (imagens, sprites, áudio, fontes).

## Situação atual

O único asset externo é a fonte Oxanium (OFL). A pasta `media/` guarda capturas de tela do próprio jogo, usadas no README. Todos os gráficos são desenhados por código no Canvas, e todos os sons e a música são sintetizados com a Web Audio API.

## Regras

1. **Todo** arquivo adicionado em `assets/` precisa de uma linha na tabela abaixo, no mesmo commit.
2. É proibido adicionar logos, personagens, artes, músicas ou efeitos sonoros oficiais de Star Wars ou de outras franquias.
3. Só use assets com licença que permita redistribuição (ex.: CC0, CC-BY com crédito, ou criados pelo autor).
4. Assets gerados por IA ficam em `assets/generated/` e registram a ferramenta usada. Guarde o prompt quando possível.
5. Se a licença for desconhecida, o asset não entra.

## Estrutura

```
assets/
  characters/    sprites de personagens
  backgrounds/   fundos de arena
  effects/       sprites de efeitos
  ui/            elementos de interface
  audio/         música e efeitos sonoros
  fonts/         fontes
  generated/     assets gerados por IA
```

## Registro

| Arquivo | Tipo | Autor / origem | Licença | Notas |
| --- | --- | --- | --- | --- |
| src/arenas/arenaData.js (refinery) | cenário procedural | geometria original do projeto | MIT | Plataforma de Refino desenhada por código; sem imagem externa |
| src/arenas/arenaData.js (sanctuary, crystalMine) | cenário procedural | geometria original do projeto | MIT | Santuário Alagado e Mina de Cristal desenhados por código; sem imagem externa |
| src/arenas/arenaData.js (rooftop, orbital, forest) | cenário procedural | geometria original do projeto | MIT | Telhado Neon (glifos inventados, sem texto real), Anel Orbital e Floresta Lumínica desenhados por código |
| assets/fonts/Oxanium.ttf | fonte | The Oxanium Project Authors (github.com/sevmeyer/oxanium), via github.com/google/fonts | SIL OFL 1.1 | Fonte variável; licença completa em assets/fonts/Oxanium-OFL.txt |
| assets/fonts/Oxanium-OFL.txt | licença | The Oxanium Project Authors | SIL OFL 1.1 | Texto da licença distribuído junto com a fonte |
| media/menu.png, media/character-select.png, media/duel-crystal-mine.png, media/duel-rooftop.png | captura de tela | capturas do próprio jogo (Chrome headless, 1280×720) | MIT | Usadas só no README; o jogo não carrega esses arquivos |

| assets/ui/icon-192.png, assets/ui/icon-512.png | ícone PNG | geometria original do projeto, Canvas 2D com tokens de themeConfig; duas lâminas cruzadas | MIT | Sem logo de franquia, tamanhos 192 e 512 |
| media/v1.2-desktop-touch.png, media/v1.2-mobile-landscape.png, media/v1.2-mobile-pause.png, media/v1.2-mobile-portrait.png | capturas de QA | próprio jogo, Chrome headless com toque emulado | MIT | Desktop 1280×720, mobile 844×390 e retrato 390×844 |
| media/v1.4-attributes-desktop.png, media/v1.4-attributes-mobile.png | capturas de QA | próprio jogo, Chrome headless | MIT | Barras na seleção em 1280×720 e 844×390 |

| media/v1.10-skins-desktop.png, media/v1.10-skins-mobile.png | capturas de QA | próprio jogo, Chrome headless | MIT | Skins na seleção em desktop e toque emulado |

| media/v1.10-name-desktop.png, media/v1.10-name-mobile.png, media/v1.10-protagonist-desktop.png | capturas de QA | próprio jogo, Chrome headless | MIT | Campo temporário de nome e visual do protagonista, sem assets externos |

| media/v2-qa-story-duel.png, media/v2-qa-replay.png, media/v2-qa-final-replay.png, media/v2-qa-training.png, media/v2-qa-touch-pause.png | capturas de QA | próprio jogo, Chrome headless | MIT | Regressão de História, replay, Treino e pausa por toque |

| media/v2-performance-4x-full.png, media/v2-performance-4x-reduced.png, media/v2-performance-6x-full.png, media/v2-performance-6x-reduced.png | capturas de desempenho | próprio jogo, Chrome headless | MIT | F3 com Raio e Barreira simultâneos, CPU 4×/6×, efeitos completos/reduzidos |
| media/v2-performance.json | dados de QA | medição original do projeto | MIT | Janelas de timing e FPS do teste de desempenho |
