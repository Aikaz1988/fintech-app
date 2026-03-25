import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getBankAccounts, createBankAccount } from '@/services/bankAccounts.service';

const mockFns = vi.hoisted(() => {
  const state = {
    listResult: { data: [] as any[], error: null as any },
    singleResult: { data: null as any, error: null as any },
  };

  const listQuery: any = {};
  listQuery.select = vi.fn(() => listQuery);
  listQuery.eq = vi.fn(() => listQuery);
  listQuery.order = vi.fn(() => Promise.resolve(state.listResult));

  const singleQuery: any = {};
  singleQuery.insert = vi.fn(() => singleQuery);
  singleQuery.select = vi.fn(() => singleQuery);
  singleQuery.single = vi.fn(() => Promise.resolve(state.singleResult));

  const mockFrom = vi.fn(() => ({
    select: listQuery.select,
    insert: singleQuery.insert,
  }));

  return { state, listQuery, singleQuery, mockFrom };
});

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mockFns.mockFrom },
}));

describe('bankAccounts.service — getBankAccounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns list of active bank accounts', async () => {
    mockFns.listQuery.order.mockResolvedValue({
      data: [
        {
          id: 'acc-1',
          user_id: 'u-1',
          account_name: 'Основной',
          bank_name: 'Сбербанк',
          account_number: '40817810099910004312',
          balance: 150000,
          currency: 'RUB',
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ],
      error: null,
    });

    const result = await getBankAccounts('user-1');

    expect(result).toHaveLength(1);
    expect(result[0].account_name).toBe('Основной');
    expect(result[0].is_active).toBe(true);
  });

  it('returns empty array on supabase error', async () => {
    mockFns.listQuery.order.mockResolvedValue({ data: null, error: { message: 'not found' } });

    const result = await getBankAccounts('user-1');

    expect(result).toEqual([]);
  });
});

describe('bankAccounts.service — createBankAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates bank account successfully', async () => {
    mockFns.singleQuery.single.mockResolvedValue({
      data: {
        id: 'acc-new',
        user_id: 'u-1',
        account_name: 'Накопительный',
        bank_name: 'Тинькофф',
        account_number: null,
        balance: 0,
        currency: 'RUB',
        is_active: true,
        created_at: new Date().toISOString(),
      },
      error: null,
    });

    const result = await createBankAccount('user-1', {
      account_name: 'Накопительный',
      bank_name: 'Тинькофф',
      balance: 0,
      currency: 'RUB',
    });

    expect(result.success).toBe(true);
    expect(result.data?.account_name).toBe('Накопительный');
  });

  it('returns error when creation fails', async () => {
    mockFns.singleQuery.single.mockResolvedValue({
      data: null,
      error: { message: 'connection failed' },
    });

    const result = await createBankAccount('user-1', {
      account_name: 'Накопительный',
      bank_name: 'Тинькофф',
      balance: 0,
      currency: 'RUB',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
