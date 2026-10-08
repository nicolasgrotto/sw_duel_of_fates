# Vigil — duelo 2D de lâminas de energia

**Academic Project / Prototype**

Jogo 2D de duelo de sabres de luz para navegador, feito com HTML5, CSS3, JavaScript puro (ES Modules) e Canvas 2D. Sem frameworks, sem engine e sem bundler.

> Projeto acadêmico, sem fins comerciais, inspirado nos duelos de sabre de Star Wars. Não é um produto oficial e não tem afiliação com a Lucasfilm ou a Disney. O código usa termos neutros e não inclui assets oficiais, para que o jogo possa receber uma identidade própria no futuro (ver [DESIGN.md](DESIGN.md#propriedade-intelectual)).

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

## Balanceamento

```bash
npm run simulate -- --duels 300 --difficulty normal
```

Roda duelos IA × IA sem navegador e mostra vitórias e estatísticas. Opções e exemplos em [ARCHITECTURE.md](ARCHITECTURE.md#balanceamento).

## Controles

| Ação | Teclas |
| --- | --- |
| Mover | `A` / `D` ou setas |
| Pular | `W`, seta para cima ou `Espaço` |
| Ataque rápido | `J` |
| Ataque forte | `K` |
| Bloquear (segurar) | `L` |
| Aparar / parry (tocar na hora do golpe) | `L` |
| Riposta (logo depois de aparar) | `J` |
| Empurrar (quebra a defesa) | `L` + `J` |
| Esquivar | `Shift` |
| Navegar nos menus | `W` / `S` ou setas |
| Confirmar | `Enter` |
| Voltar | `Esc` ou `Backspace` |
| Pausar / voltar ao jogo | `Esc` ou `P` |
| Debug | `F3` |
| Comportamento do boneco (modo Treino); também para a reprodução | `F4` |
| Gravar inputs no Treino | `F5` |
| Reproduzir no boneco | `F6` |
| Hitboxes no Treino, sem F3 | `F7` |

O preset alternativo, selecionável em Opções, usa setas para mover/pular e Z/X/C/V para rápido/forte/guarda/esquiva. A escolha é salva no navegador e a tela de Controles acompanha o preset. Gamepad padrão: stick/direcional para mover, A pular/confirmar, X rápido, Y forte, LB/LT guarda, B esquiva/voltar e Start pausa.

Habilidade do personagem: `I`. Gamepad: ataques nos botões frontais (X rápido, Y forte), guarda em LB/LT, habilidade em RB/RT, esquiva em B, pulo em A.

**Dois jogadores no mesmo teclado:** J1 usa `W A S D`, `F G H` (rápido, forte, guarda), `T` (habilidade) e `Shift` esquerdo; J2 usa as setas, `J K L`, `I` e `Shift` direito (ou o teclado numérico). Cada jogador também pode usar um controle.

Os controles ficam em [src/config/controlsConfig.js](src/config/controlsConfig.js).

## Documentação

| Arquivo | Conteúdo |
| --- | --- |
| [DESIGN.md](DESIGN.md) | Briefing: conceito, sensação, pilares e o que não fazer |
| [design/ART_DIRECTION.md](design/ART_DIRECTION.md) | Identidade visual |
| [design/VISUAL_SYSTEM.md](design/VISUAL_SYSTEM.md) | Cores, tipografia, camadas e regras de renderização |
| [design/UI_GUIDELINES.md](design/UI_GUIDELINES.md) | Interface e HUD |
| [design/VFX_GUIDELINES.md](design/VFX_GUIDELINES.md) | Efeitos visuais |
| [design/REFERENCES.md](design/REFERENCES.md) | Referências |
| [GAME_DESIGN.md](GAME_DESIGN.md) | Regras de gameplay |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Como o código é organizado e como os módulos se comunicam |
| [TASKS.md](TASKS.md) | Roadmap e progresso |
| [AGENTS.md](AGENTS.md) | Regras para agentes de IA (Claude Code, Codex, GPT) |
| [CREDITS.md](CREDITS.md) | Créditos e aviso de marca |
| [ASSETS.md](ASSETS.md) | Origem e licença de cada asset |

## Licença

O código está sob a licença [MIT](LICENSE). A licença cobre apenas o código escrito para este projeto. Marcas e personagens de terceiros não estão incluídos (ver [CREDITS.md](CREDITS.md)).
