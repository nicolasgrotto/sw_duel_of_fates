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

Ordem média preservada: Ancião < Soberano < ambas as variantes do Predestinado. A ordem não é promessa por dificuldade ou adversário. No confronto direto entre variantes (480 duelos, ambas as ordens), Aurora 54,0% e Eclipse 46,0%.

## História

**2.916 cenários e 174.960 duelos**, seeds 1/2, 60 duelos por caso; três dificuldades de campanha, dois caminhos, três estilos, três builds e três pilotos. Builds: equilibrada (investimento alternado nos seis atributos), lâmina (prioriza Lâmina/Vida/Vigor) e fluxo (prioriza Fluxo/Vigor/Vida); as duas especializadas equipam poderes preferidos disponíveis do próprio caminho. Pontos, teto, slots e poderes vêm de `storyRun` e `storyConfig`; no Fácil, o orçamento leva todos os atributos ao teto. Cada encontro é medido isoladamente; a vitória usada para avançar a preparação não mede conclusão da campanha. Os 486 cenários contra Vespa/Sombra foram repetidos após seus ajustes, e os outros 2.430 preservados. **0 timeouts e 2 K.O. duplos**, contabilizados separadamente: seed 2, encontro Mina, estilo Voo, build fluxo, piloto Normal, um na campanha Fácil e outro na Difícil.

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

- 1.964 testes, 0 falhas, incluindo snapshots/replay, save antigo/corrompido/futuro, input, limites dos sistemas e offline. Duas regressões adicionais cobrem conexões liberadas pelo consumo dos corpos e falha de download após cabeçalhos HTTP 200.
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

## Desempenho final e limites

Chrome 155.0.8059.40 no Windows 10, Intel i5-2400 (4 CPUs lógicas), 16 GB, NVIDIA GT 730; Canvas 2D e composição acelerados, ANGLE/D3D11. CPU 6×, viewport 844×390, DPR 3 limitado a 2, **canvas 1688×780**, 120 frames de aquecimento e 11 s de coleta por caso, janelas de 60 frames do GameLoop/F3. Matrizes e testes encerrados antes das medições; nenhum teste pesado nosso em paralelo. Não é possível certificar ausência de toda carga externa na máquina. Intervalos de RAF e picos são registrados separadamente do tempo de trabalho.

| Cena | Update médio / maior janela (ms) | Render médio / maior janela (ms) | Intervalo p95 / máximo (ms) |
| --- | ---: | ---: | ---: |
| Duelo IA × IA | 2,17 / 2,84 | 7,61 / 10,03 | 18,10 / 36,10 |
| Raio × Barreira | 1,72 / 2,89 | 7,24 / 9,60 | 18,10 / 36,10 |
| Raio reduzido | 0,96 / 2,79 | 4,42 / 9,74 | 18,10 / 72,00 |
| Dois jogadores | 1,62 / 2,30 | 7,10 / 8,63 | 18,10 / 54,00 |
| Disputa | 1,02 / 1,98 | 5,03 / 8,37 | 18,10 / 36,00 |
| Replay completo | 0,95 / 1,64 | 6,33 / 8,62 | 18,10 / 36,00 |
| Replay reduzido | 1,05 / 1,58 | 6,99 / 9,22 | 18,10 / 89,90 |
| Estresse de pools | 0,81 / 1,31 | 10,86 / 13,95 | 36,00 / 36,10 |
| Estresse + F3 | 0,93 / 1,98 | 12,52 / 18,14 | 36,10 / 54,00 |

**Correção do replay.** A pilha desenhava o duelo suspenso antes do replay, que cobre a tela. `GameState.coversScreen` permite começar no último estado que cobre toda a cena; `ReplayState` usa esse contrato. Sobreposições transparentes e a volta ao duelo continuam funcionando. Render médio completo **10,87 → 6,33 ms**, maior janela **14,00 → 8,62 ms**; reduzido **9,61 → 6,99 ms**, maior janela **14,06 → 9,22 ms**. Comparação de quadro congelado antes/depois: apenas 4 dos 1.316.640 pixels diferiram, com variação máxima de 1 em um canal de 8 bits; sem diferença visual perceptível. Volta ao duelo conferida e teste da pilha cobre sobreposições e dois estados que cobrem a cena.

**Ressalvas.** O orçamento ≤ 2 ms update / ≤ 10 ms render por janela **não passou em todos os casos 6×**. Duelo: duas rodadas, update médio 1,95/2,17 ms, maiores janelas 2,90/2,84; render médio 7,82/7,61, maiores 10,06/10,03. Raio: update máximo 2,64/2,89 e render máximo 10,87/9,60. Estresse sintético excedeu render: 13,95 ms, com F3 18,14 ms; ele força 300 partículas, 8 luzes, 4 anéis, 2 ondas, 6 projéteis e Cura/Foco/Ira simultâneos. O caso com F3 não representa a cena comum. Não se atribuem os excessos a ruído sem prova.

