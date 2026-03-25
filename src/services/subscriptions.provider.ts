import type {
  OperationResult,
  Subscription,
  SubscriptionAction,
  SubscriptionInsight,
} from '@/types';

export interface SubscriptionsProvider {
  fetchSubscriptions: (userId: string) => Promise<OperationResult<Subscription[]>>;
  fetchInsights: (userId: string) => Promise<OperationResult<SubscriptionInsight[]>>;
  applyAction: (
    userId: string,
    subscriptionId: string,
    action: SubscriptionAction
  ) => Promise<OperationResult<Subscription>>;
}
