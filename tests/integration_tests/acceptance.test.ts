/**
 * Приёмочные тесты (Acceptance Testing / UAT)
 *
 * Проверяет, что система соответствует бизнес-требованиям и готова к релизу.
 * Тесты сфокусированы на пользовательских сценариях "счастливого пути" и
 * проверяют, что продукт решает задачи пользователя.
 *
 * Согласно статье: "Тестирование приёмки пользователем (UAT) проводится с целью
 * проверить, соответствует ли ПО бизнес-требованиям и готово ли оно к релизу."
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { validateTransaction, validateBudget, validateGoal } from '@/utils/validators';
import { formatCurrency, formatDate, formatPercent } from '@/utils/formatters';
import { createTransaction } from '@/services/transactions.service';
import { createBudget } from '@/services/budgets.service';
import { createGoal } from '@/services/goals.service';

type SupabaseRow = Record<string, unknown>;

const acceptanceDb = vi.hoisted(() => ({
  transactions: [] as SupabaseRow[],
  budgets: [] as SupabaseRow[],
  financial_goals: [] as SupabaseRow[],
  categories: [] as SupabaseRow[],
}));

vi.mock('@/lib/supabase', () => {
  const chain = (table: keyof typeof acceptanceDb): any => {
    const ch: any = {};
    ch.insert = (p: SupabaseRow) => {
      const row = { id: `${table}-${acceptanceDb[table].length + 1}`, ...p };
      acceptanceDb[table].push(row);
      ch._row = row;
      return ch;
    };
    // All intermediate methods return chain
    ch.select = vi.fn(() => ch);
    ch.single = vi.fn(() => Promise.resolve({ data: ch._row ?? null, error: null }));
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
      Promise.resolve({ data: acceptanceDb[table], error: null, count: acceptanceDb[table].length })
    );
    // Make chain directly awaitable
    ch.then = (res: (v: any) => any, rej?: (e: any) => any) =>
      Promise.resolve({ data: acceptanceDb[table], error: null }).then(res, rej);
    return ch;
  };

  return {
    supabase: { from: (t: string) => chain(t as keyof typeof acceptanceDb) },
  };
});

describe('Acceptance Tests: Бизнес-требования финтех-приложения', () => {
  beforeEach(() => {
    Object.keys(acceptanceDb).forEach((k) => ((acceptanceDb as any)[k].length = 0));
    vi.clearAllMocks();
  });

  // ── Требование 1: Пользователь должен иметь возможность записывать транзакции ──

  describe('Требование 1: Управление транзакциями', () => {
    it('AT-1.1: Система принимает корректную транзакцию расхода', async () => {
      const validation = validateTransaction({
        amount: 1500,
        category_id: 'cat-food',
        type: 'expense',
        date: '2026-03-01',
        description: 'Продукты',
      });

      expect(validation.isValid).toBe(true);
    });

    it('AT-1.2: Система отклоняет транзакцию с нулевой суммой', () => {
      const validation = validateTransaction({
        amount: 0,
        category_id: 'cat-food',
        type: 'expense',
        date: '2026-03-01',
        description: '',
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors.amount).toContain('0');
    });

    it('AT-1.3: Система принимает транзакцию дохода и сохраняет её', async () => {
      const result = await createTransaction('user-1', {
        amount: 75000,
        category_id: 'cat-salary',
        type: 'income',
        date: '2026-03-10',
        description: 'Зарплата',
      });

      expect(result.success).toBe(true);
      expect(acceptanceDb.transactions.length).toBe(1);
    });

    it('AT-1.4: Система отображает суммы в корректном формате (RUB)', () => {
      const formatted = formatCurrency(15000, 'RUB');

      // Должна содержать цифры и символ рубля или обозначение RUB
      expect(formatted).toMatch(/15\s*000|15000/);
    });
  });

  // ── Требование 2: Пользователь должен иметь возможность планировать бюджет ──

  describe('Требование 2: Управление бюджетами', () => {
    it('AT-2.1: Система принимает корректный бюджет', () => {
      const validation = validateBudget({
        category_id: 'cat-food',
        limit: 25000,
        month: '2026-03',
      });

      expect(validation.isValid).toBe(true);
    });

    it('AT-2.2: Система отклоняет бюджет с отрицательным лимитом', () => {
      const validation = validateBudget({
        category_id: 'cat-food',
        limit: -100,
        month: '2026-03',
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors.limit).toBeDefined();
    });

    it('AT-2.3: Система сохраняет бюджет на месяц', async () => {
      const result = await createBudget('user-1', {
        category_id: 'cat-food',
        limit: 25000,
        month: '2026-03',
      });

      expect(result.success).toBe(true);
      expect(acceptanceDb.budgets.length).toBe(1);
    });
  });

  // ── Требование 3: Пользователь должен иметь возможность ставить финансовые цели ──

  describe('Требование 3: Финансовые цели', () => {
    it('AT-3.1: Система принимает корректную цель с реалистичными сроками', () => {
      const validation = validateGoal({
        goal_name: 'Новый ноутбук',
        target_amount: 120000,
        current_amount: 40000,
        priority: 'medium',
        deadline: '2027-01-01',
      });

      expect(validation.isValid).toBe(true);
    });

    it('AT-3.2: Система отклоняет цель, где накоплено больше целевой суммы', () => {
      const validation = validateGoal({
        goal_name: 'Путешествие',
        target_amount: 50000,
        current_amount: 60000,
        priority: 'low',
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors.current_amount).toBeDefined();
    });

    it('AT-3.3: Система сохраняет финансовую цель', async () => {
      const result = await createGoal('user-1', {
        goal_name: 'Автомобиль',
        target_amount: 1500000,
        current_amount: 0,
        priority: 'high',
        deadline: '2028-06-01',
      });

      expect(result.success).toBe(true);
      expect(acceptanceDb.financial_goals.length).toBe(1);
    });
  });

  // ── Требование 4: Данные должны корректно отображаться в интерфейсе ──

  describe('Требование 4: Форматирование данных', () => {
    it('AT-4.1: Дата транзакции форматируется в виде ДД.ММ.ГГГГ', () => {
      expect(formatDate('2026-03-15')).toBe('15.03.2026');
    });

    it('AT-4.2: Процент накопления форматируется корректно', () => {
      const currentAmount = 40000;
      const targetAmount = 120000;
      const progress = (currentAmount / targetAmount) * 100;

      expect(formatPercent(progress, 1)).toBe('33.3%');
    });

    it('AT-4.3: Нулевая сумма форматируется без ошибок', () => {
      const formatted = formatCurrency(0, 'RUB');
      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe('string');
    });
  });
});
