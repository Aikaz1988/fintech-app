import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type AppLanguage = 'ru' | 'en';
export const APP_LANGUAGE_KEY = 'app_language';

const ru = {
  common: {
    actions: {
      cancel: 'Отмена',
      save: 'Сохранить',
      saving: 'Сохранение...',
      viewAll: 'Посмотреть все операции',
      show: 'Показать фильтры',
      hide: 'Скрыть фильтры',
    },
  },
  nav: {
    home: 'Главная',
    transactions: 'Транзакции',
    subscriptions: 'Подписки',
    budgets: 'Бюджеты',
    analytics: 'Аналитика',
    reports: 'Отчеты',
    goals: 'Цели',
    banks: 'Банки',
    userFallback: 'Пользователь',
    account: 'Аккаунт',
    profile: 'Профиль',
    settings: 'Настройки',
    logout: 'Выход',
    version: 'Версия 1.0.0',
  },
  pages: {
    settings: {
      title: 'Настройки и локализация',
      subtitle: 'Адаптация под особенности финансовых систем вашей страны',
      regionalTitle: 'Региональные параметры',
      languageTitle: 'Язык интерфейса',
      languageSubtitle: 'Простой интерфейс для адаптации новичков',
      languageRu: 'Русский',
      languageEn: 'English',
      taxTitle: 'Налоговый режим',
      taxSubtitle: 'Для автоматического расчета отчислений',
      bankTitle: 'Банковские стандарты (Синхронизация)',
      bankTinkoffTitle: 'Тинькофф Банк (Открытое API)',
      bankTinkoffSubtitle: 'Автоматическая загрузка чеков и операций',
      bankBinanceTitle: 'Синхронизация с Binance',
      bankBinanceSubtitle: 'Обновление баланса крипто-кошелька в реальном времени',
      connectNewBank: 'Подключить новый банк',
    },
    dashboard: {
      title: 'Главная',
      addAccount: 'Добавить счет',
      newTransaction: 'Новая операция',
      accountsTitle: 'Мои счета (Мультивалютность)',
      noAccounts: 'Счета пока не добавлены',
      defaultBankAccount: 'Банковский счет',
      totalBalance: 'Общий баланс',
      income: 'Доходы',
      expenses: 'Расходы',
      recentTransactions: 'Последние транзакции',
      noTransactions: 'Операций пока нет',
      defaultOperation: 'Операция',
      incomeLabel: 'Доход',
      expenseLabel: 'Расход',
      addBankAccountDialogTitle: 'Добавить банковский счет',
      accountNameLabel: 'Название счета',
      bankLabel: 'Банк',
      accountNumberLabel: 'Номер счета (20 цифр)',
      initialBalanceLabel: 'Начальный баланс',
      currencyLabel: 'Валюта',
      accountCreateError: 'Не удалось создать счет',
      transactionCreateError: 'Не удалось создать операцию',
    },
    transactions: {
      title: 'История транзакций',
      subtitle: 'Управляйте вашими доходами, расходами и переводами',
      categories: 'Категории',
      newTransaction: 'Новая операция',
      advancedFilters: 'Расширенные фильтры',
      activeFilters: 'Активных фильтров',
      filtersHint: 'При желании вы можете воспользоваться расширенными фильтрами. Нажмите «Показать фильтры», чтобы изменить условия поиска.',
      categoriesLoading: 'Загрузка категорий...',
      allOperations: 'Все операции',
      income: 'Доходы',
      expenses: 'Расходы',
      operationSaveError: 'Ошибка сохранения операции',
      categoryCreateError: 'Ошибка создания категории',
      categoryUpdateError: 'Ошибка обновления категории',
      categoryDeleteError: 'Ошибка удаления категории',
    },
    budgets: {
      title: 'Бюджеты',
      subtitle: 'Управление и отслеживание бюджетов по категориям',
      newBudget: 'Новый бюджет',
      periodLabel: 'Период расчета',
      monthLabel: 'Месяц бюджета',
      monthHelper: 'Используется для периода "Текущий месяц" как границы расчета',
      from: 'С',
      to: 'По',
      confirmDelete: 'Вы уверены, что хотите удалить этот бюджет?',
      deleteError: 'Ошибка при удалении:',
      saveError: 'Не удалось сохранить бюджет',
      saveFormError: 'Ошибка при сохранении',
      period: {
        today: 'Сегодня',
        yesterday: 'Вчера',
        week: 'Последние 7 дней',
        month: 'Текущий месяц',
        last30days: 'Последние 30 дней',
        custom: 'Произвольный период',
        all: 'За все время',
      },
    },
    reports: {
      title: 'Отчеты',
      subtitle: 'Генерация отчетов с предпросмотром и экспортом в CSV, Excel и PDF',
    },
    subscriptions: {
      title: 'Подписки и регулярные списания',
      subtitle: 'Мониторинг подписок, выявление переплат и контроль автоматических платежей',
      authRequired: 'Требуется авторизация для работы с подписками',
      refresh: 'Обновить',
      recommendationSectionTitle: 'Рекомендации по переплатам',
      recommendationEmpty: 'Сейчас критичных переплат по подпискам не обнаружено.',
      potentialSavingsPrefix: 'Возможная экономия:',
      potentialSavingsSuffix: 'в месяц',
      subscriptionsSectionTitle: 'Мои подписки',
      subscriptionsEmpty: 'Подписок пока нет. Подключите источник данных или добавьте вручную.',
      nextChargeLabel: 'Следующее списание:',
      chargeStopped: 'Списание остановлено',
      lastUsageLabel: 'Последнее использование:',
      noUsageMarks: 'Нет отметок использования',
      categoryPrefix: 'Категория:',
      perMonth: '/мес',
      perYear: '/год',
      actions: {
        markUsed: 'Отметить использование',
        pause: 'Пауза',
        resume: 'Возобновить',
        cancel: 'Отменить',
      },
      status: {
        active: 'Активна',
        paused: 'Пауза',
        cancelled: 'Отменена',
      },
      usageState: {
        active: 'Используется регулярно',
        rarelyUsed: 'Используется редко',
        unused: 'Не используется',
      },
      summary: {
        activeCount: 'Активные подписки',
        monthlyPayments: 'Платежи в месяц',
        annualProjection: 'Прогноз на год',
        monthlySavings: 'Потенциальная экономия/мес',
      },
      categories: {
        video: 'Видео',
        music: 'Музыка',
        education: 'Образование',
        cloud: 'Облако',
        gaming: 'Игры',
        other: 'Другое',
      },
      service: {
        errors: {
          overrideLoadFallback: 'Не удалось загрузить изменения состояний подписок. Проверьте миграции Supabase.',
          saveActionFallback: 'Не удалось сохранить действие по подписке. Проверьте подключение к Supabase.',
          notFound: 'Подписка не найдена',
          pauseOnlyActive: 'Приостановить можно только активную подписку',
          resumeOnlyPaused: 'Возобновить можно только приостановленную подписку',
          alreadyCancelled: 'Подписка уже отменена',
          markUsedCancelled: 'Нельзя отметить использование для отмененной подписки',
        },
        insights: {
          unusedTitlePrefix: 'Подписка',
          unusedTitleSuffix: 'почти не используется',
          unusedDescriptionPrefix: 'Последняя активность была',
          unusedDescriptionSuffix: 'дней назад. Можно отключить регулярное списание.',
          highPriceTitlePrefix: 'Высокая стоимость подписки',
          highPriceDescription: 'Проверьте семейный или годовой тариф, чтобы снизить регулярные расходы.',
          duplicateTitlePrefix: 'Обнаружено дублирование',
          duplicateVideo: 'видеосервисов',
          duplicateMusic: 'музыкальных сервисов',
          duplicateDescriptionPrefix: 'У вас',
          duplicateDescriptionMiddle: 'активных подписок этой категории. Можно оставить один сервис.',
        },
      },
    },
  },
} as const;

