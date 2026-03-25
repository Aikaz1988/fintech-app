import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTransaction, getTransactions } from '@/services/transactions.service';

const mockFns = vi.hoisted(() => {
  const state = {
    transactionRangeResult: { data: [] as any[], error: null as any, count: 0 },
    categoriesListResult: { data: [] as any[], error: null as any },
  };

  const mockInsertSingle = vi.fn();
  const mockInsertSelect = vi.fn(() => ({ single: mockInsertSingle }));
  const mockInsert = vi.fn(() => ({ select: mockInsertSelect }));

  const txQuery: any = {};
  txQuery.select = vi.fn(() => txQuery);
  txQuery.eq = vi.fn(() => txQuery);
  txQuery.order = vi.fn(() => txQuery);
  txQuery.gte = vi.fn(() => txQuery);
  txQuery.lte = vi.fn(() => txQuery);
  txQuery.in = vi.fn(() => txQuery);
  txQuery.or = vi.fn(() => txQuery);
  txQuery.not = vi.fn(() => txQuery);
  txQuery.range = vi.fn(() => Promise.resolve(state.transactionRangeResult));

  const mockCategoryMaybeSingle = vi.fn();
  const mockCategorySelect = vi.fn((columns: string) => {
    if (columns.includes('name') && columns.includes('type')) {
      return {
        eq: vi.fn(() => ({ maybeSingle: mockCategoryMaybeSingle })),
      };
    }

    const categoryListQuery: any = {
      or: vi.fn(() => categoryListQuery),
      eq: vi.fn((field: string) => {
        if (field === 'type') {
          return Promise.resolve(state.categoriesListResult);
        }
        return categoryListQuery;
      }),
      ilike: vi.fn(() => categoryListQuery),
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve(state.categoriesListResult).then(resolve),
    };

    return categoryListQuery;
  });

  const mockFrom = vi.fn((table: string) => {
    if (table === 'transactions') {
      return {
        insert: mockInsert,
        select: txQuery.select,
        eq: txQuery.eq,
        order: txQuery.order,
        gte: txQuery.gte,
        lte: txQuery.lte,
        in: txQuery.in,
        or: txQuery.or,
        not: txQuery.not,
        range: txQuery.range,
      };
    }

    if (table === 'categories') {
      return {
        select: mockCategorySelect,
      };
    }

    return {};
  });

  return {
    state,
    txQuery,
    mockInsertSingle,
    mockInsertSelect,
    mockInsert,
    mockCategoryMaybeSingle,
    mockCategorySelect,
    mockFrom,
  };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFns.mockFrom,
  },
}));

describe('transactions.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFns.state.transactionRangeResult = { data: [], error: null, count: 0 };
    mockFns.state.categoriesListResult = { data: [], error: null };
  });

  it('returns operation error when transaction create fails', async () => {
    mockFns.mockInsertSingle.mockResolvedValue({ data: null, error: { message: 'insert failed' } });

    const result = await createTransaction('user-1', {
      amount: 100,
      category_id: '123e4567-e89b-12d3-a456-426614174000',
      type: 'expense',
      date: '2026-03-10',
      description: 'Тест',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('insert failed');
  });

  it('filters by all duplicate category ids when selected category id has same name/type twins', async () => {
    const primaryCategoryId = '11111111-1111-4111-8111-111111111111';
    const duplicateCategoryId = '22222222-2222-4222-8222-222222222222';

    mockFns.mockCategoryMaybeSingle.mockResolvedValue({
      data: {
        id: primaryCategoryId,
        name: 'Продукты',
        type: 'expense',
      },
      error: null,
    });

    mockFns.state.categoriesListResult = {
      data: [{ id: primaryCategoryId }, { id: duplicateCategoryId }],
      error: null,
    };

    mockFns.state.transactionRangeResult = {
      data: [
        {
          id: 'tx-1',
          user_id: 'user-1',
          category_id: duplicateCategoryId,
          amount: 1200,
          description: 'Оплата картой Сбера',
          date: '2026-03-15',
          type: 'expense',
          created_at: '2026-03-15T10:00:00.000Z',
          is_imported: false,
          bank_account_id: null,
          merchant: 'Пятёрочка',
          mcc_code: null,
        },
      ],
      error: null,
      count: 1,
    };

    const result = await getTransactions(
      'user-1',
      {
        search: 'Оплата картой Сбера',
        category_id: primaryCategoryId,
        type: 'expense',
        date_from: '15.03.2026',
        amount_min: 1000,
        is_imported: false,
      },
      { page: 1, limit: 20 }
    );

    expect(mockFns.txQuery.in).toHaveBeenCalledWith('category_id', [primaryCategoryId, duplicateCategoryId]);
    expect(result.total).toBe(1);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].description).toContain('Оплата картой Сбера');
  });

  it('filters by matching category ids when category is provided as name', async () => {
    const categoryIdOne = '33333333-3333-4333-8333-333333333333';
    const categoryIdTwo = '44444444-4444-4444-8444-444444444444';

    mockFns.state.categoriesListResult = {
      data: [{ id: categoryIdOne }, { id: categoryIdTwo }],
      error: null,
    };

    mockFns.state.transactionRangeResult = {
      data: [
        {
          id: 'tx-2',
          user_id: 'user-1',
          category_id: categoryIdOne,
          amount: 1500,
          description: 'Оплата картой Сбера',
          date: '2026-03-16',
          type: 'expense',
          created_at: '2026-03-16T10:00:00.000Z',
          is_imported: false,
          bank_account_id: null,
          merchant: 'Магазин',
          mcc_code: null,
        },
      ],
      error: null,
      count: 1,
    };

    const result = await getTransactions(
      'user-1',
      {
        search: 'Оплата картой Сбера',
        category_id: 'Продукты',
        type: 'expense',
        date_from: '15.03.2026',
        amount_min: 1000,
        is_imported: false,
      },
      { page: 1, limit: 20 }
    );

    expect(mockFns.txQuery.in).toHaveBeenCalledWith('category_id', [categoryIdOne, categoryIdTwo]);
    expect(result.total).toBe(1);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].description).toContain('Оплата картой Сбера');
  });
});
