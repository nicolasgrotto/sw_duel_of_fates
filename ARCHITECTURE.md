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
    AssetManager.js         ⏳
    AudioManager.js         ⏳
  states/                   ✅ telas do jogo
    GameState.js            ✅ classe base
    stateIds.js             ✅ ids dos estados
    stateFactory.js         ✅ cria estados a partir do id
    MenuState.js            ✅
    DuelState.js            ✅
    PauseState.js           ✅
    GameOverState.js        ⏳
  characters/               ✅ dados e criação de personagens
    characterData.js        ✅ personagens: nome, arquétipo, aparência
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
    EffectsSystem.js        ✅ eventos de combate → faíscas, luzes de impacto, flash, shake
    ParticlePool.js         ✅ pool fixo de partículas
  combat/                   ✅ regras de combate
    CombatSystem.js         ✅ ações, timers, hits, bloqueio, quebra de guarda, morte, eventos
    attackPhases.js         ✅ tipos de ataque e fases (startup, active, recovery)
    hitboxes.js             ✅ hitbox, hurtbox, sobreposição, invulnerabilidade
    combatEvents.js         ✅ tipos e criação de eventos de combate
  simulation/               ✅
    DuelSimulation.js       ✅ ordem dos sistemas em um passo do duelo
  ai/                       ⏳ EnemyAI
  rendering/                ✅ desenho (só lê dados)
    DuelRenderer.js         ✅ ordem das camadas do duelo
    arenaRenderer.js        ✅ chão e limites
    fighterPose.js          ✅ calcula a pose a partir do estado e da animação
    fighterRenderer.js      ✅ silhueta do lutador e sombra
    saberRenderer.js        ✅ cabo, glows, núcleo, luz no chão e no corpo
    SaberTrail.js           ✅ rastro da lâmina na fase active
    effectsRenderer.js      ✅ partículas, luzes de impacto e flash
  config/                   ✅ valores e ajustes
    gameConfig.js           ✅ canvas, loop, arena, física, duelo, debug
    themeConfig.js          ✅ cores, estilos de texto, animação de UI
    controlsConfig.js       ✅ ações e teclas
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

O `DuelState` é dono do duelo: cria os lutadores, os controllers, a `DuelSimulation` e o `DuelRenderer`. Também cuida da pausa, do fim do duelo (resultado + `Enter` para o menu) e do boneco de treino (`F4` com debug ligado).

### Characters

Personagens são **dados**:

- `characterData.js`: id, nome, arquétipo e aparência (cores, capuz, capa, ângulo de guarda, tamanho da lâmina).
- `fightersConfig.js`: atributos de cada arquétipo (vida, stamina, tamanho do corpo, movimento).
- `characterFactory.createFighter(id, spawn)` junta os dois e cria um `Fighter`.

Trocar todos os personagens (ex.: versão com identidade própria) deve exigir apenas mudar dados e assets, nunca o combate. Para adicionar um personagem: adicione uma entrada em `characterData.js` e, se precisar de atributos novos, um arquétipo em `fightersConfig.js`.

### Controllers

Um controller escreve no `fighter.intent` o que o lutador **quer** fazer (`moveX`, `jump`, `lightAttack`, `heavyAttack`, `block`, `dodge`). Ele nunca altera posição, vida ou estado.

- `PlayerController`: lê o `Input`.
- `DummyController`: boneco de treino até a IA existir.
- `EnemyAI` (Fase 5): vai preencher o mesmo `intent`.

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

`DuelState.update`: pausa → controllers preenchem os intents → `DuelSimulation.step(dt)` → `EffectsSystem` consome os eventos → efeitos e `Camera` atualizam → verifica eventos de morte.

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
[câmera: translate(offset do shake)]
  arena → luz dos sabres no chão → corpos (sombra, capa, pernas, túnica, cabeça, braços)
  → luz dos sabres nos corpos → trails → sabres → luzes de impacto → faíscas
[fim da câmera]
flash (tela inteira, sem shake)
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

Para adicionar um estado: crie a classe estendendo `GameState`, adicione o id em `stateIds.js` e registre em `stateFactory.js`.

---

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

- `update`: termina estados que acabaram, começa ações a partir do `intent` (com custo de stamina) e aplica o lunge do ataque e a velocidade da esquiva.
- `resolveHits`: em duas etapas. Primeiro encontra **todos** os contatos (hitbox × hurtbox), depois aplica. Assim, dois golpes no mesmo frame acertam os dois lados (trade), sem depender da ordem da lista.
- Bloqueio só vale de frente. Sem stamina para bloquear, a guarda quebra (`STUNNED`).
- Na morte, escolhe a direção da queda: para trás se houver espaço até a parede, senão para a frente.
- Não desenha nada e não cria efeitos. Ele **emite eventos** (`hit`, `block`, `guardBreak`, `clash`, `death`) com atacante, defensor, tipo de ataque e ponto de contato. `events` é limpo a cada passo.
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
- O trail e a luz do sabre no corpo são só do render (`SaberTrail`, `drawSaberBodyLight`). O trail usa o tempo da simulação (`fighter.animation.time`), então a pausa congela o rastro.

---

## AI (planejado)

`EnemyAI` decide a próxima ação e a entrega ao `Fighter`, do mesmo jeito que o `Input` faz para o jogador.

```
EnemyAI → Action.LIGHT_ATTACK → Fighter → CombatSystem executa
```

`EnemyAI` nunca altera HP, stamina ou outros valores diretamente.

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
- Cores e estilos de texto ficam em `themeConfig.js` e espelham [design/VISUAL_SYSTEM.md](design/VISUAL_SYSTEM.md).
- Arquivos de config exportam objetos simples, sem lógica.

---

## Testabilidade

Testes rodam em Node (`npm test`), sem navegador. Por isso:

- Módulos de lógica (`states/`, `characters/`, `controllers/`, `entities/`, `combat/`, `simulation/`, `systems/`, `ai/`, `config/`, `utils/`) **não** acessam `window`, `document` ou canvas. Estados e `rendering/` desenham só pela API do `Renderer` recebido.
- Quando um módulo do core precisa do navegador (`Input`, `GameLoop`), a dependência é injetada.
- `computePose` é uma função pura e também é testada.

Testes atuais: `gameLoop`, `input`, `stateMachine`, `states` (fluxo de telas, fim do duelo, boneco, debug de hitbox), `debug`, `math`, `fighter`, `playerController`, `dummyController`, `movement`, `physics` (inclui colisão), `animation` (inclui poses de combate), `combatActions` (ações, timers, stamina) e `combatHits` (hits, bloqueio, quebra de guarda, esquiva, morte, trade, clash), `effects` (RNG, pool, câmera, efeitos por evento, limites) e `saberTrail`. Utilitários compartilhados ficam em `tests/helpers.js` (`createSimulation`, `spawnFighter`...).

---

## Dependências entre módulos

```
core/Game     → core, states/stateFactory, config, utils
states        → states/stateIds, simulation, combat, ai, controllers, characters, entities, rendering, config
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
