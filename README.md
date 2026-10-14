# Duel of Fates — duelo 2D de lâminas de energia

## ⚠️ Aviso Legal / Disclaimer
Este é um projeto estritamente acadêmico e sem fins lucrativos, desenvolvido exclusivamente para fins de portfólio e aprendizado. 
Os conceitos de "A Força" e mecânicas de duelo contidos aqui são inspirados na franquia Star Wars, de propriedade da Lucasfilm Ltd. e Walt Disney Company. 
Não há intenção de violação de direitos autorais. Todo o código e implementação lógica são de autoria própria.

**Academic Project / Prototype — versão 3.0.0**

Jogo 2D de duelo de lâminas de energia para navegador, feito com HTML5, CSS3, JavaScript puro (ES Modules) e Canvas 2D. Sem frameworks, sem engine e sem bundler.

**Jogue no navegador:** https://nicolasgrotto.github.io/sw_duel_of_fates/

> Projeto acadêmico, sem fins comerciais, inspirado nos duelos de sabre de Star Wars. Não é um produto oficial e não tem afiliação com a Lucasfilm ou a Disney. O código usa termos neutros e não inclui assets oficiais, para que o jogo possa receber uma identidade própria no futuro (ver [DESIGN.md](DESIGN.md#propriedade-intelectual)).

![O Soberano lança Raio contra o Guardião na Cidadela do Eclipse](media/duel-lightning-eclipse.png)

| | |
| --- | --- |
| ![Ceifador e Garça nas Salinas de Vidro](media/duel-salt-flats.png) | ![Bastião e Espelho no Santuário Alagado](media/duel-sanctuary.png) |
| ![Menu principal](media/menu.png) | ![Seleção de personagem](media/character-select.png) |
| ![Diálogo da História no Santuário Alagado](media/story-dialogue.png) | |

## O que tem no jogo

- **11 personagens** com atributos (seis notas de 1 a 7; os secretos chegam a 8, 9 e 10), golpes, habilidade, técnicas, alinhamento, peças de roupa e IA próprios: Guardião, Sombra, Bastião, Vespa, Espelho, Haste, Brasa, Forja, Garça, Ceifador (lâmina dupla) e Eco. Mais um chefe no Arcade e na Sobrevivência e **três personagens secretos** (Soberano, Ancião e o Predestinado, em duas variantes), liberados pela História ou por um segredo na tela de abertura.
- **10 arenas** desenhadas por código, entre elas Santuário Alagado (com reflexo), Mina de Cristal, Telhado Neon, Salinas de Vidro, Convés em Voo, Cume Nevado e Cidadela do Eclipse.
- **Combate por timing**: rápido, forte, bloqueio, parry e parry perfeito com riposta, empurrão, esquiva (dash) e esquiva de precisão, sequências, golpe aéreo, pulo duplo, dash aéreo, disputa de lâminas, exaustão e ferimentos, e finalizações no K.O.
- **Técnicas de lâmina**: Giro, Avanço com corte, Arremesso da lâmina, Estocada, Corte ascendente, Rajada, Varredura e Investida descendente (no ar); duas técnicas que se cruzam terminam num choque.
- **Poderes do Fluxo** (opcionais): medidor próprio, catálogo de Fluxo comum, Aurora e Eclipse, conjuntos por personagem (ou montados na seleção) e resistência pela diferença de nível. Inclui projéteis, efeitos de estado, Absorção, Dreno, Truque Mental, Arsenal Telecinético e poderes de custo alto sinalizados no medidor, como Tempestade, Telecinese em Massa, Fratura, Repulsão Suprema, Santuário e Ira.
- **Modos**: **História** (campanha com protagonista criado e evoluído pelo jogador, rotas Aurora e Eclipse, diálogos, quatro finais e duelos secretos), Duelar (Fácil, Normal ou Difícil), Arcade, Sobrevivência, 2 Jogadores no mesmo teclado ou com dois controles, Tutorial, Treinos guiados, Desafio de parry, Treino (boneco configurável, gravação de inputs, hitboxes), Desafios com recorde, Galeria de poderes e Galeria da História.
- **Apresentação**: abertura com a lâmina acendendo, replay em câmera lenta do golpe final, música e som sintetizados que reagem à luta, cores de lâmina e trajes desbloqueáveis, português e inglês, teclas configuráveis e suporte a gamepad.
- **Celular e offline**: controles de toque (joystick e botões desenhados no jogo), menus por toque, paisagem com safe areas, efeitos reduzidos automáticos; depois do primeiro carregamento, o jogo abre sem conexão.

## Requisitos

- Navegador moderno (Chrome, Edge ou Firefox; toque em paisagem no Android/iOS)
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

## Publicar no GitHub Pages

O jogo é um site estático: não tem build, e todos os caminhos são relativos. O arquivo `.nojekyll` faz o Pages servir os arquivos como estão.

1. Envie o repositório para o GitHub.
2. Em **Settings → Pages**, escolha **Deploy from a branch**, a branch `main` e a pasta `/ (root)`.
3. O jogo fica em `https://<usuário>.github.io/<repositório>/`.

Versão publicada: https://nicolasgrotto.github.io/sw_duel_of_fates/

As opções e o progresso (teclas, cores desbloqueadas, recorde) ficam no `localStorage` do navegador de cada jogador.

### Offline

Depois do primeiro carregamento completo, o jogo abre sem conexão: o `sw.js` guarda os arquivos listados em `offline-resources.js`. Uma versão nova é baixada em segundo plano e só entra quando nenhuma aba está em duelo ou replay; vale no próximo carregamento. O save não é afetado.

- Depois de mudar qualquer arquivo do jogo (`src/`, `styles/`, `assets/`, `index.html`), rode `npm run offline` para regenerar a lista; o `npm test` avisa se ela ficou desatualizada.
- No `localhost`, o worker fica desligado para não esconder mudanças. Para testar o offline localmente, rode no console do navegador `localStorage.setItem('duel-of-fates.offline', 'on')` e recarregue.

## Testes

```bash
npm test
```

Usa o test runner nativo do Node (`node --test`). Não há dependências para instalar.

Os testes cobrem lógica, dados, persistência, offline e contratos de renderização, usando substitutos de DOM/Canvas quando necessário. Módulos de lógica não acessam DOM nem Canvas diretamente (ver [ARCHITECTURE.md](ARCHITECTURE.md)).

## Balanceamento

```bash
npm run simulate -- --duels 300 --difficulty normal
```

Roda duelos IA × IA sem navegador e mostra vitórias e estatísticas. `npm run matrix` roda todos contra todos e mostra a média de vitórias de cada personagem. `npm run reference -- --check tools/reference-v2.json` confere o preset de regressão, atualizado apenas nas mudanças intencionais aprovadas. Matrizes finais e limites da 3.0 em [versions/v3-release-report.md](versions/v3-release-report.md); opções e exemplos em [ARCHITECTURE.md](ARCHITECTURE.md#balanceamento).

## Desempenho

```bash
node tools/perfBudget.js
```

Mede o orçamento de frame no Chrome instalado (headless, pelo DevTools Protocol, sem dependências): tempo de CPU por frame projetado para CPU 6× e, como informação, as janelas do `GameLoop` sob limitação. Aceita dois diretórios para A/B. Detalhes em [ARCHITECTURE.md](ARCHITECTURE.md#medição-de-desempenho).

## Controles

| Ação | Teclas |
| --- | --- |
| Mover | `A` / `D` ou setas |
| Pular | `W`, seta para cima ou `Espaço` |
| Ataque rápido | `J` |
| Ataque forte | `K` |
| Bloquear (segurar) | `L` |
| Aparar / parry (tocar na hora do golpe) | `L` |
| Contra-ataque (logo depois de aparar) | `J` |
| Empurrar (quebra a defesa) | `L` + `J` |
| Esquivar (dash) | `Shift` |
| Esquiva de precisão | `S` ou seta para baixo |
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

Habilidade do personagem: `I`. Gamepad: ataques nos botões frontais (X rápido, Y forte), guarda em LB/LT, habilidade em RB, poder em RT, esquiva em B, pulo em A.

**Poderes do Fluxo** (opção **Poderes**, ligada por padrão em Duelar, 2 Jogadores, Treino, Arcade e Sobrevivência): `U` usa o espaço neutro do loadout; frente ou trás + `U` escolhe os outros espaços. Os poderes variam por personagem: o Guardião tem Repulsão, Cura e Barreira; a Garça tem Repulsão, Arremesso e Absorção. Segure para manter poderes canalizados. Habilidade (`I`) com direção usa as técnicas de lâmina do personagem; no ar, usa a técnica aérea quando disponível, também só com Poderes ligados. A lista de golpes (pausa) mostra os comandos de cada um. O catálogo tem 20 poderes e 8 técnicas; cada lutador usa seu próprio conjunto. O medidor fica abaixo da stamina. No celular há um botão **Poder**; o joystick escolhe a direção.

**Dois jogadores no mesmo teclado:** J1 usa `W A S D`, `F G H` (rápido, forte, guarda), `T` (habilidade), `R` (poder) e `Shift` esquerdo; J2 usa as setas, `J K L`, `I`, `O` (poder) e `Shift` direito (ou o teclado numérico). Cada jogador também pode usar um controle.

As duas variantes do Predestinado têm um quarto poder: **Poder + Habilidade** no teclado e no gamepad, ou o botão contextual **Poder 4** no toque. Os demais personagens usam até três poderes. Arcade e Sobrevivência usam o conjunto base; Duelar, 2 Jogadores e Treino permitem personalizá-lo na seleção.

As teclas de luta podem ser trocadas em **Opções → Configurar teclas** (fica salvo no navegador).

A esquiva de precisão evita um golpe com timing curto, sem stamina; se errar o tempo, a recuperação fica vulnerável. Todos podem pular uma segunda vez no ar; a esquiva apertada no ar vira um dash curto (uma vez por salto, sem invulnerabilidade) que atravessa o oponente. No teclado numérico do J2, `Numpad2` faz a esquiva de precisão e `Numpad4` aciona o forte.

Os controles ficam em [src/config/controlsConfig.js](src/config/controlsConfig.js).

## Mobile

Use o aparelho em paisagem. Joystick na esquerda; rápido, forte, guarda, esquiva, habilidade e pulo na direita. Arraste para baixo para a esquiva de precisão. Toque uma opção para selecionar e novamente para confirmar. A pausa fica no topo. O manifest permite adicionar à tela inicial; depois do primeiro carregamento completo, o jogo funciona offline. Conferido pelo autor em Chrome Android e Safari iOS reais (versions/v2.md).

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
| [versions/TASKS.md](versions/TASKS.md) | Índice do roadmap e ponto de continuidade |
| [versions/](versions/) | Tarefas de cada versão (v1 e v2 fechadas, backlog) |
| [AGENTS.md.example](AGENTS.md.example) | Modelo de instruções para agentes de IA (Claude Code, Codex, GPT). Copie para `AGENTS.md` (ignorado pelo git) e personalize |
| [CREDITS.md](CREDITS.md) | Créditos e aviso de marca |
| [ASSETS.md](ASSETS.md) | Origem e licença de cada asset |

## Licença

O código está sob a licença [MIT](LICENSE). A licença cobre apenas o código escrito para este projeto. Marcas e personagens de terceiros não estão incluídos (ver [CREDITS.md](CREDITS.md)).
