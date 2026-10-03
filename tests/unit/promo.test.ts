import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ARRANGE_AREAS, OTHER_REGION_ID, REGIONS, findRegion } from '../../src/data/catalog';
import { DELIVERY_PROMOS, FRETE_OUTUBRO, REGION_NEIGHBORHOODS } from '../../src/data/promos';
import { computeTotals, parseRegionChoice, quoteDelivery } from '../../src/lib/order';
import {
  activePromo,
  activePromoFor,
  countdownText,
  daysLeft,
  nextBoundaryMs,
  promoPhase,
  promoWindow,
} from '../../src/lib/promo';
import { B1, B2, B3, B3_LAST_MS, B4, EM_OUTUBRO, SEM_PROMO } from '../instants';

const { startMs, endMs } = promoWindow(FRETE_OUTUBRO);
const ELIGIBLE = ['q700s-200', 'q300n-600n', 'q800-1200', 'q1300s-1500s', 'santo-amaro'];
const EXCLUDED = ['lago-norte', 'bertaville-aurenys', 'taquaralto-lago-sul', 'taquari'];
/** Instante em Palmas (UTC-3) a partir de "AAAA-MM-DDTHH:mm". */
const palmas = (local: string): number => Date.parse(`${local}:00-03:00`);

describe('período da promoção', () => {
  it('01/10/2026 00:00 até 01/11/2026 00:00 (exclusivo), em Palmas', () => {
    expect(new Date(startMs).toISOString()).toBe('2026-10-01T03:00:00.000Z');
    expect(new Date(endMs).toISOString()).toBe('2026-11-01T03:00:00.000Z');
    expect(FRETE_OUTUBRO.timeZone).toBe('America/Araguaina');
  });

  it('America/Araguaina continua UTC-3 em outubro de 2026 (se voltar o horário de verão, revisar os ISO)', () => {
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Araguaina', timeZoneName: 'longOffset' });
    for (const ms of [startMs, B3, endMs]) {
      const offset = fmt.formatToParts(ms).find((p) => p.type === 'timeZoneName')?.value;
      expect(offset).toBe('GMT-03:00');
    }
  });

  it('período inválido lança', () => {
    expect(() => promoWindow({ ...FRETE_OUTUBRO, endsAt: 'x' })).toThrow();
    expect(() => promoWindow({ ...FRETE_OUTUBRO, endsAt: FRETE_OUTUBRO.startsAt })).toThrow();
  });
});

