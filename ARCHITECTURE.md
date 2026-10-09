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
media/                      ✅ capturas de tela usadas no README (não são carregadas pelo jogo)
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
    textPrompt.js           ✅ input temporário com alvo DOM injetado; Enter, composição e limpeza
    Input.js                ✅ teclado e gamepad → ações; uma instância por jogador (gamepadSlot)
    KeyboardSource.js       ✅ eventos de teclado e bindings
    TouchInput.js           ✅ alvo injetado, pointerId e joystick; libera listeners no destroy
    GamepadSource.js        ✅ controle standard e rumble
    Renderer.js             ✅ canvas e primitivas de desenho
    StateMachine.js         ✅ pilha de estados
    Camera.js               ✅ screen shake (com limites)
    AudioManager.js         ✅ AudioContext, buses de sfx e música, liberação no primeiro input
    saveStorage.js          ✅ save versionado com lista ordenada de migrações (v5: `{ version, settings, story }`)
    settingsStorage.js      ✅ carrega e salva as opções (localStorage, tolerante a erro)
    keyBindings.js          ✅ preset personalizado: junta, troca teclas entre ações e valida o que vem do armazenamento
    AssetManager.js         ⏳ só quando houver assets externos
  states/                   ✅ telas do jogo
    GameState.js            ✅ classe base
    stateIds.js             ✅ ids dos estados
    duelModes.js            ✅ modos do duelo (versus, local, arcade, sobrevivência, tutorial, desafio, treino) e `createDuelRules`
    stateFactory.js         ✅ cria estados a partir do id
    IntroState.js           ✅ intro (lâmina, título), tela de título e segredo; primeira tela do jogo
    MenuState.js            ✅ título + opções (MenuList)
    CharacterSelectState.js ✅ escolhe jogador, adversário (ou J2), cor da lâmina, skin e arena; Arcade e Sobrevivência só pedem o jogador
    ControlsState.js        ✅ tabela de controles gerada do controlsConfig
    DuelState.js            ✅ duelo: intro, simulação, efeitos, HUD, fim do duelo
    PauseState.js           ✅ continuar, reiniciar, sair
    GameOverState.js        ✅ vitória/derrota, tabela de estatísticas dos dois lutadores, revanche
    MoveListState.js        ✅ lista de golpes do personagem do jogador (aberta pela pausa)
    ReplayState.js          ✅ replay do golpe final: re-simula a janela gravada em câmera lenta
    OptionsState.js         ✅ dificuldade, efeitos, som, música, teclado, replay
    KeyRemapState.js        ✅ remapeamento das ações de luta (preset Personalizado)
    StoryState.js           ✅ hub da História: continuar, evoluir, nova campanha
    ProtagonistState.js     ✅ criação do protagonista em seis passos e distribuição de pontos
    DialogueState.js        ✅ falas em sequência sobre a arena ou sobre o duelo; ao fim troca para `params.next`
  arenas/                   ✅ dados visuais de arenas, sem regras de gameplay
    arenaData.js            ✅ camadas estáticas e partículas ambientes por arena
  characters/               ✅ dados e criação de personagens
    characterData.js        ✅ personagens: nome, arquétipo, perfil de IA, aparência
    attributes.js           ✅ deriva stats sem mutar base ou notas
    powers.js               ✅ `resolvePowerStats`: medidor, ganho, potência e poderes do alinhamento (loadout)
    skins.js                ✅ resolve overrides cosméticos parciais sem mudar lâmina ou stats
    protagonist.js          ✅ perfil e skin da História sobre o arquétipo do estilo
    characterFactory.js     ✅ cria um Fighter a partir dos dados
  modes/                    ✅ regras de modos de jogo, puras e testáveis (sem render)
    DuelResult.js           ✅ resultado independente dos Fighters
    duelOutcomes.js         ✅ resultado + escada -> tela e patch de progresso
    TutorialDirector.js     ✅ passos do tutorial: objetivo, progresso e comportamento do boneco
    ParryChallenge.js       ✅ desafio de parry: tempo, pontos e resumo
    arcade.js               ✅ escada do Arcade: adversários, dificuldade e arena por luta, chefe no fim
    unlocks.js              ✅ cores de lâmina e skins liberadas por Arcade, desafios e finais
    survival.js             ✅ Sobrevivência: adversário sorteado por seed, dificuldade por vitórias, chefe periódico, vida carregada
    story/storyRun.js       ✅ campanha pura: criar, avançar, rotas por condição, pontos, recompensas, validação do save
    story/conditions.js     ✅ registro de condições de rota (`always`, `healthRatioAbove`, `alignmentIs`)
    story/dialogue.js       ✅ resolve falante, variante de alinhamento e `{name}`
    SecretUnlockSystem.js   ✅ casa sequências de tokens por tipo (`key:`, `action:`, `tap:`), com tempo limite entre tokens
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
    PowerSystem.js          ✅ medidor, recarga, escolha e fases dos poderes, alvo, resistência e Barreira; desligado sem `rules.powers`
    powerEffects.js         ✅ registro de efeitos por poder (`push`, `pull`, `lightning`, `barrier`)
    flowInteractions.js     ✅ diferença de Fluxo, `resolveInteraction` (faixas por habilidade em dados) e tier visual (puros)
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
    PowerRenderer.js        ✅ brilho de carga, raio (polilinhas) e domo da Barreira, só lendo o estado
  ui/                       ✅ peças de interface desenhadas no canvas
    attributeBars.js        ✅ seis linhas de nove segmentos (dez para nota 10); posição por parâmetro; somente leitura
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
    airDashConfig.js        ✅ flag e perfil global do dash aéreo (override por arquétipo em `stats.airDash`)
    attributesConfig.js     ✅ tabela 1–10 (escala 7/8/9/10), bases na nota 4, calibração por arquétipo e regra de conversão da escala antiga
    powersConfig.js         ✅ modos com poderes, medidor, tabelas de interação por habilidade e tiers visuais do Fluxo
    storyConfig.js          ✅ regras da História, opções do protagonista, encontros (rotas, recompensas, liberações) e finais
    storyTexts.js           ✅ títulos e falas dos encontros e finais
    introConfig.js          ✅ linha do tempo e desenho da intro
    secretsConfig.js        ✅ sequências secretas (teclas, ações, toques) e recompensas
    fightersConfig.js       ✅ estrutura por arquétipo (corpo, tempos, golpes, custos, traços e regras de mobilidade)
    fighterVisualConfig.js  ✅ proporções, animação, poses de combate, sombra e estilo do sabre
    effectsConfig.js        ✅ limites e receitas de VFX
  utils/
    debug.js                ✅ overlay de debug
    math.js                 ✅ clamp, lerp, approach, smoothTowards
    easing.js               ✅ curvas de easing para poses
    random.js               ✅ RNG com seed (testes determinísticos)
    legacyRatings.js        ✅ conversão das notas 1–9 para a escala 7/8/9/10 (elenco e migração do save)
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

### Atributos

`applyAttributes(base, attributes, config, { potential })` é pura. **Escala 7/8/9/10 (v1.12):** notas inteiras de 1 a `maxRating` (7), padrão 4; `getRatingLimit(config, potential)` = `maxRating + potential`, então só os secretos passam de 7 (8, 9 e 10). Multiplicadores lineares `1 + 0,08 × (nota − 4)`: 0,76 / 0,84 / 0,92 / 1 / 1,08 / 1,16 / 1,24 / 1,32 / 1,40 / 1,48. As bases na nota 4 ficam em attributesConfig.bases por arquétipo e foram recalculadas dividindo os stats de cada personagem comum pelo multiplicador da nota nova; parry perfeito (`perfectParryBonus` 0,0025 por nota acima de 4) e reserva de guarda (`guardBreakThreshold` sem o piso) também foram recalibrados na base. Resultado: os 11 arquétipos têm exatamente os mesmos stats (fixture stats-v1.3, que verifica todos os stats afetados e o dano de cada golpe). Arredondamento em 9 casas evita alterações por ponto flutuante.

