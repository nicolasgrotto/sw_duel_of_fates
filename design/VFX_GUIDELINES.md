# VFX GUIDELINES

Segue [ART_DIRECTION.md](ART_DIRECTION.md) e [VISUAL_SYSTEM.md](VISUAL_SYSTEM.md).

## Princípios

- Efeitos são **curtos e fortes**. Nenhum efeito de combate deve durar mais de 0,5 s, exceto o golpe final e os canais de poder (raio e barreira), que duram enquanto o lutador está no estado de canal.
- A intensidade acompanha a importância do evento.
- O efeito nunca esconde o que o oponente está fazendo.
- A cor do efeito vem do sabre envolvido. Faíscas de impacto são brancas ou amareladas. Efeitos de poder usam a cor do tier do Fluxo (ver VISUAL_SYSTEM).

### Redirecionamento e Tempestade (v1.18)

Redirecionamento reutiliza a pose de Barreira, o anel de lançamento e um brilho pequeno na mão durante a janela de reação. Absorção usa o anel existente na cor do tier do defensor; retorno usa o impacto de poder no canalizador. O brilho da janela some ao consumir a reação ou sofrer interrupção.

Tempestade usa a pose de canal, preparação luminosa e um círculo fino de baixa opacidade centrado no corpo, delimitando o alcance real. Durante o canal (até 1,2 s), pulsos de partículas curtas na cor do tier ocupam a área sem esconder as silhuetas. As partículas vêm exclusivamente do ParticlePool existente (300 no total), com parâmetros reutilizados e descarte quando cheio. Sem flash ou shake contínuos, cor ou asset novos. Intensidade, emissão e duração ficam em config; efeitos reduzidos diminuem a emissão.

## Fluxo

Na calibração final da v1.19, o alcance da Tempestade passa a 240 px. O contorno e a distribuição das partículas continuam lendo o mesmo raio de gameplay em `powersConfig`; não há área invisível nem aumento do limite do pool. A quantidade por tier permanece a definida abaixo.

Fechamento v1.19: as emissões de poder acompanham os quatro tiers com fatores 2/3, 1, 4/3 e 5/3, definidos em `powersConfig.tiers`. A Tempestade emite 8/12/16/20 partículas por pulso (nos níveis que permitem lançar, 12/16/20); efeitos reduzidos usam a mesma escala sobre a emissão base de 5. O pool continua limitado a 300. Tamanho de área, duração, cores e regras de gameplay não mudam com essa escala visual. Os indicadores de estado e o Redirecionamento conservam os glows por tier existentes.

```
CombatSystem → evento (hit, block, clash, death)
EffectsSystem → escolhe e cria os efeitos
Camera        → screen shake
Renderer      → desenha partículas e flashes
```

## Catálogo

Os valores reais ficam em `src/config/effectsConfig.js`.

