# GAME DESIGN — Star Wars: Duel of Fates

Regras aprovadas da disputa v3 (2.5): [versions/v3.md](versions/v3.md), seção "Notas de implementação da 2.5". A capacidade `bladeLock` vale em Duelar, 2 Jogadores e Treino, com ou sem Poderes. Fortes elegíveis em contato ativo iniciam uma disputa de pressões limitada no tempo e na frequência; outros contatos mantêm o clash curto. A disputa suspende ações, movimento, regeneração, status e cooldowns dos participantes. Vitória causa dano e perda de Vigor uma única vez; empate só separa. Recuperação, separação e proteção de saída impedem converter pressões em ataque ou garantir um forte seguinte. A opção de segurar produz pressões pelo controlador, abaixo do teto, e o replay registra os intents resultantes.

Regras aprovadas da simulação v3 (2.4): [versions/v3.md](versions/v3.md), seções "Notas de implementação da 2.4" e "Especificação aprovada → Combate". Capacidades `exhaustion`, `wounds` e `focusEvade` habilitam as consequências em Duelar, 2 Jogadores e Treino; demais modos preservam a v2 até suas etapas. Dano efetivo de qualquer categoria, inclusive periódico, interrompe a Cura; dano absorvido não interrompe. Apresentação e calibração entram depois da simulação.

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
- Um ataque só pode cancelar a recuperação para o próximo rápido declarado em `cancelsInto`, depois de acertar, ser bloqueado, ser aparado ou se chocar com outro rápido (2.23). No whiff a rota não abre. Interrompem o combo o hit recebido, o parry perfeito num forte e o clash com um forte.

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
- **Quebra de guarda**: se o defensor não tiver stamina para o bloqueio, a stamina zera e ele fica `STUNNED` (1,2 a 1,4 s pelo arquétipo desde a 2.23, para dar tempo de reagir e conectar um forte que fere).

**Parry (aparar)**

O parry é a defesa ativa. Usa o mesmo botão do bloqueio: **tocar** abre a janela de parry, **segurar** continua sendo bloqueio normal.

| Tempo desde o toque | Resultado se um golpe chegar pela frente |
| --- | --- |
| 0 a 0,08 s | **Parry perfeito** |
| 0,08 a 0,20 s | **Parry** |
| depois | bloqueio normal |

- **Parry** (revisto na 2.23, pedido do autor): nenhum dano e nenhum custo para o defensor, que fica livre na hora. O atacante perde a stamina do bloqueio daquele golpe, o golpe deixa de acertar e segue para a recuperação, **sem desequilíbrio**. Num rápido, o combo continua: o próximo rápido sai pela rota de encadeamento, e a recuperação pode ser trocada por bloqueio ou outra ação. Num forte, sobra a recuperação longa do forte para o defensor punir.
- **Parry perfeito**: perde o dobro de stamina, e o defensor recupera 15 de stamina. Contra um **forte**, e só nesse caso, o atacante perde o golpe e fica `STAGGERED` por 0,50 s, o que **garante um ataque forte** ou a riposta. Contra um rápido, vale como o parry: desvia sem desequilíbrio.
- **Parry falho**: se a janela acabar sem nenhum golpe, a janela não abre de novo por 0,40 s (o bloqueio continua funcionando). Isso impede apertar o botão sem parar.
- O toque precisa ser novo: segurar o bloqueio não abre janela ao sair de um hitstun. Um toque durante o blockstun abre a janela (aparar o próximo golpe de uma sequência).
- O empurrão não pode ser aparado.
- **Por que o parry não vira "esperar o outro atacar"**: o ataque forte (startup ~0,33 s) pode ser aparado por reação; o ataque rápido (startup 0,10 s) não, só por leitura. Quem só espera leva ataques rápidos e empurrões e perde stamina bloqueando.
- Valores por arquétipo em `fightersConfig.<arquétipo>.parry`.

**Riposta**

- Um ataque rápido apertado enquanto o oponente está desequilibrado por um parry perfeito num forte vira a **riposta**: golpe próprio, mais rápido (startup 0,06 s), sem custo de stamina e com mais dano que o ataque rápido.
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
- **Rápido contra rápido** (2.23, pedido do autor): só mostra que as lâminas se encontraram (faíscas, som e tremor do clash). Os dois golpes deixam de acertar, um empurrão curto separa os lutadores e ninguém entra em recuo. Os dois continuam livres: o combo segue pela rota de encadeamento, e a recuperação pode ser trocada por bloqueio, parry, esquiva, empurrão ou poder.
- **Com um forte envolvido**: os dois ataques são cancelados, os dois são empurrados para trás e ficam um instante em recuo (`HIT`, sem dano). Dois fortes elegíveis iniciam a disputa (2.5).
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
  2. **Punir**: se o jogador está em recovery, atingido, desequilibrado ou atordoado e está no alcance, contra-ataca (ataque forte se houver stamina e o jogador estiver atordoado). Depois de um parry perfeito da IA num forte, o ataque rápido vira riposta.
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

Conceitos aprovados. Entram aos poucos (ver [versions/TASKS.md](versions/TASKS.md)). Escala de 1 a 5; "Dific." é a dificuldade de jogar com o personagem.

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

