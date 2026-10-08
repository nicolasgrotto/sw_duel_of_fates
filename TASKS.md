# TASKS

Atualize este arquivo ao terminar cada tarefa.

## Ponto de continuidade

- **v1.0 concluída no código**: 10 personagens, 6 arenas, todos os modos das versões anteriores, 340 testes e balanceamento medido pela matriz do simulador (ARCHITECTURE → Balanceamento).
- Falta só o que depende do autor: criar o repositório remoto, ativar o GitHub Pages (passos no README) e, se quiser, gravar GIFs para o README (hoje ele usa capturas em `media/`).
- **v2.0 em andamento** na branch `v2-development` (a tag `v1.0.0` marca a base). Roteiro aprovado em "v2.0 — Duelo expandido e Story". Próximo item: v1.1 — Fundação, quando o autor pedir.

## Projeto e publicação

- [x] Documentação de design (DESIGN.md e design/)
- [x] CREDITS.md e ASSETS.md
- [x] Escolher a licença do código e criar LICENSE (MIT)
- [x] Definir nomes e visual dos personagens
- [x] Definir nome final do jogo: Duel of Fates
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
- Ao terminar cada item: `npm test`, marcar aqui, atualizar ARCHITECTURE.md e commitar (regras de commit no AGENTS.md; modelo em AGENTS.md.example).

### v0.3 — Arena e identidade

- [x] Arenas como dados (`src/arenas/`), camadas estáticas pré-renderizadas, partículas ambientes
- [x] Plataforma de Refino (primeira arena de verdade)
- [x] Câmera dinâmica (enquadra os dois lutadores, zoom leve com a distância)
- [x] Nome próprio do jogo, fonte display OFL, letterbox, ignição dos sabres na intro
- [x] Paleta de sabres sem codificação herói/vilão
- [x] Gamepad (Gamepad API dentro do `Input`), vibração em impactos
- [x] Segundo preset de teclado (setas + Z X C V)

### v0.4 — Personagens I

- [x] Golpes como dados por personagem (`moves`, `cancelsInto`, pose por golpe)
- [x] Sequências de ataques rápidos (encadeiam só no acerto ou no bloqueio)
- [x] Ataque aéreo e forte de avanço
- [x] Habilidade exclusiva (`I`): golpe com armadura, postura de contra-golpe e avanço; traços passivos como dados
- [x] Tela de seleção de personagem (o jogador pode ser qualquer um)
- [x] Bastião, Vespa e Espelho (com seleção de adversário)
- [x] IA com comportamento por dificuldade (aviso no Fácil, punição inteligente, iscas de whiff, sequências, habilidade, memória curta de hábitos no Difícil)
- [x] Treino: boneco que grava e reproduz, hitboxes visíveis sem F3, display de inputs

### v0.5 — Modos

- [x] Tutorial / desafio de parry (9 passos guiados, desafio de 45 s com recorde salvo)
- [x] Arcade (até 6 lutas + chefe Sombra Desperta, dificuldade crescente, progresso salvo)
- [x] 2P local (teclado dividido ou dois controles, cada jogador escolhe com os próprios controles)
- [x] Tela de resultado completa e lista de golpes na pausa (e IA que pune depois de bloquear e guarda ao sair do hitstun)
- [x] Santuário Alagado e Mina de Cristal (reflexo na água, cristais na cor dos sabres, escolha de arena)

### v0.6 — Personagens II e arenas

- [x] Haste, Brasa e Forja (ponto doce, contra-golpe próprio, golpe carregável)
- [x] IA por personagem (prioridades e pesos como dados; habilidade usada conforme o tipo do golpe)
- [x] Mais 2–3 arenas: Telhado Neon, Anel Orbital e Floresta Lumínica (6 arenas no total)

### v0.7 — Polimento

- [x] Refinar o balanceamento do elenco de 10 (média das duas dificuldades entre 45% e 57% por personagem; a diferença entre Normal e Difícil por estilo é intencional, ver matriz na ARCHITECTURE)
- [x] Replay do golpe final (re-simulação determinística dos intents gravados, opção para desligar)
- [x] Música dinâmica pela vida dos dois, batida grave com vida baixa
- [x] Remapeamento de teclas (Opções → Configurar teclas, preset Personalizado salvo)
- [x] Desafios por personagem com cores de sabre desbloqueáveis (Arcade + desafio próprio, troca de cor na seleção)
- [x] Garça e Eco, pulo na parede (finta, mergulho aéreo, salto, passo-reflexo)
- [x] Sobrevivência (um round por luta, vida carregada, chefe a cada 5 vitórias, recorde salvo)

