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
- **Telecinese em Massa** (antes Chuva de Meteoros): mini-cinemática na invocação, sem pausar: recuo e subida curtos da câmera com as barras de cinema, asteroide no céu (pedra grande em camada própria, contorno de pedra e fio na cor do tier) puxado para baixo e rachando; depois as mesmas marcas da Tempestade e pedaços (o grupo de pedras do Arremesso, maiores) caindo com rastro curto e fragmentos no impacto. A câmera volta antes do primeiro impacto.
- **Fratura:** golpe no chão com poeira; uma linha de fissuras luminosas na cor do tier corre pelo chão à frente da explosão, e cada trecho explode em sequência (luz, faíscas para cima, fragmentos). O trecho rachado e ainda não explodido precisa ser legível para o pulo.
- **Estrangulado mais longo:** a vítima sobe aos poucos durante o canal (até ~18% da altura), pernas balançando devagar, mãos no pescoço; quem estrangula mantém o braço estendido e treme de leve. Na soltura, a vítima cai com poeira.
- **Tempestade revista:** cada onda marca 2, 3 ou 4 colunas ao mesmo tempo (as mesmas marcas e raios de antes, um por coluna); no Ápice, cada raio que cai solta fissuras para os dois lados com o desenho da Fratura, na cor do tier.
- **Corte de Fluxo:** o arco de energia nasce do rastro do golpe e viaja como uma meia-lua na cor da lâmina, com núcleo claro; quando devolvido pelo parry perfeito, troca para a cor da lâmina de quem devolveu.
- **Arsenal Telecinético:** objetos (pedras e fragmentos escuros com fio na cor do tier) orbitando numa elipse em volta do corpo, mais à frente quando passam na frente; lançar um objeto o solta da órbita na direção do oponente; ao segurar um projétil, o objeto quebra em fragmentos.
- **Santuário:** domo que acompanha o corpo e racha conforme absorve.
- **Esmagamento:** removido por decisão do autor (repetia o Estrangular).
- **Ira revista:** o brilho atual da Ira com uma borda mais firme enquanto resiste a interrupções.

Decisões da implementação (v2.17):

- **Absorção:** a janela mantém o brilho de mão de antes. Cada poder absorvido fecha um anel de 70 px na mão (0,22 s), acende a luz do impacto e puxa 8 partículas (4 com efeitos reduzidos, escala do tier) do raio de 70 px até a mão, na cor do tier de quem absorve. Som `absorb`: inspiração descendente. Barreira e escudo da Tempestade continuam com o anel que abre.
- **Dreno:** linha fina (alpha 0,22) do alvo até a mão e 10 brilhos que correm nesse sentido com ondulação de 6 px, encolhendo ao chegar. Perto do limite do alcance (acima de 70%) tudo esmaece até 35%, para o alvo ler que pode romper. Os pulsos não têm hit flash, partículas nem som; o som `drain` (sucção grave) toca no início.
- **Truque Mental:** três anéis elípticos (achatados a 55%) sobem da cabeça em ondas, crescendo de 6% a 16% da altura e sumindo, deformados por duas ondulações fora de fase, na cor do tier de quem lançou (alpha 0,55). No acerto, anel de 46 px e luz curta na cabeça, sem hit flash nem hit stop. Som `mindTwist`: dois tons quase iguais descendo (batimento) sobre um grave curto.
- **Tempestade:** pose `invoke` (lâmina baixa ao lado, mão livre erguida acima da cabeça, tremor leve) da invocação ao encerramento. Na invocação, arcos no corpo (2–3 por tier, os da 2.16) e um raio que sobe da mão livre até acima da tela, crescendo com a preparação. Ao fim da invocação (`POWER_ACTIVE`), clarão 0,18, shake 4 px e luz no alto, sem anel. A arena escurece em `stormDarken` até alpha 0,4 (subindo na invocação, firme na tempestade, sumindo no encerramento), desenhada depois dos corpos e antes das lâminas e efeitos. Escudo: brilho suave e 6 arcos curtos girando numa elipse em volta do corpo. Marca: elipse no chão na cor do tier, que fecha de 1,1× a 0,5× a largura do raio e fica mais forte até o impacto, com uma coluna fraca (alpha 0,14) subindo 260 px. Raio (`STORM_STRIKE`): polilinha de 14 segmentos do alto da tela ao chão, 0,18 s, com 8–12 faíscas, luz de 110 px, shake 3 px e clarão 0,12 (sem clarão com efeitos reduzidos), acertando ou não. No alvo atingido, só o espasmo e o contorno da 2.16. As partículas do pulso antigo saíram. Sons: `stormInvoke` (crepitar subindo), `stormCall` (trovão longo), `stormMark` (estalo curto) e `stormStrike` (estalo seco com estrondo grave).
- **Pedras do Arremesso (revisão a pedido do autor):** 1, 2, 2, 3 e 4 pedras nas faixas pequena, média, grande, muito grande e máxima. As pedras ficam separadas (folga de pelo menos 0,25 do raio entre elas) e podem ir até 1,2× o raio da hitbox; a hitbox não muda. Cada pedra gira no próprio ritmo. Contorno escuro de pedra (`rockShade`) com só um fio fino (alpha 0,45) na cor do tier, para ler como pedra arrancada do chão e não como bola de energia.
- **Raio da invocação (revisão a pedido do autor):** 1 feixe no Firme, 2 no Profundo (Soberano) e 3 no Ápice, com 2,2× a espessura do Raio, abrindo em leque (0 e ±110 px no alto) a partir da mão livre; o brilho da mão cresce 1,4×.
- **Foco e Ira mais visíveis (revisão a pedido do autor):** as duas continuam na cor do tier de quem aplicou, mas com formas opostas. **Foco** (calmo): contorno contínuo da silhueta desenhado atrás do corpo (deslocado 2,5 px, alpha 0,3–0,5 respirando devagar) e dois pontos de luz orbitando o peito numa elipse lenta, além do brilho de antes. **Ira** (agressiva): contorno atrás do corpo que treme irregularmente (3 a 5,5 px, mais alto para cima, alpha 0,3–0,6) e sete brasas subindo dos ombros, além do brilho tremido de antes. Com as duas ao mesmo tempo, vale o contorno da Ira.
- **Pedras maiores nas faixas menores (pedido do autor):** o desenho escala o raio por faixa (pequena 1,5×, média 1,4×, grande 1,25×, muito grande 1,12×, máxima 1×), para as pedras serem lidas como pedras em todos os tiers. A hitbox não muda; nas faixas pequenas a pedra desenhada passa alguns pixels da colisão real.

