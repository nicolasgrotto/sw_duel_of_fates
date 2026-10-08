# ARCHITECTURE

## Objetivo

Manter o projeto modular, para que novos personagens, ataques, arenas e comportamentos de IA possam ser adicionados sem reescrever o núcleo do jogo, e para que a identidade visual possa ser trocada sem mexer no combate.

Este documento está abaixo de [DESIGN.md](DESIGN.md), dos documentos em [design/](design/) e de [GAME_DESIGN.md](GAME_DESIGN.md) na hierarquia (ver DESIGN.md). Ele diz **como** o código implementa o que esses documentos definem.

---

## Estrutura de pastas

Legenda: ✅ existe · ⏳ planejado (criar só quando a tarefa pedir)

```
index.html                  ✅ página com o canvas (caminhos relativos: funciona em qualquer servidor estático e no GitHub Pages)
manifest.webmanifest        ✅ manifest para tela inicial em paisagem, fullscreen e start_url relativo; sem service worker
.nojekyll                   ✅ desliga o Jekyll do GitHub Pages; os arquivos são servidos como estão
média/                      ✅ capturas de tela usadas no README (não são carregadas pelo jogo)
styles/
  main.css                  ✅ layout da página e do canvas, @font-face da fonte do jogo
design/                     ✅ direção de arte, sistema visual, UI, VFX, referências
assets/                     ✅ ver ASSETS.md
  fonts/                    ✅ Oxanium (OFL) e o texto da licença
src/
  main.js                   ✅ ponto de entrada
  core/                     ✅ infraestrutura do jogo
    Game.js                 ✅ monta e conecta os módulos
    GameLoop.js             ✅ loop com timestep fixo
    Input.js                ✅ teclado e gamepad → ações; uma instância por jogador (gamepadSlot)
    KeyboardSource.js       ✅ eventos de teclado e bindings
    TouchInput.js           ✅ alvo injetado, pointerId e joystick; libera listeners no destroy
    GamepadSource.js        ✅ controle standard e rumble
    Renderer.js             ✅ canvas e primitivas de desenho
    StateMachine.js         ✅ pilha de estados
    Camera.js               ✅ screen shake (com limites)
    AudioManager.js         ✅ AudioContext, buses de sfx e música, liberação no primeiro input
    saveStorage.js          ✅ save versionado com lista ordenada de migrações
    settingsStorage.js      ✅ carrega e salva as opções (localStorage, tolerante a erro)
    keyBindings.js          ✅ preset personalizado: junta, troca teclas entre ações e valida o que vem do armazenamento
    AssetManager.js         ⏳ só quando houver assets externos
  states/                   ✅ telas do jogo
    GameState.js            ✅ classe base
    stateIds.js             ✅ ids dos estados
    duelModes.js            ✅ modos do duelo (versus, local, arcade, sobrevivência, tutorial, desafio, treino) e `createDuelRules`
    stateFactory.js         ✅ cria estados a partir do id
    MenuState.js            ✅ título + opções (MenuList)
    CharacterSelectState.js ✅ escolhe jogador, adversário (ou J2), cor da lâmina e arena; Arcade e Sobrevivência só pedem o jogador
    ControlsState.js        ✅ tabela de controles gerada do controlsConfig
    DuelState.js            ✅ duelo: intro, simulação, efeitos, HUD, fim do duelo
    PauseState.js           ✅ continuar, reiniciar, sair
    GameOverState.js        ✅ vitória/derrota, tabela de estatísticas dos dois lutadores, revanche
    MoveListState.js        ✅ lista de golpes do personagem do jogador (aberta pela pausa)
    ReplayState.js          ✅ replay do golpe final: re-simula a janela gravada em câmera lenta
    OptionsState.js         ✅ dificuldade, efeitos, som, música, teclado, replay
    KeyRemapState.js        ✅ remapeamento das ações de luta (preset Personalizado)
  arenas/                   ✅ dados visuais de arenas, sem regras de gameplay
    arenaData.js            ✅ camadas estáticas e partículas ambientes por arena
  characters/               ✅ dados e criação de personagens
    characterData.js        ✅ personagens: nome, arquétipo, perfil de IA, aparência
    attributes.js           ✅ deriva stats sem mutar base ou notas
    powers.js               ✅ `resolvePowerStats`: máximo, início, ganho e potência do medidor pelo nível do Fluxo
    characterFactory.js     ✅ cria um Fighter a partir dos dados
  modes/                    ✅ regras de modos de jogo, puras e testáveis (sem render)
    DuelResult.js           ✅ resultado independente dos Fighters
    duelOutcomes.js         ✅ resultado + escada -> tela e patch de progresso
    TutorialDirector.js     ✅ passos do tutorial: objetivo, progresso e comportamento do boneco
    ParryChallenge.js       ✅ desafio de parry: tempo, pontos e resumo
    arcade.js               ✅ escada do Arcade: adversários, dificuldade e arena por luta, chefe no fim
    unlocks.js              ✅ cores de lâmina liberadas por Arcade e por desafio do personagem
    survival.js             ✅ Sobrevivência: adversário sorteado por seed, dificuldade por vitórias, chefe periódico, vida carregada
  controllers/              ✅ quem controla um lutador
    PlayerController.js     ✅ Input → intent
    IntentRecorder.js       ✅ buffer Uint16 fixo: grava intents e reproduz movimento relativo
    DummyController.js      ✅ boneco (parado, bloqueando, rápidos, fortes em intervalos aleatórios); se aproxima ao atacar
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
    PowerSystem.js          ✅ medidor do Fluxo (ganhos e regeneração); desligado sem `rules.powers`
    powerResistance.js      ✅ diferença de nível, `resolvePowerOutcome` (faixas em dados) e tier visual (puros)
  simulation/               ✅
    DuelSimulation.js       ✅ ordem dos sistemas em um passo do duelo
    ReplayBuffer.js         ✅ grava intents, dt e fotos do estado; alimenta o replay determinístico
    arenaBounds.js          ✅ limites da arena a partir do gameConfig
  audio/                    ✅ som sintetizado (Web Audio API, sem arquivos)
    synth.js                ✅ camadas de som, zumbido do sabre, drone de música
    DuelAudio.js            ✅ eventos de combate → sons; zumbido por lutador
    soundNames.js           ✅ nomes dos sons
  ai/                       ✅ inteligência do oponente
    EnemyAI.js              ✅ controller da IA: pensa em intervalos e preenche o intent
    HabitMemory.js          ✅ memória curta dos hábitos do oponente (fortes, rápidos, tempo bloqueando)
    perception.js           ✅ leitura pura dos lutadores (distância, ameaça, chance de punir, tempo vulnerável)
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
    attributeBars.js        ✅ seis linhas de nove segmentos; somente leitura
    TouchControls.js        ✅ desenho de joystick e botões sem alterar input
    MenuList.js             ✅ lista de opções navegável
    Hud.js                  ✅ nomes, barras de vida (com fantasma) e stamina
    CombatMessage.js        ✅ mensagens curtas (ROUND 1/2/FINAL, K.O.) com fade
    Letterbox.js            ✅ barras cinematográficas (alvo suave + pulso curto)
    ModeBanner.js           ✅ instrução e progresso do tutorial, tempo e pontos do desafio, luta do Arcade e da Sobrevivência
    keyLabels.js            ✅ nomes de teclas a partir do controlsConfig
    formatText.js           ✅ textos com {placeholders}
    moveList.js             ✅ monta a lista de golpes a partir dos dados do personagem e das teclas ativas
    trainingInputs.js       ✅ texto do intent gravado ou reproduzido no Treino
  config/                   ✅ valores e ajustes
    gameConfig.js           ✅ canvas, loop, arena, física, duelo, replay, Arcade, Sobrevivência, boneco, debug
    themeConfig.js          ✅ cores, estilos de texto, animação de UI
    controlsConfig.js       ✅ ações e teclas
    uiConfig.js             ✅ textos da interface e layout das telas
    tutorialConfig.js       ✅ passos do tutorial (objetivo, contagem, boneco) e regras do desafio de parry
    aiConfig.js             ✅ perfis, dificuldades e percepção da IA
    audioConfig.js          ✅ volumes, receitas de som, zumbido e música
    movesConfig.js          ✅ golpes por personagem: base de atributos, tipo, pose e cancelsInto
    touchLayoutConfig.js    ✅ geometria e limiares do toque
    evadeConfig.js          ✅ flag e perfil global de esquiva de precisão
    attributesConfig.js     ✅ tabela 1–9, bases na nota 5 e calibração por arquétipo
    powersConfig.js         ✅ modos com poderes, medidor, regras de resistência e tiers visuais do Fluxo
    fightersConfig.js       ✅ estrutura por arquétipo (corpo, tempos, golpes, custos, traços e regras de mobilidade)
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
  matrix.js                 ✅ matriz de vitórias de todos contra todos usando o simulate (npm run matrix)
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

O `DuelState` é dono do duelo: cria os lutadores, os controllers (IA, segundo jogador ou boneco, via `params.mode`), a `DuelSimulation` e o `DuelRenderer`. Também cuida da pausa, do fim do duelo (resultado + `Enter` para o menu) e do boneco de treino (`F4` a `F7`, sem depender do debug).

### Characters

Personagens são **dados**:

- `characterData.js`: id, nome, arquétipo e aparência (cores, capuz, capa, ângulo de guarda, tamanho da lâmina).
- `fightersConfig.js`: corpo, tempos, custos, golpes e traços de cada arquétipo.
- `attributesConfig.js`: tabela e bases dos stats escalares; `characterData.attributes`: seis notas.
- `characterFactory.createFighter(id, spawn)` junta os dois e cria um `Fighter`.

`characterData.moves` aponta para `movesConfig.movesByCharacter`. A factory resolve cada golpe combinando a estrutura de fightersConfig com a definição do personagem, depois aplica os atributos e cria um mapa independente por Fighter. `fighter.moves` é o catálogo; `stats.attacks` mantém o mesmo mapa para percepção, balanceamento e testes existentes. CombatSystem lê o catálogo e escolhe estado pelo tipo do golpe; o renderer escolhe pose pelo id da definição. Overrides do simulador continuam sendo aplicados antes da factory, sem snapshots de atributos no import.

Trocar todos os personagens (ex.: versão com identidade própria) deve exigir apenas mudar dados e assets, nunca o combate. Para adicionar um personagem:

1. um arquétipo em `fightersConfig.js` (estrutura, tempos, ataques, esquiva e traços passivos), bases escalares em `attributesConfig.bases` e notas em `characterData.attributes`;
2. os golpes em `movesConfig.js` (sequência de rápidos via `cancelsInto`, aéreo, forte de avanço e `special`);
3. a entrada em `characterData.js` (nome, perfil de IA, textos `info` da seleção, som e aparência com todos os campos de silhueta);
4. poses novas, se houver, em `fighterVisualConfig.combatPoses.attacks`, e os nomes dos golpes em `uiConfig.texts.training.attacks`.

Personagens atuais: Guardião, Sombra, Bastião, Vespa, Espelho, Haste, Brasa, Forja, Garça e Eco, mais o chefe Sombra Desperta (`selectable: false`, só no Arcade). A seleção mostra só os personagens com `selectable: true`.

### Atributos implementados na v1.4

`applyAttributes(base, attributes, config)` é pura. Notas inteiras 1–9, padrão 5; 10 rejeitado nesta etapa e reservado ao secreto futuro. Multiplicadores 0,76 / 0,82 / 0,88 / 0,94 / 1 / 1,06 / 1,12 / 1,18 / 1,24. Bases na nota 5 ficam em attributesConfig.bases por arquétipo, calibradas dividindo os stats v1.3 pelo multiplicador da nota do elenco. Essa calibração preserva os valores escalares da v1.0 e a mobilidade adicionada na v1.3. Arredondamento em 9 casas evita alterações por ponto flutuante. Fixture stats-v1.3 foi capturada antes da migração e verifica todos os stats afetados, os 11 arquétipos e danos de cada golpe.

Vida escala maxHealth; Stamina escala maxStamina e regenPerSecond; Lâmina escala o dano de todos os golpes e soma 0,002 s por nota acima de 5 ao parry perfeito (limitado à janela total). Defesa divide custo e recuo do bloqueio pelo multiplicador e muda guardBreakThreshold em 1 de stamina por nota, com piso zero. Bases de reserva compensam as notas atuais para preservar quebra somente quando faltar stamina. CombatSystem compara custo + reserva; dano recebido permanece igual. blockStaminaScale e blockPushbackScale no arquétipo continuam apenas como traços passivos (Guardião/Bastião), compostos com os fatores de Defesa.

Agilidade escala caminhada, velocidade vertical de pulo, dash e invulnerabilidade do EVADE pelo perfil de evadeConfig. Coeficientes calibrados preservam a janela 0,066 s atual. Também escala avanços/saltos de habilidade e pulo na parede, sem alterar durações, maxJumps ou regras de ataque aéreo. Fluxo vira stats.powerLevel, acessível pelo getter Fighter.powerLevel, imutável na luta e coberto pelo snapshot via stats; sem medidor ou efeito nesta etapa.

Factory junta estrutura, bases e golpes antes de aplicar notas; nenhum snapshot de stats é criado no import. Simulador aceita --set attributes.guardian.health=9, attributeBases.guardian.maxHealth=100 e attributeConfig.perfectParryBonus=0. Overrides ocorrem antes da factory; caminhos fighters continuam para tempos, custos e traços. Orçamento e teto do protagonista permanecem na v1.7.

### Controllers

Um controller escreve no `fighter.intent` o que o lutador **quer** fazer (`moveX`, `jump`, `lightAttack`, `heavyAttack`, `block`, `blockPressed`, `dodge`, `special`, `specialHeld`). Ele nunca altera posição, vida ou estado.

- `PlayerController`: lê o `Input`. Durante o hit stop a simulação não roda, então o `DuelState` chama `captureInput()` a cada update: toques ficam guardados no controller até o próximo `updateIntent`. Assim, um ataque apertado no congelamento do impacto não se perde.
- `EnemyAI`: oponente controlado pela máquina em Versus, Arcade, Sobrevivência e Tutorial (ver seção AI).
- No modo 2 Jogadores o segundo lutador também usa `PlayerController`, lendo `game.secondInput`.
- `DummyController`: boneco do modo treino.

Todo controller tem `updateIntent(intent, dt)`. O `DuelState` guarda pares `{ fighter, controller }` em `participants`. Depois que o duelo termina, os controllers param e os intents ficam zerados.

### Entities

Objetos do jogo (hoje só o `Fighter`). Guardam dados e estado, mas não controlam o jogo inteiro e não desenham a si mesmos.

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
       ├─ Input e secondInput (2 Jogadores)
       ├─ AudioManager
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

`Input.pollGamepads()` roda antes de cada update do Game e lê o controle standard da posição `gamepadSlot` (0 para o jogador 1, 1 para o jogador 2), por API injetada. Converte botões/eixos em ações com deadzone; combina as ações de todas as fontes e gera bordas pela união anterior e libera tudo ao desconectar/perder foco. Gamepad e teclado podem coexistir. `Input.rumble` recebe somente um tipo de impacto do DuelState, com receita em controlsConfig, e tolera hardware sem atuador. Efeitos reduzidos diminuem vibração a 25%. Nenhum módulo de gameplay acessa navigator.

O `Game` tem dois `Input`: `input` (jogador 1, com o preset das Opções e o 1º controle) e `secondInput` (jogador 2, `twoPlayerBindings.p2` e `gamepadSlot: 1`, o 2º controle standard conectado). Os dois ouvem o mesmo `window`, são lidos a cada update e limpos no fim do frame. No modo **2 Jogadores** (`DuelMode.LOCAL`), o `DuelState` troca as teclas do `input` para `twoPlayerBindings.p1` na entrada e chama `game.applySettings()` na saída; o oponente é um `PlayerController(game.secondInput)`. A pausa vale para os dois. Na seleção, a etapa do adversário lê o `secondInput`.

**Remapeamento**: o `Input` guarda o código da última tecla apertada no frame (`lastPressedCode`, mesmo de teclas sem ação; limpo no `endFrame`). O `KeyRemapState` usa isso para capturar a nova tecla e chama `assignKey` (troca com a ação que já usava a tecla). O resultado vai para `settings.customBindings` (só as ações de `controlsConfig.remappableActions`) e o preset passa a `custom`; o `Game.getKeyboardBindings()` monta o mapa com `createCustomBindings` sobre o preset clássico. `sanitizeCustomBindings` descarta dados inválidos do `localStorage` ao abrir o jogo.

A pilha de estados chama `resume()` no estado que volta ao topo depois de um `pop` (as Opções usam para atualizar os rótulos ao voltar do remapeamento).

`keyboardPresets` em controlsConfig oferece classic e arrows (setas + Z/X/C/V). `Game.settings.keyboardPreset` é validado e salvo no localStorage; aplicar opções chama `Input.setBindings`, que troca os mapas de teclas e limpa teclas/toques anteriores. Controles, dicas do duelo e rodapé do menu leem o mapa ativo. Opções permite alternar o preset. Gamepad não depende dessa seleção.

Fontes seguem o contrato `{ actions: Set, poll?(), reset?(), endFrame?(), destroy?() }`. `Input.addSource(source)` registra uma fonte. `poll()` (alias `pollGamepads`) combina fontes. Teclado preserva toques curtos entre polls; `endFrame` sincroniza a soma e limpa bordas. `reset` libera inputs no blur; `destroy` remove listeners. TouchInput deve implementar reset e destroy. Bindings e lastPressedCode pertencem ao teclado; gamepadSlot e rumble ao gamepad.

Save: `saveStorage.js` usa a mesma chave e escreve `{ version: 2, settings }`. A lista `saveMigrations` transforma o objeto plano v1 no envelope v2; JSON corrompido, envelopes inválidos e versões futuras retornam defaults sem sobrescrever dados. `settingsStorage.js` continua validando campos com `loadSettings` e delega leitura/escrita ao saveStorage. Teste com fixture completa do formato v1 cobre progresso, cores, recordes e bindings.

EVADE usa S/baixo e pode dividir tecla com MENU_DOWN; gamepad baixo e eixo Y positivo alimentam ambas as ações. PlayerController captura o toque inclusive no hit stop. O IntentRecorder acrescenta evade no bit 10, preservando os bits v1; reset e boneco limpam a flag. No J2, Numpad2 agora é EVADE; o atalho numérico de forte mudou para Numpad4 (K continua), evitando duas ações de combate na mesma tecla. Controles, remapeamento, lista de golpes e inputs de Treino incluem EVADE. A tabela de controles usa espaçamento 25 para manter o rodapé livre.

TouchInput implementa a fonte genérica via addSource. addSource conecta onPress/onActivity nas fontes por eventos, preservando bordas pela união. Eventos preservam toques curtos; reset libera todos os dedos no blur. Input.lastInputKind acompanha atividade nova de teclado, gamepad e toque; gamepad segurado não rouba o dispositivo atual. Coordenadas são lógicas pelo retângulo do alvo. Joystick pede EVADE uma vez por gesto; demais botões mantêm ações enquanto segurados.

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
MenuState ─┬─ Duelar / Arcade / Sobrevivência / 2 Jogadores ──▶ CharacterSelectState ──▶ DuelState({ mode, ... })
           ├─ Tutorial / Desafio de parry / Treino ─────────────────────────────────────▶ DuelState({ mode })
           ├─ Opções ──▶ OptionsState (push) ──Configurar teclas──▶ KeyRemapState (push)
           └─ Controles ──▶ ControlsState (push)

DuelState ──Esc──▶ PauseState (push) ─┬─ Continuar ──▶ volta
                                      ├─ Lista de golpes ──▶ MoveListState (push)
                                      ├─ Reiniciar ──▶ novo DuelState
                                      └─ Sair ──▶ MenuState
DuelState ──K.O. decisivo──▶ ReplayState (push, opcional) ──▶ GameOverState (push)
GameOverState ─┬─ Revanche / Próxima luta / Próximo adversário / Tentar de novo ──▶ novo DuelState
               └─ Menu principal ──▶ MenuState
```

