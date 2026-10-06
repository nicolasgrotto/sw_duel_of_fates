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

## Sabre

Renderizado em múltiplas camadas:

1. trail (durante golpes)
2. outer glow (largo, transparente)
3. colored glow (médio, cor do sabre)
4. white core (fino, branco)

Para os glows, use `globalCompositeOperation = 'lighter'`. Evite `shadowBlur` por frame em muitos objetos, porque é caro. Se a performance cair, pré-renderize o glow em um canvas offscreen e reutilize.

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
