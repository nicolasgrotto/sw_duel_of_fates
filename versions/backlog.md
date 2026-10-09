# Backlog — sugestões futuras

O ciclo aprovado v2.1 → v3.0 está em [v3.md](v3.md). As sugestões abaixo ficam fora desse compromisso e exigem avaliação antes de implementação.

## Reconciliação do backlog anterior

- Cura, poderes com projéteis e três poderes por personagem já existem na v2.
- Fúria, expansão da História por alinhamento, offline e quatro poderes exclusivos do Predestinado foram incorporados ao plano v3.
- As duas rotas aprovadas não incluem novas ramificações por escolhas de diálogo.
- Ocaso é uma skin específica do ciclo, não aprovação de um sistema geral de equipamentos ou animações exclusivas para cada skin.

## Possibilidades futuras

| Ideia | Valor possível | Custo e condição |
| --- | --- | --- |
| Acessibilidade competitiva na disputa | Alternativa aos apertos que empate com quem aperta | Médio: a opção "segurar" da v3 (2.5) fica abaixo do teto de apertos de propósito; equivalência exige outro desenho |
| Treinos guiados das novas mecânicas | Ensinar timing e respostas | Baixo–médio após estabilizar regras; não substitui a atualização do tutorial já exigida |
| Desafios locais com regras e seed fixas | Reutilizar arenas e elenco | Médio: ampliar o modo existente, sem backend ou farm na História |
| Galeria de finais e diálogos | Valorizar conteúdo narrativo | Baixo–médio: tradução, persistência e proteção contra spoilers |
| Disputa baseada em timing | Alternativa aos apertos repetidos | Médio: protótipo separado; não altera a decisão atual por repetição |
| Árvore extensa de habilidades | Mais especialização | Alto: UI, IA, save e muitas combinações; avaliar após a progressão por pontos |
| Equipamentos com atributos | Mais builds | Alto: risco de prejudicar leitura e equilíbrio; distinto de skins cosméticas |
| Criador detalhado | Expressão visual | Alto em arte e cobertura de animações; preservar silhuetas legíveis |
| Mais ramificações narrativas | Rejogabilidade | Alto em texto, tradução e QA; concluir primeiro as duas rotas |
| Voz gravada | Apresentação narrativa | Alto em produção, licenças, localização e tamanho offline |
| Destruição funcional de arena | Variação espacial | Alto: colisão, IA, replay e performance |
| Multiplayer online | Jogar à distância | Muito alto: rede, sincronização e operação; fora do escopo atual |
| Desmembramento funcional durante o round | Consequência visual persistente | Muito alto em animação e balanceamento; manter a solução aprovada de ferimento no round e corte no K.O. |

**O que tende a pesar e deve ser evitado:** muitas partículas ou glows dinâmicos por frame (usar cache e pools, como hoje), `shadowBlur` no canvas, imagens grandes sem compressão, áudio gravado longo (manter síntese), alocar objetos no loop, e qualquer biblioteca ou engine para resolver algo pequeno.