| Efeito | Evento | Elementos | Shake | Flash |
| --- | --- | --- | --- | --- |
| `saber-trail` | (render) fase active do ataque | rastro da lâmina | — | — |
| `saber-light` | (render) sempre | luz da lâmina no chão e no corpo | — | — |
| `hit-spark` | `hit` com ataque rápido | 6–10 faíscas, luz pequena | — | — |
| `heavy-impact` | `hit` com ataque forte | 12–16 faíscas, luz média | leve | fraco |
| `block-spark` | `block` | 10–16 faíscas, luz média | muito leve | — |
| `guard-break` | `guardBreak` | 18–24 faíscas, luz forte | médio | fraco |
| `saber-clash` | `clash` | 24–32 faíscas, luz forte nas duas cores | forte | médio |
| `final-blow` | `death` | flash, shake e punch-in (somados ao efeito do hit) | máximo | máximo |
| `parry-spark` | `parry` | 10–14 faíscas para cima, anel na cor do sabre do defensor, lâmina do defensor clareia | leve | — |
| `perfect-parry` | `perfectParry` | 16–22 faíscas, anel maior, lâmina clareia, **mundo dessatura** por 0,15 s, punch-in | médio | fraco |
| `shove-impact` | `shove` | 4–6 faíscas baixas, luz pequena | muito leve | — |
| `hit-flash` | `hit` | silhueta do atingido fica branca por ~0,06 s | — | — |
| `dodge-afterimage` | (render) durante a esquiva e o dash aéreo | 3 silhuetas transparentes que somem rápido | — | — |
| `evade-glow` | `evadeSuccess` | luz curta na cor da lâmina de quem esquivou, sem anel nem faíscas | — | — |
| `power-charge` | (render) preparação de um poder | glow na mão da frente, na cor do tier | — | — |
| `power-wave` | `powerActive` do Puxão | anel à frente de quem lança, que fecha; luz pequena | — | — |
| `shockwave` | `powerActive` da Repulsão | três chevrons ">" com faixa translúcida viajam da mão até o alcance real; poeira no chão; luz pequena | — | — |
| `power-impact` | `powerHit` da Repulsão e do Puxão | 6–10 partículas (metade na cor do tier), luz média | leve | — |
| `lightning-tick` | `powerHit` do Raio | 2–4 partículas, luz pequena, flash branco no atingido | — | — |
| `power-blocked` | `powerBlocked` | 4–6 partículas, luz pequena | — | — |
| `power-lightning` | (render) canal do Raio | polilinha dupla, glow no ponto atingido; 2–4 partículas por pulso | — | — |
| `power-barrier` | (render) canal da Barreira | elipse com glow pulsando | — | — |
| `power-resisted` | `powerResisted` | anel na cor do tier do alvo, 4–6 partículas | — | — |
| `power-absorbed` | `powerAbsorbed` | anel na cor da barreira | — | — |

### Hit stop e câmera lenta

- **Hit stop**: a simulação congela por um instante no impacto. Efeitos e câmera continuam. Ataque rápido 0,04 s, ataque forte 0,08 s, bloqueio 0,03 s, quebra de guarda 0,1 s, clash 0,1 s.
- **Câmera lenta no golpe final**: a simulação roda a 30% da velocidade por 0,8 s (tempo real) depois do K.O.
- **Câmera lenta no parry perfeito**: 50% da velocidade por 0,25 s. São os únicos dois momentos com câmera lenta, para ela não perder o peso.
- Parry: hit stop de 0,07 s. Parry perfeito: 0,1 s.
- **Tremor no hit stop**: durante o congelamento, o lutador atingido (ou aparado) treme 2–3 px na horizontal. Torna o hit stop visível.

### Punch-in da câmera

- Zoom curto em direção ao ponto de contato: começa forte e volta em ~0,25 s.
- Usado no ataque forte (3%), na quebra de guarda (4%), no parry perfeito (5%) e no golpe final (6%).
- Transmite peso sem tremer a tela. O shake continua reservado aos impactos mais fortes.

### Anel do parry

Círculo fino (traço), aditivo, na cor do sabre de quem aparou. Cresce de ~16 px até o raio da receita e some em ~0,25 s. Só existe no parry: é a assinatura visual da defesa ativa.

### Dessaturação do parry perfeito

O mundo (arena e corpos) perde a cor e escurece um pouco por 0,15 s, enquanto os sabres e os efeitos continuam com cor total. É feita entre as camadas de corpos e de sabres (`globalCompositeOperation = 'saturation'`). É a assinatura visual do jogo: no momento mais importante, só a luz das lâminas tem cor.

### Lâmina desequilibrada

Durante `STAGGERED`, a lâmina do lutador tremula (o glow oscila). O jogador lê que o oponente está aberto sem nenhum texto na tela.
- Os dois são controlados por `TimeControl` e pedidos pelas receitas de efeito.

### Efeitos reduzidos

