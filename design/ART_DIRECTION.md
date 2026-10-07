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

Recursos de silhueta disponíveis em `characterData.appearance`: `shoulderScale` (largura dos ombros), `pauldrons` (ombreiras), `masked` (máscara no lugar do rosto), `bladeWidthScale` (espessura da lâmina) e `dualBlade` (segunda lâmina na mão de trás). Use-os para que cada personagem novo continue reconhecível pintado de preto.

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

## Camadas de arena como dados

Cada arena descreve camadas estáticas de geometria em tokens da paleta existente. O renderer pré-renderiza essas camadas em canvases internos e as reutiliza. Partículas ambientes são poucas, lentas e pouco opacas, atrás dos corpos; não geram eventos nem colisão. A plataforma provisória mantém o desenho atual até a implementação da Plataforma de Refino.

### Plataforma de Refino

Três planos de geometria procedural: pilares distantes em wall com alpha 0,25; passarelas e feixes verticais em floorEdge com alpha 0,16; plataforma metálica de 32 px sobre fosso escuro, com segmentos e suportes em wall. Vapor lento atrás dos corpos, alpha máximo 0,06, sem encobrir as silhuetas. A luz existente dos sabres no chão produz o reflexo da superfície. Sem cores novas nem assets externos.
