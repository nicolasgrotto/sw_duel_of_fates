# GAME DESIGN — Star Wars: Duel of Fates

Este documento é a fonte de verdade sobre **o que** o jogo é. Para **como** o código é organizado, veja [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 1. Visão do jogo

Jogo 2D de duelo de sabres de luz inspirado no universo Star Wars.

O jogador controla um personagem em uma arena 2D e enfrenta um adversário controlado por IA.

O foco é o combate de sabres: ataque, defesa, esquiva, posicionamento e timing.

---

## 2. Stack

- HTML5
- CSS3
- JavaScript com ES Modules
- Canvas 2D
- Sem frameworks
- Sem bundler
- Código modular

---

## 3. Core gameplay

O jogador pode:

- andar para a esquerda e para a direita
- pular
- realizar ataques rápidos
- realizar ataques fortes
- bloquear ataques
- esquivar
- contra-atacar
- sofrer dano
- morrer

### Movimento

- No chão, o lutador sempre vira de frente para o oponente.
- Andar para trás é mais lento que andar para a frente.
- Movimento com aceleração e desaceleração, para transmitir peso. No ar, o controle é reduzido.
- Pulo com altura fixa. Sem pulo duplo.
- Os corpos dos lutadores não se atravessam: ao encostar, eles se empurram.
- Ninguém sai dos limites laterais da arena.

Valores em `src/config/fightersConfig.js` (por arquétipo) e `src/config/gameConfig.js` (gravidade).

---

## 4. Combate

O combate é baseado em estados:

| Estado | Descrição |
| --- | --- |
| `IDLE` | Parado |
| `WALKING` | Andando |
| `JUMPING` | No ar |
| `ATTACKING` | Ataque rápido |
| `HEAVY_ATTACK` | Ataque forte |
| `BLOCKING` | Bloqueando |
| `DODGING` | Esquivando |
| `HIT` | Atingido |
| `STUNNED` | Atordoado (ex.: após ter um ataque forte bloqueado) |
| `DEAD` | Morto |

Cada ação possui:

- duração total
- startup (tempo antes de o golpe ficar ativo)
- active (tempo em que a hitbox causa dano)
- recovery (tempo vulnerável depois do golpe)
- dano
- custo de stamina
- hitbox
- knockback
- se pode ou não ser interrompida

Os tempos são definidos em segundos e processados com timestep fixo (ver ARCHITECTURE.md), para que o combate seja determinístico.

Exemplo de dados de um ataque (valores reais ficam em `src/config/`):

```js
{
  damage: 20,
  staminaCost: 10,
  startup: 0.12,
  active: 0.18,
  recovery: 0.25,
  knockback: 120
}
```

---

## 5. Recursos

### Health

Vida do personagem. Quando chega a zero, o personagem entra em `DEAD`.

### Stamina

Usada para:

- ataques fortes
- esquiva
- algumas ações defensivas

Regenera automaticamente com o tempo.

---

## 6. Sistema de sabre

Cada ataque possui:

- posição inicial da lâmina
- posição final da lâmina
- arco do ataque
- hitbox
- dano
- knockback

A lâmina também possui uma área de colisão própria, usada para detectar choque entre sabres (clash).

---

## 7. IA

Perfis de comportamento:

- **Aggressive**: ataca com frequência.
- **Defensive**: prioriza bloqueio e contra-ataque.
- **Balanced**: combina ataque, defesa e movimentação.

A IA decide com base em:

- distância do jogador
- vida
- stamina
- estado atual do jogador
- próprio estado
- cooldowns
- dificuldade
- probabilidade

A IA só **solicita** ações. Ela nunca altera vida, stamina ou outros valores de combate diretamente.

---

## 8. Arena

A arena possui:

- chão
- limites laterais
- background
- elementos visuais
- iluminação
- efeitos

A arena não controla a lógica dos personagens.

---

## 9. Câmera

A câmera deve:

- acompanhar o duelo
- manter os dois personagens visíveis
- respeitar os limites da arena
- aplicar um pequeno screen shake em impactos fortes

---

## 10. HUD

Mostra:

- vida do jogador
- vida do inimigo
- stamina
- nome dos personagens
- estado do combate

---

## 11. Vitória

Quando a vida de um personagem chega a zero:

1. o personagem entra em `DEAD`
2. o combate termina
3. a animação de vitória é executada
4. a tela de resultado aparece

---

## 12. Fluxo de telas

```
Menu → Duelo ⇄ Pausa
          ↓
      Game Over → Menu
```

- **Menu**: tela inicial. `Enter` inicia o duelo.
- **Duelo**: gameplay. `Esc` ou `P` pausa.
- **Pausa**: sobreposta ao duelo, que fica congelado. `Esc` ou `P` volta, `Q` sai para o menu.
- **Game Over**: resultado do duelo (Fase 6).

---

## 13. Regras importantes

- Não colocar lógica de gameplay no HTML.
- Não colocar toda a lógica no `Game.js`.
- Cada sistema tem uma responsabilidade.
- Dados de personagens ficam em arquivos de configuração.
- Valores de balanceamento nunca ficam hardcoded dentro dos sistemas.

---

## 14. Propriedade intelectual

Este é um protótipo de estudo inspirado em Star Wars. Para publicação pública ou comercial, personagens, nomes, artes, sons e identidade visual devem ser originais ou licenciados.
