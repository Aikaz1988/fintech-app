import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BudgetForm } from '@/components/Budgets/BudgetForm';

describe('BudgetForm', () => {
  it('shows validation error for empty category', async () => {
    render(
      <BudgetForm
        open
        onClose={vi.fn()}
        onSubmit={vi.fn(async () => undefined)}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(await screen.findByText('Выберите категорию')).toBeInTheDocument();
  });
});
