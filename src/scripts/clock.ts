// Único ponto do cliente que lê o relógio do aparelho (lint proíbe Date.now() no resto de src/scripts e src/lib).
// Nos testes E2E o relógio é simulado pelo Playwright (page.clock).
export type Clock = () => number;

export const systemClock: Clock = () => Date.now();
