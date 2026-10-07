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
- aparar ataques no tempo certo (parry)
- empurrar um oponente que está na defesa
- esquivar
- contra-atacar (riposta depois de um parry, punição de recovery)
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
| `STAGGERED` | Desequilibrado: golpe aparado por parry ou empurrão recebido (sem dano) |
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

- Ataques de chão, bloqueio e esquiva só começam no chão, a partir de `IDLE` ou `WALKING`. O empurrão também pode sair de dentro do bloqueio.
- **Buffer de input**: uma ação apertada enquanto o lutador ainda não pode agir (recovery, hitstun, blockstun, hit stop) fica guardada por `gameConfig.combat.inputBuffer` (0,15 s) e sai no primeiro frame possível. A última ação apertada substitui a anterior.
- Prioridade quando várias teclas chegam juntas: esquiva > empurrão > ataque forte > ataque rápido > bloqueio.
- Sem stamina suficiente, a ação é recusada e o jogo avisa: a barra de stamina pisca e toca um som seco (evento `actionRejected`). A ação recusada sai do buffer.
- Um ataque só pode cancelar a recuperação para o próximo rápido declarado em `cancelsInto`, depois de acertar ou ser bloqueado. No whiff, parry ou clash a rota não abre. Demais interrupções continuam sendo hit, parry e clash.

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

**Parry (aparar)**

O parry é a defesa ativa. Usa o mesmo botão do bloqueio: **tocar** abre a janela de parry, **segurar** continua sendo bloqueio normal.

| Tempo desde o toque | Resultado se um golpe chegar pela frente |
| --- | --- |
| 0 a 0,08 s | **Parry perfeito** |
| 0,08 a 0,20 s | **Parry** |
| depois | bloqueio normal |

- **Parry**: nenhum dano e nenhum custo para o defensor, que fica livre na hora. O atacante perde o ataque e a stamina do bloqueio daquele golpe e fica `STAGGERED` por 0,30 s. Isso **garante um ataque rápido** (ou a riposta).
- **Parry perfeito**: como o parry, mas o atacante fica `STAGGERED` por 0,50 s e perde o dobro de stamina, e o defensor recupera 15 de stamina. Isso **garante um ataque forte**.
- **Parry falho**: se a janela acabar sem nenhum golpe, a janela não abre de novo por 0,40 s (o bloqueio continua funcionando). Isso impede apertar o botão sem parar.
- O toque precisa ser novo: segurar o bloqueio não abre janela ao sair de um hitstun. Um toque durante o blockstun abre a janela (aparar o próximo golpe de uma sequência).
- O empurrão não pode ser aparado.
- **Por que o parry não vira "esperar o outro atacar"**: o ataque forte (startup ~0,33 s) pode ser aparado por reação; o ataque rápido (startup 0,10 s) não, só por leitura. Quem só espera leva ataques rápidos e empurrões e perde stamina bloqueando.
- Valores por arquétipo em `fightersConfig.<arquétipo>.parry`.

**Riposta**

- Um ataque rápido apertado enquanto o oponente está desequilibrado por um parry vira a **riposta**: golpe próprio, mais rápido (startup 0,06 s), sem custo de stamina e com mais dano que o ataque rápido.
- A janela da riposta dura o tempo do desequilíbrio do oponente.

**Empurrão**

- Bloqueio + ataque rápido (`L` + `J`). Pode sair parado ou de dentro do bloqueio (fora do blockstun).
- Startup lento (0,20 s) e alcance curto. Qualquer ataque mais rápido vence o empurrão, e ele não gera clash.
- Não causa dano. Atravessa bloqueio e parry: o alvo é empurrado, perde stamina e fica `STAGGERED` por 0,35 s, o que permite um ataque rápido garantido.
- Fecha o triângulo do duelo: **ataque > empurrão > guarda/parry > ataque**.

**Ataque aéreo e forte de avanço**

- J ou K no ar inicia um único golpe aéreo por pulo, com gravidade e trajetória preservadas. Não permite encadear nem altera a velocidade vertical do alvo (sem juggle).
- Direção para a frente + K inicia o forte de avanço: lunge maior, custo de stamina e recovery maiores. Pode ser bloqueado ou aparado como qualquer forte.
- Ambos usam os dados de movesConfig e as poses de rápido/forte existentes; números em config.

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
- Vida zero: `DEAD`. O round termina.

**Ritmo: poucos golpes, todos importantes**

- Alvo de balanceamento: o derrotado recebe em média **6 a 9 golpes** limpos até o K.O. O total do round soma também os golpes recebidos pelo vencedor e é informado separadamente pelo simulador. Ataque rápido ~10 de dano, forte ~24, riposta ~16, com 100 de vida.
- Bloquear um ataque forte custa caro (~32 de stamina): quem só defende tem a guarda quebrada.

