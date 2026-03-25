import { describe, expect, it } from 'vitest';
import { validateBudget, validateGoal, validateTransaction } from '@/utils/validators';

describe('validators', () => {
  it('validates transaction amount and category', () => {
    const result = validateTransaction({
      amount: 0,
      category_id: '',
      type: 'expense',
      date: '2026-03-10',
      description: '',
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.amount).toBeDefined();
    expect(result.errors.category_id).toBeDefined();
  });

  it('validates budget limit', () => {
    const result = validateBudget({
      category_id: 'food',
      limit: -1,
      month: '2026-03',
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.limit).toBeDefined();
  });

  it('validates goal current amount against target', () => {
    const result = validateGoal({
      goal_name: 'Новый ноутбук',
      target_amount: 1000,
      current_amount: 1500,
      priority: 'medium',
      deadline: '2099-01-01',
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.current_amount).toBeDefined();
  });
});
