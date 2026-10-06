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
    Camera.js               ⏳ enquadramento e screen shake
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
  entities/                 ✅ objetos do jogo
    Fighter.js              ✅ posição, velocidade, estado, intent, animação
    fighterStates.js        ✅ estados do lutador
    Saber.js                ⏳ lâmina com hitbox (Fase 4)
  systems/                  ✅ processam entidades
    MovementSystem.js       ✅ intent → velocidade, pulo, direção, estado de locomoção
    PhysicsSystem.js        ✅ gravidade, chão, limites da arena
    CollisionSystem.js      ✅ corpos não se atravessam
    AnimationSystem.js      ✅ tempo, ciclo de passos, blends
    EffectsSystem.js        ⏳
  combat/                   ⏳ CombatSystem, Hitbox
  ai/                       ⏳ EnemyAI
  rendering/                ✅ desenho (só lê dados)
    DuelRenderer.js         ✅ ordem das camadas do duelo
    arenaRenderer.js        ✅ chão e limites
    fighterPose.js          ✅ calcula a pose a partir do estado e da animação
    fighterRenderer.js      ✅ silhueta do lutador e sombra
    saberRenderer.js        ✅ cabo, glows, núcleo e luz no chão
  config/                   ✅ valores e ajustes
    gameConfig.js           ✅ canvas, loop, arena, física, duelo, debug
    themeConfig.js          ✅ cores, estilos de texto, animação de UI
    controlsConfig.js       ✅ ações e teclas
    fightersConfig.js       ✅ atributos por arquétipo (vida, stamina, corpo, movimento)
    fighterVisualConfig.js  ✅ proporções, animação, sombra e estilo do sabre
    effectsConfig.js        ⏳ parâmetros de VFX
  utils/
    debug.js                ✅ overlay de debug
    math.js                 ✅ clamp, lerp, approach, smoothTowards
    random.js               ⏳
tools/
  server.js                 ✅ servidor estático para desenvolvimento