Cada personagem tem **um traço passivo** (sempre ligado) e **uma habilidade** no botão `I` (gamepad: RB; preset de setas: `B`). A habilidade é só mais um golpe em dados (`moves.special`), de um destes tipos:

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
| Quebra de guarda | quebrar a guarda 1 vez (o boneco fica exausto) | bloqueia |
| Ferimento | ferir o boneco exausto com um forte | bloqueia |
| Disputa de lâminas | vencer 1 disputa: forte, e depois o ataque rápido repetido (ou segurado, com a opção) | fica a uma distância em que só as lâminas se encontram, responde ao forte com o próprio forte e aperta devagar (3 por segundo) |
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
- Depois de qualquer poder há uma recarga compartilhada pelos poderes do lutador: 1,2 s, exceto o Arremesso, cuja faixa define a recarga.

**Interações pelo Fluxo.** Diferença de Fluxo = nível de quem lança − nível do alvo (positiva quando quem lança é mais forte). Cada habilidade tem a própria tabela de faixas em dados; cada faixa diz a escala do efeito, se a guarda vale, quanto dano e quanto recuo passam pela guarda, o gasto de stamina na guarda e a escala de duração e de desequilíbrio. Falhar é sempre por limiar, nunca por sorte. Faixas básicas do Puxão e do Raio (a Repulsão tem a tabela própria abaixo):

| Diferença | Resultado |
| --- | --- |
| −1 ou mais | efeito normal |
| −2 | efeito reduzido (metade) |
| −3 ou menos | resistido: o poder bate numa barreira e não tem efeito |

Na guarda, o Puxão não causa dano e puxa pela metade; o Raio causa um quarto do dano.

Alcance do Puxão por tier do Fluxo de quem lança (v2.16): Tênue 330 px, Firme 380 px, Profundo 430 px, Ápice 480 px. A força da puxada não muda.

**Ajustes do autor na 2.7.** O Raio alcança 480 px (era 300). A Repulsão empurra mais longe pelo tier de quem lança: Tênue 950, Firme 1150, Profundo 1400, Ápice 1650 (velocidade inicial, antes da potência e da tabela de interação); a Repulsão Suprema não muda. Na disputa de lâminas, vence quem abrir 5 pressões de vantagem (era 4), o limite de tempo sobe para 3 s e a IA só começa a apertar depois de um tempo de reação (Fácil 0,6 s, Normal 0,45 s, Difícil e chefe 0,3 s), para o jogador ter tempo de perceber a disputa.

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
| Fluxo comum | os dois | Repulsão, Puxão, Arremesso, Truque Mental, Repulsão Suprema, Fratura |
| Aurora | Aurora | Barreira, Cura, Foco, Absorção, Santuário, Telecinese em Massa, Corte de Fluxo |
| Eclipse | Eclipse | Raio, Estrangular, Congelar, Tempestade, Ira, Dreno, Arsenal Telecinético |
| Técnicas de lâmina | os dois | Giro, Avanço com corte, Arremesso da lâmina; custam stamina e escalam com a Lâmina |

**Comandos.** Nenhum botão novo. `Poder` + direção (neutro, frente, trás) escolhe entre até três habilidades do Fluxo; `Habilidade` + direção escolhe entre a habilidade própria (neutro) e até duas técnicas de lâmina (frente, trás). Espaço vazio cai no neutro. Técnicas só valem com a opção Poderes (os modos clássicos não mudam). O Eco e o Predestinado não têm técnicas: o avanço deles já segue a direção.

- **Giro** (técnica): a lâmina dá a volta no corpo e acerta dos dois lados; quem estava atrás não consegue bloquear (a guarda só vale de frente).
- **Avanço com corte** (técnica): avanço longo que termina num corte; recuperação longa se errar. No acerto, o atordoamento próprio (0,72 s, desde a 2.21) deixa quem acertou livre primeiro (+3 a +5 quadros no elenco), mas sem tempo para um rápido garantido; defendido ou errado, continua punível.
- **Arremesso** (Fluxo comum, v1.16): arranca um fragmento da arena e o lança em linha reta. O tamanho vem da faixa de Fluxo de quem lança, e cada faixa tem dano, velocidade, empurrão, desequilíbrio, custo e recarga próprios:

| Fluxo | Tamanho | Dano | Velocidade | Custo | Recarga |
| --- | --- | --- | --- | --- | --- |
| 1–3 | pequeno | 6 | 760 | 30 | 1,0 s |
| 4–5 | médio | 8 | 700 | 34 | 1,1 s |
| 6–8 | grande | 11 | 620 | 40 | 1,3 s |
| 9 | muito grande | 14 | 560 | 44 | 1,4 s |
| 10 | máximo | 17 | 520 | 48 | 1,5 s |

  No impacto valem a tabela de interação (resistido a −3 ou menos), a guarda de frente (um quarto do dano passa), a Barreira (absorve) e a invulnerabilidade da esquiva (passa através). Some ao bater na parede.