**Stamina**

- Ações gastam stamina. Depois de gastar, há um pequeno atraso antes de regenerar.
- Bloqueando, a regeneração é mais lenta.
- A stamina é o único recurso de defesa. Não existe barra de postura separada.

**Rounds e fim do duelo**

- O duelo é **melhor de 3 rounds** (`gameConfig.duel.roundsToWin`).
- Cada round começa com uma intro curta ("ROUND 1", "ROUND 2", "ROUND FINAL") com os controles travados. Vida, stamina e posições voltam ao início.
- Quando um lutador morre, os controles param e aparece "K.O.". Depois da queda, começa o próximo round ou, se alguém venceu o duelo, aparece a tela de resultado (VITÓRIA ou DERROTA, vencedor, estatísticas do duelo inteiro, Revanche ou Menu principal).
- A HUD mostra os rounds vencidos embaixo de cada nome.

**Eventos de combate**

O `CombatSystem` emite eventos (`hit`, `block`, `guardBreak`, `clash`, `death`, `parry`, `perfectParry`, `shove`, `attackStart`, `dodge`, `actionRejected`). Efeitos, câmera, som e HUD reagem a eventos, nunca ao contrário.

### Boneco de treino

No modo **Treino** (menu), o oponente é um boneco em vez da IA. Com o debug ligado, `F4` alterna o comportamento: parado → bloqueando → atacando.

- F5 grava até 10 s de inputs do jogador; F6 reproduz no boneco em loop. Movimento é relativo à direção de guarda. F4 volta ao comportamento manual e para a reprodução. F7 alterna hitboxes/hurtboxes sem exigir F3. Inputs e estado de gravação aparecem no rodapé.
- O treino não tem limite de rounds: depois de um K.O., começa outro round.
- **Dados de frame**: a cada golpe do jogador que acerta ou é bloqueado, a HUD do treino mostra o golpe, o resultado e a vantagem em segundos (ex.: `Forte · bloqueado · −0,30 s`). Vantagem negativa significa que o oponente age primeiro. O valor é o tempo restante de travamento do defensor menos o do atacante: usa recovery se o ataque continua e stagger se foi aparado (−0,30 s no parry, −0,50 s no perfeito). O dado fica visível até o próximo contato ou round, sem contar hit stop ou câmera lenta.

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

- A IA não reage a cada frame. Ela "pensa" em intervalos (`reactionTime` da dificuldade, com uma variação aleatória de até +40% para não ficar mecânica; nunca mais rápido que o `reactionTime`). Entre um pensamento e outro, segue o plano atual (andar, segurar bloqueio...). Isso simula tempo de reação humano e deixa espaço para o jogador enganar a IA.
- A cada pensamento, ela lê:
  - distância até o jogador (espaço entre os corpos)
  - estado do jogador (atacando, em recovery, atordoado...) e a fase do ataque dele
  - a própria vida e stamina
  - cooldown entre os próprios ataques
- E escolhe, em ordem de prioridade:
  1. **Defender**: se o jogador está começando um golpe que alcança, bloqueia ou esquiva (chance depende do perfil e da dificuldade). Contra um **ataque forte** ainda no startup, pode tentar o **parry**: calcula quando o golpe vai ficar ativo (pela pose, como um humano) e toca o bloqueio na hora certa.
  2. **Punir**: se o jogador está em recovery, atingido, desequilibrado ou atordoado e está no alcance, contra-ataca (ataque forte se houver stamina e o jogador estiver atordoado). Depois de um parry da IA, o ataque rápido vira riposta.
  3. **Empurrar**: se o jogador está bloqueando perto, empurra (chance do perfil × dificuldade).
  4. **Recuperar**: com pouca stamina, recua até uma distância segura.
  5. **Atacar**: no alcance e sem cooldown, ataca com uma chance do perfil (rápido ou forte).
  6. **Guardar**: no alcance do jogador e sem poder atacar, segura o bloqueio por antecipação (ataques rápidos são mais rápidos que a reação da IA).
  7. **Posicionar**: fora do alcance, aproxima. Perto demais (para o perfil), recua um pouco ou espera.
- Cada pensamento tem uma chance de **erro** (hesitar, não defender), que depende da dificuldade.
- **Justiça**: a IA só vê o que o jogador vê (estado e fase do golpe). Ela nunca reage mais rápido que o `reactionTime` e não consegue aparar um ataque rápido por reação.

### Perfis

| Perfil | Comportamento |
| --- | --- |
| **Agressivo** | ataca muito, usa mais ataques fortes, defende pouco, fica perto |
| **Defensivo** | bloqueia e esquiva muito, prefere contra-atacar, mantém distância |
| **Equilibrado** | meio-termo |