Pausa e resultado recebem `duelParams` e os repassam ao reiniciar, então "Reiniciar" e "Revanche" mantêm o modo.

`Game.settings` guarda as opções e o progresso (`difficulty`, `reducedEffects`, `sound`, `music`, `keyboardPreset`, `customBindings`, `replay`, `unlocks`, `survivalBest`). Elas são carregadas do `localStorage` ao abrir o jogo (valores inválidos são ignorados), alteradas na tela de Opções, aplicadas por `game.applySettings()` e salvas por `game.saveSettings()`.

Para adicionar um estado: crie a classe estendendo `GameState`, adicione o id em `stateIds.js` e registre em `stateFactory.js`.

Menu → CharacterSelectState → DuelState: a seleção usa MenuList e previews de Fighter, com animação atualizada fora do render. Escolhe o jogador entre os dados existentes e passa playerCharacter/opponentCharacter no params, preservados pela pausa e revanche. DuelState usa esses ids na factory inicial e na recriação do controller entre rounds.

`createDuelResult` copia o lado vencedor (0/1 ou null), modo, tempo, stats e dados escalares dos dois lutadores (vida, máximo e healthRatio). `resolveDuelOutcome` recebe resultado, params da escada, settings, personagem e config de cura; devolve `{ state, params, progress }` sem mutar os argumentos. Arcade, Sobrevivência, cores e título local ficam nesse resolvedor. DuelState aplica o patch de progresso, salva uma vez e abre a tela. Modos importam apenas ids de estados/modos e formatação pura de UI; nunca classes de estados.

