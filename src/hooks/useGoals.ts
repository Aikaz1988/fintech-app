import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { FinancialGoal, GoalFormData, OperationResult } from '@/types';
import * as goalsService from '@/services/goals.service';

interface UseGoalsReturn {
  goals: FinancialGoal[];
  loading: boolean;
  error: string | null;
  loadGoals: () => Promise<void>;
  addGoal: (data: GoalFormData) => Promise<OperationResult<FinancialGoal>>;
  updateGoal: (id: string, data: Partial<GoalFormData>) => Promise<OperationResult<FinancialGoal>>;
  deleteGoal: (id: string) => Promise<OperationResult<void>>;
  toggleAchieved: (id: string, achieved: boolean) => Promise<OperationResult<FinancialGoal>>;
}

export const useGoals = (): UseGoalsReturn => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGoals = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await goalsService.getGoals(user.id);
      setGoals(data);
    } catch (err) {
      console.error(err);
      setError('Не удалось загрузить финансовые цели');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const addGoal = async (data: GoalFormData): Promise<OperationResult<FinancialGoal>> => {
    if (!user) {
      return { success: false, error: 'Пользователь не авторизован' };
    }

    const result = await goalsService.createGoal(user.id, data);
    if (result.success) {
      await loadGoals();
    }

    return result;
  };

  const updateGoal = async (
    id: string,
    data: Partial<GoalFormData>
  ): Promise<OperationResult<FinancialGoal>> => {
    if (!user) {
      return { success: false, error: 'Пользователь не авторизован' };
    }

    const result = await goalsService.updateGoal(id, user.id, data);
    if (result.success) {
      await loadGoals();
    }

    return result;
  };

  const deleteGoal = async (id: string): Promise<OperationResult<void>> => {
    if (!user) {
      return { success: false, error: 'Пользователь не авторизован' };
    }

    const result = await goalsService.deleteGoal(id, user.id);
    if (result.success) {
      await loadGoals();
    }

    return result;
  };

  const toggleAchieved = async (
    id: string,
    achieved: boolean
  ): Promise<OperationResult<FinancialGoal>> => {
    if (!user) {
      return { success: false, error: 'Пользователь не авторизован' };
    }

    const result = await goalsService.toggleGoalAchieved(id, user.id, achieved);
    if (result.success) {
      await loadGoals();
    }

    return result;
  };

  useEffect(() => {
    void loadGoals();
  }, [loadGoals]);

  return {
    goals,
    loading,
    error,
    loadGoals,
    addGoal,
    updateGoal,
    deleteGoal,
    toggleAchieved,
  };
};
