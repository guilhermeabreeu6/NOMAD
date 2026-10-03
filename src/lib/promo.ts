// Regras de promoção de frete. Lógica pura: sem DOM e sem Date.now() — o "agora" sempre chega como parâmetro.
import { DELIVERY_PROMOS, type DeliveryPromo } from '../data/promos';

/** Mesmos nomes do design (atributo data-promo do <html>). */
export type PromoPhase = 'breve' | 'ativa' | 'encerrada';

/** Palmas (America/Araguaina) é UTC-3 fixo, sem horário de verão. */
const PALMAS_OFFSET_MS = -3 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;

export function promoWindow(p: DeliveryPromo): { startMs: number; endMs: number } {
  const startMs = Date.parse(p.startsAt);
  const endMs = Date.parse(p.endsAt);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs >= endMs) {
    throw new Error(`Período inválido na promoção ${p.slug}`);
  }
  return { startMs, endMs };
}

/** [início, fim). Relógio inválido (NaN/Infinity) -> 'encerrada': nunca dá frete grátis por relógio quebrado. */
export function promoPhase(p: DeliveryPromo, nowMs: number): PromoPhase {
  if (!Number.isFinite(nowMs)) return 'encerrada';
  const { startMs, endMs } = promoWindow(p);
  if (nowMs < startMs) return 'breve';
  if (nowMs < endMs) return 'ativa';
  return 'encerrada';
}

/** Próximo instante em que a fase muda, ou null se já encerrada (ou relógio inválido). */
export function nextBoundaryMs(p: DeliveryPromo, nowMs: number): number | null {
  const phase = promoPhase(p, nowMs);
  if (phase === 'encerrada') return null;
  const { startMs, endMs } = promoWindow(p);
  return phase === 'breve' ? startMs : endMs;
}

/** Promoção ativa que inclui a região, ou null. */
export function activePromoFor(
  regionId: string,
  nowMs: number,
  promos: readonly DeliveryPromo[] = DELIVERY_PROMOS,
): DeliveryPromo | null {
  return promos.find((p) => p.eligibleRegionIds.includes(regionId) && promoPhase(p, nowMs) === 'ativa') ?? null;
}

/** Alguma promoção ativa agora (independe da região). */
export function activePromo(nowMs: number, promos: readonly DeliveryPromo[] = DELIVERY_PROMOS): DeliveryPromo | null {
  return promos.find((p) => promoPhase(p, nowMs) === 'ativa') ?? null;
}

/** Dia civil de Palmas (número de dias desde a época, em UTC-3). */
function palmasDay(ms: number): number {
  return Math.floor((ms + PALMAS_OFFSET_MS) / DAY_MS);
}

/**
 * Dias restantes contando o de hoje (01/10 -> 31; 31/10 -> 1). 0 fora do estado 'ativa'.
 */
export function daysLeft(p: DeliveryPromo, nowMs: number): number {
  if (promoPhase(p, nowMs) !== 'ativa') return 0;
  const { endMs } = promoWindow(p);
  return palmasDay(endMs - 1) - palmasDay(nowMs) + 1;
}

/** Texto do contador da landing ("Termina em N dias"); null fora do estado 'ativa'. */
export function countdownText(p: DeliveryPromo, nowMs: number): string | null {
  const n = daysLeft(p, nowMs);
  if (n <= 0) return null;
  if (n === 1) return 'Último dia: termina hoje às 23h59';
  if (n === 2) return 'Termina amanhã às 23h59';
  return `Termina em ${String(n)} dias`;
}
