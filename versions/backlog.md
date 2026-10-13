# Backlog — sugestões futuras

O ciclo aprovado v2.1 → v3.0 está em [v3.md](v3.md). As sugestões abaixo ficam fora desse compromisso e exigem avaliação antes de implementação.

## Reconciliação do backlog anterior

- Cura, poderes com projéteis e três poderes por personagem já existem na v2.
- Fúria (agora o poder Ira), expansão da História por alinhamento, offline e quatro poderes exclusivos do Predestinado foram incorporados ao plano v3.
- As duas rotas aprovadas não incluem novas ramificações por escolhas de diálogo.
- Ocaso é uma skin específica do ciclo, não aprovação de um sistema geral de equipamentos ou animações exclusivas para cada skin.
- Depois da conferência da 2.18, o autor removeu o Esmagamento (repetia o Estrangular).
- Na avaliação de poderes depois da 2.16, o autor aprovou as etapas 2.17 (poderes novos) e 2.18 (poderes de custo alto). Cataclismo e Redemoinho foram descartados por repetirem a chuva de impactos; a Suspensão Suprema ficou abaixo.
- No ponto de checagem da 2.5, os itens de custo baixo e médio (acessibilidade competitiva e disputa por timing como protótipos, treinos guiados, desafios locais e galeria de finais) entraram na etapa 2.15, como flexíveis. A tabela abaixo mantém só o que continua fora do ciclo. Naquela avaliação, o autor confirmou que esses itens não serão feitos; só o criador detalhado de personagem ficou como possibilidade futura. Posteriormente, aprovou documentar o protótipo Godot abaixo, fora do ciclo atual.

## Protótipo futuro — duelo completo em Godot/GDScript

**Decisão do autor:** terminar primeiro a versão web pura e, no futuro, criar um protótipo separado em Godot com GDScript, usando o jogo existente como referência. A direção e o recorte de dois personagens estão aprovados; a implementação ainda não começou. Não entra automaticamente na v3.0 nem substitui a fila atual.

- [x] Registrar a direção, o escopo inicial e os critérios de avaliação — **Codex**
- [ ] Detalhar o protótipo após a conclusão da versão pura; escolher os dois personagens, a arena, a versão do Godot e os dispositivos de teste.
- [ ] Implementar e validar o duelo completo de dois personagens em um projeto separado.
- [ ] Avaliar com o autor o resultado antes de decidir a migração do restante do jogo.

**Escopo inicial.** Uma arena e dois personagens existentes, com seus conjuntos completos de golpes, técnicas, habilidade e poderes. Duelo jogável contra IA, com movimento, pulo, esquiva, guarda, parry, recursos, dano, interrupções, rounds, K.O. e reinício/revanche. A interface deve permitir iniciar e concluir esse duelo em PT-BR e EN. Campanha, todo o elenco, demais modos e publicação definitiva serão detalhados somente depois da avaliação deste recorte.

**Referência e adaptação.** Usar o código, configs, documentos e cenários de teste da versão pura para portar as regras a GDScript e montar cenas Godot. Não há exportação automática do JavaScript para um projeto Godot. Preservar timestep fixo, separação entre simulação e apresentação e controle por ações. Adaptar cenários de teste para conferir tempos, alcances, hitboxes, defesas, custos e resultados; conferir determinismo e replay dentro do novo projeto, sem presumir equivalência numérica automática entre as engines.

**Animação e arte.** Explorar ossos 2D, deformações, transições entre movimentos, antecipação e recuperação dos golpes, reações ao impacto e movimento secundário de roupas. Partículas, shaders e câmera complementam a apresentação. A simulação continua dona dos tempos e acertos; a animação precisa acompanhar as hitboxes e permitir conferir o arco da lâmina nas duas orientações. Produzir as peças, rigs e trilhas necessários, com arte própria ou licenciada e registro de assets. O nível visual será aprovado num personagem antes de ampliar a produção; ferramentas não geram esse trabalho automaticamente.

**Web e critérios de avaliação.** Gerar uma exportação web hospedável e testar no navegador em desktop e celular, com teclado, controle e toque. Meta de 60 FPS nos dispositivos definidos no detalhamento, com medição de memória, carregamento e desempenho sob a carga real dos dois personagens e seus poderes. Usar comparação A/B para avaliar o custo da apresentação, com método e orçamentos apropriados ao Godot registrados antes da medição. Aceitar o protótipo somente após conferir o duelo completo, fidelidade às regras, animações legíveis, ausência de travamentos e validação do autor em PT-BR/EN.

**Próximo passo futuro:** depois de terminar a versão pura, detalhar este protótipo; usar seu resultado para decidir quanto do jogo levar ao Godot.

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
| Suspensão Suprema (prender o alvo por mais tempo para preparar um ataque) | Controle e combos | Repete o Congelar e levaria a combo garantido entre jogadores; avaliar só com uma defesa especial que permita escapar |
| Desmembramento funcional durante o round | Consequência visual persistente | Muito alto em animação e balanceamento; manter a solução aprovada de ferimento no round e corte no K.O. |

**O que tende a pesar e deve ser evitado:** muitas partículas ou glows dinâmicos por frame (usar cache e pools, como hoje), `shadowBlur` no canvas, imagens grandes sem compressão, áudio gravado longo (manter síntese), alocar objetos no loop, e qualquer biblioteca ou engine para resolver algo pequeno.