Opção de acessibilidade. Com efeitos reduzidos: screen shake e punch-in a 25%, flash e hit flash desligados. Hit stop, câmera lenta e dessaturação continuam (não piscam nem tremem).

### Faíscas

- Saem do ponto de contato, na direção do golpe (para longe do atacante), em um leque inclinado para cima.
- Caem com gravidade e perdem velocidade com atrito.
- São desenhadas como riscos curtos na direção do movimento, com blend aditivo.
- Cores: branco e amarelo claro. A luz do impacto usa a cor do sabre do atacante (no clash, as duas cores).

### Luz de impacto

Brilho circular, aditivo, no ponto de contato. Começa forte e some rápido. É a "alteração temporária de iluminação" da ART_DIRECTION.

### Flash

Camada de cor sobre a cena inteira (abaixo da UI), com blend aditivo e alpha que cai a zero.

## Limites

| Parâmetro | Limite |
| --- | --- |
| Partículas ativas | 300 |
| Screen shake (amplitude máxima) | 12 px lógicos |
| Screen shake (duração máxima) | 0,3 s |
| Flash de tela (alpha máximo) | 0,35 |
| Hit stop | 0,03 a 0,1 s |
| Punch-in (zoom máximo) | 6% |
| Dessaturação | 0,15 s |
| Raio (feixes por lutador) | até 3 feixes e 1 ramo, com até 10 segmentos cada (v2.16) |
| Canal de poder (raio, barreira) | dura o estado do lutador, no máximo 1,5 s |

## Implementação

- Partículas usam pool, sem `new` a cada frame.
- `EffectsSystem.spawn(type, params)` é a única porta de entrada.
- Efeitos são dados (tipo, posição, cor, tempo de vida). O desenho fica no código de render.
- Screen shake só pela Camera.

### EVADE (v1.3)

A esquiva de precisao usa uma inclinacao breve para tras, joelhos baixos e recuo minimo. A pose vem de combatPoses.evade e volta suavemente durante a recuperacao. Silhueta permanece legivel; sem cor, anel, flash, shake ou camera lenta novos. Afterimage curto de 0,12 s com alpha 0,18 reaproveita o pool da esquiva. EVADE_SUCCESS pede esse afterimage ao EffectsSystem e reutiliza o som sintetizado de esquiva. Controles e lista de golpes incluem o gesto para baixo nos estilos existentes.

Sucesso em sequência (v2.1): cada esquiva bem-sucedida acende uma **luz curta** (`evade-glow`) no peito de quem esquivou, na cor da lâmina do próprio lutador, raio ~90 px, alpha 0,5 e 0,2 s, desenhada como as luzes de impacto (sprite em cache, modo aditivo). Sem anel, faíscas, flash, shake, hit stop, câmera lenta ou dessaturação: o anel e a dessaturação continuam assinatura do parry. Efeitos reduzidos mantêm a luz a 60%, porque ela não pisca a tela. A pose da esquiva alterna entre as variações do estilo de movimento do personagem (`motionStyles[motion].evade`), escolhida por `combat.evadeStreak`; a silhueta do sucesso mostra a variação que acabou de evitar o golpe. Som próprio `evadeSuccess` (sopro curto subindo e um toque agudo suave), diferente do metal do parry e do dash.

