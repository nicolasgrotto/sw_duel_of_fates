# TASKS

Atualize este arquivo ao terminar cada tarefa.

## Projeto e publicação

- [x] Documentação de design (DESIGN.md e design/)
- [x] CREDITS.md e ASSETS.md
- [x] Escolher a licença do código e criar LICENSE (MIT)
- [ ] Definir nomes e visual dos personagens
- [ ] Definir nome final do jogo (versão de portfólio)
- [ ] Criar o repositório remoto no GitHub

## Fase 1 — Fundação

- [x] Criar HTML base
- [x] Criar Canvas (escala 16:9 e nitidez em telas com DPR alto)
- [x] Criar Renderer
- [x] Criar Game
- [x] Criar GameLoop (timestep fixo)
- [x] Criar Input (teclas → ações)
- [x] Criar sistema de estados (Menu, Duelo, Pausa)
- [x] Overlay de debug (FPS, estados) com `F3`
- [x] Servidor local e testes com `node --test`
- [x] Paleta neutra seguindo o VISUAL_SYSTEM

## Fase 2 — Personagem

- [x] Criar Fighter
- [x] Criar characterData e characterFactory
- [x] Criar fightersConfig
- [x] PlayerController (Input → intent)
- [x] Movimento horizontal com aceleração (para trás mais lento)
- [x] Lutadores viram de frente um para o outro
- [x] Gravidade
- [x] Pulo
- [x] Limites da arena
- [x] Corpos não se atravessam (empurrão)
- [x] Silhueta do personagem desenhada por código (seguir ART_DIRECTION)
- [x] Animação idle (respiração, sabre balançando)
- [x] Animação walk (passos, balanço do corpo, roupa arrastando)
- [x] Pose de pulo (pernas recolhidas)
- [x] Debug: posição, velocidade, estado e caixa do corpo

## Fase 3 — Combate

- [x] Dados de ataque por arquétipo (startup, active, recovery, dano, custo, hitbox, knockback)
- [x] Ataque rápido
- [x] Ataque forte
- [x] Block (de frente, blockstun, custo de stamina)
- [x] Quebra de guarda (STUNNED)
- [x] Dodge (dash com invulnerabilidade)
- [x] Stamina (gasto, atraso, regeneração)
- [x] Hit detection (hitbox / hurtbox, trade no mesmo frame)
- [x] Damage
- [x] Knockback
- [x] Stun (hitstun)
- [x] Death (queda para trás ou para a frente)
- [x] Fim do duelo (VITÓRIA / DERROTA, Enter volta ao menu)
- [x] Eventos de combate (hit, block, guardBreak, death)
- [x] Poses de combate (ataques, bloqueio, esquiva, hit, stun, morte)
- [x] Boneco de treino (F4: parado, bloqueando, atacando)
- [x] DuelSimulation compartilhada entre jogo e testes
- [x] Debug: hitboxes, hurtboxes e último evento

## Fase 4 — Sabres e efeitos

- [x] Renderizar sabre em guarda (glows e núcleo)
- [x] Luz do sabre no chão
- [x] Trail do sabre durante golpes
- [x] Arco de ataque (poses da Fase 3 + trail)
- [x] Clash de sabres (evento `clash`, hitbox × hitbox; sem entidade Saber, ver ARCHITECTURE)
- [x] EffectsSystem com pool de partículas
- [x] Sparks, luz de impacto e flash por evento (hit, heavy, block, guardBreak, clash, death)
- [x] Camera com screen shake (com limites)
- [x] Luz do sabre no personagem
- [x] Afterimage na esquiva

## Fase 5 — IA

- [x] IA básica (controller que só escreve o intent)
- [x] Percepção (distância, ameaça, chance de punir)
- [x] Tempo de reação (pensa em intervalos)
- [x] Ataque (rápido e forte, com cooldown)
- [x] Defesa (bloqueio)
- [x] Esquiva
- [x] Contra-ataque (punir recovery, hit e stun)
- [x] Recuar para recuperar stamina
- [x] Perfis (agressivo, defensivo, equilibrado)
- [x] Diferentes dificuldades (fácil, normal, difícil) escolhidas no menu
- [x] Modo treino com o boneco

## Fase 6 — UI

- [x] Menu final (Duelar, Controles)
- [x] Tela de controles (gerada do controlsConfig)
- [x] HUD (nomes, vida com barra fantasma, vida baixa piscando, stamina)
- [x] Intro "DUELO" e mensagem "K.O."
- [x] Pause final (Continuar, Reiniciar, Sair)
- [x] Vitória
- [x] Derrota
- [x] Estatísticas do duelo e revanche
- [x] Textos e layout centralizados em uiConfig

