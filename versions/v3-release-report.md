# Fechamento da 3.0.0

Continuação do Claude pelo Codex, com autorização do autor para finalizar a versão, igualar Arcade/Sobrevivência ao Duelar e ajustar Garça, Sombra e Vespa.

## Implementação

- Arcade e Sobrevivência: exaustão, ferimentos, disputa e finalizações; Poderes, técnicas e Foco automático seguem Opções como no Duelar. Conjuntos base e progressão preservados.
- Garça: Lâmina 3 → 5. Sombra: Vida 4 → 3. Vespa: Lâmina 2 → 3. Bases, tempos, alcance, IA, Fluxo e mobilidade preservados. Ancião, Sombra Desperta e protagonista não herdam esses ajustes.
- Matrizes reutilizam a simulação real exportada por `tools/simulate.js`; `tools/releaseMatrix.js` monta elenco, secretos e builds válidas da campanha. A fixture histórica de atributos continua intacta e usa as notas antigas dos três personagens.

## Elenco

Node v24.16.0; 60 duelos por par ordenado, Normal/Difícil, seeds 1/2/3, lados alternados, limite de 120 s e todas as capacidades ligadas. **660 cenários e 39.600 duelos**, sem timeout ou K.O. duplo. Todas as médias combinadas estão na meta 46–54%. As diferenças entre dificuldades e seeds continuam registradas; simulação não representa taxa humana.

| Personagem | Média | Normal | Difícil | Intervalo entre seeds |
| --- | ---: | ---: | ---: | ---: |
| Guardião | 52,3% | 53,1% | 51,4% | 50,9–53,3% |
| Sombra | 49,6% | 56,1% | 43,1% | 48,1–50,4% |
| Bastião | 48,9% | 61,9% | 35,9% | 47,6–49,8% |
| Vespa | 50,3% | 39,8% | 60,8% | 49,4–51,8% |
| Espelho | 49,4% | 39,8% | 58,9% | 48,8–50,2% |
| Haste | 48,8% | 57,7% | 39,9% | 46,3–51,9% |
| Brasa | 52,0% | 45,1% | 58,8% | 50,7–53,1% |
| Forja | 50,6% | 54,9% | 46,2% | 49,0–51,4% |
| Garça | 50,1% | 44,1% | 56,2% | 49,2–51,5% |
| Ceifador | 49,9% | 48,8% | 51,1% | 49,3–50,4% |
| Eco | 50,4% | 53,5% | 47,3% | 49,9–51,0% |

Garça antes: 41,7%; candidato Lâmina 4: 46,6%; Lâmina 5: 51,1% nas seeds 1/2 antes dos ajustes adicionais. Sombra/Vespa naquele ponto: 55,6/45,6%; o autor autorizou calibrar ambas. Só Lâmina da Vespa: 55,0/50,5%; com Vida da Sombra: 50,3/50,6%. A terceira seed e a matriz completa acima confirmam o resultado final.

## Secretos e variantes

60 duelos, Normal/Difícil, seeds 1/2, ambos os pares ordenados contra os 11 comuns, mais Aurora × Eclipse em ambas as ordens. **360 cenários e 21.600 duelos**, sem timeout ou K.O. duplo.

| Personagem | Média | Normal | Difícil |
| --- | ---: | ---: | ---: |
| Ancião | 80,1% | 76,7% | 83,4% |
| Soberano | 82,6% | 88,4% | 76,7% |
| Predestinado Aurora | 89,0% | 88,7% | 89,3% |
| Predestinado Eclipse | 85,8% | 83,3% | 88,2% |

Ordem média preservada: Ancião < Soberano < ambas as variantes do Predestinado. A ordem não é promessa por dificuldade ou adversário.

## História

**2.916 cenários e 174.960 duelos**, seeds 1/2, 60 duelos por caso; três dificuldades de campanha, dois caminhos, três estilos, três builds e três pilotos. Builds: equilibrada (investimento alternado nos seis atributos), lâmina (prioriza Lâmina/Vida/Vigor) e fluxo (prioriza Fluxo/Vigor/Vida); as duas especializadas equipam poderes preferidos disponíveis do próprio caminho. Pontos, teto, slots e poderes vêm de `storyRun` e `storyConfig`; no Fácil, o orçamento leva todos os atributos ao teto. Cada encontro é medido isoladamente; a vitória usada para avançar a preparação não mede conclusão da campanha. Os 486 cenários contra Vespa/Sombra foram repetidos após seus ajustes, e os outros 2.430 preservados. **0 timeouts e 2 K.O. duplos**, contabilizados separadamente.

