# ART DIRECTION

Define a identidade visual. Segue [DESIGN.md](../DESIGN.md). As regras técnicas ficam em [VISUAL_SYSTEM.md](VISUAL_SYSTEM.md).

## Identidade visual

O jogo deve transmitir:

- duelo cinematográfico
- tensão
- peso nos golpes
- atmosfera sci-fi
- contraste forte
- sensação de combate profissional

## Estilo

- 2D estilizado, com silhuetas fortes e pouco detalhe interno.
- Personagens reconhecíveis só pela silhueta (teste: pintar tudo de preto e ainda saber quem é quem).
- O cenário fica escuro e com pouco contraste. O que tem contraste alto são os personagens e, principalmente, os sabres.
- Evitar aparência genérica de jogo mobile.
- Evitar excesso de elementos na tela.

## Silhuetas dos arquétipos

| | Guardião | Sombra |
| --- | --- | --- |
| Roupa | túnica até os joelhos, tom terroso | capa longa até o chão, quase preta |
| Cabeça | capuz abaixado | capuz levantado e pontudo |
| Postura | ereta, controlada | inclinada para a frente, predatória |
| Guarda | alta: lâmina para cima e para a frente | baixa: lâmina para baixo e para a frente |
| Sabre | azul | vermelho |

As duas silhuetas devem ser diferentes mesmo pintadas de preto: capuz, comprimento da roupa e ângulo da lâmina resolvem isso.

| | Bastião | Vespa | Espelho |
| --- | --- | --- | --- |
| Roupa | túnica de armadura verde-oliva, ombreiras grandes | túnica curta cor de areia | manto longo cinza-claro, o único personagem claro |
| Cabeça | sem capuz | sem capuz | capuz levantado e máscara lisa com fenda |
| Postura | ereta, ombros muito largos | muito inclinada para a frente, baixa | totalmente ereta, imóvel |
| Guarda | lâmina larga e quase horizontal | duas lâminas curtas: uma à frente, outra invertida para trás | lâmina vertical à frente do rosto |
| Sabre | verde-ácido, lâmina mais grossa | amarelo-âmbar, lâminas finas | branco-prata |

| | Haste | Brasa | Forja |
| --- | --- | --- | --- |
| Roupa | túnica cinza-violeta | túnica curta vermelho-queimado | túnica de couro, ombros largos |
| Cabeça | sem capuz | capuz levantado, sem capa | sem capuz, cabeça grande |
| Postura | ereta, longe do oponente | baixa, à espreita | firme, pesada |
| Guarda | **haste longa**: cabo de mais de um metro, lâmina à frente | **empunhadura invertida**: lâmina para trás e para baixo | lâmina **muito larga** à frente |
| Sabre | violeta | laranja-brasa | vermelho-forja; brilha mais conforme carrega |

| | Garça | Eco |
| --- | --- | --- |
| Roupa | túnica curta azul-acinzentada e **cachecol longo** que voa atrás | túnica escura curta |
| Cabeça | sem capuz | capuz e máscara lisa |
| Postura | leve, inclinada, sempre pronta para pular | baixa e torta, imprevisível |
| Guarda | lâmina alta, apontando para trás por cima do ombro | lâmina baixa à frente |
| Sabre | verde-menta | rosa-pálido |

O chefe **Sombra Desperta** usa a silhueta da Sombra com ombreiras (`pauldrons`), ombros mais largos, capa ainda mais escura e lâmina mais grossa. Continua magenta: é a mesma pessoa, mais perigosa.

Recursos de silhueta disponíveis em `characterData.appearance`: `shoulderScale` (largura dos ombros), `pauldrons` (ombreiras), `masked` (máscara no lugar do rosto), `bladeWidthScale` (espessura da lâmina), `hiltScale` (comprimento do cabo; a Haste usa um cabo longo como uma lança), `scarf` (cachecol que voa com o movimento) e `dualBlade` (segunda lâmina na mão de trás). Use-os para que cada personagem novo continue reconhecível pintado de preto.

## Paleta

### Ambiente

- preto profundo
- azul escuro
- cinza
- tons metálicos frios

Saturação baixa. A cor saturada da cena vem dos sabres e dos efeitos.

### Sabres

