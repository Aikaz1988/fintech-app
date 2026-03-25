import { supabase } from '@/lib/supabase';
import { translate } from '@/i18n';
import type {
  OperationResult,
  Subscription,
  SubscriptionAction,
  SubscriptionStatus,
  SubscriptionUsageState,
} from '@/types';

type SubscriptionOverrideRow = {
  user_id: string;
  subscription_id: string;
  status: SubscriptionStatus;
  usage_state: SubscriptionUsageState | null;
  next_charge_date: string | null;
  last_used_at: string | null;
  updated_at: string;
};

export type SubscriptionOverride = {
  subscription_id: string;
  status: SubscriptionStatus;
  usage_state?: SubscriptionUsageState;
  next_charge_date?: string;
  last_used_at?: string | null;
  updated_at?: string;
};

const toErrorMessage = (error: unknown, fallback: string): string => {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return fallback;
};

export const getSubscriptionOverrides = async (
  userId: string
): Promise<OperationResult<SubscriptionOverride[]>> => {
  try {
    const { data, error } = await supabase
      .from('subscription_state_overrides')
      .select('user_id, subscription_id, status, usage_state, next_charge_date, last_used_at, updated_at')
      .eq('user_id', userId);

    if (error) throw error;

    const normalized = (data || []).map((row: SubscriptionOverrideRow) => ({
      subscription_id: row.subscription_id,
      status: row.status,
      usage_state: row.usage_state || undefined,
      next_charge_date: row.next_charge_date || undefined,
      last_used_at: row.last_used_at,
      updated_at: row.updated_at,
    }));

    return {
      success: true,
      data: normalized,
    };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(
        error,
        translate('pages.subscriptions.service.errors.overrideLoadFallback')
      ),
    };
  }
};

export const saveSubscriptionAction = async (
  userId: string,
  subscription: Subscription,
  action: SubscriptionAction
): Promise<OperationResult<void>> => {
  try {
    const eventTimestamp = new Date().toISOString();

    const payload = {
      user_id: userId,
      subscription_id: subscription.id,
      status: subscription.status,
      usage_state: subscription.usage_state,
      next_charge_date: subscription.next_charge_date,
      last_used_at: subscription.last_used_at,
      updated_at: eventTimestamp,
    };

    const { error } = await supabase
      .from('subscription_state_overrides')
      .upsert(payload, {
        onConflict: 'user_id,subscription_id',
      });

    if (error) throw error;

    if (action === 'mark_used') {
      const { error: usageError } = await supabase.from('subscription_usage_marks').insert({
        user_id: userId,
        subscription_id: subscription.id,
        used_at: subscription.last_used_at || eventTimestamp,
        source: 'manual',
      });

      if (usageError) throw usageError;
    }

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(
        error,
        translate('pages.subscriptions.service.errors.saveActionFallback')
      ),
    };
  }
};
