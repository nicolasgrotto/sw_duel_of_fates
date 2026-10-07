# ARCHITECTURE

## Objetivo

Manter o projeto modular, para que novos personagens, ataques, arenas e comportamentos de IA possam ser adicionados sem reescrever o núcleo do jogo, e para que a identidade visual possa ser trocada sem mexer no combate.

Este documento está abaixo de [DESIGN.md](DESIGN.md), dos documentos em [design/](design/) e de [GAME_DESIGN.md](GAME_DESIGN.md) na hierarquia (ver DESIGN.md). Ele diz **como** o código implementa o que esses documentos definem.

---

## Estrutura de pastas

Legenda: ✅ existe · ⏳ planejado (criar só quando a tarefa pedir)

```
index.html                  ✅ página com o canvas
styles/
  main.css                  ✅ layout da página e do canvas
design/                     ✅ direção de arte, sistema visual, UI, VFX, referências
assets/                     ⏳ ver ASSETS.md (characters, backgrounds, effects, ui, audio, fonts, generated)
src/
  main.js                   ✅ ponto de entrada
  core/                     ✅ infraestrutura do jogo
    Game.js                 ✅ monta e conecta os módulos
    GameLoop.js             ✅ loop com timestep fixo
    Input.js                ✅ teclado → ações
    Renderer.js             ✅ canvas e primitivas de desenho
    StateMachine.js         ✅ pilha de estados
    Camera.js               ✅ screen shake (com limites)
    AudioManager.js         ✅ AudioContext, buses de sfx e música, liberação no primeiro input
    settingsStorage.js      ✅ carrega e salva as opções (localStorage, tolerante a erro)
    AssetManager.js         ⏳ só quando houver assets externos
  states/                   ✅ telas do jogo
    GameState.js            ✅ classe base
    stateIds.js             ✅ ids dos estados
    duelModes.js            ✅ modos do duelo (versus, treino)
    stateFactory.js         ✅ cria estados a partir do id
    MenuState.js            ✅ título + opções (MenuList)
    ControlsState.js        ✅ tabela de controles gerada do controlsConfig
    DuelState.js            ✅ duelo: intro, simulação, efeitos, HUD, fim do duelo
    PauseState.js           ✅ continuar, reiniciar, sair
    GameOverState.js        ✅ vitória/derrota, estatísticas, revanche
    OptionsState.js         ✅ dificuldade, efeitos, som, música
  arenas/                   ✅ dados visuais de arenas, sem regras de gameplay
    arenaData.js            ✅ camadas estáticas e partículas ambientes por arena
  characters/               ✅ dados e criação de personagens
    characterData.js        ✅ personagens: nome, arquétipo, perfil de IA, aparência
    characterFactory.js     ✅ cria um Fighter a partir dos dados
  controllers/              ✅ quem controla um lutador
    PlayerController.js     ✅ Input → intent
    DummyController.js      ✅ boneco de treino (parado, bloqueando, atacando)
  entities/                 ✅ objetos do jogo
    Fighter.js              ✅ posição, velocidade, estado, intent, animação
    fighterStates.js        ✅ estados do lutador
  systems/                  ✅ processam entidades
    MovementSystem.js       ✅ intent → velocidade, pulo, direção, estado de locomoção
    PhysicsSystem.js        ✅ gravidade, chão, limites da arena
    CollisionSystem.js      ✅ corpos não se atravessam
    AnimationSystem.js      ✅ tempo, ciclo de passos, blends
    StaminaSystem.js        ✅ regeneração e gasto de stamina
    AmbientSystem.js        ✅ pool fixo de partículas ambientes, sem combate
    EffectsSystem.js        ✅ eventos de combate → faíscas, luzes de impacto, flash, shake
    ParticlePool.js         ✅ pool fixo de partículas
    TimeControl.js          ✅ hit stop e câmera lenta
  combat/                   ✅ regras de combate
    CombatSystem.js         ✅ ações, timers, hits, bloqueio, quebra de guarda, morte, eventos
    attackPhases.js         ✅ tipos de ataque e fases (startup, active, recovery)
    frameData.js            ✅ vantagem: travamento restante do defensor menos o do atacante
    actionBuffer.js         ✅ buffer de input: ação apertada fica guardada até o lutador poder agir
    hitboxes.js             ✅ hitbox, hurtbox, sobreposição, invulnerabilidade
    combatEvents.js         ✅ tipos e criação de eventos de combate
  simulation/               ✅
    DuelSimulation.js       ✅ ordem dos sistemas em um passo do duelo
    arenaBounds.js          ✅ limites da arena a partir do gameConfig
  audio/                    ✅ som sintetizado (Web Audio API, sem arquivos)
    synth.js                ✅ camadas de som, zumbido do sabre, drone de música
    DuelAudio.js            ✅ eventos de combate → sons; zumbido por lutador
    soundNames.js           ✅ nomes dos sons
  ai/                       ✅ inteligência do oponente
    EnemyAI.js              ✅ controller da IA: pensa em intervalos e preenche o intent
    perception.js           ✅ leitura pura dos lutadores (distância, ameaça, chance de punir)
  rendering/                ✅ desenho (só lê dados)
    DuelRenderer.js         ✅ ordem das camadas do duelo
    arenaRenderer.js        ✅ ArenaRenderer: camadas e chão em cache, partículas ambientes
    fighterPose.js          ✅ calcula a pose a partir do estado e da animação
    fighterRenderer.js      ✅ silhueta do lutador e sombra
    saberRenderer.js        ✅ cabo, glows, núcleo, luz no chão e no corpo
    SaberTrail.js           ✅ rastro da lâmina na fase active
    DodgeAfterimage.js      ✅ silhuetas transparentes durante a esquiva
    effectsRenderer.js      ✅ partículas, luzes de impacto e flash
  ui/                       ✅ peças de interface desenhadas no canvas
    MenuList.js             ✅ lista de opções navegável
    Hud.js                  ✅ nomes, barras de vida (com fantasma) e stamina
    CombatMessage.js        ✅ mensagens curtas (ROUND 1/2/FINAL, K.O.) com fade
    keyLabels.js            ✅ nomes de teclas a partir do controlsConfig
    formatText.js           ✅ textos com {placeholders}
  config/                   ✅ valores e ajustes
    gameConfig.js           ✅ canvas, loop, arena, física, duelo, debug
    themeConfig.js          ✅ cores, estilos de texto, animação de UI
    controlsConfig.js       ✅ ações e teclas
    uiConfig.js             ✅ textos da interface e layout das telas
    aiConfig.js             ✅ perfis, dificuldades e percepção da IA
    audioConfig.js          ✅ volumes, receitas de som, zumbido e música
    movesConfig.js          ✅ golpes por personagem: base de atributos, tipo, pose e cancelsInto
    fightersConfig.js       ✅ atributos por arquétipo (vida, stamina, corpo, movimento, ataques, esquiva)
    fighterVisualConfig.js  ✅ proporções, animação, poses de combate, sombra e estilo do sabre
    effectsConfig.js        ✅ limites e receitas de VFX
  utils/
    debug.js                ✅ overlay de debug
    math.js                 ✅ clamp, lerp, approach, smoothTowards
    easing.js               ✅ curvas de easing para poses
    random.js               ✅ RNG com seed (testes determinísticos)
tools/
  server.js                 ✅ servidor estático para desenvolvimento
  simulate.js               ✅ simulador de duelos IA × IA para balanceamento (npm run simulate)
tests/                      ✅ testes com node --test
```

