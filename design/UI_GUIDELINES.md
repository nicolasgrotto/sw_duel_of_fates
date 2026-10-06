# UI GUIDELINES

Segue [ART_DIRECTION.md](ART_DIRECTION.md) e [VISUAL_SYSTEM.md](VISUAL_SYSTEM.md).

## Princípios

- **Minimalista**: só o que o jogador precisa agora.
- **Cinematográfica**: muito espaço vazio, texto centralizado e transições suaves.
- **Legível**: contraste alto entre texto e fundo, tamanho mínimo de 18px (lógicos) para dicas.
- **Pouco intrusiva**: durante o duelo, a UI fica nas bordas e nunca cobre a área de luta.

## Idioma

Textos da interface em **português (pt-BR)**. Código e commits em inglês.

## Onde a UI é desenhada

- No canvas, pelos estados (`render`), usando `themeConfig.textStyles`.
- Sem DOM durante o gameplay. HTML/CSS fora do canvas só se houver um motivo claro (ex.: menu de opções acessível), registrado em ARCHITECTURE.md.

## Telas

### Menu

- Título centralizado, em maiúsculas.
- Uma ação principal piscando suavemente ("Pressione ENTER para duelar").
- Controles resumidos em uma linha discreta no rodapé.

### Duelo (HUD — Fase 6)

```
[NOME ESQUERDA]  ████████░░          ░░████████  [NOME DIREITA]
                 ▬▬▬▬▬ stamina          stamina ▬▬▬▬▬
```

- Barras finas no topo, espelhadas (jogador à esquerda, oponente à direita).
- Vida: cor neutra clara. Vira cor de alerta só quando estiver baixa.
- Stamina: barra mais fina, abaixo da vida, em `textMuted`.
- Dano recebido: a parte perdida da barra some com atraso (barra "fantasma"), para o jogador ver quanto perdeu.
- Nada no centro da tela, exceto mensagens curtas de combate ("FIGHT", "K.O.") por no máximo 1,5 s.

### Pausa

- Overlay escuro sobre o duelo congelado.
- "PAUSADO" + uma linha de opções.

### Resultado (Fase 6)

- Nome do vencedor, uma frase curta e as opções (jogar de novo, menu).

## Dicas de controle

- Formato: `Tecla  ação`, separadas por `·`.
- Usar os nomes de teclas de `controlsConfig`. Se a tecla mudar, a dica muda junto.

## Acessibilidade

- Não depender só de cor: vida baixa também pisca ou muda de forma.
- Flash e screen shake com intensidade limitada (ver VFX_GUIDELINES). Planejado: opção para reduzir efeitos.

## Não fazer

- Botões coloridos, gradientes chamativos e ícones cartunescos.
- Barras grossas ou HUD ocupando mais de ~10% da altura da tela.
- Mais de uma fonte.
