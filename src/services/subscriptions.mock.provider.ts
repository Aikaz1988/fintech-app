import type {
  OperationResult,
  Subscription,
  SubscriptionAction,
  SubscriptionInsight,
} from '@/types';
import type { SubscriptionsProvider } from '@/services/subscriptions.provider';
import { translate } from '@/i18n';
import {
  getSubscriptionOverrides,
  saveSubscriptionAction,
} from '@/services/subscriptions.persistence.service';

const MOCK_LATENCY_MS = 600;
const userSubscriptionsStore = new Map<string, Subscription[]>();

const wait = async (ms: number) => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const isoDateShift = (daysFromNow: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString();
};

const makeSeedSubscriptions = (userId: string): Subscription[] => {
  const createdAt = new Date().toISOString();

  return [
    {
      id: `${userId}_sub_1`,
      user_id: userId,
      service_name: 'Яндекс Плюс',
      category: 'music',
      price: 399,
      currency: 'RUB',
      billing_period: 'monthly',
      next_charge_date: isoDateShift(4),
      last_used_at: isoDateShift(-3),
      status: 'active',
      usage_state: 'active',
      provider: 'yandex',
      cancel_url: 'https://plus.yandex.ru/',
      created_at: createdAt,
      updated_at: createdAt,
    },
    {
      id: `${userId}_sub_2`,
      user_id: userId,
      service_name: 'Кинопоиск + Амедиатека',
      category: 'video',
      price: 799,
      currency: 'RUB',
      billing_period: 'monthly',
      next_charge_date: isoDateShift(6),
      last_used_at: isoDateShift(-21),
      status: 'active',
      usage_state: 'rarely_used',
      provider: 'kinopoisk',
      cancel_url: 'https://hd.kinopoisk.ru/',
      created_at: createdAt,
      updated_at: createdAt,
    },
    {
      id: `${userId}_sub_3`,
      user_id: userId,
      service_name: 'Okko Премиум',
      category: 'video',
      price: 599,
      currency: 'RUB',
      billing_period: 'monthly',
      next_charge_date: isoDateShift(2),
      last_used_at: isoDateShift(-93),
      status: 'active',
      usage_state: 'unused',
      provider: 'okko',
      cancel_url: 'https://okko.tv/',
      created_at: createdAt,
      updated_at: createdAt,
    },
    {
      id: `${userId}_sub_4`,
      user_id: userId,
      service_name: 'VK Музыка',
      category: 'music',
      price: 229,
      currency: 'RUB',
      billing_period: 'monthly',
      next_charge_date: isoDateShift(9),
      last_used_at: isoDateShift(-5),
      status: 'active',
      usage_state: 'active',
      provider: 'vk',
      cancel_url: 'https://vk.com/vkmusic',
      created_at: createdAt,
      updated_at: createdAt,
    },
    {
      id: `${userId}_sub_5`,
      user_id: userId,
      service_name: 'Яндекс 360 Премиум',
      category: 'cloud',
      price: 299,
      currency: 'RUB',
      billing_period: 'monthly',
      next_charge_date: isoDateShift(11),
      last_used_at: isoDateShift(-44),
      status: 'active',
      usage_state: 'rarely_used',
      provider: 'yandex',
      cancel_url: 'https://360.yandex.ru/',
      created_at: createdAt,
      updated_at: createdAt,
    },
    {
      id: `${userId}_sub_6`,
      user_id: userId,
      service_name: 'Skillbox Английский',
      category: 'education',
      price: 1490,
      currency: 'RUB',
      billing_period: 'monthly',
      next_charge_date: isoDateShift(14),
      last_used_at: isoDateShift(-61),
      status: 'paused',
      usage_state: 'unused',
      provider: 'skillbox',
      cancel_url: 'https://skillbox.ru/',
      created_at: createdAt,
      updated_at: createdAt,
    },
    {
      id: `${userId}_sub_7`,
      user_id: userId,
      service_name: 'Wink Премиум',
      category: 'video',
      price: 8990,
      currency: 'RUB',
      billing_period: 'yearly',
      next_charge_date: isoDateShift(27),
      last_used_at: isoDateShift(-16),
      status: 'active',
      usage_state: 'active',
      provider: 'wink',
      cancel_url: 'https://wink.ru/',
      created_at: createdAt,
      updated_at: createdAt,
    },
  ];
};