- **Arremesso da lâmina** (técnica, v1.16): a lâmina sai girando para a frente, vai até um alcance que cresce com a Lâmina (480 px na Lâmina 4; 20 px por ponto, entre 400 e 580 px; era 380, entre 320 e 460, até a 2.7) e volta para a mão. Acerta uma vez (na ida ou, se errou, na volta); a guarda de frente bloqueia e a Barreira absorve, e a lâmina volta mesmo assim. Enquanto ela não volta, o lutador não ataca, não bloqueia e não apara com a lâmina (empurrão, esquiva e poderes continuam valendo).

**Efeitos de estado (v1.17).** Duram um tempo e ficam no lutador.
- **Estrangular** (Eclipse, 240 px): custa 45, prende o alvo (não age) e drena vida enquanto dura (0,5 s, 4 de dano por segundo). +3 ou mais fura a guarda; −2 dura metade e drena metade; −3 ou menos falha. Janela reduzida na v1.19 para limitar a punição garantida.
- **Congelar** (Eclipse, 340 px): prende o alvo por 1,1 s sem dano; o primeiro dano quebra o gelo (janela de punição). −1 dura 75%, −2 dura 40%, −3 ou menos não tem efeito; +3 fura a guarda.
- **Foco** (Aurora, em si): por 4 s × potência, atacar, bloquear e esquivar custam metade da stamina (drenos como empurrão e quebra de guarda não mudam).
- **Cura** (Aurora, em si): custa 40, devolve vida ao longo de 2 s, até 14 × potência e nunca mais que 35% da vida perdida; ser atingido interrompe. Custo reduzido na v1.19.

**Redirecionamento e Tempestade (v1.18).** Histórico: na 2.17 o Redirecionamento foi substituído pela Absorção e a Tempestade foi reformulada em fases (seção 27).

- **Redirecionamento** (Fluxo comum): custa 18, prepara por 0,05 s e abre uma janela de 0,3 s para um pulso de Raio em alcance, com o canal do oponente aberto. Consome a janela uma vez; se não houver Raio, expira. Interrupção ou fim do poder remove a janela. Recuperação de 0,2 s, recarga comum. A diferença abaixo é de quem redireciona menos quem canaliza; não há sorteio.

| Diferença | Absorção do pulso | Retorno ao canalizador | Ganho de medidor |
| --- | --- | --- | --- |
| +1 ou mais | 100% | 6 × potência e 0,25 s de desequilíbrio | 12 × ganho |
| 0 | 100% | 4,5 × potência e 0,25 s de desequilíbrio | 8 × ganho |
| −1 | 50% | 1,5 × potência e 0,25 s de desequilíbrio | nenhum |
| −2 | falha, sofre o pulso | nenhum | nenhum |
| −3 ou menos | falha, sofre o pulso + 5 de dano e 0,25 s de desequilíbrio | nenhum | nenhum |

O retorno interrompe o canal. A parcela não absorvida causa hit; a falha extrema causa stagger em quem tentou. Ganhos normais por sofrer dano continuam valendo. A reação abre antes da resolução dos canais no mesmo passo, independentemente do lado do jogador.

- **Tempestade** (Eclipse): exige Fluxo 6, custa 20 e drena 25/s; preparação de 0,35 s, canal segurado até 1,2 s e recuperação de 0,4 s. A área circular tem raio 240 px entre os centros dos corpos, inclui atrás e acima e não usa a extensão vertical dos poderes direcionais. Cada pulso de 0,2 s causa 8 × intensidade × potência, sem travar movimento. Diferença −2 reduz à metade; −3 ou menos é resistida; +3 aumenta a escala para 1,2 e ignora guarda. Nas outras faixas, guarda frontal deixa passar um quarto do dano e custa 6 de stamina; Barreira e invulnerabilidade continuam funcionando. Soltar, ficar sem medidor ou sofrer interrupção encerra o canal pelas regras existentes.

Loadouts da v1.18: Garça troca Barreira por Redirecionamento (trás + Poder); Soberano troca Puxão por Tempestade (frente + Poder). Demais espaços e atributos permanecem iguais. IA reage ao Raio com Redirecionamento a partir de diferença −1 e usa Tempestade de perto, respeitando o requisito de Fluxo.

**Loadouts atuais (v1.19; Absorção no lugar do Redirecionamento desde a 2.17).** Direções relativas à frente do lutador. Todos os espaços abaixo vêm de `characterData.loadout`; a lista de golpes mostra os comandos do preset ativo.

| Personagem | Poder neutro | Frente + Poder | Trás + Poder | Frente + Habilidade | Trás + Habilidade |
| --- | --- | --- | --- | --- | --- |
| Guardião | Repulsão | Cura | Barreira | Avanço com corte | Arremesso da lâmina |
| Sombra | Raio | Puxão | Estrangular | Avanço com corte | Giro |
| Bastião | Repulsão | Absorção | Barreira | — | Giro |
| Vespa | Repulsão | Arremesso | Barreira | Avanço com corte | Arremesso da lâmina |
| Espelho | Repulsão | Arremesso | Barreira | — | Giro |
| Haste | Raio | Puxão | Arremesso | — | Giro |
| Brasa | Raio | Puxão | Congelar | Avanço com corte | Arremesso da lâmina |
| Forja | Raio | Puxão | Arremesso | Arremesso da lâmina | Giro |
| Garça | Repulsão | Arremesso | Absorção | — | Giro |
| Ceifador | Repulsão | Puxão | Ira | Avanço com corte | Arremesso da lâmina |
| Eco | Raio | Puxão | Arremesso | — | — |
| Sombra Desperta | Raio | Puxão | Estrangular | Avanço com corte | Giro |
| Soberano | Raio | Tempestade | Estrangular | — | Giro |
| Predestinado | Repulsão | Arremesso | Barreira | — | — |
| Ancião | Repulsão | Cura | Barreira | — | Giro |