describe('promoPhase (bordas B1-B4)', () => {
  it.each([
    ['B1 30/09 23:59:59.999', B1, 'breve'],
    ['startMs - 1', startMs - 1, 'breve'],
    ['B2 01/10 00:00', B2, 'ativa'],
    ['meio de outubro', EM_OUTUBRO, 'ativa'],
    ['B3 31/10 23:59', B3, 'ativa'],
    ['31/10 23:59:59.999', B3_LAST_MS, 'ativa'],
    ['endMs - 1', endMs - 1, 'ativa'],
    ['B4 01/11 00:00', B4, 'encerrada'],
    ['setembro', SEM_PROMO, 'breve'],
    ['2027', Date.parse('2027-01-01T00:00:00Z'), 'encerrada'],
  ] as const)('%s -> %s', (_n, now, phase) => {
    expect(promoPhase(FRETE_OUTUBRO, now)).toBe(phase);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'relógio inválido (%s) -> encerrada (nunca dá frete grátis)',
    (now) => {
      expect(promoPhase(FRETE_OUTUBRO, now)).toBe('encerrada');
      expect(activePromoFor('q700s-200', now)).toBeNull();
    },
  );
});

describe('nextBoundaryMs', () => {
  it('breve -> início; ativa -> fim; encerrada -> null', () => {
    expect(nextBoundaryMs(FRETE_OUTUBRO, B1)).toBe(startMs);
    expect(nextBoundaryMs(FRETE_OUTUBRO, B2)).toBe(endMs);
    expect(nextBoundaryMs(FRETE_OUTUBRO, B3_LAST_MS)).toBe(endMs);
    expect(nextBoundaryMs(FRETE_OUTUBRO, B4)).toBeNull();
    expect(nextBoundaryMs(FRETE_OUTUBRO, Number.NaN)).toBeNull();
  });
});

describe('daysLeft / countdownText (dia civil de Palmas)', () => {
  it.each([
    ['2026-10-01T00:00', 31, 'Termina em 31 dias'],
    ['2026-10-03T12:00', 29, 'Termina em 29 dias'],
    ['2026-10-29T23:59', 3, 'Termina em 3 dias'],
    ['2026-10-30T00:00', 2, 'Termina amanhã às 23h59'],
    ['2026-10-31T00:00', 1, 'Último dia: termina hoje às 23h59'],
    ['2026-10-31T10:00', 1, 'Último dia: termina hoje às 23h59'],
    ['2026-10-31T23:59', 1, 'Último dia: termina hoje às 23h59'],
  ] as const)('%s -> %i dia(s)', (local, n, text) => {
    expect(daysLeft(FRETE_OUTUBRO, palmas(local))).toBe(n);
    expect(countdownText(FRETE_OUTUBRO, palmas(local))).toBe(text);
  });

  it('fora do período: 0 e sem texto', () => {
    for (const now of [B1, B4, Number.NaN]) {
      expect(daysLeft(FRETE_OUTUBRO, now)).toBe(0);
      expect(countdownText(FRETE_OUTUBRO, now)).toBeNull();
    }
  });
});

describe('regiões da promoção (partição)', () => {
  it('participantes e excluídas exatas', () => {
    expect([...FRETE_OUTUBRO.eligibleRegionIds]).toEqual(ELIGIBLE);
    expect([...FRETE_OUTUBRO.excludedRegionIds]).toEqual(EXCLUDED);
  });

  it('participantes e excluídas são disjuntas e juntas cobrem todas as REGIONS (região nova força decisão)', () => {
    const eligible = new Set(FRETE_OUTUBRO.eligibleRegionIds);
    expect(FRETE_OUTUBRO.excludedRegionIds.filter((id) => eligible.has(id))).toEqual([]);
    expect([...FRETE_OUTUBRO.eligibleRegionIds, ...FRETE_OUTUBRO.excludedRegionIds].sort()).toEqual(
      REGIONS.map((r) => r.id).sort(),
    );
  });

  it('áreas a combinar e "outra" não estão em nenhuma lista', () => {
    const all = [...FRETE_OUTUBRO.eligibleRegionIds, ...FRETE_OUTUBRO.excludedRegionIds];
    for (const id of [...ARRANGE_AREAS.map((a) => a.id), OTHER_REGION_ID]) expect(all).not.toContain(id);
  });

  it('os 9 bairros excluídos do briefing estão cobertos (por bairro)', () => {
    const names = [
      ...FRETE_OUTUBRO.excludedRegionIds.flatMap((id) => REGION_NEIGHBORHOODS[id] ?? [findRegion(id)?.label ?? '']),
      ...ARRANGE_AREAS.map((a) => a.label),
    ];
    expect(names.sort()).toEqual(
      ['Taquaralto', 'Bertaville', 'Taquari', 'Aurenys', 'Lago Sul', 'Lago Norte', 'Araras', 'Caribe', 'Polinésia'].sort(),
    );
  });

  it('REGION_NEIGHBORHOODS só referencia regiões existentes', () => {
    for (const id of Object.keys(REGION_NEIGHBORHOODS)) expect(findRegion(id), id).toBeDefined();
  });

  it('promoções não se sobrepõem e têm início < fim', () => {
    const ws = DELIVERY_PROMOS.map(promoWindow).sort((a, b) => a.startMs - b.startMs);
    ws.forEach((w, i) => {
      expect(w.startMs).toBeLessThan(w.endMs);
      const next = ws[i + 1];
      if (next) expect(w.endMs).toBeLessThanOrEqual(next.startMs);
    });
  });
});

describe('activePromoFor / activePromo', () => {
  it('participante só durante o período', () => {
    expect(activePromoFor('q700s-200', B2)).toBe(FRETE_OUTUBRO);
    expect(activePromoFor('q700s-200', B1)).toBeNull();
    expect(activePromoFor('q700s-200', B4)).toBeNull();
  });
  it('excluída, área, outra e inexistente nunca', () => {
    for (const id of [...EXCLUDED, 'araras', 'outra', '__proto__', '']) {
      expect(activePromoFor(id, EM_OUTUBRO)).toBeNull();
    }
  });
  it('activePromo independe da região', () => {
    expect(activePromo(EM_OUTUBRO)).toBe(FRETE_OUTUBRO);
    expect(activePromo(B4)).toBeNull();
  });
});

describe('quoteDelivery', () => {
  it.each(ELIGIBLE)('participante %s: grátis em B2/B3, taxa normal em B1/B4', (id) => {
    const region = findRegion(id);
    if (!region) throw new Error(id);
    for (const now of [B2, B3, B3_LAST_MS]) {
      expect(quoteDelivery(parseRegionChoice(id), now)).toEqual({
        kind: 'free',
        feeCents: 0,
        baseFeeCents: region.feeCents,
        region,
        promo: FRETE_OUTUBRO,
      });
    }
    for (const now of [B1, B4]) {
      expect(quoteDelivery(parseRegionChoice(id), now)).toEqual({
        kind: 'fixed',
        feeCents: region.feeCents,
        region,
        excludedFrom: null,
      });
    }
  });

  it.each(EXCLUDED)('excluída %s: taxa normal; marcada como fora da promoção só durante o período', (id) => {
    expect(quoteDelivery(parseRegionChoice(id), EM_OUTUBRO)).toMatchObject({
      kind: 'fixed',
      excludedFrom: FRETE_OUTUBRO,
    });
    expect(quoteDelivery(parseRegionChoice(id), B4)).toMatchObject({ kind: 'fixed', excludedFrom: null });
  });

  it('área a combinar, outra e nada escolhido', () => {
    for (const now of [B1, EM_OUTUBRO, B4]) {
      expect(quoteDelivery(parseRegionChoice('caribe'), now)).toEqual({
        kind: 'arrange',
        area: { id: 'caribe', label: 'Caribe' },
      });
      expect(quoteDelivery(parseRegionChoice('outra'), now)).toEqual({ kind: 'arrange', area: null });
      expect(quoteDelivery(null, now)).toEqual({ kind: 'unselected' });
    }
  });
});

describe('computeTotals durante a promoção', () => {
  const normal: Record<string, number> = {
    'lago-norte': 13000,
    'bertaville-aurenys': 14000,
    'taquaralto-lago-sul': 14500,
    taquari: 14500,
  };
  it.each(REGIONS.map((r) => r.id))('%s em outubro', (id) => {
    const t = computeTotals(11000, parseRegionChoice(id), EM_OUTUBRO);
    if (ELIGIBLE.includes(id)) {
      expect(t).toMatchObject({ feeCents: 0, totalCents: 11000, feeToArrange: false });
    } else {
      expect(t).toMatchObject({ totalCents: normal[id], feeToArrange: false });
    }
  });
  it('áreas a combinar: total = subtotal + entrega a combinar', () => {
    for (const a of ARRANGE_AREAS) {
      expect(computeTotals(11000, parseRegionChoice(a.id), EM_OUTUBRO)).toMatchObject({
        feeCents: null,
        totalCents: 11000,
        feeToArrange: true,
      });
    }
  });
});

describe('public/age-init.js', () => {
  const src = readFileSync(new URL('../../public/age-init.js', import.meta.url), 'utf8');
  it('instantes em epoch ms iguais a FRETE_OUTUBRO (fase gravada antes da primeira pintura)', () => {
    expect(Number(/PROMO_START_MS = (\d+)/.exec(src)?.[1])).toBe(startMs);
    expect(Number(/PROMO_END_MS = (\d+)/.exec(src)?.[1])).toBe(endMs);
  });
});