const ensureUserSubscriptions = (userId: string): Subscription[] => {
  const existing = userSubscriptionsStore.get(userId);
  if (existing) {
    return existing;
  }

  const seeded = makeSeedSubscriptions(userId);
  userSubscriptionsStore.set(userId, seeded);
  return seeded;
};

const applyOverrides = (
  subscriptions: Subscription[],
  overrides: Array<{
    subscription_id: string;
    status: Subscription['status'];
    usage_state?: Subscription['usage_state'];
    next_charge_date?: string;
    last_used_at?: string | null;
    updated_at?: string;
  }>
): Subscription[] => {
  const overridesMap = new Map(overrides.map((item) => [item.subscription_id, item]));

  return subscriptions.map((subscription) => {
    const override = overridesMap.get(subscription.id);
    if (!override) {
      return subscription;
    }

    return {
      ...subscription,
      status: override.status,
      usage_state: override.usage_state || subscription.usage_state,
      next_charge_date: override.next_charge_date || subscription.next_charge_date,
      last_used_at:
        override.last_used_at === undefined ? subscription.last_used_at : override.last_used_at,
      updated_at: override.updated_at || subscription.updated_at,
    };
  });
};

const getDaysSinceDate = (dateValue: string | null): number => {
  if (!dateValue) return 999;
  const usedAt = new Date(dateValue).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - usedAt) / (1000 * 60 * 60 * 24)));
};

const buildInsights = (subscriptions: Subscription[]): SubscriptionInsight[] => {
  const active = subscriptions.filter((subscription) => subscription.status === 'active');
  const insights: SubscriptionInsight[] = [];

  active.forEach((subscription) => {
    const daysSinceUse = getDaysSinceDate(subscription.last_used_at);
    const isUnused = subscription.usage_state === 'unused' || daysSinceUse >= 45;

    if (isUnused) {
      const monthlySavings =
        subscription.billing_period === 'monthly'
          ? subscription.price
          : Math.round(subscription.price / 12);

      insights.push({
        id: `${subscription.id}_unused`,
        type: 'unused_subscription',
        title: `${translate('pages.subscriptions.service.insights.unusedTitlePrefix')} «${subscription.service_name}» ${translate('pages.subscriptions.service.insights.unusedTitleSuffix')}`,
        description: `${translate('pages.subscriptions.service.insights.unusedDescriptionPrefix')} ${daysSinceUse} ${translate('pages.subscriptions.service.insights.unusedDescriptionSuffix')}`,
        severity: 'high',
        potential_monthly_savings: monthlySavings,
        subscription_ids: [subscription.id],
      });
    }

    if (subscription.billing_period === 'monthly' && subscription.price >= 1000) {
      insights.push({
        id: `${subscription.id}_high_price`,
        type: 'high_price',
        title: `${translate('pages.subscriptions.service.insights.highPriceTitlePrefix')} «${subscription.service_name}»`,
        description: translate('pages.subscriptions.service.insights.highPriceDescription'),
        severity: 'medium',
        potential_monthly_savings: Math.round(subscription.price * 0.2),
        subscription_ids: [subscription.id],
      });
    }
  });

  const duplicateCategories: Array<'video' | 'music'> = ['video', 'music'];
  duplicateCategories.forEach((category) => {
    const categorySubscriptions = active.filter(
      (subscription) => subscription.category === category && subscription.billing_period === 'monthly'
    );

    if (categorySubscriptions.length > 1) {
      const cheapest = categorySubscriptions.reduce((prev, curr) =>
        curr.price < prev.price ? curr : prev
      );

      const categoryLabel =
        category === 'video'
          ? translate('pages.subscriptions.service.insights.duplicateVideo')
          : translate('pages.subscriptions.service.insights.duplicateMusic');

      insights.push({
        id: `duplicate_${category}`,
        type: 'duplicate_category',
        title: `${translate('pages.subscriptions.service.insights.duplicateTitlePrefix')} ${categoryLabel}`,
        description: `${translate('pages.subscriptions.service.insights.duplicateDescriptionPrefix')} ${categorySubscriptions.length} ${translate('pages.subscriptions.service.insights.duplicateDescriptionMiddle')}`,
        severity: 'medium',
        potential_monthly_savings: cheapest.price,
        subscription_ids: categorySubscriptions.map((subscription) => subscription.id),
      });
    }
  });

  return insights.sort((a, b) => b.potential_monthly_savings - a.potential_monthly_savings);
};

