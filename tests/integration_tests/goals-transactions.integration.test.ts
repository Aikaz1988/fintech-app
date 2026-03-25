/**
 * Интеграционные тесты — Goals + Transactions
 *
 * Проверяет взаимодействие сервисов целей и транзакций:
 * создание цели + обновление прогресса через транзакции должны
 * работать корректно и независимо.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGoal, getGoals, updateGoal } from '@/services/goals.service';
import { createTransaction, getTransactions } from '@/services/transactions.service';

type SupabaseRow = Record<string, unknown>;

const db = vi.hoisted(() => ({
  financial_goals: [] as SupabaseRow[],
  transactions: [] as SupabaseRow[],
  categories: [] as SupabaseRow[],
}));

vi.mock('@/lib/supabase', () => {
  const buildTable = (tableName: keyof typeof db) => {
    const rows = () => db[tableName];

    const ch: any = {};

    ch.insert = (payload: SupabaseRow) => {
      const row = { id: `${tableName}-${rows().length + 1}`, ...payload };
      rows().push(row);
      ch._pendingRow = row;
      return ch;
    };

    ch.update = (payload: SupabaseRow) => {
      ch._updatePayload = payload;
      return ch;
    };

    // All intermediate methods return the chain
    ch.select = vi.fn(() => ch);
    ch.eq = vi.fn((field: string, value: unknown) => {
      ch._eqFilters = { ...(ch._eqFilters ?? {}), [field]: value };
      return ch;
    });
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
      Promise.resolve({ data: rows(), error: null, count: rows().length })
    );
    // Terminal: used by updateGoal / createGoal (.single())
    ch.single = vi.fn(() => {
      if (ch._updatePayload) {
        const target = rows().find((r: SupabaseRow) => {
          const filters = ch._eqFilters ?? {};
          return Object.entries(filters).every(([k, v]) => r[k] === v);
        });
        if (target) Object.assign(target, ch._updatePayload);
        return Promise.resolve({ data: target ?? null, error: null });
      }
      return Promise.resolve({ data: ch._pendingRow ?? null, error: null });
    });
    // Make chain directly awaitable (getGoals does `await query.order(...)`)
    ch.then = (res: (v: any) => any, rej?: (e: any) => any) =>
      Promise.resolve({ data: rows(), error: null }).then(res, rej);

    return ch;
  };

  return {
    supabase: {
      from: (table: string) => buildTable(table as keyof typeof db),
    },
  };
});

describe('Integration: Goals + Transactions', () => {
  beforeEach(() => {
    db.financial_goals.length = 0;
    db.transactions.length = 0;
    db.categories.length = 0;
    vi.clearAllMocks();
  });

  it('creates a goal and reads it back correctly', async () => {
    await createGoal('user-1', {
      goal_name: 'Отпуск в Европе',
      target_amount: 200000,
      current_amount: 0,
      priority: 'medium',
      deadline: '2026-12-31',
    });

    const goals = await getGoals('user-1');

    expect(goals).toHaveLength(1);
    expect(goals[0].goal_name).toBe('Отпуск в Европе');
    expect(goals[0].target_amount).toBe(200000);
  });

  it('updates goal progress after saving money', async () => {
    // Создание цели
    const createResult = await createGoal('user-1', {
      goal_name: 'Ноутбук',
      target_amount: 100000,
      current_amount: 0,
      priority: 'high',
    });

    expect(createResult.success).toBe(true);
    const goalId = createResult.data?.id as string;

    // Симуляция накопления: обновляем текущую сумму
    const updateResult = await updateGoal(goalId, 'user-1', {
      current_amount: 50000,
    });

    expect(updateResult.success).toBe(true);
    expect(updateResult.data?.current_amount).toBe(50000);
  });

  it('income transactions and goals exist independently in storage', async () => {
    await createGoal('user-1', {
      goal_name: 'Машина',
      target_amount: 1000000,
      current_amount: 0,
      priority: 'high',
    });

    await createTransaction('user-1', {
      amount: 100000,
      category_id: 'cat-salary',
      type: 'income',
      date: '2026-03-01',
      description: 'Зарплата март',
    });

    const goals = await getGoals('user-1');
    const txResult = await getTransactions('user-1', {}, { page: 1, limit: 10 });

    expect(goals).toHaveLength(1);
    expect(txResult.data).toHaveLength(1);
    expect(goals[0].goal_name).toBe('Машина');
    expect(txResult.data[0].amount).toBe(100000);
  });

  it('multiple goals can coexist with different priorities', async () => {
    const goalsToCreate = [
      { goal_name: 'Отпуск', target_amount: 150000, current_amount: 0, priority: 'low' as const },
      { goal_name: 'Машина', target_amount: 800000, current_amount: 0, priority: 'high' as const },
      { goal_name: 'Ноутбук', target_amount: 100000, current_amount: 30000, priority: 'medium' as const },
    ];

    for (const g of goalsToCreate) {
      await createGoal('user-1', g);
    }

    const goals = await getGoals('user-1');

    expect(goals).toHaveLength(3);
    const names = goals.map((g) => g.goal_name);
    expect(names).toContain('Отпуск');
    expect(names).toContain('Машина');
    expect(names).toContain('Ноутбук');
  });
});
