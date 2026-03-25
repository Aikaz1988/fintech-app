import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ImportTransactions } from '@/components/BankIntegration/ImportTransactions';
import type { BankAccount } from '@/types';

const mockFns = vi.hoisted(() => ({
  importTransactionsFromBank: vi.fn(),
}));

vi.mock('@/services/bankApi.service', () => ({
  importTransactionsFromBank: mockFns.importTransactionsFromBank,
}));

const accounts: BankAccount[] = [
  {
    id: 'acc-1',
    user_id: 'u-1',
    account_name: 'Основной',
    bank_name: 'Сбербанк',
    account_number: '12345678901234567890',
    balance: 1000,
    currency: 'RUB',
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

describe('ImportTransactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows info alert when no accounts available', () => {
    render(
      <ImportTransactions
        accounts={[]}
        onImportTransactionsBulk={vi.fn(async () => ({ success: true, imported: 0 }))}
      />
    );

    expect(screen.getByText('Для импорта добавьте хотя бы один счет в приложение.')).toBeInTheDocument();
  });

  it('validates date range before preview', async () => {
    render(
      <ImportTransactions
        accounts={accounts}
        onImportTransactionsBulk={vi.fn(async () => ({ success: true, imported: 0 }))}
      />
    );

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Счет' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Основной (RUB)' }));
    fireEvent.change(screen.getByLabelText('С'), { target: { value: '2026-03-10' } });
    fireEvent.change(screen.getByLabelText('По'), { target: { value: '2026-03-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Предпросмотр' }));

    expect(await screen.findByText('Дата "С" не может быть позже даты "По"')).toBeInTheDocument();
    expect(mockFns.importTransactionsFromBank).not.toHaveBeenCalled();
  });

  it('imports preview in bulk on confirm', async () => {
    const onImportTransactionsBulk = vi.fn(async () => ({ success: true, imported: 2 }));

    mockFns.importTransactionsFromBank.mockResolvedValue({
      success: true,
      count: 2,
      transactions: [
        {
          id: 't1',
          date: '2026-03-01',
          amount: -1200,
          description: 'Магнит',
          merchant: 'Магнит',
          category_suggestion: 'Продукты',
        },
        {
          id: 't2',
          date: '2026-03-02',
          amount: 3000,
          description: 'Перевод',
          merchant: 'Сбербанк',
          category_suggestion: 'Зарплата',
        },
      ],
    });

    render(
      <ImportTransactions
        accounts={accounts}
        onImportTransactionsBulk={onImportTransactionsBulk}
      />
    );

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Счет' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Основной (RUB)' }));
    fireEvent.change(screen.getByLabelText('С'), { target: { value: '2026-03-01' } });
    fireEvent.change(screen.getByLabelText('По'), { target: { value: '2026-03-10' } });

    fireEvent.click(screen.getByRole('button', { name: 'Предпросмотр' }));
    expect(await screen.findByText('Магнит')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить импорт' }));

    expect(onImportTransactionsBulk).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Импорт завершен. Добавлено 2 транзакций.')).toBeInTheDocument();
  });
});