**Conversão da escala antiga.** `utils/legacyRatings.js` tem a regra única, com os parâmetros em `attributesConfig.legacyScale`: atributo físico `⌊1 + (nota − 1) × 0,75 + 0,5⌋` (1–9 → 1–7) e Fluxo `nota − 1` (`flowShift`). O Fluxo usa deslocamento porque o elenco ia de 3 a 8: menos 1 cabe em 2–7 e preserva **toda** diferença de Fluxo, logo todas as faixas de interação. `meter.baseLevel` do `powersConfig` passou de 5 para 4 pelo mesmo motivo, então ganho de medidor e potência ficaram iguais. A mesma regra converteu as notas do elenco e converte o protagonista no save v4 → v5.

Vida escala maxHealth; Stamina escala maxStamina e regenPerSecond; Lâmina escala o dano de todos os golpes e soma 0,002 s por nota acima de 5 ao parry perfeito (limitado à janela total). Defesa divide custo e recuo do bloqueio pelo multiplicador e muda guardBreakThreshold em 1 de stamina por nota, com piso zero. Bases de reserva compensam as notas atuais para preservar quebra somente quando faltar stamina. CombatSystem compara custo + reserva; dano recebido permanece igual. blockStaminaScale e blockPushbackScale no arquétipo continuam apenas como traços passivos (Guardião/Bastião), compostos com os fatores de Defesa.

Agilidade escala caminhada, velocidade vertical de pulo, dash e invulnerabilidade do EVADE pelo perfil de evadeConfig. Coeficientes calibrados preservam a janela 0,066 s atual. Também escala avanços/saltos de habilidade e pulo na parede, sem alterar durações, maxJumps ou regras de ataque aéreo. Fluxo vira stats.flowLevel, acessível pelo getter Fighter.flowLevel, imutável na luta e coberto pelo snapshot via stats; sem medidor ou efeito nesta etapa.

Factory junta estrutura, bases e golpes antes de aplicar notas; nenhum snapshot de stats é criado no import. Simulador aceita --set attributes.guardian.health=7, attributeBases.guardian.maxHealth=100, attributeConfig.perfectParryBonus=0, story.budgets.easy=33 e powers.cooldown=1 (raízes `story` e `powers` desde a v1.12). Overrides ocorrem antes da factory; caminhos fighters continuam para tempos, custos e traços.

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
       ├─ Input e secondInput (2 Jogadores), com TouchInput como fonte do Input
       ├─ AudioManager
       ├─ StateMachine ── createState(StateId) → IntroState (primeira tela) / MenuState / DuelState / ...
       ├─ settings + story (save v5)
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
IntroState ──Confirmar──▶ MenuState
MenuState ─┬─ História ──▶ StoryState ──▶ ProtagonistState / DialogueState ──▶ DuelState({ mode: story })
           ├─ Duelar / Arcade / Sobrevivência / 2 Jogadores ──▶ CharacterSelectState ──▶ DuelState({ mode, ... })
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

Seleção v1.4 desenha AttributeBars usando stats.attributes da factory, nove segmentos neutros e nota numérica. Geometria em uiConfig.layout.attributes; estilos em themeConfig. Preview do personagem fica à direita das barras; arena preserva seu layout. F3 mostra notas e flowLevel.

## Renderer

Arquivo: [src/core/Renderer.js](src/core/Renderer.js)

- Dono do canvas e do contexto 2D.
- Trabalha em **resolução lógica** fixa (`gameConfig.canvas`, 1280×720). `fitToDisplay(dpr, maxViewWidth)` ajusta o tamanho real ao tamanho exibido e ao `devicePixelRatio`, para ficar nítido. Um `ResizeObserver` no `Game` chama esse método.
- **Vista mais larga que o conteúdo.** Com o canvas mais largo que 16:9 (CSS até 19,5:9), o renderer calcula `viewWidth` (largura lógica visível, até `maxViewWidth`), `offsetX` (centralização do conteúdo de 1280) e `viewScale` (`viewWidth / 1280`). O `Game.render` limpa a vista inteira, desenha os estados com `translate(offsetX)` (todo o código continua em 1280×720) e desenha os controles de toque e o debug sem o deslocamento. `clear`, `overlay`, vinheta, flash e letterbox usam `viewLeft`/`viewWidth` para cobrir a vista inteira. A `Camera` multiplica o zoom de enquadramento por `viewScale` (ancorado no chão), então o mundo preenche a largura; a HUD encosta nas bordas. O `TouchInput` recebe `getView`: botões com `anchor: 'right'` ou `'left'` ficam presos à borda, os demais seguem o conteúdo, e os toques de menu são convertidos para coordenadas de conteúdo. O campo de nome (`textPrompt`) usa `Game.getContentBounds()`.
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

### Esquiva de precisão e pulo duplo

`evadeConfig.js` define enabled e perfil global; stats.evade opcional substitui o perfil completo. CombatSystem.tryEvade reaproveita startDodge e DODGING, com combat.evading/evadeSucceeded no snapshot. Deslocamento para trás só durante movementTime. findContacts detecta hitbox contra hurtbox invulnerável do EVADE e captura evaded antes de resolver; marca hasHit do atacante e emite EVADE_SUCCESS, libera IDLE e zera velocidade. Dash comum continua ignorando contatos invulneráveis. EffectsSystem guarda timer visual por defensor; DuelRenderer e DodgeAfterimage usam esse sinal para uma silhueta inclinada curta, inclusive depois da liberação imediata. Audio reutiliza DODGE. Sem novas cores/assets ou estado de combate.

Pulo duplo: MovementSystem incrementa combat.jumpsUsed (snapshot automático) no pulo terrestre e aéreo, com limite movement.maxJumps (2 em todos os arquétipos desde a v1.13). PhysicsSystem zera no contato com chão, mesmo em estados de combate; resetForRound também zera. tryWallJump retorna se executou para dar prioridade ao pulo na parede e não muda jumpsUsed. Saltos de habilidade consomem o primeiro pulo. airJumpVelocityScale configura a velocidade do aéreo. Um voo continua permitindo um único ataque aéreo. F3 mostra contador e tempo do EVADE.

**Dash aéreo (v1.13).** Sem flag nova no intent: `intent.dodge` no ar continua virando a ação `dodge` no buffer. Em `startActions`, quando o lutador não pode agir (está no ar), `CombatSystem.tryAirDash` roda antes de `tryAirAttack`: só em `JUMPING`, consome o buffer, recusa (`actionRejected`) sem stamina ou com `combat.airDashUsed`, e senão cobra `stats.airDash.staminaCost` e chama o mesmo `startDodge` da esquiva com o perfil aéreo (`airDashConfig.profile`, ou `stats.airDash` do arquétipo, montado na factory como o `evade`). O perfil tem `invulnerableTime: 0` (o `hasHurtbox` continua verdadeiro), `passThrough: true` (o `CollisionSystem` não separa os corpos) e `lift` (velocidade para cima no início). Direção: a apertada, ou o `facing`. `combat.airDashUsed` zera no chão junto com `airAttackUsed` e entra no snapshot do replay por estar em `combat`. O `MovementSystem` só vira o lutador para o oponente quando ele está no chão, então o lado se ajusta ao pousar. O F3 mostra se o dash aéreo do salto já foi usado. Ao fim do `DODGING` no ar o estado volta a `IDLE` e o `updateStates` o leva a `JUMPING`, permitindo ainda o pulo aéreo.

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

