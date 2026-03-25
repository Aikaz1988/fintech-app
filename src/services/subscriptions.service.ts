import type {
  OperationResult,
  Subscription,
  SubscriptionAction,
  SubscriptionInsight,
} from '@/types';
import type { SubscriptionsProvider } from '@/services/subscriptions.provider';
import { subscriptionsApiProvider } from '@/services/subscriptions.api.provider';
import { subscriptionsMockProvider } from '@/services/subscriptions.mock.provider';

const providerType = (import.meta.env.VITE_SUBSCRIPTIONS_PROVIDER || 'mock').toLowerCase();

const subscriptionsProvider: SubscriptionsProvider =
  providerType === 'api' ? subscriptionsApiProvider : subscriptionsMockProvider;

export const getSubscriptions = async (
  userId: string
): Promise<OperationResult<Subscription[]>> => {
  return subscriptionsProvider.fetchSubscriptions(userId);
};

export const getSubscriptionInsights = async (
  userId: string
): Promise<OperationResult<SubscriptionInsight[]>> => {
  return subscriptionsProvider.fetchInsights(userId);
};

export const applySubscriptionAction = async (
  userId: string,
  subscriptionId: string,
  action: SubscriptionAction
): Promise<OperationResult<Subscription>> => {
  return subscriptionsProvider.applyAction(userId, subscriptionId, action);
};
