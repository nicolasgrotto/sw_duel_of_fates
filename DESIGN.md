# DESIGN — Briefing do jogo

Este é o briefing vivo do projeto. Ele define a **intenção**: o que o jogo deve fazer o jogador sentir e o que nunca deve parecer.

Todo agente (Claude Code, Codex, GPT ou outro) consulta este arquivo antes de criar qualquer coisa nova, seja tela, personagem, efeito ou som.

## Hierarquia dos documentos

Quando dois documentos discordarem, vale o que estiver mais acima:

```
DESIGN.md                     intenção e sensação           (este arquivo)
  ↓
design/ART_DIRECTION.md       identidade visual
  ↓
design/VISUAL_SYSTEM.md       regras técnicas de visual (cores, camadas, render)
design/UI_GUIDELINES.md       interface
design/VFX_GUIDELINES.md      efeitos
  ↓
GAME_DESIGN.md                regras de gameplay
  ↓
ARCHITECTURE.md               organização do código
  ↓
código
```

Design → Regras → Arquitetura → Implementação.

Se uma decisão importante ainda não estiver definida, **proponha e documente antes de implementar**. Nenhum agente introduz um estilo novo de forma isolada.

---

## Conceito

Um duelo de sabres de energia em 2D, cinematográfico e tenso. Dois combatentes, uma arena, nenhum elemento sobrando. Cada golpe tem peso, cada bloqueio tem som e luz, e cada erro custa caro.

Frase-guia: **"poucos golpes, todos importantes."**

## Público

- Avaliação acadêmica: o projeto mostra engenharia de software aplicada a jogos.
- Portfólio (GitHub e LinkedIn): demo jogável no navegador, código organizado e documentação clara.
- Jogadores de jogos de luta 2D e de ação que gostam de timing e leitura do oponente.

## Pilares

1. **Peso**: golpes com preparação, impacto e recuperação visíveis. Nada é instantâneo.
2. **Leitura**: o jogador sempre entende o que o oponente vai fazer, pela silhueta, pela postura e pelo brilho do sabre.
3. **Tensão**: ritmo de duelo, não de briga. Pausas, aproximações e explosões curtas de ação.
4. **Clareza visual**: fundo escuro, contraste forte e luz dos sabres como protagonista.

## Sensação desejada

- Duelo de cinema, não arcade frenético.
- Choque de sabres que faz o jogador sentir o impacto (flash, faíscas, tremor curto).
- Ambiente silencioso e grande, com os combatentes pequenos diante dele.

## Gameplay (resumo)

Movimento, ataque rápido, ataque forte, bloqueio, **parry por timing**, riposta, empurrão, esquiva, stamina, rounds e IA com perfis. Os detalhes ficam em [GAME_DESIGN.md](GAME_DESIGN.md).

O coração do duelo é o triângulo **ataque > empurrão > guarda/parry > ataque**. O parry é a mecânica-assinatura: o ataque forte se apara por reação, o rápido só por leitura. Assim o duelo premia ler o oponente, e não esperar por ele.

## Personagens

- Personagens são **dados**, não código: nome, cores, cor do sabre, atributos e estilo de luta ficam em arquivos de configuração (ver ARCHITECTURE.md).
- Arquétipos iniciais:
  - **Guardião**: postura defensiva, movimentos controlados, sabre de cor fria (azul ou verde).
  - **Sombra**: postura agressiva, movimentos amplos, sabre vermelho.
