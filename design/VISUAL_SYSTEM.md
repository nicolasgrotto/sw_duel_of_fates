# VISUAL SYSTEM

Regras técnicas para todo código visual. Segue [ART_DIRECTION.md](ART_DIRECTION.md).

Os valores desta página existem no código em [src/config/themeConfig.js](../src/config/themeConfig.js). Se mudar um, mude o outro.

## Canvas

- Resolução lógica: **1280×720** (`gameConfig.canvas`).
- Todo desenho usa coordenadas lógicas. Nunca use o tamanho real do canvas na lógica.
- O canvas escala proporcionalmente (16:9) e respeita o `devicePixelRatio` para ficar nítido (`Renderer.fitToDisplay`).
- O chão da arena fica em `gameConfig.arena.floorY`.

## Paleta (tokens)

| Token | Valor | Uso |
| --- | --- | --- |
| `background` | `#05070d` | fundo geral (preto profundo) |
| `floor` | `#0d1220` | chão da arena |
| `floorEdge` | `#3a4a6b` | borda do chão |
| `wall` | `#1b2233` | limites e estruturas |
| `text` | `#e8ecf5` | texto principal |
| `textMuted` | `#8a94ab` | dicas e texto secundário |
| `accent` | `#9fb4d9` | destaque de UI (aço azulado) |
| `overlay` | `rgba(0, 0, 0, 0.65)` | escurecer a cena (pausa) |
| `debug` | `#7cfc00` | só no overlay de debug |

Cores de sabre (ficam em `fightersConfig`, por personagem):

| Nome | Valor |
| --- | --- |
| azul | `#3fa9ff` |
| verde | `#4cff7a` |
| vermelho | `#ff3b3b` |
| roxo | `#b45cff` |
| núcleo | `#ffffff` |

Não crie cores novas direto no código. Adicione um token aqui e no `themeConfig`.

## Tipografia

- Fonte: `system-ui` (sem fontes externas por enquanto).
- Estilos de texto ficam em `themeConfig.textStyles` (`title`, `heading`, `subtitle`, `hint`, `debug`).
- Títulos em maiúsculas. Textos de UI curtos.

## Camadas de renderização

A cena é desenhada sempre nesta ordem:

1. Background
2. Background effects
3. Arena
4. Characters
5. Sabers
6. Combat VFX
7. Foreground effects
8. UI
9. Debug

Na Pausa, o estado de baixo é desenhado inteiro e depois vem o overlay (ver `StateMachine.render`).

## Personagem

Cada personagem é desenhado em partes, nesta ordem:

1. sombra no chão
2. corpo
3. arma (cabo)
4. lâmina e glow
5. efeitos ligados ao personagem

O personagem não desenha a si mesmo. O código de render recebe a entidade e apenas lê seus dados.

Com dois lutadores, todos os corpos são desenhados antes de todos os sabres (camadas 4 e 5), para a lâmina nunca ficar escondida atrás do corpo do oponente.

### Silhueta desenhada por código

Enquanto não houver sprites, o personagem é feito de formas simples, em coordenadas locais (origem nos pés, olhando para a direita, espelhado com `scale(-1, 1)` quando olha para a esquerda).

| Parte | Proporção (da altura do corpo) | Forma |
| --- | --- | --- |
| Pernas | 0,45 | linhas grossas, quadril → joelho → pé |
| Tronco | 0,33 | polígono da túnica/capa |
| Cabeça | raio 0,075 | círculo, com capuz opcional |
| Braços | — | linhas do ombro até as mãos no cabo |

- Base de luta: pé da frente adiantado, pé de trás atrás, joelhos levemente dobrados.
- Partes variáveis por personagem (`characterData.appearance`): capuz levantado ou não, capa longa ou túnica, ângulo de guarda do sabre, inclinação do tronco.
- Sombra no chão: elipse escura que diminui quando o personagem sobe.

### Cores de personagem

Cores de personagem são **dados do personagem** e ficam em `src/characters/characterData.js`. É a única exceção à regra de cores no `themeConfig`.

| Personagem | Túnica / capa | Corpo | Sabre |
| --- | --- | --- | --- |
| Guardião | `#6b5a48` | `#2e2925` | azul `#3fa9ff` |
| Sombra | `#1f2029` | `#121319` | vermelho `#ff3b3b` |

Cores compartilhadas (em `themeConfig`):

| Token | Valor | Uso |
| --- | --- | --- |
| `saberHilt` | `#b9bec9` | cabo do sabre |
| `saberCore` | `#ffffff` | núcleo da lâmina |
| `groundShadow` | `rgba(0, 0, 0, 0.45)` | sombra no chão |
| `debugBody` | `rgba(124, 252, 0, 0.8)` | hurtbox (caixa do corpo) no debug |
| `debugInvulnerable` | `rgba(124, 252, 0, 0.25)` | hurtbox durante a invulnerabilidade |
| `debugHitbox` | `rgba(255, 80, 80, 0.9)` | hitbox ativa no debug |

## Sabre

Renderizado em múltiplas camadas:

1. trail (durante golpes)
2. outer glow (largo, transparente)
3. colored glow (médio, cor do sabre)
4. white core (fino, branco)

Em guarda (sem golpe), o sabre balança levemente com a respiração. A luz da lâmina projeta uma mancha suave da cor do sabre no chão.

Para os glows, use `globalCompositeOperation = 'lighter'`. Evite `shadowBlur` por frame em muitos objetos, porque é caro. Se a performance cair, pré-renderize o glow em um canvas offscreen e reutilize.

### Trail

- Durante a fase active de um ataque, o renderer guarda as últimas posições da lâmina (base e ponta) e desenha faixas entre elas.
- A faixa usa a cor do sabre, blend aditivo e some em ~0,12 s.
- O histórico usa o tempo da simulação (pausa congela o trail) e buffers fixos, sem alocar por frame.

### Luz do sabre no corpo

Um brilho suave (sprite radial pré-renderizado por cor) no meio da lâmina, com blend aditivo, ilumina o corpo e o chão por perto. O sprite é criado uma vez por cor e reaproveitado.

## Efeitos

VFX **não** são implementados dentro de `Fighter` nem de `CombatSystem`.

O `CombatSystem` emite eventos (`hit`, `block`, `clash`, `death`) e o `EffectsSystem` decide os efeitos:

```js
effects.spawn('saber-clash', { x, y, intensity: 1 });
```

O catálogo de efeitos fica em [VFX_GUIDELINES.md](VFX_GUIDELINES.md).

## Screen shake

Controlado pela **Camera**, a pedido do `EffectsSystem`. Nunca diretamente pelo `CombatSystem`.

## Performance visual

- Mire em 60 FPS.
- Use pool de partículas, sem criar objetos novos a cada frame.
- Limite o número de partículas ativas (ver VFX_GUIDELINES).
- Sempre restaure o estado do contexto (`save`/`restore`) depois de mudar composite, alpha ou transform.
