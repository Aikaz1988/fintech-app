import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TransactionForm } from '@/components/Transactions/TransactionForm';

describe('TransactionForm', () => {
  it('shows validation errors on empty submit', async () => {
    render(
      <TransactionForm
        isOpen
        onClose={vi.fn()}
        onSubmit={vi.fn(async () => undefined)}
        categories={[]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(await screen.findByText('Сумма должна быть больше 0')).toBeInTheDocument();
    expect(await screen.findByText('Выберите категорию', { selector: 'p' })).toBeInTheDocument();
  });
});
