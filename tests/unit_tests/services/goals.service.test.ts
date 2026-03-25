import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getGoals, createGoal, deleteGoal } from '@/services/goals.service';

const mockFns = vi.hoisted(() => {
  const state = {
    listResult: { data: [] as any[], error: null as any },
    singleResult: { data: null as any, error: null as any },
    deleteResult: { error: null as any },
  };

  const listQuery: any = {};
  listQuery.select = vi.fn(() => listQuery);
  listQuery.eq = vi.fn(() => listQuery);
  listQuery.order = vi.fn(() => Promise.resolve(state.listResult));

  const singleQuery: any = {};
  singleQuery.insert = vi.fn(() => singleQuery);
  singleQuery.select = vi.fn(() => singleQuery);
  singleQuery.single = vi.fn(() => Promise.resolve(state.singleResult));

  const deleteQuery: any = {};
  deleteQuery.delete = vi.fn(() => deleteQuery);
  deleteQuery.eq = vi.fn(() => deleteQuery);
  // second eq call returns the promise
  deleteQuery.eq2 = vi.fn(() => Promise.resolve(state.deleteResult));

  const mockFrom = vi.fn((table: string) => {
    if (table === 'financial_goals') {
      return {
        select: listQuery.select,
        insert: singleQuery.insert,
        delete: () => ({
          eq: () => ({
            eq: () => Promise.resolve(state.deleteResult),
          }),
        }),
      };
    }
    return {};
  });

  return { state, listQuery, singleQuery, deleteQuery, mockFrom };
});

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mockFns.mockFrom },
}));

describe('goals.service — getGoals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns goals list on success', async () => {
    mockFns.listQuery.order.mockResolvedValue({
      data: [
        { id: 'g-1', goal_name: 'Отпуск', target_amount: 100000, current_amount: 25000 },
      ],
      error: null,
    });

    const result = await getGoals('user-1');

    expect(result).toHaveLength(1);
    expect(result[0].goal_name).toBe('Отпуск');
  });

  it('returns empty array on supabase error', async () => {
    mockFns.listQuery.order.mockResolvedValue({ data: null, error: { message: 'DB error' } });

    const result = await getGoals('user-1');

    expect(result).toEqual([]);
  });
});

describe('goals.service — createGoal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a goal and returns it', async () => {
    mockFns.singleQuery.single.mockResolvedValue({
      data: { id: 'g-2', goal_name: 'Машина', target_amount: 500000, current_amount: 0 },
      error: null,
    });

    const result = await createGoal('user-1', {
      goal_name: 'Машина',
      target_amount: 500000,
      current_amount: 0,
      priority: 'high',
      deadline: '2027-12-31',
    });

    expect(result.success).toBe(true);
    expect(result.data?.goal_name).toBe('Машина');
  });

  it('returns error when insert fails', async () => {
    mockFns.singleQuery.single.mockResolvedValue({
      data: null,
      error: { message: 'insert failed' },
    });

    const result = await createGoal('user-1', {
      goal_name: 'Машина',
      target_amount: 500000,
      current_amount: 0,
      priority: 'high',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('goals.service — deleteGoal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success when deletion is successful', async () => {
    mockFns.state.deleteResult = { error: null };

    const result = await deleteGoal('g-1', 'user-1');

    expect(result.success).toBe(true);
  });

  it('returns error when deletion fails', async () => {
    mockFns.state.deleteResult = { error: { message: 'deletion error' } };

    const result = await deleteGoal('g-1', 'user-1');

    expect(result.success).toBe(false);
  });
});
