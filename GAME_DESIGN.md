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
- **Replay do golpe final**: depois do K.O. que decide o duelo (contra a IA, no Arcade ou em 2 jogadores), os últimos ~3 segundos são reexibidos em câmera lenta (45%), com letterbox e o rótulo REPLAY. `Enter` pula. Pode ser desligado nas Opções ("Replay do golpe final").

**Eventos de combate**

O `CombatSystem` emite eventos (`hit`, `block`, `guardBreak`, `clash`, `death`, `parry`, `perfectParry`, `shove`, `attackStart`, `dodge`, `actionRejected`). Efeitos, câmera, som e HUD reagem a eventos, nunca ao contrário.

### Boneco de treino

No modo **Treino** (menu), o oponente é um boneco em vez da IA. `F4` alterna o comportamento: parado → bloqueando → atacando. As teclas do treino (`F4` a `F7`) não dependem do debug.

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
- **Por personagem**: a ordem das decisões (`priorities`) e os pesos ficam no perfil de cada personagem (`aiConfig.profiles.<personagem>`). Exemplos: o Espelho prefere guardar a atacar e usa a postura contra qualquer golpe que vê chegando; a Haste mantém distância para acertar com a ponta; a Vespa usa o avanço para atravessar fortes; a Forja carrega o golpe quando o oponente está longe; o Bastião anda bloqueando e solta a Marreta quando o oponente insiste; a Brasa espera golpes para usar a postura e pune tudo.
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

As dificuldades também mudam **o jeito** de jogar, não só os números:

| Comportamento | Fácil | Normal | Difícil |
| --- | --- | --- | --- |
| **Aviso antes de atacar** (a IA para um instante antes do golpe) | 0,25 s | 0,08 s | nenhum |
| **Punição inteligente** (usa forte quando a recovery do jogador é longa o bastante) | não | não | sim |
| **Isca de whiff** (recua um passo para o golpe do jogador errar e pune a recovery) | não | às vezes | frequente |
| **Memória de hábitos** (percebe se o jogador abusa de fortes, de bloqueio ou de ataques rápidos e se adapta) | não | não | sim |
| **Habilidade exclusiva** | rara | às vezes | no momento certo |

A memória de hábitos olha só o que o jogador fez (ações vistas), nunca o input. Ela aumenta um pouco a chance da resposta certa: mais parry contra quem abusa do forte, mais empurrão contra quem só bloqueia, mais guarda contra quem só ataca rápido. A IA continua errando às vezes.

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

Conceitos aprovados. Entram aos poucos (ver [TASKS.md](TASKS.md)). Escala de 1 a 5; "Dific." é a dificuldade de jogar com o personagem.

| Personagem | Estilo | Vel. | Alcance | Dano | Defesa | Mobil. | Dific. | Diferencial mecânico |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Guardião** | técnico, fundamentos | 3 | 3 | 3 | 4 | 3 | 1 | bloqueio mais barato; riposta em dois golpes |
| **Sombra** | agressiva | 3 | 3 | 4 | 2 | 3 | 2 | ímpeto: acertar devolve stamina; forte com armadura contra um ataque rápido |
| **Bastião** | tanque pesado | 1 | 3 | 5 | 5 | 1 | 2 | anda bloqueando, não é empurrado no bloqueio; golpe com armadura |
| **Vespa** | extremamente rápida, duas lâminas curtas | 5 | 1 | 1 | 2 | 4 | 4 | sequência de 5 ataques rápidos; cada um bloqueado drena stamina extra |
| **Garça** | acrobática | 4 | 2 | 2 | 2 | 5 | 4 | dois ataques aéreos, pulo na parede, esquiva que atravessa o oponente |
| **Espelho** | especialista em parry | 2 | 3 | 3 | 5 | 2 | 4 | janela de parry maior; postura de espera com riposta automática |
| **Haste** | alcance, lâmina em haste | 2 | 5 | 3 | 3 | 2 | 3 | ponto doce: a ponta dá +50% de dano, de perto bate com o cabo |
| **Brasa** | contra-ataque | 3 | 3 | 4 | 3 | 3 | 3 | postura de contra-golpe forte (leitura, não reação); punições causam mais dano |
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

### Habilidades exclusivas e traços

Cada personagem tem **um traço passivo** (sempre ligado) e **uma habilidade** no botão `I` (gamepad: RB ou RT; preset de setas: `B`). A habilidade é só mais um golpe em dados (`moves.special`), de um destes tipos:

- **golpe**: ataque comum com propriedades extras (armadura, alcance enorme, carga);
- **postura de contra-golpe**: o lutador fica parado em guarda por um tempo curto; um golpe de frente nesse tempo é desviado (o atacante fica desequilibrado) e respondido na hora com um golpe próprio. Se nada vier, a postura termina com recovery e fica punível. É uma **leitura antecipada**, diferente do parry, que é reação;
- **avanço**: dash para a frente, invulnerável no começo, que pode atravessar o oponente.

Armadura: durante o startup (e o active, quando indicado) o golpe aguenta N acertos. O lutador leva o dano (às vezes reduzido), mas não é interrompido. Armadura não protege contra parry, empurrão ou quebra de guarda.

| Personagem | Traço passivo | Habilidade (`I`) |
| --- | --- | --- |
| **Guardião** | bloqueio custa 20% menos stamina | **Contraguarda**: postura curta (0,35 s); responde com a riposta |
| **Sombra** | cada golpe que acerta devolve 6 de stamina | **Ímpeto**: avanço cortante com armadura contra 1 golpe |
| **Bastião** | anda devagar enquanto bloqueia e não é empurrado no bloqueio | **Marreta**: golpe muito lento e pesado, com armadura contra 2 golpes (leva metade do dano) |
| **Vespa** | sequência de 5 rápidos; rápido bloqueado drena stamina extra | **Zumbido**: avanço invulnerável que atravessa o oponente e troca de lado |
| **Espelho** | janelas de parry maiores (perfeito 0,12 s, total 0,26 s) | **Postura de Espera**: postura longa (0,7 s); o golpe que chegar é aparado com efeito de parry perfeito e respondido com a riposta |
| **Haste** | ponto doce: acerto com a ponta (último terço do alcance) dá +50% de dano; de muito perto, 60% | **Varredura**: golpe de alcance enorme e startup lento |
| **Brasa** | +20% de dano contra oponente em recovery, desequilibrado ou atordoado | **Brasa Viva**: postura de contra-golpe (0,5 s) com resposta forte |
| **Forja** | knockback maior em tudo | **Forja**: forte carregável segurando `I` (até 3 níveis); o nível 3 quebra a guarda de quem bloquear |
| **Garça** | **pulo na parede** (pular encostado na parede da arena lança para o outro lado); esquiva que atravessa o oponente; **dois aéreos**: rápido no ar é um corte, forte no ar é um mergulho | **Voo da Garça**: salto alto para a frente que passa por cima do oponente; dá para emendar um aéreo |
| **Eco** | **finta**: tocar a guarda durante a preparação do forte cancela o golpe (custa 12 de stamina); bom para enganar quem espera para aparar | **Passo-reflexo**: passo muito curto e invulnerável na direção apertada (para trás se nenhuma) |

Custos, tempos e números ficam em `src/config/movesConfig.js` e `fightersConfig.js`.

**Carga (Forja)**: apertar `I` começa o golpe; **segurar** `I` prende o golpe no fim da preparação e acumula carga (0,35 s por nível, até 3 níveis). Soltar libera o golpe. Nível 1 = dano normal, nível 2 = +35%, nível 3 = +70% e **quebra a guarda** de quem bloquear. A lâmina brilha mais a cada nível: o oponente sempre vê a carga chegando e pode punir, esquivar ou empurrar. Segurar demais não ajuda: no nível máximo o golpe sai sozinho.

**Ponto doce (Haste)**: o dano depende da distância entre os corpos no acerto, em relação ao alcance do golpe. No último terço do alcance, +50%; no primeiro quarto (muito perto), 60%.

**Brasa Viva (Brasa)**: postura de contra-golpe de 0,5 s; o contra-golpe é um corte rápido e forte (startup 0,08 s), não a riposta comum.

**Finta (Eco)**: só no ataque forte e só antes de ficar ativo. A finta gasta stamina, volta o lutador para a guarda e emite o evento `feint` (som curto, sem faíscas). Contra a finta: não apertar a guarda cedo demais, ou empurrar.

**Pulo na parede (Garça)**: no ar, encostado na parede da arena, apertar pulo lança a Garça para longe da parede. Um por vez: precisa tocar o chão ou a outra parede para repetir.

## 16. Tutorial e desafio de parry

