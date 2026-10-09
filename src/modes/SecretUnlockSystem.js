function getKind(token) {
  return token.slice(0, token.indexOf(':'));
}

export class SecretUnlockSystem {
  constructor({ sequences, timeout }) {
    this.sequences = sequences;
    this.timeout = timeout;
    this.progress = sequences.map(() => 0);
    this.idleTime = 0;
  }

  update(dt) {
    this.idleTime += dt;
    if (this.idleTime > this.timeout) {
      this.progress.fill(0);
    }
  }

  feed(token) {
    this.idleTime = 0;
    let matched = null;
    for (let index = 0; index < this.sequences.length; index += 1) {
      const { tokens } = this.sequences[index];
      if (getKind(token) !== getKind(tokens[0])) {
        continue;
      }
      const position = this.progress[index];
      if (token === tokens[position]) {
        this.progress[index] = position + 1;
      } else {
        this.progress[index] = token === tokens[0] ? 1 : 0;
      }
      if (this.progress[index] === tokens.length) {
        this.progress[index] = 0;
        matched = this.sequences[index];
      }
    }
    return matched;
  }
}