Repulsão como onda de choque (v2.4, pedido do autor): a Repulsão deixa de parecer uma esfera arremessada. Na preparação, a mão só acende de leve (brilho com 35% do raio da carga dos outros poderes, sem crescer). Na liberação (forma revista no fechamento da 2.5, pedido do autor), três ondas em forma de chevron ">" saem da mão com 0,045 s entre elas e viajam até o alcance de gameplay do poder (`powers.push.range`) em 0,3 s, crescendo e esmaecendo. Cada chevron tem a ponta para a frente e dois braços retos para trás, a 58° do eixo de avanço (`chevronDegrees`); os braços crescem com a distância (`armRatio`) até 80 px acima e abaixo da mão (`halfHeight`), como uma cunha de ar comprimido. Atrás de cada chevron, uma faixa translúcida de 22 px (`bandDepth`, alpha 0,14) dá corpo à cunha. O traço vai de 5 px a 2 px, com ponta em quina (sem arredondar), na cor do tier do Fluxo com um núcleo claro mais fino; o tier muda a cor da onda. Ao mesmo tempo, poeira (`shockwaveDust`, 10 partículas do pool; 4 com efeitos reduzidos) sobe do chão ao longo do caminho e é empurrada para a frente. Sem anel circular, flash ou shake na liberação; o impacto no alvo continua o `power-impact`. O Puxão mantém o anel que fecha. O Arremesso continua sendo o projétil do Fluxo; trocar por pedras do chão é outra decisão, ainda não tomada.

Consequências da v2.4:

- **Entrada na exaustão:** sem efeito de tela. O lutador exausto respira mais fundo (respiração 2× mais ampla, só no render) e a guarda pende 6°. Som curto `exhausted`: sopro grave descendente, baixo volume.
- **Ferimento:** no contato que fere, o `heavy-impact` normal mais 4–6 faíscas extras saindo baixas na direção do golpe, na cor das faíscas de impacto. Sem sangue. O membro ferido (perna da frente ou braço da frente) recebe uma sombra `woundShade` por cima até a Cura terminar ou o round acabar. Som `wound`: o impacto forte com uma camada grave curta.
- **Cura que limpa ferimento:** no fim da Cura, uma luz suave (0,3 s) na cor do tier do Fluxo sobre o corpo, e a sombra do membro some.
- **Ira:** enquanto ativa, brilho fraco e irregular na cor do tier do Fluxo em volta do tronco (sprite de glow em cache, alpha 0,15–0,3) que oscila com duas frequências. Sem partículas contínuas. Som `wrath` na ativação: tom grave crescente.
- **Esquiva automática do Foco:** reaproveita `evade-glow` e o som `evadeSuccess`, com a pose da variação 0. O medidor de Fluxo mostra o gasto.

Dash aéreo (v1.13): reaproveita o estado e a pose da esquiva, as silhuetas `dodge-afterimage` e o som sintetizado de esquiva. Sem cor, rastro, anel ou shake novos; o lutador continua na cor da própria paleta e a lâmina não muda.

Técnicas de lâmina (v1.15): usam o rastro, o som e o impacto dos golpes fortes, sem efeito novo. O **giro** tem pose própria (`combatPoses.attacks.spin`): a lâmina varre cerca de 350° ao redor do corpo, então o rastro desenha o círculo e mostra que o golpe acerta atrás. O **avanço com corte** (`dashSlash`) inclina o corpo para a frente no avanço e corta de baixo para cima no fim.

Projéteis (v1.16): o **Arremesso** desenha um fragmento arrancado da arena (polígono irregular de 6 vértices em `floorEdge`, contorno de 1,5 px e brilho em sprite de glow na cor do tier de quem lança, girando conforme a idade do projétil); o raio cresce com a faixa de Fluxo (10 a 38 px). A **lâmina arremessada** gira no ar na cor da própria lâmina (glow, camada de brilho e núcleo `saberCore`, as mesmas espessuras do `saberStyle`), sem rastro novo; o cabo fica na mão do dono, sem a lâmina, até ela voltar. Impactos reaproveitam as receitas existentes (`powerHit`, `powerBlocked`, `powerAbsorbed`, `hit`, `block`). Nenhuma cor ou asset novo; nada é alocado por frame (`ProjectileRenderer` reaproveita um `Float32Array`).

Efeitos de estado (v1.17): indicadores sutis enquanto o estado dura, sempre na cor do tier de quem aplicou (`combat.statusLevel`), só com sprites de glow em cache e uma elipse; sem partículas contínuas, sem flash e sem shake. **Estrangular**: brilho pequeno pulsando no pescoço. **Congelar**: casca (elipse fina em volta do corpo) com brilho fraco e fixo; some quando o golpe quebra o gelo. **Foco**: brilho lento no peito. **Cura**: brilho que sobe do quadril ao peito e apaga no topo. O lançamento usa o anel de `powerActive` existente.

