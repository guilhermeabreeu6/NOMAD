/** Formata centavos como "R$ 1.234,56" (determinístico; sem Intl, sem NBSP). */
export function formatBRL(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const reais = Math.floor(abs / 100);
  const cent = String(abs % 100).padStart(2, '0');
  const grouped = String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negative ? '-' : ''}R$ ${grouped},${cent}`;
}

/** Parte inteira para o PriceTag grande: 8500 -> "85". */
export function formatBRLShort(cents: number): string {
  return String(Math.floor(Math.abs(cents) / 100));
}