**Tutorial** (menu → Tutorial): duelo contra o boneco de treino, sem rounds e sem morte (a vida dos dois volta ao máximo). Uma instrução curta aparece no topo, com as teclas do preset ativo e o progresso. Cada passo termina sozinho quando o jogador faz a ação; o boneco muda de comportamento conforme o passo.

| Passo | O que fazer | Boneco |
| --- | --- | --- |
| Andar | andar para a frente e para trás | parado |
| Ataque rápido | acertar 2 rápidos | parado |
| Sequência | acertar o 2º golpe de uma sequência | parado |
| Ataque forte | acertar 1 forte | parado |
| Bloquear | bloquear 2 golpes | ataca com rápidos |
| Aparar | aparar 2 fortes | ataca com fortes |
| Riposta | acertar 1 riposta | ataca com fortes |
| Empurrão | empurrar 1 vez | bloqueia |
| Habilidade | usar a habilidade (`I`) 1 vez | parado |

No fim, a tela de resultado oferece o desafio de parry.

**Desafio de parry** (menu → Desafio de parry, ou depois do tutorial): 45 segundos contra o boneco, que se aproxima e lança **só ataques fortes** (que dá para aparar por reação) em intervalos aleatórios. Parry vale 1 ponto, parry perfeito vale 2. Golpes recebidos não tiram pontos, mas aparecem no resumo. O recorde fica salvo no navegador (`settings.parryChallengeBest`).

## 17. Arcade

Menu → Arcade → escolha do lutador → uma sequência de duelos (melhor de 3 cada).

- **Adversários**: todos os outros personagens selecionáveis, na ordem do elenco, até 6. Depois vem o **chefe**.
- **Dificuldade crescente**: os dois primeiros duelos no Fácil, os dois seguintes no Normal e o resto no Difícil (`gameConfig.arcade.difficulties`).
- **Arenas**: em rodízio pela lista de arenas.
- **Chefe: Sombra Desperta.** Versão mais forte da Sombra: mais vida (150), forte mais pesado, silhueta com ombreiras. Joga no Difícil. Quando cai abaixo da metade da vida, **desperta**: aparece a mensagem "A SOMBRA DESPERTA", as barras do letterbox pulsam e a IA passa para a dificuldade `boss` (reage no limite humano, completa sequências, pune quase tudo). O chefe não aparece na seleção de personagem.
- **Resultado**: vencer leva à próxima luta ("Próxima luta"); perder permite tentar a mesma luta de novo. Vencer o chefe mostra "ARCADE CONCLUÍDO" e salva no navegador que aquele personagem fechou o Arcade (`settings.arcadeCleared`), para a progressão futura (cores de sabre).
- Uma linha no topo mostra a luta atual: "ARCADE · LUTA 2 DE 4 · BASTIÃO" ou "ARCADE · CHEFE · SOMBRA DESPERTA".

## 18. Desafios e cores de lâmina

Progressão só cosmética, sem grind: cada personagem tem a cor padrão e **duas cores alternativas**.

- **Cor do Arcade**: liberada ao vencer o Arcade com o personagem.
- **Cor do desafio**: liberada ao **vencer um duelo contra a IA** (Duelar ou Arcade, qualquer dificuldade) cumprindo o desafio do personagem no duelo inteiro:

| Personagem | Desafio |
| --- | --- |
| Guardião | 3 parries perfeitos |
| Sombra | 200 de dano causado |
| Bastião | 12 defesas |
| Vespa | acertar a sequência completa de 5 |
| Espelho | 4 parries perfeitos |
| Haste | 15 golpes acertados |
| Brasa | 3 contra-golpes da postura |
| Forja | 2 quebras de guarda |

- Na seleção de personagem, `←`/`→` troca a cor entre as liberadas. Uma linha mostra a cor atual e o próximo desafio ainda bloqueado.
- Quando um duelo libera uma cor, a tela de resultado avisa.
- As liberações ficam salvas no navegador (`settings.unlocks` e `settings.arcadeCleared`).

## 19. Sobrevivência

Menu → Sobrevivência → escolha do lutador → adversários em sequência até perder.

- Cada luta tem **um round**. A vida **não volta cheia**: a cada vitória o jogador recupera 30% da vida máxima.
- Os adversários são sorteados entre os personagens selecionáveis. A dificuldade sobe com as vitórias: as 2 primeiras no Fácil, as 3 seguintes no Normal e depois Difícil. A cada 5 vitórias, o adversário é o chefe Sombra Desperta.
- A arena muda a cada luta. Sem replay entre as lutas, para manter o ritmo.
- A pontuação é o número de vitórias; o recorde fica salvo (`settings.survivalBest`).
- A faixa do topo mostra "SOBREVIVÊNCIA · VITÓRIAS n · ADVERSÁRIO".

