import { supabase } from '@/lib/supabase';
import type {
  Budget,
  BudgetFormData,
  BudgetQueryOptions,
  BudgetPeriod,
  OperationResult,
} from '@/types';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '@/utils/constants';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizeMonth = (month: string): string => {
  // DB column is date, while form sends YYYY-MM
  return month.length === 7 ? `${month}-01` : month;
};

const toIsoDate = (date: Date): string => date.toISOString().split('T')[0];

const buildDateRange = (
  period: BudgetPeriod,
  budgetMonth?: string,
  customFrom?: string,
  customTo?: string
): { start?: string; end?: string } => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const end = new Date(today);

  switch (period) {
    case 'today': {
      return { start: toIsoDate(today), end: toIsoDate(today) };
    }
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: toIsoDate(yesterday), end: toIsoDate(yesterday) };
    }
    case 'week': {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - 6);
      return { start: toIsoDate(weekStart), end: toIsoDate(end) };
    }
    case 'month': {
      if (budgetMonth) {
        const normalized = normalizeMonth(budgetMonth);
        const [year, month] = normalized.split('-').map(Number);
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0);
        return { start: toIsoDate(monthStart), end: toIsoDate(monthEnd) };
      }

      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: toIsoDate(monthStart), end: toIsoDate(end) };
    }
    case 'last30days': {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      return { start: toIsoDate(start), end: toIsoDate(end) };
    }
    case 'custom': {
      return {
        start: customFrom,
        end: customTo,
      };
    }
    case 'all':
    default:
      return {};
  }
};

const getTypeByCategoryName = (categoryName: string): 'income' | 'expense' => {
  if (DEFAULT_INCOME_CATEGORIES.some((c) => c.name === categoryName)) {
    return 'income';
  }

  return 'expense';
};

const resolveCategoryId = async (
  userId: string,
  rawCategoryId: string,
  categoryType?: 'income' | 'expense'
): Promise<string> => {
  if (UUID_REGEX.test(rawCategoryId)) {
    return rawCategoryId;
  }

  const categoryName = rawCategoryId.trim();
  const resolvedType = categoryType || getTypeByCategoryName(categoryName);

  const { data: existing, error: selectError } = await supabase
    .from('categories')
    .select('id, type')
    .eq('user_id', userId)
    .eq('name', categoryName);

  if (selectError) throw selectError;
  const exactType = existing?.find((c) => c.type === resolvedType);
  if (exactType?.id) return exactType.id;

  if (existing && existing.length > 0) {
    return existing[0].id;
  }

  const preset =
    resolvedType === 'income'
      ? DEFAULT_INCOME_CATEGORIES.find((c) => c.name === categoryName)
      : DEFAULT_EXPENSE_CATEGORIES.find((c) => c.name === categoryName);

  const { data: created, error: createError } = await supabase
    .from('categories')
    .insert({
      user_id: userId,
      name: categoryName,
      color: preset?.color || '#3B82F6',
      icon: preset?.icon || 'tag',
      type: resolvedType,
    })
    .select('id')
    .single();

  if (createError) throw createError;
  return created.id;
};

/**
 * Получить все бюджеты пользователя
 */
