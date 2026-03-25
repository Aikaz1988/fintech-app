import { supabase } from '@/lib/supabase';
import type {
  Transaction,
  TransactionFormData,
  TransactionFilters,
  PaginationParams,
  PaginatedResult,
  OperationResult,
} from '@/types';
import { PAGINATION } from '@/utils/constants';

const toErrorMessage = (error: unknown, fallback: string): string => {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return fallback;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const RU_DATE_REGEX = /^(\d{2})\.(\d{2})\.(\d{4})$/;

const normalizeDateValue = (value?: string): string | undefined => {
  if (!value) return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const ruMatch = trimmed.match(RU_DATE_REGEX);
  if (ruMatch) {
    const [, day, month, year] = ruMatch;
    return `${year}-${month}-${day}`;
  }

  return trimmed;
};

const isValidDateInput = (value?: string): value is string => {
  const normalized = normalizeDateValue(value);
  if (!normalized) return false;
  const timestamp = Date.parse(normalized);
  return !Number.isNaN(timestamp);
};

const sanitizeFilters = (filters?: TransactionFilters): TransactionFilters => {
  if (!filters) return {};

  const next: TransactionFilters = {};

  if (filters.type === 'income' || filters.type === 'expense') {
    next.type = filters.type;
  }

  if (typeof filters.category_id === 'string' && filters.category_id.trim()) {
    next.category_id = filters.category_id.trim();
  }

  if (isValidDateInput(filters.date_from)) {
    next.date_from = normalizeDateValue(filters.date_from);
  }

  if (isValidDateInput(filters.date_to)) {
    next.date_to = normalizeDateValue(filters.date_to);
  }

  if (next.date_from && next.date_to && new Date(next.date_from) > new Date(next.date_to)) {
    const from = next.date_from;
    next.date_from = next.date_to;
    next.date_to = from;
  }

  if (typeof filters.amount_min === 'number' && Number.isFinite(filters.amount_min)) {
    next.amount_min = filters.amount_min;
  }

  if (typeof filters.amount_max === 'number' && Number.isFinite(filters.amount_max)) {
    next.amount_max = filters.amount_max;
  }

  if (
    next.amount_min !== undefined &&
    next.amount_max !== undefined &&
    next.amount_min > next.amount_max
  ) {
    const min = next.amount_min;
    next.amount_min = next.amount_max;
    next.amount_max = min;
  }

  if (typeof filters.search === 'string') {
    next.search = filters.search;
  }

  if (typeof filters.is_imported === 'boolean') {
    next.is_imported = filters.is_imported;
  }

  return next;
};

const resolveFilterCategoryIds = async (
  userId: string,
  rawCategory: string,
  type?: 'income' | 'expense'
): Promise<string[]> => {
  const normalizedCategory = rawCategory.trim();
  if (!normalizedCategory) return [];

  // If UI sends UUID, expand it to all categories with same semantic meaning (name + type).
  if (UUID_REGEX.test(normalizedCategory)) {
    const { data: selectedCategory, error: selectedError } = await supabase
      .from('categories')
      .select('id, name, type')
      .eq('id', normalizedCategory)
      .maybeSingle();

    if (selectedError) throw selectedError;
    if (!selectedCategory) return [normalizedCategory];

    let linkedQuery = supabase
      .from('categories')
      .select('id')
      .or(`user_id.eq.${userId},user_id.is.null`)
      .eq('name', selectedCategory.name)
      .eq('type', selectedCategory.type);

    const { data: linkedCategories, error: linkedError } = await linkedQuery;
    if (linkedError) throw linkedError;

    const linkedIds = (linkedCategories || []).map((item) => item.id);
    return linkedIds.length > 0 ? linkedIds : [normalizedCategory];
  }

  let categoriesQuery = supabase
    .from('categories')
    .select('id')
    .or(`user_id.eq.${userId},user_id.is.null`)
    .ilike('name', `%${normalizedCategory}%`);

  if (type) {
    categoriesQuery = categoriesQuery.eq('type', type);
  }

  const { data: matchingCategories, error: categoriesError } = await categoriesQuery;
  if (categoriesError) throw categoriesError;

  return (matchingCategories || []).map((item) => item.id);
};

const resolveCategoryId = async (
  userId: string,
  rawCategoryId: string,
  type: 'income' | 'expense'
): Promise<string> => {
  if (UUID_REGEX.test(rawCategoryId)) {
    return rawCategoryId;
  }

  const categoryName = rawCategoryId.trim();

  const { data: existingRows, error: existingError } = await supabase
    .from('categories')
    .select('id, created_at')
    .eq('user_id', userId)
    .eq('name', categoryName)
    .eq('type', type)
    .order('created_at', { ascending: true })
    .limit(1);

  if (existingError) throw existingError;
  if (existingRows && existingRows.length > 0) return existingRows[0].id;

  const { data: created, error: createError } = await supabase
    .from('categories')
    .insert({
      user_id: userId,
      name: categoryName,
      type,
      color: type === 'income' ? '#10B981' : '#3B82F6',
      icon: 'tag',
    })
    .select('id')
    .single();

  if (createError) throw createError;
  return created.id;
};

const getTransactionEffect = (type: 'income' | 'expense', amount: number): number => {
  return type === 'income' ? amount : -amount;
};

const applyAccountDelta = async (
  userId: string,
  bankAccountId: string,
  delta: number
): Promise<void> => {
  const { data: account, error: accountError } = await supabase
    .from('bank_accounts')
    .select('id, balance')
    .eq('id', bankAccountId)
    .eq('user_id', userId)
    .single();

  if (accountError) throw accountError;

  const currentBalance = Number(account.balance || 0);
  const nextBalance = currentBalance + delta;

  const { error: updateError } = await supabase
    .from('bank_accounts')
    .update({ balance: nextBalance })
    .eq('id', bankAccountId)
    .eq('user_id', userId);

  if (updateError) throw updateError;
};

/**
 * Получить все транзакции пользователя с пагинацией
 */
export const getTransactions = async (
  userId: string,
  filters?: TransactionFilters,
  pagination?: PaginationParams
): Promise<PaginatedResult<Transaction>> => {
  try {
    const normalizedFilters = sanitizeFilters(filters);
    const page = pagination?.page || PAGINATION.DEFAULT_PAGE;
    const limit = pagination?.limit || PAGINATION.DEFAULT_LIMIT;
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    let query = supabase
      .from('transactions')
      .select('*, category:categories(*)', { count: 'exact' })
      .eq('user_id', userId)
      .order('date', { ascending: false });

    // Применение фильтров
    if (normalizedFilters) {
      if (normalizedFilters.type) {
        query = query.eq('type', normalizedFilters.type);
      }
      if (normalizedFilters.category_id) {
        const categoryIds = await resolveFilterCategoryIds(
          userId,
          normalizedFilters.category_id,
          normalizedFilters.type
        );

        if (categoryIds.length === 0) {
          return {
            data: [],
            total: 0,
            page,
            limit,
            hasMore: false,
          };
        }

        query = query.in('category_id', categoryIds);
      }
      if (normalizedFilters.date_from) {
        query = query.gte('date', normalizedFilters.date_from);
      }
      if (normalizedFilters.date_to) {
        query = query.lte('date', normalizedFilters.date_to);
      }
      if (normalizedFilters.amount_min !== undefined) {
        query = query.gte('amount', normalizedFilters.amount_min);
      }
      if (normalizedFilters.amount_max !== undefined) {
        query = query.lte('amount', normalizedFilters.amount_max);
      }
      if (normalizedFilters.search?.trim()) {
        const searchTokens = normalizedFilters.search
          .trim()
          .replace(/[,%()]/g, ' ')
          .split(/\s+/)
          .filter(Boolean);

        if (searchTokens.length > 0) {
          const conditions = searchTokens.flatMap((token) => [
            `description.ilike.%${token}%`,
            `merchant.ilike.%${token}%`,
          ]);
          query = query.or(conditions.join(','));
        }
      }
      if (normalizedFilters.is_imported === true) {
        query = query.eq('is_imported', true);
      } else if (normalizedFilters.is_imported === false) {
        query = query.not('is_imported', 'is', true);
      }
    }

    const { data, error, count } = await query.range(start, end);

    if (error) throw error;

    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
      hasMore: start + limit < (count || 0),
    };
  } catch (error) {
    console.error('Ошибка при получении транзакций:', error);
    throw error;
  }
};