export const subscriptionsMockProvider: SubscriptionsProvider = {
  fetchSubscriptions: async (userId: string): Promise<OperationResult<Subscription[]>> => {
    await wait(MOCK_LATENCY_MS);

    const subscriptions = ensureUserSubscriptions(userId);
    const overridesResult = await getSubscriptionOverrides(userId);

    if (!overridesResult.success) {
      return {
        success: false,
        error: overridesResult.error,
      };
    }

    const mergedSubscriptions = applyOverrides(subscriptions, overridesResult.data || []);

    return {
      success: true,
      data: mergedSubscriptions.map((subscription) => ({ ...subscription })),
    };
  },

  fetchInsights: async (userId: string): Promise<OperationResult<SubscriptionInsight[]>> => {
    await wait(MOCK_LATENCY_MS / 2);

    const subscriptions = ensureUserSubscriptions(userId);
    const overridesResult = await getSubscriptionOverrides(userId);

    if (!overridesResult.success) {
      return {
        success: false,
        error: overridesResult.error,
      };
    }

    const mergedSubscriptions = applyOverrides(subscriptions, overridesResult.data || []);

    return {
      success: true,
      data: buildInsights(mergedSubscriptions),
    };
  },

  applyAction: async (
    userId: string,
    subscriptionId: string,
    action: SubscriptionAction
  ): Promise<OperationResult<Subscription>> => {
    await wait(MOCK_LATENCY_MS / 2);

    const subscriptions = ensureUserSubscriptions(userId);
    const target = subscriptions.find((subscription) => subscription.id === subscriptionId);

    if (!target) {
      return {
        success: false,
        error: translate('pages.subscriptions.service.errors.notFound'),
      };
    }

    if (action === 'pause' && target.status !== 'active') {
      return {
        success: false,
        error: translate('pages.subscriptions.service.errors.pauseOnlyActive'),
      };
    }

    if (action === 'resume' && target.status !== 'paused') {
      return {
        success: false,
        error: translate('pages.subscriptions.service.errors.resumeOnlyPaused'),
      };
    }

    if (action === 'cancel' && target.status === 'cancelled') {
      return {
        success: false,
        error: translate('pages.subscriptions.service.errors.alreadyCancelled'),
      };
    }

    if (action === 'mark_used' && target.status === 'cancelled') {
      return {
        success: false,
        error: translate('pages.subscriptions.service.errors.markUsedCancelled'),
      };
    }

    if (action === 'pause') {
      target.status = 'paused';
    }

    if (action === 'resume') {
      target.status = 'active';
    }

    if (action === 'cancel') {
      target.status = 'cancelled';
      target.next_charge_date = new Date().toISOString();
    }

    if (action === 'mark_used') {
      target.last_used_at = new Date().toISOString();
      target.usage_state = 'active';
    }

    target.updated_at = new Date().toISOString();

    const persistResult = await saveSubscriptionAction(userId, target, action);

    if (!persistResult.success) {
      return {
        success: false,
        error: persistResult.error,
      };
    }

    userSubscriptionsStore.set(userId, subscriptions);

    return {
      success: true,
      data: { ...target },
    };
  },
};