export const getBudgets = async (
  userId: string,
  options: BudgetQueryOptions = {}
): Promise<Budget[]> => {
  let query = supabase
    .from('budgets')
    .select(`
      *,
      category:categories (
        id,
        name,
        color,
        icon,
        type
      )
    `)
    .eq('user_id', userId)
    .order('month', { ascending: false });

  const { data: budgetsData, error } = await query;
  if (error) {
    console.error('Ошибка при получении бюджетов:', error);
    throw error;
  }

  const budgets = budgetsData || [];
  if (budgets.length === 0) return [];

  const period = options.period || 'month';
  const { start, end } = buildDateRange(period, options.month, options.date_from, options.date_to);

  let txQuery = supabase
    .from('transactions')
    .select(`
      category_id,
      amount,
      type,
      date,
      category:categories (
        id,
        name,
        type
      )
    `)
    .eq('user_id', userId);

  if (start) {
    txQuery = txQuery.gte('date', start);
  }
  if (end) {
    txQuery = txQuery.lte('date', end);
  }

  const { data: txData, error: txError } = await txQuery;
  if (txError) {
    console.error('Ошибка при получении транзакций для бюджетов:', txError);
    throw txError;
  }

  const spentByBudgetKey = new Map<string, number>();
  const spentByCategoryId = new Map<string, number>();

  txData?.forEach((tx) => {
    const amount = Number(tx.amount || 0);
    const txCategory = tx.category as { id?: string; name?: string; type?: 'income' | 'expense' } | null;

    const txType = txCategory?.type || tx.type;
    const txName = txCategory?.name;

    if (txName && txType) {
      const key = `${txName}::${txType}`;
      spentByBudgetKey.set(key, (spentByBudgetKey.get(key) || 0) + amount);
    }

    if (tx.category_id) {
      spentByCategoryId.set(tx.category_id, (spentByCategoryId.get(tx.category_id) || 0) + amount);
    }
  });

  const budgetsWithStats: Budget[] = budgets.map((budget) => {
    const budgetName = budget.category?.name;
    const budgetType = budget.category?.type;
    const key = budgetName && budgetType ? `${budgetName}::${budgetType}` : '';

    // Prefer stable semantic match by name+type, fallback to direct category_id.
    const spent = Number(
      (key ? spentByBudgetKey.get(key) : undefined) ??
      spentByCategoryId.get(budget.category_id) ??
      0
    );

    const limit = Number(budget.limit_amount || 0);
    const remaining = limit - spent;
    const percentage = limit > 0 ? (spent / limit) * 100 : 0;

    return {
      ...budget,
      spent_amount: spent,
      remaining_amount: remaining,
      percentage_used: percentage,
      spent,
      limit,
      category_name: budget.category?.name,
    };
  });

  return budgetsWithStats;
};

/**
 * Получить бюджет по ID
 */
export const getBudgetById = async (budgetId: string, userId: string): Promise<Budget | null> => {
  try {
    const { data, error } = await supabase
      .from('budgets')
      .select(`
        *,
        category:categories (
          id,
          name,
          color,
          icon,
          type
        )
      `)
      .eq('id', budgetId)
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Ошибка при получении бюджета:', error);
    return null;
  }
};

/**
 * Создать новый бюджет
 */
export const createBudget = async (
  userId: string,
  formData: BudgetFormData
): Promise<OperationResult<Budget>> => {
  try {
    const resolvedCategoryId = await resolveCategoryId(userId, formData.category_id, formData.category_type);
    const { data, error } = await supabase
      .from('budgets')
      .insert({
        user_id: userId,
        category_id: resolvedCategoryId,
        limit_amount: formData.limit,
        month: normalizeMonth(formData.month),
      })
      .select(`
        *,
        category:categories (
          id,
          name,
          color,
          icon,
          type
        )
      `)
      .single();

    if (error) throw error;

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Ошибка при создании бюджета:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Не удалось создать бюджет',
    };
  }
};

/**
 * Обновить бюджет
 */
export const updateBudget = async (
  budgetId: string,
  userId: string,
  formData: Partial<BudgetFormData>
): Promise<OperationResult<Budget>> => {
  try {
    const updateData: Partial<Budget> = {};
    
    if (formData.category_id) {
      updateData.category_id = await resolveCategoryId(userId, formData.category_id, formData.category_type);
    }
    if (formData.limit !== undefined) updateData.limit_amount = formData.limit;
    if (formData.month) updateData.month = normalizeMonth(formData.month);

    const { data, error } = await supabase
      .from('budgets')
      .update(updateData)
      .eq('id', budgetId)
      .eq('user_id', userId)
      .select(`
        *,
        category:categories (
          id,
          name,
          color,
          icon,
          type
        )
      `)
      .single();

    if (error) throw error;

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Ошибка при обновлении бюджета:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Не удалось обновить бюджет',
    };
  }
};

/**
 * Удалить бюджет
 */
export const deleteBudget = async (
  budgetId: string,
  userId: string
): Promise<OperationResult<void>> => {
  try {
    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', budgetId)
      .eq('user_id', userId);

    if (error) throw error;

    return {
      success: true,
    };
  } catch (error) {
    console.error('Ошибка при удалении бюджета:', error);
    return {
      success: false,
      error: 'Не удалось удалить бюджет',
    };
  }
};
