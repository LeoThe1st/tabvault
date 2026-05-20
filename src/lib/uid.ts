export const uid = (): string =>
  crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2);