Não crie arquivos vazios "para depois". Arquivo vazio tende a ser preenchido sem necessidade. Crie o arquivo junto com a tarefa que precisa dele e atualize a tabela acima.

Decisões sobre nomes:

- `Player` e `Enemy` **não** são subclasses com lógica duplicada. Ambos são `Fighter`. O que muda é quem controla: o jogador (via `Input`) ou a IA (via `EnemyAI`). Os dois produzem as mesmas ações.
- A lâmina se chama `saber` no código, não `lightsaber`. Termos neutros facilitam trocar a identidade do jogo no futuro.
- Não existe entidade `Saber`. A hitbox do golpe é um retângulo definido pelo ataque (`combat/hitboxes.js`) e o clash usa a sobreposição de duas hitboxes. A geometria da lâmina existe só no render. Criar uma entidade `Saber` só se a lâmina precisar de regras próprias (ex.: lâmina que pode ser arremessada ou desligada em jogo).
- Nenhum arquivo, classe ou variável usa nome de personagem da franquia (ex.: nada de `DarthVader.js`). Personagens são dados em `characters/`.
- O estado de combate (`IDLE`, `ATTACKING`...) pertence ao `Fighter`. Não criar um `CombatState.js` separado sem motivo.
- Dano faz parte do `CombatSystem`. Só separar em `DamageSystem` se o arquivo crescer demais.

---

## Camadas

### Core

Infraestrutura: loop, input, renderização, estados, câmera e assets.

Core **não** conhece detalhes de personagens, ataques ou IA.

### States

Controlam a tela atual (Menu, Duelo, Pausa, Game Over). Cada estado tem `enter()`, `exit()`, `update(dt)`, `render(renderer)`, `renderDebug(renderer)` e `getDebugInfo()`.

O `DuelState` é dono do duelo: cria os lutadores, os controllers (IA no modo versus, boneco no modo treino, via `params.mode`), a `DuelSimulation` e o `DuelRenderer`. Também cuida da pausa, do fim do duelo (resultado + `Enter` para o menu) e do boneco de treino (`F4` com debug ligado).

### Characters

Personagens são **dados**:

- `characterData.js`: id, nome, arquétipo e aparência (cores, capuz, capa, ângulo de guarda, tamanho da lâmina).
- `fightersConfig.js`: atributos de cada arquétipo (vida, stamina, tamanho do corpo, movimento).
- `characterFactory.createFighter(id, spawn)` junta os dois e cria um `Fighter`.

`characterData.moves` aponta para `movesConfig.movesByCharacter`. A factory resolve cada golpe combinando os atributos base de fightersConfig com a definição do personagem e cria um mapa independente por Fighter. `fighter.moves` é o catálogo; `stats.attacks` mantém o mesmo mapa para percepção, balanceamento e testes existentes. CombatSystem lê o catálogo e escolhe estado pelo tipo do golpe; o renderer escolhe pose pelo id da definição. Overrides do simulador continuam sendo aplicados antes da factory, sem snapshots de atributos no import.

