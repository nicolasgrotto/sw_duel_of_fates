# TASKS

Índice do roadmap. As tarefas ficam em um arquivo por versão, na pasta [versions/](versions/).

| Arquivo | Conteúdo | Situação |
| --- | --- | --- |
| [versions/v1.md](versions/v1.md) | Fases 1–7 e roadmap v0.2 → v1.0 | fechada (tag `v1.0.0`, branch `main`) |
| [versions/v2.md](versions/v2.md) | Etapas v1.1 → v1.19, testes e critérios de aceitação | **fechada** (tag local `v2.0.0`, integrada à `origin/main`) |
| [versions/v3.md](versions/v3.md) | Etapas v2.1 → v2.10 e 3.0, especificação aprovada e critérios | **em planejamento** (branch local `v3-planning`); próxima: Preparação |
| [versions/backlog.md](versions/backlog.md) | Sugestões fora do ciclo aprovado | não comprometidas |

## Como atualizar

- Ao terminar uma task, marque `[x]` no arquivo da versão atual, no mesmo commit da task.
- Atualize o ponto de continuidade abaixo quando uma etapa terminar ou mudar de responsável.
- Uma versão nova ganha seu próprio arquivo em `versions/` e uma linha na tabela acima.

## Ponto de continuidade

- **Ciclo v2.1 → v3.0:** plano de versões em [versions/v3.md](versions/v3.md), na branch local `v3-planning`. Núcleo e itens flexíveis definidos; tasks detalhadas para Preparação, 2.1 e 2.2; as demais etapas são detalhadas na abertura. Direção aprovada em DESIGN → "Direção da v3". Próximo passo: Preparação (simulador com K.O. duplo separado, baseline v2, decisões na ARCHITECTURE, glossário com o autor, cenários de QA). Ponto de checagem do autor no fim da 2.5.

- **v1.0** publicada: `main` e tag `v1.0.0` no GitHub. Falta ativar o GitHub Pages (passos no README) e, se o autor quiser, gravar GIFs para o README.
- **v2.0** concluída com aprovação do autor: etapas **v1.1–v1.19**, tag local `v2.0.0` e integração por fast-forward publicada na `origin/main`. Versão do pacote: `2.0.0`. Fechamento: 580 testes, clássico idêntico em 364 cenários, médias com poderes 47,9–53,3%, secretos e chefes validados, Chrome CPU 6× dentro do orçamento. Matrizes na ARCHITECTURE e checklist em `versions/v2.md`. Hardware conferido pelo autor nas etapas anteriores. Tags permanecem locais. Próximo ciclo: `versions/v3.md`; ideias adicionais em `versions/backlog.md`.
