import { supabase } from '@/lib/supabase';
import type { FinancialGoal, GoalFormData, OperationResult } from '@/types';

export const getGoals = async (userId: string): Promise<FinancialGoal[]> => {
  try {
    const { data, error } = await supabase
      .from('financial_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Ошибка при загрузке целей:', error);
    return [];
  }
};

export const createGoal = async (
  userId: string,
  formData: GoalFormData
): Promise<OperationResult<FinancialGoal>> => {
  try {
    const { data, error } = await supabase
      .from('financial_goals')
      .insert({
        user_id: userId,
        goal_name: formData.goal_name,
        target_amount: formData.target_amount,
        current_amount: formData.current_amount || 0,
        deadline: formData.deadline || null,
        priority: formData.priority,
      })
      .select('*')
      .single();

    if (error) throw error;

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Ошибка при создании цели:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Не удалось создать цель',
    };
  }
};

export const updateGoal = async (
  goalId: string,
  userId: string,
  formData: Partial<GoalFormData>
): Promise<OperationResult<FinancialGoal>> => {
  try {
    const { data, error } = await supabase
      .from('financial_goals')
      .update({
        goal_name: formData.goal_name,
        target_amount: formData.target_amount,
        current_amount: formData.current_amount,
        deadline: formData.deadline,
        priority: formData.priority,
      })
      .eq('id', goalId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) throw error;

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Ошибка при обновлении цели:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Не удалось обновить цель',
    };
  }
};

export const deleteGoal = async (goalId: string, userId: string): Promise<OperationResult<void>> => {
  try {
    const { error } = await supabase
      .from('financial_goals')
      .delete()
      .eq('id', goalId)
      .eq('user_id', userId);

    if (error) throw error;

    return {
      success: true,
    };
  } catch (error) {
    console.error('Ошибка при удалении цели:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Не удалось удалить цель',
    };
  }
};

export const toggleGoalAchieved = async (
  goalId: string,
  userId: string,
  isAchieved: boolean
): Promise<OperationResult<FinancialGoal>> => {
  try {
    const { data, error } = await supabase
      .from('financial_goals')
      .update({ is_achieved: isAchieved })
      .eq('id', goalId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) throw error;

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Ошибка при смене статуса цели:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Не удалось обновить статус цели',
    };
  }
};