## Fase 7 — Polish

- [x] Eventos de início de ataque e esquiva
- [x] Sons sintetizados (golpes, hits, bloqueio, clash, quebra de guarda, morte, esquiva, interface)
- [x] Zumbido dos sabres (pan pela posição, mais forte no golpe)
- [x] Música ambiente (drone) que abaixa no golpe final
- [x] Hit stop
- [x] Câmera lenta no golpe final
- [x] Pós-processamento (vinheta)
- [x] Tela de opções (dificuldade, efeitos reduzidos, som, música) salva no navegador
- [x] Simulador de duelos para balanceamento (npm run simulate)
- [x] Ajustes de balanceamento (atributos da Sombra, perfis de IA, guarda por antecipação)

## Roadmap

Plano aprovado depois da análise de game design da v0.1. Cada versão é jogável sozinha. Ordem de prioridade dentro de cada versão.

### v0.2 — Combate técnico

- [x] Buffer de input (0,15 s) e aviso de ação recusada por falta de stamina (barra pisca, som seco)
- [x] Parry por timing, parry perfeito, parry falho e estado `STAGGERED`
- [x] Riposta depois do parry
- [x] Efeitos e sons do parry (anel, lâmina clareando, dessaturação e câmera lenta no perfeito)
- [x] Empurrão (bloqueio + ataque rápido)
- [x] IA usando parry (contra fortes) e empurrão, com chances por dificuldade
- [x] Verificar no navegador (`npm start`) o parry, o perfeito (dessaturação, anel, flare), o empurrão e a tela de Controles
- [x] Pacote de impacto: hit flash, tremor no hit stop, punch-in da câmera
- [x] Melhor de 3 rounds (HUD com rounds, intro por round, estatísticas do duelo inteiro)
- [x] Rebalanceamento "poucos golpes, todos importantes" validado com `npm run simulate`
- [x] Dados de frame no modo Treino

Correção posterior do pacote de impacto: tronco passou a receber a mesma cor de hit flash das demais partes; teste cobre a silhueta inteira dos dois personagens.

Verificação visual: Chrome headless em localhost:8080, Canvas 1280×720. Parry comum e perfeito e empurrão gerados pela DuelSimulation real; anéis, flare e sabres coloridos sobre o mundo dessaturado conferidos com deslocamento máximo de câmera. Controles legíveis, incluindo L + J. Sem correções necessárias.

Balanceamento validado em 300 rounds por dificuldade, seed 1, com perfis próprios e com ambos balanced. Hits até K.O.: 7,5/8,4/8,5 (Fácil/Normal/Difícil); com balanced: 7,8/8,6/8,9. O simulador distingue essa contagem dos hits totais dos dois lados. Tabela completa em ARCHITECTURE.md.

#### Notas para quem continuar a v0.2

As regras já estão definidas em GAME_DESIGN.md, design/VFX_GUIDELINES.md e design/UI_GUIDELINES.md. Implemente o que está lá; não é preciso redesenhar.

- **Verificação no navegador**: os efeitos do parry só foram testados em Node (estado e dados), nunca vistos rodando. Confira se o passo `saturation` em `drawDesaturation` (`rendering/effectsRenderer.js`) cobre a tela inteira com a câmera e se os sabres continuam coloridos por cima. Treino + F3 mostra `parry`, `lockout` e `buffer` de cada lutador.
- **Pacote de impacto** (VFX_GUIDELINES: `hit-flash`, tremor no hit stop, punch-in):
  - Hit flash: guardar um timer por lutador no `EffectsSystem` (como `saberFlares`) no evento `hit`; `drawFighterBody` precisa aceitar cores substitutas (hoje lê `appearance.cloakColor/bodyColor` direto) para desenhar a silhueta em branco por cima. Desligado com efeitos reduzidos.
  - Tremor: enquanto `timeControl.isFrozen`, o defensor do último `hit`/`parry`/`perfectParry` ganha deslocamento horizontal de 2–3 px alternado, calculado no `EffectsSystem.update` e só lido pelo render.
  - Punch-in: `Camera.punch(zoom, duration)` + campo `punch` nas receitas (forte 3%, quebra de guarda 4%, parry perfeito 5%, golpe final 6%). O `DuelRenderer` aplica `translate(foco) scale(zoom) translate(-foco)` junto do shake. Limite de 6% e escala de efeitos reduzidos (25%).