## UI

Arquivos: [src/ui/](src/ui/), [src/config/uiConfig.js](src/config/uiConfig.js). Regras em [design/UI_GUIDELINES.md](design/UI_GUIDELINES.md).

- Todos os textos da interface ficam em `uiConfig.texts` (com `{placeholders}` preenchidos por `formatText`). Posições e medidas ficam em `uiConfig.layout`.
- Nomes de teclas nunca são escritos à mão: `keyLabels.formatActionKeys(keyBindings, action)`.
- A tela de Controles é gerada de `uiConfig.controlsScreenRows`: cada linha tem um texto e uma lista de ações (combinações como o empurrão aparecem como `L  +  J`).
- `MenuList` é reutilizado no menu, na pausa e no resultado. `update(input)` devolve o id escolhido no `Enter` (ou `null`).
- `Hud` só lê os lutadores. A barra fantasma é estado visual do próprio `Hud`.
- `DuelState`: intro de `layout.messages.introDuration` com controles travados (ROUND 1/2/FINAL). `roundWins` guarda o placar do melhor de 3 (`roundsToWin = 2`) e alimenta os quadrados espelhados da HUD. No K.O., soma a vitória uma vez e espera `resultDelay`: reinicia o round ou empilha o resultado. `Fighter.resetForRound(x, facing)` restaura posição, vida, stamina, combate, intent e animação, preservando as referências dos dados. Controllers de IA e feedback visual são renovados; o Treino mantém o comportamento do boneco e reinicia sem limite. As estatísticas somam todos os rounds e são contadas para os dois lutadores (`fighterStats`, com `stats` = jogador): golpes, dano (o evento `hit` carrega `damage`), defesas, parries comuns e perfeitos, quebras de guarda, empurrões e a maior sequência (passo do golpe `lightN` que acertou). O resultado mostra uma tabela com uma coluna por lutador e a duração. A pausa tem "Lista de golpes", que empilha o `MoveListState` com o personagem do jogador (`duelParams.playerCharacter`). Se um trade matar ambos, nenhum ponto é somado e começa outro round.

---

Modos com boneco (`duelModes.usesDummy`: Treino, Tutorial e Desafio de parry) não têm limite de rounds (`hasRoundLimit`). Tutorial e desafio criam um **diretor** em `DuelState.createDirector()`: `TutorialDirector` ou `ParryChallenge`. O diretor só lê eventos (`handleEvents(events, player)`) e o jogador (`update(dt, player)`), e expõe `dummyBehavior` (o `DuelState` repassa ao `DummyController`) e `isFinished`. Enquanto há diretor, o `DuelState` devolve a vida dos dois ao máximo depois de cada passo. Quando o diretor termina, o `DuelState` empilha o `GameOverState` em modo resumo (`summary`, `title`, `subtitle`, `rematchLabel`, `rematchParams`), sem tabela. O recorde do desafio fica em `settings.parryChallengeBest`. Os objetivos dos passos são dados (`tutorialConfig.steps[].goal`: andar, ou eventos com papel do jogador, tipos de golpe e passo mínimo de sequência via `getChainStep`). O avanço da Vespa emite também `attackStart` com o tipo `special`, para o passo da habilidade valer para todos.

**Arcade** (`DuelMode.ARCADE`): a seleção (só a etapa do lutador) cria a corrida com `createArcadeRun(jogador, selecionáveis, gameConfig.arcade)` e passa `params.arcade` (`playerCharacter`, `ladder`, `stage`). O `DuelState` lê `getArcadeStage` para escolher adversário, dificuldade da IA (`difficultyId`, em vez da dificuldade das Opções) e arena. A faixa do topo usa o `ModeBanner` (tipo `arcade`). No resultado, a primeira opção vira "Próxima luta" (`nextArcadeRun`) ou "Tentar de novo" (mesmos params). Vencer a última luta mostra o resumo "ARCADE CONCLUÍDO" e salva o personagem em `settings.arcadeCleared`. O chefe é um personagem com `selectable: false` (`shadowAwakened`, arquétipo próprio, golpes da Sombra). No chefe, `updateBossEnrage` troca a dificuldade da IA para `aiConfig.difficulties.boss` quando a vida cai abaixo de `enrageHealthRatio`, mostra a mensagem e pulsa o letterbox; volta ao normal a cada round.

`ReplayBuffer.REPLAY_STATIC_FIELDS` lista dados invariantes e intent (gravado separadamente por frame). Teste percorre todos os personagens antes e depois de passos de simulação e exige que todo campo próprio esteja nessa lista ou em captureFighter; verifica invariantes e roundtrip completo de restauração. Novos timers devem ficar em combat, copiado integralmente.

**Replay do golpe final** (determinístico, sem gravar imagem): a cada passo, antes de `simulation.step`, o `DuelState` chama `ReplayBuffer.record(fighters, dt)`. O buffer guarda, em arrays fixos, o intent de cada lutador (codificado como o `IntentRecorder`, com direção absoluta) e o `dt` do passo (`Float64Array`: com `Float32Array` o arredondamento do 1/60 mudava o frame em que golpes terminavam e o replay divergia) e, a cada `snapshotInterval` passos, uma foto do estado de cada lutador (`captureFighter`). O buffer é zerado a cada round, porque o reset de round acontece fora da simulação. No K.O. que decide o duelo, se `settings.finalReplay` não for `false`, o `DuelState` empilha o `ReplayState` com `createPlayback()` (a foto mais antiga da janela). O `ReplayState` cria clones dos lutadores (mesmos `stats` e golpes, estado restaurado por `restoreFighter`), uma `DuelSimulation`, efeitos e câmera próprios, e avança os passos gravados com os mesmos `dt`, no ritmo de `gameConfig.replay.speed`. Quando termina (ou com `Enter`/`Esc`), ele sai da pilha e o `DuelState`, de volta ao topo, mostra o resultado. Teste em `tests/replay.test.js`: re-simular a janela chega ao mesmo estado da luta original.

**Escadas (Arcade e Sobrevivência)**: o `DuelState` trata os dois modos pela mesma "escada": `ladderStage` (a luta atual, de `getArcadeStage` ou `getSurvivalStage`) e `ladderRun` (`params.arcade` ou `params.survival`). Dela vêm o personagem do jogador, a cor da lâmina, o adversário, a dificuldade, a arena e se é o chefe. A Sobrevivência usa `roundsToWin = 1`, aplica `survival.health` ao jogador no início (e em um eventual novo round por empate), não mostra replay e no resultado oferece "Próximo adversário" (`nextSurvivalRun`, com a cura parcial) ou, na derrota, salva `settings.survivalBest` e oferece "Tentar de novo" com outra seed.

**Cores de lâmina**: `characterData.altSaberColors` lista as cores alternativas (`arcade` ou com `challenge: { stat, target, text }`) e `info.saberName` nomeia a padrão. `modes/unlocks.js` diz o que está liberado (`settings.arcadeCleared` para a cor do Arcade e `settings.unlocks[personagem]` para as de desafio) e quais desafios um duelo cumpriu (`findChallengeUnlocks` compara `stats` do jogador com o alvo). O `DuelState` avalia ao mostrar o resultado de uma vitória contra a IA (Duelar ou Arcade), salva e manda `unlockLine` para o resultado. Na seleção, `←`/`→` troca a cor entre as liberadas e a escolha segue em `params.playerSaberColor`/`opponentSaberColor` (no Arcade, `arcade.playerSaberColor`). `createFighter(id, spawn, { saberColor })` copia a aparência só quando a cor muda, sem alterar os dados compartilhados. As estatísticas também contam `counters` (contra-golpes da postura).

