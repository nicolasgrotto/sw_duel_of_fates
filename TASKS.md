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

- [ ] Ataque rápido
- [ ] Ataque forte
- [ ] Block
- [ ] Dodge
- [ ] Hit detection (hitbox / hurtbox)
- [ ] Damage
- [ ] Knockback
- [ ] Stun
- [ ] Death
- [ ] Eventos de combate (hit, block, clash, death)
- [ ] Debug: hitboxes e hurtboxes

## Fase 4 — Sabres e efeitos

- [x] Renderizar sabre em guarda (glows e núcleo)
- [x] Luz do sabre no chão
- [ ] Trail do sabre durante golpes
- [ ] Arco de ataque
- [ ] Hitbox da lâmina
- [ ] Clash de sabres
- [ ] EffectsSystem com pool de partículas
- [ ] Sparks e flash
- [ ] Camera com screen shake
- [ ] Luz do sabre no personagem (rim light)

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

- [ ] Menu final
- [ ] HUD (seguir UI_GUIDELINES)
- [ ] Pause final
- [ ] Vitória
- [ ] Derrota

## Fase 7 — Polish

- [ ] Sons
- [ ] Música
- [ ] Hit stop
- [ ] Pós-processamento
- [ ] Opção para reduzir efeitos (flash e shake)
- [ ] Ajustes de balanceamento
