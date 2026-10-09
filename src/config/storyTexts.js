export const storyTexts = {
  narrator: '',
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
      ],
    },
  },
  endings: {},
};