## Fluxo e poderes

Arquivos: [src/combat/PowerSystem.js](src/combat/PowerSystem.js), [src/combat/powerEffects.js](src/combat/powerEffects.js), [src/combat/flowInteractions.js](src/combat/flowInteractions.js), [src/config/powersConfig.js](src/config/powersConfig.js), [src/rendering/PowerRenderer.js](src/rendering/PowerRenderer.js).

### Medidor, regra por modo e interações

Regras em [GAME_DESIGN.md](GAME_DESIGN.md) (seção 22).

- **Regra por modo.** `createDuelRules(mode, settings, powersConfig.modes)` devolve `{ powers }`: ligado só em Duelar, 2 Jogadores e Treino, e só se `settings.powers` não for `false`. O `DuelState` guarda `this.rules` (ou usa `params.rules`, para o Story) e passa para a `DuelSimulation`, para a HUD e para o `ReplayState` (o replay re-simula com as mesmas regras). O simulador aceita `--rules powers` e a matriz repassa a opção.
- **Medidor.** A `DuelSimulation` repassa `rules` ao `CombatSystem`, que cria o `PowerSystem` (desligado quando `rules.powers` não é `true`). O `PowerSystem` regenera `fighter.flowMeter` depois da stamina e soma ganhos nos ganchos do `CombatSystem` (`onHit` no `applyHit`, `onBlock` no `resolveBlock`, `onParry` no `resolveParry`). `flowMeter` fica no `Fighter` (como `stamina`), começa em `stats.power.start` e volta a esse valor no `resetForRound`; o snapshot do replay o inclui.
- **Nível.** `stats.flowLevel` vem do atributo Fluxo. A factory soma `stats.alignment` (do `characterData`) e `stats.power` (`resolvePowerStats`): o nível muda o ganho do medidor e a potência dos poderes, não o máximo.
- **Interações.** `getFlowDifference(caster, target)` = `caster.flowLevel − target.flowLevel` (positivo: quem lança é mais forte). Cada poder aponta para sua tabela em `powersConfig.interactions[power.interaction]`. `resolveInteraction(table, diff)` devolve a primeira faixa com `diff ≥ atLeast` (a última tem `atLeast: -Infinity`). A faixa é o conjunto de modificadores que os handlers leem: `outcome` (`normal`, `reduced`, `resisted`), `scale` (escala do efeito, multiplicada pela potência), `blockable` (a guarda de frente vale), `guardDamage` (fração do dano escalado que passa pela guarda), `guardSlide` (fator do recuo na guarda), `guardStamina` (fator sobre `power.guard.staminaCost`), `duration` (stun e efeitos com duração) e `stagger` (desequilíbrio). Falhar é sempre por limiar (`outcome: resisted`), nunca por sorteio, para o replay continuar determinístico. Nenhum `if` por poder: um poder novo ganha uma tabela, e um modificador novo entra em todas as faixas e no handler que o usa. As faixas atuais (v1.11) reproduzem a regra da v1.6 com o sinal novo: −1 ou mais normal, −2 metade, −3 ou menos resistido; guarda da Repulsão e do Puxão sem dano e com metade do recuo, guarda do Raio com um quarto do dano.
- **Tier visual.** `getPowerTier(level, powersConfig.tiers)` escolhe cor (`themeConfig`) e intensidade. A HUD desenha o medidor na cor do tier, abaixo da stamina, só com `rules.powers`.

### Poderes

- **Estados e ação.** `CASTING` (poderes instantâneos) e `CHANNELING` (raio e barreira). A ação `power` (`intent.power`, segurar = `intent.powerHeld`) entra no buffer depois do empurrão e antes da habilidade, e também sai de dentro do `BLOCKING` fora do blockstun. Com os poderes desligados, a ação é descartada sem evento. Sem medidor ou em recarga, `actionRejected` sai com `attackType: 'power'`.
- **Escolha.** `selectPower` lê `stats.power.loadout` (de `powersConfig.loadouts[alinhamento]`): direção relativa ao `facing` escolhe `forward`, `back` ou `neutral`, e um espaço vazio cai no `neutral`.
- **Fases.** `PowerSystem.resolve` roda no fim de `CombatSystem.update`, antes do movimento. Instantâneo: no fim do startup aplica o efeito uma vez (`affect(..., 'active')`), emite `powerActive` e termina depois de active + recovery. Canal: depois do startup, enquanto `powerHeld`, há medidor e o tempo não passou de `maxChannel`, drena o medidor e chama `tick`; sempre há pelo menos um passo de canal (um toque dá um pulso). `powerEndTime` marca o fim do canal; a recuperação conta a partir dele. `finish` limpa o poder, volta a `IDLE` e liga `powerCooldown` (`powersConfig.cooldown`).
- **Efeito.** `affect` confere alcance (`isInPowerRange`: à frente, gap ≤ `range`; na vertical, uma altura de corpo com os dois no chão e `powersConfig.airReach` quando um deles está no ar), invulnerabilidade (esquiva e EVADE passam), Barreira (`isBarrierUp` → `powerAbsorbed`, com recuo pequeno para empurrões), interação (`powerResisted` quando a faixa é `resisted`) e guarda de frente (`isGuardingAgainst`, só se a faixa for `blockable`). Depois chama o handler do registro `powerEffects[effect][fase]` com um contexto reaproveitado (sem objeto novo por chamada), que carrega a faixa em `context.interaction` e o modificador aéreo em `context.air` (`table.air` com o alvo no ar; um objeto neutro congelado no chão). Cada tabela é `{ air, bands }`: `air.scale` multiplica a escala do efeito, `air.duration` o stun do Raio e `air.stagger` o desequilíbrio. O dano passa por `CombatSystem.dealPowerDamage`, que emite `powerHit` ou `powerBlocked`, dá medidor ao atingido e usa o mesmo `knockOut` do golpe de lâmina.
- **Barreira na lâmina.** Em `resolveContact`, depois do empurrão de corpo e antes do counter: com a barreira de pé, `resolveBarrierBlock` segura o golpe sem gastar stamina e emite `powerAbsorbed`. O empurrão de corpo continua vencendo (`applyShove` limpa o poder).
- **Interrupção.** `Fighter.clearAttack` também limpa o poder (`clearPower`), então qualquer golpe, empurrão ou desequilíbrio interrompe quem está lançando.
- **Puxão.** A velocidade vem do atrito de ação da física (`friction`, repassado pela `DuelSimulation`): `√(2 × atrito × distância)` faz o alvo parar perto de `endGap`.
- **Estado.** Tudo que muda fica em `fighter.combat` (`power`, `powerEndTime`, `powerTick`, `powerTargeted`, `powerCooldown`, `powerTargetX/Y`) e em `fighter.flowMeter`; o replay re-simula igual (teste dedicado). `powerTargetX/Y` guarda o ponto mirado para o render, sem lógica no renderer.
- **Apresentação.** O `PowerRenderer` (chamado pelo `DuelRenderer` depois das lâminas) só lê o estado: brilho de carga na mão durante o startup, domo da Barreira enquanto `isBarrierUp`, raio enquanto o canal está aberto, da mão até `powerTargetX/Y`. O raio guarda, por lutador, deslocamentos perpendiculares em `Float32Array` (RNG próprio com seed, renovados a cada `render.boltRefresh` do tempo de animação) e recalcula os pontos a cada frame sem alocar. Cores e intensidade vêm do tier (`getPowerTier`); toda luz usa `drawGlow` (sprite em cache por cor). O `EffectsSystem` trata `powerActive` (anel que abre ou, no Puxão, fecha: `ring.contract`), `powerHit`, `powerBlocked`, `powerResisted` (anel na cor do tier do alvo) e `powerAbsorbed`; receitas com `tinted` pintam metade das faíscas na cor do tier. Poses em `fighterVisualConfig.combatPoses.powers` (`cast`, `channel`, `barrier`), com entrada no startup e volta na recuperação. Sons sintetizados em `audioConfig.sounds` (carga, onda, puxão, impacto, raio, barreira, resistido, absorvido). A HUD pisca o medidor quando a rejeição vem com `attackType: 'power'`. A lista de golpes (aberta pela pausa, que recebe `rules`) mostra os poderes do alinhamento quando eles estão ligados.
- **Entrada.** Teclado `U` (preset de setas: `N`; 2 Jogadores: J1 `R`, J2 `O`/Numpad6), gamepad RT, botão de toque `Poder` (só aparece quando o `DuelState` chama `touch.setFeatures(['powers'])`). `POWER` está em `remappableActions`; o `IntentRecorder` grava `power` e `powerHeld` no fim da lista de flags.

