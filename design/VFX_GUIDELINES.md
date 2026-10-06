# VFX GUIDELINES

Segue [ART_DIRECTION.md](ART_DIRECTION.md) e [VISUAL_SYSTEM.md](VISUAL_SYSTEM.md).

## Princípios

- Efeitos são **curtos e fortes**. Nenhum efeito de combate deve durar mais de 0,5 s, exceto o golpe final.
- A intensidade acompanha a importância do evento.
- O efeito nunca esconde o que o oponente está fazendo.
- A cor do efeito vem do sabre envolvido. Faíscas de impacto são brancas ou amareladas.

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
| `final-blow` | `death` | flash e shake (somados ao efeito do hit) | máximo | máximo |
| `dodge-afterimage` | — | 2–3 silhuetas transparentes | — | — |

`dodge-afterimage` ainda não está implementado (precisa de um evento de esquiva). Câmera lenta no golpe final e hit stop ficam para a Fase 7.

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

## Implementação

- Partículas usam pool, sem `new` a cada frame.
- `EffectsSystem.spawn(type, params)` é a única porta de entrada.
- Efeitos são dados (tipo, posição, cor, tempo de vida). O desenho fica no código de render.
- Screen shake só pela Camera.
