# Backlog — sugestões futuras

O ciclo aprovado v2.1 → v3.0 está em [v3.md](v3.md). As sugestões abaixo ficam fora desse compromisso e exigem avaliação antes de implementação.

## Reconciliação do backlog anterior

- Cura, poderes com projéteis e três poderes por personagem já existem na v2.
- Fúria (agora o poder Ira), expansão da História por alinhamento, offline e quatro poderes exclusivos do Predestinado foram incorporados ao plano v3.
- As duas rotas aprovadas não incluem novas ramificações por escolhas de diálogo.
- Ocaso é uma skin específica do ciclo, não aprovação de um sistema geral de equipamentos ou animações exclusivas para cada skin.
- No ponto de checagem da 2.5, os itens de custo baixo e médio (acessibilidade competitiva e disputa por timing como protótipos, treinos guiados, desafios locais e galeria de finais) entraram na etapa 2.15, como flexíveis. A tabela abaixo mantém só o que continua fora do ciclo.

## Possibilidades futuras

| Ideia | Valor possível | Custo e condição |
| --- | --- | --- |
| Árvore extensa de habilidades | Mais especialização | Alto: UI, IA, save e muitas combinações; avaliar após a progressão por pontos |
| Equipamentos com atributos | Mais builds | Alto: risco de prejudicar leitura e equilíbrio; distinto de skins cosméticas |
| Criador detalhado | Expressão visual | Alto em arte e cobertura de animações; preservar silhuetas legíveis |
| Mais ramificações narrativas | Rejogabilidade | Alto em texto, tradução e QA; concluir primeiro as duas rotas |
| Voz gravada | Apresentação narrativa | Alto em produção, licenças, localização e tamanho offline |
| Destruição funcional de arena | Variação espacial | Alto: colisão, IA, replay e performance |
| Multiplayer online | Jogar à distância | Muito alto: rede, sincronização e operação; fora do escopo atual |
| Desmembramento funcional durante o round | Consequência visual persistente | Muito alto em animação e balanceamento; manter a solução aprovada de ferimento no round e corte no K.O. |

**O que tende a pesar e deve ser evitado:** muitas partículas ou glows dinâmicos por frame (usar cache e pools, como hoje), `shadowBlur` no canvas, imagens grandes sem compressão, áudio gravado longo (manter síntese), alocar objetos no loop, e qualquer biblioteca ou engine para resolver algo pequeno.