## História, secretos e personalização

Arquivos: [src/modes/story/](src/modes/story/), [src/config/storyConfig.js](src/config/storyConfig.js), [src/config/storyTexts.js](src/config/storyTexts.js), [src/states/StoryState.js](src/states/StoryState.js), [src/states/IntroState.js](src/states/IntroState.js), [src/characters/skins.js](src/characters/skins.js).

### Campanha

Regras em [GAME_DESIGN.md](GAME_DESIGN.md) (seção 23).

- **Dados.** `storyConfig` guarda regras (pontos, tetos, totais, regras do duelo, `roundsToWin`), opções do protagonista e a lista de encontros (`id`, `opponent`, `arena`, `aiOffset`, `next` ou `outcomes`, `reward`, `unlocks`, `ending`). `storyTexts` guarda títulos e falas por encontro e final. Fala: `{ speaker: 'protagonist' | 'narrator' | idDoPersonagem, text: string | { light, dark } }`.
- **Campanha pura.** `storyRun.js` trabalha sobre um objeto simples salvo no save (`run`): protagonista (nome, alinhamento, estilo, cor, notas), dificuldade, encontro atual, pontos, espaços de poder liberados, encontros vencidos e final. `resolveStoryResult(run, duelResult, config, loadouts)` devolve o novo `run`, o final e os personagens liberados; a rota usa `evaluateCondition` sobre `{ result, run }`. Nada lê o `Fighter`: a condição de vida vem do `DuelResult`.
- **Protagonista.** `createProtagonistCharacter(perfil, storyConfig, espaços)` monta um objeto de personagem com o arquétipo, golpes, som e aparência base do estilo escolhido, sobrepondo `storyConfig.protagonist.appearance` e a cor da lâmina. `createFighterFromCharacter` (a factory agora aceita um objeto, não só um id) cria o lutador; `powerSlots` filtra o loadout do alinhamento. O protagonista usa a mesma escala do elenco (até 7); teto e total por dificuldade ficam em `storyConfig.ratingCaps` e `budgets`, e `sanitizeStoryRun` rejeita notas acima do maior teto.
- **Fluxo de telas.** Menu → `StoryState` → (`ProtagonistState` criar → atributos) → `DialogueState` (antes, com a arena) → `DuelState` (`DuelMode.STORY`, `params.story`, `params.rules = storyConfig.rules`). O `DuelState` usa `storyStage` como mais um degrau da "escada" (adversário, arena, dificuldade) e cria o jogador a partir do protagonista. No resultado, `resolveDuelOutcome` desvia para `resolveStoryOutcome`: na vitória, empilha `DialogueState` (falas de depois, final e desbloqueios) que leva de volta ao `StoryState`, e devolve `story` (novo `run`) e `progress.unlockedCharacters`; na derrota, `GameOverState` com "Tentar de novo" e "Voltar à história" (`menuState`). A pausa sai para a História (`quitState`) e a lista de golpes recebe o personagem gerado.
- **Save.** `Game.story` vem de `loadStory` + `sanitizeStoryRun` e é salvo junto com as opções (`saveSettings` grava `{ version: 5, settings, story }`). A migração 2 → 3 acrescenta `story: null`; 3 → 4 acrescenta `protagonist.skin` (base) sem perder progresso; 4 → 5 converte as notas do protagonista para a escala 7/8/9/10 pela regra de `legacyRatings` (limitadas ao teto novo da dificuldade da campanha) e os pontos livres pelo mesmo fator (`⌊pontos × 0,75 + 0,5⌋`); campanha, final, espaços, skin e opções ficam iguais.

### Conteúdo, personagens secretos e intro

- **Campanha completa.** Oito encontros lineares e um secreto em `storyConfig.encounters`. A Vespa (capítulo 3) dá `reward.powers` (libera o segundo poder do alinhamento). O Soberano tem `unlocks: ['sovereign']` e `outcomes`: `healthRatioAbove 0.75` leva ao encontro `foretold`; senão, final `normal`. O Predestinado termina no final `secret` e libera `foretold`.
- **Personagens.** `sovereign` e `foretold` são dados comuns em `characterData` com `selectable: false` e `secret: true`, reaproveitando arquétipo e golpes da Haste e do Eco (sem tuning novo de golpes), com notas, alinhamento, aparência e perfis de IA próprios (`aiConfig.profiles.sovereign/foretold`). Secretos têm `potential` (+1 Ancião, +2 Soberano, +3 Predestinado): `getRatingLimit` usa `maxRating + potential` para todos os atributos (7 sem potencial; 8, 9 e 10 com ele). `stats.potential` chega às barras (segmentos extras em dourado). O encontro `foretold` fixa `difficulty: 'boss'`; finais aceitam `conditionalUnlocks` (o Ancião no Caminho da Aurora). A recompensa `wardrobe` dos segredos chama `unlockAllSkins`, e a intro tem áreas de toque por nome (`introConfig.tapAreas`). A `CharacterSelectState` monta `rosterIds` (só `selectable`, usado pelo Arcade) e `characterIds` (roster + secretos em `settings.unlockedCharacters`).
- **Intro e segredo.** `Game.start` abre o `IntroState`. A cada passo ele transforma o input em tokens (`key:<code>` pelo `input.lastPressedCode`, `action:<ação>` para as ações vigiadas, `tap:title` para toques no título) e alimenta o `SecretUnlockSystem`. Cada sequência só considera tokens do próprio tipo, então as setas (que geram tecla e ação) não atrapalham uma à outra. Ao casar, a recompensa de `secretsConfig.rewards` entra em `settings.unlockedCharacters`, é salva, toca `SoundName.SECRET` e mostra a frase. O som funciona porque o próprio toque de tecla é o gesto que libera o `AudioContext`. O `TouchInput` não mostra o botão de voltar na intro.

### Skins e personalização

- `characterData.skins` e `storyConfig.protagonist.skins` descrevem paleta e peças existentes. `resolveAppearance` copia a base e aplica somente campos cosméticos permitidos. A factory aceita `{ skin, saberColor }`, nessa ordem; stats e replay continuam independentes do visual.
- `getSkinOptions` reutiliza `settings.unlocks[character.id]` com ids `skin-arcade`, `skin-story` e `skin-secret`, separados das cores. Saves antigos com `arcadeCleared` também liberam Viajante. `unlockProgressSkins` e `addUnlocks` acumulam recompensas sem duplicatas; `duelOutcomes` aplica Arcade ao vencedor e finais ao elenco, mais secretos no final secreto.
- A seleção filtra bloqueadas, mostra requisitos e guarda escolhas confirmadas por lado, mesmo com personagens iguais. `playerSkin`/`opponentSkin` seguem params e escadas; pausa, revanche e próxima luta reutilizam esses dados. A prévia conserva cor e skin ao mudar uma delas e ao voltar.
- A criação tem Nome, Caminho, Estilo, Visual, Cor e Dificuldade. `Game.createTextPrompt` injeta documento, host e limites do canvas no helper de core; o estado apenas consome valor e envio. O input intercepta teclas, respeita composição e sai ao mudar de passo ou estado. O resize reposiciona o campo. Nenhum estado acessa DOM. `sanitizeStoryRun` valida a skin e retorna base para ids desconhecidos.

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

