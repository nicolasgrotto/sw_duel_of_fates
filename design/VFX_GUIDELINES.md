# VFX GUIDELINES

Segue [ART_DIRECTION.md](ART_DIRECTION.md) e [VISUAL_SYSTEM.md](VISUAL_SYSTEM.md).

## Princípios

- Efeitos são **curtos e fortes**. Nenhum efeito de combate deve durar mais de 0,5 s, exceto o golpe final e os canais de poder (raio e barreira), que duram enquanto o lutador está no estado de canal.
- A intensidade acompanha a importância do evento.
- O efeito nunca esconde o que o oponente está fazendo.
- A cor do efeito vem do sabre envolvido. Faíscas de impacto são brancas ou amareladas. Efeitos de poder usam a cor do tier do Fluxo (ver VISUAL_SYSTEM).

## Fluxo

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
| `power-charge` | (render) preparação de um poder | glow na mão da frente, na cor do tier | — | — |
| `power-wave` | `powerActive` | anel à frente de quem lança: abre na Repulsão, fecha no Puxão; luz pequena | — | — |
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
| Raio (polilinhas por lutador) | 2, com até 10 segmentos |
| Canal de poder (raio, barreira) | dura o estado do lutador, no máximo 1,5 s |

## Implementação

- Partículas usam pool, sem `new` a cada frame.
- `EffectsSystem.spawn(type, params)` é a única porta de entrada.
- Efeitos são dados (tipo, posição, cor, tempo de vida). O desenho fica no código de render.
- Screen shake só pela Camera.

### EVADE (v1.3)

A esquiva de precisao usa uma inclinacao breve para tras, joelhos baixos e recuo minimo. A pose vem de combatPoses.evade e volta suavemente durante a recuperacao. Silhueta permanece legivel; sem cor, anel, flash, shake ou camera lenta novos. Afterimage curto de 0,12 s com alpha 0,18 reaproveita o pool da esquiva. EVADE_SUCCESS pede esse afterimage ao EffectsSystem e reutiliza o som sintetizado de esquiva. Controles e lista de golpes incluem o gesto para baixo nos estilos existentes.

Dash aéreo (v1.13): reaproveita o estado e a pose da esquiva, as silhuetas `dodge-afterimage` e o som sintetizado de esquiva. Sem cor, rastro, anel ou shake novos; o lutador continua na cor da própria paleta e a lâmina não muda.

Técnicas de lâmina (v1.15): usam o rastro, o som e o impacto dos golpes fortes, sem efeito novo. O **giro** tem pose própria (`combatPoses.attacks.spin`): a lâmina varre cerca de 350° ao redor do corpo, então o rastro desenha o círculo e mostra que o golpe acerta atrás. O **avanço com corte** (`dashSlash`) inclina o corpo para a frente no avanço e corta de baixo para cima no fim.

Projéteis (v1.16): o **Arremesso** desenha um fragmento arrancado da arena (polígono irregular de 6 vértices em `floorEdge`, contorno de 1,5 px e brilho em sprite de glow na cor do tier de quem lança, girando conforme a idade do projétil); o raio cresce com a faixa de Fluxo (10 a 38 px). A **lâmina arremessada** gira no ar na cor da própria lâmina (glow, camada de brilho e núcleo `saberCore`, as mesmas espessuras do `saberStyle`), sem rastro novo; o cabo fica na mão do dono, sem a lâmina, até ela voltar. Impactos reaproveitam as receitas existentes (`powerHit`, `powerBlocked`, `powerAbsorbed`, `hit`, `block`). Nenhuma cor ou asset novo; nada é alocado por frame (`ProjectileRenderer` reaproveita um `Float32Array`).
