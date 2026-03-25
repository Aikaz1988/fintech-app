import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { Category, OperationResult, TransactionType } from '@/types';
import * as categoriesService from '@/services/categories.service';

interface UseCategoriesReturn {
  categories: Category[];
  incomeCategories: Category[];
  expenseCategories: Category[];
  loading: boolean;
  error: string | null;
  loadCategories: () => Promise<void>;
  addCategory: (payload: Pick<Category, 'name' | 'type' | 'color' | 'icon'>) => Promise<OperationResult<Category>>;
  editCategory: (id: string, payload: Partial<Pick<Category, 'name' | 'color' | 'icon' | 'type'>>) => Promise<OperationResult<Category>>;
  removeCategory: (id: string) => Promise<OperationResult<void>>;
  getByType: (type: TransactionType) => Category[];
}

export const useCategories = (): UseCategoriesReturn => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await categoriesService.getCategories(user.id);
      setCategories(data);
    } catch (err) {
      console.error(err);
      setError('Не удалось загрузить категории');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const addCategory = async (
    payload: Pick<Category, 'name' | 'type' | 'color' | 'icon'>
  ): Promise<OperationResult<Category>> => {
    if (!user) return { success: false, error: 'Пользователь не авторизован' };
    const result = await categoriesService.createCategory(user.id, payload);
    if (result.success) await loadCategories();
    return result;
  };

  const editCategory = async (
    id: string,
    payload: Partial<Pick<Category, 'name' | 'color' | 'icon' | 'type'>>
  ): Promise<OperationResult<Category>> => {
    if (!user) return { success: false, error: 'Пользователь не авторизован' };
    const result = await categoriesService.updateCategory(user.id, id, payload);
    if (result.success) await loadCategories();
    return result;
  };

  const removeCategory = async (id: string): Promise<OperationResult<void>> => {
    if (!user) return { success: false, error: 'Пользователь не авторизован' };
    const result = await categoriesService.deleteCategory(user.id, id);
    if (result.success) await loadCategories();
    return result;
  };

  const getByType = useCallback(
    (type: TransactionType) => categories.filter((category) => category.type === type),
    [categories]
  );

  const incomeCategories = useMemo(() => categories.filter((c) => c.type === 'income'), [categories]);
  const expenseCategories = useMemo(() => categories.filter((c) => c.type === 'expense'), [categories]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  return {
    categories,
    incomeCategories,
    expenseCategories,
    loading,
    error,
    loadCategories,
    addCategory,
    editCategory,
    removeCategory,
    getByType,
  };
};
