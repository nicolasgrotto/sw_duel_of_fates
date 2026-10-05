# Star Wars — Duel of Fates

Jogo 2D de duelo de sabres de luz feito com HTML5, CSS3, JavaScript puro (ES Modules) e Canvas 2D. Sem frameworks, sem engine e sem bundler.

> Projeto de estudo, inspirado no universo Star Wars. Não é um produto oficial. Antes de qualquer distribuição pública, substitua nomes, artes e sons por material original ou licenciado.

## Requisitos

- Navegador moderno (Chrome, Edge ou Firefox)
- Node.js 20+ (só para o servidor local e os testes; o jogo não tem dependências)

## Como rodar

ES Modules não carregam via `file://`. Abrir o `index.html` com duplo clique causa erro de CORS. Use o servidor local:

```bash
npm start
```

Depois abra http://localhost:8080.

A porta pode ser alterada com a variável `PORT`:

```bash
PORT=3000 npm start
```

Qualquer outro servidor estático também funciona (`python -m http.server`, Live Server do VS Code etc.).

## Testes

```bash
npm test
```

Usa o test runner nativo do Node (`node --test`). Não há dependências para instalar.

Os testes cobrem apenas módulos de lógica. Por isso, módulos de lógica não podem acessar DOM nem Canvas diretamente (ver [ARCHITECTURE.md](ARCHITECTURE.md)).

## Controles

| Ação | Teclas |
| --- | --- |
| Mover | `A` / `D` ou setas |
| Pular | `W`, seta para cima ou `Espaço` |
| Ataque rápido | `J` |
| Ataque forte | `K` |
| Bloquear | `L` |
| Esquivar | `Shift` |
| Confirmar | `Enter` |
| Pausar / voltar ao jogo | `Esc` ou `P` |
| Sair para o menu (na pausa) | `Q` |
| Debug | `F3` |

Os controles ficam em [src/config/controlsConfig.js](src/config/controlsConfig.js). Ações de combate ainda não estão implementadas (ver [TASKS.md](TASKS.md)).

## Documentação

| Arquivo | Conteúdo |
| --- | --- |
| [GAME_DESIGN.md](GAME_DESIGN.md) | O que o jogo é e como deve funcionar |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Como o código é organizado e como os módulos se comunicam |
| [TASKS.md](TASKS.md) | Roadmap e progresso |
| [AGENTS.md](AGENTS.md) | Regras para agentes de código (Claude Code, Codex) |
