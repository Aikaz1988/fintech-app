import type {
  OperationResult,
  Subscription,
  SubscriptionAction,
  SubscriptionInsight,
} from '@/types';
import type { SubscriptionsProvider } from '@/services/subscriptions.provider';

type TokenState = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
};

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  retryOnUnauthorized?: boolean;
  requiresAuth?: boolean;
  skipAutoRefresh?: boolean;
};

type ExternalApiErrorPayload = {
  code?: string;
  message?: string;
  error?: string;
  details?: unknown;
};

type ExternalApiError = {
  status: number;
  code: string;
  message: string;
  details?: unknown;
  retriable: boolean;
};

const API_BASE_URL = import.meta.env.VITE_SUBSCRIPTIONS_API_BASE_URL || '';
const API_TIMEOUT_MS = Number(import.meta.env.VITE_SUBSCRIPTIONS_API_TIMEOUT_MS || 12000);
const TOKEN_STORAGE_KEY =
  import.meta.env.VITE_SUBSCRIPTIONS_API_TOKEN_STORAGE_KEY || 'fintech.subscriptions.api.tokens';
const INITIAL_ACCESS_TOKEN = import.meta.env.VITE_SUBSCRIPTIONS_API_ACCESS_TOKEN || '';
const INITIAL_REFRESH_TOKEN = import.meta.env.VITE_SUBSCRIPTIONS_API_REFRESH_TOKEN || '';
const API_CLIENT_ID = import.meta.env.VITE_SUBSCRIPTIONS_API_CLIENT_ID || '';
const REFRESH_ENDPOINT = import.meta.env.VITE_SUBSCRIPTIONS_API_REFRESH_ENDPOINT || '/v1/auth/refresh';

const parseNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = Number(value.replace(',', '.').trim());
    if (Number.isFinite(normalized)) {
      return normalized;
    }
  }

  return fallback;
};

const parseDateToIso = (value: unknown, fallback: string): string => {
  if (!value || typeof value !== 'string') {
    return fallback;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? fallback : new Date(timestamp).toISOString();
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

const nowIso = (): string => new Date().toISOString();

const getLocalStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
};

const readStoredTokenState = (): TokenState | null => {
  const storage = getLocalStorage();
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<TokenState>;
    if (!parsed?.accessToken || typeof parsed.accessToken !== 'string') {
      return null;
    }

    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
};

const persistTokenState = (tokenState: TokenState | null): void => {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }

  if (!tokenState) {
    storage.removeItem(TOKEN_STORAGE_KEY);
    return;
  }

  storage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokenState));
};

const hasExpired = (tokenState: TokenState): boolean => {
  if (!tokenState.expiresAt) {
    return false;
  }

  return tokenState.expiresAt <= Date.now() + 10_000;
};

const getTokenState = (): TokenState | null => {
  const fromStorage = readStoredTokenState();
  if (fromStorage) {
    return fromStorage;
  }

  if (INITIAL_ACCESS_TOKEN) {
    const seeded: TokenState = {
      accessToken: INITIAL_ACCESS_TOKEN,
      refreshToken: INITIAL_REFRESH_TOKEN || undefined,
    };
    persistTokenState(seeded);
    return seeded;
  }

  return null;
};

const buildExternalApiError = (
  status: number,
  payload: ExternalApiErrorPayload | null
): ExternalApiError => {
  const fallbackByStatus: Record<number, string> = {
    400: 'Некорректный запрос к API подписок',
    401: 'Требуется повторная авторизация API подписок',
    403: 'Доступ к API подписок запрещен',
    404: 'Данные подписок не найдены',
    409: 'Конфликт состояния подписки',
    429: 'Превышен лимит запросов к API подписок',
    500: 'Внешний API подписок временно недоступен',
    502: 'Шлюз API подписок недоступен',
    503: 'Сервис API подписок перегружен',
    504: 'Внешний API подписок не ответил вовремя',
  };

  const code = payload?.code || `HTTP_${status}`;
  const message =
    payload?.message || payload?.error || fallbackByStatus[status] || 'Ошибка внешнего API подписок';
  const retriable = status >= 500 || status === 429;

  return {
    status,
    code,
    message,
    details: payload?.details,
    retriable,
  };
};

