# TASKS

Índice do roadmap. As tarefas ficam em um arquivo por versão, nesta pasta, [versions/](./).

| Arquivo | Conteúdo | Situação |
| --- | --- | --- |
| [versions/v1.md](v1.md) | Fases 1–7 e roadmap v0.2 → v1.0 | fechada (tag `v1.0.0`, branch `main`) |
| [versions/v2.md](v2.md) | Etapas v1.1 → v1.19, testes e critérios de aceitação | **fechada** (tag local `v2.0.0`, integrada à `origin/main`) |
| [versions/v3.md](v3.md) | Etapas v2.1 → v2.15 e 3.0, especificação aprovada e critérios | **em andamento** (branch local `v3-development`); 2.1 a 2.5 e 2.11 fechadas (tags locais `v2.1` a `v2.5` e `v2.11`); próxima: 2.12 Animação de ataque dinâmica (Claude) |
| [versions/backlog.md](backlog.md) | Sugestões fora do ciclo aprovado | não comprometidas |

## Como atualizar

- Ao terminar uma task, marque `[x]` no arquivo da versão atual, no mesmo commit da task.
- Atualize o ponto de continuidade abaixo quando uma etapa terminar ou mudar de responsável.
- Uma versão nova ganha seu próprio arquivo em `versions/` e uma linha na tabela acima.

## Branches

A branch de desenvolvimento leva o nome da versão de destino, igual ao arquivo em `versions/`: `v2-development` produziu a v2.0 (etapas v1.1 → v1.19) e está integrada na `main`; `v3-development` produz a v3.0 (etapas 2.1 → 2.10). A `main` só recebe a versão fechada.

## Ponto de continuidade

- **Ciclo v2.1 → v3.0:** plano de versões em [versions/v3.md](v3.md), na branch local `v3-development`. **Preparação concluída**: simulador separa K.O. duplo de limite de tempo, referência v2 em `tools/reference-v2.json` (`npm run reference -- --check tools/reference-v2.json`), contratos na ARCHITECTURE → "v3: princípios e decisões", glossário aprovado e cenários de QA registrados. Divisão entre Codex e Claude por task em versions/v3.md → "Divisão entre agentes" (com regra de substituição). **2.1 concluída**: medição de frames no F3, replay interpolado (frames parados 99% → 9%), `evadeStreak`, luz, som e poses do sucesso da esquiva. **2.2 implementada**: tabelas PT-BR/EN em `src/config/locales/`, opção de idioma, revisão PT-BR (Vigor, Contra-ataque, Golpe de resposta) e tradução EN; validada pelo autor. **2.3 implementada**: estilos de movimento (`motionStyles`) com Guardião e Vespa, `standard` idêntico à v2; aprovada pelo autor em jogo. **2.4 fechada**: simulação (Codex) com capacidades, pipeline de dano, términos, exaustão, ferimentos/Cura, Ira, Foco automático, IA e diagnósticos; HUD, VFX, sons, tutorial e calibração em passos (Claude), validada pelo autor; a Repulsão virou onda de choque; o Bastião trocou o Foco pelo Redirecionamento e o Eco no limite foi aceito. **2.5 fechada**: simulação (Codex) com capacidade, elegibilidade, estado espelhado, suspensão, resolução única, saída limpa, opção de segurar, IA, eventos, F3 e contadores; apresentação (Claude) com lâminas cruzadas, inclinação pela vantagem, tremor, faíscas, vitória curta do Guardião e da Vespa, atrito contínuo e sons de pressão e desfecho; calibração com teto de 15 pressões/s e vitória por qualquer vantagem no fim do tempo; passo novo no tutorial. 728 testes passando; referência v2 regravada só nos 52 cenários com Poderes do Bastião. **Ponto de checagem feito**: o autor fechou 2.4 e 2.5 e decidiu acrescentar etapas 2.x antes da 3.0 (backlog com as animações de ataque, menu reformulado, seleção de personagem com o que cada um traz, personagem e cenário aleatórios, mais cenários, galeria de poderes); lista em versions/v3.md → "Ponto de checagem da 2.5". As etapas entraram como 2.11–2.15, com números novos para não renumerar as existentes; ordem de execução: 2.11 Galeria de poderes → 2.12 Animação de ataque dinâmica → 2.6 → 2.7 → 2.8 → 2.9 → 2.13 Menu e seleção → 2.14 Cenários novos → 2.15 Extras do backlog → 2.10 Offline → 3.0. **2.11 detalhada** (Claude): tasks, notas e desenho da tela em UI_GUIDELINES → "Galeria de poderes". **2.11 fechada** (tag local `v2.11`): implementação (Codex) e conferência no Chrome com ajustes de distância, rodapé, técnicas sem tier e chip de lançador no toque (Claude). 811 testes passando; referência v2 sem alterações. **Próximo: 2.12 Animação de ataque dinâmica (Claude)**, começando pelo detalhamento.

- **v1.0** publicada: `main` e tag `v1.0.0` no GitHub. Falta ativar o GitHub Pages (passos no README) e, se o autor quiser, gravar GIFs para o README.
- **v2.0** concluída com aprovação do autor: etapas **v1.1–v1.19**, tag local `v2.0.0` e integração por fast-forward publicada na `origin/main`. Versão do pacote: `2.0.0`. Fechamento: 580 testes, clássico idêntico em 364 cenários, médias com poderes 47,9–53,3%, secretos e chefes validados, Chrome CPU 6× dentro do orçamento. Matrizes na ARCHITECTURE e checklist em `versions/v2.md`. Hardware conferido pelo autor nas etapas anteriores. Tags permanecem locais. Próximo ciclo: `versions/v3.md`; ideias adicionais em `versions/backlog.md`.
