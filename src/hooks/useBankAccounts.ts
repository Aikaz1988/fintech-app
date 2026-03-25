import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { BankAccount, BankAccountFormData, OperationResult } from '@/types';
import * as bankAccountsService from '@/services/bankAccounts.service';

interface UseBankAccountsReturn {
  accounts: BankAccount[];
  loading: boolean;
  error: string | null;
  loadAccounts: () => Promise<void>;
  addAccount: (data: BankAccountFormData) => Promise<OperationResult<BankAccount>>;
}

export const useBankAccounts = (): UseBankAccountsReturn => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const data = await bankAccountsService.getBankAccounts(user.id);
      setAccounts(data);
    } catch (err) {
      console.error(err);
      setError('Не удалось загрузить счета');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const addAccount = async (data: BankAccountFormData): Promise<OperationResult<BankAccount>> => {
    if (!user) {
      return { success: false, error: 'Пользователь не авторизован' };
    }

    const result = await bankAccountsService.createBankAccount(user.id, data);
    if (result.success) {
      await loadAccounts();
    }

    return result;
  };

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  return {
    accounts,
    loading,
    error,
    loadAccounts,
    addAccount,
  };
};