### v1.0 — Portfólio

- [x] 8–10 personagens e 6–8 arenas (10 personagens e 6 arenas)
- [x] Preparar o deploy no GitHub Pages (site estático com caminhos relativos, `.nojekyll`, passos no README)
- [x] README com capturas de tela, modos e personagens
- [ ] Publicar no GitHub Pages (depende do repositório remoto)
- [ ] GIFs de gameplay no README (opcional, gravados pelo autor)
- [x] Revisão final da documentação de arquitetura (árvore de pastas, fluxo de telas, input, configurações, testes e dependências)

## v2.0 — Duelo expandido e Story

Trabalho na branch `v2-development`, a partir da tag `v1.0.0`. Cada etapa v1.N é um passo rumo à v2.0, não uma versão final; ao terminar uma etapa, crie a tag `v1.N` na branch. Uma task = implementar, testar, `npm test`, atualizar a ARCHITECTURE e commitar. Arquitetura e decisões: ARCHITECTURE → "v2 planejada"; nomes: DESIGN → "Nomes da v2".

### v1.1 — Fundação
- [ ] Input com fontes genéricas (teclado, gamepad) sem mudar comportamento
- [ ] Save versionado com migração v1 → v2 e teste com save v1 real
- [ ] `DuelResult` e `duelOutcomes`: tirar o roteamento de Arcade e Sobrevivência do DuelState
- [ ] `rules` nos parâmetros do duelo (padrão = v1.0)
- [ ] Teste de cobertura do snapshot do replay (campos mutáveis do Fighter)
- [ ] `maxPixelRatio` e tempo de frame no F3

### v1.2 — Mobile
- [ ] Viewport: `viewport-fit=cover`, safe areas, `touch-action: none`, tela "gire o aparelho" no retrato
- [ ] `TouchInput`: multitoque por `pointerId`, joystick virtual (com zona morta) e botões → ações
- [ ] `TouchControls` desenhados no canvas, só quando o último input foi toque
- [ ] Toque nos menus: `MenuList` com tocar para escolher e confirmar; setas de cor na seleção
- [ ] Botão de pausa; esconder remapeamento e 2 Jogadores em toque
- [ ] Efeitos reduzidos automáticos em ponteiro "coarse" (opção sobrescreve)
- [ ] Manifest com orientação paisagem e ícone (registrar no ASSETS)
- [ ] Teste em celular real (Chrome Android, Safari iOS) e registro do resultado

### v1.3 — Movimento
- [ ] Ação `EVADE` (S/↓, direcional baixo, joystick baixo) e flag `evade` no intent
- [ ] Esquiva de precisão: inclinação curta, sem stamina, janela de invulnerabilidade curta e recuperação punível; flag em config
- [ ] IA: usar EVADE contra golpe já em active por perfil e dificuldade
- [ ] `movement.maxJumps` com contador; pulo duplo não recarrega no pulo na parede
- [ ] IA e simulador com pulo duplo; matriz para confirmar que o modo clássico não mudou

### v1.4 — Atributos
- [ ] `attributesConfig` e `applyAttributes` (puro)
- [ ] Calibrar os atributos dos 10 personagens; tirar os escalares do fightersConfig
- [ ] Matriz completa: médias dentro de ±5 pontos da v1.0
- [ ] Atributos na seleção de personagem (barras 1–9; regra visual nos docs de design antes)

### v1.5 — Sistema do Fluxo
- [ ] `powerLevel`, `powerMeter` e regras de ganho; medidor no HUD (com `rules.powers`)
- [ ] `resolvePowerOutcome` com regras em dados
- [ ] `powerTiersConfig` e aura em cache por tier (sem `shadowBlur`, sem gradiente por frame)
- [ ] Simulador com `--rules powers`

