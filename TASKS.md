# TASKS

Índice do roadmap. As tarefas ficam em um arquivo por versão, na pasta [versions/](versions/).

| Arquivo | Conteúdo | Situação |
| --- | --- | --- |
| [versions/v1.md](versions/v1.md) | Fases 1–7 e roadmap v0.2 → v1.0 | fechada (tag `v1.0.0`, branch `main`) |
| [versions/v2.md](versions/v2.md) | Etapas v1.1 → v1.x, divisão entre agentes, testes, riscos e critérios de aceitação | **em andamento** (branch `v2-development`) |
| [versions/backlog.md](versions/backlog.md) | Ideias adiadas para a v3+ | — |

## Como atualizar

- Ao terminar uma task, marque `[x]` no arquivo da versão atual, no mesmo commit da task.
- Atualize o ponto de continuidade abaixo quando uma etapa terminar ou mudar de responsável.
- Uma versão nova ganha seu próprio arquivo em `versions/` e uma linha na tabela acima.

## Ponto de continuidade

- **v1.0** publicada: `main` e tag `v1.0.0` no GitHub. Falta ativar o GitHub Pages (passos no README) e, se o autor quiser, gravar GIFs para o README.
- **v2.0** em andamento na `v2-development`: etapas v1.1–v1.10 concluídas (tags locais), regressão e desempenho no Chrome feitos. Em curso a etapa "Fluxo profundo, habilidades e movimento aéreo" (v1.11 → v1.19, em `versions/v2.md`): **v1.11 a v1.17 concluídas** (tags locais `v1.11` a `v1.17`, Claude); próxima: **v1.18** (Redirecionamento e Tempestade), passada ao **Codex** junto com a v1.19 — ver "Passagem para o Codex" em `versions/v2.md`. Teste em aparelho real feito pelo autor. Depois da v1.19: tag `v2.0.0` e merge na `main`, com confirmação do autor.