const operationErrorMessage = (error: unknown, fallback: string): string => {
  if (isRecord(error) && typeof error.message === 'string' && error.message.trim()) {
    return error.message;
  }

  return fallback;
};

const requestJson = async <T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> => {
  if (!API_BASE_URL) {
    throw new Error('Не задан VITE_SUBSCRIPTIONS_API_BASE_URL для real API провайдера');
  }

  const requiresAuth = options.requiresAuth !== false;
  let latestTokenState: TokenState | null = null;

  if (requiresAuth) {
    const tokenState = getTokenState();
    if (!tokenState?.accessToken) {
      throw new Error('Не найден access token для API подписок');
    }

    if (!options.skipAutoRefresh && hasExpired(tokenState) && tokenState.refreshToken) {
      await refreshToken(tokenState.refreshToken);
    }

    latestTokenState = getTokenState();
    if (!latestTokenState?.accessToken) {
      throw new Error('Не удалось получить действующий access token для API подписок');
    }
  }

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(requiresAuth && latestTokenState?.accessToken
          ? { Authorization: `Bearer ${latestTokenState.accessToken}` }
          : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: abortController.signal,
    });

    if (
      requiresAuth &&
      response.status === 401 &&
      options.retryOnUnauthorized !== false &&
      latestTokenState?.refreshToken
    ) {
      const refreshed = await refreshToken(latestTokenState.refreshToken);
      if (refreshed.success) {
        return requestJson<T>(path, {
          ...options,
          retryOnUnauthorized: false,
        });
      }
    }

    const rawText = await response.text();
    let payload: unknown = null;
    if (rawText) {
      try {
        payload = JSON.parse(rawText) as unknown;
      } catch {
        payload = { message: rawText };
      }
    }

    if (!response.ok) {
      const errorPayload = isRecord(payload) ? (payload as ExternalApiErrorPayload) : null;
      throw buildExternalApiError(response.status, errorPayload);
    }

    return payload as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Превышено время ожидания ответа внешнего API подписок');
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

const normalizeTokenResponse = (payload: unknown): TokenState | null => {
  if (!isRecord(payload)) {
    return null;
  }

  const accessToken =
    (typeof payload.access_token === 'string' && payload.access_token) ||
    (typeof payload.accessToken === 'string' && payload.accessToken) ||
    '';

  if (!accessToken) {
    return null;
  }

  const expiresInSeconds = parseNumber(payload.expires_in ?? payload.expiresIn, 0);
  const expiresAt = expiresInSeconds > 0 ? Date.now() + expiresInSeconds * 1000 : undefined;

  const refreshToken =
    (typeof payload.refresh_token === 'string' && payload.refresh_token) ||
    (typeof payload.refreshToken === 'string' && payload.refreshToken) ||
    undefined;

  return {
    accessToken,
    refreshToken,
    expiresAt,
  };
};

const refreshToken = async (
  refreshTokenValue: string
): Promise<OperationResult<TokenState>> => {
  try {
    const payload = await requestJson<unknown>(REFRESH_ENDPOINT, {
      method: 'POST',
      body: {
        refresh_token: refreshTokenValue,
        client_id: API_CLIENT_ID || undefined,
      },
      retryOnUnauthorized: false,
      requiresAuth: false,
      skipAutoRefresh: true,
    });

    const nextTokenState = normalizeTokenResponse(payload);
    if (!nextTokenState) {
      return {
        success: false,
        error: 'Внешний API вернул некорректный формат refresh token ответа',
      };
    }

    persistTokenState(nextTokenState);

    return {
      success: true,
      data: nextTokenState,
    };
  } catch (error) {
    return {
      success: false,
      error: operationErrorMessage(error, 'Не удалось обновить access token API подписок'),
    };
  }
};

const toSubscriptionStatus = (value: unknown): Subscription['status'] => {
  const normalized = typeof value === 'string' ? value.toLowerCase() : '';

  if (normalized === 'paused') return 'paused';
  if (normalized === 'cancelled' || normalized === 'canceled') return 'cancelled';
  return 'active';
};