O equilíbrio depende da dificuldade, e isso foi aceito na v1.0: personagens de execução e leitura (Vespa, Espelho, Brasa, Garça) rendem mais com a IA Difícil, que completa sequências e apara melhor; os de força bruta (Bastião, Sombra, Haste) rendem mais com a Normal. Na média das duas dificuldades todos ficam entre 45% e 57%. A IA Normal apara com `parryChance` 0,38 e a Difícil com 0,5 para não ampliar essa diferença. Para reproduzir: `npm run matrix` (padrão: Normal e Difícil, 60 duelos por par; `--difficulties`, `--duels`, `--characters a,b,c` e `--rules powers` mudam isso). Ele roda o `simulate` para cada par, sem `--profile`.

A Vespa é o personagem de execução: rende pouco com a IA Normal (que completa só 60% das sequências) e fica equilibrada no Difícil. Isso é intencional (dificuldade 4 no GAME_DESIGN). Rode a matriz de novo depois de mexer em atributos.

Nenhum timeout nos seis cenários. Com ambos balanced, Difícil vence Normal 98,7% e Normal vence Fácil 99,3%. Os perfis próprios também medem a vantagem tática do perfil equilibrado sobre o agressivo, não apenas atributos.
- O trail e a luz do sabre no corpo são só do render (`SaberTrail`, `drawSaberBodyLight`). O trail usa o tempo da simulação (`fighter.animation.time`), então a pausa congela o rastro.

---

Sequências: o combate marca `attackConnected` apenas em hit ou bloqueio (inclui quebra de guarda). `tryAttackChain` lê um rápido no buffer durante recovery e procura o próximo golpe declarado em `cancelsInto`. Cada passo cobra stamina, reinicia stateTime/hasHit/lunge e emite attackStart; whiff/parry/clash não confirmam a rota. Guardião tem dois passos, Sombra três. As poses existentes de rápido são reutilizadas; o Treino identifica Rápido 2/3.

`tryAirAttack` aceita rápido/forte no estado JUMPING uma vez por pulo (`airAttackUsed`, rearmado no chão). O move air usa gravidade e velocidade horizontal existentes; MovementSystem não aplica atrito de ação no ar. Forte + intent à frente escolhe forwardHeavy, com startup/custo/recovery/lunge próprios. `isHeavyAttack` inclui o avanço para áudio e parry da IA. Não há knockback vertical nem cancels aéreos.

### Matriz v1.6 (poderes ligados)

`npm run matrix -- --rules powers`: Normal e Difícil, perfis próprios, seed 1, 60 duelos por par ordenado. É o que o jogador enfrenta em Duelar com poderes. Sem `--rules powers` a matriz continua idêntica à v1.3/v1.4 (a IA não consome o RNG com poderes desligados).

| Normal v1.6 | Gua | Som | Bas | Ves | Esp | Has | Bra | For | Gar | Eco | média |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Guardião | — | 53 | 23 | 70 | 50 | 25 | 45 | 32 | 67 | 35 | 44,4 |
| Sombra | 45 | — | 40 | 68 | 60 | 52 | 68 | 57 | 82 | 62 | 59,3 |
| Bastião | 82 | 53 | — | 68 | 73 | 45 | 82 | 55 | 75 | 67 | 66,7 |
| Vespa | 35 | 22 | 27 | — | 48 | 33 | 40 | 38 | 45 | 45 | 37,0 |
| Espelho | 45 | 32 | 18 | 50 | — | 23 | 50 | 32 | 55 | 43 | 38,7 |
| Haste | 80 | 33 | 53 | 70 | 80 | — | 62 | 62 | 75 | 68 | 64,8 |
| Brasa | 55 | 35 | 23 | 60 | 53 | 18 | — | 30 | 48 | 42 | 40,5 |
| Forja | 63 | 35 | 55 | 53 | 70 | 37 | 70 | — | 60 | 47 | 54,4 |
| Garça | 38 | 13 | 33 | 57 | 63 | 28 | 60 | 23 | — | 27 | 38,1 |
| Eco | 62 | 40 | 42 | 48 | 70 | 32 | 63 | 47 | 62 | — | 51,7 |

| Difícil v1.6 | Gua | Som | Bas | Ves | Esp | Has | Bra | For | Gar | Eco | média |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Guardião | — | 67 | 50 | 63 | 45 | 32 | 45 | 53 | 53 | 55 | 51,5 |
| Sombra | 33 | — | 55 | 27 | 50 | 62 | 25 | 45 | 53 | 45 | 43,9 |
| Bastião | 57 | 50 | — | 25 | 23 | 35 | 25 | 40 | 40 | 30 | 36,1 |
| Vespa | 40 | 57 | 67 | — | 53 | 77 | 28 | 75 | 70 | 60 | 58,5 |
| Espelho | 63 | 55 | 68 | 42 | — | 60 | 35 | 55 | 50 | 53 | 53,5 |
| Haste | 78 | 33 | 62 | 22 | 42 | — | 40 | 52 | 30 | 32 | 43,3 |
| Brasa | 70 | 77 | 57 | 67 | 52 | 58 | — | 55 | 60 | 75 | 63,3 |
| Forja | 55 | 35 | 73 | 38 | 42 | 50 | 42 | — | 38 | 42 | 46,1 |
| Garça | 55 | 42 | 75 | 42 | 62 | 68 | 45 | 57 | — | 42 | 54,1 |
| Eco | 47 | 43 | 63 | 40 | 40 | 75 | 33 | 53 | 62 | — | 50,7 |

| Média das duas | Gua | Som | Bas | Ves | Esp | Has | Bra | For | Gar | Eco |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| % | 48 | 52 | 51 | 48 | 46 | 54 | 52 | 50 | 46 | 51 |

Na média das duas dificuldades todos ficam entre 46% e 54% (no clássico, 45–57%). A diferença por dificuldade continua: no Normal os fortes de lâmina (Bastião, Haste) seguem na frente; no Difícil a IA apara e usa Barreira/guarda melhor, e Brasa e Vespa sobem. A Vespa (Fluxo 4) cai no Normal porque os poderes alheios a alcançam de longe. Nenhum atributo foi mexido para isso; ajustes futuros devem começar por `aiConfig.perception.powerUse`, `powerChance` e os custos em `powersConfig`.

### Secretos contra o elenco (v1.9)

`simulate --rules powers`, 40 duelos por par, % de vitória do secreto contra cada personagem.

| Secreto | Dificuldade | Gua | Som | Bas | Ves | Esp | Has | Bra | For | Gar | Eco | média |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Soberano | Normal | 65 | 35 | 75 | 42 | 82 | 67 | 67 | 62 | 65 | 62 | 62,5 |
| Soberano | Difícil | 72 | 77 | 90 | 25 | 45 | 82 | 62 | 60 | 42 | 47 | 60,5 |
| Predestinado | Normal | 52 | 42 | 52 | 50 | 82 | 65 | 67 | 62 | 67 | 55 | 59,8 |
| Predestinado | Difícil | 47 | 60 | 62 | 50 | 52 | 75 | 42 | 77 | 62 | 62 | 59,2 |

Protagonista no teto de cada dificuldade contra o Soberano (`simulate --left protagonist:<dificuldade>:<alinhamento>:<estilo> --right sovereign --rules powers`, 60 duelos; o simulador distribui os pontos até o total da dificuldade, priorizando Fluxo, Lâmina e Vida). A IA do Soberano usa a mesma dificuldade, como na História:

