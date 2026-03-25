import type {
  BankAccount,
  ImportedTransaction,
  ImportResult,
  OperationResult,
} from '@/types';

/**
 * Симуляция подключения к банку
 */
export const connectToBank = async (
  userId: string,
  bankName: string,
  credentials: { login: string; password: string }
): Promise<OperationResult<{ accountId: string; bankName: string }>> => {
  // Симуляция задержки сети
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Простая валидация
  if (!credentials.login || !credentials.password) {
    return {
      success: false,
      error: 'Введите логин и пароль',
    };
  }

  if (credentials.password.length < 6) {
    return {
      success: false,
      error: 'Пароль должен быть не менее 6 символов',
    };
  }

  const accountId = `bank_${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

  return {
    success: true,
    data: { accountId, bankName },
  };
};

/**
 * Симуляция получения счетов из банка
 */
export const fetchBankAccounts = async (bankName: string): Promise<BankAccount[]> => {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return [
    {
      id: `acc_1_${Date.now()}`,
      user_id: 'temp',
      account_name: 'Основной счёт',
      bank_name: bankName,
      account_number: '40817810099910004312',
      balance: 150000,
      currency: 'RUB',
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: `acc_2_${Date.now()}`,
      user_id: 'temp',
      account_name: 'Накопительный',
      bank_name: bankName,
      account_number: '40817810099910004313',
      balance: 500000,
      currency: 'RUB',
      is_active: true,
      created_at: new Date().toISOString(),
    },
  ];
};

/**
 * Симуляция импорта транзакций из банка
 */
export const importTransactionsFromBank = async (
  accountId: string,
  dateFrom: string,
  dateTo: string
): Promise<ImportResult> => {
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const merchants = [
    'Пятёрочка',
    'Магнит',
    'Лукойл',
    'Яндекс.Такси',
    'Ресторан "Москва"',
    'Аптека 36.6',
    'М.Видео',
    'OZON',
    'Wildberries',
    'СберМаркет',
  ];

  const categories = [
    'Продукты',
    'Транспорт',
    'Развлечения',
    'Рестораны',
    'Здоровье',
    'Одежда',
    'Электроника',
  ];

  const transactions: ImportedTransaction[] = [];
  const transactionCount = Math.floor(Math.random() * 20) + 10;

  const fromDate = new Date(dateFrom);
  const toDate = new Date(dateTo);
  const timeDiff = toDate.getTime() - fromDate.getTime();

  for (let i = 0; i < transactionCount; i++) {
    const randomTime = Math.random() * timeDiff;
    const transactionDate = new Date(fromDate.getTime() + randomTime);
    const isExpense = Math.random() > 0.3;
    const amount = isExpense
      ? Math.floor(Math.random() * 5000) + 100
      : Math.floor(Math.random() * 50000) + 5000;

    const txnId = `${accountId}_txn_${i}_${Date.now()}`;

    transactions.push({
      id: txnId,
      date: transactionDate.toISOString().split('T')[0],
      amount: isExpense ? -amount : amount,
      description: merchants[Math.floor(Math.random() * merchants.length)],
      merchant: merchants[Math.floor(Math.random() * merchants.length)],
      mcc_code: ['5411', '5541', '5812', '5912', '4111'][Math.floor(Math.random() * 5)],
      category_suggestion: categories[Math.floor(Math.random() * categories.length)],
    });
  }

  transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    success: true,
    count: transactions.length,
    transactions,
  };
};

/**
 * Симуляция получения баланса счёта
 */
export const fetchAccountBalance = async (accountId: string): Promise<number> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  
  const accountHash = accountId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return (accountHash % 1000000) + 10000;
};

/**
 * Симуляция ошибки подключения
 */
export const simulateConnectionError = async (): Promise<never> => {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  throw new Error('Банк временно недоступен. Попробуйте позже.');
};

/**
 * Получить список поддерживаемых банков
 */
export const getSupportedBanks = (): string[] => {
  return [
    'Сбербанк',
    'Тинькофф',
    'ВТБ',
    'Альфа-Банк',
    'Газпромбанк',
    'Райффайзенбанк',
    'Росбанк',
    'Открытие',
    'МКБ',
    'Совкомбанк',
  ];
};

/**
 * Валидация номера счёта
 */
export const validateAccountNumber = (accountNumber: string): boolean => {
  const regex = /^[0-9]{20}$/;
  return regex.test(accountNumber);
};

/**
 * Форматирование номера счёта для отображения
 */
export const formatAccountNumber = (accountNumber: string): string => {
  if (accountNumber.length !== 20) return accountNumber;
  
  return accountNumber.match(/.{1,4}/g)?.join('-') || accountNumber;
};