# ARCHITECTURE

## Objetivo

Manter o projeto modular, para que novos personagens, ataques, arenas e comportamentos de IA possam ser adicionados sem reescrever o núcleo do jogo.

Para **o que** o jogo faz, veja [GAME_DESIGN.md](GAME_DESIGN.md).

---

## Estrutura de pastas

Legenda: ✅ existe · ⏳ planejado (criar só quando a tarefa pedir)

```
index.html                  ✅ página com o canvas
styles/
  main.css                  ✅ layout da página e do canvas
  hud.css / menu.css        ⏳ só se houver UI em DOM
src/
  main.js                   ✅ ponto de entrada
  core/                     ✅ infraestrutura do jogo
    Game.js                 ✅ monta e conecta os módulos
    GameLoop.js             ✅ loop com timestep fixo
    Input.js                ✅ teclado → ações
    Renderer.js             ✅ canvas e primitivas de desenho
    StateMachine.js         ✅ pilha de estados
    AssetManager.js         ⏳
    AudioManager.js         ⏳
  states/                   ✅ telas do jogo
    GameState.js            ✅ classe base
    MenuState.js            ✅
    DuelState.js            ✅
    PauseState.js           ✅
    GameOverState.js        ⏳
  entities/                 ⏳ Fighter, Lightsaber
  combat/                   ⏳ CombatSystem, Hitbox
  systems/                  ⏳ Physics, Collision, Animation, Effects
  ai/                       ⏳ EnemyAI
  config/                   ✅ valores e ajustes
    gameConfig.js           ✅
    controlsConfig.js       ✅
    fightersConfig.js       ⏳
  utils/
    debug.js                ✅ overlay de debug
    math.js / random.js     ⏳
tools/
  server.js                 ✅ servidor estático para desenvolvimento
tests/                      ✅ testes com node --test
assets/                     ⏳ imagens, áudio e fontes
```

Não crie arquivos vazios "para depois". Arquivo vazio tende a ser preenchido sem necessidade. Crie o arquivo junto com a tarefa que precisa dele e atualize a tabela acima.

Sobre os nomes do plano original:

- `Player` e `Enemy` **não** devem ser subclasses com lógica duplicada. Ambos são `Fighter`. O que muda é quem controla: o jogador (via `Input`) ou a IA (via `EnemyAI`). Os dois produzem as mesmas ações.
- O estado de combate (`IDLE`, `ATTACKING`...) pertence ao `Fighter`. Não criar um `CombatState.js` separado sem motivo.
- Dano faz parte do `CombatSystem`. Só separar em `DamageSystem` se o arquivo crescer demais.

---

## Camadas

### Core

Infraestrutura: loop, input, renderização, estados e assets.

Core **não** conhece detalhes de personagens, ataques ou IA.

### States

Controlam a tela atual (Menu, Duelo, Pausa, Game Over). Cada estado tem `enter()`, `exit()`, `update(dt)` e `render(renderer)`.

O `DuelState` é dono do duelo: cria as entidades e chama os sistemas na ordem certa.

### Entities

Objetos do jogo (`Fighter`, `Lightsaber`). Guardam dados e estado, mas não controlam o jogo inteiro e não desenham a si mesmos.

### Systems / Combat / AI

Processam entidades. Exemplo: `PhysicsSystem` aplica gravidade, `CombatSystem` resolve golpes, `EnemyAI` escolhe ações.

### Config

Todos os números de balanceamento e ajustes.

---

## Fluxo principal

```
main.js
  └─ new Game(canvas)
       ├─ Renderer
       ├─ Input
       ├─ StateMachine ── MenuState / DuelState / PauseState
       ├─ DebugOverlay
       └─ GameLoop
            ├─ update(step)  → states.update(step) → input.endFrame()
            └─ render(alpha) → renderer.clear() → states.render() → debug
```

Ordem planejada dentro do `DuelState.update` (a partir da Fase 2):

```
Input / EnemyAI  → intenções (ações)
Fighter          → aceita ou recusa a ação conforme o estado atual
PhysicsSystem    → movimento, gravidade, limites da arena
CombatSystem     → hitboxes, bloqueio, dano, knockback, stun
EffectsSystem    → partículas, screen shake
```

---

## Game loop

Arquivo: [src/core/GameLoop.js](src/core/GameLoop.js)

- **Timestep fixo**: `update` sempre recebe o mesmo `dt` (`gameConfig.loop.fixedStep`, 1/60 s). O tempo real de cada frame entra em um acumulador e o loop executa quantos `update` couberem nele.
- `maxFrameTime` limita o tempo de um frame (ex.: aba voltando do segundo plano), evitando dezenas de updates seguidos.
- `render(alpha)` roda uma vez por frame de tela. `alpha` é a fração do próximo step (útil para interpolação, se necessário).
- `update` altera o estado. `render` apenas desenha.

