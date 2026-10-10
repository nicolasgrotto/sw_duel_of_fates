# TASKS

Índice do roadmap. As tarefas ficam em um arquivo por versão, na pasta [versions/](versions/).

| Arquivo | Conteúdo | Situação |
| --- | --- | --- |
| [versions/v1.md](versions/v1.md) | Fases 1–7 e roadmap v0.2 → v1.0 | fechada (tag `v1.0.0`, branch `main`) |
| [versions/v2.md](versions/v2.md) | Etapas v1.1 → v1.19, testes e critérios de aceitação | **fechada** (tag local `v2.0.0`, integrada à `origin/main`) |
| [versions/v3.md](versions/v3.md) | Etapas v2.1 → v2.10 e 3.0, especificação aprovada e critérios | **em andamento** (branch local `v3-development`); 2.4 quase concluída (decisões do autor pendentes); simulação da 2.5 pronta; próxima: apresentação e calibração da 2.5 (Claude) |
| [versions/backlog.md](versions/backlog.md) | Sugestões fora do ciclo aprovado | não comprometidas |

## Como atualizar

- Ao terminar uma task, marque `[x]` no arquivo da versão atual, no mesmo commit da task.
- Atualize o ponto de continuidade abaixo quando uma etapa terminar ou mudar de responsável.
- Uma versão nova ganha seu próprio arquivo em `versions/` e uma linha na tabela acima.

## Branches

A branch de desenvolvimento leva o nome da versão de destino, igual ao arquivo em `versions/`: `v2-development` produziu a v2.0 (etapas v1.1 → v1.19) e está integrada na `main`; `v3-development` produz a v3.0 (etapas 2.1 → 2.10). A `main` só recebe a versão fechada.

## Ponto de continuidade

- **Ciclo v2.1 → v3.0:** plano de versões em [versions/v3.md](versions/v3.md), na branch local `v3-development`. **Preparação concluída**: simulador separa K.O. duplo de limite de tempo, referência v2 em `tools/reference-v2.json` (`npm run reference -- --check tools/reference-v2.json`), contratos na ARCHITECTURE → "v3: princípios e decisões", glossário aprovado e cenários de QA registrados. Divisão entre Codex e Claude por task em versions/v3.md → "Divisão entre agentes" (com regra de substituição). **2.1 concluída**: medição de frames no F3, replay interpolado (frames parados 99% → 9%), `evadeStreak`, luz, som e poses do sucesso da esquiva. **2.2 implementada**: tabelas PT-BR/EN em `src/config/locales/`, opção de idioma, revisão PT-BR (Vigor, Contra-ataque, Golpe de resposta) e tradução EN; falta só a revisão humana do tom pelo autor. **2.3 implementada**: estilos de movimento (`motionStyles`) com Guardião e Vespa, `standard` idêntico à v2; falta a aprovação do autor em jogo. **Simulação da 2.4 pronta**: capacidades, pipeline de dano, términos, exaustão, ferimentos/Cura, Ira, Foco automático, IA e diagnósticos implementados e testados. **2.4 quase concluída**: simulação (Codex), HUD, VFX, sons, tutorial e calibração (Claude); a Repulsão virou onda de choque. Faltam duas decisões do autor na "Validação da 2.4" (Foco do Bastião; Eco no limite). **Simulação da 2.5 pronta; falta a apresentação e a calibração do Claude**: capacidade, elegibilidade, estado espelhado, suspensão, resolução única, saída limpa, opção de segurar por jogador, IA, eventos, F3, replay e contadores implementados. 719 testes passando; referência v2 em 734 cenários sem alterações antes dos sete commits. Ponto de checagem do autor no fim da 2.5.

- **v1.0** publicada: `main` e tag `v1.0.0` no GitHub. Falta ativar o GitHub Pages (passos no README) e, se o autor quiser, gravar GIFs para o README.
- **v2.0** concluída com aprovação do autor: etapas **v1.1–v1.19**, tag local `v2.0.0` e integração por fast-forward publicada na `origin/main`. Versão do pacote: `2.0.0`. Fechamento: 580 testes, clássico idêntico em 364 cenários, médias com poderes 47,9–53,3%, secretos e chefes validados, Chrome CPU 6× dentro do orçamento. Matrizes na ARCHITECTURE e checklist em `versions/v2.md`. Hardware conferido pelo autor nas etapas anteriores. Tags permanecem locais. Próximo ciclo: `versions/v3.md`; ideias adicionais em `versions/backlog.md`.