Identidade no duelo: o `Letterbox` fica fechado (alvo 1) na intro e depois do K.O. e abre quando o round está em jogo; o parry perfeito pede um pulso curto. É desenhado depois do mundo e da vinheta e antes da HUD. A ignição é só visual: `DuelState.getBladeExtension()` vai de 0 a 1 durante a intro (`layout.ignition`), o `DuelRenderer` copia o valor para `pose.bladeExtension` e o `saberRenderer` escala o comprimento da lâmina e as luzes por ele. O som `ignite` toca uma vez por round, quando a ignição começa.

No Treino, `DuelState.updateFrameData` lê os contatos do jogador e usa `combat/frameData.js`, puro e testável, para comparar os tempos de travamento restantes. Ataque em curso usa startup+active+recovery menos stateTime; bloqueio usa blockstun; hit/stun/stagger usam stunDuration menos stateTime. Parry cancelou o ataque: o stagger do atacante produz a desvantagem correta. Contatos de K.O. são ignorados, pois não há próxima ação. Texto em `uiConfig.training`, linha hint acima da pausa, limpa no próximo round.

Treino: `IntentRecorder` guarda até 600 frames de intent em Uint16Array (10 s de simulação), sem objetos por frame. F5 grava; F6 reproduz no boneco em loop, movimento relativo ao facing; F4 para playback e volta ao boneco manual. Entre rounds a gravação fica e o cursor volta ao início. `trainingInputs` formata nomes de ações; a linha é atualizada quando a assinatura muda. F7 desenha hitboxes/hurtboxes sem exigir F3, usando a mesma transformação da câmera.

Toque mobile (v1.2): Game injeta coarsePointer e tamanho do viewport, registra TouchInput e troca seu contexto ao mudar a pilha. MenuList calcula regiões de toque no update usando layout, sem mutar no render. Seleção lê as setas de cor; BACK reutiliza os fluxos existentes. TouchControls desenha somente após toque. Retrato suspende updates de estados, solta inputs e desenha orientação; voltar à paisagem retoma. CSS respeita safe areas. Efeitos reduzidos usam coarsePointer como default; loadSettings preserva qualquer booleano salvo, incluindo v1. Nenhum campo extra nem migração necessária.

Seleção v1.4 desenha AttributeBars usando stats.attributes da factory, nove segmentos neutros e nota numérica. Geometria em uiConfig.layout.attributes; estilos em themeConfig. Preview do personagem fica à direita das barras; arena preserva seu layout. F3 mostra notas e powerLevel.

## Renderer

Arquivo: [src/core/Renderer.js](src/core/Renderer.js)

- Dono do canvas e do contexto 2D.
- Trabalha em **resolução lógica** fixa (`gameConfig.canvas`, 1280×720). `fitToDisplay` ajusta o tamanho real ao tamanho exibido e ao `devicePixelRatio`, para ficar nítido. Um `ResizeObserver` no `Game` chama esse método.
- Expõe primitivas (`clear`, `overlay`, `fillRect`, `strokeRect`, `line`, `text`, `measureText`).
- Estilos de texto vêm de `themeConfig.textStyles`, objetos criados uma vez (sem alocar por frame). Um estilo pode ter `letterSpacing` (usado no título).
- Fonte: `themeConfig.DISPLAY_FONT` (Oxanium) é declarada em `styles/main.css` e o `main.js` pede o carregamento (`document.fonts.load`) antes de o jogo começar. O canvas usa `system-ui` como reserva até a fonte chegar; como o texto é redesenhado todo frame, a troca é automática.
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
- **Habilidade exclusiva** (`intent.special`, ação `special` no buffer, prioridade logo abaixo do empurrão): `trySpecial` lê `moves.special`. Com `dash`, vira uma esquiva com perfil próprio (`startDodge` guarda `combat.dodgeProfile`; com `passThrough`, o `CollisionSystem` não separa os corpos durante o dash). Sem `dash`, é um ataque comum (`AttackType.SPECIAL`) com propriedades opcionais:
  - `counter` (postura, tipo `stance`, estado `HEAVY_ATTACK`, sem active): golpe de frente durante o startup chama `resolveCounter`, que deixa o atacante `STAGGERED`, emite `counter.event` (`counter` ou `perfectParry`) e começa `counter.move` na hora;
  - `armor` (`hits`, `damageScale`): enquanto houver `combat.armorHits` e o golpe não estiver em recovery, `applyHit` aplica o dano (escalado) e marca o evento `armored`, mas não interrompe nem empurra. Parry, empurrão e quebra de guarda ignoram a armadura;
  - `breaksGuard`: um bloqueio desse golpe vira quebra de guarda direto;
  - `sweetSpot` (`tipFrom`, `tipScale`, `innerTo`, `innerScale`): o dano depende da distância entre os corpos em relação ao alcance;
  - `charge` (`levelTime`, `levels`, `holdAt`, `damageScales`, `guardBreakLevel`): com `intent.specialHeld`, `updateCharge` segura o `stateTime` em `startup × holdAt` e acumula `combat.chargeTime` até o máximo. O nível (`getChargeLevel`) escala o dano e, no nível de `guardBreakLevel`, o bloqueio vira quebra de guarda. O `DuelRenderer` usa `getChargeRatio` como flare da lâmina durante a carga.
- **Garça e Eco**:
  - `airHeavy` (forte no ar, se o personagem tiver o golpe) é escolhido por `tryAirAttack`; `dive` no golpe dá velocidade vertical para baixo quando o active começa;
  - `leap` na habilidade (`tryLeap`): salto com velocidade própria, rearma o aéreo e passa por cima do oponente, porque os corpos só colidem quando se sobrepõem na vertical;
  - `dash.followInput`: o avanço vai na direção apertada (para trás sem direção); `dodge.passThrough` faz a esquiva comum atravessar;
  - `stats.wallJump` (`speed`, `heightScale`, `wallMargin`): o `MovementSystem` (que agora recebe a arena) deixa pular encostado na parede, uma vez por parede até tocar o chão (`combat.wallJumpSide`);
  - `stats.feint` (`staminaCost`): `tryFeint` cancela o forte ainda no startup quando o buffer tem a ação `parry` (toque na guarda) e emite `feint`. Todos os arquétipos têm `wallJump` e `feint` (nulos quando o personagem não usa).
- **Traços passivos** são atributos do arquétipo, presentes em todos (valor neutro quando o personagem não tem o traço): `blockStaminaScale`, `blockPushbackScale`, `blockWalkSpeed` (o `MovementSystem` deixa andar em `BLOCKING`), `staminaOnHit`, `punishDamageScale` (golpe em quem está em recovery, `STAGGERED` ou `STUNNED`) e `knockbackScale`.
- **Riposta**: com `riposteTime > 0`, a ação de ataque rápido usa `attacks.riposte` (`AttackType.RIPOSTE`, estado `ATTACKING`). `isStrongAttack` (forte ou riposta) escolhe o impacto e o som fortes.
- Na morte, escolhe a direção da queda: para trás se houver espaço até a parede, senão para a frente.
- Não desenha nada e não cria efeitos. Ele **emite eventos** (`hit`, `block`, `guardBreak`, `clash`, `death`, `parry`, `perfectParry`, e as ações `attackStart`, `dodge`, `actionRejected`) com atacante, defensor, tipo de ataque e ponto de contato. `events` é limpo a cada passo.
- **Clash**: antes dos hits, se os dois lutadores estão na fase active e as hitboxes se encostam, os dois ataques são cancelados, os dois recuam (`HIT` sem dano, empurrão de `gameConfig.combat.clash`) e é emitido `clash`. O clash tem prioridade sobre o hit.
- Colisão física (corpos) fica no `CollisionSystem`.

---

### Movimento v1.3

`evadeConfig.js` define enabled e perfil global; stats.evade opcional substitui o perfil completo. CombatSystem.tryEvade reaproveita startDodge e DODGING, com combat.evading/evadeSucceeded no snapshot. Deslocamento para trás só durante movementTime. findContacts detecta hitbox contra hurtbox invulnerável do EVADE e captura evaded antes de resolver; marca hasHit do atacante e emite EVADE_SUCCESS, libera IDLE e zera velocidade. Dash comum continua ignorando contatos invulneráveis. EffectsSystem guarda timer visual por defensor; DuelRenderer e DodgeAfterimage usam esse sinal para uma silhueta inclinada curta, inclusive depois da liberação imediata. Audio reutiliza DODGE. Sem novas cores/assets ou estado de combate.

Pulo duplo: MovementSystem incrementa combat.jumpsUsed (snapshot automático) no pulo terrestre e aéreo, com limite movement.maxJumps. PhysicsSystem zera no contato com chão, mesmo em estados de combate; resetForRound também zera. tryWallJump retorna se executou para dar prioridade ao pulo na parede e não muda jumpsUsed. Saltos de habilidade consomem o primeiro pulo. airJumpVelocityScale configura a velocidade do aéreo. Um voo continua permitindo um único ataque aéreo. F3 mostra contador e tempo do EVADE.

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
- Afterimage do dash e vinheta são do render; EVADE_SUCCESS também alimenta um timer visual no EffectsSystem.
- **Parry**: `parry`/`perfectParry` usam a cor e a direção do **defensor**. Além de faíscas, luz, shake e hit stop, criam um anel (pool fixo `rings`), marcam o flare da lâmina do defensor (`saberFlares`, lido por `getSaberFlare(fighter)` no render) e, no perfeito, pedem dessaturação (`desaturation`) e câmera lenta. `DuelAudio` abaixa a música por 0,3 s no parry perfeito.

