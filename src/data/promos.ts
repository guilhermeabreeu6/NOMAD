// Promoções de frete (dados). A lógica fica em src/lib/promo.ts (pura, com o "agora" injetado).
// Período como instantes absolutos com offset de Palmas (America/Araguaina = UTC-3 fixo) e intervalo
// semiaberto [startsAt, endsAt): o mesmo build serve antes, durante e depois da promoção.
// ATENÇÃO: public/age-init.js repete os dois instantes em epoch ms (teste trava a igualdade).
import type { Region } from './catalog';

export interface DeliveryPromo {
  readonly slug: 'promo-frete-outubro';
  /** Texto exibido no checkout e na mensagem do WhatsApp. */
  readonly label: string;
  /** Sufixo das opções do select de região durante a promoção ("<região> - Grátis em outubro"). */
  readonly optionLabel: string;
  /** ISO com offset, inclusivo. */
  readonly startsAt: string;
  /** ISO com offset, EXCLUSIVO. */
  readonly endsAt: string;
  /** Documental (e testado): a lógica usa só epoch ms. */
  readonly timeZone: 'America/Araguaina';
  readonly eligibleRegionIds: readonly Region['id'][];
  readonly excludedRegionIds: readonly Region['id'][];
  /** Rota da landing (sempre via withBase). */
  readonly pagePath: 'outubro/';
}

export const FRETE_OUTUBRO: DeliveryPromo = {
  slug: 'promo-frete-outubro',
  label: 'Frete grátis (promoção de outubro)',
  optionLabel: 'Grátis em outubro',
  startsAt: '2026-10-01T00:00:00-03:00',
  endsAt: '2026-11-01T00:00:00-03:00',
  timeZone: 'America/Araguaina',
  eligibleRegionIds: ['q700s-200', 'q300n-600n', 'q800-1200', 'q1300s-1500s', 'santo-amaro'],
  excludedRegionIds: ['lago-norte', 'bertaville-aurenys', 'taquaralto-lago-sul', 'taquari'],
  pagePath: 'outubro/',
};

/** Promoções de frete conhecidas. Hoje só uma; o motor aceita N (sem sobreposição - teste). */
export const DELIVERY_PROMOS: readonly DeliveryPromo[] = [FRETE_OUTUBRO];

/**
 * Bairros de cada região do checkout, um por linha na landing (o cliente procura o nome do próprio bairro).
 * Regiões ausentes do mapa aparecem com o próprio label.
 */
export const REGION_NEIGHBORHOODS: Readonly<Record<string, readonly string[]>> = {
  'bertaville-aurenys': ['Bertaville', 'Aurenys'],
  'taquaralto-lago-sul': ['Taquaralto', 'Lago Sul'],
};