const toUsageState = (value: unknown): Subscription['usage_state'] => {
  const normalized = typeof value === 'string' ? value.toLowerCase() : '';

  if (normalized === 'unused' || normalized === 'inactive') return 'unused';
  if (normalized === 'rarely_used' || normalized === 'rarely-used' || normalized === 'low') {
    return 'rarely_used';
  }
  return 'active';
};

const toBillingPeriod = (value: unknown): Subscription['billing_period'] => {
  const normalized = typeof value === 'string' ? value.toLowerCase() : '';
  return normalized === 'yearly' || normalized === 'annual' ? 'yearly' : 'monthly';
};

const toCategory = (value: unknown): Subscription['category'] => {
  const normalized = typeof value === 'string' ? value.toLowerCase() : '';
  const allowed: Subscription['category'][] = ['video', 'music', 'education', 'cloud', 'gaming', 'other'];
  return allowed.includes(normalized as Subscription['category'])
    ? (normalized as Subscription['category'])
    : 'other';
};

const normalizeSubscription = (item: unknown, userId: string): Subscription => {
  const raw = isRecord(item) ? item : {};
  const createdAt = parseDateToIso(raw.created_at ?? raw.createdAt, nowIso());
  const updatedAt = parseDateToIso(raw.updated_at ?? raw.updatedAt, createdAt);

  return {
    id:
      (typeof raw.id === 'string' && raw.id) ||
      (typeof raw.subscription_id === 'string' && raw.subscription_id) ||
      `${userId}_external_${Math.random().toString(36).slice(2, 9)}`,
    user_id: userId,
    service_name:
      (typeof raw.service_name === 'string' && raw.service_name) ||
      (typeof raw.serviceName === 'string' && raw.serviceName) ||
      (typeof raw.name === 'string' && raw.name) ||
      'Неизвестный сервис',
    category: toCategory(raw.category),
    price: parseNumber(raw.price ?? raw.amount ?? raw.monthly_price, 0),
    currency:
      (typeof raw.currency === 'string' && raw.currency.toUpperCase()) ||
      (typeof raw.currency_code === 'string' && raw.currency_code.toUpperCase()) ||
      'RUB',
    billing_period: toBillingPeriod(raw.billing_period ?? raw.billingPeriod ?? raw.period),
    next_charge_date: parseDateToIso(raw.next_charge_date ?? raw.nextChargeDate, nowIso()),
    last_used_at: raw.last_used_at || raw.lastUsedAt ? parseDateToIso(raw.last_used_at ?? raw.lastUsedAt, nowIso()) : null,
    status: toSubscriptionStatus(raw.status),
    usage_state: toUsageState(raw.usage_state ?? raw.usageState),
    provider:
      (typeof raw.provider === 'string' && raw.provider) ||
      (typeof raw.source === 'string' && raw.source) ||
      'external-api',
    cancel_url:
      (typeof raw.cancel_url === 'string' && raw.cancel_url) ||
      (typeof raw.cancelUrl === 'string' && raw.cancelUrl) ||
      null,
    created_at: createdAt,
    updated_at: updatedAt,
  };
};

const normalizeSubscriptionsResponse = (payload: unknown, userId: string): Subscription[] => {
  if (Array.isArray(payload)) {
    return payload.map((item) => normalizeSubscription(item, userId));
  }

  if (!isRecord(payload)) {
    return [];
  }

  const listCandidate = payload.data ?? payload.subscriptions ?? payload.items;
  if (!Array.isArray(listCandidate)) {
    return [];
  }

  return listCandidate.map((item) => normalizeSubscription(item, userId));
};

