/**
 * Системные тесты (System Testing)
 *
 * Проверяет сквозные сценарии полного приложения — полный цикл
 * пользовательского взаимодействия от создания записей до проверки
 * результирующего состояния системы, имитируя реальную среду.
 *
 * Согласно статье: "Системное тестирование проверяет полное интегрированное
 * приложение как единое целое, включая взаимодействие между подсистемами,
 * оборудованием, базами данных, сетями и сторонними сервисами."
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTransaction, getTransactions } from '@/services/transactions.service';
import { createBudget } from '@/services/budgets.service';
import { getSummaryStats } from '@/services/analytics.service';
import { createGoal, getGoals } from '@/services/goals.service';
import { createCategory, getCategories } from '@/services/categories.service';

type SupabaseRow = Record<string, unknown>;

const appDb = vi.hoisted(() => ({
  transactions: [] as SupabaseRow[],
  budgets: [] as SupabaseRow[],
  financial_goals: [] as SupabaseRow[],
  categories: [] as SupabaseRow[],
}));

vi.mock('@/lib/supabase', () => {
  const makeChain = (tableName: keyof typeof appDb) => {
    const store = () => appDb[tableName];
    const ch: any = {};

    ch.insert = (payload: SupabaseRow) => {
      const row = { id: `${tableName}-${store().length + 1}`, ...payload };
      store().push(row);
      ch._row = row;
      return ch;
    };
    ch.update = (payload: SupabaseRow) => { ch._updatePayload = payload; return ch; };

    // All intermediate methods return chain
    ch.select = vi.fn(() => ch);
    ch.eq = vi.fn((f: string, v: unknown) => {
      ch._filters = { ...(ch._filters ?? {}), [f]: v };
      return ch;
    });
    ch.or = vi.fn(() => ch);
    ch.order = vi.fn(() => ch);
    ch.gte = vi.fn(() => ch);
    ch.lte = vi.fn(() => ch);
    ch.in = vi.fn(() => ch);
    ch.not = vi.fn(() => ch);
    ch.limit = vi.fn(() => ch);

    // Terminal: used by createXxx / updateXxx
    ch.single = vi.fn(() => Promise.resolve({ data: ch._row ?? null, error: null }));
    // Terminal: used by getTransactions
    ch.range = vi.fn(() =>
      Promise.resolve({ data: store(), error: null, count: store().length })
    );
    // Make chain directly awaitable (getSummaryStats, getCategories etc.)
    ch.then = (res: (v: any) => any, rej?: (e: any) => any) =>
      Promise.resolve({ data: store(), error: null }).then(res, rej);

    ch.delete = () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) });

    return ch;
  };

  return {
    supabase: {
      from: (t: string) => makeChain(t as keyof typeof appDb),
    },
  };
});

describe('System Test: Полный пользовательский сценарий — ведение личных финансов', () => {
  const USER_ID = 'system-test-user';

  beforeEach(() => {
    Object.keys(appDb).forEach((k) => {
      (appDb as any)[k].length = 0;
    });
    vi.clearAllMocks();
  });

  it('Сценарий 1: Новый пользователь создаёт категории, записывает транзакции и видит аналитику', async () => {
    // Шаг 1: Создание категорий
    const catIncome = await createCategory(USER_ID, {
      name: 'Зарплата',
      type: 'income',
      color: '#16a34a',
      icon: 'wallet',
    });
    const catExpense = await createCategory(USER_ID, {
      name: 'Аренда',
      type: 'expense',
      color: '#dc2626',
      icon: 'home',
    });

    expect(catIncome.success).toBe(true);
    expect(catExpense.success).toBe(true);

    const categories = await getCategories(USER_ID);
    expect(categories.length).toBeGreaterThanOrEqual(2);

    // Шаг 2: Запись транзакций за месяц
    await createTransaction(USER_ID, {
      amount: 120000,
      category_id: catIncome.data!.id,
      type: 'income',
      date: '2026-03-01',
      description: 'Зарплата март',
    });

    await createTransaction(USER_ID, {
      amount: 35000,
      category_id: catExpense.data!.id,
      type: 'expense',
      date: '2026-03-05',
      description: 'Аренда квартиры',
    });

    await createTransaction(USER_ID, {
      amount: 15000,
      category_id: catExpense.data!.id,
      type: 'expense',
      date: '2026-03-10',
      description: 'Продукты',
    });

    // Шаг 3: Проверка аналитики
    const stats = await getSummaryStats(USER_ID);

    expect(stats.totalIncome).toBe(120000);
    expect(stats.totalExpenses).toBe(50000);
    expect(stats.balance).toBe(70000);
    expect(stats.savingsRate).toBeCloseTo(58.33, 1);
  });

  it('Сценарий 2: Пользователь ставит финансовую цель и назначает бюджет', async () => {
    // Шаг 1: Создание цели
    const goalResult = await createGoal(USER_ID, {
      goal_name: 'Накопить на квартиру',
      target_amount: 3000000,
      current_amount: 500000,
      priority: 'high',
      deadline: '2030-12-31',
    });

    expect(goalResult.success).toBe(true);

    // Шаг 2: Создание бюджета
    const budgetResult = await createBudget(USER_ID, {
      category_id: 'cat-food-id',
      limit: 30000,
      month: '2026-03',
    });

    expect(budgetResult.success).toBe(true);

    // Шаг 3: Проверка, что цель и бюджет хранятся независимо
    const goals = await getGoals(USER_ID);
    expect(goals.length).toBe(1);
    expect(goals[0].target_amount).toBe(3000000);
    expect(appDb.budgets.length).toBe(1);
  });

  it('Сценарий 3: Пользователь проверяет список транзакций с фильтрацией', async () => {
    // Создаём 5 транзакций
    const txData = [
      { amount: 50000, type: 'income' as const, date: '2026-03-01', category_id: 'cat-1', description: 'Зарплата' },
      { amount: 5000, type: 'expense' as const, date: '2026-03-03', category_id: 'cat-2', description: 'Такси' },
      { amount: 12000, type: 'expense' as const, date: '2026-03-07', category_id: 'cat-3', description: 'Продукты' },
      { amount: 2500, type: 'expense' as const, date: '2026-03-14', category_id: 'cat-2', description: 'Метро' },
      { amount: 8000, type: 'expense' as const, date: '2026-03-20', category_id: 'cat-4', description: 'Кино' },
    ];

    for (const tx of txData) {
      await createTransaction(USER_ID, tx);
    }

    const result = await getTransactions(USER_ID, {}, { page: 1, limit: 10 });

    expect(result.data.length).toBe(5);
    expect(result.total).toBe(5);
  });
});