| Dificuldade | Aurora | Eclipse |
| --- | --- | --- |
| Fácil | 35% | 28% |
| Normal | 25% | 38% |
| Difícil | 33% | 37% |

O chefe final vence a IA pilotando o protagonista em cerca de dois terços dos duelos em todas as dificuldades: difícil, mas vencível. No Difícil os poderes do protagonista são resistidos (Fluxo 6 contra 9) e a luta é de lâmina, como planejado.

Alvo: fortes, mas vencíveis (cerca de 60%). Com base no Espelho, o Soberano dependia demais de parry (53% no Normal, 84% no Difícil); a base da Haste deixou as duas dificuldades parecidas.

### Escala 7/8/9/10 (v1.12)

**Elenco comum inalterado.** A saída completa do simulador (todas as estatísticas, 20 duelos, seed 1) ficou idêntica byte a byte em 440 cenários: todos os pares do elenco e do chefe do Arcade, Normal e Difícil, com e sem poderes. `npm run matrix` e `npm run matrix -- --rules powers` reproduzem célula a célula as matrizes v1.4 (clássica) e v1.6 (com poderes).

**Secretos contra o elenco** (`simulate --rules powers`, 40 duelos por par, % de vitória do secreto; o Ancião caiu de Lâmina 7 para 6 para ficar abaixo do Soberano):

| Secreto | Notas | Normal | Difícil | média |
| --- | --- | --- | --- | --- |
| Ancião | 6/6/6/8/7/8 | 64,3 | 79,3 | 71,8 |
| Soberano | 7/6/6/6/4/9 | 77,0 | 75,3 | 76,2 |
| Predestinado | 8/8/9/7/9/10 | 83,8 | 83,3 | 83,5 |

**Curva dos chefes da História.** A IA que pilota o protagonista pesa mais que os atributos: no Fácil, um piloto Fácil perde 90% para o Soberano Fácil, e um piloto Normal vence 90%. Por isso a curva é medida com três pilotos: do mesmo nível da dificuldade (o método da v1.9), Normal fixo e Difícil fixo (aproximações de um jogador mediano e de um bom jogador). O protagonista sobe até o teto e o total da dificuldade (prioridade Fluxo, Lâmina, Vida); média dos dois alinhamentos × três estilos, 60 duelos cada (360 por célula). O Soberano usa a IA da dificuldade da campanha; o Predestinado, sempre a IA de chefe. Comando: `simulate --rules powers --left protagonist:<dif>:<alinhamento>:<estilo> --right sovereign --leftDifficulty <piloto> --rightDifficulty <dif>`.

| % de vitória do protagonista | Piloto | Fácil | Normal | Difícil |
| --- | --- | --- | --- | --- |
| contra o Soberano | mesmo nível | 17,2 | 35,8 | 37,8 |
| contra o Soberano | Normal | 90,8 | 35,8 | 8,1 |
| contra o Soberano | Difícil | 97,2 | 72,2 | 37,8 |
| contra o Predestinado | mesmo nível | 0,0 | 1,4 | 23,9 |
| contra o Predestinado | Normal | 5,0 | 1,4 | 3,6 |
| contra o Predestinado | Difícil | 38,1 | 27,0 | 23,9 |

Antes da v1.12 (mesma bateria, 40 duelos): Soberano com piloto do mesmo nível 14,6 / 26,3 / 28,8 e Predestinado com piloto Difícil (só medido no Difícil) 27,5. Os tetos e totais novos (7/33, 6/30, 5/28) deixam o Soberano vencível em todas as dificuldades e o Predestinado muito difícil, mas possível: um bom jogador vence de um quarto a um terço das tentativas; um mediano, raramente. No Fácil, o piloto Fácil (que avisa os golpes e reage devagar) não representa o jogador; a faixa relevante ali é a do piloto Normal.

### Movimento aéreo (v1.13)

`npm run matrix` e `npm run matrix -- --rules powers` (Normal e Difícil, perfis próprios, seed 1, 60 duelos por par ordenado). O movimento novo vale para todos, então esta passa a ser a referência do modo clássico. **Todas as médias do clássico ficam dentro de ±5 pontos da v1.0** (maior desvio: Sombra no Difícil, +4,5). Sem o `aerialWeight` dos perfis, Espelho (Normal, +6,4), Haste (Normal, −6,5), Forja (Difícil, −6,4) e Garça (Difícil, −5,9) saíam da faixa; medindo cada alavanca isolada, o pulo de movimento e o dash aéreo eram o que derrubava os lutadores de chão.

| Normal v1.13 | Gua | Som | Bas | Ves | Esp | Has | Bra | For | Gar | Eco | média | delta v1.0 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Guardião | — | 42 | 27 | 52 | 57 | 37 | 50 | 48 | 68 | 57 | 48,5 | +0,2 |
| Sombra | 53 | — | 55 | 70 | 72 | 57 | 73 | 52 | 70 | 62 | 62,6 | -2,2 |
| Bastião | 73 | 47 | — | 77 | 65 | 50 | 85 | 62 | 68 | 60 | 65,2 | +1,1 |
| Vespa | 37 | 38 | 33 | — | 40 | 30 | 70 | 52 | 53 | 60 | 45,9 | -1,5 |
| Espelho | 48 | 27 | 28 | 42 | — | 10 | 45 | 22 | 42 | 30 | 32,6 | +2,0 |
| Haste | 67 | 35 | 55 | 57 | 87 | — | 70 | 60 | 63 | 73 | 63,0 | -3,3 |
| Brasa | 42 | 45 | 33 | 48 | 43 | 33 | — | 23 | 33 | 27 | 36,5 | -1,6 |
| Forja | 55 | 37 | 37 | 43 | 65 | 48 | 73 | — | 67 | 63 | 54,3 | -0,9 |
| Garça | 35 | 33 | 30 | 42 | 67 | 12 | 52 | 50 | — | 43 | 40,4 | -0,4 |
| Eco | 40 | 37 | 42 | 47 | 63 | 33 | 53 | 53 | 43 | — | 45,7 | -2,1 |

| Difícil v1.13 | Gua | Som | Bas | Ves | Esp | Has | Bra | For | Gar | Eco | média | delta v1.0 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Guardião | — | 68 | 47 | 67 | 38 | 30 | 50 | 47 | 52 | 63 | 51,3 | -1,5 |
| Sombra | 20 | — | 60 | 25 | 33 | 57 | 38 | 47 | 40 | 55 | 41,7 | +4,5 |
| Bastião | 53 | 47 | — | 32 | 17 | 27 | 40 | 43 | 35 | 42 | 37,2 | -2,1 |
| Vespa | 35 | 68 | 75 | — | 45 | 83 | 50 | 75 | 80 | 67 | 64,3 | -2,0 |
| Espelho | 53 | 70 | 92 | 40 | — | 75 | 43 | 60 | 55 | 75 | 62,6 | +2,6 |
| Haste | 72 | 32 | 63 | 23 | 30 | — | 50 | 30 | 23 | 30 | 39,3 | +2,3 |
| Brasa | 58 | 58 | 63 | 53 | 50 | 47 | — | 50 | 52 | 77 | 56,5 | -3,9 |
| Forja | 42 | 58 | 45 | 23 | 22 | 58 | 47 | — | 37 | 57 | 43,2 | -3,6 |
| Garça | 50 | 68 | 72 | 37 | 45 | 65 | 58 | 62 | — | 63 | 57,8 | -2,9 |
| Eco | 30 | 50 | 55 | 40 | 30 | 65 | 28 | 55 | 33 | — | 43,0 | +0,6 |