O protagonista recebe os poderes do caminho (`storyConfig.protagonist.loadouts`) e as técnicas do personagem-base do estilo. Sem técnica direcional, vale a habilidade própria; sem poder direcional, vale o neutro.

- Quem lança fica vulnerável na preparação: um golpe interrompe o poder.
- Esquiva e EVADE com invulnerabilidade fazem o poder passar. O dash aéreo não tem invulnerabilidade.
- **No ar** não há guarda contra poderes, e o alcance vertical cobre o pulo duplo (`powersConfig.airReach`). Quem está no ar sofre o modificador aéreo da habilidade: a Repulsão empurra 30% mais e desequilibra 20% mais, o Puxão desequilibra 20% mais e o Raio prende 60% mais a cada pulso.
- A Barreira contra a Repulsão segura, mas o dono recua um pouco.
- Repulsão, Puxão e Raio não têm projétil: o efeito é decidido no instante ativo ou em cada pulso. O Arremesso e o Arremesso da lâmina são projéteis (descritos acima).
- Nomes de tela em `uiConfig.texts.powers`; os ids e suas categorias ficam em `powersConfig.categories`.

**Elenco.** Aurora: Guardião, Bastião, Vespa, Espelho, Garça. Eclipse: Sombra, Haste, Brasa, Forja, Eco. Chefe do Arcade: Eclipse, nível 7.

**IA (v1.19).** Usa os 11 poderes e as três técnicas por loadout. Acompanha projéteis em voo, mantém defesa pelo tempo da ameaça, esquiva de faixas imbloqueáveis quando as reconhece, evita Raio na janela de Redirecionamento, tenta quebrar Barreira com empurrão e pune a preparação de Cura e Foco. Dificuldade e perfil continuam limitando percepção e reação; a IA só solicita ações.

## 23. História (v2; rotas e progressão da 2.8)

Campanha com um protagonista criado pelo jogador. Textos nas tabelas de idioma (`story`); regras e encontros em `src/config/storyConfig.js`. Especificação completa em versions/v3.md → 2.8.

**Criação.** Seis passos: nome (lista pronta ou digitado, até 16 caracteres), Caminho do Fluxo (Aurora ou Eclipse, que definem os poderes), estilo de luta (Técnica, Fúria ou Voo: usam golpes e habilidade do Guardião, da Sombra ou da Garça), visual (Errante, Vigia ou Peregrino), cor da lâmina e dificuldade. Logo depois, o jogador distribui os pontos iniciais.

**Rotas (2.8).** Quatro encontros comuns (Guardião, Eco, Vespa, Brasa) e uma trilha de quatro por caminho, escolhida pelo Caminho do Fluxo, sem decisão em diálogo. Aurora: Bastião, Sombra, Sombra Desperta e o chefe **Soberano**. Eclipse: Ceifador, Espelho, Garça e o chefe **Ancião**. Vencer o chefe com **mais de 75%** de vida (exatamente 75% não conta) leva ao secreto, o **Predestinado da variante oposta** (Eclipse na campanha Aurora, Aurora na Eclipse), com IA de chefe. Cada caminho tem final normal e secreto. Vencer um chefe libera o personagem; terminar a campanha Aurora libera também o Ancião, e a Eclipse, o Soberano; vencer uma variante do Predestinado libera aquela variante.

**Atributos e progressão (2.8).** Todos começam em 3 (total 18) com 3 pontos livres. Qualquer atributo vai até 7; a dificuldade limita só o total. Cada encontro vencido dá pontos uma única vez, conforme a dificuldade, e os marcos dão um pouco mais; o chefe final e o secreto não dão pontos. O total fecha exatamente quando o protagonista chega ao chefe final:

| Dificuldade | Pontos por vitória | Marcos (encontros 3 e 6) | Total ao chegar ao chefe |
| --- | --- | --- | --- |
| Fácil | 3 | 3 e 3 | 42 (tudo em 7) |
| Normal | 2 | 3 e 2 | 36 |
| Difícil | 1 | 2 e 2 | 30 |

Pontos nunca passam do total: saves antigos com sobra são cortados ao carregar. Pontos investidos são definitivos (sem redistribuição). Normal e Difícil obrigam a escolher onde ir até 7. Com o teto 7 em todas as dificuldades, quem investe em Fluxo chega a −2 contra os chefes de Fluxo 9 (poderes pela metade).

