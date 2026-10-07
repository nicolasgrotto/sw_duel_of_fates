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
| `STUNNED` | Atordoado (guarda quebrada por falta de stamina) |
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

Os valores reais ficam em `src/config/fightersConfig.js`, por arquétipo.

### Regras de combate

**Quando dá para agir**

- Ataques, bloqueio e esquiva só começam no chão, a partir de `IDLE` ou `WALKING`.
- Prioridade quando várias teclas chegam juntas: esquiva > ataque forte > ataque rápido > bloqueio.
- Sem stamina suficiente, a ação é recusada.
- Um ataque não pode ser cancelado. O único jeito de interromper é sendo atingido.

**Ataques**

- Fases: startup → active → recovery. A hitbox só existe no active.
- No início do active, o atacante dá um pequeno passo à frente (lunge).
- Cada ataque acerta no máximo uma vez.
- Ataque rápido: barato, rápido, pouco dano. Ataque forte: caro, lento, muito dano e knockback.
- A recovery é a janela de contra-ataque: quem erra um golpe fica vulnerável.

**Hitbox e hurtbox**

- Hitbox: retângulo à frente do atacante, com alcance e altura definidos por ataque.
- Hurtbox: a caixa do corpo do lutador.
- Durante o início da esquiva, a hurtbox some (invulnerável).

**Bloqueio**

- Segurar bloquear mantém `BLOCKING`. Soltar volta a `IDLE`.
- Só bloqueia golpes vindos da frente.
- Golpe bloqueado: sem dano de vida, o defensor perde stamina, é empurrado um pouco e fica preso no bloqueio por um instante (blockstun).
- **Quebra de guarda**: se o defensor não tiver stamina para o bloqueio, a stamina zera e ele fica `STUNNED`.

**Clash (choque de sabres)**

- Acontece quando os dois lutadores estão na fase active ao mesmo tempo e as hitboxes dos dois se encostam.
- O clash tem prioridade sobre o hit: ninguém leva dano.
- Os dois ataques são cancelados, os dois são empurrados para trás e ficam um instante em recuo (`HIT`, sem dano).
- Emite o evento `clash`.
- Valores em `gameConfig.combat.clash`.

**Esquiva**

- Dash rápido para a direção segurada. Sem direção, esquiva para trás.
- Custa stamina. Invulnerável no começo, vulnerável no fim.

**Ser atingido**

- Perde vida, recebe knockback na direção do golpe e entra em `HIT` (hitstun). Se estava atacando, o ataque é cancelado.
- Vida zero: `DEAD`. O duelo termina.

**Stamina**

- Ações gastam stamina. Depois de gastar, há um pequeno atraso antes de regenerar.
- Bloqueando, a regeneração é mais lenta.

**Fim do duelo**

- O duelo começa com uma intro curta ("DUELO") com os controles travados.
- Quando um lutador morre, os controles param, aparece "K.O." e, depois da queda, a tela de resultado (VITÓRIA ou DERROTA, vencedor, estatísticas, Revanche ou Menu principal).

**Eventos de combate**

O `CombatSystem` emite eventos (`hit`, `block`, `guardBreak`, `clash`, `death`). Efeitos, câmera e som (fases futuras) reagem a eventos, nunca ao contrário.

### Boneco de treino

No modo **Treino** (menu), o oponente é um boneco em vez da IA. Com o debug ligado, `F4` alterna o comportamento: parado → bloqueando → atacando.

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

A IA controla o oponente pelo mesmo `intent` do jogador. Ela só **solicita** ações. Nunca altera vida, stamina, posição ou estado diretamente.

### Como a IA pensa

- A IA não reage a cada frame. Ela "pensa" em intervalos (`reactionTime` da dificuldade). Entre um pensamento e outro, segue o plano atual (andar, segurar bloqueio...). Isso simula tempo de reação humano e deixa espaço para o jogador enganar a IA.
- A cada pensamento, ela lê:
  - distância até o jogador (espaço entre os corpos)
  - estado do jogador (atacando, em recovery, atordoado...) e a fase do ataque dele
  - a própria vida e stamina
  - cooldown entre os próprios ataques
- E escolhe, em ordem de prioridade:
  1. **Defender**: se o jogador está começando um golpe que alcança, bloqueia ou esquiva (chance depende do perfil e da dificuldade).
  2. **Punir**: se o jogador está em recovery, atingido ou atordoado e está no alcance, contra-ataca (ataque forte se houver stamina e o jogador estiver atordoado).
  3. **Recuperar**: com pouca stamina, recua até uma distância segura.
  4. **Atacar**: no alcance e sem cooldown, ataca com uma chance do perfil (rápido ou forte).
  5. **Guardar**: no alcance do jogador e sem poder atacar, segura o bloqueio por antecipação (ataques rápidos são mais rápidos que a reação da IA).
  6. **Posicionar**: fora do alcance, aproxima. Perto demais (para o perfil), recua um pouco ou espera.
- Cada pensamento tem uma chance de **erro** (hesitar, não defender), que depende da dificuldade.

### Perfis

| Perfil | Comportamento |
| --- | --- |
| **Agressivo** | ataca muito, usa mais ataques fortes, defende pouco, fica perto |
| **Defensivo** | bloqueia e esquiva muito, prefere contra-atacar, mantém distância |
| **Equilibrado** | meio-termo |

O perfil vem do personagem (`characterData.aiProfile`). A Sombra é agressiva.

### Dificuldade

| Dificuldade | Reação | Defesa | Erros |
| --- | --- | --- | --- |
| **Fácil** | lenta | rara | frequentes |
| **Normal** | média | às vezes | alguns |
| **Difícil** | rápida | frequente | raros |

A dificuldade é escolhida no menu. Os valores ficam em `src/config/aiConfig.js`.

### Aleatoriedade

A IA usa o mesmo RNG com seed dos efeitos. Nos testes, a seed é fixa, então o comportamento é reproduzível.

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
Menu ──▶ Duelo ⇄ Pausa
 │         │
 │         ▼
 │      Resultado ──▶ Duelo (revanche) ou Menu
 ▼
Controles
```

- **Menu**: opções Duelar e Controles.
- **Controles**: tabela de ações e teclas.
- **Duelo**: intro, gameplay e K.O. `Esc` ou `P` pausa.
- **Pausa**: sobreposta ao duelo congelado. Continuar, Reiniciar duelo, Sair para o menu.
- **Resultado**: VITÓRIA ou DERROTA, vencedor e estatísticas. Revanche ou Menu principal.

Detalhes visuais em [design/UI_GUIDELINES.md](design/UI_GUIDELINES.md).

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