| Normal v1.13, poderes | Gua | Som | Bas | Ves | Esp | Has | Bra | For | Gar | Eco | média |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Guardião | — | 30 | 38 | 43 | 48 | 45 | 55 | 22 | 52 | 38 | 41,3 |
| Sombra | 63 | — | 38 | 77 | 72 | 57 | 65 | 48 | 77 | 67 | 62,6 |
| Bastião | 72 | 57 | — | 72 | 70 | 45 | 63 | 62 | 75 | 58 | 63,7 |
| Vespa | 28 | 22 | 32 | — | 55 | 28 | 30 | 52 | 63 | 43 | 39,3 |
| Espelho | 38 | 28 | 30 | 47 | — | 30 | 47 | 23 | 40 | 22 | 33,9 |
| Haste | 77 | 42 | 52 | 62 | 85 | — | 67 | 55 | 80 | 72 | 65,6 |
| Brasa | 47 | 37 | 20 | 48 | 47 | 25 | — | 33 | 42 | 48 | 38,5 |
| Forja | 68 | 48 | 43 | 40 | 87 | 35 | 67 | — | 67 | 48 | 55,9 |
| Garça | 52 | 22 | 25 | 38 | 55 | 20 | 55 | 40 | — | 30 | 37,4 |
| Eco | 55 | 43 | 45 | 57 | 70 | 28 | 68 | 40 | 75 | — | 53,5 |

| Difícil v1.13, poderes | Gua | Som | Bas | Ves | Esp | Has | Bra | For | Gar | Eco | média |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Guardião | — | 58 | 52 | 57 | 42 | 28 | 50 | 42 | 55 | 55 | 48,7 |
| Sombra | 37 | — | 62 | 52 | 47 | 53 | 25 | 53 | 52 | 57 | 48,5 |
| Bastião | 52 | 47 | — | 22 | 22 | 17 | 23 | 30 | 33 | 27 | 30,2 |
| Vespa | 38 | 50 | 78 | — | 57 | 70 | 35 | 77 | 62 | 63 | 58,9 |
| Espelho | 58 | 55 | 75 | 55 | — | 60 | 40 | 58 | 45 | 53 | 55,5 |
| Haste | 65 | 35 | 82 | 27 | 30 | — | 52 | 52 | 53 | 25 | 46,7 |
| Brasa | 62 | 67 | 72 | 62 | 60 | 62 | — | 58 | 57 | 63 | 62,4 |
| Forja | 65 | 42 | 67 | 27 | 40 | 58 | 42 | — | 47 | 48 | 48,3 |
| Garça | 30 | 47 | 62 | 35 | 42 | 52 | 42 | 67 | — | 52 | 47,4 |
| Eco | 47 | 47 | 68 | 50 | 45 | 75 | 27 | 57 | 58 | — | 52,6 |

| Média das duas, poderes | Gua | Som | Bas | Ves | Esp | Has | Bra | For | Gar | Eco |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| % | 45 | 56 | 47 | 49 | 45 | 56 | 50 | 52 | 42 | 53 |

Com poderes, a média das duas dificuldades foi de 46–54% (v1.6) para 42–56%. O modificador aéreo quase não pesa nisso (zerá-lo muda as linhas da Garça e da Haste dentro do ruído); o desvio vem do movimento novo em geral. Como as etapas v1.14–v1.18 refazem as interações e os loadouts, o ajuste da matriz com poderes fica para a v1.19. Uso medido (Guardião × Sombra, 60 duelos): Normal 0,07 pulo e 0,00 dash aéreo por duelo; Difícil 0,43 e 0,05.

Secretos e chefes depois do movimento novo (40 duelos): Ancião 61,5/77,3, Soberano 76,0/74,0, Predestinado 78,3/80,8 contra o elenco (a ordem se mantém); protagonista contra o Soberano com piloto do mesmo nível 14,6/32,9/26,7 e contra o Predestinado com piloto Difícil 37,5/27,1/21,3.

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
- **IA por personagem**: cada personagem tem um perfil em `aiConfig.profiles` (mesmo id do personagem; os perfis genéricos `aggressive`, `defensive` e `balanced` continuam para testes e para `simulate --profile`). O perfil traz pesos (`attackChance`, `blockChance`, `specialChance`...), distância (`preferredGap`, `closeGapRatio`), `chargeHold` (quanto segurar uma habilidade de carga) e `priorities`: a ordem dos passos de `decide()` (`defend`, `counter`, `shove`, `recover`, `special`, `power`, `attack`, `guard`, `position`). O primeiro passo que devolve uma decisão vence; `position` não devolve nada quando a distância já está boa.
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

IA de poderes (v1.6): a `EnemyAI` recebe `rules` e só pensa em poderes com `rules.powers`; sem a regra, nenhum passo novo consome o RNG, então o duelo clássico fica idêntico. O passo `power` (depois de `special` nas `priorities` de todos os perfis) testa os espaços `forward` e `neutral` do loadout (a Barreira é só defensiva): precisa de recarga zerada, medidor para o custo (mais uma reserva de canal, `perception.powerChannelReserve`), alcance, o oponente fora da guarda, distância dentro de `perception.powerUse[efeito]` (Repulsão de perto, Raio a meia distância, Puxão de longe) e, com `difficulty.powerAware`, uma faixa de interação com escala maior que zero (o Fácil não sabe disso e gasta medidor à toa). A chance é `profile.powerChance` (ou `perception.powerChance`) × `difficulty.powerMultiplier`. `startPower` aponta o `moveX` para o espaço escolhido e segura `powerHeld` por `plan.powerHoldTime` (Raio: sorteio em `perception.lightningHold`). Na defesa, `tryDefendPower` roda antes da ameaça de lâmina: contra um poder do oponente que alcança, com a chance de bloqueio do perfil, levanta a Barreira (se tiver, com `perception.barrierPreference`) ou segura a guarda até o fim do poder. Contra golpes de lâmina, a Barreira também entra com `perception.barrierVsSaberChance`.

IA EVADE: getTimeUntilAttackActive expõe startup restante, zero no active ainda não conectado e Infinity fora da ameaça. No pensamento de defesa, a rolagem já existente escolhe EVADE por evadeChance e evadeWeight do perfil, somente contra active. evadeTimingJitter agenda atraso; a cada passo o plano valida se aquele golpe ainda existe e solicita intent.evade uma vez. Nenhuma mutação no lutador. Fora de blockstun, EVADE também pode sair de BLOCKING. Chances iniciais pequenas preservam o combate clássico; calibração final pela matriz.

IA de movimento só pede intent.jump: inicia o salto ao aproximar/recuar/recuperar stamina com maxJumps > 1 e tenta o segundo a partir do ápice, respeitando jumpsUsed. Desde a v1.13 a IA recebe `arena` (DuelState e simulador) para saber quando está no canto (`perception.cornerMargin` atrás dela): `tryCornerJump` pula na direção do oponente com `difficulty.cornerJumpChance`, e `tryAirDash` (decisão `airDash`, depois do pulo aéreo) pede `intent.dodge` no ar quando está acima do oponente (`airDashClearance` da altura dele) e perto (`airDashCrossGap`), para cruzar, ou quando está no canto. As três chances de movimento aéreo (`jumpChance`, `cornerJumpChance`, `airDashChance`) são multiplicadas por `profile.aerialWeight`: 0,3 nos pesados (Bastião, Haste, Forja, Soberano), 1 nos acrobatas (Vespa, Garça, Eco, Ancião, Predestinado) e 0,6 no resto. O peso existe porque, com todo o elenco pulando, Haste e Forja (lutadores de chão) perdiam mais de 5 pontos na matriz clássica. O simulador usa os mesmos controllers/sistemas e agora informa pulos, pulos aéreos, tentativas e sucessos de EVADE. --set evade.enabled=false permite comparar sem EVADE, sem criar rules.

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