/**
 * Получить транзакцию по ID
 */
export const getTransactionById = async (
  transactionId: string,
  userId: string
): Promise<Transaction | null> => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Ошибка при получении транзакции:', error);
    return null;
  }
};

/**
 * Создать новую транзакцию
 */
export const createTransaction = async (
  userId: string,
  formData: TransactionFormData
): Promise<OperationResult<Transaction>> => {
  try {
    const categoryId = await resolveCategoryId(userId, formData.category_id, formData.type);
    const normalizedAmount =
      typeof formData.amount === 'string' ? parseFloat(formData.amount) : formData.amount;

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        category_id: categoryId,
        bank_account_id: formData.bank_account_id || null,
        amount: normalizedAmount,
        description: formData.description,
        date: formData.date,
        type: formData.type,
        merchant: formData.merchant,
      })
      .select('*, category:categories(*)')
      .single();

    if (error) throw error;

    if (formData.bank_account_id) {
      try {
        await applyAccountDelta(
          userId,
          formData.bank_account_id,
          getTransactionEffect(formData.type, Number(normalizedAmount))
        );
      } catch (balanceError) {
        // Keep data consistency: rollback transaction if account balance update failed.
        await supabase.from('transactions').delete().eq('id', data.id).eq('user_id', userId);
        throw balanceError;
      }
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Ошибка при создании транзакции:', error);
    return {
      success: false,
      error: toErrorMessage(error, 'Не удалось создать транзакцию'),
    };
  }
};

