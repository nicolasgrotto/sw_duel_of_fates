export const storyTexts = {
  encounters: {
    trial: {
      title: 'O Teste',
      before: [
        { speaker: 'narrator', text: 'Na Plataforma de Refino, o Fluxo corre mais forte do que em qualquer outro lugar.' },
        { speaker: 'guardian', text: '{name}. Antes de deixar a Plataforma, mostre o que aprendeu.' },
        { speaker: 'protagonist', text: { light: 'Estou pronto para o teste, mestre.', dark: 'Chega de testes. Vou provar que já sou mais forte.' } },
      ],
      after: [
        { speaker: 'guardian', text: 'Boa lâmina. Mas o Fluxo não é só força: é escolha.' },
        { speaker: 'guardian', text: 'Dizem que o Soberano reúne duelistas no Anel Orbital. Siga o rastro dele.' },
      ],
    },
    forest: {
      title: 'Ecos na Floresta',
      before: [
        { speaker: 'narrator', text: 'A Floresta Lumínica devolve cada passo como um eco.' },
        { speaker: 'echo', text: 'Procurando o Soberano? Primeiro tente me encontrar.' },
      ],
      after: [
        { speaker: 'echo', text: 'Você enxerga através das fintas. Ele vai gostar de você... ou temer.' },
        { speaker: 'echo', text: 'Quem trabalha para ele espera no Telhado Neon.' },
      ],
    },
    rooftop: {
      title: 'A Vespa do Telhado',
      before: [
        { speaker: 'narrator', text: 'No Telhado Neon, a chuva não para e ninguém fica parado.' },
        { speaker: 'wasp', text: 'O Soberano paga bem por quem me vence. Pena que ninguém vence.' },
        { speaker: 'protagonist', text: { light: 'Não vim pelo pagamento.', dark: 'Então eu fico com o pagamento.' } },
      ],
      after: [
        { speaker: 'wasp', text: 'Rápido demais até para mim...' },
        { speaker: 'narrator', text: 'Algo muda no Fluxo de {name}: um segundo poder despertou.' },
      ],
    },
    mine: {
      title: 'Brasa na Mina',
      before: [
        { speaker: 'narrator', text: 'Os cristais da mina guardam a cor de cada lâmina que passa.' },
        { speaker: 'ember', text: 'Eu leio cada golpe antes de ele nascer. Mostre o seu.' },
      ],
      after: [
        { speaker: 'ember', text: 'Você não tem um padrão. Isso me assusta.' },
        { speaker: 'ember', text: 'O Bastião guarda o Santuário. Ele não deixa ninguém passar.' },
      ],
    },
    sanctuary: {
      title: 'O Muro do Santuário',
      before: [
        { speaker: 'narrator', text: 'No Santuário Alagado, a água repete o duelo de cabeça para baixo.' },
        { speaker: 'bastion', text: 'Ninguém atravessa. Nem com o Fluxo.' },
        { speaker: 'protagonist', text: { light: 'Não quero derrubar você. Só preciso chegar ao Soberano.', dark: 'Muros caem.' } },
      ],
      after: [
        { speaker: 'bastion', text: '...Atravessou.' },
        { speaker: 'bastion', text: 'Cuidado com a Sombra. Ela já serve ao Soberano.' },
      ],
    },
    shadowDuel: {
      title: 'Sombra',
      before: [
        { speaker: 'shadow', text: 'O Soberano viu você chegando. Ele me mandou terminar o serviço.' },
        { speaker: 'protagonist', text: { light: 'Ainda dá tempo de sair do lado dele.', dark: 'Ele mandou a pessoa errada.' } },
      ],
      after: [
        { speaker: 'shadow', text: 'Isso não acabou. O Fluxo dele me deu mais do que você imagina.' },
      ],
    },
    awakened: {
      title: 'A Sombra Desperta',
      before: [
        { speaker: 'narrator', text: 'Na Mina de Cristal, a Sombra volta, maior e mais escura.' },
        { speaker: 'shadowAwakened', text: 'Agora eu entendo o que ele prometeu.' },
      ],
      after: [
        { speaker: 'shadowAwakened', text: 'O Soberano... espera no Anel.' },
        { speaker: 'narrator', text: 'O caminho para o Anel Orbital está aberto.' },
      ],
    },
    sovereign: {
      title: 'O Soberano',
      before: [
        { speaker: 'narrator', text: 'No Anel Orbital, o Fluxo gira em volta de um único duelista.' },
        { speaker: 'sovereign', text: 'Sete duelos. Você chegou mais longe do que todos.' },
        { speaker: 'protagonist', text: { light: 'Vim devolver o Fluxo a quem ele pertence.', dark: 'Vim tomar o seu lugar.' } },
        { speaker: 'sovereign', text: 'Então venha. Mostre que é digno do Anel.' },
      ],
      after: [
        { speaker: 'sovereign', text: 'Impossível... ninguém me tocava assim há anos.' },
      ],
    },
    foretold: {
      title: 'O Predestinado',
      before: [
        { speaker: 'sovereign', text: 'Você venceu quase sem sangrar. Então ainda resta o meu herdeiro.' },
        { speaker: 'foretold', text: 'Ele me criou para este duelo. Eu não escolhi o meu lado.' },
        { speaker: 'protagonist', text: { light: 'Então escolha agora.', dark: 'Eu escolhi o meu. Veja aonde ele me trouxe.' } },
      ],
      after: [
        { speaker: 'foretold', text: 'O Fluxo... está quieto. Pela primeira vez.' },
      ],
    },
  },
  endings: {
    normal: {
      title: 'O Anel Silencia',
      lines: [
        { speaker: 'narrator', text: { light: 'O Soberano cai. O Fluxo volta a correr livre pelas arenas.', dark: 'O Soberano cai. O Anel agora gira em volta de {name}.' } },
        { speaker: 'narrator', text: 'Dizem que ele guardava um herdeiro. Talvez um duelo mais limpo o tivesse revelado.' },
      ],
    },
    secret: {
      title: 'O Equilíbrio',
      lines: [
        { speaker: 'narrator', text: 'O Predestinado baixa a lâmina.' },
        { speaker: 'narrator', text: { light: 'Aurora e Eclipse se encontram no Anel. O Fluxo, enfim, se equilibra.', dark: '{name} poderia governar o Anel. Em vez disso, deixa o Fluxo em equilíbrio.' } },
      ],
    },
  },
};
