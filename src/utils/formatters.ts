import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

export const formatCurrency = (amount: number, currency: string = 'RUB'): string => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (date: string | Date, formatString: string = 'dd.MM.yyyy'): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, formatString, { locale: ru });
  } catch (error) {
    return 'Некорректная дата';
  }
};

export const formatDateTime = (date: string | Date): string => {
  return formatDate(date, 'dd.MM.yyyy HH:mm');
};

export const formatShortDate = (date: string | Date): string => {
  return formatDate(date, 'dd.MM.yy');
};

export const formatMonthYear = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'LLLL yyyy', { locale: ru });
};

export const formatRelativeTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) {
    return 'Только что';
  } else if (diffMins < 60) {
    return `${diffMins} мин. назад`;
  } else if (diffHours < 24) {
    return `${diffHours} ч. назад`;
  } else if (diffDays < 7) {
    return `${diffDays} дн. назад`;
  } else {
    return formatDate(date, 'dd.MM.yyyy');
  }
};

export const formatPercent = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

export const formatNumber = (number: number): string => {
  return new Intl.NumberFormat('ru-RU').format(number);
};

export const formatCompactNumber = (num: number): string => {
  return new Intl.NumberFormat('ru-RU', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(num);
};

export const formatDateRange = (startDate: string | Date, endDate: string | Date): string => {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;

  const startStr = formatDate(start, 'dd.MM.yyyy');
  const endStr = formatDate(end, 'dd.MM.yyyy');

  if (startStr === endStr) {
    return startStr;
  }

  return `${startStr} - ${endStr}`;
};

export const getMonthName = (month: number): string => {
  const months = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ];
  return months[month];
};

export const getMonthNameNominative = (month: number): string => {
  const months = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];
  return months[month];
};

export const formatMCCCode = (mccCode: string): string => {
  const mccDescriptions: Record<string, string> = {
    '5411': 'Продуктовые магазины',
    '5541': 'Автозаправочные станции',
    '5812': 'Рестораны',
    '5912': 'Аптеки',
    '4111': 'Общественный транспорт',
  };

  return mccDescriptions[mccCode] || `MCC: ${mccCode}`;
};