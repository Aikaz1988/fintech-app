import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCategories, createCategory, deleteCategory } from '../../../src/services/categories.service';

const mockFns = vi.hoisted(() => {
  const state = {
    listResult: { data: [] as any[] | null, error: null as any },
    singleResult: { data: null as any, error: null as any },
    deleteResult: { error: null as any },
  };

  const listQuery: any = {};
  listQuery.select = vi.fn(() => listQuery);
  listQuery.or = vi.fn(() => listQuery);
  listQuery.eq = vi.fn(() => listQuery);
  listQuery.order = vi.fn(() => listQuery);
  listQuery.then = (res: (v: any) => any, rej?: (e: any) => any) =>
    Promise.resolve(state.listResult).then(res, rej);

  const singleQuery: any = {};
  singleQuery.insert = vi.fn(() => singleQuery);
  singleQuery.select = vi.fn(() => singleQuery);
  singleQuery.single = vi.fn(() => Promise.resolve(state.singleResult));

  const mockFrom = vi.fn(() => ({
    select: listQuery.select,
    or: listQuery.or,
    eq: listQuery.eq,
    order: listQuery.order,
    then: listQuery.then,
    insert: singleQuery.insert,
    delete: () => ({
      eq: () => ({
        eq: () => Promise.resolve(state.deleteResult),
      }),
    }),
  }));

  return { state, listQuery, singleQuery, mockFrom };
});

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mockFns.mockFrom },
}));

describe('categories.service — getCategories', () => {
  beforeEach(() => {
    mockFns.state.listResult = { data: [], error: null };
    vi.clearAllMocks();
  });

  it('returns categories list on success', async () => {
    mockFns.state.listResult = {
      data: [
        { id: 'c-1', name: 'Продукты', type: 'expense', color: '#f00', icon: 'food', user_id: 'u-1', created_at: '' },
        { id: 'c-2', name: 'Зарплата', type: 'income', color: '#0f0', icon: 'wallet', user_id: 'u-1', created_at: '' },
      ],
      error: null,
    };

    const result = await getCategories('user-1');

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Продукты');
  });

  it('filters by type when provided', async () => {
    mockFns.state.listResult = {
      data: [
        { id: 'c-1', name: 'Продукты', type: 'expense', color: '#f00', icon: 'food', user_id: 'u-1', created_at: '' },
      ],
      error: null,
    };

    const result = await getCategories('user-1', 'expense');

    expect(mockFns.listQuery.eq).toHaveBeenCalledWith('type', 'expense');
    expect(result).toHaveLength(1);
  });

  it('returns empty array on supabase error', async () => {
    mockFns.state.listResult = { data: null, error: { message: 'DB error' } };

    const result = await getCategories('user-1');

    expect(result).toEqual([]);
  });
});

describe('categories.service — createCategory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates category and returns it', async () => {
    mockFns.singleQuery.single.mockResolvedValue({
      data: { id: 'c-new', name: 'Аптеки', type: 'expense', color: '#00f', icon: 'health', user_id: 'u-1', created_at: '' },
      error: null,
    });

    const result = await createCategory('user-1', {
      name: 'Аптеки',
      type: 'expense',
      color: '#00f',
      icon: 'health',
    });

    expect(result.success).toBe(true);
    expect(result.data?.name).toBe('Аптеки');
  });

  it('returns error on insert failure', async () => {
    mockFns.singleQuery.single.mockResolvedValue({
      data: null,
      error: { message: 'duplicate key' },
    });

    const result = await createCategory('user-1', {
      name: 'Аптеки',
      type: 'expense',
      color: '#00f',
      icon: 'health',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('categories.service — deleteCategory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success on successful deletion', async () => {
    mockFns.state.deleteResult = { error: null };

    const result = await deleteCategory('user-1', 'c-1');

    expect(result.success).toBe(true);
  });

  it('returns error on deletion failure', async () => {
    mockFns.state.deleteResult = { error: { message: 'foreign key violation' } };

    const result = await deleteCategory('user-1', 'c-1');

    expect(result.success).toBe(false);
  });
});
