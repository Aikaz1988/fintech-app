import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Budget, BudgetFormData, BudgetQueryOptions, OperationResult } from '@/types';
import * as budgetService from '@/services/budgets.service';

interface UseBudgetsReturn {
  budgets: Budget[];
  loading: boolean;
  error: string | null;
  addBudget: (data: BudgetFormData) => Promise<OperationResult<Budget>>;
  updateBudget: (id: string, data: Partial<BudgetFormData>) => Promise<OperationResult<Budget>>;
  deleteBudget: (id: string) => Promise<OperationResult<void>>;
  loadBudgets: (options?: BudgetQueryOptions) => Promise<void>;
}

export const useBudgets = (): UseBudgetsReturn => {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeOptionsRef = useRef<BudgetQueryOptions>({ period: 'month' });

  const loadBudgets = useCallback(
    async (options?: BudgetQueryOptions) => {
      if (!user) {
        setLoading(false);
        return;
      }

      const resolvedOptions = options || activeOptionsRef.current;
      activeOptionsRef.current = resolvedOptions;

      try {
        setLoading(true);
        const data = await budgetService.getBudgets(user.id, resolvedOptions);
        setBudgets(data);
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Не удалось загрузить бюджеты');
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  const addBudget = async (data: BudgetFormData) => {
    if (!user) {
      return { success: false, error: 'Пользователь не авторизован' };
    }
    const result = await budgetService.createBudget(user.id, data);
    if (result.success) await loadBudgets(activeOptionsRef.current);
    return result;
  };

  const updateBudget = async (id: string, data: Partial<BudgetFormData>) => {
    if (!user) {
      return { success: false, error: 'Пользователь не авторизован' };
    }
    const result = await budgetService.updateBudget(id, user.id, data);
    if (result.success) await loadBudgets(activeOptionsRef.current);
    return result;
  };

  const deleteBudget = async (id: string) => {
    if (!user) {
      return { success: false, error: 'Пользователь не авторизован' };
    }
    const result = await budgetService.deleteBudget(id, user.id);
    if (result.success) await loadBudgets(activeOptionsRef.current);
    return result;
  };

  useEffect(() => {
    void loadBudgets(activeOptionsRef.current);
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`budgets-realtime-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` },
        () => {
          void loadBudgets(activeOptionsRef.current);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'budgets', filter: `user_id=eq.${user.id}` },
        () => {
          void loadBudgets(activeOptionsRef.current);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, loadBudgets]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void loadBudgets(activeOptionsRef.current);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadBudgets]);

  return {
    budgets,
    loading,
    error,
    addBudget,
    updateBudget,
    deleteBudget,
    loadBudgets,
  };
};