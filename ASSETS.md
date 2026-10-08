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
