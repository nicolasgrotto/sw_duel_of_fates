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
- [ ] Afterimage na esquiva (precisa de evento de esquiva)

## Fase 5 — IA

- [ ] IA básica
- [ ] Percepção de distância
- [ ] Ataque
- [ ] Defesa
- [ ] Esquiva
- [ ] Contra-ataque
- [ ] Perfis (Aggressive, Defensive, Balanced)
- [ ] Diferentes dificuldades

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

- [ ] Sons
- [ ] Música
- [ ] Hit stop
- [ ] Câmera lenta no golpe final
- [ ] Pós-processamento
- [ ] Opção para reduzir efeitos (flash e shake)
- [ ] Ajustes de balanceamento
