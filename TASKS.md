# TASKS

Atualize este arquivo ao terminar cada tarefa.

## Projeto e publicação

- [x] Documentação de design (DESIGN.md e design/)
- [x] CREDITS.md e ASSETS.md
- [ ] Escolher a licença do código e criar LICENSE
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

- [ ] Criar Fighter
- [ ] Criar characterData e characterFactory
- [ ] Criar fightersConfig
- [ ] Movimento horizontal
- [ ] Gravidade
- [ ] Pulo
- [ ] Limites da arena
- [ ] Silhueta do personagem desenhada por código (seguir ART_DIRECTION)
- [ ] Animação idle
- [ ] Animação walk
- [ ] Debug: posição, velocidade e estado do lutador

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

- [ ] Renderizar sabre em camadas (trail, glows, núcleo)
- [ ] Arco de ataque
- [ ] Hitbox da lâmina
- [ ] Clash de sabres
- [ ] EffectsSystem com pool de partículas
- [ ] Sparks e flash
- [ ] Camera com screen shake
- [ ] Luz do sabre no chão e no personagem

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
