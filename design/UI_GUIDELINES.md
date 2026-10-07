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
- Opções: **Duelar** (contra a IA), **Treino** (contra o boneco), **Opções**, **Controles**.

### Opções

- Lista: **Dificuldade: <nível>**, **Efeitos: Completos/Reduzidos**, **Som: Ligado/Desligado**, **Música: Ligada/Desligada**, **Teclado: A/D + J/K/L/Shift ou Setas + Z/X/C/V**, **Voltar**.
- `Enter` troca o valor da opção selecionada. `Esc` volta.
- As escolhas ficam salvas no navegador (`localStorage`) e voltam na próxima vez.
- Linha discreta no rodapé com a navegação (`↑ ↓  escolher · Enter  confirmar`).

### Controles

- Tabela simples de duas colunas: ação e teclas.
- As teclas vêm de `controlsConfig` (formatadas por `ui/keyLabels.js`). Se a tecla mudar, a tela muda junto.
- Combinações aparecem com `+` (ex.: empurrar `L  +  J`). Ações que usam a mesma tecla de outro jeito (aparar = tocar `L`) ganham linha própria com a explicação curta entre parênteses.
- `Esc` ou `Enter` volta.
- Uma linha hint no rodapé mostra os botões do gamepad padrão (A pular, X rápido, Y forte, LB/LT guarda, B esquiva, Start pausa); o direcional e A/Start também navegam/confirmam menus.

### Duelo (HUD)

```
NOME ESQUERDA                                         NOME DIREITA
████████████░░░░░░                         ░░░░░░████████████
▬▬▬▬▬▬▬▬▬▬                                         ▬▬▬▬▬▬▬▬▬▬
■ □                                                          □ ■
```

- Barras finas no topo, espelhadas (jogador à esquerda, oponente à direita). A parte cheia fica presa à borda da tela e esvazia em direção ao centro.
- Vida: cor neutra clara (`hudHealth`). Abaixo de 25%, vira `hudDanger` e pisca devagar (não depende só da cor).
- Dano recebido: a parte perdida fica visível como barra "fantasma" (`hudGhost`) e encolhe depois de um pequeno atraso.
- Stamina: barra mais fina abaixo da vida (`hudStamina`).
- **Ação recusada**: quando o lutador tenta uma ação sem stamina, a barra de stamina dele fica `hudDanger` e pisca por ~0,3 s. Diz ao jogador por que nada aconteceu.
- **Rounds**: quadrados pequenos embaixo da stamina, um por round necessário para vencer. Round vencido = cheio (`hudHealth`), não vencido = só contorno (`hudTrack`).
- Fundo das barras: `hudTrack`, quase invisível.
- Nada no centro da tela, exceto mensagens curtas: **ROUND 1**, **ROUND 2** ou **ROUND FINAL** no início de cada round e **K.O.** no golpe final, cada uma por no máximo 1,5 s.
- No início de cada round há uma introdução curta (a mensagem do round), com os controles travados.
- **Treino**: uma linha discreta (`hint`) no rodapé, acima da dica de pausa, com os dados de frame do último golpe do jogador (ex.: `Forte · bloqueado · −0,30 s`).
- A dica `Esc  pausar` fica no rodapé.

### Pausa

- Overlay escuro sobre o duelo congelado.
- "PAUSADO" + opções: **Continuar**, **Reiniciar duelo**, **Sair para o menu**.
- `Esc` também continua.

### Resultado

- Aparece por cima do duelo congelado, depois do K.O. e da queda.
- Título: **VITÓRIA** ou **DERROTA**.
- Frase curta: "<nome do vencedor> venceu o duelo".
- Duas linhas de estatísticas do jogador no duelo inteiro: tempo, golpes acertados, defesas; parries, parries perfeitos, quebras de guarda causadas.
- Opções: **Revanche**, **Menu principal**.

## Dicas de controle

- Formato: `Tecla  ação`, separadas por `·`.
- Nomes de teclas sempre gerados a partir de `controlsConfig`.

## Acessibilidade

- Não depender só de cor: vida baixa também pisca.
- Flash e screen shake com intensidade limitada (ver VFX_GUIDELINES), e opção **Efeitos: Reduzidos**.

## Não fazer

- Botões coloridos, gradientes chamativos e ícones cartunescos.
- Barras grossas ou HUD ocupando mais de ~10% da altura da tela.
- Mais de uma fonte.

### Seleção de personagem

Duelar e Treino abrem uma lista vertical de nomes, com a mesma navegação e marcador do MenuList. A silhueta do personagem selecionado aparece abaixo da lista, em guarda, com o sabre aceso. Título ESCOLHA SEU LUTADOR e dica de confirmar/voltar nas bordas. Por enquanto escolhe Guardião ou Sombra; o adversário é o outro personagem. A seleção acompanha pausa, reinício e revanche.

### Ferramentas do Treino

Inputs do jogador e do boneco aparecem em uma linha hint no rodapé (acima dos dados de frame), usando nomes de ações. F5 alterna gravação dos intents do jogador; F6 reproduz a gravação no boneco em loop, espelhando movimento pela direção de guarda. Estado e duração da gravação ficam na borda inferior esquerda. Hitboxes podem ser ligadas por F7 sem ligar todo o debug. As três teclas constam em Controles. Sem painel DOM ou elementos no centro da luta.