O perfil vem do personagem (`characterData.aiProfile`). A Sombra é agressiva.

### Dificuldade

| Dificuldade | Reação | Defesa | Parry (contra fortes) | Empurrão | Erros |
| --- | --- | --- | --- | --- | --- |
| **Fácil** | lenta | rara | nunca | raro | frequentes |
| **Normal** | média | às vezes | às vezes, quase nunca perfeito | às vezes | alguns |
| **Difícil** | rápida (nunca abaixo de 0,15 s) | frequente | frequente, às vezes perfeito | frequente | raros |

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
- **Duelo**: melhor de 3 rounds. Intro de cada round, gameplay e K.O. `Esc` ou `P` pausa.
- **Pausa**: sobreposta ao duelo congelado. Continuar, Reiniciar duelo, Sair para o menu.
- **Resultado**: VITÓRIA ou DERROTA, vencedor e estatísticas do duelo (tempo, golpes, defesas, parries). Revanche ou Menu principal.

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

---

## 15. Elenco planejado

Conceitos aprovados. Entram aos poucos (ver TASKS). Escala de 1 a 5; "Dific." é a dificuldade de jogar com o personagem.

| Personagem | Estilo | Vel. | Alcance | Dano | Defesa | Mobil. | Dific. | Diferencial mecânico |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Guardião** | técnico, fundamentos | 3 | 3 | 3 | 4 | 3 | 1 | bloqueio mais barato; riposta em dois golpes |
| **Sombra** | agressiva | 3 | 3 | 4 | 2 | 3 | 2 | ímpeto: acertar devolve stamina; forte com armadura contra um ataque rápido |
| **Bastião** | tanque pesado | 1 | 3 | 5 | 5 | 1 | 2 | anda bloqueando, não é empurrado no bloqueio; "Firmar" no lugar da esquiva |
| **Vespa** | extremamente rápida, duas lâminas curtas | 5 | 1 | 1 | 2 | 4 | 4 | sequência de 5 ataques rápidos; cada um bloqueado drena stamina extra |
| **Garça** | acrobática | 4 | 2 | 2 | 2 | 5 | 4 | dois ataques aéreos, pulo na parede, esquiva que atravessa o oponente |
| **Espelho** | especialista em parry | 2 | 3 | 3 | 5 | 2 | 4 | janela de parry maior; postura de espera com riposta automática |
| **Haste** | alcance, lâmina em haste | 2 | 5 | 3 | 3 | 2 | 3 | ponto doce: a ponta dá +50% de dano, de perto bate com o cabo |
| **Brasa** | contra-ataque | 3 | 3 | 4 | 3 | 3 | 3 | o forte é uma postura de contra-golpe (leitura, não reação) |
| **Eco** | trapaceiro | 4 | 3 | 2 | 2 | 4 | 5 | finta: cancela o startup do forte; passo-reflexo curto |
| **Forja** | pesada com carga | 2 | 3 | 5 | 3 | 2 | 3 | forte carregável em 3 níveis; o nível 3 quebra a guarda |

### Gramática de golpes

Todos os personagens usam os mesmos inputs. A variedade vem do **conteúdo** de cada golpe, não de comandos novos:

| Input | Golpe |
| --- | --- |
| `J`, `J J`, `J J J` | sequência de ataques rápidos (2 a 5, por personagem); só encadeia se o golpe anterior acertou ou foi bloqueado; Guardião tem 2 rápidos, Sombra 3 |
| `K` | ataque forte |
| `→ + K` | forte de avanço (lunge longo, mais recovery) |
| `J` ou `K` no ar | ataque aéreo |
| `L` toque / segurar | parry / bloqueio |
| `L + J` | empurrão |
| ataque rápido com o oponente desequilibrado | riposta |
| `I` | habilidade exclusiva do personagem |

Finalizadores são só cinemáticos (câmera lenta e lâmina apagando), sem input.

## 16. Modos e progressão planejados

| Modo | Situação |
| --- | --- |
| Versus contra a IA | existe |
| Treino | existe; ganha dados de frame, boneco que grava e reproduz, hitboxes visíveis |
| Tutorial / desafio de parry | planejado (alta prioridade) |
| Arcade (6 lutas + chefe) | planejado |
| 2P local | planejado (depende do gamepad) |
| Sobrevivência | depois do Arcade |
| Torneio, campanha, online | fora do escopo |

Progressão sem grind: no build de portfólio tudo fica liberado. Desafios por personagem liberam só cores de sabre e paletas alternativas. Títulos por marcos de habilidade. Nada afeta atributos.
