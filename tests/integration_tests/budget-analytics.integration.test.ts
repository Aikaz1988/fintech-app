/**
 * Интеграционные тесты — Budget + Analytics
 *
 * Проверяет взаимодействие между сервисами бюджетирования и аналитики:
 * создание бюджета → создание транзакций → получение сводной статистики
 * должны давать согласованные результаты.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createBudget } from '@/services/budgets.service';
import { createTransaction } from '@/services/transactions.service';
import { getSummaryStats } from '@/services/analytics.service';

type SupabaseRow = Record<string, unknown>;

const db = vi.hoisted(() => ({
  budgets: [] as SupabaseRow[],
  transactions: [] as SupabaseRow[],
  categories: [] as SupabaseRow[],
  bank_accounts: [] as SupabaseRow[],
}));

vi.mock('@/lib/supabase', () => {
  const buildChain = (table: string) => {
    const store = (): SupabaseRow[] => (db as any)[table] ?? [];
    const ch: any = {};

    ch.insert = (payload: SupabaseRow) => {
      const tableStore: SupabaseRow[] = (db as any)[table];
      if (tableStore) {
        const row = { id: `${table}-${tableStore.length + 1}`, ...payload };
        tableStore.push(row);
        ch._lastInserted = row;
      }
      return ch;
    };

    // All intermediate methods return the chain
    ch.select = vi.fn(() => ch);
    ch.eq = vi.fn(() => ch);
    ch.order = vi.fn(() => ch);
    ch.gte = vi.fn(() => ch);
    ch.lte = vi.fn(() => ch);
    ch.in = vi.fn(() => ch);
    ch.or = vi.fn(() => ch);
    ch.not = vi.fn(() => ch);
    ch.limit = vi.fn(() => ch);
    ch.delete = vi.fn(() => ch);

    // Terminal: used by getTransactions
    ch.range = vi.fn(() =>
      Promise.resolve({ data: store(), error: null, count: store().length })
    );
    // Terminal: used by createXxx / resolveCategoryId (.single())
    ch.single = vi.fn(() =>
      Promise.resolve({ data: ch._lastInserted ?? null, error: null })
    );
    // Make chain directly awaitable (analytics/summary stats does `await query`)
    ch.then = (res: (v: any) => any, rej?: (e: any) => any) =>
      Promise.resolve({ data: store(), error: null }).then(res, rej);

    return ch;
  };

  return {
    supabase: {
      from: (table: string) => buildChain(table),
    },
  };
});

describe('Integration: Budget + Analytics workflow', () => {
  beforeEach(() => {
    db.budgets.length = 0;
    db.transactions.length = 0;
    vi.clearAllMocks();
  });

  it('summary stats reflect transactions after they are created', async () => {
    // Создание транзакции (доход)
    await createTransaction('user-1', {
      amount: 80000,
      category_id: 'cat-salary',
      type: 'income',
      date: '2026-03-01',
      description: 'Зарплата',
    });

    // Создание транзакции (расход)
    await createTransaction('user-1', {
      amount: 20000,
      category_id: 'cat-food',
      type: 'expense',
      date: '2026-03-02',
      description: 'Продукты',
    });

    // Аналитика должна видеть обе транзакции
    const stats = await getSummaryStats('user-1');

    expect(stats.totalIncome).toBe(80000);
    expect(stats.totalExpenses).toBe(20000);
    expect(stats.balance).toBe(60000);
    expect(stats.savingsRate).toBeCloseTo(75, 1);
  });

  it('budget creation is independent from transaction analytics', async () => {
    // Создание бюджета не должно влиять на статистику транзакций
    await createBudget('user-1', {
      category_id: 'cat-food',
      limit: 30000,
      month: '2026-03',
    });

    const stats = await getSummaryStats('user-1');

    // Нет транзакций — всё нули
    expect(stats.totalIncome).toBe(0);
    expect(stats.totalExpenses).toBe(0);
    expect(db.budgets).toHaveLength(1);
  });

  it('multiple transactions aggregate correctly in summary stats', async () => {
    const transactions = [
      { amount: 50000, type: 'income' as const, category_id: 'cat-salary', date: '2026-03-01' },
      { amount: 30000, type: 'income' as const, category_id: 'cat-freelance', date: '2026-03-10' },
      { amount: 12000, type: 'expense' as const, category_id: 'cat-rent', date: '2026-03-05' },
      { amount: 8000, type: 'expense' as const, category_id: 'cat-food', date: '2026-03-06' },
      { amount: 3000, type: 'expense' as const, category_id: 'cat-transport', date: '2026-03-07' },
    ];

    for (const tx of transactions) {
      await createTransaction('user-1', { ...tx, description: '' });
    }

    const stats = await getSummaryStats('user-1');

    expect(stats.totalIncome).toBe(80000);
    expect(stats.totalExpenses).toBe(23000);
    expect(stats.balance).toBe(57000);
  });
});
