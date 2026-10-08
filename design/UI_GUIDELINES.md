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
- Toque usa seleção e confirmação em dois contatos.

## Telas

### Menu

- Título do jogo (`gameConfig.title`) centralizado, em maiúsculas, com letras espaçadas, e um subtítulo curto (`texts.menu.tagline`) em `accent`.
- Opções: **Duelar** (contra a IA), **Arcade**, **Sobrevivência**, **2 Jogadores**, **Tutorial**, **Desafio de parry**, **Treino** (contra o boneco), **Opções**, **Controles**.

### Opções

- Lista: **Dificuldade: <nível>**, **Efeitos: Completos/Reduzidos**, **Som: Ligado/Desligado**, **Música: Ligada/Desligada**, **Teclado: A/D + J/K/L/Shift ou Setas + Z/X/C/V**, **Voltar**.
- `Enter` troca o valor da opção selecionada. `Esc` volta.
- As escolhas ficam salvas no navegador (`localStorage`) e voltam na próxima vez.
- Linha discreta no rodapé com a navegação (`↑ ↓  escolher · Enter  confirmar`).

### Configurar teclas

- Aberta pelas Opções. Lista vertical (MenuList) com "Ação:  teclas" para as ações de luta, mais **Restaurar padrão** e **Voltar**.
- `Enter` escolhe a ação; a linha de dica embaixo pede a nova tecla ("Pressione a nova tecla para..."). `Esc` cancela.
- Se a tecla já estava em outra ação de luta, as duas trocam. Teclas reservadas (Esc, Enter, Backspace, P, F3–F7) mostram um aviso.
- Qualquer mudança ativa o preset **Personalizado**, salvo no navegador.

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

### Dois jogadores

- Seleção: títulos "JOGADOR 1 · ESCOLHA" e "JOGADOR 2 · ESCOLHA"; o rodapé mostra as teclas dos dois jogadores no lugar da navegação.
- HUD: "J1 · Nome" e "J2 · Nome".
- Resultado: título "JOGADOR 1 VENCE" ou "JOGADOR 2 VENCE", com a mesma tabela.

### Arcade

- A seleção tem só a etapa do lutador.
- No duelo, a linha do topo (mesma posição do tutorial) mostra a luta atual em `subtitle`.
- Resultado de cada luta: a mesma tabela do duelo; a primeira opção é **Próxima luta** (vitória) ou **Tentar de novo** (derrota). No fim: "ARCADE CONCLUÍDO", em modo resumo, com **Jogar de novo**.

### Tutorial e desafio

- Uma linha de instrução no topo, abaixo das barras (`subtitle`, centralizada), com as teclas do preset ativo. Embaixo dela, o progresso do passo (`hint`, ex.: `1 / 2`).
- No desafio de parry: o tempo restante e os pontos na mesma posição (`subtitle` e `hint`).
- Sem quadrados de round.
- Fim do tutorial e do desafio: a tela de resultado mostra título, uma frase e um resumo em uma linha (sem tabela). A primeira opção leva ao próximo passo (desafio de parry ou tentar de novo).

### Replay do golpe final

- Tela cheia, sem HUD: a cena re-simulada com letterbox fechado.
- "REPLAY" (`replayLabel`, `accent`, letras espaçadas) à esquerda na barra de baixo e a dica de pular (`replaySkip`) à direita.

### Pausa

- Overlay escuro sobre o duelo congelado.
- "PAUSADO" + opções: **Continuar**, **Lista de golpes**, **Reiniciar duelo**, **Sair para o menu**.

### Lista de golpes

- Tela opaca (fundo `background`), título "GOLPES · NOME".
- Duas colunas: teclas alinhadas à direita (`tableKey`) e a descrição alinhada à esquerda (`tableDescription`). As teclas vêm do preset ativo.
- Inclui a sequência de rápidos (com o tamanho do personagem), forte, forte de avanço, aéreo, aparar, riposta, empurrão, esquiva, a habilidade e o traço passivo.
- `Esc` ou `Enter` voltam para a pausa.
- `Esc` também continua.

