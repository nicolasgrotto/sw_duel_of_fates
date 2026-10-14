# TASKS

Índice do roadmap. As tarefas ficam em um arquivo por versão, nesta pasta, [versions/](./).

| Arquivo | Conteúdo | Situação |
| --- | --- | --- |
| [versions/v1.md](v1.md) | Fases 1–7 e roadmap v0.2 → v1.0 | fechada (tag `v1.0.0`, branch `main`) |
| [versions/v2.md](v2.md) | Etapas v1.1 → v1.19, testes e critérios de aceitação | **fechada** (tag local `v2.0.0`, integrada à `origin/main`) |
| [versions/v3.md](v3.md) | Etapas v2.1 → v2.24 e 3.0, especificação e critérios | **candidato 3.0.0 implementado** em `v3-development`; publicação aguardando decisão do autor, com ressalvas de QA no [relatório](v3-release-report.md) |
| [versions/backlog.md](backlog.md) | Sugestões e protótipo futuro Godot/GDScript | fora do ciclo; direção do protótipo aprovada, implementação futura |

## Como atualizar

- Ao terminar uma task, marque `[x]` no arquivo da versão atual, no mesmo commit da task.
- Atualize o ponto de continuidade abaixo quando uma etapa terminar ou mudar de responsável.
- Uma versão nova ganha seu próprio arquivo em `versions/` e uma linha na tabela acima.

## Branches

A branch de desenvolvimento leva o nome da versão de destino, igual ao arquivo em `versions/`: `v2-development` produziu a v2.0 (etapas v1.1 → v1.19) e está integrada na `main`; `v3-development` produz a v3.0 (etapas 2.1 → 2.10). A `main` só recebe a versão fechada.

## Ponto de continuidade

- **Direção futura aprovada pelo autor:** após terminar a versão web pura, detalhar um projeto separado em Godot/GDScript com uma arena e dois personagens existentes, duelo completo e animações mais avançadas, exportável para web. Código, configs e testes atuais serão a referência; adaptação manual, sem conversão automática. Escopo e critérios em [backlog.md → Protótipo futuro — duelo completo em Godot/GDScript](backlog.md#protótipo-futuro--duelo-completo-em-godotgdscript). Não altera a fila atual nem autoriza iniciar a migração agora.

- **3.0.0 — ponto atual:** implementação continuada pelo Codex a pedido do autor. Arcade e Sobrevivência com as capacidades do Duelar; Garça Lâmina 5, Sombra Vida 3 e Vespa Lâmina 3, aprovados pelo autor. Matriz final do elenco 48,8–52,3%, secretos e campanhas medidos; 1.962 testes passando e referência com 846 cenários, 0 changed, 0 missing. Replay deixa de desenhar o duelo encoberto e fica no orçamento 6×. Pacote `3.0.0`, lista offline atualizada, documentação e [relatório final](v3-release-report.md) prontos. **Pendências de aceitação:** publicação na `main`/tag pelo autor; reconferência offline em navegador comum e desempenho no hardware alvo (janelas acima do orçamento 6× registradas, nenhuma alegação de aprovação integral). Histórico, decisões e tags locais das etapas anteriores em [v3.md](v3.md); próximo ciclo em [backlog.md](backlog.md).

- **v1.0** publicada: `main` e tag `v1.0.0` no GitHub. Falta ativar o GitHub Pages (passos no README) e, se o autor quiser, gravar GIFs para o README.
- **v2.0** concluída com aprovação do autor: etapas **v1.1–v1.19**, tag local `v2.0.0` e integração por fast-forward publicada na `origin/main`. Versão do pacote: `2.0.0`. Fechamento: 580 testes, clássico idêntico em 364 cenários, médias com poderes 47,9–53,3%, secretos e chefes validados, Chrome CPU 6× dentro do orçamento. Matrizes na ARCHITECTURE e checklist em `versions/v2.md`. Hardware conferido pelo autor nas etapas anteriores. Tags permanecem locais. Próximo ciclo: `versions/v3.md`; ideias adicionais em `versions/backlog.md`.