tests/                      ✅ testes com node --test
```

Não crie arquivos vazios "para depois". Arquivo vazio tende a ser preenchido sem necessidade. Crie o arquivo junto com a tarefa que precisa dele e atualize a tabela acima.

Decisões sobre nomes:

- `Player` e `Enemy` **não** são subclasses com lógica duplicada. Ambos são `Fighter`. O que muda é quem controla: o jogador (via `Input`) ou a IA (via `EnemyAI`). Os dois produzem as mesmas ações.
- A lâmina é `Saber`, não `Lightsaber`. Termos neutros facilitam trocar a identidade do jogo no futuro.
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

O `DuelState` é dono do duelo: cria as entidades, os sistemas e o `DuelRenderer`, e chama tudo na ordem certa.

### Characters

Personagens são **dados**:

- `characterData.js`: id, nome, arquétipo e aparência (cores, capuz, capa, ângulo de guarda, tamanho da lâmina).
- `fightersConfig.js`: atributos de cada arquétipo (vida, stamina, tamanho do corpo, movimento).
- `characterFactory.createFighter(id, spawn)` junta os dois e cria um `Fighter`.

Trocar todos os personagens (ex.: versão com identidade própria) deve exigir apenas mudar dados e assets, nunca o combate. Para adicionar um personagem: adicione uma entrada em `characterData.js` e, se precisar de atributos novos, um arquétipo em `fightersConfig.js`.

### Controllers

Um controller escreve no `fighter.intent` o que o lutador **quer** fazer (`moveX`, `jump`, `lightAttack`, `heavyAttack`, `block`, `dodge`). Ele nunca altera posição, vida ou estado.

- `PlayerController`: lê o `Input`.
- `EnemyAI` (Fase 5): vai preencher o mesmo `intent`.
- Lutador sem controller: intent zerado a cada update.

O `DuelState` guarda pares `{ fighter, controller }` em `participants`.

### Entities

Objetos do jogo (`Fighter`, `Saber`). Guardam dados e estado, mas não controlam o jogo inteiro e não desenham a si mesmos.

`Fighter` guarda posição (`x`, `y` nos **pés**, centro horizontal), velocidade, `facing` (1 = direita, -1 = esquerda), `grounded`, vida, stamina, estado (`FighterState`), `stateTime`, `intent` e `animation`. `canMove` diz se o estado atual aceita locomoção.

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

Ordem dentro do `DuelState.update`:

```
controllers                 → fighter.intent                         ✅
fighter.advanceStateTime    → tempo no estado atual                  ✅
MovementSystem.applyIntents → direção, pulo, aceleração horizontal   ✅
PhysicsSystem               → gravidade, integração, chão, paredes   ✅
CollisionSystem             → separa corpos sobrepostos              ✅
MovementSystem.updateStates → IDLE / WALKING / JUMPING               ✅
AnimationSystem             → tempo, ciclo de passos, blends         ✅
CombatSystem                → hitboxes, bloqueio, dano, knockback, stun → emite eventos   ⏳
EffectsSystem               → consome eventos → partículas, flash, pedido de shake        ⏳
Camera                      → enquadramento e shake                                       ⏳
```

`MovementSystem` só mexe em lutadores com `canMove`. Estados de combate (ataque, stun...) vão bloquear a locomoção automaticamente.

Ordem do `DuelRenderer.render` (camadas do VISUAL_SYSTEM):

```
arena → luz dos sabres no chão → corpos (sombra, capa, pernas, túnica, cabeça, braços) → sabres
```

A pose de cada lutador é calculada por `computePose` a partir do estado e da animação, em coordenadas locais (origem nos pés, olhando para a direita). O renderer espelha com `scale(facing, 1)`. Os objetos de pose são reutilizados entre frames.

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

## Combat (planejado)

`CombatSystem` é responsável por ataques, bloqueios, colisões de ataque, dano, stun, knockback e transições de combate.

- Não desenha nada.
- Não cria efeitos nem mexe na câmera. Ele **emite eventos** (`hit`, `block`, `clash`, `death`) com posição, intensidade e envolvidos.
- Separar: colisão física, hitbox, hurtbox, detecção de ataque e colisão entre sabres.

---

## Effects e Camera (planejado)

- `EffectsSystem` consome os eventos de combate e cria efeitos com `effects.spawn(type, params)`. Catálogo e limites em [design/VFX_GUIDELINES.md](design/VFX_GUIDELINES.md).
- Partículas usam pool.
- `Camera` mantém os dois lutadores visíveis, respeita os limites da arena e aplica screen shake **a pedido do EffectsSystem**.

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
- Chama `renderDebug(renderer)` de cada estado para desenhos de debug. O `DuelState` desenha a caixa do corpo de cada lutador e mostra estado, posição e velocidade.
- Futuro: hitboxes, hurtboxes e decisões da IA.

---

## Configuração

- Balanceamento e ajustes ficam em `src/config/`. Nada de números mágicos espalhados.
- Cores e estilos de texto ficam em `themeConfig.js` e espelham [design/VISUAL_SYSTEM.md](design/VISUAL_SYSTEM.md).
- Arquivos de config exportam objetos simples, sem lógica.

---

## Testabilidade

Testes rodam em Node (`npm test`), sem navegador. Por isso:

- Módulos de lógica (`states/`, `characters/`, `controllers/`, `entities/`, `combat/`, `systems/`, `ai/`, `config/`, `utils/`) **não** acessam `window`, `document` ou canvas. Estados e `rendering/` desenham só pela API do `Renderer` recebido.
- Quando um módulo do core precisa do navegador (`Input`, `GameLoop`), a dependência é injetada.
- `computePose` é uma função pura e também é testada.

Testes atuais: `gameLoop`, `input`, `stateMachine`, `states` (fluxo Menu → Duelo → Pausa → Menu), `debug`, `math`, `fighter`, `playerController`, `movement`, `physics` (inclui colisão) e `animation` (inclui pose). Utilitários compartilhados ficam em `tests/helpers.js`.

---

## Dependências entre módulos

```
core/Game     → core, states/stateFactory, config, utils
states        → states/stateIds, systems, combat, ai, controllers, characters, entities, rendering, config
characters    → entities, config
controllers   → config
systems / combat / ai → entities, config, utils
rendering     → config, utils
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