Decisões da implementação (v2.18):

- **Estrangular longo:** a vítima sobe a 10% da altura na entrada e continua subindo até 18% ao longo do canal de 1,8 s (curva suave), com as pernas balançando devagar (2,5% da altura, 1,6 por segundo); mãos no pescoço e lâmina pendurada como antes. Quem estrangula usa a pose `grip`: mão livre estendida à frente e um pouco erguida, lâmina baixa atrás, tremor leve. A soltura usa o desequilíbrio normal, sem efeito próprio.
- **Armadura da Ira:** cada carga gasta (`WRATH_ARMOR`) acende um anel de 80 px e uma luz na cor do tier no centro do corpo, sobre os efeitos normais do acerto. Som `wrathArmor`: baque grave rasgado.
- **Repulsão Suprema:** como ataque, dois conjuntos de chevrons da Repulsão saem para os dois lados até o alcance real (240 px), 1,25× maiores que os do tier, com anel completo de 240 px, luz forte e poeira dos dois lados; som `supremePush` (estrondo grave). Como fuga, só um estouro curto e claro (anel de 130 px e luz), para ler como escapada e não como ataque.
- **Santuário:** domo elíptico maior que a Barreira em volta do corpo, pulsando devagar, mais fraco conforme o escudo cai; abaixo de 66% do escudo aparecem três rachaduras, abaixo de 33% seis (linhas em V a partir da borda). Golpe absorvido acende um anel pequeno no contato. Na quebra, 14–20 faíscas em todas as direções na cor do tier, anel e luz; som `sanctuaryBreak` (vidro). Lançar toca `sanctuary` (acorde que sobe). O fim pelo tempo só apaga o domo.
- **Esmagamento:** removido depois da 2.18 por decisão do autor; a pose `grip` fica só no Estrangular.
- **Domo do Santuário mais justo (pedido do autor):** raios de 0,30 × 0,50 da altura, menores que a Barreira em qualquer tier (a menor Barreira tem 0,36 × 0,53), para os dois não se confundirem: a Barreira é a cúpula grande e segurada; o Santuário, uma casca colada ao corpo.
- **Telecinese em Massa:** mini-cinemática no `POWER_START`: a câmera sobe 70 px e abre a 95% com entrada e saída suaves (0,25 da duração em cada ponta) por toda a invocação mais 0,5 s, e as barras de cinema entram a 70% por 1 s; nada pausa, e se a invocação for interrompida a câmera volta sozinha. Na invocação (pose `invoke`), um asteroide desce do alto sobre o campo à frente de quem lança (260 px), crescendo de 30 a 60 px de raio; a 72% da invocação ele racha em quatro pedras que se afastam. No `RAIN_CALL`, luz forte e fragmentos no ponto do asteroide. Na chuva, cada marca (as mesmas da Tempestade, com a largura da coluna da Telecinese) recebe uma pedra que cai do céu em diagonal, acelerando, com rastro curto na cor do tier; no impacto, faíscas, luz, shake 5 px e fragmentos para os dois lados, sem clarão. Sons: `meteorCall` (ronco subindo), `meteorBreak` (rocha rachando), `meteorFall` (assobio descendo, a cada marca) e `meteorImpact` (estrondo).
- **Fratura:** pose `slam` (agachado 26 px, tronco à frente, mão livre apontando para o chão, lâmina baixa atrás). No `POWER_ACTIVE`, poeira no pé da frente, luz e shake 4 px. Cada trecho rachado (`FRACTURE_CRACK`) vira um zigue-zague luminoso no chão, na cor do tier, que fica mais forte até explodir; os trechos alternam o desenho para a linha não parecer reta. Cada estouro (`FRACTURE_BURST`) solta 3–5 faíscas para cima, uma pedrinha, luz pequena e shake 1,5 px. Som: `fractureRun` (ronco de rocha correndo, uma vez, no golpe) e `fractureHit` só quando acerta; os estouros não têm som próprio, para não virar ruído.