const normalizeInsightsResponse = (payload: unknown): SubscriptionInsight[] => {
  const items = Array.isArray(payload)
    ? payload
    : isRecord(payload)
      ? payload.data ?? payload.insights ?? payload.items
      : [];

  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item, index) => {
    const raw = isRecord(item) ? item : {};
    const typeRaw = typeof raw.type === 'string' ? raw.type : 'unused_subscription';
    const type: SubscriptionInsight['type'] =
      typeRaw === 'duplicate_category' || typeRaw === 'high_price' || typeRaw === 'unused_subscription'
        ? typeRaw
        : 'unused_subscription';

    const severityRaw = typeof raw.severity === 'string' ? raw.severity : 'medium';
    const severity: SubscriptionInsight['severity'] =
      severityRaw === 'low' || severityRaw === 'medium' || severityRaw === 'high'
        ? severityRaw
        : 'medium';

    return {
      id:
        (typeof raw.id === 'string' && raw.id) ||
        `api_insight_${index}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      title:
        (typeof raw.title === 'string' && raw.title) ||
        (typeof raw.name === 'string' && raw.name) ||
        'Рекомендация по подписке',
      description:
        (typeof raw.description === 'string' && raw.description) ||
        (typeof raw.message === 'string' && raw.message) ||
        'Проверьте подписку и регулярные списания.',
      severity,
      potential_monthly_savings: parseNumber(
        raw.potential_monthly_savings ?? raw.potentialSavings ?? raw.savings,
        0
      ),
      subscription_ids: Array.isArray(raw.subscription_ids)
        ? raw.subscription_ids.filter((itemValue): itemValue is string => typeof itemValue === 'string')
        : [],
    };
  });
};

const mapExternalErrorToOperation = <T>(
  error: unknown,
  fallbackMessage: string
): OperationResult<T> => {
  if (
    isRecord(error) &&
    typeof error.status === 'number' &&
    typeof error.code === 'string' &&
    typeof error.message === 'string'
  ) {
    const apiError = error as ExternalApiError;
    return {
      success: false,
      error: `[${apiError.code}] ${apiError.message}`,
    };
  }

  return {
    success: false,
    error: operationErrorMessage(error, fallbackMessage),
  };
};

export const setSubscriptionsApiTokens = (tokenState: TokenState | null): void => {
  persistTokenState(tokenState);
};

export const clearSubscriptionsApiTokens = (): void => {
  persistTokenState(null);
};

export const subscriptionsApiProvider: SubscriptionsProvider = {
  fetchSubscriptions: async (userId: string): Promise<OperationResult<Subscription[]>> => {
    try {
      const payload = await requestJson<unknown>(`/v1/subscriptions?user_id=${encodeURIComponent(userId)}`);
      const subscriptions = normalizeSubscriptionsResponse(payload, userId);

      return {
        success: true,
        data: subscriptions,
      };
    } catch (error) {
      return mapExternalErrorToOperation<Subscription[]>(
        error,
        'Не удалось загрузить подписки из внешнего API'
      );
    }
  },

  fetchInsights: async (userId: string): Promise<OperationResult<SubscriptionInsight[]>> => {
    try {
      const payload = await requestJson<unknown>(
        `/v1/subscriptions/insights?user_id=${encodeURIComponent(userId)}`
      );

      return {
        success: true,
        data: normalizeInsightsResponse(payload),
      };
    } catch (error) {
      return mapExternalErrorToOperation<SubscriptionInsight[]>(
        error,
        'Не удалось загрузить инсайты по подпискам из внешнего API'
      );
    }
  },

  applyAction: async (
    userId: string,
    subscriptionId: string,
    action: SubscriptionAction
  ): Promise<OperationResult<Subscription>> => {
    try {
      const payload = await requestJson<unknown>(
        `/v1/subscriptions/${encodeURIComponent(subscriptionId)}/actions`,
        {
          method: 'POST',
          body: {
            user_id: userId,
            action,
            source: 'fintech-app',
          },
        }
      );

      const normalizedList = normalizeSubscriptionsResponse(payload, userId);
      const normalized =
        normalizedList[0] ||
        normalizeSubscription(isRecord(payload) ? payload.data ?? payload : payload, userId);

      return {
        success: true,
        data: {
          ...normalized,
          id: normalized.id || subscriptionId,
        },
      };
    } catch (error) {
      return mapExternalErrorToOperation<Subscription>(
        error,
        'Не удалось выполнить действие по подписке через внешний API'
      );
    }
  },
};