- Pacote de impacto: `EffectsSystem` guarda hit flashes por lutador (0,06 s) e tremores durante hit stop. O tremor do hit afeta o atingido; no parry, o atacante aparado. O renderer aplica o deslocamento ao corpo e à lâmina sem mudar posição física. A silhueta aceita cor substituta `colors.hitFlash`.
- `Camera.punch(zoom, duration, x, y)` limita o zoom adicional a 6%, mantém o impulso mais forte e retorna suavemente em até 0,25 s. Receitas pedem 3/4/5/6% em forte/quebra de guarda/perfeito/morte. UI e flash de tela ficam fora da transformação. Efeitos reduzidos desativam hit flash e reduzem punch e tremor a 25%.
- Timers de VFX avançam por `dt` real, inclusive no hit stop e na câmera lenta; animação e combate continuam usando o tempo escalado.

`Camera.frame(left, right, width, anchorY, dt)` recebe o envelope dos corpos e suaviza centro e zoom de enquadramento (máximo 4%, margem para lâminas, âncora no chão). Mantém o viewport dentro da arena; quanto maior a distância, mais próximo de 1 o zoom. O renderer combina enquadramento e punch-in sem transformar a HUD. Valores em `effectsConfig.framing`.

## Arenas

A arena do duelo vem de `params.arena` (escolhida na seleção) ou, sem ela, de `gameConfig.duel.arena`; `gameConfig.duel.arenaOrder` é a lista oferecida ao jogador. Cada entrada de `arenas/arenaData.js` define chão (`floorHeight`, `floorColor`, `floorEdgeColor`, `showWalls`), camadas estáticas (retângulos, linhas, polígonos, círculos, arcos e glows, todos com tokens de tema), `reflection` (película da água ou da laje molhada), `crystals` + `crystalShape` (`crystal` ou `fungus`) + `crystalGlow` e uma lista `ambient` de partículas (cada uma com `kind`: `steam`, `dust`, `ripple` ou `rain`, `layer`: `air` ou `floor`, `area`: faixa vertical, e `streak`: comprimento do risco da chuva).

O `DuelState` cria um `AmbientSystem` por configuração de partícula e um `DuelRenderer(arenaDefinition)`. O `ArenaRenderer` desenha em partes, na ordem do `DuelRenderer`: `renderBackground` (camadas em cache, corpos dos cristais em cache, brilho dinâmico dos cristais na cor do sabre mais próximo e partículas do ar) → `renderFloor` → reflexo dos lutadores espelhados no eixo do chão + `renderReflectionCover` (só com `reflection`) → `renderFloorAmbient` (ondulações). A seleção de arena reutiliza o `ArenaRenderer` para a miniatura, com `Renderer.clipRect`. `ArenaRenderer` usa `Renderer.createLayer/drawLayer` para pré-renderizar fundo e chão uma vez, com overscan para o shake. Só o core cria canvases internos; lógica e dados continuam testáveis em Node. `AmbientSystem` mantém um pool fixo, avança no update do duelo e congela na pausa. Usa RNG próprio para não interferir nas decisões da IA. O cenário não emite eventos nem muda combate. `refinery` é a arena padrão: três planos industriais, piso suspenso sobre fosso, reflexo dos sabres e vapor com glows em cache. `sanctuary` (Santuário Alagado), `crystalMine` (Mina de Cristal), `rooftop` (Telhado Neon), `orbital` (Anel Orbital) e `forest` (Floresta Lumínica) seguem o ART_DIRECTION. Os nomes de arena ficam em `uiConfig.texts.arenas` e a origem da geometria está em ASSETS.md.

## Audio