type DictionarySchema<T> = {
  [K in keyof T]: T[K] extends object ? DictionarySchema<T[K]> : string;
};

const en: DictionarySchema<typeof ru> = {
  common: {
    actions: {
      cancel: 'Cancel',
      save: 'Save',
      saving: 'Saving...',
      viewAll: 'View all operations',
      show: 'Show filters',
      hide: 'Hide filters',
    },
  },
  nav: {
    home: 'Home',
    transactions: 'Transactions',
    subscriptions: 'Subscriptions',
    budgets: 'Budgets',
    analytics: 'Analytics',
    reports: 'Reports',
    goals: 'Goals',
    banks: 'Banks',
    userFallback: 'User',
    account: 'Account',
    profile: 'Profile',
    settings: 'Settings',
    logout: 'Logout',
    version: 'Version 1.0.0',
  },
  pages: {
    settings: {
      title: 'Settings and localization',
      subtitle: 'Adaptation to your country financial system specifics',
      regionalTitle: 'Regional settings',
      languageTitle: 'Interface language',
      languageSubtitle: 'Simple UI adapted for new users',
      languageRu: 'Russian',
      languageEn: 'English',
      taxTitle: 'Tax mode',
      taxSubtitle: 'For automatic tax calculations',
      bankTitle: 'Bank standards (Synchronization)',
      bankTinkoffTitle: 'Tinkoff Bank (Open API)',
      bankTinkoffSubtitle: 'Automatic checks and operations import',
      bankBinanceTitle: 'Binance synchronization',
      bankBinanceSubtitle: 'Real-time crypto wallet balance updates',
      connectNewBank: 'Connect new bank',
    },
    dashboard: {
      title: 'Home',
      addAccount: 'Add account',
      newTransaction: 'New transaction',
      accountsTitle: 'My accounts (Multi-currency)',
      noAccounts: 'No accounts added yet',
      defaultBankAccount: 'Bank account',
      totalBalance: 'Total balance',
      income: 'Income',
      expenses: 'Expenses',
      recentTransactions: 'Recent transactions',
      noTransactions: 'No operations yet',
      defaultOperation: 'Operation',
      incomeLabel: 'Income',
      expenseLabel: 'Expense',
      addBankAccountDialogTitle: 'Add bank account',
      accountNameLabel: 'Account name',
      bankLabel: 'Bank',
      accountNumberLabel: 'Account number (20 digits)',
      initialBalanceLabel: 'Initial balance',
      currencyLabel: 'Currency',
      accountCreateError: 'Failed to create account',
      transactionCreateError: 'Failed to create operation',
    },
    transactions: {
      title: 'Transaction history',
      subtitle: 'Manage your income, expenses and transfers',
      categories: 'Categories',
      newTransaction: 'New operation',
      advancedFilters: 'Advanced filters',
      activeFilters: 'Active filters',
      filtersHint: 'You can use advanced filters when needed. Click "Show filters" to change search conditions.',
      categoriesLoading: 'Loading categories...',
      allOperations: 'All operations',
      income: 'Income',
      expenses: 'Expenses',
      operationSaveError: 'Operation save error',
      categoryCreateError: 'Category creation error',
      categoryUpdateError: 'Category update error',
      categoryDeleteError: 'Category deletion error',
    },
    budgets: {
      title: 'Budgets',
      subtitle: 'Manage and track budgets by category',
      newBudget: 'New budget',
      periodLabel: 'Calculation period',
      monthLabel: 'Budget month',
      monthHelper: 'Used as bounds for the "Current month" period',
      from: 'From',
      to: 'To',
      confirmDelete: 'Are you sure you want to delete this budget?',
      deleteError: 'Delete error:',
      saveError: 'Failed to save budget',
      saveFormError: 'Save error',
      period: {
        today: 'Today',
        yesterday: 'Yesterday',
        week: 'Last 7 days',
        month: 'Current month',
        last30days: 'Last 30 days',
        custom: 'Custom period',
        all: 'All time',
      },
    },
    reports: {
      title: 'Reports',
      subtitle: 'Generate reports with preview and export to CSV, Excel and PDF',
    },
    subscriptions: {
      title: 'Subscriptions and recurring charges',
      subtitle: 'Track subscriptions, detect overspending and control automatic payments',
      authRequired: 'Authorization is required to work with subscriptions',
      refresh: 'Refresh',
      recommendationSectionTitle: 'Overspending recommendations',
      recommendationEmpty: 'No critical subscription overspending detected right now.',
      potentialSavingsPrefix: 'Possible savings:',
      potentialSavingsSuffix: 'per month',
      subscriptionsSectionTitle: 'My subscriptions',
      subscriptionsEmpty: 'No subscriptions yet. Connect a data source or add them manually.',
      nextChargeLabel: 'Next charge:',
      chargeStopped: 'Charges are stopped',
      lastUsageLabel: 'Last usage:',
      noUsageMarks: 'No usage marks yet',
      categoryPrefix: 'Category:',
      perMonth: '/mo',
      perYear: '/yr',
      actions: {
        markUsed: 'Mark as used',
        pause: 'Pause',
        resume: 'Resume',
        cancel: 'Cancel',
      },
      status: {
        active: 'Active',
        paused: 'Paused',
        cancelled: 'Cancelled',
      },
      usageState: {
        active: 'Used regularly',
        rarelyUsed: 'Used rarely',
        unused: 'Not used',
      },
      summary: {
        activeCount: 'Active subscriptions',
        monthlyPayments: 'Monthly payments',
        annualProjection: 'Annual projection',
        monthlySavings: 'Potential savings/month',
      },
      categories: {
        video: 'Video',
        music: 'Music',
        education: 'Education',
        cloud: 'Cloud',
        gaming: 'Gaming',
        other: 'Other',
      },
      service: {
        errors: {
          overrideLoadFallback: 'Failed to load subscription state overrides. Check Supabase migrations.',
          saveActionFallback: 'Failed to save subscription action. Check Supabase connection.',
          notFound: 'Subscription not found',
          pauseOnlyActive: 'Only active subscriptions can be paused',
          resumeOnlyPaused: 'Only paused subscriptions can be resumed',
          alreadyCancelled: 'Subscription is already cancelled',
          markUsedCancelled: 'Cannot mark usage for a cancelled subscription',
        },
        insights: {
          unusedTitlePrefix: 'Subscription',
          unusedTitleSuffix: 'is barely used',
          unusedDescriptionPrefix: 'Last activity was',
          unusedDescriptionSuffix: 'days ago. You can disable recurring charges.',
          highPriceTitlePrefix: 'High subscription cost',
          highPriceDescription: 'Check family or annual plan to reduce recurring expenses.',
          duplicateTitlePrefix: 'Detected duplicate',
          duplicateVideo: 'video services',
          duplicateMusic: 'music services',
          duplicateDescriptionPrefix: 'You have',
          duplicateDescriptionMiddle: 'active subscriptions in this category. Consider keeping one service.',
        },
      },
    },
  },
};

