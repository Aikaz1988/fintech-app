/**
 * Нагрузочные тесты (Load Testing)
 *
 * Симулируют ожидаемый пользовательский трафик, чтобы проверить, что время
 * отклика и пропускная способность остаются в пределах допустимых значений.
 *
 * Согласно статье: "Нагрузочное тестирование симулирует ожидаемый пользовательский
 * трафик, чтобы проверить, что время отклика и пропускная способность остаются
 * в пределах допустимых значений."
 *
 * Примечание: так как это SPA с мокированным бэкендом (Supabase), нагрузочные
 * тесты сосредоточены на:
 *  - производительности утилитных функций при тысячах вызовов
 *  - параллельных вызовах сервисов (конкурентные пользователи)
 *  - скорости обработки больших наборов данных
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { formatCurrency, formatDate, formatPercent } from '@/utils/formatters';
import { validateTransaction, validateBudget } from '@/utils/validators';
import { getSummaryStats } from '@/services/analytics.service';
import { getTransactions } from '@/services/transactions.service';

// ── Максимально допустимые пороги производительности ──
const THRESHOLDS = {
  FORMATTER_CALLS: 5000,        // 5 000 вызовов форматтера
  VALIDATOR_CALLS: 5000,        // 5 000 вызовов валидатора
  MAX_MS_FORMATTER: 400,        // не дольше 400 мс (стабильно на CI/локальных машинах)
  MAX_MS_VALIDATOR: 200,        // не дольше 200 мс
  CONCURRENT_USERS: 50,         // симуляция 50 параллельных пользователей
  LARGE_DATASET_SIZE: 1000,     // 1 000 транзакций в одном ответе
  MAX_MS_CONCURRENT: 1000,      // все параллельные запросы за 1 с
  MAX_MS_LARGE_DATASET: 500,    // обработка большого датасета за 500 мс
};

type SupabaseRow = Record<string, unknown>;
const loadDb = vi.hoisted(() => ({
  transactions: [] as SupabaseRow[],
  categories: [] as SupabaseRow[],
}));

vi.mock('@/lib/supabase', () => {
  const ch = (table: keyof typeof loadDb): any => {
    const store = () => loadDb[table];
    const c: any = {};
    // All intermediate chain methods return the chain
    c.select = vi.fn(() => c);
    c.eq = vi.fn(() => c);
    c.gte = vi.fn(() => c);
    c.lte = vi.fn(() => c);
    c.order = vi.fn(() => c);
    c.in = vi.fn(() => c);
    c.or = vi.fn(() => c);
    c.not = vi.fn(() => c);
    c.limit = vi.fn(() => c);
    // Terminal: used by getTransactions
    c.range = vi.fn(() =>
      Promise.resolve({ data: store(), error: null, count: store().length })
    );
    // Make chain directly awaitable (getSummaryStats awaits chain directly)
    c.then = (res: (v: any) => any, rej?: (e: any) => any) =>
      Promise.resolve({ data: store(), error: null }).then(res, rej);
    return c;
  };
  return { supabase: { from: (t: string) => ch(t as keyof typeof loadDb) } };
});

describe('Load Tests: Производительность функций форматирования', () => {
  it(`LT-1.1: ${THRESHOLDS.FORMATTER_CALLS} вызовов formatCurrency укладываются в ${THRESHOLDS.MAX_MS_FORMATTER} мс`, () => {
    const start = performance.now();

    for (let i = 0; i < THRESHOLDS.FORMATTER_CALLS; i++) {
      formatCurrency(Math.random() * 1000000, 'RUB');
    }

    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(THRESHOLDS.MAX_MS_FORMATTER);
  });

  it(`LT-1.2: ${THRESHOLDS.FORMATTER_CALLS} вызовов formatDate укладываются в ${THRESHOLDS.MAX_MS_FORMATTER} мс`, () => {
    const start = performance.now();

    for (let i = 0; i < THRESHOLDS.FORMATTER_CALLS; i++) {
      formatDate('2026-03-15');
    }

    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(THRESHOLDS.MAX_MS_FORMATTER);
  });

  it(`LT-1.3: ${THRESHOLDS.FORMATTER_CALLS} вызовов formatPercent укладываются в ${THRESHOLDS.MAX_MS_FORMATTER} мс`, () => {
    const start = performance.now();

    for (let i = 0; i < THRESHOLDS.FORMATTER_CALLS; i++) {
      formatPercent(Math.random() * 100, 2);
    }

    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(THRESHOLDS.MAX_MS_FORMATTER);
  });
});

describe('Load Tests: Производительность валидаторов', () => {
  it(`LT-2.1: ${THRESHOLDS.VALIDATOR_CALLS} вызовов validateTransaction укладываются в ${THRESHOLDS.MAX_MS_VALIDATOR} мс`, () => {
    const payload = {
      amount: 1500,
      category_id: 'cat-food',
      type: 'expense' as const,
      date: '2026-03-01',
      description: 'Продукты',
    };

    const start = performance.now();

    for (let i = 0; i < THRESHOLDS.VALIDATOR_CALLS; i++) {
      validateTransaction(payload);
    }

    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(THRESHOLDS.MAX_MS_VALIDATOR);
  });

  it(`LT-2.2: ${THRESHOLDS.VALIDATOR_CALLS} вызовов validateBudget укладываются в ${THRESHOLDS.MAX_MS_VALIDATOR} мс`, () => {
    const payload = {
      category_id: 'cat-food',
      limit: 25000,
      month: '2026-03',
    };

    const start = performance.now();

    for (let i = 0; i < THRESHOLDS.VALIDATOR_CALLS; i++) {
      validateBudget(payload);
    }

    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(THRESHOLDS.MAX_MS_VALIDATOR);
  });
});

describe('Load Tests: Параллельные запросы (конкурентные пользователи)', () => {
  beforeEach(() => {
    loadDb.transactions.length = 0;
    loadDb.categories.length = 0;
    vi.clearAllMocks();
  });

  it(`LT-3.1: ${THRESHOLDS.CONCURRENT_USERS} параллельных getSummaryStats завершаются за ${THRESHOLDS.MAX_MS_CONCURRENT} мс`, async () => {
    const userIds = Array.from({ length: THRESHOLDS.CONCURRENT_USERS }, (_, i) => `user-${i}`);

    const start = performance.now();
    await Promise.all(userIds.map((uid) => getSummaryStats(uid)));
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(THRESHOLDS.MAX_MS_CONCURRENT);
  });

  it(`LT-3.2: ${THRESHOLDS.CONCURRENT_USERS} параллельных getTransactions завершаются за ${THRESHOLDS.MAX_MS_CONCURRENT} мс`, async () => {
    const userIds = Array.from({ length: THRESHOLDS.CONCURRENT_USERS }, (_, i) => `user-${i}`);

    const start = performance.now();
    await Promise.all(userIds.map((uid) => getTransactions(uid, {}, { page: 1, limit: 20 })));
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(THRESHOLDS.MAX_MS_CONCURRENT);
  });
});

describe('Load Tests: Обработка больших наборов данных', () => {
  beforeEach(() => {
    loadDb.transactions.length = 0;
    loadDb.categories.length = 0;
    vi.clearAllMocks();
  });

  it(`LT-4.1: Обработка ${THRESHOLDS.LARGE_DATASET_SIZE} транзакций укладывается в ${THRESHOLDS.MAX_MS_LARGE_DATASET} мс`, async () => {
    // Наполнение хранилища большим количеством транзакций
    for (let i = 0; i < THRESHOLDS.LARGE_DATASET_SIZE; i++) {
      loadDb.transactions.push({
        id: `tx-${i}`,
        user_id: 'user-load',
        category_id: `cat-${i % 10}`,
        amount: Math.floor(Math.random() * 50000) + 100,
        type: i % 3 === 0 ? 'income' : 'expense',
        date: `2026-03-${String((i % 28) + 1).padStart(2, '0')}`,
        created_at: new Date().toISOString(),
        description: `Транзакция ${i}`,
        is_imported: false,
        bank_account_id: null,
        merchant: null,
        mcc_code: null,
      });
    }

    const start = performance.now();
    const result = await getTransactions('user-load', {}, { page: 1, limit: 1000 });
    const elapsed = performance.now() - start;

    expect(result.data.length).toBe(THRESHOLDS.LARGE_DATASET_SIZE);
    expect(elapsed).toBeLessThan(THRESHOLDS.MAX_MS_LARGE_DATASET);
  });

  it(`LT-4.2: Аналитика по ${THRESHOLDS.LARGE_DATASET_SIZE} транзакциям завершается за ${THRESHOLDS.MAX_MS_LARGE_DATASET} мс`, async () => {
    for (let i = 0; i < THRESHOLDS.LARGE_DATASET_SIZE; i++) {
      loadDb.transactions.push({
        id: `tx-${i}`,
        amount: Math.floor(Math.random() * 50000) + 100,
        type: i % 4 === 0 ? 'income' : 'expense',
      });
    }

    const start = performance.now();
    const stats = await getSummaryStats('user-load');
    const elapsed = performance.now() - start;

    expect(stats.totalIncome).toBeGreaterThanOrEqual(0);
    expect(elapsed).toBeLessThan(THRESHOLDS.MAX_MS_LARGE_DATASET);
  });
});