Trocar todos os personagens (ex.: versão com identidade própria) deve exigir apenas mudar dados e assets, nunca o combate. Para adicionar um personagem: adicione uma entrada em `characterData.js` e, se precisar de atributos novos, um arquétipo em `fightersConfig.js`.

### Controllers

Um controller escreve no `fighter.intent` o que o lutador **quer** fazer (`moveX`, `jump`, `lightAttack`, `heavyAttack`, `block`, `dodge`). Ele nunca altera posição, vida ou estado.

- `PlayerController`: lê o `Input`. Durante o hit stop a simulação não roda, então o `DuelState` chama `captureInput()` a cada update: toques ficam guardados no controller até o próximo `updateIntent`. Assim, um ataque apertado no congelamento do impacto não se perde.
- `EnemyAI`: oponente no modo versus (ver seção AI).
- `DummyController`: boneco do modo treino.

Todo controller tem `updateIntent(intent, dt)`. O `DuelState` guarda pares `{ fighter, controller }` em `participants`. Depois que o duelo termina, os controllers param e os intents ficam zerados.

### Entities

Objetos do jogo (`Fighter`, `Saber`). Guardam dados e estado, mas não controlam o jogo inteiro e não desenham a si mesmos.

`Fighter` guarda posição (`x`, `y` nos **pés**, centro horizontal), velocidade, `facing` (1 = direita, -1 = esquerda), `grounded`, vida, stamina, estado (`FighterState`), `stateTime`, `intent`, `combat` (ataque atual, timers de stun e blockstun, direção da esquiva e da queda) e `animation`.

- `canMove`: o estado aceita locomoção (`IDLE`, `WALKING`, `JUMPING`).
- `canAct`: pode começar ataque, bloqueio ou esquiva (no chão, `IDLE` ou `WALKING`).
- `setState` só reinicia `stateTime` se o estado mudar. `restartState` sempre reinicia (ex.: dois hits seguidos).

### Systems / Combat / AI

Processam entidades. Exemplo: `PhysicsSystem` aplica gravidade, `CombatSystem` resolve golpes, `EnemyAI` escolhe ações, `EffectsSystem` cria efeitos.

### Rendering

Desenha o estado atual seguindo as camadas de [design/VISUAL_SYSTEM.md](design/VISUAL_SYSTEM.md). Só lê dados.

### Config

Todos os números de balanceamento, cores, textos e ajustes.

---

## Fluxo principal

```
main.js
  └─ new Game(canvas)
       ├─ Renderer
       ├─ Input
       ├─ StateMachine ── createState(StateId) → MenuState / DuelState / PauseState
       ├─ DebugOverlay
       └─ GameLoop
            ├─ update(step)  → debug toggle → states.update(step) → input.endFrame()
            └─ render(alpha) → renderer.clear() → states.render() → debug.render()
```

`DuelState.update(dt)`:

```
pausa?  → PauseState
dt da simulação = TimeControl.scale(dt)        0 no hit stop, dt × 0,3 na câmera lenta
se > 0: controllers → DuelSimulation.step → EffectsSystem.handleEvents → DuelAudio.handleEvents
        → estatísticas → verifica morte
EffectsSystem.update, Camera, Hud, CombatMessage, DuelAudio.update (zumbidos)   tempo real
```

Ordem dentro de `DuelSimulation.step` ([src/simulation/DuelSimulation.js](src/simulation/DuelSimulation.js)):

```
fighter.advanceStateTime    → tempo no estado atual                                        ✅
CombatSystem.update         → fim de ataques/stun/esquiva, começo de ações, lunge e dash   ✅
MovementSystem.applyIntents → direção, pulo, aceleração (ou atrito em estados de combate)  ✅
PhysicsSystem               → gravidade, integração, chão, paredes                         ✅
CollisionSystem             → separa corpos sobrepostos                                    ✅
MovementSystem.updateStates → IDLE / WALKING / JUMPING                                     ✅
CombatSystem.resolveHits    → hitbox × hurtbox, bloqueio, dano, knockback → eventos        ✅
StaminaSystem               → regeneração                                                  ✅
AnimationSystem             → tempo, ciclo de passos, blends                               ✅
```

Efeitos e câmera são só visuais e ficam fora da `DuelSimulation`, no `DuelState`. A `DuelSimulation` não conhece input, tela, renderer nem efeitos. Os testes de combate usam a mesma classe, então a ordem testada é a ordem do jogo.

`MovementSystem` só controla a locomoção de lutadores com `canMove`. Nos outros estados aplica atrito (`physics.actionFriction`), exceto na esquiva, que mantém a velocidade do dash.

Ordem do `DuelRenderer.render` (camadas do VISUAL_SYSTEM):

```
[câmera: translate(offset do shake) + zoom centrado no contato]
  arena → luz dos sabres no chão → afterimages da esquiva → corpos (sombra, capa, pernas, túnica, cabeça, braços)
  → luz dos sabres nos corpos → dessaturação (parry perfeito) → trails → sabres (com flare) → luzes de impacto → anéis → faíscas
[fim da câmera]
flash (tela inteira, sem shake) → vinheta
```

