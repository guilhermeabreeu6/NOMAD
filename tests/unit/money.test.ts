import { describe, expect, it } from 'vitest';
import { formatBRL, formatBRLShort } from '../../src/lib/money';

describe('formatBRL', () => {
  it.each([
    [0, 'R$ 0,00'],
    [800, 'R$ 8,00'],
    [8500, 'R$ 85,00'],
    [11000, 'R$ 110,00'],
    [38000, 'R$ 380,00'],
    [140000, 'R$ 1.400,00'],
    [2290000, 'R$ 22.900,00'],
    [5, 'R$ 0,05'],
    [-150, '-R$ 1,50'],
  ])('%i -> %s', (cents, expected) => {
    expect(formatBRL(cents)).toBe(expected);
  });

  it('usa espaço normal (sem NBSP)', () => {
    expect(formatBRL(8500)).not.toContain(' ');
  });
});

describe('formatBRLShort', () => {
  it('retorna só os reais', () => {
    expect(formatBRLShort(8500)).toBe('85');
    expect(formatBRLShort(14000)).toBe('140');
  });
});