## 20. Dois jogadores (local)

Menu → 2 Jogadores → o Jogador 1 escolhe o lutador com os controles dele, o Jogador 2 escolhe o dele com os próprios controles, e o Jogador 1 escolhe a arena. Melhor de 3, com as mesmas regras do duelo contra a IA.

| | Jogador 1 | Jogador 2 |
| --- | --- | --- |
| Mover / pular | A, D / W | ← → / ↑ |
| Rápido, forte, guarda | F, G, H | J, K, L (ou Numpad 1, 2, 3) |
| Esquiva | Shift esquerdo | Shift direito (ou Numpad 0) |
| Habilidade | T | I (ou Numpad 5) |
| Controle | o 1º conectado | o 2º conectado |

Os dois podem pausar (J1: Esc ou P; J2: P ou Start). A HUD mostra "J1" e "J2" antes dos nomes e o resultado diz qual jogador venceu.

## 21. Modos e progressão planejados

| Modo | Situação |
| --- | --- |
| Versus contra a IA | existe |
| Treino | existe; ganha dados de frame, boneco que grava e reproduz, hitboxes visíveis |
| Tutorial / desafio de parry | existe |
| Arcade (até 6 lutas + chefe) | existe |
| 2P local | existe |
| Sobrevivência | existe |
| História (campanha) | existe desde a v2 (seção 23) |
| Torneio, online | fora do escopo |

Progressão sem grind nos modos de duelo: desafios, Arcade e finais da História liberam só cores de lâmina, trajes e os personagens secretos; nada muda os atributos do elenco. A única progressão de atributos é a do protagonista da História, limitada por teto e total por dificuldade.

## 21.1. Movimento v1.3: esquiva de precisão

EVADE (S/baixo) é separado do dash (Shift). No chão, consome zero stamina, recua poucos pixels, fica invulnerável por 0,066 s e recupera até 0,4 s. Sem contato, a recuperação é vulnerável. Quando uma hitbox cruza a hurtbox na janela, EVADE_SUCCESS consome esse contato e libera o defensor imediatamente para punir, sem dano nem ganho de stamina. Repetir a ação exige novo toque; nenhuma defesa passiva ao segurar baixo. Config global pode desligar a mecânica; arquétipos podem fornecer perfil completo em stats.evade.

Pulo duplo (v1.13): todos os arquétipos usam movement.maxJumps = 2. Novo toque no ar aplica 70% da velocidade vertical do primeiro pulo; a Vespa, 90% (é a identidade dela no ar, junto com o dash aéreo mais barato). jumpsUsed zera ao tocar o chão ou reiniciar round. Pulo na parede tem prioridade e preserva quantos pulos já foram gastos; não devolve o aéreo. Pulo duplo não rearma ataque aéreo (um por voo), evitando sequências no ar.

**Dash aéreo (v1.13).** A esquiva (Shift, B no controle, botão Esquiva no toque) apertada no ar vira um dash curto na horizontal: uma vez por salto, custa stamina (18; Vespa 8), segue a direção apertada (sem direção, vai para a frente), dá uma pequena elevação e atravessa o corpo do oponente. Não tem invulnerabilidade: um golpe que pegue o dash acerta. Para trocar de lado é preciso pular, passar por cima e acertar o tempo; o lutador só se vira ao pousar. Sem stamina ou com o dash já usado, a esquiva no ar é recusada com o mesmo aviso da stamina. Perfil em `airDashConfig` (com override por arquétipo).

## 21.2. Atributos v1.4

