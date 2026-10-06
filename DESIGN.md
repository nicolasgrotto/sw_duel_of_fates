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

Movimento, ataque rápido, ataque forte, bloqueio, esquiva, stamina e IA com perfis. Os detalhes ficam em [GAME_DESIGN.md](GAME_DESIGN.md).

## Personagens

- Personagens são **dados**, não código: nome, cores, cor do sabre, atributos e estilo de luta ficam em arquivos de configuração (ver ARCHITECTURE.md).
- Arquétipos iniciais:
  - **Guardião**: postura defensiva, movimentos controlados, sabre de cor fria (azul ou verde).
  - **Sombra**: postura agressiva, movimentos amplos, sabre vermelho.
- Silhueta reconhecível de longe: capa, capuz, postura e forma de segurar o sabre diferenciam os personagens antes da cor.
- Os nomes finais ainda não estão definidos.

## Arenas

- Primeira arena: plataforma industrial suspensa, com fosso escuro abaixo, passarelas e feixes de luz no fundo.
- Arenas são cenário: não interferem na lógica dos personagens.
- Profundidade com 2 a 3 camadas de fundo, e pouco detalhe perto da área de luta.

## UI

Minimalista, cinematográfica e pouco intrusiva. Ver [design/UI_GUIDELINES.md](design/UI_GUIDELINES.md).

## VFX

Efeitos curtos e fortes, só em momentos importantes. Ver [design/VFX_GUIDELINES.md](design/VFX_GUIDELINES.md).

## Animação

Toda ação tem 4 fases: **preparação → movimento → impacto → recuperação**. Ver [design/ART_DIRECTION.md](design/ART_DIRECTION.md).

## Áudio (planejado)

- Zumbido contínuo dos sabres, mais forte em movimento.
- Choque de sabres: som curto, metálico e elétrico.
- Música: ambiente tensa durante o duelo e silêncio curto antes do golpe final.
- Todo áudio externo precisa de registro em [ASSETS.md](ASSETS.md).

## O que NÃO fazer

- Visual genérico de jogo mobile (botões coloridos, brilho em tudo, ícones cartunescos).
- Excesso de elementos na tela durante o duelo.
- HUD colorido, grande ou que cubra a área de luta.
- Movimentos instantâneos, robóticos ou rápidos demais para ler.
- Efeitos longos que escondam o combate.
- Logos, nomes, personagens, músicas ou sons oficiais de Star Wars em assets ou no código.
- Um estilo novo criado por um agente sem atualizar estes documentos.

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

- Nome final do jogo (hoje: "Duel of Fates", só para o protótipo).
- Nomes e visual final dos personagens.
- Estilo dos sprites: desenho por código (formas e silhuetas) ou sprites desenhados/gerados.
- Licença do código.