Por que timestep fixo: startup, active e recovery dos ataques precisam se comportar igual em 60 Hz e 144 Hz. Também torna o combate testável e reproduzível.

O loop recebe `now` e `schedule` como opções. Isso permite testar sem navegador.

---

## Input

Arquivo: [src/core/Input.js](src/core/Input.js)

- Traduz teclas (`KeyboardEvent.code`) em **ações** (`moveLeft`, `lightAttack`, `pause`...), usando `controlsConfig`.
- O resto do jogo só conhece ações, nunca teclas.
- `isDown(action)`: tecla segurada.
- `wasPressed(action)`: tecla pressionada desde o último update. É limpo por `endFrame()`, chamado pelo `Game` depois de cada update. Assim, um toque nunca é perdido nem lido duas vezes, mesmo com timestep fixo.
- Ao perder o foco da janela, todas as teclas são soltas.
- O alvo dos eventos é injetável (`window` por padrão), o que permite testes em Node.

---

## Estados (StateMachine)

Arquivo: [src/core/StateMachine.js](src/core/StateMachine.js)

Pilha de estados:

- `change(state)`: sai de todos os estados e entra no novo (ex.: Menu → Duelo).
- `push(state)`: empilha (ex.: Duelo → Pausa). O estado de baixo fica congelado.
- `pop()`: volta para o estado de baixo.
- `update` roda **só no estado do topo**.
- `render` roda **em todos**, de baixo para cima. Por isso a Pausa aparece por cima do Duelo congelado.

---

## Renderer

Arquivo: [src/core/Renderer.js](src/core/Renderer.js)

- Dono do canvas e do contexto 2D.
- Trabalha em **resolução lógica** fixa (`gameConfig.canvas`, 1280×720). Ajusta o tamanho real ao `devicePixelRatio` para ficar nítido.
- Expõe primitivas (`fillRect`, `line`, `text`, `overlay`...).
- Desenho específico de entidades (lutador, sabre) deve receber a entidade como **dado** e só ler dela.

Renderer **não** decide dano, vitória, derrota, colisões ou comportamento da IA.

---

## Combat (planejado)

`CombatSystem` é responsável por ataques, bloqueios, colisões de ataque, dano, stun, knockback e transições de combate.

`CombatSystem` não desenha nada.

Separar: colisão física, hitbox, hurtbox, detecção de ataque e colisão entre sabres.

---

## AI (planejado)

`EnemyAI` decide a próxima ação e a entrega ao `Fighter`, do mesmo jeito que o `Input` faz para o jogador.

```
EnemyAI → "lightAttack" → Fighter → CombatSystem executa
```

`EnemyAI` nunca altera HP, stamina ou outros valores diretamente.

---

## Debug

Arquivo: [src/utils/debug.js](src/utils/debug.js)

- Ligado/desligado com `F3` ou com `gameConfig.debug.enabled`.
- Mostra FPS e o estado atual.
- Futuro: hitboxes, hurtboxes, posição, velocidade, estado do lutador e decisões da IA. Cada estado pode fornecer linhas extras via `getDebugInfo()`.

---

## Configuração

Balanceamento e ajustes ficam em `src/config/`. Nada de números mágicos espalhados.

Arquivos de config exportam objetos simples (sem lógica).

---

## Testabilidade

Testes rodam em Node (`npm test`), sem navegador. Por isso:

- Módulos de lógica (`entities/`, `combat/`, `systems/`, `ai/`, `config/`, `utils/math.js`) **não** acessam `window`, `document` ou canvas.
- Quando um módulo do core precisa do navegador (`Input`, `GameLoop`), a dependência é injetada por parâmetro.

---

## Dependências entre módulos

```
states → core, systems, combat, ai, entities, config
systems / combat / ai → entities, config, utils
entities → config, utils
core → config, utils
```

- `core` não importa `states` específicos, com exceção de `Game.js`, que escolhe o estado inicial.
- Evitar dependências circulares.

---

## Convenções de código

- Um módulo por arquivo. Classes em `PascalCase.js`, o resto em `camelCase.js`.
- Somente `export` nomeado (sem `export default`).
- Imports sempre com extensão `.js`.
- **Sem comentários no código.** Nomes claros substituem comentários. Contexto e decisões ficam neste documento.
- Evitar criar objetos dentro do loop sem necessidade.
- Listeners adicionados devem ter forma de remoção (`destroy()`).
