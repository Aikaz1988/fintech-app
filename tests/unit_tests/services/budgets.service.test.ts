import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createBudget } from '@/services/budgets.service';

const mockFns = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockSelect = vi.fn(() => ({ single: mockSingle }));
  const mockInsert = vi.fn(() => ({ select: mockSelect }));
  const mockFrom = vi.fn((table: string) => {
    if (table === 'budgets') {
      return { insert: mockInsert };
    }

    return {};
  });

  return { mockSingle, mockSelect, mockInsert, mockFrom };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFns.mockFrom,
  },
}));

describe('budgets.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates budget successfully', async () => {
    mockFns.mockSingle.mockResolvedValue({
      data: {
        id: 'b-1',
        limit_amount: 30000,
      },
      error: null,
    });

    const result = await createBudget('user-1', {
      category_id: '123e4567-e89b-12d3-a456-426614174000',
      limit: 30000,
      month: '2026-03',
    });

    expect(result.success).toBe(true);
    expect(result.data?.id).toBe('b-1');
  });
});
