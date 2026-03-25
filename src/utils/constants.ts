import { Category, MenuItem, SelectOption } from '@/types';

export const DEFAULT_EXPENSE_CATEGORIES: Omit<Category, 'id' | 'created_at'>[] = [
  { user_id: null, name: 'Продукты', color: '#10B981', icon: 'shopping-cart', type: 'expense' },
  { user_id: null, name: 'Транспорт', color: '#3B82F6', icon: 'car', type: 'expense' },
  { user_id: null, name: 'Развлечения', color: '#8B5CF6', icon: 'film', type: 'expense' },
  { user_id: null, name: 'Рестораны', color: '#F59E0B', icon: 'coffee', type: 'expense' },
  { user_id: null, name: 'Здоровье', color: '#EF4444', icon: 'heart', type: 'expense' },
  { user_id: null, name: 'Одежда', color: '#EC4899', icon: 'shirt', type: 'expense' },
  { user_id: null, name: 'Дом', color: '#6366F1', icon: 'home', type: 'expense' },
  { user_id: null, name: 'Коммунальные услуги', color: '#14B8A6', icon: 'zap', type: 'expense' },
  { user_id: null, name: 'Связь', color: '#06B6D4', icon: 'phone', type: 'expense' },
  { user_id: null, name: 'Образование', color: '#F97316', icon: 'book', type: 'expense' },
  { user_id: null, name: 'Другое', color: '#6B7280', icon: 'more-horizontal', type: 'expense' },
];

export const DEFAULT_INCOME_CATEGORIES: Omit<Category, 'id' | 'created_at'>[] = [
  { user_id: null, name: 'Зарплата', color: '#10B981', icon: 'dollar-sign', type: 'income' },
  { user_id: null, name: 'Фриланс', color: '#3B82F6', icon: 'briefcase', type: 'income' },
  { user_id: null, name: 'Инвестиции', color: '#8B5CF6', icon: 'trending-up', type: 'income' },
  { user_id: null, name: 'Подарки', color: '#EC4899', icon: 'gift', type: 'income' },
  { user_id: null, name: 'Другое', color: '#6B7280', icon: 'more-horizontal', type: 'income' },
];

export const MENU_ITEMS: MenuItem[] = [
  { id: 'dashboard', label: 'Дашборд', icon: 'layout-dashboard', path: '/dashboard' },
  { id: 'transactions', label: 'Транзакции', icon: 'credit-card', path: '/transactions' },
  { id: 'budgets', label: 'Бюджеты', icon: 'wallet', path: '/budgets' },
  { id: 'analytics', label: 'Аналитика', icon: 'pie-chart', path: '/analytics' },
  { id: 'goals', label: 'Цели', icon: 'target', path: '/goals' },
  { id: 'reports', label: 'Отчёты', icon: 'file-text', path: '/reports' },
  { id: 'bank-integration', label: 'Банки', icon: 'building', path: '/bank-integration' },
  { id: 'settings', label: 'Настройки', icon: 'settings', path: '/settings' },
];

export const CURRENCIES: SelectOption[] = [
  { value: 'RUB', label: '₽ Российский рубль' },
  { value: 'USD', label: '$ Доллар США' },
  { value: 'EUR', label: '€ Евро' },
  { value: 'KZT', label: '₸ Казахстанский тенге' },
  { value: 'BYN', label: 'Br Белорусский рубль' },
];

export const PRIORITIES: SelectOption[] = [
  { value: 'low', label: 'Низкий', color: '#10B981' },
  { value: 'medium', label: 'Средний', color: '#F59E0B' },
  { value: 'high', label: 'Высокий', color: '#EF4444' },
];

export const NOTIFICATION_THRESHOLDS = {
  WARNING: 0.8, // 80% от бюджета
  CRITICAL: 1.0, // 100% от бюджета
};

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  LIMIT_OPTIONS: [10, 20, 50, 100],
};

export const DATE_FORMATS = {
  DISPLAY: 'dd.MM.yyyy',
  DISPLAY_SHORT: 'dd.MM.yy',
  DISPLAY_WITH_TIME: 'dd.MM.yyyy HH:mm',
  MONTH_YEAR: 'LLLL yyyy',
  ISO: 'yyyy-MM-dd',
  DATETIME_LOCAL: 'yyyy-MM-ddTHH:mm',
};

export const EXPORT_FORMATS = [
  { value: 'pdf', label: 'PDF', icon: 'file-text' },
  { value: 'excel', label: 'Excel', icon: 'file-spreadsheet' },
  { value: 'csv', label: 'CSV', icon: 'file' },
];

export const REPORT_PERIODS = [
  { value: 'month', label: 'Месяц' },
  { value: 'quarter', label: 'Квартал' },
  { value: 'year', label: 'Год' },
  { value: 'custom', label: 'Произвольный' },
];

export const CHART_COLORS = {
  income: '#10B981',
  expense: '#EF4444',
  profit: '#3B82F6',
  palette: [
    '#3B82F6',
    '#10B981',
    '#F59E0B',
    '#EF4444',
    '#8B5CF6',
    '#EC4899',
    '#14B8A6',
    '#06B6D4',
    '#F97316',
    '#6366F1',
  ],
};

export const ICONS = {
  dashboard: 'layout-dashboard',
  transactions: 'credit-card',
  budgets: 'wallet',
  analytics: 'pie-chart',
  goals: 'target',
  reports: 'file-text',
  bank: 'building',
  settings: 'settings',
  income: 'trending-up',
  expense: 'trending-down',
  add: 'plus',
  edit: 'edit-2',
  delete: 'trash-2',
  search: 'search',
  filter: 'filter',
  download: 'download',
  upload: 'upload',
  notification: 'bell',
  close: 'x',
  menu: 'menu',
  check: 'check',
  warning: 'alert-triangle',
  error: 'x-circle',
  info: 'info',
  success: 'check-circle',
};

export const ERROR_MESSAGES = {
  NETWORK: 'Ошибка сети. Проверьте подключение к интернету.',
  SERVER: 'Ошибка сервера. Попробуйте позже.',
  UNAUTHORIZED: 'Необходима авторизация.',
  FORBIDDEN: 'Нет доступа к этому ресурсу.',
  NOT_FOUND: 'Ресурс не найден.',
  VALIDATION: 'Ошибка валидации данных.',
  UNKNOWN: 'Произошла неизвестная ошибка.',
};

export const SUCCESS_MESSAGES = {
  CREATE: 'Успешно создано',
  UPDATE: 'Успешно обновлено',
  DELETE: 'Успешно удалено',
  EXPORT: 'Экспорт выполнен',
  IMPORT: 'Импорт выполнен',
};

export const FILE_SIZES = {
  MAX_AVATAR_SIZE: 5 * 1024 * 1024, // 5 MB
  MAX_EXPORT_SIZE: 10 * 1024 * 1024, // 10 MB
};