Disputa de lâminas (v2.5): sem câmera lenta, dessaturação nem tela sobreposta. A tensão vem da pose, do tremor, das faíscas e do som.

- **Entrada (`bladeLockStart`):** substitui o clash curto. Impacto `bladeLockStart`: 16–22 faíscas em leque aberto, luz nas duas cores, shake 6 px, flash 0,12, hit stop 0,08 s e punch-in de 3%. Mais fraco que o `saber-clash`, porque a disputa ainda vai resolver.
- **Ponto de contato:** fica no meio da dupla, a `bladeLock.contactHeight` (125 px) acima do chão, e desliza até `contactShift` (18 px) na direção de quem perde, proporcional à vantagem (`pressões / winMargin`). As duas lâminas passam por esse ponto; pose e faíscas leem a mesma configuração em `effectsConfig.bladeLock`.
- **Durante:** 1–2 faíscas a cada 0,07 s no ponto de contato (metade nos efeitos reduzidos), sem luz. Cada pressão contada solta 3–5 faíscas para o lado de quem foi empurrado e uma luz pequena (raio 70, alpha 0,35, 0,1 s) **na cor da lâmina de quem apertou**: quem aperta mais acende mais a própria cor no cruzamento. Sem shake por pressão; o tremor fica no corpo.
- **Tremor:** mãos e lâminas tremem de 1 a 2,5 px, crescendo com o tempo da disputa, e cada pressão dá um empurrão curto (0,08 s) da mão para a frente. A lâmina gira em volta do ponto de contato, então o cruzamento continua no lugar enquanto as mãos tremem.
- **Desfecho com vencedor:** impacto `bladeLockWin` no ponto de contato (12–16 faíscas na direção do perdedor, luz na cor do vencedor, shake 6 px, flash 0,1, hit stop 0,08 s, punch-in 3%) e hit flash no perdedor. O perdedor usa a pose de `STAGGERED` (lâmina tremulando); o vencedor faz a animação curta de vitória do seu estilo de movimento (ART_DIRECTION).
- **Empate:** impacto `bladeLockBreak` (10–14 faíscas para os dois lados, luz nas duas cores, shake 3 px, hit stop 0,04 s); os dois recuam como no clash.
- **Cancelamento** (morte ou reset): nenhum efeito próprio.
- **Vibração do gamepad:** entrada como o clash, pulso fraco por pressão, desfecho como golpe forte.

Sons: entrada reaproveita `clash`. Durante a disputa, um **atrito contínuo** (`bladeLockGrind`: ruído em banda estreita com crepitação e um zumbido grave desafinado) sobe de volume e brilho com o tempo da disputa e para no desfecho, na pausa e na saída do duelo. Cada pressão toca `bladeLockPress` (batida metálica curta com baque grave). Vitória toca `bladeLockWin` (lâmina empurrada que escapa, com baque grave); empate, `bladeLockBreak` (raspão mais curto e agudo).

Poderes por tier (v2.16): o tier do Fluxo de quem lança passa a mudar a forma, não só a cor. Tudo é desenho: alcance, dano, hitbox e estados vêm do gameplay. Números por tier em `powersConfig.tiers` e `powersConfig.render`; nada alocado por frame.

