import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type {
  Subscription,
  SubscriptionAction,
  SubscriptionInsight,
  SubscriptionsSummary,
} from '@/types';
import {
  applySubscriptionAction,
  getSubscriptionInsights,
  getSubscriptions,
} from '@/services/subscriptions.service';

interface UseSubscriptionsReturn {
  subscriptions: Subscription[];
  insights: SubscriptionInsight[];
  summary: SubscriptionsSummary;
  loading: boolean;
  actionLoadingId: string | null;
  error: string | null;
  refresh: () => Promise<void>;
  runAction: (subscriptionId: string, action: SubscriptionAction) => Promise<boolean>;
}

const EMPTY_SUMMARY: SubscriptionsSummary = {
  active_count: 0,
  paused_count: 0,
  monthly_total: 0,
  yearly_total: 0,
  projected_annual_spend: 0,
  potential_monthly_savings: 0,
};

const roundAmount = (value: number): number => {
  return Math.round(value * 100) / 100;
};

export const useSubscriptions = (): UseSubscriptionsReturn => {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [insights, setInsights] = useState<SubscriptionInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) {
      setSubscriptions([]);
      setInsights([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [subscriptionsResult, insightsResult] = await Promise.all([
        getSubscriptions(user.id),
        getSubscriptionInsights(user.id),
      ]);

      if (!subscriptionsResult.success) {
        setError(subscriptionsResult.error || 'Не удалось загрузить подписки');
        setSubscriptions([]);
        setInsights([]);
        return;
      }

      setSubscriptions(subscriptionsResult.data || []);

      if (!insightsResult.success) {
        setInsights([]);
      } else {
        setInsights(insightsResult.data || []);
      }
    } catch (err) {
      console.error(err);
      setError('Не удалось загрузить данные по подпискам');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const runAction = useCallback(
    async (subscriptionId: string, action: SubscriptionAction): Promise<boolean> => {
      if (!user) {
        setError('Пользователь не авторизован');
        return false;
      }

      try {
        setActionLoadingId(subscriptionId);
        setError(null);

        const actionResult = await applySubscriptionAction(user.id, subscriptionId, action);

        if (!actionResult.success) {
          setError(actionResult.error || 'Не удалось выполнить операцию');
          return false;
        }

        await loadData();
        return true;
      } catch (err) {
        console.error(err);
        setError('Ошибка выполнения операции по подписке');
        return false;
      } finally {
        setActionLoadingId(null);
      }
    },
    [loadData, user]
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const summary = useMemo<SubscriptionsSummary>(() => {
    if (!subscriptions.length) {
      return EMPTY_SUMMARY;
    }

    const active = subscriptions.filter((subscription) => subscription.status === 'active');
    const paused = subscriptions.filter((subscription) => subscription.status === 'paused');

    const monthlyTotal = active
      .filter((subscription) => subscription.billing_period === 'monthly')
      .reduce((sum, subscription) => sum + subscription.price, 0);

    const yearlyTotal = active
      .filter((subscription) => subscription.billing_period === 'yearly')
      .reduce((sum, subscription) => sum + subscription.price, 0);

    const projectedAnnualSpend = monthlyTotal * 12 + yearlyTotal;
    const potentialSavings = insights.reduce(
      (sum, insight) => sum + insight.potential_monthly_savings,
      0
    );

    return {
      active_count: active.length,
      paused_count: paused.length,
      monthly_total: roundAmount(monthlyTotal),
      yearly_total: roundAmount(yearlyTotal),
      projected_annual_spend: roundAmount(projectedAnnualSpend),
      potential_monthly_savings: roundAmount(potentialSavings),
    };
  }, [insights, subscriptions]);

  return {
    subscriptions,
    insights,
    summary,
    loading,
    actionLoadingId,
    error,
    refresh: loadData,
    runAction,
  };
};