### Resultado

- Aparece por cima do duelo congelado, depois do K.O. e da queda.
- Título: **VITÓRIA** ou **DERROTA**.
- Frase curta: "<nome do vencedor> venceu o duelo".
- Duração do duelo em uma linha `hint`.
- Tabela comparativa: nome de cada lutador no topo da sua coluna (`resultName`, em `accent`), valores em `resultValue` e o nome da estatística no centro em `hint`. Linhas: golpes acertados, dano causado, defesas, parries, parries perfeitos, quebras de guarda, empurrões e maior sequência.
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

**Cor da lâmina**: nas etapas de lutador (e do Jogador 2), `←`/`→` trocam a cor entre as liberadas; a silhueta mostra a cor escolhida. Duas linhas `hint` na coluna da direita: "Lâmina: Nome (n/3)" e o próximo desafio bloqueado ("Desafio: ...") ou "Todas as cores liberadas". No resultado, uma linha em `accent` avisa a cor liberada no duelo.

Duelar abre a seleção em três etapas: ESCOLHA SEU LUTADOR, ESCOLHA O ADVERSÁRIO (pode ser o mesmo personagem) e ESCOLHA A ARENA. Na etapa da arena, a coluna da direita mostra uma frase curta sobre ela e uma miniatura da arena com moldura fina em `accent`. A lista de nomes fica na coluna da esquerda, com a navegação e o marcador do MenuList. Na coluna da direita aparecem o estilo do personagem (`subtitle`), o traço e a habilidade (`hint`) e, embaixo, a silhueta em guarda com o sabre aceso. `Esc` volta uma etapa. A seleção acompanha pausa, reinício e revanche.

### Ferramentas do Treino

Inputs do jogador e do boneco aparecem em uma linha hint no rodapé (acima dos dados de frame), usando nomes de ações. F5 alterna gravação dos intents do jogador; F6 reproduz a gravação no boneco em loop, espelhando movimento pela direção de guarda. Estado e duração da gravação ficam na borda inferior esquerda. Hitboxes podem ser ligadas por F7 sem ligar todo o debug. As três teclas constam em Controles. Sem painel DOM ou elementos no centro da luta.

## Controles de toque v1.2

Resolução lógica 1280×720. Joystick flutuante na metade esquerda abaixo de y=360: origem no primeiro contato, raio 76, zona morta 18 e limite de EVADE 44 com eixo vertical dominante. Indicador de repouso em (150, 600). Arrasto horizontal move; para baixo pede esquiva de precisão uma vez por gesto.

Seis botões circulares de raio 48 na direita: habilidade (980, 510), forte (1100, 510), pulo (1220, 510), esquiva (980, 630), guarda (1100, 630) e rápido (1220, 630). Guarda e habilidade acompanham o dedo segurado. Pausa no topo central (640, 44), raio 34. Fundo usa background, borda accent e rótulo textMuted; pressionado usa text. Opacidade de repouso 0,45 e pressionado 0,85; fundo 0,55. Sem glow, cores novas ou gradientes. Estilos touchLabel e touchHint em themeConfig, Oxanium 18/20 px.

Controles aparecem apenas após toque e somem ao usar teclado/gamepad. Botão Voltar em (90, 55), raio 42, nas telas secundárias; no replay permite pular. MenuList usa região de 520 px de largura e altura igual ao espaçamento da linha: tocar seleciona e tocar a selecionada confirma. Setas de cor ficam em (590, 308) e (1170, 308), raio 32. Dica de toque substitui as teclas no rodapé. Em ponteiro coarse, 2 Jogadores e configuração de teclado ficam ocultos.

Em retrato, o canvas mostra GIRE O APARELHO e pede paisagem; simulação suspensa e inputs soltos até voltar. A área do canvas respeita safe areas; nenhum controle vai para o DOM. Ícone instalável: duas lâminas geométricas cruzadas em accent/text sobre background, original do projeto, sem logo de franquia.