Transições isoladas do replay corrigido em CPU 6×: entrada completa até 18,50 ms, reduzida até 23,70; saída incluindo update e render até 36,60/46,60 ms. São picos fora das médias de janela e continuam registrados. Sem exceções nos nove cenários e nas repetições. Sem limitação artificial, duelo update/render médio 0,27/0,77 ms (maiores janelas 0,32/0,87) e estresse + F3 0,13/1,63 ms (0,14/1,79). RAF p95 ~18 ms neste Chrome; esse ambiente não certifica 60 FPS em hardware móvel. A/Bs e conferências físicas das etapas anteriores continuam no histórico; esta etapa não repete Android/iOS.

**Reconferência solicitada antes da publicação.** Amostra de 5 s sem testes pesados nossos: CPU total média próxima de 26%; uma segunda amostra de processos atribuiu cerca de 15% da capacidade total a quatro processos `Code`. Nenhum processo do usuário foi encerrado. O autor autorizou continuar com a carga atual e registrar a limitação. Fechadas as abas temporárias dos testes anteriores; duas repetições sequenciais, sem profiler ou outros testes nossos simultâneos, no mesmo método 6×: duelo update/render médio **1,18/6,62 ms**, maiores janelas **1,72/9,88 ms**, RAF p95/máximo **16,80/33,50 ms** (647 frames); estresse médio **0,67/9,54 ms**, maiores **1,10/12,39 ms**, RAF **33,40/33,50 ms** (594 frames). Zero exceções. Duelo passou nessa rodada; estresse continuou acima de 10 ms. As rodadas anteriores permanecem válidas e registradas. Perfil de CPU separado aponta o desenho, incluindo reflexos e texto, como principal custo; não prova que todo excesso seja ruído nem elimina a necessidade de conferir o hardware alvo.

## Offline e publicação

**Causa encontrada e corrigida.** A instalação ficou presa porque o worker aguardava todos os cabeçalhos antes de consumir qualquer corpo. Respostas pendentes podiam reter as conexões necessárias aos demais arquivos. Um worker mínimo com um download completo isolou o problema; consumir imediatamente o corpo de uma cópia de cada resposta resolveu a instalação dos 174 arquivos. A resposta original é gravada depois da verificação completa, preservando sua URL. A explicação anterior de limitação do ambiente foi substituída por esse diagnóstico confirmado.

Lista regenerada: `vbcfa32f22696f38d`, 174 recursos. Os 12 testes de offline passaram: completude, hash por conteúdo, instalação atômica, falhas HTTP/MIME/corpo, segurança entre abas, navegação em subdiretório e isolamento do save. A nova regressão reproduz pedidos cujos cabeçalhos só chegam quando um corpo anterior é consumido; também verifica URL e bytes da resposta original no cache.

**Chrome 155, pacote final.** Instalação completa e reabertura com rede bloqueada em EN/PT-BR, sem exceções. Uma segunda conferência usou servidor temporário em `/game/`, sem alterar arquivos do pacote: 174 recursos no cache; duas abas com os estados reais do jogo, A em duelo e B no menu. Uma versão de teste foi servida alterando apenas o identificador da lista em memória: instalou e permaneceu em espera enquanto A estava em duelo; ao voltar ao menu, ativou, removeu o cache anterior e preservou um cache de outro aplicativo. A versão seguinte interrompeu o corpo de `src/main.js` após HTTP 200: instalação rejeitada, sem worker em espera, cache anterior completo e save v7 idêntico.

Servidor desligado de fato e inacessível por fetch do Node: novas abas abriram o `index.html` real em EN/PT-BR, chegaram ao menu pelo teclado e desenharam Play/Options e Jogar/Opções. Fonte disponível, notas finais Garça/Sombra/Vespa 5/3/3, recorde de Sobrevivência 23, Ancião e variante Eclipse preservados; zero exceções. Capturas dos dois menus conferidas. O servidor temporário, instrumentação e capturas não fazem parte do pacote.

O autor pediu conferir pendências antes de publicar; offline agora concluído. Autorizou continuar as medições com a carga atual e registrar a limitação. A conferência disponível de desempenho foi feita, com os excessos e a ausência de teste físico móvel preservados acima; não equivale à aprovação integral do orçamento 6×. Candidato `3.0.0` permanece em `v3-development`. Próximo item: decisão do autor sobre publicação com essas ressalvas ou nova medição no hardware alvo; integração na `main`, tag e envio ao GitHub aguardam essa decisão.

Arquivos principais: `src/config/combatRulesConfig.js`, `src/config/powersConfig.js`, `src/characters/characterData.js`, `tools/simulate.js`, `tools/releaseMatrix.js`, `tools/reference-v2.json`, `src/core/StateMachine.js`, `src/states/GameState.js`, `src/states/ReplayState.js`, `sw.js`, testes de regras/poderes/atributos/referência/pilha/offline, `offline-resources.js`, `package.json` e documentação README/DESIGN/GAME_DESIGN/ARCHITECTURE/versions.