**Poderes e espaços (2.8).** O protagonista começa com um espaço (Poder) e libera Frente + Poder no 3º encontro e Trás + Poder no 6º. Cada encontro concluído libera um poder do caminho (Aurora: Repulsão no início, depois Barreira, Arremesso, Cura, Absorção, Foco e Puxão; Eclipse: Raio, depois Puxão, Estrangular, Congelar, Ira, Dreno e Repulsão). Nenhum exige Fluxo mínimo. O conjunto é trocado na tela Poderes do hub, entre encontros, nunca no meio da luta; espaço novo ou poder novo preenche um espaço vazio sozinho, e nenhum espaço fica vazio ou repete. Técnicas continuam as do personagem-base do estilo. Espaços e poderes são progressão de campanha, não custam pontos.

**Regras do duelo.** Na História valem Poderes, exaustão, ferimento, Foco automático e disputa de lâminas (2.8).

**Encontros.** Cada encontro tem adversário, arena, ajuste de dificuldade da IA (`aiOffset`) e diálogo antes e depois. Um round decide o duelo. Derrota: tentar de novo ou voltar à História, sem perder progresso. Vitória: diálogo, pontos e o próximo encontro.

**Rotas e finais como dados.** Um encontro pode ter `outcomes`: a primeira condição verdadeira (`always`, `healthRatioAbove`, `alignmentIs`) escolhe o próximo encontro ou um final. Finais liberam personagens. O alinhamento muda falas (texto com variantes `light`/`dark`), poderes e recompensas, não a sequência de missões.

## 24. Personagens secretos e segredo da intro (v2)

| Personagem | Base | Notas | Alinhamento | Ideia |
| --- | --- | --- | --- | --- |
| Ancião | Garça (acrobacia) | potencial +1 (até 8): Vida 6, Stamina 6, Lâmina 8, Defesa 8, Agilidade 8, Fluxo 8 (Lâmina e Agilidade no teto desde a 2.7, pedido do autor) | Aurora | Mestre da Aurora: defesa e técnica acima de todos |
| Soberano | Haste (alcance) | potencial +2 (até 9): Vida 7, Stamina 6, Lâmina 9, Defesa 9, Agilidade 4, Fluxo 9 (Lâmina e Defesa no teto desde a 2.7, pedido do autor) | Eclipse | Pressiona com Raio e Estrangular; Tempestade cobre a aproximação, mas o corpo é lento |
| Predestinado | Eco (fintas) | potencial +3 (até 10): Vida 8, Stamina 10, Lâmina 10, Defesa 7, Agilidade 9, Fluxo 10 (Lâmina e Vigor no teto desde a 2.7, pedido do autor) | Aurora | O ápice: único no tier vermelho do Fluxo |

**Escala 7/8/9/10.** O elenco comum vai até 7 em todos os atributos (`attributesConfig.maxRating`). Secretos têm `potential` (+1, +2, +3): o teto de todos os atributos sobe nesse valor (8, 9 e 10), e a tela de seleção mostra os segmentos extras em dourado (`attributePotential`). Tiers do Fluxo: azul até 7 (todo o elenco), roxo em 8–9 (Ancião e Soberano), vermelho só no 10 (Predestinado).

- Não aparecem na seleção até serem liberados. Liberação salva no navegador (`settings.unlockedCharacters`).
- **Pela História**: vencer o Soberano libera o Soberano; vencer o Predestinado (final secreto) libera o Predestinado; terminar a campanha pelo Caminho da Aurora (qualquer final) libera o Ancião.
- **Pelo segredo da intro**: uma sequência de ações direcionais (setas do teclado ou direcional/stick do controle) libera os três de uma vez, com som e frase próprios. Por pedido do autor, códigos digitados e toques no título não desbloqueiam personagens. As sequências ficam em `src/config/secretsConfig.js`; a tela não dá pista.
- **Segredo dos trajes**: outra sequência na tela de abertura (ações direcionais ou cinco toques na frase abaixo do título, sem código digitado) libera todas as cores de lâmina e trajes de uma vez. Desde a 2.20 ele tem som próprio (arpejo claro subindo), diferente do acorde grave do segredo dos personagens.
- **Final secreto**: na História, vencer o Soberano com mais de 75% de vida leva ao duelo contra o Predestinado em vez do final normal. Esse duelo usa sempre a IA de chefe, em qualquer dificuldade.
- **Trajes**: outra sequência da intro (teclado, direcional ou toques na frase de apoio) libera todas as skins de todos os personagens, sem mexer nas cores de lâmina.
- Equilíbrio com poderes ligados (40 duelos por par, v1.19): médias Normal/Difícil de 78,9% para o Ancião, 82,5% para o Soberano e 87,5% para o Predestinado. Ordem Ancião < Soberano < Predestinado, todos acima do elenco; tabela por dificuldade na ARCHITECTURE.

## 25. Skins e personalização

O elenco tem Original, Viajante (vencer Arcade com o lutador) e Sentinela (concluir qualquer final da História). Secretos têm Original e Legado (final secreto). São cosméticas: paleta e peças existentes, sem alterar atributos, golpes ou lâmina. A cor da lâmina continua independente. Skins bloqueadas são puladas na seleção, que mostra o requisito pendente. As escolhas de ambos os lados permanecem ao reiniciar ou jogar revanche e nas escadas.