A pose de cada lutador é calculada por `computePose` a partir do estado, da fase do ataque e da animação (valores em `fighterVisualConfig.combatPoses`), em coordenadas locais (origem nos pés, olhando para a direita). O renderer espelha com `scale(facing, 1)`. Os objetos de pose são reutilizados entre frames.

---

## Game loop

Arquivo: [src/core/GameLoop.js](src/core/GameLoop.js)

- **Timestep fixo**: `update` sempre recebe o mesmo `dt` (`gameConfig.loop.fixedStep`, 1/60 s). O tempo real de cada frame entra em um acumulador e o loop executa quantos `update` couberem nele.
- `maxFrameTime` limita o tempo de um frame (ex.: aba voltando do segundo plano), evitando dezenas de updates seguidos.
- `render(alpha)` roda uma vez por frame de tela. `alpha` é a fração do próximo step (útil para interpolação, se necessário).
- `update` altera o estado. `render` apenas desenha.

Por que timestep fixo: startup, active e recovery dos ataques precisam se comportar igual em 60 Hz e 144 Hz. Também torna o combate testável e reproduzível.

O loop recebe `now`, `schedule` e `cancel` como opções. Isso permite testar sem navegador.

---

## Input

Arquivo: [src/core/Input.js](src/core/Input.js)

- Traduz teclas (`KeyboardEvent.code`) em **ações** (`Action.LIGHT_ATTACK`, `Action.PAUSE`...), usando `controlsConfig`.
- O resto do jogo só conhece ações, nunca teclas.
- `isDown(action)`: tecla segurada.
- `wasPressed(action)`: tecla pressionada desde o último update. É limpo por `endFrame()`, chamado pelo `Game` depois de cada update. Assim, um toque nunca é perdido nem lido duas vezes, mesmo com timestep fixo.
- Uma tecla pode estar ligada a mais de uma ação. Nesse caso, todas são disparadas.
- Ao perder o foco da janela, todas as teclas são soltas.
- O alvo dos eventos é injetado (`window` no jogo, `EventTarget` nos testes).

---

`Input.pollGamepads()` roda antes de cada update do Game e lê o primeiro controle conectado com mapping standard, por API injetada. Converte botões/eixos em ações com deadzone; guarda bordas de toque separadas do teclado e libera tudo ao desconectar/perder foco. Gamepad e teclado podem coexistir. `Input.rumble` recebe somente um tipo de impacto do DuelState, com receita em controlsConfig, e tolera hardware sem atuador. Efeitos reduzidos diminuem vibração a 25%. Nenhum módulo de gameplay acessa navigator.

`keyboardPresets` em controlsConfig oferece classic e arrows (setas + Z/X/C/V). `Game.settings.keyboardPreset` é validado e salvo no localStorage; aplicar opções chama `Input.setBindings`, que troca os mapas de teclas e limpa teclas/toques anteriores. Controles, dicas do duelo e rodapé do menu leem o mapa ativo. Opções permite alternar o preset. Gamepad não depende dessa seleção.

## Estados (StateMachine)

Arquivos: [src/core/StateMachine.js](src/core/StateMachine.js), [src/states/](src/states/)

Pilha de estados:

- `change(state)`: sai de todos os estados e entra no novo (ex.: Menu → Duelo).
- `push(state)`: empilha (ex.: Duelo → Pausa). O estado de baixo fica congelado.
- `pop()`: volta para o estado de baixo.
- `update` roda **só no estado do topo**.
- `render` roda **em todos**, de baixo para cima. Por isso a Pausa aparece por cima do Duelo congelado.

Estados não importam outros estados. Eles pedem a troca pelo id:

```js
this.game.changeState(StateId.DUEL);
this.game.pushState(StateId.PAUSE);
this.game.popState();
```

`stateFactory.createState(id, game)` é o único lugar que conhece todas as classes de estado. Isso evita importações circulares (Menu → Duelo → Pausa → Menu).

Estados podem receber parâmetros: `game.pushState(StateId.GAME_OVER, { playerWon, winnerName, stats })`. Eles ficam em `this.params`.

Fluxo de telas:

```
MenuState ──Duelar / Treino──▶ DuelState({ mode }) ──Esc──▶ PauseState (push) ──Continuar──▶ volta
    │                     │                    ├─ Reiniciar ──▶ novo DuelState
    └─Controles─▶ ControlsState (push)        └─ Sair ──▶ MenuState
                          │
                   K.O. + resultDelay
                          ▼
                   GameOverState (push) ──Revanche──▶ novo DuelState
                                        └─Menu principal──▶ MenuState
```

Pausa e resultado recebem `duelParams` e os repassam ao reiniciar, então "Reiniciar" e "Revanche" mantêm o modo.

`Game.settings` guarda as opções (`difficulty`, `reducedEffects`, `sound`, `music`). Elas são carregadas do `localStorage` ao abrir o jogo (valores inválidos são ignorados), alteradas na tela de Opções, aplicadas por `game.applySettings()` e salvas por `game.saveSettings()`.

Para adicionar um estado: crie a classe estendendo `GameState`, adicione o id em `stateIds.js` e registre em `stateFactory.js`.

## UI

Arquivos: [src/ui/](src/ui/), [src/config/uiConfig.js](src/config/uiConfig.js). Regras em [design/UI_GUIDELINES.md](design/UI_GUIDELINES.md).

