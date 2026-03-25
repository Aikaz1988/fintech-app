import { TransactionFormData, BudgetFormData, GoalFormData, BankAccountFormData } from '@/types';

export interface ValidationErrors {
  [key: string]: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationErrors;
}

/** UUID v4 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/**
 * Допустимые символы для человекочитаемого имени категории:
 * латиница, кириллица, цифры, пробел, дефис, нижнее подчёркивание, скобки.
 * Одинарные кавычки, точки с запятой и прочие SQL/XSS символы — запрещены.
 */
const CATEGORY_NAME_REGEX = /^[\w\s\-\u0400-\u04FF()]+$/;

const isValidCategoryId = (id: string): boolean =>
  UUID_REGEX.test(id) || CATEGORY_NAME_REGEX.test(id);

export const validateTransaction = (data: TransactionFormData): ValidationResult => {
  const errors: ValidationErrors = {};

  const amount = typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount;
  if (!amount || amount <= 0) {
    errors.amount = 'Сумма должна быть больше 0';
  } else if (amount > 1000000000) {
    errors.amount = 'Слишком большая сумма';
  }

  if (!data.category_id || data.category_id.trim() === '') {
    errors.category_id = 'Выберите категорию';
  } else if (!isValidCategoryId(data.category_id.trim())) {
    errors.category_id = 'Некорректный идентификатор категории';
  }

  if (!data.date) {
    errors.date = 'Укажите дату';
  } else {
    const dateObj = new Date(data.date);
    const now = new Date();
    if (dateObj > now) {
      errors.date = 'Дата не может быть в будущем';
    }
  }

  if (data.description && data.description.length > 500) {
    errors.description = 'Описание не должно превышать 500 символов';
  }

  if (data.merchant && data.merchant.length > 100) {
    errors.merchant = 'Название мерчанта не должно превышать 100 символов';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateBudget = (data: BudgetFormData): ValidationResult => {
  const errors: ValidationErrors = {};

  if (!data.category_id || data.category_id.trim() === '') {
    errors.category_id = 'Выберите категорию';
  } else if (!isValidCategoryId(data.category_id.trim())) {
    errors.category_id = 'Некорректный идентификатор категории';
  }

  if (!data.limit || data.limit <= 0) {
    errors.limit = 'Лимит должен быть больше 0';
  } else if (data.limit > 1000000000) {
    errors.limit = 'Слишком большой лимит';
  }

  if (!data.month) {
    errors.month = 'Укажите месяц';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateGoal = (data: GoalFormData): ValidationResult => {
  const errors: ValidationErrors = {};

  if (!data.goal_name || data.goal_name.trim() === '') {
    errors.goal_name = 'Введите название цели';
  } else if (data.goal_name.length < 3) {
    errors.goal_name = 'Название должно быть не менее 3 символов';
  } else if (data.goal_name.length > 100) {
    errors.goal_name = 'Название не должно превышать 100 символов';
  }

  if (!data.target_amount || data.target_amount <= 0) {
    errors.target_amount = 'Целевая сумма должна быть больше 0';
  } else if (data.target_amount > 1000000000) {
    errors.target_amount = 'Слишком большая сумма';
  }

  if (data.current_amount !== undefined && data.current_amount < 0) {
    errors.current_amount = 'Текущая сумма не может быть отрицательной';
  }

  if (
    data.current_amount !== undefined &&
    data.target_amount !== undefined &&
    data.current_amount > data.target_amount
  ) {
    errors.current_amount = 'Текущая сумма не может превышать целевую';
  }

  if (data.deadline) {
    const deadlineObj = new Date(data.deadline);
    const now = new Date();
    if (deadlineObj < now) {
      errors.deadline = 'Дедлайн не может быть в прошлом';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateBankAccount = (data: BankAccountFormData): ValidationResult => {
  const errors: ValidationErrors = {};

  if (!data.account_name || data.account_name.trim() === '') {
    errors.account_name = 'Введите название счета';
  } else if (data.account_name.length < 3) {
    errors.account_name = 'Название должно быть не менее 3 символов';
  } else if (data.account_name.length > 100) {
    errors.account_name = 'Название не должно превышать 100 символов';
  }

  if (data.bank_name && data.bank_name.length > 100) {
    errors.bank_name = 'Название банка не должно превышать 100 символов';
  }

  if (data.account_number) {
    const accountNumberRegex = /^[0-9]{20}$/;
    if (!accountNumberRegex.test(data.account_number)) {
      errors.account_number = 'Номер счета должен содержать 20 цифр';
    }
  }

  if (data.balance !== undefined && data.balance < 0) {
    errors.balance = 'Баланс не может быть отрицательным';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};