O protagonista escolhe Errante, Vigia ou Peregrino desde o início, em um passo Visual. O nome pode vir da lista ou ser digitado com teclado nativo, até 16 caracteres. O visual e o nome acompanham o save da campanha.


## 26. Consequências no duelo (v3, etapa 2.4)

Especificação aprovada em versions/v3.md → notas da 2.4; apresentação e calibração são a etapa seguinte. Capacidades independentes `exhaustion`, `wounds` e `focusEvade`, inicialmente em Duelar, 2 Jogadores e Treino. Foco automático exige Poderes; História aguarda a 2.8. Sem capacidades novas, vale a referência v2.

Gastar Vigor até 10% ou menos causa exaustão; regeneração não a inicia. Sai com pelo menos 40% de Vigor e 1 s de duração, ou 1,6 s após quebra de guarda. Motivos: gasto, bloqueio, quebra de guarda e dreno externo. Não há stun extra nem redução de regeneração. Golpes corpo a corpo elegíveis recebem dano × 1,2 contra exaustos.

Forte comum pode ferir braço; forte de avanço, perna. Exige dano efetivo não letal contra exausto e cota ainda disponível: uma aplicação por round, mesmo após Cura. Braço multiplica custo derivado de bloqueio por 1,35. Perna multiplica dash e dash aéreo por 1,35 e impede segundo salto; preserva primeiro salto, pulo na parede e esquiva de precisão gratuita. Golpes declaram elegibilidade por dados, sem regra pelo nome do personagem.

Cura remove ferimento somente ao completar sua duração sem dano. Pode ser lançada com vida cheia; atingir o teto de vida não conclui o efeito. Dano efetivo, inclusive periódico, interrompe antes da conclusão do mesmo passo. Efeitos registram término `completed`, `interrupted`, `death`, `reset`, `replaced` ou `depleted`.

Ira (`wrath`, Eclipse) custa 35 de Fluxo, prepara por 0,3 s e dura 5 s × potência. Dano causado × 1,2 e recebido × 0,85 em lâminas e poderes; dano periódico não muda. Reaplicação substitui e reinicia, sem empilhar. Não impede interrupção, stun, parry, empurrão nem quebra de guarda. Nenhum loadout do elenco a recebe na 2.4. Ordem da lâmina: dano → punição → carga → ponto doce → exaustão → Ira atacante → Ira defensor → armadura. Poderes usam dano → potência → Ira atacante → Ira defensor.

Foco mantém redução de custos e evita vários contatos de lâmina corpo a corpo por 12 de Fluxo cada, até sua duração terminar. Exige chão, IDLE e intent sem movimento nem ação. Manual válido tem prioridade e não custa Fluxo. Automático não altera sequência manual nem renova duração. Empurrões, poderes e projéteis não são elegíveis. Saldo insuficiente para a próxima defesa encerra o Foco, incluindo redução de custos, sem reativação pela regeneração.

**Números adotados no fechamento da 2.4** (`combatRulesConfig`; os acima são os da especificação, mantidos nos testes de regra): entrada na exaustão a 5% do Vigor, saída a 30%, mínimo de 1 s após quebra de guarda, dano × 1,1 contra o exausto, braço ferido × 1,25 no custo de bloqueio, perna ferida × 1,2 no dash e esquiva automática do Foco a 30 de Fluxo. Exaustão e ferimento valem também no Tutorial. Calibração completa em versions/v3.md → "Validação da 2.4".

**Finalizações (2.9).** Um K.O. por golpe de lâmina corpo a corpo separa um braço ou uma perna do derrotado, de forma estilizada e sem sangue. O golpe decide o membro (perna no 3º rápido, forte de avanço, Giro e Avanço com corte; braço nos demais, inclusive na disputa), e a orientação decide o lado (pela frente, o membro da frente; pelas costas, o de trás). Golpe aéreo, lâmina arremessada, empurrão, poderes e dano periódico terminam no K.O. normal. No K.O. que decide a partida (o último round; em modos de um round, qualquer K.O.), há 30% de chance de a cabeça sair no lugar do membro, também estilizada (pedido do autor). É só apresentação: a opção Finalizações (Opções) desliga o desenho sem mudar nenhum resultado, e o replay mostra o mesmo corte.

## 27. Poderes novos e poderes de custo alto (v3, etapas 2.17 e 2.18)

Especificação aprovada pelo autor. Números marcados como **inicial** são ponto de partida da calibração; os finais entram aqui no fechamento de cada etapa. Até a implementação, valem as regras da seção 22.

**Custo alto sinalizado na barra.** Não há categoria "supremo" nem barra nova. Poderes de custo alto são poderes do catálogo com custo elevado de Fluxo. O medidor de Fluxo mostra uma marca fina no custo de cada poder caro equipado, e a marca acende numa cor própria daquele poder quando o medidor alcança o custo (desenho na UI_GUIDELINES). O custo de cada um é calibrado pela frequência de uso no simulador: um round dura cerca de 15 s e o medidor começa em 20.

### Poderes novos (2.17)