- **Raio:** feixes por tier (`bolts`): Tênue 1; Firme 1 com ramo; Profundo 2; Ápice 3. Os feixes extras saem da mesma mão e chegam a alturas próximas no alvo (peito, ombro, quadril). Mesmo dano por tick: os feixes são leitura de intensidade.
- **Tempestade:** além do círculo de alcance, arcos curtos e trêmulos percorrem os braços e o tronco de quem canaliza, na cor do tier (mesmo jitter do Raio, 2–3 arcos). No alvo atingido, espasmo de 1–2 px por 0,12 s e contorno claro piscando uma vez por pulso, sem cobrir o corpo.
- **Congelar:** o alvo fica parado na pose em que estava (sem o balanço do atordoado), dentro da casca, com 2–3 silhuetas na cor do tier, defasadas 2–4 px e tremendo rápido (tremor de 0,05 s), alpha 0,25. Sem blur de tela.
- **Estrangular:** a vítima sobe 10% da altura no desenho, pés juntos pendurados, mãos no pescoço, lâmina caída; a sombra continua no chão. O brilho do pescoço continua.
- **Barreira:** a elipse cresce por tier (`barrierScale` 0,85/1/1,15/1,3).
- **Repulsão:** chevrons e poeira crescem por tier (`waveScale` 0,85/1/1,15/1,3 na altura, na espessura e na faixa; poeira pelo `particleScale`). O alcance desenhado continua o de gameplay.
- **Puxão:** o anel que fecha cresce por tier e começa no alcance real do Puxão de quem lança (que agora muda por tier).
- **Arremesso:** deixa de parecer uma esfera. Na preparação, as pedras sobem do chão perto de quem lança, com poeira; no lançamento, seguem o projétil girando. Uma pedra nas faixas pequenas, duas nas médias e três nas maiores, todas dentro do raio da hitbox; brilho reduzido a um contorno na cor do tier; no impacto, 4–6 fragmentos escuros caem com gravidade. Uma colisão só. Efeitos reduzidos cortam a poeira pela metade.

Decisões da implementação (v2.16):

- **Ramo do Raio:** sai só do primeiro feixe, do Firme para cima (Tênue sem ramo). Feixes extras miram 26 px acima (ombro) e 28 px abaixo (quadril) do ponto atingido.
- **Tempestade:** 2 arcos no Firme e 3 no Profundo e no Ápice (ombro→mão, quadril→ombro, mão→quadril), com 5 segmentos e jitter de 5 px. Espasmo de ±1,5 px alternando a cada 0,03 s; contorno claro (cor do hit flash) desenhado quatro vezes deslocado 2 px atrás do corpo, alpha 0,5 caindo a zero em 0,12 s. Com efeitos reduzidos, o espasmo segue a escala do shake e o contorno some.
- **Congelar:** 3 silhuetas deslocadas 3, 2 e 4 px (metade disso na vertical), alternando o lado a cada 0,05 s.
- **Puxão:** o anel nasce na mão com raio = alcance do Puxão menos a distância até a mão, então a borda da frente toca o alcance real. Espessura × `waveScale`.
- **Arremesso:** com duas pedras, raios 0,62 e 0,55 do raio da hitbox; com três, 0,5/0,45/0,48, sempre dentro dela. Na preparação o grupo sobe do chão até a altura do projétil. Fragmentos do impacto na cor da pedra (`floorEdge`), desenhados sem modo aditivo (cor escura some no `lighter`), num pool próprio de 24.
- **Contraguarda:** 8–12 faíscas abertas 40° para cima (75°), luz na cor da lâmina e o brilho curto da lâmina do parry.

## Poderes novos e de custo alto (direção, v2.17 e v2.18)

Direção aprovada junto com as regras (GAME_DESIGN, seção 27). Os números finais entram no detalhamento de cada etapa, sempre dentro dos limites desta página.

