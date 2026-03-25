import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type {
  Transaction,
  TransactionFormData,
  TransactionFilters,
  OperationResult,
} from '@/types';
import * as transactionService from '@/services/transactions.service';

interface UseTransactionsReturn {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  hasMore: boolean;
  filters: TransactionFilters;
  loadTransactions: (page?: number) => Promise<void>;
  addTransaction: (data: TransactionFormData) => Promise<OperationResult<Transaction>>;
  updateTransaction: (
    id: string,
    data: Partial<TransactionFormData>
  ) => Promise<OperationResult<Transaction>>;
  deleteTransaction: (id: string) => Promise<OperationResult<void>>;
  setFilters: (filters: TransactionFilters) => void;
  resetFilters: () => void;
}

export const useTransactions = (): UseTransactionsReturn => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [filters, setFiltersState] = useState<TransactionFilters>({});

  const defaultFilters: TransactionFilters = {};

  const sanitizeFilters = (source: TransactionFilters): TransactionFilters => {
    const next: TransactionFilters = {};

    if (source.type === 'income' || source.type === 'expense') {
      next.type = source.type;
    }

    if (typeof source.category_id === 'string' && source.category_id.trim()) {
      next.category_id = source.category_id.trim();
    }

    if (typeof source.date_from === 'string' && source.date_from.trim()) {
      next.date_from = source.date_from;
    }

    if (typeof source.date_to === 'string' && source.date_to.trim()) {
      next.date_to = source.date_to;
    }

    if (typeof source.amount_min === 'number' && Number.isFinite(source.amount_min)) {
      next.amount_min = source.amount_min;
    }

    if (typeof source.amount_max === 'number' && Number.isFinite(source.amount_max)) {
      next.amount_max = source.amount_max;
    }

    if (typeof source.search === 'string') {
      next.search = source.search;
    }

    if (typeof source.is_imported === 'boolean') {
      next.is_imported = source.is_imported;
    }

    return next;
  };

  const loadTransactions = useCallback(
    async (pageNum: number = 1) => {
      if (!user) return;

      try {
        setLoading(true);
        setError(null);

        const result = await transactionService.getTransactions(user.id, filters, {
          page: pageNum,
          limit: 20,
        });

        setTransactions(result.data);
        setTotal(result.total);
        setPage(result.page);
        setHasMore(result.hasMore);
      } catch (err) {
        setError('Не удалось загрузить транзакции');
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [user, filters]
  );

  const addTransaction = async (
    data: TransactionFormData
  ): Promise<OperationResult<Transaction>> => {
    if (!user) {
      return { success: false, error: 'Пользователь не авторизован' };
    }

    const result = await transactionService.createTransaction(user.id, data);
    
    if (result.success) {
      await loadTransactions(page);
    }
    
    return result;
  };

  const updateTransaction = async (
    id: string,
    data: Partial<TransactionFormData>
  ): Promise<OperationResult<Transaction>> => {
    if (!user) {
      return { success: false, error: 'Пользователь не авторизован' };
    }

    const result = await transactionService.updateTransaction(id, user.id, data);
    
    if (result.success) {
      await loadTransactions(page);
    }
    
    return result;
  };

  const deleteTransaction = async (id: string): Promise<OperationResult<void>> => {
    if (!user) {
      return { success: false, error: 'Пользователь не авторизован' };
    }

    const result = await transactionService.deleteTransaction(id, user.id);
    
    if (result.success) {
      await loadTransactions(page);
    }
    
    return result;
  };

  const setFilters = (newFilters: TransactionFilters) => {
    setFiltersState(sanitizeFilters(newFilters));
    setPage(1); // Сброс на первую страницу при изменении фильтров
  };

  const resetFilters = () => {
    setFiltersState(defaultFilters);
    setPage(1);
  };

  useEffect(() => {
    loadTransactions(1);
  }, [user, filters]);

  return {
    transactions,
    loading,
    error,
    total,
    page,
    hasMore,
    filters,
    loadTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    setFilters,
    resetFilters,
  };
};