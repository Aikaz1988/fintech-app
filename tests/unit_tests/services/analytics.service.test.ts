import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSummaryStats, getCategoryStats } from '@/services/analytics.service';

/**
 * Mock для analytics service.
 * getSummaryStats делает `await query` напрямую — цепочка должна быть thenable.
 * getCategoryStats использует `.gte/.lte` и тоже awaits напрямую.
 */
const mockFns = vi.hoisted(() => {
  // Текущий результат, который вернёт any await на цепочке
  const state = { mockResult: { data: [] as any[] | null, error: null as any } };

  const chain: any = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.gte = vi.fn(() => chain);
  chain.lte = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  // Делаем цепочку thenable — `await chain` вернёт state.mockResult
  chain.then = (res: (v: any) => any, rej?: (e: any) => any) =>
    Promise.resolve(state.mockResult).then(res, rej);

  return { state, chain };
});

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn(() => mockFns.chain) },
}));

describe('analytics.service — getSummaryStats', () => {
  beforeEach(() => {
    mockFns.state.mockResult = { data: [], error: null };
    vi.clearAllMocks();
  });

  it('returns zeroes when there are no transactions', async () => {
    mockFns.state.mockResult = { data: [], error: null };

    const stats = await getSummaryStats('user-1');

    expect(stats.totalIncome).toBe(0);
    expect(stats.totalExpenses).toBe(0);
    expect(stats.balance).toBe(0);
    expect(stats.savingsRate).toBe(0);
  });

  it('calculates income, expenses and balance correctly', async () => {
    mockFns.state.mockResult = {
      data: [
        { amount: 50000, type: 'income' },
        { amount: 15000, type: 'expense' },
        { amount: 5000, type: 'expense' },
      ],
      error: null,
    };

    const stats = await getSummaryStats('user-1');

    expect(stats.totalIncome).toBe(50000);
    expect(stats.totalExpenses).toBe(20000);
    expect(stats.balance).toBe(30000);
    expect(stats.savingsRate).toBeCloseTo(60, 1);
  });

  it('returns zeroes on supabase error', async () => {
    mockFns.state.mockResult = { data: null, error: { message: 'DB error' } };

    const stats = await getSummaryStats('user-1');

    expect(stats.totalIncome).toBe(0);
    expect(stats.totalExpenses).toBe(0);
  });
});

describe('analytics.service — getCategoryStats', () => {
  beforeEach(() => {
    mockFns.state.mockResult = { data: [], error: null };
    vi.clearAllMocks();
  });

  it('returns empty array when no data', async () => {
    mockFns.state.mockResult = { data: [], error: null };

    const result = await getCategoryStats('user-1', 'expense');

    expect(result).toEqual([]);
  });

  it('groups transactions by category and sorts by amount descending', async () => {
    const catA = { id: 'cat-a', name: 'Продукты', color: '#f00', icon: 'food', type: 'expense' };
    const catB = { id: 'cat-b', name: 'Транспорт', color: '#0f0', icon: 'car', type: 'expense' };

    mockFns.state.mockResult = {
      data: [
        { amount: 1000, category_id: 'cat-a', categories: catA },
        { amount: 3000, category_id: 'cat-b', categories: catB },
        { amount: 2000, category_id: 'cat-a', categories: catA },
      ],
      error: null,
    };

    const result = await getCategoryStats('user-1', 'expense');

    expect(result).toHaveLength(2);
    // Продукты: 1000 + 2000 = 3000; Транспорт: 3000 — отсортированы по убыванию
    expect(result[0].amount).toBe(3000);
    expect(result[1].amount).toBe(3000);
  });
});