- Silhueta reconhecível de longe: capa, capuz, postura e forma de segurar o sabre diferenciam os personagens antes da cor.
- Os nomes finais ainda não estão definidos.
- **Elenco planejado** (conceitos aprovados, detalhes em [GAME_DESIGN.md](GAME_DESIGN.md#15-elenco-planejado)): Guardião, Sombra, Bastião, Vespa, Garça, Espelho, Haste, Brasa, Eco e Forja. Cada um muda a forma de jogar, não só os números, e passa no teste da silhueta pintada de preto.

## Arenas

- Primeira arena: plataforma industrial suspensa, com fosso escuro abaixo, passarelas e feixes de luz no fundo.
- Arenas são cenário: não interferem na lógica dos personagens.
- Profundidade com 2 a 3 camadas de fundo, e pouco detalhe perto da área de luta.

### Arenas planejadas

Todas seguem a regra "o sabre é a principal fonte de luz" e começam sem afetar o gameplay. A arquitetura deixa espaço para elementos interativos no futuro (reagindo a eventos de combate, como os efeitos).

| Arena | Identidade | Assinatura visual |
| --- | --- | --- |
| Plataforma de Refino | plataforma industrial suspensa (a primeira) | vapor subindo, chão metálico que reflete os sabres |
| Santuário Alagado | templo em ruínas com lâmina d'água | reflexo das lâminas na água |
| Anel Orbital | plataforma acima de um planeta | luz dura de lado, terminador dia/noite |
| Telhado Neon | cidade vertical na chuva, letreiros em glifos inventados | chuva virando vapor nas lâminas |
| Salinas de Vidro | deserto de sal ao entardecer | miragem de calor, poeira no knockback |
| Floresta Lumínica | floresta bioluminescente | esporos acendem na cor do sabre próximo |
| Convés em Voo | cargueiro atravessando nuvens | parallax rápido, vento nas capas |
| Mina de Cristal | caverna escura de cristais | cristais refratam a cor dos sabres |
| Cume Nevado | mosteiro em nevasca | neve de lado, luz branca difusa |
| Cidadela do Eclipse | salão brutalista com janela enorme | eclipse escurece tudo menos os sabres |

## UI

Minimalista, cinematográfica e pouco intrusiva. Ver [design/UI_GUIDELINES.md](design/UI_GUIDELINES.md).

## VFX

Efeitos curtos e fortes, só em momentos importantes. Ver [design/VFX_GUIDELINES.md](design/VFX_GUIDELINES.md).

## Animação

Toda ação tem 4 fases: **preparação → movimento → impacto → recuperação**. Ver [design/ART_DIRECTION.md](design/ART_DIRECTION.md).

## Áudio

Todo o som é **sintetizado** com a Web Audio API (osciladores, ruído e filtros). Não há arquivos de áudio, então não há questão de licença nem de franquia.

- Zumbido contínuo de cada sabre (grave, levemente desafinado), mais forte e mais agudo durante o golpe. Posição no estéreo segue o lutador.
- Golpe: "whoosh" de ruído filtrado. O forte é mais grave e longo.
- Hit: estalo elétrico curto com um baque grave.
- Bloqueio e clash: som metálico e elétrico. O clash é o mais forte.
- Quebra de guarda: estalo forte e descendente.
- Golpe final: baque grave e o sabre do derrotado "desligando" (tom caindo).
- Esquiva: whoosh curto e agudo.
- Interface: tique curto ao navegar, tom curto ao confirmar.
- Música: drone ambiente grave e tenso, com filtro respirando devagar. Abaixa no golpe final (silêncio curto) e volta depois.
- Som e música podem ser desligados nas Opções.
- Se um dia entrar áudio gravado, ele precisa de registro em [ASSETS.md](ASSETS.md).

## O que NÃO fazer

- Visual genérico de jogo mobile (botões coloridos, brilho em tudo, ícones cartunescos).
- Excesso de elementos na tela durante o duelo.
- HUD colorido, grande ou que cubra a área de luta.
- Movimentos instantâneos, robóticos ou rápidos demais para ler.
- Efeitos longos que escondam o combate.
- Logos, nomes, personagens, músicas ou sons oficiais de Star Wars em assets ou no código.
- Um estilo novo criado por um agente sem atualizar estes documentos.

Mecânicas e sistemas descartados de propósito (complexidade sem ganho):

- barra de postura separada da stamina, barra de super ou de especial;
- defesa alta/baixa, agachar e mixups de altura;
- juggles e combos no ar;
- dano por chip no bloqueio;
- números de dano na tela;
- XP, moeda, loja, melhoria de atributos ou qualquer grind;
- online, campanha com diálogos, perigos de arena que matam (ring-out);
- mais de 6 botões de combate.

---

## Propriedade intelectual

O projeto existe em duas etapas:

1. **Protótipo acadêmico** inspirado em Star Wars. A inspiração é declarada no README, sem se apresentar como produto oficial.
2. **Versão de portfólio**, com nome, personagens, cenários, sons e identidade visual próprios, mantendo a mecânica de duelo de sabres de energia.

Para essa troca não exigir reescrever o jogo:

- O código usa termos neutros (`Fighter`, `Saber`, `character`), nunca nomes da franquia.
- Nomes, título, textos e cores ficam em `src/config/`.
- Todo asset tem origem e licença registradas em [ASSETS.md](ASSETS.md).

## Decisões em aberto

Direção aprovada para a identidade de portfólio (ver TASKS, v0.3): cores de sabre sem a codificação herói/vilão (uma cor por personagem, sem moral implícita), uma única fonte display condensada com licença OFL, barras de letterbox como motivo cinematográfico (intro, K.O., parry perfeito) e ignição dos sabres no começo do duelo.

- Nome final do jogo (hoje: "Duel of Fates", só para o protótipo).
- Nomes e visual final dos personagens.
- Estilo dos sprites: desenho por código (formas e silhuetas) ou sprites desenhados/gerados.
