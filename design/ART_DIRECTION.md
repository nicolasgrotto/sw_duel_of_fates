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

## Paleta

### Ambiente

- preto profundo
- azul escuro
- cinza
- tons metálicos frios

Saturação baixa. A cor saturada da cena vem dos sabres e dos efeitos.

### Sabres

Cada personagem tem uma cor principal de sabre. O sabre possui:

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
