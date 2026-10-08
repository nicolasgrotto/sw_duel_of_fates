# Backlog — depois da v2.0 (v3+)

Ideias avaliadas e adiadas no planejamento da v2. Nada aqui está aprovado.

- Poderes Cura e Fúria; poderes com projéteis; árvore de habilidades; mais de 2 poderes por personagem.
- Campanha maior que cerca de 8 encontros; missões diferentes por alinhamento; história ramificada.
- Service worker para jogar offline (PWA completo).
- Voz gravada (a v2 usa texto e som sintetizado).
- Character creator detalhado, equipamentos, skins com silhueta ou animação novas, destruição de arena.

**O que tende a pesar e deve ser evitado:** muitas partículas ou glows dinâmicos por frame (usar cache e pools, como hoje), `shadowBlur` no canvas, imagens grandes sem compressão, áudio gravado longo (manter síntese), alocar objetos no loop, e qualquer biblioteca ou engine para resolver algo pequeno.
