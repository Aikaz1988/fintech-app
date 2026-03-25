import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BankConnection } from '@/components/BankIntegration/BankConnection';

const mockFns = vi.hoisted(() => ({
  connectToBank: vi.fn(),
  fetchBankAccounts: vi.fn(),
  getSupportedBanks: vi.fn(() => ['Сбербанк', 'Тинькофф']),
}));

vi.mock('@/services/bankApi.service', () => ({
  connectToBank: mockFns.connectToBank,
  fetchBankAccounts: mockFns.fetchBankAccounts,
  getSupportedBanks: mockFns.getSupportedBanks,
}));

describe('BankConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows validation error for short login', async () => {
    render(<BankConnection userId="u-1" onConnected={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Логин'), { target: { value: 'ab' } });
    fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Подключить' }));

    expect(await screen.findByText('Логин должен содержать минимум 3 символа')).toBeInTheDocument();
    expect(mockFns.connectToBank).not.toHaveBeenCalled();
  });

  it('connects and emits accounts on success', async () => {
    const onConnected = vi.fn();
    mockFns.connectToBank.mockResolvedValue({ success: true, data: { accountId: 'a1', bankName: 'Сбербанк' } });
    mockFns.fetchBankAccounts.mockResolvedValue([
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
    ]);

    render(<BankConnection userId="u-1" onConnected={onConnected} />);

    fireEvent.change(screen.getByLabelText('Логин'), { target: { value: 'valid-login' } });
    fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: 'valid-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Подключить' }));

    expect(
      await screen.findByText('Подключение к Сбербанк успешно. Получено счетов: 1 (Основной)')
    ).toBeInTheDocument();
    expect(onConnected).toHaveBeenCalledTimes(1);
  });
});
