import { describe, expect, it } from 'vitest';
import { formatCurrency, formatDate, formatPercent } from '@/utils/formatters';

describe('formatters', () => {
  it('formats currency in RU locale', () => {
    expect(formatCurrency(1234.5, 'RUB')).toContain('1');
    expect(formatCurrency(1234.5, 'RUB')).toContain('234');
  });

  it('formats date in default format', () => {
    expect(formatDate('2026-03-10')).toBe('10.03.2026');
  });

  it('formats percent with precision', () => {
    expect(formatPercent(12.345, 2)).toBe('12.35%');
  });
});