- **Rounds**: `gameConfig.duel.roundsToWin = 2` (no Treino, sem limite). Falta um `Fighter.resetForRound(x, facing)` (vida, stamina, estado, `combat`, intent) e, no `DuelState`, depois do `resultDelay`, ou começa o próximo round (intro "ROUND 2"/"ROUND FINAL") ou empilha o `GameOverState`. Textos em `uiConfig`. A HUD desenha os quadrados de round (UI_GUIDELINES). Estatísticas somam o duelo inteiro e ganham parries, parries perfeitos e quebras de guarda causadas (duas linhas no resultado).
- **Rebalanceamento**: alvo de 6–9 golpes por round (ver "Ritmo" no GAME_DESIGN): leve ~10, forte ~24, `heavy.blockStaminaCost` ~32. Valide nas três dificuldades com `npm run simulate -- --duels 300 --difficulty <nível>` e com `--profile balanced` (mesmo perfil nos dois) para medir só os atributos. Referência atual, antes do rebalanceamento (200 duelos, seed 1): Normal ≈ 17,5 golpes, 3,6 bloqueios, 0,9 parry + 0,1 perfeito, 0,26 empurrão por duelo; Difícil ≈ 2,3 parries + 1,1 perfeito, 0,55 quebra de guarda; o Guardião vence ~55–66% contra a Sombra agressiva. Os clashes caíram para ~0,2 por duelo depois da variação no tempo de reação da IA: antes eram um artefato das duas IAs sincronizadas. Atualize a referência em ARCHITECTURE.md ("Balanceamento").
- **Dados de frame no Treino**: no `DuelState`, a cada `hit`/`block`/`parry` em que o atacante é o jogador, calcule a vantagem = tempo de travamento restante do defensor (hitstun, blockstun ou stagger) − tempo restante do golpe do atacante (`getAttackDuration(attack) - stateTime`). Mostre `Golpe · resultado · ±0,00 s` numa linha `hint` acima da dica de pausa, só no Treino. Textos em `uiConfig`.
- Ao terminar cada item: `npm test`, marcar aqui, atualizar ARCHITECTURE.md e commitar (regras de commit no AGENTS.md).

### v0.3 — Arena e identidade

- [x] Arenas como dados (`src/arenas/`), camadas estáticas pré-renderizadas, partículas ambientes
- [x] Plataforma de Refino (primeira arena de verdade)
- [x] Câmera dinâmica (enquadra os dois lutadores, zoom leve com a distância)
- [ ] Nome próprio do jogo, fonte display OFL, letterbox, ignição dos sabres na intro
- [ ] Paleta de sabres sem codificação herói/vilão
- [x] Gamepad (Gamepad API dentro do `Input`), vibração em impactos
- [x] Segundo preset de teclado (setas + Z X C V)

Os itens de identidade (nome, fonte, letterbox, ignição e paleta de sabres) permanecem pendentes para trabalho visual do Opus, conforme a opção de divisão autorizada no pedido.

### v0.4 — Personagens I

- [x] Golpes como dados por personagem (`moves`, `cancelsInto`, pose por golpe)
- [x] Sequências de ataques rápidos (encadeiam só no acerto ou no bloqueio)
- [ ] Ataque aéreo e forte de avanço
- [ ] Habilidade exclusiva (`I`)
- [ ] Tela de seleção de personagem (o jogador pode ser qualquer um)
- [ ] Bastião, Vespa e Espelho
- [ ] IA com comportamento por dificuldade (punir bloqueio, iscas de whiff, memória curta de hábitos no Difícil)
- [ ] Treino: boneco que grava e reproduz, hitboxes visíveis sem F3, display de inputs

### v0.5 — Modos

- [ ] Tutorial / desafio de parry
- [ ] Arcade (6 lutas + chefe)
- [ ] 2P local
- [ ] Tela de resultado completa e lista de golpes na pausa
- [ ] Santuário Alagado e Mina de Cristal

### v0.6 — Personagens II e arenas

- [ ] Haste, Brasa e Forja
- [ ] IA por personagem (prioridades e pesos como dados)
- [ ] Mais 2–3 arenas

### v0.7 — Polimento

- [ ] Replay do golpe final (re-simulação determinística dos intents gravados)
- [ ] Música dinâmica pela vida dos dois, batida grave com vida baixa
- [ ] Remapeamento de teclas
- [ ] Desafios por personagem com cores de sabre desbloqueáveis
- [ ] Garça e Eco, pulo na parede, Sobrevivência

### v1.0 — Portfólio

- [ ] 8–10 personagens e 6–8 arenas
- [ ] Deploy no GitHub Pages, README com GIFs
- [ ] Revisão final da documentação de arquitetura