Decisões da implementação (v2.19):

- **Tempestade revista:** cada raio da onda usa a marca e o raio de antes (pool de raios ampliado para 8, para quatro colunas ao mesmo tempo). As fraturas do Ápice usam o mesmo desenho da Fratura, uma trajetória por lado, na cor do tier de quem lançou; os estouros reaproveitam faíscas, pedrinha e luz da Fratura.
- **Corte de Fluxo:** pose `cleave` (corte para a frente e para baixo, tronco e mão à frente). A onda é uma meia-lua de 9 pontos com a altura de 1,7× o raio de colisão, curvada para a frente, na cor da lâmina do dono atual (glow largo, traço e núcleo claro); devolvida, ela troca de dono e passa a usar a cor da lâmina de quem devolveu. A devolução acende o brilho da lâmina, faíscas do parry, anel de 70 px e luz na cor de quem devolveu. Sons `flowCleave` (corte com zumbido subindo) e `waveReflect` (tom metálico claro).
- **Arsenal Telecinético:** pedras pequenas orbitando a elipse da regra; a que passa na frente do corpo fica maior (1,15×) e opaca, a de trás menor (0,8×) e mais transparente (alpha 0,55). A pedra lançada é uma pedra só, do tamanho dela (não o grupo do Arremesso). Segurar um projétil quebra a pedra com anel pequeno e fragmentos. Sons `arsenal` (ronco subindo), `arsenalLaunch` e `arsenalBlock`.

Decisões da implementação (v2.20):

- **Pedras maiores nos tiers altos (pedido do autor):** escala do desenho das faixas muito grande e máxima sobe para 1,45× e 1,55× (eram 1,12× e 1×). Cada pedra dessas faixas fica com raio de cerca de 18–21 px, contra ~12 px na faixa grande e ~15 px da pedra única da pequena; antes, com mais pedras, cada uma ficava do mesmo tamanho em todos os tiers.
- **Absorção segurada:** pose `absorb` (mão livre estendida à frente, lâmina baixa, tremor leve) e, enquanto o canal está aberto, brilho na mão com 8 luzes que giram e entram nela, crescendo ao chegar; cada poder absorvido continua com o anel que fecha e as partículas puxadas da 2.17.
- **Arsenal com lâminas (pedido do autor):** em vez de pedras, lâminas curtas de energia (30 px, cabo escuro de 22% do comprimento, lâmina na cor do tier com glow e núcleo claro) orbitando com a ponta para fora; a da frente maior (1,15×) e opaca, a de trás menor (0,8×) e transparente (0,55). A lançada gira no ar (16 rad/s). Ao segurar um projétil, a lâmina se parte em faíscas de bloqueio com anel pequeno na cor do tier. O desenho fica em `rendering/energyBlade.js`.
- **Corte de Fluxo revisto (pedido do autor):** sai a pose estática `cleave` e entra uma trilha de poder (o sistema de trilhas das técnicas passa a valer também para poderes, `powerKeyframes`): a lâmina sobe acima da cabeça na preparação e desce num corte com passo à frente. No Ápice, trilha `cleaveDouble`: o corte desce, agacha, sobe num segundo corte que termina com a lâmina para o alto. A meia-lua cresce junto com o raio de colisão de cada tier.
- **Pedras pelo tier (correção pedida pelo autor):** quantidade e escala das pedras passam a seguir o tier do Fluxo de quem lança, e não a faixa de tamanho: Tênue 1 pedra (1,5×), Firme 2 (1,6×), Profundo 3 (1,9×), Ápice 4 (1,75×). Antes, os níveis 6 e 8 caíam na mesma faixa de tamanho e o tier 3 da galeria saía igual ao 2. Cada pedra lançada guarda o nível de quem a lançou, então trocar de tier com uma pedra no ar não mistura mais o raio antigo com a contagem nova (o "desenho antigo" de uma pedra grande só).
- **Tremor do Estrangular na vítima (pedido do autor):** quem estrangula fica firme na pose `grip` (sem tremor), para transmitir controle; quem é estrangulado treme no ar (2,5° no tronco e 1,5 px na altura, 13 vezes por segundo), crescendo com a subida.