Vida, Stamina, Lâmina, Defesa, Agilidade e Fluxo usam a **escala 7/8/9/10** (v1.12): o elenco comum vai de 1 a 7; só os secretos passam disso, pelo potencial (Ancião até 8, Soberano até 9, Predestinado até 10). Nota 4 tem multiplicador 1; cada nota muda 8% (1 = 0,76; 7 = 1,24; 10 = 1,48). As bases por arquétipo preservam os stats do elenco, inclusive o chefe: a troca de escala não mudou nenhuma luta entre personagens comuns. A conversão da escala antiga (1–9) é uma regra só, usada no elenco e no save: atributos físicos `arredondar(1 + 0,75 × (nota − 1))`; Fluxo `nota − 1`, que preserva toda diferença de Fluxo entre o elenco. Vida muda vida máxima; Stamina muda máximo e regeneração; Lâmina muda todos os danos e dá pequeno bônus de parry perfeito. Defesa muda custo da guarda, recuo e reserva de stamina para evitar quebra, sem reduzir dano recebido. Agilidade muda caminhada, pulo, avanços e janela do EVADE, sem devolver ataques aéreos. Fluxo define o nível dos poderes (seção 22). Só o protagonista da História distribui pontos (seção 23).

## 22. Fluxo e poderes (v2)

O Fluxo é a energia dos poderes. Nomes de tela em `uiConfig`; no código, `power`. Tudo roda na simulação e é testável no simulador.

**Regra por modo.** Os poderes só valem quando `rules.powers` está ligado: Duelar, 2 Jogadores e Treino seguem a opção **Poderes** (ligada por padrão); Arcade, Sobrevivência, Tutorial e Desafio de parry continuam no duelo clássico da v1.0. Sem a regra, não há medidor nem poderes.

**Nível e medidor.**

- **Nível do Fluxo** (1–7 no elenco comum; 8, 9 e 10 nos secretos, pelo potencial) vem do atributo Fluxo. Ele define a potência, o ganho do medidor, a resistência e a cor da energia.
- **Medidor** (0–100): começa cada round com 20, enche devagar com o tempo e mais rápido ao acertar, ao ser atingido, ao bloquear e ao aparar. É separado da stamina.
- Depois de qualquer poder há uma recarga curta, igual para todos os poderes do lutador.

**Interações pelo Fluxo.** Diferença de Fluxo = nível de quem lança − nível do alvo (positiva quando quem lança é mais forte). Cada habilidade tem a própria tabela de faixas em dados; cada faixa diz a escala do efeito, se a guarda vale, quanto dano e quanto recuo passam pela guarda, o gasto de stamina na guarda e a escala de duração e de desequilíbrio. Falhar é sempre por limiar, nunca por sorte. Resultado atual, igual para Repulsão, Puxão e Raio:

| Diferença | Resultado |
| --- | --- |
| −1 ou mais | efeito normal |
| −2 | efeito reduzido (metade) |
| −3 ou menos | resistido: o poder bate numa barreira e não tem efeito |

Na guarda, o Puxão não causa dano e puxa pela metade; o Raio causa um quarto do dano.

**Repulsão pela diferença (v1.14).** A Repulsão tem faixas próprias, simétricas: quem lança acima fura a guarda; quem lança abaixo empurra menos.

| Diferença | Sem guarda | Com guarda |
| --- | --- | --- |
| +3 ou mais | normal | não pode ser bloqueada: empurra, causa dano e desequilibra |
| +2 | normal | a guarda segura, mas metade do dano passa, o defensor desliza o dobro e gasta 1,5× a stamina |
| +1 | normal | a guarda segura com um quarto do dano e 75% do deslize |
| 0 | normal | a guarda segura sem dano, com metade do deslize |
| −1 | normal | a guarda segura sem dano, com 35% do deslize e 0,75× a stamina |
| −2 | metade do dano e do desequilíbrio, **não empurra** o mais forte | não desliza e gasta metade da stamina |
| −3 ou menos | resistida | resistida |

**Catálogo, categorias e loadout (v1.15).** As habilidades ficam num catálogo por categoria (`powersConfig.categories`); o alinhamento só libera categorias, e cada personagem tem um loadout em dados (`characterData.loadout`):

| Categoria | Alinhamento | Habilidades |
| --- | --- | --- |
| Fluxo comum | os dois | Repulsão, Puxão (Arremesso e Redirecionamento entram nas próximas etapas) |
| Aurora | Aurora | Barreira (Cura e Foco nas próximas etapas) |
| Eclipse | Eclipse | Raio (Estrangular, Tempestade e Congelar nas próximas etapas) |
| Técnicas de lâmina | os dois | Giro, Avanço com corte (Arremesso da lâmina na próxima etapa); custam stamina e escalam com a Lâmina |

