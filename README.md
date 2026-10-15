# Duel of Fates — duelo 2D de lâminas de energia

**Versão 3.0.0 · [Jogue no navegador](https://nicolasgrotto.github.io/sw_duel_of_fates/)**

Jogo 2D de duelo de lâminas de energia para navegador, feito com HTML5, CSS3, JavaScript puro (ES Modules) e Canvas 2D. Sem frameworks, sem engine e sem bundler.

> ⚠️ **Aviso legal / Disclaimer.** Projeto estritamente acadêmico e sem fins lucrativos, feito para portfólio e aprendizado. Os conceitos de "A Força" e as mecânicas de duelo são inspirados na franquia Star Wars, de propriedade da Lucasfilm Ltd. e da Walt Disney Company. Não é um produto oficial, não tem afiliação com elas e não há intenção de violar direitos autorais. Todo o código é de autoria própria, usa termos neutros e não inclui assets oficiais (ver [DESIGN.md](DESIGN.md#propriedade-intelectual)).

![O Soberano lança Raio contra o Guardião na Cidadela do Eclipse](media/duel-lightning-eclipse.png)

| | |
| --- | --- |
| ![Ceifador e Garça nas Salinas de Vidro](media/duel-salt-flats.png) | ![Bastião e Espelho no Santuário Alagado](media/duel-sanctuary.png) |
| ![Menu principal](media/menu.png) | ![Seleção de personagem](media/character-select.png) |
| ![Diálogo da História no Santuário Alagado](media/story-dialogue.png) | |

## O que tem no jogo

- **11 personagens** com atributos, golpes, habilidade, técnicas, alinhamento, trajes e IA próprios: Guardião, Sombra, Bastião, Vespa, Espelho, Haste, Brasa, Forja, Garça, Ceifador (lâmina dupla) e Eco. Mais um chefe e **três personagens secretos** (Soberano, Ancião e o Predestinado, em duas variantes).
- **10 arenas** desenhadas por código, como Santuário Alagado (com reflexo), Mina de Cristal, Telhado Neon, Salinas de Vidro e Cidadela do Eclipse.
- **Combate por timing**: rápido, forte, bloqueio, parry e parry perfeito com contra-ataque, empurrão, esquiva e esquiva de precisão, pulo duplo, dash aéreo, disputa de lâminas, exaustão, ferimentos e finalizações no K.O.
- **Técnicas de lâmina** e **Poderes do Fluxo** (opcionais): 8 técnicas e 20 poderes nos caminhos Aurora e Eclipse, com conjunto próprio de cada personagem ou montado na seleção.
- **Modos**: História (campanha com protagonista próprio, duas rotas e quatro finais), Duelar, Arcade, Sobrevivência, 2 Jogadores, Tutorial, Treinos guiados, Desafio de parry, Treino, Desafios e Galerias.
- **Apresentação**: replay em câmera lenta do golpe final, música e som sintetizados que reagem à luta, cores de lâmina e trajes desbloqueáveis, português e inglês, teclas configuráveis e gamepad.
- **Celular e offline**: controles de toque em paisagem; depois do primeiro carregamento, o jogo abre sem conexão. Opções e progresso ficam salvos no navegador.

## Controles

| Ação | Teclado | Gamepad |
| --- | --- | --- |
| Mover | `A` / `D` ou setas | stick / direcional |
| Pular (duas vezes no ar) | `W`, seta para cima ou `Espaço` | A |
| Ataque rápido / forte | `J` / `K` | X / Y |
| Guarda (segurar) e parry (tocar na hora do golpe) | `L` | LB / LT |
| Contra-ataque (logo depois do parry) | `J` | X |
| Empurrar (quebra a defesa) | `L` + `J` | LB + X |
| Esquivar (no ar, dash curto) | `Shift` | B |
| Esquiva de precisão | `S` ou seta para baixo | baixo |
| Habilidade (com direção: técnicas de lâmina) | `I` | RB |
| Poder (com frente ou trás: outros espaços; segure para canalizar) | `U` | RT |
| Quarto poder (só o Predestinado) | `U` + `I` | RT + RB |
| Pausar | `Esc` ou `P` | Start |
| Confirmar / voltar nos menus | `Enter` / `Esc` | A / B |

- **Dois jogadores no mesmo teclado:** J1 usa `W A S D`, `F G H` (rápido, forte, guarda), `T` (habilidade), `R` (poder) e `Shift` esquerdo; J2 usa as setas, `J K L`, `I`, `O` (poder) e `Shift` direito, ou o teclado numérico. Cada jogador também pode usar um controle.
- **Opções:** preset alternativo (setas e `Z X C V`) e troca de teclas em **Configurar teclas**. A lista de golpes de cada personagem fica na pausa.
- **Celular:** joystick à esquerda; botões de ataque, guarda, esquiva, habilidade, poder e pulo à direita; arraste para baixo para a esquiva de precisão.
- **Treino e debug:** `F3` debug, `F4` comportamento do boneco, `F5` gravar inputs, `F6` reproduzir, `F7` hitboxes.

## Rodar localmente

Requer Node.js 20+ (só para o servidor local e as ferramentas; o jogo não tem dependências).

```bash
npm start          # http://localhost:8080 (porta via PORT=3000)
```

Abrir o `index.html` direto (`file://`) não funciona: ES Modules precisam de um servidor. Qualquer servidor estático serve.

## Desenvolvimento

```bash
npm test                                           # testes (node --test)
npm run offline                                    # regenera a lista do offline após mudar src/, styles/, assets/ ou index.html
npm run simulate -- --duels 300 --difficulty normal   # duelos IA × IA sem navegador
npm run matrix                                     # todos contra todos
npm run reference -- --check tools/reference-v2.json  # regressão do equilíbrio
node tools/perfBudget.js                           # orçamento de frame no Chrome instalado
```

No `localhost` o modo offline fica desligado; para testá-lo, rode `localStorage.setItem('duel-of-fates.offline', 'on')` no console e recarregue. Opções e exemplos de cada ferramenta em [ARCHITECTURE.md](ARCHITECTURE.md).

## Documentação

| Arquivo | Conteúdo |
| --- | --- |
| [DESIGN.md](DESIGN.md) | Briefing: conceito, pilares e o que não fazer |
| [design/](design/) | Direção de arte, sistema visual, UI, efeitos e referências |
| [GAME_DESIGN.md](GAME_DESIGN.md) | Regras de gameplay |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Organização do código, ferramentas e medições |
| [versions/TASKS.md](versions/TASKS.md) | Roadmap e ponto de continuidade; tarefas de cada versão em [versions/](versions/) |
| [AGENTS.md.example](AGENTS.md.example) | Modelo de instruções para agentes de IA; copie para `AGENTS.md` |
| [CREDITS.md](CREDITS.md) e [ASSETS.md](ASSETS.md) | Créditos, aviso de marca e licença de cada asset |

## Licença

O código está sob a licença [MIT](LICENSE). A licença cobre apenas o código escrito para este projeto; marcas e personagens de terceiros não estão incluídos (ver [CREDITS.md](CREDITS.md)).