- **Absorção:** anel curto que se fecha na mão de quem absorve e partículas do poder recebido sendo puxadas para ela, na cor do tier do defensor; o medidor sobe junto.
- **Dreno:** fio de partículas que sai do alvo e chega a quem drena (o sentido inverso do Raio), na cor do tier de quem drena; o fio afina perto do alcance máximo, para o alvo ler que pode romper.
- **Truque Mental:** ondulação na cabeça do alvo (dois ou três anéis elípticos deformados, alpha baixo) enquanto dura. Sem filtro de tela, para não atrapalhar o outro jogador na tela compartilhada.
- **Tempestade:** a arena escurece em camada própria, e lâminas e efeitos continuam com cor total (mesma ideia da dessaturação do parry perfeito). O raio da invocação sobe pela polilinha do Raio. As marcas no chão são elipses na cor do tier que fecham até o impacto. Cada raio que cai tem flash curto e shake pequeno, dentro dos limites; com efeitos reduzidos, sem flash e com shake a 25%. O escudo usa os arcos da 2.16 em volta do corpo inteiro.
- **Repulsão Suprema:** a onda de chevrons da Repulsão em volta do corpo todo, com poeira para os dois lados.
- **Chuva de Meteoros:** as mesmas marcas da Tempestade; pedras maiores (o grupo de pedras do Arremesso) caindo com rastro curto e fragmentos no impacto.
- **Santuário:** domo que acompanha o corpo e racha conforme absorve.
- **Esmagamento:** o alvo é erguido (como o estrangulado), comprime na horizontal e cai com poeira no impacto.
- **Ira revista:** o brilho atual da Ira com uma borda mais firme enquanto resiste a interrupções.

Decisões da implementação (v2.17):

- **Absorção:** a janela mantém o brilho de mão de antes. Cada poder absorvido fecha um anel de 70 px na mão (0,22 s), acende a luz do impacto e puxa 8 partículas (4 com efeitos reduzidos, escala do tier) do raio de 70 px até a mão, na cor do tier de quem absorve. Som `absorb`: inspiração descendente. Barreira e escudo da Tempestade continuam com o anel que abre.
- **Dreno:** linha fina (alpha 0,22) do alvo até a mão e 10 brilhos que correm nesse sentido com ondulação de 6 px, encolhendo ao chegar. Perto do limite do alcance (acima de 70%) tudo esmaece até 35%, para o alvo ler que pode romper. Os pulsos não têm hit flash, partículas nem som; o som `drain` (sucção grave) toca no início.
- **Truque Mental:** três anéis elípticos (achatados a 55%) sobem da cabeça em ondas, crescendo de 6% a 16% da altura e sumindo, deformados por duas ondulações fora de fase, na cor do tier de quem lançou (alpha 0,55). No acerto, anel de 46 px e luz curta na cabeça, sem hit flash nem hit stop. Som `mindTwist`: dois tons quase iguais descendo (batimento) sobre um grave curto.
- **Tempestade:** pose `invoke` (lâmina baixa ao lado, mão livre erguida acima da cabeça, tremor leve) da invocação ao encerramento. Na invocação, arcos no corpo (2–3 por tier, os da 2.16) e um raio que sobe da mão livre até acima da tela, crescendo com a preparação. Ao fim da invocação (`POWER_ACTIVE`), clarão 0,18, shake 4 px e luz no alto, sem anel. A arena escurece em `stormDarken` até alpha 0,4 (subindo na invocação, firme na tempestade, sumindo no encerramento), desenhada depois dos corpos e antes das lâminas e efeitos. Escudo: brilho suave e 6 arcos curtos girando numa elipse em volta do corpo. Marca: elipse no chão na cor do tier, que fecha de 1,1× a 0,5× a largura do raio e fica mais forte até o impacto, com uma coluna fraca (alpha 0,14) subindo 260 px. Raio (`STORM_STRIKE`): polilinha de 14 segmentos do alto da tela ao chão, 0,18 s, com 8–12 faíscas, luz de 110 px, shake 3 px e clarão 0,12 (sem clarão com efeitos reduzidos), acertando ou não. No alvo atingido, só o espasmo e o contorno da 2.16. As partículas do pulso antigo saíram. Sons: `stormInvoke` (crepitar subindo), `stormCall` (trovão longo), `stormMark` (estalo curto) e `stormStrike` (estalo seco com estrondo grave).