Piloto Normal fixo: vitórias por dificuldade da campanha, com percentual de todos os duelos em que venceu mantendo **mais de 75% de vida**, entre parênteses; esse é o acesso real ao secreto no chefe final, não uma estimativa pela vida média.

| Chefe | Fácil | Normal | Difícil |
| --- | ---: | ---: | ---: |
| Soberano | 90,3% (29,4%) | 33,5% (1,9%) | 6,4% (0,5%) |
| Ancião | 99,4% (51,7%) | 48,6% (4,4%) | 8,3% (0,4%) |

Piloto Difícil fixo: vitórias nos chefes finais e secretos por dificuldade da campanha.

| Adversário | Fácil | Normal | Difícil |
| --- | ---: | ---: | ---: |
| Soberano | 99,4% | 74,1% | 43,2% |
| Ancião | 99,9% | 83,4% | 36,0% |
| Predestinado Aurora | 40,2% | 28,7% | 23,8% |
| Predestinado Eclipse | 42,4% | 29,4% | 26,3% |

Piloto com a mesma dificuldade do adversário: Soberano 17,5/33,5/43,2%; Ancião 61,6/48,6/36,0%. Esse piloto muda junto do inimigo, por isso não serve sozinho para avaliar a progressão Fácil → Difícil. Com pilotos fixos, Fácil é mais permissivo. Nas campanhas Normal/Difícil, as três builds vencem os chefes; nenhuma depende de redistribuição. Contra secretos, Lâmina é mais eficaz: piloto Difícil na campanha Difícil, Aurora 12,2/40,8/18,3% e Eclipse 23,1/38,3/17,5% para equilibrada/lâmina/fluxo. As taxas baixas do piloto Normal contra IA de chefe continuam como dificuldade intencional da etapa 2.8.

## Consequências medidas

Médias por duelo, somando ambos os lutadores. Disputas contam as duas participações; dividir por dois para obter entradas distintas. Tempo protegido pelo Foco é soma de segundos dos dois participantes. O máximo de sequência registrado por duelo é muito baixo porque a IA quase não usa a esquiva de precisão; testes dirigidos cobrem sequências longas e Foco.

| Medida | Elenco | História |
| --- | ---: | ---: |
| Ferimentos braço/perna | 0,0147 / 0,2179 | 0,0055 / 0,0818 |
| Exaustão custo/guarda/quebra/dreno/disputa | 0,1081 / 0,0295 / 0,0479 / 0,5496 / 0,0002 | 0,0891 / 0,0071 / 0,0114 / 0,1951 / 0,0002 |
| Esquivas automáticas | 0,0000 | 0,0137 |
| Segundos de Foco | 0,0000 | 0,0748 |
| Dano adicional efetivo de Ira | 0,2680 | 0,3221 |
| Participações em disputa | 0,0041 | 0,0052 |
| Média do máximo de esquivas seguidas | 0,0002 | 0,0003 |

## Regressão e navegador

- 1.961 testes, 0 falhas, incluindo snapshots/replay, save antigo/corrompido/futuro, input, limites dos sistemas e offline.
- Referência: 846 cenários; 312 alterações intencionais, todas nos pares ordenados que incluem `heron`, `shadow` ou `wasp`: 78 pares × dois níveis × clássico/Poderes. Os 534 demais, incluindo os seis da História, permaneceram idênticos. Fixture regravada após auditoria; reconferência: **0 changed e 0 missing**.
- Chrome: Arcade/Sobrevivência em PT-BR/EN, Poderes ligados/desligados, comando real do teclado, pausa e reset; sem exceções.
- Revisão de conteúdo: 428 renders em PT-BR/EN, todos os personagens/variantes e arenas, menus/seleção/História e 20 poderes + 8 técnicas da galeria; sem exceções, chaves literais, `undefined`, `NaN` ou placeholders.
- Validações de gamepad, multitoque, recompensas, finais e atualização offline com múltiplas abas feitas nas etapas anteriores e cobertas pelos testes; não houve novo teste físico de celular nesta etapa.

## Reprodução

`npm.cmd run offline`, `npm.cmd test`, `npm.cmd run reference -- --check tools/reference-v2.json`.

`node tools/releaseMatrix.js --suite roster --seeds 1,2,3 --out <pasta-temporaria>/roster.json`

`node tools/releaseMatrix.js --suite secrets --out <pasta-temporaria>/secrets.json`

`node tools/releaseMatrix.js --suite story --out <pasta-temporaria>/story.json`

Comparação de candidatos: `--suite heron --heronBlade 4` ou `--targets shadow,wasp --ratings shadow.health=4,wasp.blade=2`. Todos usam os mesmos sistemas do jogo, sem modelo paralelo. Capturas e JSON de QA são temporários; este relatório textual fica no repositório, conforme ASSETS.md.