/**
 * Обновить транзакцию
 */
export const updateTransaction = async (
  transactionId: string,
  userId: string,
  formData: Partial<TransactionFormData>
): Promise<OperationResult<Transaction>> => {
  try {
    const previous = await getTransactionById(transactionId, userId);
    if (!previous) {
      return {
        success: false,
        error: 'Транзакция не найдена',
      };
    }

    const updateData: Partial<Transaction> = {};
    
    if (formData.amount !== undefined) {
      updateData.amount = typeof formData.amount === 'string' 
        ? parseFloat(formData.amount) 
        : formData.amount;
    }
    if (formData.category_id) {
      const typeForCategory = formData.type || previous.type;
      updateData.category_id = await resolveCategoryId(userId, formData.category_id, typeForCategory);
    }
    if (formData.bank_account_id !== undefined) {
      updateData.bank_account_id = formData.bank_account_id || null;
    }
    if (formData.description !== undefined) updateData.description = formData.description;
    if (formData.date) updateData.date = formData.date;
    if (formData.type) updateData.type = formData.type;
    if (formData.merchant !== undefined) updateData.merchant = formData.merchant;

    const { data, error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', transactionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    try {
      const previousAccountId = previous.bank_account_id;
      const updatedAccountId = data.bank_account_id;
      const previousEffect = getTransactionEffect(previous.type, Number(previous.amount || 0));
      const updatedEffect = getTransactionEffect(data.type, Number(data.amount || 0));

      if (previousAccountId && updatedAccountId && previousAccountId === updatedAccountId) {
        await applyAccountDelta(userId, updatedAccountId, updatedEffect - previousEffect);
      } else {
        if (previousAccountId) {
          await applyAccountDelta(userId, previousAccountId, -previousEffect);
        }
        if (updatedAccountId) {
          await applyAccountDelta(userId, updatedAccountId, updatedEffect);
        }
      }
    } catch (balanceError) {
      // Compensation update to keep transaction and balance in sync.
      await supabase
        .from('transactions')
        .update({
          category_id: previous.category_id,
          bank_account_id: previous.bank_account_id,
          amount: previous.amount,
          description: previous.description,
          date: previous.date,
          type: previous.type,
          merchant: previous.merchant,
        })
        .eq('id', transactionId)
        .eq('user_id', userId);

      throw balanceError;
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Ошибка при обновлении транзакции:', error);
    return {
      success: false,
      error: toErrorMessage(error, 'Не удалось обновить транзакцию'),
    };
  }
};

/**
 * Удалить транзакцию
 */
export const deleteTransaction = async (
  transactionId: string,
  userId: string
): Promise<OperationResult<void>> => {
  try {
    const previous = await getTransactionById(transactionId, userId);
    if (!previous) {
      return {
        success: false,
        error: 'Транзакция не найдена',
      };
    }

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId)
      .eq('user_id', userId);

    if (error) throw error;

    if (previous.bank_account_id) {
      try {
        const previousEffect = getTransactionEffect(previous.type, Number(previous.amount || 0));
        await applyAccountDelta(userId, previous.bank_account_id, -previousEffect);
      } catch (balanceError) {
        // Compensation insert to restore deleted transaction.
        await supabase.from('transactions').insert({
          id: previous.id,
          user_id: previous.user_id,
          category_id: previous.category_id,
          amount: previous.amount,
          description: previous.description,
          date: previous.date,
          type: previous.type,
          created_at: previous.created_at,
          is_imported: previous.is_imported,
          bank_account_id: previous.bank_account_id,
          merchant: previous.merchant,
          mcc_code: previous.mcc_code,
        });

        throw balanceError;
      }
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Ошибка при удалении транзакции:', error);
    return {
      success: false,
      error: toErrorMessage(error, 'Не удалось удалить транзакцию'),
    };
  }
};

/**
 * Массовое создание транзакций (для импорта из банка)
 */
export const createTransactionsBulk = async (
  userId: string,
  transactions: Array<Omit<TransactionFormData, 'type'> & { type: 'income' | 'expense' }>
): Promise<OperationResult<Transaction[]>> => {
  try {
    if (transactions.length === 0) {
      return {
        success: true,
        data: [],
      };
    }

    const prepared = await Promise.all(
      transactions.map(async (t) => {
        const amount = typeof t.amount === 'string' ? parseFloat(t.amount) : Number(t.amount);
        const categoryId = await resolveCategoryId(userId, t.category_id, t.type);

        return {
          user_id: userId,
          category_id: categoryId,
          amount,
          description: t.description,
          date: t.date,
          type: t.type,
          merchant: t.merchant,
          bank_account_id: t.bank_account_id || null,
          is_imported: true,
        };
      })
    );

    const { data, error } = await supabase
      .from('transactions')
      .insert(prepared)
      .select();

    if (error) throw error;

    // Bank import should not mutate account balance: imported statement operations
    // are historical and account balance is already sourced from bank state.

    return {
      success: true,
      data: data || [],
    };
  } catch (error) {
    console.error('Ошибка при массовом создании транзакций:', error);
    return {
      success: false,
      error: toErrorMessage(error, 'Не удалось импортировать транзакции'),
    };
  }
};

/**
 * Получить статистику по транзакциям
 */
export const getTransactionsSummary = async (
  userId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<{
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  transactionCount: number;
}> => {
  try {
    let query = supabase
      .from('transactions')
      .select('amount, type')
      .eq('user_id', userId);

    if (dateFrom) {
      query = query.gte('date', dateFrom);
    }
    if (dateTo) {
      query = query.lte('date', dateTo);
    }

    const { data, error } = await query;

    if (error) throw error;

    const totalIncome = data
      ?.filter((t: any) => t.type === 'income')
      .reduce((sum: number, t: any) => sum + t.amount, 0) || 0;

    const totalExpenses = data
      ?.filter((t: any) => t.type === 'expense')
      .reduce((sum: number, t: any) => sum + t.amount, 0) || 0;

    return {
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      transactionCount: data?.length || 0,
    };
  } catch (error) {
    console.error('Ошибка при получении статистики:', error);
    return {
      totalIncome: 0,
      totalExpenses: 0,
      balance: 0,
      transactionCount: 0,
    };
  }
};