- **Absorção** (Aurora): substitui o Redirecionamento no catálogo e nos loadouts do Bastião e da Garça. **Segurada (2.20, pedido do autor):** enquanto o botão de Poder fica apertado, quem absorve mantém um canal (custo de entrada 10, 30 de medidor por segundo, até 1,5 s) e absorve **qualquer poder** que chega, pulso a pulso no caso do Raio, como a troca de raios entre dois mestres: reduz ou anula pela diferença de Fluxo, pela tabela de interação e sem sorteio, e converte parte da energia absorvida em medidor de Fluxo. Não segura lâmina (isso é da Barreira) e não absorve a Tempestade.
- **Dreno** (Eclipse): canal com alcance que tira medidor de Fluxo do alvo (e talvez um pouco de Vigor, a calibrar) e devolve parte a quem drena. Não tira vida. O laço rompe se o alvo sair do alcance; um golpe interrompe o canal pelas regras existentes.
- **Truque Mental** (Fluxo comum): inverte **só a direção** do alvo (andar e a escolha frente/trás de poder e técnica) por pouco tempo: 0,8 s na diferença 0 (inicial), reduzido pela tabela de interação; −3 ou menos resiste. Ataque, guarda, esquiva e pulo não mudam. A inversão é aplicada pela simulação sobre a intenção, então vale igual para os dois jogadores locais e para a IA, e o replay grava os comandos originais. A IA pode compensar conforme a dificuldade (Fácil não compensa; Normal depois de um tempo de reação; Difícil rápido), sempre só pedindo ações.
- **Tempestade** (Eclipse, reformulada, custo alto, continua exigindo Fluxo 6):
  1. **Invocação** (~0,5 s): o braço sobe e um raio vai ao céu; a arena escurece. É a **única janela de interrupção**.
  2. **Escudo de raios**: logo depois da invocação, arcos envolvem quem lança, que fica parado canalizando e não sofre lâmina nem poder até o encerramento.
  3. **Tempestade** (~5 s, decisão do autor na implementação da 2.17): impactos igualmente de 0,5 até 5 s, com marcas 0,5 s antes; raios caem perto da posição do oponente, cada um marcado no chão cerca de 0,5 s antes (8, 10 e 12 raios por tier, inicial). Sem fogo amigo. **A guarda não bloqueia e a Absorção não absorve.** A esquiva com invulnerabilidade passa. A **Barreira** segura, mas cada raio absorvido drena muito medidor (30, inicial), e ela cai quando o medidor acaba.
  4. **Encerramento** (~0,8 s): o escudo some, o céu volta ao normal e quem lançou fica vulnerável (janela de punição).
  Dano por raio moderado: quem se move bem sofre pouco; quem fica parado perde cerca de 35–40% da vida no tier de base (alvo de calibração). **Calibrado na 2.17:** custo 70, dano 5 por raio, coluna de 80 px; parado, perde cerca de 42% no Firme, 57% no Profundo e 71% no Ápice. A IA lê as marcas para fugir.

### Poderes de custo alto (2.18)

- **Repulsão Suprema** (Fluxo comum): onda em todas as direções em volta de quem lança. Pode ser lançada **também enquanto o lutador apanha** (estados exatos definidos no detalhamento da 2.18). Usada como fuga causa menos dano; usada como ataque, com o lutador livre, causa mais. Guarda e resultado pela diferença de Fluxo, como a Repulsão (seção 22): com diferença pequena, pode ser bloqueada. Custo alto e recarga longa.
- **Telecinese em Massa** (Aurora; antes chamada Chuva de Meteoros): reaproveita o sistema de impactos marcados da Tempestade, com outro equilíbrio: menos impactos e maiores, com empurrão; sem escudo; quem lança pode se mover, mas não atacar, durante a chuva. **Mini-cinemática na invocação** (~0,8 s, interrompível como a da Tempestade, sem pausar o duelo): a câmera recua e sobe um pouco com as barras de cinema, um asteroide aparece no céu, é puxado e racha; depois os pedaços caem com as marcas no chão. Sem céu à vista, fragmentos conjurados.
- **Santuário** (Aurora): escudo que absorve uma quantidade de dano enquanto o lutador age normalmente, com duração máxima. Desfaz ao absorver o limite ou ao acabar o tempo. Diferente da Barreira, que é canal segurado.
- **Esmagamento:** removido por decisão do autor depois da 2.18, por ser basicamente um Estrangular diferente; o Estrangular canalizado cobre o papel de prender e punir.
- **Ira** (Eclipse, revista): passa a ser poder de custo alto e ganha resistência a interrupção nos segundos ativos: cargas de armadura contra golpes de lâmina (quebra de guarda, empurrão, parry, poderes e projéteis continuam interrompendo). Não dá invulnerabilidade. Cobre a ideia de "Fúria".
- **Fratura** (Fluxo comum, custo alto): quem lança golpeia o chão e uma rachadura corre pelo chão para a frente de quem lança até a parede (a direção do comando já escolhe o espaço do loadout, por isso não escolhe o lado). Cada trecho aparece rachado um instante (~0,25 s, inicial) e depois explode. Só acerta quem está no chão: **a única saída é pular** (ou estar no ar). Guarda, Absorção e Barreira não seguram e, **por decisão do autor, a esquiva com invulnerabilidade também não passa** — exceção à regra geral dos poderes, para a Fratura controlar trajetórias. Diferente da chuva (que se esquiva andando): aqui se esquiva pulando.
- **Estrangular mais longo** (Eclipse, revisão do autor): a vítima fica presa e erguida por 1,5–2 s, para o poder ser impactante e cinematográfico. Para não virar combo garantido (a janela foi reduzida na v1.19 por isso), o Estrangular passa a ser **canal segurado**: quem estrangula fica parado mantendo a vítima no ar, gasta medidor e não pode atacar; ao soltar (ou no limite de tempo), a vítima cai e os dois voltam ao neutro sem vantagem de punição. Dano total na mesma ordem de hoje, distribuído pela duração (números na calibração).