Cada personagem tem uma cor principal de sabre, diferente da de todos os outros. As cores não têm moral: nenhuma significa herói ou vilão (o jogo não herda a convenção azul/verde contra vermelho). Os tons ficam espaçados no círculo cromático para os dois lutadores nunca se confundirem. Tabela em [VISUAL_SYSTEM.md](VISUAL_SYSTEM.md#cores-de-personagem).

O sabre possui:

- núcleo branco
- glow interno (cor do sabre, forte)
- glow externo (cor do sabre, suave e largo)
- bloom
- trail durante golpes

### UI

Branco suave e cinza azulado. Cor saturada só para informação crítica (ex.: vida baixa).

Os valores exatos ficam em [VISUAL_SYSTEM.md](VISUAL_SYSTEM.md).

## Iluminação

O sabre é a principal fonte de luz da cena. Sua luz deve afetar:

- o personagem (borda iluminada do lado do sabre)
- o chão (reflexo/mancha de luz abaixo da lâmina)
- as partículas
- o ambiente (leve tom da cor do sabre em impactos)

## Combate

Ataques têm feedback visual forte. Impactos geram:

- sparks
- flash
- partículas
- screen shake
- alteração temporária de iluminação

A intensidade cresce com a importância do evento: golpe leve < bloqueio < golpe forte < clash < golpe final. Ver [VFX_GUIDELINES.md](VFX_GUIDELINES.md).

## UI

- minimalista
- cinematográfica
- legível
- pouco intrusiva

Evitar HUD colorido. Ver [UI_GUIDELINES.md](UI_GUIDELINES.md).

## Animação

Movimentos transmitem peso. Todo ataque tem:

1. **preparação**: o corpo e o sabre recuam e anunciam o golpe
2. **movimento**: arco rápido da lâmina, com trail
3. **impacto**: pequena pausa (hit stop) e efeitos
4. **recuperação**: retorno à guarda, momento vulnerável

Evitar:

- movimentos rápidos demais para ler
- animações robóticas (sem easing)
- transições instantâneas entre poses

Usar easing nas transições e um pequeno exagero (antecipação e follow-through).

### Idle e caminhada

- **Idle**: respiração lenta (o tronco sobe e desce 1 a 2 px) e o sabre balança levemente. O personagem nunca fica totalmente parado.
- **Caminhada**: passos curtos de base de luta (os pés não se cruzam), corpo sobe e desce a cada passo, roupa arrasta levemente para trás do movimento.
- **Pulo**: pernas recolhidas no ar.
- A troca entre idle, caminhada e pulo é suavizada (blend), nunca instantânea.

### Poses de combate

| Estado | Pose |
| --- | --- |
| Ataque rápido | startup: lâmina sobe para trás · active: corte rápido para baixo e para a frente, tronco avança · recovery: volta à guarda |
| Ataque forte | igual ao rápido, mas com preparação maior (lâmina bem atrás da cabeça) e corte mais longo |
| Bloqueio | lâmina quase vertical à frente do corpo, mãos adiantadas, base mais baixa |
| Esquiva | corpo baixo e inclinado na direção da esquiva |
| Atingido | tronco joga para trás, lâmina cai |
| Atordoado | corpo curvado, lâmina apontando para o chão, balanço lento |
| Morto | cai para trás e a lâmina apaga |

Curvas de tempo: startup com easing de saída (prepara devagar no fim), active quase linear e rápido, recovery com easing suave.

### Estilos de movimento (v2.3)

Cada personagem tem um **estilo de movimento** (`appearance.motion`, tabela `motionStyles` em `fighterVisualConfig`). O estilo muda a leitura do corpo, nunca o combate: startup, ativo, recuperação, alcance e hitboxes continuam vindo dos golpes. Sem sprites nem esqueleto novo; o estilo só ajusta os números das poses procedurais.

- **Postura**: agachamento, inclinação e ângulo da guarda somados à pose parada e andando; escala da respiração, do balanço da lâmina e do sobe-e-desce da caminhada.
- **Ataques**: o estilo pode trocar os ângulos, a inclinação, a elevação e o alcance de uma pose de golpe (por tipo de golpe ou por pose).
- **Follow-through**: na recuperação a lâmina passa um pouco do ponto do corte e volta, proporcional ao arco do golpe. Some na metade da recuperação.
- **Giro de recuperação**: volta completa da lâmina enquanto ela retorna à guarda. Só na recuperação, para nunca esconder a antecipação; o ataque continua legível no startup.
- `standard` reproduz a v2 exatamente. Personagens sem estilo próprio usam `standard` até a cobertura do elenco (etapa 2.6).

| Estilo | Personagem | Intenção | Como aparece |
| --- | --- | --- | --- |
| `guardian` | Guardião | Econômico, preciso, guarda firme | Base mais baixa, guarda parada (balanço e respiração menores), preparação curta e corte direto, quase sem follow-through, guarda de bloqueio mais firme |
| `wasp` | Vespa | Alternância das duas lâminas, giros curtos, velocidade coordenada | Base leve e inquieta, cortes que avançam o tronco, arcos alternados (a lâmina de trás conduz o corte reverso), follow-through solto e giro curto da lâmina depois do quinto rápido e do forte |

O protagonista do estilo Técnica herda o estilo do Guardião pela base de aparência.

### Poses-chave de ataque (v2.12)

Os golpes deixam de ser um arco de dois pontos (preparação → corte) e passam a ser uma **trilha de poses-chave** que atravessa as três fases do golpe. Continua procedural: sem sprites nem esqueleto novo, e startup, ativo, recuperação, alcance e hitbox não mudam.

- **Trilha.** Cada pose-chave tem a fase (preparação, ativo, recuperação), o ponto dentro dela (0 a 1), o easing do trecho que termina nela e os valores dos canais. A trilha começa e termina na guarda; canais omitidos voltam ao valor de guarda.
- **Canais.** Ângulo da lâmina, inclinação do tronco, agachamento, alcance e altura da mão (os mesmos da v2) e cinco novos: **passo** (o pé da frente avança no corte), **deslize** (o pé de trás recua na preparação e acompanha no corte), **quadril** (o quadril vai para trás na preparação e para a frente no corte, levando o tronco), **mão livre** (a segunda mão solta o cabo e vai para um ângulo próprio, para equilíbrio ou para empurrar) e **giro** (voltas da lâmina somadas ao ângulo, na recuperação).
- **Leitura das quatro fases.** Antecipação clara (peso para trás, lâmina recua, pé de trás desliza) no fim da preparação; arco rápido no ativo, passando por uma pose intermediária que coincide com a hitbox; impacto com passo e quadril à frente; recuperação com follow-through curto e volta à guarda com easing suave.
- **Encadeamento.** Quando um golpe começa logo depois de outro, a pose sai de onde o anterior estava, numa mistura curta (`chainBlend`, 0,06 s), em vez de saltar para a guarda.
- **Opt-in por estilo.** Só estilos com `keyframes` usam a trilha; os demais seguem a pose de dois pontos da v2. Golpes sem trilha no estilo (técnicas, postura, arremesso da lâmina) também seguem a pose antiga.
- **Guardião:** passos curtos, quadril firme, pouco giro de tronco, sem giro de lâmina; o empurrão solta a mão livre para a frente.
- **Vespa:** passos longos, quadril e tronco acompanhando o corte, follow-through largo e o giro da lâmina na recuperação do forte e do quinto rápido; as duas mãos ficam nas lâminas.

### Técnicas e status (v2.16)

As técnicas de lâmina ganham trilhas de poses-chave (sistema da 2.12) válidas para todos os estilos, em `techniqueKeyframes`. Frame data, alcance e acertos não mudam.

- **Giro:** preparação com a lâmina recolhida atrás do ombro, rotação do corpo simulada (o corpo e a lâmina estreitam e espelham pela escala horizontal, canal `turn`), dois arcos de lâmina e recuperação de frente. Um acerto só.
- **Avanço com corte:** duas variantes por estilo de movimento (`motionStyles[].dashSlash`). `rising` (padrão e Vespa): joelhos dobram, avanço baixo e arco diagonal de baixo para cima. `falling` (Guardião): lâmina acima do ombro, avanço e corte de cima para baixo. Tronco, passo e quadril acompanham.
- **Arremesso da lâmina:** a lâmina recua atrás do corpo, o pé de trás desliza, e a soltura vem com passo e braço estendido; a mão vazia acompanha a volta.
- **Contraguarda do Guardião:** no contato, a lâmina desvia para cima com faíscas e brilho, o corpo recua meio passo e a resposta é uma estocada curta (`counterRiposte`). Só o Guardião: marcado nos dados da habilidade (`counter.flourish`).
- **Leitura do giro:** a escala horizontal segue o cosseno das voltas do corpo, com módulo mínimo de 0,08 (o corpo nunca vira uma linha). A lâmina sai de trás do ombro num corte para a frente no primeiro quarto do ativo e fica estendida quase na horizontal; quem gira é o corpo (frente → costas → frente), então a lâmina passa pela frente, por trás e volta à frente, como uma rotação vista de lado. A recuperação volta à guarda de frente. (Correção da 2.17: a versão da 2.16 girava a lâmina junto com o espelhamento e ela passava quase todo o ativo atrás do corpo.)
- **Congelado e estrangulado** deixam de usar a pose do atordoado: o congelado fica parado na pose do instante, o estrangulado é erguido com as mãos no pescoço (VFX_GUIDELINES → "Poderes por tier").

### Cobertura do elenco (v2.6)

Todo o elenco passa ao sistema de trilhas da 2.12, agrupado em **famílias de movimento**: personagens com o mesmo jeito de lutar compartilham postura, trilhas, defesa, esquiva, disputa e vitória da disputa; a diferença entre eles continua vindo da silhueta, da lâmina, dos golpes e da habilidade. Frame data, alcance e hitboxes não mudam; a lâmina tem de passar pela hitbox real no ativo e nenhuma transição gira mais de 60° por frame. O estilo `standard` continua existindo, idêntico à v2, mas nenhum personagem o usa mais.

**Decisões da implementação (2.6).** Nas cadeias, o fim de um golpe e a preparação do seguinte ficam a menos de ~150° um do outro, e o fim do golpe fica a menos de ~120° da guarda do personagem; com mais que isso a mistura de encadeamento gira mais de 60° num frame. Por isso a Brasa e o Eco, de guarda baixa, encadeiam golpes ascendentes (o rápido termina na linha do peito, não acima da cabeça), e a preparação do reverso da Garça é curta. O corte rápido de cada família não cobre a estocada da Haste e do Soberano: a trilha pelo tipo do golpe só vale quando o tipo difere da base do golpe (`light2`, `light5`), e o resto segue pela pose (`thrust`, `sweep`, `hammer`, `impetus`).

| Família | Personagens | Intenção | Como aparece |
| --- | --- | --- | --- |
| `guardian` | Guardião, Ancião, Predestinado (e o protagonista Técnica) | Econômico, preciso, guarda firme | O da 2.3/2.12; o segundo golpe da cadeia (`light2`) vira um corte reverso, de baixo para cima, também no Ancião e no Predestinado |
| `wasp` | Vespa | Duas lâminas, giros curtos | O da 2.3/2.12 |
| `aggressor` | Sombra, Sombra Desperta (e o protagonista Fúria) | Agressivo, amplo, pressiona | Tronco à frente, preparação alta atrás da cabeça, arcos longos com passo grande e quadril, follow-through largo; o ímpeto (`impetus`) avança com o corpo inteiro; disputa inclinada e vitória larga |
| `juggernaut` | Bastião, Forja | Pesado, lento, inevitável | Base larga e baixa, quase sem balanço, golpes curtos e secos no rápido e martelada sobre a cabeça no forte e no `hammer`, agachando no impacto; empurrão de ombro; disputa enraizada e vitória curta |
| `fencer` | Espelho, Haste, Soberano | Ereto, preciso, de ponta | Tronco reto, preparação contida, estocadas com braço estendido (o `thrust` da Haste vira lunge), o forte num corte diagonal limpo, a varredura (`sweep`) baixa e longa; disputa firme e vitória curta e precisa |
| `dancer` | Garça (e o protagonista Voo) | Leve, fluido, acrobático | Base alta e solta, arcos largos com o corpo acompanhando, corte reverso cruzado, pirueta do corpo na recuperação do forte (canal `turn`); disputa leve e vitória com giro da lâmina |
| `striker` | Brasa, Eco | Enrolado, explosivo, de resposta | Base baixa e contida a partir da guarda baixa do personagem; o rápido sobe de baixo até a linha do peito, o segundo da cadeia é uma estocada baixa e longa, o forte é um corte ascendente com o corpo subindo junto; disputa baixa e vitória curta |

### Disputa de lâminas (v2.5)

Pose `BLADE_LOCK`, com números por estilo em `motionStyles[motion].lock` e `lockVictory`:

- Os dois se inclinam um contra o outro, base baixa, mãos recolhidas e um pouco erguidas; as lâminas sobem em diagonal e se cruzam acima das mãos, num X entre os rostos.
- **Inclinação conforme a vantagem:** quem está ganhando avança o tronco e o ponto de contato; quem está perdendo recua o tronco e afunda a base. A leitura vem da silhueta, sem barra nem número na tela.
- **Entrada:** 0,08 s com easing saindo da guarda; a pose do forte some sob o impacto da entrada.
- **Vitória curta (0,25 s, a recuperação do vencedor):** a lâmina empurra através do cruzamento até um corte baixo à frente e volta à guarda. Cada estilo lê de um jeito:

| Estilo | Disputa | Vitória |
| --- | --- | --- |
| `standard` | inclinação média, sem traço próprio | empurra até 35° e volta |
| `guardian` | base mais baixa e firme, tremor menor | empurra curto e controlado (25°), tronco quase parado, volta direto à guarda |
| `wasp` | tronco mais à frente, tremor maior | empurra largo (55°) com o tronco e fecha com um giro completo da lâmina |

| `aggressor` | tronco bem à frente, tremor alto | empurra largo (50°) com o tronco |
| `juggernaut` | base mais baixa de todas, tremor mínimo | empurra curto (30°) e volta |
| `fencer` | tronco reto, tremor médio | empurra mínimo (20°), preciso |
| `dancer` | leve, tremor médio | empurra largo (50°) e fecha com giro da lâmina |
| `striker` | base baixa, tremor médio | empurra médio (40°) com o tronco |

O perdedor usa a pose de desequilíbrio existente.

## Camadas de arena como dados

Cada arena descreve camadas estáticas de geometria em tokens da paleta existente. O renderer pré-renderiza essas camadas em canvases internos e as reutiliza. Partículas ambientes são poucas, lentas e pouco opacas, atrás dos corpos; não geram eventos nem colisão. A plataforma provisória mantém o desenho atual até a implementação da Plataforma de Refino.

### Plataforma de Refino

Três planos de geometria procedural: pilares distantes em wall com alpha 0,25; passarelas e feixes verticais em floorEdge com alpha 0,16; plataforma metálica de 32 px sobre fosso escuro, com segmentos e suportes em wall. Vapor lento atrás dos corpos, alpha máximo 0,06, sem encobrir as silhuetas. A luz existente dos sabres no chão produz o reflexo da superfície. Sem cores novas nem assets externos.

### Santuário Alagado

Templo em ruínas à noite, com uma lâmina d'água rasa no chão.

- **Fundo**: lua grande e fria (glow em `arenaMoon`), colunas de pedra quebradas em alturas diferentes (`arenaStone`), um arco partido e escombros. Nada em contraste alto.
- **Chão**: água escura (`arenaWater`) com borda clara (`arenaWaterEdge`). Os lutadores e as lâminas **se refletem** na água, de cabeça para baixo e escurecidos (regra de reflexo no VISUAL_SYSTEM).
- **Ambiente**: anéis de ondulação pequenos e lentos na superfície da água e poeira fina caindo na luz da lua.
- **Atmosfera**: silêncio e respeito. É a arena mais calma do jogo.

### Mina de Cristal

Caverna escura, com cristais nas paredes.

- **Fundo**: rocha quase preta (`arenaRock`) em camadas de silhuetas irregulares, com estalactites. Cristais angulosos (`arenaCrystal`, borda `arenaCrystalEdge`) espalhados em dois planos.
- **Assinatura**: os cristais **pegam a cor do sabre mais próximo** (regra de cristais no VISUAL_SYSTEM). A caverna muda de cor conforme os lutadores se movem. É o pilar "o sabre é a fonte de luz" levado ao cenário.
- **Chão**: rocha (`arenaRock`) com borda em `arenaCrystalEdge`.
- **Ambiente**: brilhos minúsculos que flutuam devagar.

### Telhado Neon

Topo de prédio numa cidade vertical, à noite, na chuva.

- **Fundo**: torres em silhueta (`arenaCity`) com janelas apagadas e **letreiros em glifos inventados** (traços geométricos sem letras reais), em neon frio e fraco (`arenaNeon`, glow com alpha baixo). O neon nunca compete com os sabres.
- **Chão**: laje molhada (`arenaRoof`) que **reflete** os lutadores, mais fraco que a água do Santuário.
- **Ambiente**: chuva inclinada, rápida e fina, na frente do fundo e atrás dos corpos.

### Anel Orbital

Plataforma de metal presa a um anel acima de um planeta.

- **Fundo**: céu preto com estrelas fixas, um **planeta enorme** (`arenaPlanet`) ocupando a parte de baixo do fundo, com a borda iluminada pela atmosfera (`arenaAtmosphere`, glow), e a curva do anel cruzando o céu.
- **Iluminação**: um sol forte e distante à esquerda (glow branco-frio).
- **Chão**: placa metálica (`floor`) com borda clara.
- **Ambiente**: partículas quase paradas, como poeira em gravidade baixa.

### Floresta Lumínica

Clareira numa floresta bioluminescente.

- **Fundo**: troncos e raízes em silhueta (`arenaWood`), copas que cobrem o céu, fungos nos troncos (`arenaFungus`).
- **Assinatura**: os **fungos acendem na cor do sabre mais próximo**, com a mesma regra dos cristais da Mina.
- **Chão**: musgo escuro (`arenaMoss`).
- **Ambiente**: esporos subindo devagar.

Elementos interativos (colunas que caem, cristais que estilhaçam) ficam para o futuro: a arena reage a eventos de combate, como o `EffectsSystem`, sem mexer no combate.