### v1.6 — Poderes
- [ ] Estados `CASTING` e `CHANNELING`; ação `POWER` (teclado, gamepad RT, botão de toque)
- [ ] `PowerSystem` e registro de efeitos; Empurrão
- [ ] Puxão
- [ ] Raio (ticks, canal, polilinha na renderização)
- [ ] Barreira (bloqueia o raio, responde ao empurrão)
- [ ] Eventos → VFX, som e câmera; resistido → efeito de barreira
- [ ] IA: lançar e responder a poderes considerando a resistência
- [ ] Alinhamento, nível e 2 poderes para os 10 personagens; matriz com poderes

### v1.7 — Base do Story
- [ ] `storyConfig` (formato), `StoryDirector` e `conditions` (puros)
- [ ] `StoryState` (hub da campanha) e `DialogueState`
- [ ] Protagonista: arquétipo, `createProtagonistCharacter`, criação simples (nome, alinhamento, cor)
- [ ] Progressão: pontos por encontro, teto por dificuldade (Fácil 8, Normal 7, Difícil 6) e orçamento total
- [ ] Save do Story (progresso, protagonista)

### v1.8 — Conteúdo do Story
- [ ] Campanha linear de cerca de 8 encontros com diálogos e variações de fala por alinhamento
- [ ] Recompensas e poderes liberados por progresso
- [ ] Finais em dados; final normal; final secreto (vida > 75% contra o Soberano)

### v1.9 — Secretos e intro
- [ ] Soberano e Predestinado (`selectable: false`, desbloqueio salvo)
- [ ] `IntroState` com linha do tempo em dados e tela de título
- [ ] `SecretUnlockSystem` (sequência de teclas e de ações) e reação na intro
- [ ] Duelo secreto e epílogo do Story

### v1.10 — Skins e personalização
- [ ] `skins` nos dados e `resolveAppearance`; escolha na seleção
- [ ] Skins liberadas por progresso (reaproveita `unlocks.js`)
- [ ] Skins e variações na criação do protagonista; nome com `textPrompt` (funciona no teclado do celular)

### v1.x final — Equilíbrio, desempenho e QA
- [ ] Matrizes: clássico, com poderes, protagonista no teto de cada dificuldade contra o Soberano
- [ ] Orçamento de desempenho medido em celular intermediário
- [ ] Regressão: IA, replay, 2 Jogadores, gamepad, remapeamento, Tutorial, Arcade, Sobrevivência, Treino
- [ ] Revisão de docs; tag `v2.0.0`; merge da `v2-development` na `main`

### Critérios de aceitação da v2.0

- Todos os modos da v1.0 funcionam no desktop; a matriz do modo clássico fica dentro de ±5 pontos da v1.0.
- Jogável de ponta a ponta em celular intermediário em paisagem (menus, duelo, Story), 60 FPS na maior parte do tempo e nunca abaixo de 50 FPS em luta com poderes e efeitos reduzidos.
- 4 poderes com resistência por nível, em dados, usados pela IA; replay determinístico com poderes.
- Story linear completo com final normal e final secreto; protagonista criado, evoluído e salvo.
- Soberano e Predestinado desbloqueáveis pelo código na intro e pelo Story, com desbloqueio salvo.
- EVADE e pulo duplo funcionando, inclusive na IA; skins para personagens e protagonista; save v1 migra sem perda.
- `npm test` passa; ARCHITECTURE, GAME_DESIGN, TASKS e docs de design atualizados; ASSETS registra todo asset novo.
- Nenhum nome ou fala da franquia no código, nos textos ou nos assets.

## Depois da v2.0 (v3+)

- Poderes Cura e Fúria; poderes com projéteis; árvore de habilidades; mais de 2 poderes por personagem.
- Campanha maior que cerca de 8 encontros; missões diferentes por alinhamento; história ramificada.
- Service worker para jogar offline (PWA completo).
- Voz gravada (a v2 usa texto e som sintetizado).
- Character creator detalhado, equipamentos, skins com silhueta ou animação novas, destruição de arena.

**O que tende a pesar e deve ser evitado:** muitas partículas ou glows dinâmicos por frame (usar cache e pools, como hoje), `shadowBlur` no canvas, imagens grandes sem compressão, áudio gravado longo (manter síntese), alocar objetos no loop, e qualquer biblioteca ou engine para resolver algo pequeno.