## Testabilidade

Testes rodam em Node (`npm test`), sem navegador. Por isso:

- Módulos de lógica (`states/`, `modes/`, `characters/`, `controllers/`, `entities/`, `combat/`, `simulation/`, `systems/`, `ai/`, `config/`, `utils/`) **não** acessam `window`, `document` ou canvas. Estados e `rendering/` desenham só pela API do `Renderer` recebido.
- Quando um módulo do core precisa do navegador (`Input`, `TouchInput`, `GameLoop`, `textPrompt`), a dependência é injetada.
- `computePose` é uma função pura e também é testada.

Testes atuais: 470 testes em `tests/`, um arquivo por área (loop, input e toque, estados e modos, combate, especiais, EVADE, atributos, Fluxo e poderes, IA, simulação, replay, áudio, efeitos, UI, desbloqueios e skins, Arcade, Sobrevivência, História, segredos, remapeamento, save). `tests/states.test.js` cobre o fluxo de telas; `goToMenuItem(game, id)` navega no menu pelo id, sem depender da posição dos itens. Utilitários compartilhados ficam em `tests/helpers.js` (`createSimulation`, `spawnFighter`...).

---

## Dependências entre módulos

```
core/Game     → core, states/stateFactory, config, utils
modes         → combat (fases e eventos), states/stateIds e duelModes (rotas de resultado), ui/formatText, utils (RNG com seed)
modes/story   → nenhuma dependência de Fighter: lê DuelResult, config e loadouts
states        → states/stateIds, modes, simulation, combat, ai, audio, controllers, characters, entities, rendering, ui, config
ui            → config, utils
ai            → combat (fases), entities (estados), systems/StaminaSystem (canAfford), config
audio         → combat (eventos, fases), config, utils
tools/simulate → characters (inclui protagonista), simulation, ai, config (sem navegador)
simulation    → systems, combat, controllers/IntentRecorder (codificação dos intents do replay)
systems/EffectsSystem → combat (tipos de evento), core/Camera (via construtor), config, utils
characters    → entities, config
controllers   → config
systems / combat / ai → entities, config, utils (combat também usa StaminaSystem; a IA lê PowerSystem e flowInteractions só para decidir)
rendering     → config, utils, entities, combat/attackPhases, PowerSystem e flowInteractions (só leitura)
entities      → config, utils
core (resto)  → config, utils (saveStorage usa legacyRatings na migração v4 → v5)
```

Evitar dependências circulares.

---

## v2: princípios e decisões

Roteiro, tarefas e validações em [versions/v2.md](versions/v2.md). O detalhe de cada sistema está nas seções acima (Input, Combat, Fluxo e poderes, História, Balanceamento, AI).

**Princípios.** Tudo que muda o resultado de uma luta roda dentro da `DuelSimulation` com o dt fixo, guarda estado em `fighter.combat` (copiado inteiro pelo snapshot do replay) ou em campos do `Fighter` cobertos pelo teste de snapshot, e é configurado em `src/config/`. Game, Renderer, Audio, Effects e Input não contêm regra de gameplay. Os modos clássicos (Arcade, Sobrevivência, Tutorial, Desafio) recebem `rules` padrão e ficam idênticos à v1.0; a matriz sem poderes continua igual à v1.3.

**Refactors da v1.1.** `Input` com fontes (teclado, gamepad, toque); save versionado com migrações (hoje v5: `{ version, settings, story }`); `DuelResult` e `duelOutcomes` fora do `DuelState`; teste que falha se um campo mutável do `Fighter` ficar fora do `captureFighter`; DPR limitado e tempos de update/render no F3.

**Decisões.**

- **Atributos** (escala 7/8/9/10: elenco até 7, secretos até 7 + `potential`) são a única fonte dos stats escalares; o arquétipo continua dono de tempos, golpes e traços. Tier do Fluxo: azul até 7, roxo 8–9, vermelho só no 10.
- **Fluxo**: `flowLevel` (permanente) define potência, ganho do medidor, resistência e tier visual; `flowMeter` é o recurso da luta; `stamina` continua o recurso físico.
- **Interações**: `flowDifference = quem lança − alvo`; uma tabela de faixas por habilidade, cada faixa com modificadores (escala, guarda, dano e deslize na guarda, duração, stagger); um resolvedor puro, sem `if` por poder; falha só por limiar.
- **Poderes** têm fases como os golpes, são pagos com `flowMeter` e não têm projétil. Estados `CASTING` e `CHANNELING`.
- **EVADE** fica no "baixo" (S/↓, direcional, joystick); o Shift continua o dash. **Pulo duplo** por `movement.maxJumps`.
- **Rotas e finais** são dados avaliados por um registro de condições contra o `DuelResult`.
- **Protagonista** é dado gerado do save e entra em `createFighterFromCharacter`; sem sistema de animação novo.
- **Skins** são overrides parciais de `appearance`, sem efeito em stats; a escolha fica nos params e no save.
- **Segredo**: sequências de tokens (`key:`, `action:`, `tap:`) em `secretsConfig`; o próprio input libera o áudio.

**Orçamento de desempenho (alvo mobile).** Update ≤ 2 ms e render ≤ 10 ms por frame em celular intermediário. Partículas dos poderes usam o pool atual; raio com no máximo 2 polilinhas de cerca de 10 segmentos; luzes em sprites de glow em cache por cor; nada de `shadowBlur`, `filter` ou gradiente criado por frame; DPR limitado por config; áudio sintetizado.

**Medição (v1.x final).** Chrome 154.0.8037.98 headless no Windows, aceleração padrão, CPU via `Emulation.setCPUThrottlingRate` (4×/6×). Viewport 844×390, DPR emulado 3 limitado a 2 (canvas 1386×780). Sombra lançando Raio contra a Barreira do Guardião no Santuário, incluindo reflexos, partículas e F3 ligado. Canais mantidos ativos e medidor reposto somente pelo cenário de teste, sem alteração das regras do jogo.

11 s por cenário, cerca de 650 frames; aquecimento de 120 frames. Médias do `GameLoop.timings`, com a janela normal de 60 frames do F3: 9 janelas por caso (10 em 4× reduzido). Máximo na tabela é a maior média de janela, não o pior frame isolado; FPS é a leitura final do overlay. Detalhes em [versions/v2.md](versions/v2.md).

| CPU | Efeitos | Update médio / máximo | Render médio / máximo | FPS observado |
| --- | --- | --- | --- | --- |
| 4× | completos | 0,51 / 0,58 ms | 5,09 / 5,69 ms | 60,3 |
| 4× | reduzidos | 0,51 / 0,64 ms | 4,90 / 5,91 ms | 59,7 |
| 6× | completos | 0,68 / 0,80 ms | 7,56 / 9,10 ms | 60,5 |
| 6× | reduzidos | 0,62 / 0,79 ms | 7,32 / 8,90 ms | 60,7 |

Update e render dentro do alvo em todas as janelas. Sem mudanças de visual ou otimizações adicionais. A medição usa aceleração padrão: a tentativa com GPU desabilitada não representa o alvo mobile. Validação em hardware Android/iOS continua com o autor.

---

---

## Convenções de código

- Um módulo por arquivo. Classes em `PascalCase.js`, o resto em `camelCase.js`.
- Somente `export` nomeado (sem `export default`).
- Imports sempre com extensão `.js`.
- **Sem comentários no código.** Nomes claros substituem comentários. Contexto e decisões ficam neste documento.
- Evitar criar objetos dentro do loop sem necessidade.
- Listeners adicionados devem ter forma de remoção (`destroy()`).