Arquivos: [src/core/AudioManager.js](src/core/AudioManager.js), [src/audio/](src/audio/), [src/config/audioConfig.js](src/config/audioConfig.js). Regras em [DESIGN.md](DESIGN.md#áudio).

- Todo som é **sintetizado** (osciladores, ruído e filtros). Cada som é uma lista de camadas em `audioConfig.sounds`, tocada por `synth.playSound`. Para criar um som novo: adicione a receita e o nome em `soundNames.js`.
- O `AudioContext` só nasce no primeiro `keydown`/`pointerdown` (política de autoplay). Antes disso, e no Node, o `AudioManager` não faz nada, então estados e testes não precisam saber se há áudio.
- `DuelAudio` só lê eventos e lutadores: toca o som do evento com pan pela posição, mantém um zumbido por lutador (mais forte e agudo na fase active, desligado na morte) e abaixa a música no golpe final.
- Música dinâmica: `DuelAudio.updateMusic(fighters, heartbeatFighter, dt)` calcula a tensão (`1 − menor fração de vida`) e só chama `AudioManager.setMusicTension` quando ela muda mais que `music.tension.step`. O `createMusic` do synth tem uma camada extra (`music.tension`) cujo volume e o corte do filtro seguem a tensão com `setTargetAtTime` (sem cliques). A batida (`heartbeat`) é tocada pelo `DuelAudio` com dois toques por intervalo enquanto o lutador observado está abaixo de `heartbeat.healthRatio`. `DuelAudio.stop()` zera a tensão.
- Interface: `MenuList` toca `uiMove` e `uiConfirm` quando recebe o `AudioManager`.

### Fluxo e poderes (v1.5)

Regras em [GAME_DESIGN.md](GAME_DESIGN.md) (seção 22).

- **Regra por modo.** `createDuelRules(mode, settings, powersConfig.modes)` devolve `{ powers }`: ligado só em Duelar, 2 Jogadores e Treino, e só se `settings.powers` não for `false`. O `DuelState` guarda `this.rules` (ou usa `params.rules`, para o Story) e passa para a `DuelSimulation`, para a HUD e para o `ReplayState` (o replay re-simula com as mesmas regras). O simulador aceita `--rules powers` e a matriz repassa a opção.
- **Medidor.** A `DuelSimulation` repassa `rules` ao `CombatSystem`, que cria o `PowerSystem` (desligado quando `rules.powers` não é `true`). O `PowerSystem` regenera `fighter.powerMeter` depois da stamina e soma ganhos nos ganchos do `CombatSystem` (`onHit` no `applyHit`, `onBlock` no `resolveBlock`, `onParry` no `resolveParry`). `powerMeter` fica no `Fighter` (como `stamina`), começa em `stats.power.start` e volta a esse valor no `resetForRound`; o snapshot do replay o inclui.
- **Nível.** `stats.powerLevel` vem do atributo Fluxo. A factory soma `stats.alignment` (do `characterData`) e `stats.power` (`resolvePowerStats`): o nível muda o ganho do medidor e a potência dos poderes, não o máximo.
- **Resistência.** `getLevelDifference(caster, target)` = nível do alvo − nível de quem lança. `resolvePowerOutcome(rule, diff)` percorre as faixas da regra (`powersConfig.resistance`) e devolve `{ scale, outcome }`. Cada poder aponta para uma regra pelo nome; nenhum `if` por poder.
- **Tier visual.** `getPowerTier(level, powersConfig.tiers)` escolhe cor (`themeConfig`) e intensidade. A HUD desenha o medidor na cor do tier, abaixo da stamina, só com `rules.powers`.

## Balanceamento

`npm run simulate` roda duelos IA × IA na `DuelSimulation` real, sem navegador, alternando os lados, e mostra vitórias, tempo médio, hits, bloqueios, clashes, quebras de guarda, parries (comuns e perfeitos) e empurrões.

```bash
npm run simulate -- --duels 300 --difficulty hard
npm run simulate -- --profile balanced                     # mesmo perfil nos dois: mede só os atributos
npm run simulate -- --left shadow --right shadow --leftDifficulty hard --rightDifficulty normal
npm run simulate -- --set attributes.shadow.health=7   # testa um valor sem editar arquivos
```

Referência v0.2 (300 rounds por cenário, seed 1): o simulador mede um round por execução de duelo, sem as intros do melhor de 3. `avg hits` soma ambos os lados; `avg hits to KO` conta os hits recebidos pelo derrotado (exclui timeouts). O alvo de 6–9 é validado pela segunda métrica, coerente com 100 de vida, rápido 10, forte 24/26 e riposta 16/17. Bloquear forte custa 30/32 de stamina.

| Dificuldade | Guardião vence (perfis próprios) | Tempo | Hits totais | Hits até K.O. | Guardião vence (ambos balanced) | Hits até K.O. (balanced) |
| --- | --- | --- | --- | --- | --- | --- |
| Fácil | 42,3% | 18,2 s | 12,7 | 7,5 | 43,3% | 7,8 |
| Normal | 63,0% | 15,0 s | 13,9 | 8,4 | 50,7% | 8,6 |
| Difícil | 59,3% | 16,0 s | 13,7 | 8,5 | 53,7% | 8,9 |

Matriz v0.4 (perfil balanced nos dois lados, 120 duelos por par, seed 1, % de vitória da linha contra a coluna):

| Normal | Guardião | Sombra | Bastião | Vespa | Espelho |
| --- | --- | --- | --- | --- | --- |
| Guardião | — | 50 | 56 | 78 | 54 |
| Sombra | 52 | — | 50 | 67 | 55 |
| Bastião | 53 | 53 | — | 68 | 46 |
| Vespa | 35 | 27 | 34 | — | 32 |
| Espelho | 54 | 48 | 53 | 66 | — |

| Difícil | Guardião | Sombra | Bastião | Vespa | Espelho |
| --- | --- | --- | --- | --- | --- |
| Guardião | — | 43 | 53 | 50 | 51 |
| Sombra | 62 | — | 60 | 52 | 59 |
| Bastião | 44 | 38 | — | 35 | 49 |
| Vespa | 50 | 48 | 65 | — | 48 |
| Espelho | 57 | 38 | 60 | 52 | — |

Matriz v1.0 (perfil **próprio** de cada personagem, 60 duelos por par, seed 1, % de vitória da linha contra a coluna, média na última coluna). É o que o jogador enfrenta no Arcade e na Sobrevivência.

| Normal | Gua | Som | Bas | Ves | Esp | Has | Bra | For | Gar | Eco | média |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Guardião | — | 45 | 25 | 62 | 45 | 27 | 65 | 43 | 72 | 52 | 48,3 |
| Sombra | 58 | — | 43 | 70 | 80 | 68 | 67 | 65 | 68 | 63 | 64,8 |
| Bastião | 68 | 60 | — | 63 | 77 | 33 | 80 | 67 | 63 | 65 | 64,1 |
| Vespa | 38 | 33 | 38 | — | 57 | 23 | 55 | 63 | 58 | 60 | 47,4 |
| Espelho | 42 | 28 | 20 | 40 | — | 20 | 37 | 22 | 38 | 28 | 30,6 |
| Haste | 68 | 43 | 50 | 57 | 80 | — | 82 | 65 | 78 | 73 | 66,3 |
| Brasa | 32 | 38 | 30 | 53 | 48 | 23 | — | 27 | 48 | 43 | 38,1 |
| Forja | 67 | 38 | 42 | 43 | 75 | 38 | 82 | — | 57 | 55 | 55,2 |
| Garça | 32 | 27 | 32 | 37 | 58 | 25 | 58 | 57 | — | 42 | 40,8 |
| Eco | 53 | 32 | 33 | 47 | 63 | 40 | 55 | 52 | 55 | — | 47,8 |

| Difícil | Gua | Som | Bas | Ves | Esp | Has | Bra | For | Gar | Eco | média |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Guardião | — | 72 | 53 | 53 | 45 | 32 | 37 | 62 | 57 | 65 | 52,8 |
| Sombra | 28 | — | 40 | 33 | 30 | 55 | 28 | 35 | 33 | 52 | 37,2 |
| Bastião | 52 | 57 | — | 32 | 17 | 40 | 43 | 53 | 17 | 43 | 39,3 |
| Vespa | 53 | 70 | 80 | — | 57 | 72 | 45 | 78 | 67 | 75 | 66,3 |
| Espelho | 60 | 72 | 85 | 40 | — | 57 | 35 | 63 | 50 | 78 | 60,0 |
| Haste | 62 | 33 | 57 | 13 | 32 | — | 48 | 38 | 27 | 23 | 37,0 |
| Brasa | 58 | 70 | 70 | 50 | 57 | 60 | — | 52 | 50 | 77 | 60,4 |
| Forja | 55 | 53 | 55 | 23 | 40 | 58 | 48 | — | 33 | 55 | 46,8 |
| Garça | 45 | 58 | 85 | 43 | 43 | 85 | 57 | 60 | — | 70 | 60,7 |
| Eco | 28 | 43 | 58 | 38 | 28 | 62 | 25 | 58 | 40 | — | 42,4 |

| Média das duas | Gua | Som | Bas | Ves | Esp | Has | Bra | For | Gar | Eco |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| % | 51 | 51 | 52 | 57 | 45 | 52 | 49 | 51 | 51 | 45 |

### Matriz v1.3 (movimento)


`npm run matrix`: Normal e Difícil, perfis próprios, seed 1, 60 duelos por par ordenado (10.800 duelos). Percentuais arredondados nas células; média calculada antes de arredondar. Todas as médias por personagem ficaram dentro de +/-5 pontos da referência v1.0; maior desvio 3.1 pontos (Vespa, Difícil). Nenhum atributo existente de personagem foi recalibrado. EVADE usa chance 0,005/0,015/0,04 em Fácil/Normal/Difícil; Vespa usa jumpChance 0,005/0,008/0,01 e airJumpChance 0,5/0,7/0,85. As chances pequenas mantêm a mecânica como resposta ocasional, sem substituir o parry.

| Normal v1.3 | Gua | Som | Bas | Ves | Esp | Has | Bra | For | Gar | Eco | média | delta v1.0 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Guardião | -- | 45 | 25 | 58 | 45 | 27 | 65 | 43 | 72 | 52 | 48.0 | -0.3 |
| Sombra | 58 | -- | 43 | 72 | 80 | 68 | 67 | 65 | 68 | 63 | 65.0 | +0.2 |
| Bastião | 68 | 60 | -- | 78 | 77 | 33 | 80 | 67 | 63 | 65 | 65.7 | +1.6 |
| Vespa | 35 | 37 | 37 | -- | 57 | 52 | 45 | 47 | 58 | 50 | 46.3 | -1.1 |
| Espelho | 42 | 28 | 20 | 42 | -- | 20 | 37 | 22 | 38 | 28 | 30.7 | +0.1 |
| Haste | 68 | 43 | 50 | 55 | 80 | -- | 82 | 65 | 78 | 73 | 66.1 | -0.2 |
| Brasa | 32 | 38 | 30 | 47 | 48 | 23 | -- | 27 | 48 | 43 | 37.4 | -0.7 |
| Forja | 67 | 38 | 42 | 47 | 75 | 38 | 82 | -- | 57 | 55 | 55.6 | +0.4 |
| Garça | 32 | 27 | 32 | 42 | 58 | 25 | 58 | 57 | -- | 42 | 41.3 | +0.5 |
| Eco | 53 | 32 | 33 | 40 | 63 | 40 | 55 | 52 | 55 | -- | 47.0 | -0.8 |

| Difícil v1.3 | Gua | Som | Bas | Ves | Esp | Has | Bra | For | Gar | Eco | média | delta v1.0 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Guardião | -- | 72 | 53 | 53 | 45 | 32 | 35 | 62 | 57 | 65 | 52.6 | -0.2 |
| Sombra | 28 | -- | 40 | 40 | 30 | 55 | 28 | 35 | 33 | 52 | 38.0 | +0.8 |
| Bastião | 52 | 57 | -- | 17 | 17 | 40 | 43 | 53 | 17 | 43 | 37.6 | -1.7 |
| Vespa | 35 | 67 | 68 | -- | 57 | 80 | 47 | 70 | 67 | 78 | 63.2 | -3.1 |
| Espelho | 60 | 75 | 78 | 43 | -- | 58 | 35 | 63 | 50 | 78 | 60.2 | +0.2 |
| Haste | 62 | 33 | 55 | 20 | 32 | -- | 48 | 35 | 27 | 23 | 37.2 | +0.2 |
| Brasa | 58 | 70 | 70 | 57 | 57 | 62 | -- | 65 | 50 | 77 | 62.8 | +2.4 |
| Forja | 55 | 53 | 55 | 8 | 40 | 62 | 48 | -- | 33 | 47 | 44.6 | -2.2 |
| Garça | 45 | 58 | 85 | 28 | 43 | 85 | 52 | 60 | -- | 77 | 59.3 | -1.4 |
| Eco | 25 | 43 | 58 | 38 | 28 | 62 | 25 | 58 | 40 | -- | 42.0 | -0.4 |

### Matriz v1.4 (atributos)

`npm run matrix`: Normal e Difícil, perfis próprios, seed 1, 60 duelos por par ordenado (10.800 duelos). Todas as células e médias reproduziram a matriz v1.3; delta máximo das médias: 0,0 ponto. A calibração preserva o comportamento clássico. Percentuais arredondados nas células, média antes de arredondar.

| Normal v1.4 | Gua | Som | Bas | Ves | Esp | Has | Bra | For | Gar | Eco | média | delta v1.3 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Guardião | -- | 45 | 25 | 58 | 45 | 27 | 65 | 43 | 72 | 52 | 48.0 | 0,0 |
| Sombra | 58 | -- | 43 | 72 | 80 | 68 | 67 | 65 | 68 | 63 | 65.0 | 0,0 |
| Bastião | 68 | 60 | -- | 78 | 77 | 33 | 80 | 67 | 63 | 65 | 65.7 | 0,0 |
| Vespa | 35 | 37 | 37 | -- | 57 | 52 | 45 | 47 | 58 | 50 | 46.3 | 0,0 |
| Espelho | 42 | 28 | 20 | 42 | -- | 20 | 37 | 22 | 38 | 28 | 30.7 | 0,0 |
| Haste | 68 | 43 | 50 | 55 | 80 | -- | 82 | 65 | 78 | 73 | 66.1 | 0,0 |
| Brasa | 32 | 38 | 30 | 47 | 48 | 23 | -- | 27 | 48 | 43 | 37.4 | 0,0 |
| Forja | 67 | 38 | 42 | 47 | 75 | 38 | 82 | -- | 57 | 55 | 55.6 | 0,0 |
| Garça | 32 | 27 | 32 | 42 | 58 | 25 | 58 | 57 | -- | 42 | 41.3 | 0,0 |
| Eco | 53 | 32 | 33 | 40 | 63 | 40 | 55 | 52 | 55 | -- | 47.0 | 0,0 |

| Difícil v1.4 | Gua | Som | Bas | Ves | Esp | Has | Bra | For | Gar | Eco | média | delta v1.3 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Guardião | -- | 72 | 53 | 53 | 45 | 32 | 35 | 62 | 57 | 65 | 52.6 | 0,0 |
| Sombra | 28 | -- | 40 | 40 | 30 | 55 | 28 | 35 | 33 | 52 | 38.0 | 0,0 |
| Bastião | 52 | 57 | -- | 17 | 17 | 40 | 43 | 53 | 17 | 43 | 37.6 | 0,0 |
| Vespa | 35 | 67 | 68 | -- | 57 | 80 | 47 | 70 | 67 | 78 | 63.2 | 0,0 |
| Espelho | 60 | 75 | 78 | 43 | -- | 58 | 35 | 63 | 50 | 78 | 60.2 | 0,0 |
| Haste | 62 | 33 | 55 | 20 | 32 | -- | 48 | 35 | 27 | 23 | 37.2 | 0,0 |
| Brasa | 58 | 70 | 70 | 57 | 57 | 62 | -- | 65 | 50 | 77 | 62.8 | 0,0 |
| Forja | 55 | 53 | 55 | 8 | 40 | 62 | 48 | -- | 33 | 47 | 44.6 | 0,0 |
| Garça | 45 | 58 | 85 | 28 | 43 | 85 | 52 | 60 | -- | 77 | 59.3 | 0,0 |
| Eco | 25 | 43 | 58 | 38 | 28 | 62 | 25 | 58 | 40 | -- | 42.0 | 0,0 |

O equilíbrio depende da dificuldade, e isso foi aceito na v1.0: personagens de execução e leitura (Vespa, Espelho, Brasa, Garça) rendem mais com a IA Difícil, que completa sequências e apara melhor; os de força bruta (Bastião, Sombra, Haste) rendem mais com a Normal. Na média das duas dificuldades todos ficam entre 45% e 57%. A IA Normal apara com `parryChance` 0,38 e a Difícil com 0,5 para não ampliar essa diferença. Para reproduzir: `npm run matrix` (padrão: Normal e Difícil, 60 duelos por par; `--difficulties`, `--duels` e `--characters a,b,c` mudam isso). Ele roda o `simulate` para cada par, sem `--profile`.

A Vespa é o personagem de execução: rende pouco com a IA Normal (que completa só 60% das sequências) e fica equilibrada no Difícil. Isso é intencional (dificuldade 4 no GAME_DESIGN). Rode a matriz de novo depois de mexer em atributos.

Nenhum timeout nos seis cenários. Com ambos balanced, Difícil vence Normal 98,7% e Normal vence Fácil 99,3%. Os perfis próprios também medem a vantagem tática do perfil equilibrado sobre o agressivo, não apenas atributos.
- O trail e a luz do sabre no corpo são só do render (`SaberTrail`, `drawSaberBodyLight`). O trail usa o tempo da simulação (`fighter.animation.time`), então a pausa congela o rastro.

---

Sequências: o combate marca `attackConnected` apenas em hit ou bloqueio (inclui quebra de guarda). `tryAttackChain` lê um rápido no buffer durante recovery e procura o próximo golpe declarado em `cancelsInto`. Cada passo cobra stamina, reinicia stateTime/hasHit/lunge e emite attackStart; whiff/parry/clash não confirmam a rota. Guardião tem dois passos, Sombra três. As poses existentes de rápido são reutilizadas; o Treino identifica Rápido 2/3.

`tryAirAttack` aceita rápido/forte no estado JUMPING uma vez por pulo (`airAttackUsed`, rearmado no chão). O move air usa gravidade e velocidade horizontal existentes; MovementSystem não aplica atrito de ação no ar. Forte + intent à frente escolhe forwardHeavy, com startup/custo/recovery/lunge próprios. `isHeavyAttack` inclui o avanço para áudio e parry da IA. Não há knockback vertical nem cancels aéreos.

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
- **IA por personagem**: cada personagem tem um perfil em `aiConfig.profiles` (mesmo id do personagem; os perfis genéricos `aggressive`, `defensive` e `balanced` continuam para testes e para `simulate --profile`). O perfil traz pesos (`attackChance`, `blockChance`, `specialChance`...), distância (`preferredGap`, `closeGapRatio`), `chargeHold` (quanto segurar uma habilidade de carga) e `priorities`: a ordem dos passos de `decide()` (`defend`, `counter`, `shove`, `recover`, `special`, `attack`, `guard`, `position`). O primeiro passo que devolve uma decisão vence; `position` não devolve nada quando a distância já está boa.
- **Habilidade proativa** (`trySpecialAttack`): o tipo vem dos dados do golpe (`getSpecialKind`: `counter`, `armor`, `dash`, `charge`, `leap`, `strike`). O salto é usado perto do oponente (`perception.leapGap`). A finta usa `profile.feintChance`: ao decidir um forte, a IA agenda o toque na guarda para `heavy.startup × perception.feintAt` (só personagens com `stats.feint`). Postura de contra-golpe é usada como leitura quando o oponente está no alcance e parado; armadura, carga e golpe comum quando a habilidade alcança; o avanço só é usado como resposta (`trySpecialAnswer`). Na carga, `plan.chargeHoldTime` mantém `intent.specialHeld`.
- `perception.js` tem funções puras (`getGap`, `canReach`, `isThreatening`, `isPunishable`).
- O plano guarda direção, tempo de bloqueio e uma ação pontual (`pendingAction`), que vira intent por um frame só.
- Perfil (`aiConfig.profiles`) vem de `characterData.aiProfile`. Dificuldade (`aiConfig.difficulties`) vem de `game.settings.difficulty`.
- O RNG é injetado (o mesmo dos efeitos no jogo, seed fixa nos testes).
- `decision` fica exposta para o debug (`ai: <decisão> (<dificuldade>)`).
- O intervalo entre pensamentos é `reactionTime × (1 + reactionJitter × random)`. Sem a variação, duas IAs com a mesma dificuldade ficavam sincronizadas e sempre viam o ataque do outro no mesmo instante (o simulador média clashes e parries errados).
- **Parry**: contra um ataque forte ainda no startup, com `difficulty.parryChance`, a IA calcula quanto falta para o golpe ficar ativo e agenda o toque (`plan.parryDelay`) para cair no meio da janela (ou no começo, para o perfeito, com `perfectParryChance`). Se já for tarde, cai para bloqueio/esquiva. A contagem regressiva roda a cada frame em `updateParryTiming`, mas a decisão só nasce no pensamento: a IA continua limitada ao próprio tempo de reação.
- **Empurrão**: com o oponente em `BLOCKING` no alcance do empurrão, `profile.shoveChance × difficulty.shoveMultiplier`. Contra um empurrão que está vindo, a IA tenta acertar um ataque rápido antes (é o que vence o empurrão).
- **Comportamento por dificuldade** (`aiConfig.difficulties`):
  - `blockPunishChance`: ao decidir bloquear (ou guardar) contra golpe que não é forte, a IA já planeja a punição (`plan.punishAfterBlock`); quando o bloqueio acontece, solta a guarda e pede um ataque rápido, que sai assim que o blockstun acaba (buffer). É o "apertar antes" de um humano;
  - `recoveryGuardChance`: em `HIT`/`STAGGERED`, a IA pode decidir segurar a guarda até o fim do travamento (`getVulnerableTime(self)` + `blockHoldTime`). Sem isso, a IA esperava o próximo pensamento depois de cada golpe e perdia para quem só apertava ataque rápido;
  - `attackTell`: o ataque decidido vira `plan.delayedAction` e só sai depois desse tempo, com a IA parada (o "aviso" do Fácil). Punições não esperam. Se a IA for atingida no meio, o golpe é cancelado;
  - `smartPunish`: na punição, usa o forte quando `getVulnerableTime(oponente)` passa do startup do forte mais `perception.punishMargin`;
  - `whiffBaitChance`: contra um golpe no startup, recua um passo em vez de defender, para o golpe errar e a recovery ficar punível;
  - `chainChance`: rolada uma vez por golpe que conectou; continua a sequência de rápidos durante a recovery;
  - `adaptation`: liga a `HabitMemory`. A cada frame ela observa o oponente (só o que é visível: começo de golpes e tempo em `BLOCKING`, com esquecimento exponencial). Acima dos limiares de `perception.habits.thresholds`, soma `bonuses` à chance de parry (abuso de forte), de empurrão (muito bloqueio) e de guarda (abuso de rápido);
  - `specialMultiplier` × `profile.specialChance`: uso da habilidade conforme o tipo dela. Postura de contra-golpe contra golpe no startup, armadura contra golpe que não é forte e avanço contra forte no startup (`trySpecialAnswer`).

**Garantia testada:** a IA roda com os lutadores congelados (`Object.freeze`) sem erro, ou seja, ela nunca altera HP, stamina, posição ou estado.

---

IA EVADE: getTimeUntilAttackActive expõe startup restante, zero no active ainda não conectado e Infinity fora da ameaça. No pensamento de defesa, a rolagem já existente escolhe EVADE por evadeChance e evadeWeight do perfil, somente contra active. evadeTimingJitter agenda atraso; a cada passo o plano valida se aquele golpe ainda existe e solicita intent.evade uma vez. Nenhuma mutação no lutador. Fora de blockstun, EVADE também pode sair de BLOCKING. Chances iniciais pequenas preservam o combate clássico; calibração final pela matriz.

IA de movimento só pede intent.jump: inicia o salto ao aproximar/recuar/recuperar stamina com maxJumps > 1 e tenta o segundo a partir do ápice, respeitando jumpsUsed. O simulador usa os mesmos controllers/sistemas e agora informa pulos, pulos aéreos, tentativas e sucessos de EVADE. --set evade.enabled=false permite comparar sem EVADE, sem criar rules.

## Debug

Arquivo: [src/utils/debug.js](src/utils/debug.js)

- Liga e desliga com `F3`. O valor inicial vem de `gameConfig.debug.enabled`.
- Mostra FPS, a pilha de estados e as linhas de `getDebugInfo()` de cada estado.
- Chama `renderDebug(renderer)` de cada estado para desenhos de debug. O `DuelState` desenha a hurtbox (verde, apagada durante a invulnerabilidade) e a hitbox ativa (vermelha), e mostra estado, vida, stamina, posição, velocidade, comportamento do boneco e o último evento de combate.
- Mostra a decisão atual da IA (`ai: <decisão> (<dificuldade>)`).

---

## Configuração

- Balanceamento e ajustes ficam em `src/config/`. Nada de números mágicos espalhados.
- Textos e layout da interface ficam em `uiConfig.js`.
- Cores e estilos de texto ficam em `themeConfig.js` e espelham [design/VISUAL_SYSTEM.md](design/VISUAL_SYSTEM.md).
- Arquivos de config exportam objetos simples, sem lógica.

---

Verificação visual da v0.2: Chrome headless local, Canvas real, eventos de parry/perfeito/empurrão gerados pela simulação e tela de Controles inspecionada. Dessaturação cobre o mundo com shake de ±12 px; lâminas, anéis e flare mantêm a cor.

Validação final: fixture `tests/fixtures/save-v1.json` foi produzida pelo saveSettings original do commit 305b59f, com progresso e remapeamento reais do esquema v1. Fontes de input não repetem a borda quando teclado assume uma ação já segurada por outra fonte; testes cobrem as duas ordens. Chrome headless local: DPR 3 limitado a 2, Canvas real, F3 com médias e pose inclinada do EVADE; nenhum erro de JavaScript. Servidor de teste encerrado ao finalizar.


## Testabilidade

Testes rodam em Node (`npm test`), sem navegador. Por isso:

- Módulos de lógica (`states/`, `characters/`, `controllers/`, `entities/`, `combat/`, `simulation/`, `systems/`, `ai/`, `config/`, `utils/`) **não** acessam `window`, `document` ou canvas. Estados e `rendering/` desenham só pela API do `Renderer` recebido.
- Quando um módulo do core precisa do navegador (`Input`, `GameLoop`), a dependência é injetada.
- `computePose` é uma função pura e também é testada.

Testes atuais: 384 testes em `tests/`, um arquivo por área (loop, input, estados e modos, combate, especiais, IA, simulação, replay, áudio, efeitos, UI, desbloqueios, Arcade, Sobrevivência, remapeamento). `tests/states.test.js` cobre o fluxo de telas; `goToMenuItem(game, id)` navega no menu pelo id, sem depender da posição dos itens. Utilitários compartilhados ficam em `tests/helpers.js` (`createSimulation`, `spawnFighter`...).

---

## Dependências entre módulos

```
core/Game     → core, states/stateFactory, config, utils
modes         → combat (fases e eventos), utils (RNG com seed)
states        → states/stateIds, modes, simulation, combat, ai, audio, controllers, characters, entities, rendering, ui, config
ui            → config, utils
ai            → combat (fases), entities (estados), systems/StaminaSystem (canAfford), config
audio         → combat (eventos, fases), config, utils
tools/simulate → characters, simulation, ai, config (sem navegador)
simulation    → systems, combat, controllers/IntentRecorder (codificação dos intents do replay)
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

## v2 planejada

Roteiro e tarefas em [versions/v2.md](versions/v2.md). Esta seção registra as decisões de arquitetura aprovadas. Cada módulo só é criado na task que precisar dele e então entra na estrutura de pastas.

**Princípios.** Tudo novo que muda o resultado de uma luta roda dentro da `DuelSimulation` com o dt fixo, guarda estado em `fighter.combat` (copiado inteiro pelo snapshot do replay) e é configurado em `src/config/`. Game, Renderer, Audio, Effects e Input não contêm regra de gameplay. Os modos clássicos (Arcade, Sobrevivência, Tutorial, Treino) recebem `rules` padrão e ficam idênticos à v1.0.

**Refactors da v1.1 (concluídos).**

1. `Input` com fontes genéricas: teclado, gamepad e, depois, toque alimentam o mesmo conjunto de ações (teclado e gamepad já são fontes independentes).
2. Save versionado (`saveStorage.js`): `{ version: 2, settings }` com lista de migrações; a v1 (objeto plano de settings) migra sem perda. Seções novas (story, protagonista) entram na task que precisar delas, com uma migração.
3. `DuelResult` (objeto simples: vencedor, `healthRatio`, estatísticas, tempo) e `duelOutcomes` (roteamento por modo), tirando Arcade e Sobrevivência do `DuelState`. Story e finais leem o `DuelResult`, nunca o `Fighter`.
4. Teste que falha se um campo mutável do `Fighter` ficar fora do `captureFighter`.
5. `gameConfig.canvas.maxPixelRatio` (2) limita o DPR em Game.handleResize; GameLoop mede update e render com now injetado e publica médias por frame (janela de timingSampleFrames, 60). F3 mostra ms, sem mudar dt da simulação.

A regra `rules` nos parâmetros do duelo (`powers`) foi implementada na v1.5, junto com o medidor (ver Combat → Fluxo e poderes).

**Módulos previstos.**

```
core/TouchInput.js            IMPLEMENTADO v1.2: pointer events no canvas → ações (multitoque por pointerId, joystick com zona morta)
core/textPrompt.js            input DOM temporário só na tela de nome (injetado)
config/touchLayoutConfig.js, attributesConfig.js, powersConfig.js (com os tiers visuais),
       storyConfig.js, secretsConfig.js, introConfig.js
characters/attributes.js      IMPLEMENTADO v1.4: applyAttributes(base, attributes, config) → stats derivados (puro)
characters/protagonist.js     createProtagonistCharacter(save) → dados para a createFighter atual
characters/skins.js           resolveAppearance(character, skinId)
combat/powerResistance.js     IMPLEMENTADO v1.5: resolvePowerOutcome(rule, levelDiff) → { scale, outcome } e getPowerTier (puros)
combat/powerEffects.js        registro { push, pull, lightning, barrier } → handler
combat/PowerSystem.js         IMPLEMENTADO v1.5 (medidor); recargas, fases do poder e eventos na v1.6
modes/story/StoryDirector.js, modes/story/conditions.js
modes/SecretUnlockSystem.js   casa sequências de teclas (lastPressedCode) e de ações; persiste o desbloqueio
states/IntroState.js, StoryState.js, DialogueState.js, ProtagonistState.js
rendering/powerRenderer.js    aura em cache por tier, raio em polilinha, ondas
ui/TouchControls.js           IMPLEMENTADO v1.2: controles de toque desenhados no canvas
```

**Decisões.**

- **Atributos implementados na v1.4** (1–9; só o `foretold` tem Fluxo 10) são a única fonte dos stats escalares: Vida → vida; Stamina → máximo e regeneração; Lâmina → escala de dano e bônus pequeno no parry perfeito; Defesa → guarda (custo do bloqueio, recuo, limite de quebra), não redução de dano; Agilidade → velocidade, pulo, dash e janela do EVADE; Fluxo → `powerLevel`. O arquétipo continua dono de tempos, golpes e traços.
- **Fluxo implementado na v1.5**: `powerLevel` (permanente) define potência, ganho do medidor, resistência e tier visual (o máximo do medidor é igual para todos); `powerMeter` é o recurso da luta; `stamina` continua o recurso físico.
- **Resistência**: `levelDiff = alvo.powerLevel − conjurador.powerLevel`; cada poder aponta para uma regra em dados (faixas → escala e resultado `normal`, `reduced`, `resisted`). Um único resolvedor puro, sem `if` por poder.
- **Poderes** são definições com fases (startup, active, recovery), como os golpes, pagas com `powerMeter`. Estados novos: `CASTING` e `CHANNELING`. Sem projéteis na v2. Efeitos no alvo reaproveitam `HIT` e `STAGGERED`.
- **EVADE implementado na v1.3** (esquiva de precisão) é uma ação nova no "baixo" (S/↓, direcional baixo, joystick baixo); o Shift continua o dash. Flag `evade` no intent (o `IntentRecorder` passa de 10 para 12 bits com `power`, cabe no `Uint16`).
- **Pulo duplo implementado na v1.3**: `movement.maxJumps` com contador em `fighter.combat`; zera no chão; o pulo na parede não devolve o pulo aéreo.
- **Finais e condições** são dados (`{ condition: { type, threshold }, next }`) avaliados por um registro de condições contra o `DuelResult`.
- **Protagonista** é dados gerados do save e entra na `createFighter`; não há sistema de animação novo.
- **Skins** são overrides parciais de `appearance` (paleta e peças de silhueta existentes), sem efeito em stats; a escolha fica no save.
- **Segredo**: sequência de letras (teclado) e de ações (gamepad e toque) em `secretsConfig`; o input do jogador é o gesto que libera o áudio; a intro termina numa tela de título que só avança com Confirmar.

**Orçamento de desempenho (alvo mobile).** Update ≤ 2 ms e render ≤ 10 ms por frame em celular intermediário. Partículas dos poderes usam o pool atual (`maxParticles` 300; metade com efeitos reduzidos); luzes 8 (4 com efeitos reduzidos); raio com no máximo 2 polilinhas de cerca de 10 segmentos, regeradas a cada poucos frames; aura em sprites pré-renderizados por tier; nada de `shadowBlur`, `filter` ou gradiente criado por frame; DPR limitado por config; áudio continua sintetizado.

---

## Convenções de código

- Um módulo por arquivo. Classes em `PascalCase.js`, o resto em `camelCase.js`.
- Somente `export` nomeado (sem `export default`).
- Imports sempre com extensão `.js`.
- **Sem comentários no código.** Nomes claros substituem comentários. Contexto e decisões ficam neste documento.
- Evitar criar objetos dentro do loop sem necessidade.
- Listeners adicionados devem ter forma de remoção (`destroy()`).