**Comandos.** Nenhum botão novo. `Poder` + direção (neutro, frente, trás) escolhe entre até três habilidades do Fluxo; `Habilidade` + direção escolhe entre a habilidade própria (neutro) e até duas técnicas de lâmina (frente, trás). Espaço vazio cai no neutro. Técnicas só valem com a opção Poderes (os modos clássicos não mudam). O Eco e o Predestinado não têm técnicas: o avanço deles já segue a direção.

- **Giro** (técnica): a lâmina dá a volta no corpo e acerta dos dois lados; quem estava atrás não consegue bloquear (a guarda só vale de frente).
- **Avanço com corte** (técnica): avanço longo que termina num corte; recuperação longa se errar.

**Loadouts atuais.** Aurora (Guardião, Bastião, Vespa, Espelho, Garça, Ancião, Predestinado): Repulsão (neutro) e Barreira (trás). Eclipse (Sombra, Haste, Brasa, Forja, Eco, chefe do Arcade, Soberano): Raio (neutro) e Puxão (frente). Técnicas: Avanço com corte para Guardião, Vespa e Brasa; Giro para Bastião, Espelho, Haste, Forja, Garça, Ancião e Soberano; os dois para a Sombra e o chefe do Arcade. O protagonista recebe os poderes do caminho (`storyConfig.protagonist.loadouts`) e as técnicas do personagem-base do estilo.

| Poder | Alinhamento | Comando | Efeito |
| --- | --- | --- | --- |
| Repulsão | Aurora | Poder | onda à frente: afasta e desequilibra (STAGGERED); com guarda, só recua e gasta stamina |
| Barreira | Aurora | trás + Poder (segurar) | domo enquanto segura e há medidor: absorve poderes e segura golpes de lâmina sem gastar stamina; o Empurrão de corpo quebra |
| Raio | Eclipse | Poder (segurar) | canalizado: dano em pulsos curtos com pequeno recuo; a guarda reduz o dano a um quarto e gasta stamina; entre pulsos o alvo pode agir |
| Puxão | Eclipse | frente + Poder | traz o alvo para perto e o desequilibra: abre punição |

- Quem lança fica vulnerável na preparação: um golpe interrompe o poder.
- Esquiva e EVADE com invulnerabilidade fazem o poder passar. O dash aéreo não tem invulnerabilidade.
- **No ar** não há guarda contra poderes, e o alcance vertical cobre o pulo duplo (`powersConfig.airReach`). Quem está no ar sofre o modificador aéreo da habilidade: a Repulsão empurra 30% mais e desequilibra 20% mais, o Puxão desequilibra 20% mais e o Raio prende 60% mais a cada pulso.
- A Barreira contra a Repulsão segura, mas o dono recua um pouco.
- Poderes não têm projétil: o efeito é decidido no instante ativo (Repulsão e Puxão) ou em cada pulso (Raio).
- Nomes de tela em `uiConfig.texts.powers`; os ids no código são `push`, `pull`, `lightning` e `barrier`.

**Elenco.** Aurora: Guardião, Bastião, Vespa, Espelho, Garça. Eclipse: Sombra, Haste, Brasa, Forja, Eco. Chefe do Arcade: Eclipse, nível 7.

## 23. História (v2)

Campanha linear com um protagonista criado pelo jogador. Textos em `src/config/storyTexts.js`; regras e encontros em `src/config/storyConfig.js`.

**Criação.** Seis passos: nome (lista pronta ou digitado, até 16 caracteres), Caminho do Fluxo (Aurora ou Eclipse, que definem os poderes), estilo de luta (Técnica, Fúria ou Voo: usam golpes e habilidade do Guardião, da Sombra ou da Garça), visual (Errante, Vigia ou Peregrino), cor da lâmina e dificuldade. Logo depois, o jogador distribui os pontos iniciais.

**Atributos e progressão.** Todos começam em 3 (total 18) com 3 pontos livres. Cada vitória dá 2 pontos. Um ponto sobe uma nota em 1, respeitando:

| Dificuldade | Teto por atributo | Total máximo |
| --- | --- | --- |
| Fácil | 7 | 33 |
| Normal | 6 | 30 |
| Difícil | 5 | 28 |

O total máximo impede um protagonista com tudo no teto: ele termina forte, mas especializado (o elenco comum tem totais entre 24 e 32; o chefe do Arcade, 35). O teto do Fluxo também decide a interação contra os chefes: contra o Soberano (Fluxo 9), o Fácil chega a −2 (poderes pela metade), o Normal a −3 e o Difícil a −4 (resistidos; a luta vira de lâmina). Os chefes são medidos no simulador (ARCHITECTURE → Balanceamento → escala v1.12): o Soberano é vencível em todas as dificuldades e o Predestinado, sempre com IA de chefe, é muito difícil, mas possível.

