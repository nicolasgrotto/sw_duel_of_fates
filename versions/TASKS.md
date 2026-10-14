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

- **3.0.0 — ponto atual:** implementação continuada pelo Codex a pedido do autor. Arcade e Sobrevivência com as capacidades do Duelar; Garça Lâmina 5, Sombra Vida 3 e Vespa Lâmina 3, aprovados pelo autor. Matriz final do elenco 48,8–52,3%, secretos e campanhas medidos; 1.964 testes passando e referência com 846 cenários, 0 changed, 0 missing. Replay deixa de desenhar o duelo encoberto e fica no orçamento 6×. Falha de instalação offline corrigida: 174 recursos, Chrome em EN/PT-BR com servidor desligado, subdiretório, atualização com duas abas e corpo interrompido preservando cache/save, sem exceções. Pacote `3.0.0`, documentação e [relatório final](v3-release-report.md) prontos. **Decisão pendente:** publicação na `main`/tag ou nova medição no hardware alvo; o autor autorizou medir com a carga atual e registrar a limitação. Janelas acima do orçamento 6× permanecem no relatório, sem aprovação integral. Nenhuma publicação após a escolha de conferir pendências. Histórico, decisões e tags locais das etapas anteriores em [v3.md](v3.md); próximo ciclo em [backlog.md](backlog.md).

- **Pedido mais recente da 3.0.0:** corrigir a ressalva de desempenho antes de publicar. Investigação de caches, caminhos e composição estática não demonstrou ganho suficiente; experimentos descartados, runtime preservado. Última coleta: estresse CPU 6× com render médio/máximo de janela 14,56/16,11 ms; estresse com F3 sem limitação artificial 1,56/1,64 ms. Zero exceções. Resultados e método no [relatório](v3-release-report.md). Correção do orçamento ainda pendente; pedido não autoriza publicação. Claude investigou de novo (seção "Investigação de desempenho" do relatório): ruído do ambiente, update somando dois passos em frames atrasados e custo fixo por frame dominam a maior janela; otimizações pequenas mantidas (−4% de CPU no render do estresse); garantir o orçamento exige decisão do autor entre reflexo mais leve, aura com menos cópias ou outra forma de medir. O autor aprovou as três opções; Claude implementa uma por commit (reflexo com silhueta de cor única e aura com duas cópias feitos; `tools/perfBudget.js` a seguir). Publicação continua não autorizada.

- **v1.0** publicada: `main` e tag `v1.0.0` no GitHub. Falta ativar o GitHub Pages (passos no README) e, se o autor quiser, gravar GIFs para o README.
- **v2.0** concluída com aprovação do autor: etapas **v1.1–v1.19**, tag local `v2.0.0` e integração por fast-forward publicada na `origin/main`. Versão do pacote: `2.0.0`. Fechamento: 580 testes, clássico idêntico em 364 cenários, médias com poderes 47,9–53,3%, secretos e chefes validados, Chrome CPU 6× dentro do orçamento. Matrizes na ARCHITECTURE e checklist em `versions/v2.md`. Hardware conferido pelo autor nas etapas anteriores. Tags permanecem locais. Próximo ciclo: `versions/v3.md`; ideias adicionais em `versions/backlog.md`.
