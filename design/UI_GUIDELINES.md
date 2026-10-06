# UI GUIDELINES

Segue [ART_DIRECTION.md](ART_DIRECTION.md) e [VISUAL_SYSTEM.md](VISUAL_SYSTEM.md).

## Princípios

- **Minimalista**: só o que o jogador precisa agora.
- **Cinematográfica**: muito espaço vazio, texto centralizado e transições suaves.
- **Legível**: contraste alto entre texto e fundo, tamanho mínimo de 18px (lógicos) para dicas.
- **Pouco intrusiva**: durante o duelo, a UI fica nas bordas e nunca cobre a área de luta.

## Idioma

Textos da interface em **português (pt-BR)**. Código e commits em inglês.

Todos os textos ficam em `src/config/uiConfig.js` (`texts`). Para trocar o nome do jogo ou traduzir, só esse arquivo muda.

## Onde a UI é desenhada

- No canvas, pelos estados (`render`) e pelos módulos de `src/ui/`, usando `themeConfig.textStyles`.
- Sem DOM durante o gameplay. HTML/CSS fora do canvas só se houver um motivo claro (ex.: menu de opções acessível), registrado em ARCHITECTURE.md.
- Medidas e posições ficam em `uiConfig.layout`.

## Navegação

- Listas de opções são verticais e centralizadas (`MenuList`).
- `W`/`S` ou setas para cima/baixo mudam a opção. A lista dá a volta (do último vai para o primeiro).
- `Enter` confirma. `Esc` volta (na pausa, continua o duelo).
- Opção selecionada: cor `text` e um traço curto de destaque (`accent`) à esquerda. As outras ficam em `textMuted`.
- Sem mouse por enquanto.

## Telas

### Menu

- Título centralizado, em maiúsculas.
- Opções: **Duelar**, **Controles**. (A Fase 5 adiciona a dificuldade.)
- Linha discreta no rodapé com a navegação (`↑ ↓  escolher · Enter  confirmar`).

### Controles

- Tabela simples de duas colunas: ação e teclas.
- As teclas vêm de `controlsConfig` (formatadas por `ui/keyLabels.js`). Se a tecla mudar, a tela muda junto.
- `Esc` ou `Enter` volta.

### Duelo (HUD)

```
NOME ESQUERDA                                         NOME DIREITA
████████████░░░░░░                         ░░░░░░████████████
▬▬▬▬▬▬▬▬▬▬                                         ▬▬▬▬▬▬▬▬▬▬
```

- Barras finas no topo, espelhadas (jogador à esquerda, oponente à direita). A parte cheia fica presa à borda da tela e esvazia em direção ao centro.
- Vida: cor neutra clara (`hudHealth`). Abaixo de 25%, vira `hudDanger` e pisca devagar (não depende só da cor).
- Dano recebido: a parte perdida fica visível como barra "fantasma" (`hudGhost`) e encolhe depois de um pequeno atraso.
- Stamina: barra mais fina abaixo da vida (`hudStamina`).
- Fundo das barras: `hudTrack`, quase invisível.
- Nada no centro da tela, exceto mensagens curtas: **DUELO** no início e **K.O.** no golpe final, cada uma por no máximo 1,5 s.
- No início do duelo há uma introdução curta (a mensagem "DUELO"), com os controles travados.
- A dica `Esc  pausar` fica no rodapé.

### Pausa

- Overlay escuro sobre o duelo congelado.
- "PAUSADO" + opções: **Continuar**, **Reiniciar duelo**, **Sair para o menu**.
- `Esc` também continua.

### Resultado

- Aparece por cima do duelo congelado, depois do K.O. e da queda.
- Título: **VITÓRIA** ou **DERROTA**.
- Frase curta: "<nome do vencedor> venceu o duelo".
- Uma linha de estatísticas do jogador: tempo, golpes acertados, defesas.
- Opções: **Revanche**, **Menu principal**.

## Dicas de controle

- Formato: `Tecla  ação`, separadas por `·`.
- Nomes de teclas sempre gerados a partir de `controlsConfig`.

## Acessibilidade

- Não depender só de cor: vida baixa também pisca.
- Flash e screen shake com intensidade limitada (ver VFX_GUIDELINES). Planejado: opção para reduzir efeitos.

## Não fazer

- Botões coloridos, gradientes chamativos e ícones cartunescos.
- Barras grossas ou HUD ocupando mais de ~10% da altura da tela.
- Mais de uma fonte.