**Calibrado na 2.18:** Estrangular com custo 45, dreno de 10/s e 3 de dano por segundo (canal completo ≈ 7,4); Telecinese em Massa com custo 80 e dano 7 por meteoro; Santuário com escudo de 20 × potência; Repulsão Suprema com custo 60 e 14 de dano no ataque (4 na fuga). Fratura e Ira ficam com os números iniciais até um personagem do elenco equipá-los. Santuário com o domo mais justo que a Barreira (decisão do autor), para distinguir os dois.

### Tempestade revista, Corte de Fluxo e Arsenal (2.19)

- **Barreira e raios (pedido do autor):** o Raio comum drena 5 pontos de medidor por pulso que a Barreira segura; a Tempestade mantém 30 por raio, independentemente do limite de dano por onda. Valores iniciais em powersConfig.powers.lightning.barrierDrainPerStrike e powersConfig.powers.storm.barrierDrainPerStrike para a calibração do Claude.
- **Tempestade revista** (decisão do autor: estava fácil de esquivar): cada onda derruba vários raios ao mesmo tempo — 2 no Firme, 3 no Profundo e 4 no Ápice —, um na posição do oponente e os outros em colunas vizinhas, cobrindo as rotas de fuga; no máximo um acerto por onda. **Revisão da 2.20 (pedido do autor):** dois raios sempre caem perto do oponente (a coluna dele e uma vizinha, espelhada por onda); no Profundo, o terceiro e, no Ápice, o terceiro e o quarto caem em posições espalhadas pela arena, pseudo-aleatórias e determinísticas (hash da onda, do raio e da posição do oponente; sem sorteio, o replay repete igual). **No Ápice** (o tier do Predestinado), cada raio abre uma fratura curta que corre pelo chão para os dois lados, com as regras da Fratura (só pulando). Menos ondas que antes, para o dano total não explodir.

- **Corte de Fluxo** (Aurora, custo médio; "Força" fica fora do nome pela regra de propriedade intelectual): um golpe de sabre solta uma onda de energia em arco que viaja em linha reta por uma distância considerável. Preparação curta. Pode ser esquivada, bloqueada pela guarda e **devolvida por um parry perfeito** (regra nova: o projétil volta contra quem lançou). Visual: o arco luminoso acompanha o movimento da lâmina. **Revisão da 2.20 (pedido do autor):** a onda sai de um corte de cima para baixo da lâmina; a onda cresce por tier (raio de colisão 28, 34, 42 e 48 px) e, no Ápice, são dois cortes em sequência, descendo e subindo, com uma onda em cada.
- **Arsenal Telecinético** (Eclipse, custo médio): quem lança ergue de 2 a 4 objetos (pelo tier) que orbitam o corpo por alguns segundos. **Repetir o mesmo comando** lança um objeto no oponente; cada objeto em órbita **segura sozinho um projétil** que chega (Arremesso, lâmina arremessada, Corte de Fluxo, objeto de outro Arsenal). O jogador escolhe entre manter a defesa e gastar os objetos atacando. Visual: pedras, fragmentos metálicos e destroços girando (reaproveita as pedras do Arremesso).

**Calibrado na 2.19:** Tempestade com 4 de dano por raio (Soberano 82,0% contra o elenco; **na 2.20, com os raios espalhados, voltou a 5**, Soberano 80,1%); Absorção segurada com custo 10 e dreno de 20/s (2.20); Corte de Fluxo com custo 20; Arsenal Telecinético com custo 55 e 6 s; Raio comum drenando 5 de medidor da Barreira por pulso (pedido do autor).

Fora do ciclo: Cataclismo e Redemoinho (repetem a chuva de impactos); Suspensão Suprema no backlog (repete o Congelar e levaria a combo garantido entre jogadores).

**Escolha de poderes na seleção (2.13).** Opção **Base** (loadout do personagem, padrão) ou **Personalizar**. Personagens Aurora escolhem entre Fluxo comum e Aurora; Eclipse, entre Fluxo comum e Eclipse. Valem os requisitos de Fluxo (por exemplo, Tempestade exige Fluxo 6) e não há poder repetido. Só em Duelar, 2 Jogadores e Treino; Arcade, Sobrevivência e História usam o loadout base. O loadout escolhido entra no replay e no simulador.
