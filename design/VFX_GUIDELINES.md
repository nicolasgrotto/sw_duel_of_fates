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

Os valores abaixo são o ponto de partida. Os valores reais ficam em `src/config/` (planejado: `effectsConfig.js`).

| Efeito | Quando | Elementos | Intensidade |
| --- | --- | --- | --- |
| `saber-trail` | durante o arco de um ataque | rastro da lâmina | — |
| `hit-spark` | golpe acerta o corpo | 6–10 faíscas, flash pequeno | 0.4 |
| `block-spark` | golpe é bloqueado | 10–16 faíscas, flash médio | 0.6 |
| `heavy-impact` | ataque forte acerta | faíscas, flash, shake leve, hit stop | 0.8 |
| `saber-clash` | duas lâminas se chocam | muitas faíscas, flash forte, luz na cena, shake | 1.0 |
| `dodge-afterimage` | esquiva | 2–3 silhuetas transparentes | 0.3 |
| `final-blow` | golpe que zera a vida | câmera lenta curta, flash, shake | 1.0 |

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