const dictionaries: Record<AppLanguage, DictionarySchema<typeof ru>> = {
  ru,
  en,
};

type DotNestedKeys<T> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object ? `${K}.${DotNestedKeys<T[K]>}` : K;
    }[keyof T & string]
  : never;

export type TranslationKey = DotNestedKeys<typeof ru>;

const getByPath = (obj: unknown, key: string): string | undefined => {
  const value = key.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);

  return typeof value === 'string' ? value : undefined;
};

export const getStoredLanguage = (): AppLanguage => {
  if (typeof window === 'undefined') return 'ru';
  const saved = window.localStorage.getItem(APP_LANGUAGE_KEY);
  return saved === 'en' ? 'en' : 'ru';
};

export const translate = (key: TranslationKey, language?: AppLanguage): string => {
  const currentLanguage = language || getStoredLanguage();
  return (
    getByPath(dictionaries[currentLanguage], key) ||
    getByPath(dictionaries.ru, key) ||
    String(key)
  );
};

type I18nContextValue = {
  language: AppLanguage;
  setLanguage: (value: AppLanguage) => void;
  t: (key: TranslationKey) => string;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>(getStoredLanguage);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === APP_LANGUAGE_KEY) {
        setLanguageState(getStoredLanguage());
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setLanguage = useCallback((value: AppLanguage) => {
    setLanguageState(value);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(APP_LANGUAGE_KEY, value);
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      return translate(key, language);
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
    }),
    [language, setLanguage, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = (): I18nContextValue => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
};