- Todos os textos da interface ficam em `uiConfig.texts` (com `{placeholders}` preenchidos por `formatText`). Posições e medidas ficam em `uiConfig.layout`.
- Nomes de teclas nunca são escritos à mão: `keyLabels.formatActionKeys(keyBindings, action)`.
- A tela de Controles é gerada de `uiConfig.controlsScreenRows`: cada linha tem um texto e uma lista de ações (combinações como o empurrão aparecem como `L  +  J`).
- `MenuList` é reutilizado no menu, na pausa e no resultado. `update(input)` devolve o id escolhido no `Enter` (ou `null`).
- `Hud` só lê os lutadores. A barra fantasma é estado visual do próprio `Hud`.
- `DuelState`: intro de `layout.messages.introDuration` com controles travados (ROUND 1/2/FINAL). `roundWins` guarda o placar do melhor de 3 (`roundsToWin = 2`) e alimenta os quadrados espelhados da HUD. No K.O., soma a vitória uma vez e espera `resultDelay`: reinicia o round ou empilha o resultado. `Fighter.resetForRound(x, facing)` restaura posição, vida, stamina, combate, intent e animação, preservando as referências dos dados. Controllers de IA e feedback visual são renovados; o Treino mantém o comportamento do boneco e reinicia sem limite. As estatísticas (tempo ativo, hits, bloqueios, parries comuns/perfeitos e quebras de guarda causadas) somam todos os rounds e aparecem em duas linhas no resultado. Se um trade matar ambos, nenhum ponto é somado e começa outro round.

---

No Treino, `DuelState.updateFrameData` lê os contatos do jogador e usa `combat/frameData.js`, puro e testável, para comparar os tempos de travamento restantes. Ataque em curso usa startup+active+recovery menos stateTime; bloqueio usa blockstun; hit/stun/stagger usam stunDuration menos stateTime. Parry cancelou o ataque: o stagger do atacante produz a desvantagem correta. Contatos de K.O. são ignorados, pois não há próxima ação. Texto em `uiConfig.training`, linha hint acima da pausa, limpa no próximo round.

## Renderer

Arquivo: [src/core/Renderer.js](src/core/Renderer.js)

- Dono do canvas e do contexto 2D.
- Trabalha em **resolução lógica** fixa (`gameConfig.canvas`, 1280×720). `fitToDisplay` ajusta o tamanho real ao tamanho exibido e ao `devicePixelRatio`, para ficar nítido. Um `ResizeObserver` no `Game` chama esse método.
- Expõe primitivas (`clear`, `overlay`, `fillRect`, `strokeRect`, `line`, `text`, `measureText`).
- Estilos de texto vêm de `themeConfig.textStyles`, objetos criados uma vez (sem alocar por frame).
- Desenho específico (arena, lutador, sabre, efeitos) vai para `src/rendering/`, recebe a entidade como **dado** e só lê dela.

Renderer **não** decide dano, vitória, derrota, colisões ou comportamento da IA.

---

## Combat

