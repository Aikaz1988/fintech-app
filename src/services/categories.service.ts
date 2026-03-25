import { supabase } from '@/lib/supabase';
import type { Category, OperationResult, TransactionType } from '@/types';

export const getCategories = async (userId: string, type?: TransactionType): Promise<Category[]> => {
  try {
    let query = supabase
      .from('categories')
      .select('*')
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order('name', { ascending: true });

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Ошибка загрузки категорий:', error);
    return [];
  }
};

export const createCategory = async (
  userId: string,
  payload: Pick<Category, 'name' | 'type' | 'color' | 'icon'>
): Promise<OperationResult<Category>> => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert({
        user_id: userId,
        name: payload.name.trim(),
        type: payload.type,
        color: payload.color,
        icon: payload.icon,
      })
      .select('*')
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Ошибка создания категории:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Не удалось создать категорию',
    };
  }
};

export const updateCategory = async (
  userId: string,
  categoryId: string,
  payload: Partial<Pick<Category, 'name' | 'color' | 'icon' | 'type'>>
): Promise<OperationResult<Category>> => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .update(payload)
      .eq('id', categoryId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Ошибка обновления категории:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Не удалось обновить категорию',
    };
  }
};

export const deleteCategory = async (userId: string, categoryId: string): Promise<OperationResult<void>> => {
  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId)
      .eq('user_id', userId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Ошибка удаления категории:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Не удалось удалить категорию',
    };
  }
};
