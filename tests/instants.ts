// Instantes de borda da promo-frete-outubro (horário de Palmas, UTC-3), compartilhados por unitários e E2E.
// Ver docs/squad/promo-frete-outubro/04-tech-lead.md, seção 5.

/** 30/09/2026 23:59:59.999 em Palmas: ainda "breve" (taxa normal). */
export const B1 = Date.parse('2026-10-01T02:59:59.999Z');
/**
 * 30/09/2026 23:50 em Palmas. Nos E2E o relógio simulado continua correndo, então B1 (1 ms antes do início)
 * viraria "ativa" durante o teste; a borda exata B1 é coberta nos unitários e na virada (promo-page.spec).
 */
export const ANTES_DO_INICIO = Date.parse('2026-10-01T02:50:00.000Z');
/** 01/10/2026 00:00:00.000 em Palmas: "ativa". */
export const B2 = Date.parse('2026-10-01T03:00:00.000Z');
/** 31/10/2026 23:59:00 em Palmas: "ativa" (último minuto). */
export const B3 = Date.parse('2026-11-01T02:59:00.000Z');
/** 31/10/2026 23:59:59.999 em Palmas: "ativa" (último ms). */
export const B3_LAST_MS = Date.parse('2026-11-01T02:59:59.999Z');
/** 01/11/2026 00:00:00.000 em Palmas: "encerrada". */
export const B4 = Date.parse('2026-11-01T03:00:00.000Z');
/** Meio de setembro: fora da promoção (testes antigos que conferem as taxas da tabela). */
export const SEM_PROMO = Date.parse('2026-09-15T15:00:00.000Z');
/** Meio de outubro: promoção ativa. */
export const EM_OUTUBRO = Date.parse('2026-10-15T15:00:00.000Z');