**Poderes.** O protagonista começa só com o poder principal do caminho; o segundo vem como recompensa de um capítulo. Na História os poderes estão sempre ligados.

**Encontros.** Cada encontro tem adversário, arena, ajuste de dificuldade da IA (`aiOffset`) e diálogo antes e depois. Um round decide o duelo. Derrota: tentar de novo ou voltar à História, sem perder progresso. Vitória: diálogo, pontos e o próximo encontro.

**Rotas e finais como dados.** Um encontro pode ter `outcomes`: a primeira condição verdadeira (`always`, `healthRatioAbove`, `alignmentIs`) escolhe o próximo encontro ou um final. Finais liberam personagens. O alinhamento muda falas (texto com variantes `light`/`dark`), poderes e recompensas, não a sequência de missões.

## 24. Personagens secretos e segredo da intro (v2)

| Personagem | Base | Notas | Alinhamento | Ideia |
| --- | --- | --- | --- | --- |
| Ancião | Garça (acrobacia) | potencial +1 (até 8): Vida 6, Stamina 6, Lâmina 6, Defesa 8, Agilidade 7, Fluxo 8 | Aurora | Mestre da Aurora: defesa e técnica acima de todos |
| Soberano | Haste (alcance) | potencial +2 (até 9): Vida 7, Stamina 6, Lâmina 6, Defesa 6, Agilidade 4, Fluxo 9 | Eclipse | Vence de longe com Raio e Puxão; colado, é lento |
| Predestinado | Eco (fintas) | potencial +3 (até 10): Vida 8, Stamina 8, Lâmina 9, Defesa 7, Agilidade 9, Fluxo 10 | Aurora | O ápice: único no tier vermelho do Fluxo |

**Escala 7/8/9/10.** O elenco comum vai até 7 em todos os atributos (`attributesConfig.maxRating`). Secretos têm `potential` (+1, +2, +3): o teto de todos os atributos sobe nesse valor (8, 9 e 10), e a tela de seleção mostra os segmentos extras em dourado (`attributePotential`). Tiers do Fluxo: azul até 7 (todo o elenco), roxo em 8–9 (Ancião e Soberano), vermelho só no 10 (Predestinado).

- Não aparecem na seleção até serem liberados. Liberação salva no navegador (`settings.unlockedCharacters`).
- **Pela História**: vencer o Soberano libera o Soberano; vencer o Predestinado (final secreto) libera o Predestinado; terminar a campanha pelo Caminho da Aurora (qualquer final) libera o Ancião.
- **Pelo segredo da intro**: uma sequência digitada no teclado, feita no direcional/stick ou tocando o título várias vezes libera os três de uma vez, com som e frase próprios. As sequências ficam em `src/config/secretsConfig.js`; a tela não dá pista.
- **Final secreto**: na História, vencer o Soberano com mais de 75% de vida leva ao duelo contra o Predestinado em vez do final normal. Esse duelo usa sempre a IA de chefe, em qualquer dificuldade.
- **Trajes**: outra sequência da intro (teclado, direcional ou toques na frase de apoio) libera todas as skins de todos os personagens, sem mexer nas cores de lâmina.
- Equilíbrio medido com poderes ligados (40 duelos por par, v1.12): Ancião 64% (Normal) e 79% (Difícil), média 72%; Soberano 77% e 75%, média 76%; Predestinado 84% e 83%, média 84%. Ordem Ancião < Soberano < Predestinado, todos propositalmente acima do elenco.

## 25. Skins e personalização

O elenco tem Original, Viajante (vencer Arcade com o lutador) e Sentinela (concluir qualquer final da História). Secretos têm Original e Legado (final secreto). São cosméticas: paleta e peças existentes, sem alterar atributos, golpes ou lâmina. A cor da lâmina continua independente. Skins bloqueadas são puladas na seleção, que mostra o requisito pendente. As escolhas de ambos os lados permanecem ao reiniciar ou jogar revanche e nas escadas.

O protagonista escolhe Errante, Vigia ou Peregrino desde o início, em um passo Visual. O nome pode vir da lista ou ser digitado com teclado nativo, até 16 caracteres. O visual e o nome acompanham o save da campanha.
