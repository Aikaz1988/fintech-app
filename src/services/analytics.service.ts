import { supabase } from '@/lib/supabase';
import type {
  SummaryStats,
  CategoryStats,
  MonthlyData,
  Recommendation,
} from '@/types';

type CategoryStatsPeriod = 'day' | 'month' | 'year';

const toIsoDate = (date: Date): string => date.toISOString().split('T')[0];

const getPeriodRange = (period: CategoryStatsPeriod): { from: string; to: string } => {
  const now = new Date();

  if (period === 'day') {
    return {
      from: toIsoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate())),
      to: toIsoDate(now),
    };
  }

  if (period === 'year') {
    return {
      from: toIsoDate(new Date(now.getFullYear(), 0, 1)),
      to: toIsoDate(now),
    };
  }

  return {
    from: toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: toIsoDate(now),
  };
};

/**
 * Получить сводную статистику
 */
export const getSummaryStats = async (
  userId: string,
  month?: string
): Promise<SummaryStats> => {
  try {
    let query = supabase
      .from('transactions')
      .select('amount, type')
      .eq('user_id', userId);

    if (month) {
      query = query.eq('month', month);
    }

    const { data, error } = await query;

    if (error) throw error;

    const totalIncome = data
      ?.filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    const totalExpenses = data
      ?.filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    const balance = totalIncome - totalExpenses;
    const savings = totalIncome > 0 ? totalIncome - totalExpenses : 0;
    const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

    return {
      totalIncome,
      totalExpenses,
      balance,
      savings,
      savingsRate,
    };
  } catch (error) {
    console.error('Ошибка при получении статистики:', error);
    return {
      totalIncome: 0,
      totalExpenses: 0,
      balance: 0,
      savings: 0,
      savingsRate: 0,
    };
  }
};

/**
 * Получить статистику по категориям
 */
export const getCategoryStats = async (
  userId: string,
  type?: 'income' | 'expense',
  options?: {
    month?: string;
    period?: CategoryStatsPeriod;
  }
): Promise<CategoryStats[]> => {
  try {
    let query = supabase
      .from('transactions')
      .select(`
        amount,
        category_id,
        categories (
          id,
          name,
          color,
          icon,
          type
        )
      `)
      .eq('user_id', userId);
    
    if (type) {
      query = query.eq('type', type);
    }

    if (options?.month) {
      const monthFrom = `${options.month}-01`;
      const [year, month] = options.month.split('-').map(Number);
      const monthToDate = new Date(year, month, 0);
      query = query.gte('date', monthFrom).lte('date', toIsoDate(monthToDate));
    } else {
      const period = options?.period || 'month';
      const range = getPeriodRange(period);
      query = query.gte('date', range.from).lte('date', range.to);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Группировка по категориям
    const categoryMap = new Map<string, CategoryStats>();
    let total = 0;

    data?.forEach((transaction) => {
      const categoryId = transaction.category_id;
      const category = transaction.categories as any;
      const amount = Number(transaction.amount);
      total += amount;

      if (!categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, {
          category: {
            id: category.id,
            name: category.name,
            color: category.color,
            icon: category.icon,
            type: category.type,
            user_id: null,
            created_at: '',
          },
          category_id: category.id,
          category_name: category.name,
          amount: 0,
          percentage: 0,
          count: 0,
        });
      }

      const stats = categoryMap.get(categoryId)!;
      stats.amount += amount;
      stats.count += 1;
    });

    // Расчет процентов
    categoryMap.forEach((stats) => {
      stats.percentage = total > 0 ? (stats.amount / total) * 100 : 0;
    });

    return Array.from(categoryMap.values()).sort((a, b) => b.amount - a.amount);
  } catch (error) {
    console.error('Ошибка при получении статистики категорий:', error);
    return [];
  }
};

/**
 * Получить данные для графика по месяцам
 */
export const getMonthlyTrend = async (
  userId: string,
  monthsCount: number = 6
): Promise<MonthlyData[]> => {
  try {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - monthsCount + 1, 1);

    const { data, error } = await supabase
      .from('transactions')
      .select('amount, type, date')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString().split('T')[0]);

    if (error) throw error;

    const monthMap = new Map<string, { income: number; expenses: number }>();

    for (let i = monthsCount - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(key, { income: 0, expenses: 0 });
    }

    data?.forEach((transaction) => {
      const date = new Date(transaction.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthData = monthMap.get(key);
      
      if (monthData) {
        const amount = Number(transaction.amount);
        if (transaction.type === 'income') {
          monthData.income += amount;
        } else {
          monthData.expenses += amount;
        }
      }
    });

    return Array.from(monthMap.entries()).map(([month, data]) => ({
      month,
      income: data.income,
      expenses: data.expenses,
      profit: data.income - data.expenses,
    }));
  } catch (error) {
    console.error('Ошибка при получении тренда по месяцам:', error);
    return [];
  }
};

/**
 * Получить рекомендации для пользователя
 */
export const getRecommendations = async (
  userId: string,
  unreadOnly: boolean = false
): Promise<Recommendation[]> => {
  try {
    let query = supabase
      .from('recommendations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Ошибка при получении рекомендаций:', error);
    return [];
  }
};

/**
 * Отметить рекомендацию как прочитанную
 */
export const markRecommendationAsRead = async (
  recommendationId: string,
  userId: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('recommendations')
      .update({ is_read: true })
      .eq('id', recommendationId)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Ошибка при отметке рекомендации:', error);
    return false;
  }
};

/**
 * Отметить все рекомендации как прочитанные
 */
export const markAllRecommendationsAsRead = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('recommendations')
      .update({ is_read: true })
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Ошибка при отметке всех рекомендаций:', error);
    return false;
  }
};

/**
 * Создать рекомендацию
 */
export const createRecommendation = async (
  userId: string,
  text: string,
  category?: string,
  priority: 'low' | 'medium' | 'high' = 'medium'
): Promise<Recommendation | null> => {
  try {
    const { data, error } = await supabase
      .from('recommendations')
      .insert({
        user_id: userId,
        recommendation_text: text,
        category,
        priority,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Ошибка при создании рекомендации:', error);
    return null;
  }
};