Arquivos: [src/combat/](src/combat/). Regras em [GAME_DESIGN.md](GAME_DESIGN.md#regras-de-combate).

`CombatSystem` é responsável por ataques, bloqueios, esquivas, colisões de ataque, dano, stun, knockback, morte e transições de combate.

- `update`: termina estados que acabaram, atualiza o buffer de input, começa ações a partir do buffer (com custo de stamina) e aplica o lunge do ataque e a velocidade da esquiva.
- **Buffer de input** (`actionBuffer.js`): cada passo lê a ação apertada no `intent` (prioridade esquiva > forte > rápido) e guarda em `combat.bufferedAction` por `gameConfig.combat.inputBuffer`. Quando o lutador pode agir, a ação sai e o buffer é limpo. Se faltar stamina, a ação é descartada e o evento `actionRejected` é emitido (HUD pisca a stamina, `DuelAudio` toca `denied`). O buffer vive na simulação, então vale igual para jogador, IA e testes.
- `resolveHits`: em duas etapas. Primeiro encontra **todos** os contatos (hitbox × hurtbox), depois aplica. Assim, dois golpes no mesmo frame acertam os dois lados (trade), sem depender da ordem da lista.
- Bloqueio só vale de frente. Sem stamina para bloquear, a guarda quebra (`STUNNED`).
- **Parry**: o toque no bloqueio chega como `intent.blockPressed` e vira a ação `parry` no buffer. Ela entra em `BLOCKING` e arma a janela (`combat.parryArmed`, `combat.parryTime`). Também arma dentro do blockstun. Enquanto a janela está armada o lutador continua em `BLOCKING`, mesmo sem segurar. Quando a janela acaba sem golpe (ou o lutador sai do bloqueio), começa o `parryLockout`. Em `resolveContact`, golpe de frente + janela armada = `resolveParry`: o atacante perde o ataque e stamina e vai para `STAGGERED`, e o defensor fica livre (`IDLE`) com `combat.riposteTime`. `parryTime < perfectWindow` = parry perfeito. Valores em `fightersConfig.<arquétipo>.parry`.
- **Empurrão**: `intent.lightAttack` com `intent.block` vira a ação `shove` no buffer (prioridade logo abaixo da esquiva). Sai de `IDLE`/`WALKING` ou de dentro do `BLOCKING` fora do blockstun (`startActionFromBlock`). É um ataque (`AttackType.SHOVE`, estado `ATTACKING`, dados em `attacks.shove`) que ignora bloqueio e parry: `applyShove` drena `staminaDamage`, empurra e deixa o alvo em `STAGGERED`. Não participa de clash e não tem trail nem zumbido de golpe (`isSaberAttack`, `isSaberStrikeActive`).
- **Riposta**: com `riposteTime > 0`, a ação de ataque rápido usa `attacks.riposte` (`AttackType.RIPOSTE`, estado `ATTACKING`). `isStrongAttack` (forte ou riposta) escolhe o impacto e o som fortes.
- Na morte, escolhe a direção da queda: para trás se houver espaço até a parede, senão para a frente.
- Não desenha nada e não cria efeitos. Ele **emite eventos** (`hit`, `block`, `guardBreak`, `clash`, `death`, `parry`, `perfectParry`, e as ações `attackStart`, `dodge`, `actionRejected`) com atacante, defensor, tipo de ataque e ponto de contato. `events` é limpo a cada passo.
- **Clash**: antes dos hits, se os dois lutadores estão na fase active e as hitboxes se encostam, os dois ataques são cancelados, os dois recuam (`HIT` sem dano, empurrão de `gameConfig.combat.clash`) e é emitido `clash`. O clash tem prioridade sobre o hit.
- Colisão física (corpos) fica no `CollisionSystem`.

---

## Effects e Camera

Arquivos: [src/systems/EffectsSystem.js](src/systems/EffectsSystem.js), [src/systems/ParticlePool.js](src/systems/ParticlePool.js), [src/core/Camera.js](src/core/Camera.js), [src/config/effectsConfig.js](src/config/effectsConfig.js). Catálogo e limites em [design/VFX_GUIDELINES.md](design/VFX_GUIDELINES.md).

```
CombatSystem.events → EffectsSystem.handleEvents → spawn(tipo, { x, y, direction, color, secondaryColor })
                                                     ├─ faíscas (ParticlePool)
                                                     ├─ luzes de impacto (pool fixo)
                                                     ├─ flash
                                                     └─ camera.shake(amplitude, duração)
```

- `EffectsSystem.spawn(type, params)` é a única porta de entrada. Tipos em `EffectType`, receitas em `effectsConfig.recipes`.
- Tudo é pré-alocado: partículas e luzes vêm de pools fixos. Pool cheio = a faísca é descartada.
- Limites (`maxParticles`, `maxShakeAmplitude`, `maxShakeDuration`, `maxFlashAlpha`) são aplicados no código, não só na receita.
- `Camera` guarda o shake mais forte e produz `offsetX/offsetY`. Hoje a arena cabe inteira na tela, então a câmera não precisa seguir os lutadores. Enquadramento e zoom entram quando houver arenas maiores.
- RNG com seed (`utils/random.js`) é injetado. Os testes usam seed fixa e são determinísticos.
- Receitas também pedem **hit stop** e **câmera lenta** ao `TimeControl`. Efeitos reduzidos (`setReduced`) diminuem o shake e desligam o flash.
- Afterimage da esquiva e vinheta são só do render.
- **Parry**: `parry`/`perfectParry` usam a cor e a direção do **defensor**. Além de faíscas, luz, shake e hit stop, criam um anel (pool fixo `rings`), marcam o flare da lâmina do defensor (`saberFlares`, lido por `getSaberFlare(fighter)` no render) e, no perfeito, pedem dessaturação (`desaturation`) e câmera lenta. `DuelAudio` abaixa a música por 0,3 s no parry perfeito.

- Pacote de impacto: `EffectsSystem` guarda hit flashes por lutador (0,06 s) e tremores durante hit stop. O tremor do hit afeta o atingido; no parry, o atacante aparado. O renderer aplica o deslocamento ao corpo e à lâmina sem mudar posição física. A silhueta aceita cor substituta `colors.hitFlash`.
- `Camera.punch(zoom, duration, x, y)` limita o zoom adicional a 6%, mantém o impulso mais forte e retorna suavemente em até 0,25 s. Receitas pedem 3/4/5/6% em forte/quebra de guarda/perfeito/morte. UI e flash de tela ficam fora da transformação. Efeitos reduzidos desativam hit flash e reduzem punch e tremor a 25%.
- Timers de VFX avançam por `dt` real, inclusive no hit stop e na câmera lenta; animação e combate continuam usando o tempo escalado.

`Camera.frame(left, right, width, anchorY, dt)` recebe o envelope dos corpos e suaviza centro e zoom de enquadramento (máximo 4%, margem para lâminas, âncora no chão). Mantém o viewport dentro da arena; quanto maior a distância, mais próximo de 1 o zoom. O renderer combina enquadramento e punch-in sem transformar a HUD. Valores em `effectsConfig.framing`.

## Arenas

`gameConfig.duel.arena` seleciona `arenas/arenaData.js`: camadas de geometria com tokens de tema e configuração de partículas ambientes. `ArenaRenderer` usa `Renderer.createLayer/drawLayer` para pré-renderizar fundo e chão uma vez, com overscan para o shake. Só o core cria canvases internos; lógica e dados continuam testáveis em Node. `AmbientSystem` mantém um pool fixo, avança no update do duelo e congela na pausa. Usa RNG próprio para não interferir nas decisões da IA. O cenário não emite eventos nem muda combate. `refinery` é a arena padrão: três planos industriais, piso suspenso sobre fosso, reflexo dos sabres e vapor com glows em cache. Os nomes de arena ficam em `uiConfig.texts.arenas` e a origem da geometria está em ASSETS.md.

## Audio

Arquivos: [src/core/AudioManager.js](src/core/AudioManager.js), [src/audio/](src/audio/), [src/config/audioConfig.js](src/config/audioConfig.js). Regras em [DESIGN.md](DESIGN.md#áudio).

- Todo som é **sintetizado** (osciladores, ruído e filtros). Cada som é uma lista de camadas em `audioConfig.sounds`, tocada por `synth.playSound`. Para criar um som novo: adicione a receita e o nome em `soundNames.js`.
- O `AudioContext` só nasce no primeiro `keydown`/`pointerdown` (política de autoplay). Antes disso, e no Node, o `AudioManager` não faz nada, então estados e testes não precisam saber se há áudio.
- `DuelAudio` só lê eventos e lutadores: toca o som do evento com pan pela posição, mantém um zumbido por lutador (mais forte e agudo na fase active, desligado na morte) e abaixa a música no golpe final.
- Interface: `MenuList` toca `uiMove` e `uiConfirm` quando recebe o `AudioManager`.

## Balanceamento

`npm run simulate` roda duelos IA × IA na `DuelSimulation` real, sem navegador, alternando os lados, e mostra vitórias, tempo médio, hits, bloqueios, clashes, quebras de guarda, parries (comuns e perfeitos) e empurrões.

```bash
npm run simulate -- --duels 300 --difficulty hard
npm run simulate -- --profile balanced                     # mesmo perfil nos dois: mede só os atributos
npm run simulate -- --left shadow --right shadow --leftDifficulty hard --rightDifficulty normal
npm run simulate -- --set fighters.shadow.maxHealth=120   # testa um valor sem editar arquivos
```

Referência v0.2 (300 rounds por cenário, seed 1): o simulador mede um round por execução de duelo, sem as intros do melhor de 3. `avg hits` soma ambos os lados; `avg hits to KO` conta os hits recebidos pelo derrotado (exclui timeouts). O alvo de 6–9 é validado pela segunda métrica, coerente com 100 de vida, rápido 10, forte 24/26 e riposta 16/17. Bloquear forte custa 30/32 de stamina.

| Dificuldade | Guardião vence (perfis próprios) | Tempo | Hits totais | Hits até K.O. | Guardião vence (ambos balanced) | Hits até K.O. (balanced) |
| --- | --- | --- | --- | --- | --- | --- |
| Fácil | 42,3% | 18,2 s | 12,7 | 7,5 | 43,3% | 7,8 |
| Normal | 63,0% | 15,0 s | 13,9 | 8,4 | 50,7% | 8,6 |
| Difícil | 59,3% | 16,0 s | 13,7 | 8,5 | 53,7% | 8,9 |

Nenhum timeout nos seis cenários. Com ambos balanced, Difícil vence Normal 98,7% e Normal vence Fácil 99,3%. Os perfis próprios também medem a vantagem tática do perfil equilibrado sobre o agressivo, não apenas atributos.
- O trail e a luz do sabre no corpo são só do render (`SaberTrail`, `drawSaberBodyLight`). O trail usa o tempo da simulação (`fighter.animation.time`), então a pausa congela o rastro.

---

## AI

Arquivos: [src/ai/](src/ai/), [src/config/aiConfig.js](src/config/aiConfig.js). Regras em [GAME_DESIGN.md](GAME_DESIGN.md#7-ia).

```
DuelState.updateIntents → EnemyAI.updateIntent(intent, dt)
                             ├─ a cada reactionTime (+ variação): think() → decision + plano
                             │     defender (parry/bloqueio/esquiva) > punir > empurrar > recuperar stamina > atacar > guardar > posicionar
                             └─ todo frame: plano → intent (moveX, block, ação pontual)
DuelSimulation → CombatSystem executa (igual ao jogador)
```

- `EnemyAI` é um controller como o `PlayerController`: `updateIntent(intent, dt)`. Ela recebe `self` e `opponent` só para **ler**.
- Além de defender ataques que estão vindo, a IA pode **guardar por antecipação** (`guardChance`) quando está no alcance do oponente e não pode atacar. É o que permite defender ataques rápidos, cujo startup é menor que o tempo de reação.
- `perception.js` tem funções puras (`getGap`, `canReach`, `isThreatening`, `isPunishable`).
- O plano guarda direção, tempo de bloqueio e uma ação pontual (`pendingAction`), que vira intent por um frame só.
- Perfil (`aiConfig.profiles`) vem de `characterData.aiProfile`. Dificuldade (`aiConfig.difficulties`) vem de `game.settings.difficulty`.
- O RNG é injetado (o mesmo dos efeitos no jogo, seed fixa nos testes).
- `decision` fica exposta para o debug (`ai: <decisão> (<dificuldade>)`).
- O intervalo entre pensamentos é `reactionTime × (1 + reactionJitter × random)`. Sem a variação, duas IAs com a mesma dificuldade ficavam sincronizadas e sempre viam o ataque do outro no mesmo instante (o simulador media clashes e parries errados).
- **Parry**: contra um ataque forte ainda no startup, com `difficulty.parryChance`, a IA calcula quanto falta para o golpe ficar ativo e agenda o toque (`plan.parryDelay`) para cair no meio da janela (ou no começo, para o perfeito, com `perfectParryChance`). Se já for tarde, cai para bloqueio/esquiva. A contagem regressiva roda a cada frame em `updateParryTiming`, mas a decisão só nasce no pensamento: a IA continua limitada ao próprio tempo de reação.
- **Empurrão**: com o oponente em `BLOCKING` no alcance do empurrão, `profile.shoveChance × difficulty.shoveMultiplier`. Contra um empurrão que está vindo, a IA tenta acertar um ataque rápido antes (é o que vence o empurrão).

**Garantia testada:** a IA roda com os lutadores congelados (`Object.freeze`) sem erro, ou seja, ela nunca altera HP, stamina, posição ou estado.

---

## Debug

Arquivo: [src/utils/debug.js](src/utils/debug.js)

- Liga e desliga com `F3`. O valor inicial vem de `gameConfig.debug.enabled`.
- Mostra FPS, a pilha de estados e as linhas de `getDebugInfo()` de cada estado.
- Chama `renderDebug(renderer)` de cada estado para desenhos de debug. O `DuelState` desenha a hurtbox (verde, apagada durante a invulnerabilidade) e a hitbox ativa (vermelha), e mostra estado, vida, stamina, posição, velocidade, comportamento do boneco e o último evento de combate.
- Futuro: decisões da IA.

---

## Configuração

- Balanceamento e ajustes ficam em `src/config/`. Nada de números mágicos espalhados.
- Textos e layout da interface ficam em `uiConfig.js`.
- Cores e estilos de texto ficam em `themeConfig.js` e espelham [design/VISUAL_SYSTEM.md](design/VISUAL_SYSTEM.md).
- Arquivos de config exportam objetos simples, sem lógica.

---

Verificação visual da v0.2: Chrome headless local, Canvas real, eventos de parry/perfeito/empurrão gerados pela simulação e tela de Controles inspecionada. Dessaturação cobre o mundo com shake de ±12 px; lâminas, anéis e flare mantêm a cor.

## Testabilidade

Testes rodam em Node (`npm test`), sem navegador. Por isso:

- Módulos de lógica (`states/`, `characters/`, `controllers/`, `entities/`, `combat/`, `simulation/`, `systems/`, `ai/`, `config/`, `utils/`) **não** acessam `window`, `document` ou canvas. Estados e `rendering/` desenham só pela API do `Renderer` recebido.
- Quando um módulo do core precisa do navegador (`Input`, `GameLoop`), a dependência é injetada.
- `computePose` é uma função pura e também é testada.

Testes atuais: `gameLoop`, `input`, `stateMachine`, `states` (fluxo de telas, fim do duelo, boneco, debug de hitbox), `debug`, `math`, `fighter`, `playerController`, `dummyController`, `movement`, `physics` (inclui colisão), `animation` (inclui poses de combate), `combatActions` (ações, timers, stamina) e `combatHits` (hits, bloqueio, quebra de guarda, esquiva, morte, trade, clash), `effects` (RNG, pool, câmera, efeitos por evento, limites, hit stop, efeitos reduzidos), `timeControl`, `saberTrail`, `afterimage`, `audio` e `duelAudioHum` (mapeamento de sons, pan, zumbido, música), `settingsStorage`, `ui` (MenuList, nomes de teclas, textos), `hud`, `combatMessage` e `ai` (percepção, cada decisão, tempo de reação, dificuldade, IA não altera lutadores, IA vence um oponente parado na simulação real). O teste `states` cobre também controles, intro, pausa (continuar, reiniciar, sair), resultado e revanche. Utilitários compartilhados ficam em `tests/helpers.js` (`createSimulation`, `spawnFighter`...).

---

## Dependências entre módulos

```
core/Game     → core, states/stateFactory, config, utils
states        → states/stateIds, simulation, combat, ai, controllers, characters, entities, rendering, ui, config
ui            → config, utils
ai            → combat (fases), entities (estados), systems/StaminaSystem (canAfford), config
audio         → combat (eventos, fases), config, utils
tools/simulate → characters, simulation, ai, config (sem navegador)
simulation    → systems, combat
systems/EffectsSystem → combat (tipos de evento), core/Camera (via construtor), config, utils
characters    → entities, config
controllers   → config
systems / combat / ai → entities, config, utils (combat também usa StaminaSystem)
rendering     → config, utils, entities, combat/attackPhases (só leitura)
entities      → config, utils
core (resto)  → config
```

Evitar dependências circulares.

---

## Convenções de código

- Um módulo por arquivo. Classes em `PascalCase.js`, o resto em `camelCase.js`.
- Somente `export` nomeado (sem `export default`).
- Imports sempre com extensão `.js`.
- **Sem comentários no código.** Nomes claros substituem comentários. Contexto e decisões ficam neste documento.
- Evitar criar objetos dentro do loop sem necessidade.
- Listeners adicionados devem ter forma de remoção (`destroy()`).
