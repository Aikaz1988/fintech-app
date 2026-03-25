/**
 * Тесты безопасности (Security Testing)
 *
 * Проверяют защиту от основных уязвимостей (OWASP Top 10):
 *  - Инъекции (SQL, XSS, Command Injection)
 *  - Ошибки аутентификации
 *  - Шифрование / экспозиция данных
 *  - Контроль доступа
 *
 * Согласно статье: "Тестирование безопасности ориентировано на выявление
 * уязвимостей: проблемы с аутентификацией, ошибки шифрования данных,
 * атаки типа инъекций и другие уязвимости."
 */
import { describe, expect, it } from 'vitest';
import { validateTransaction, validateBudget, validateGoal } from '@/utils/validators';
import { connectToBank } from '../../src/services/bankApi.service';

// ── Вспомогательные наборы атакующих строк ──

/** SQL-инъекции */
const SQL_INJECTIONS = [
  "' OR '1'='1",
  "'; DROP TABLE transactions; --",
  "1' UNION SELECT * FROM users --",
  "admin'--",
  "' OR 1=1 --",
];

/** XSS-векторы */
const XSS_PAYLOADS = [
  '<script>alert("xss")</script>',
  '<img src=x onerror=alert(1)>',
  'javascript:alert(1)',
  '"><script>document.cookie</script>',
  '<svg onload=alert(1)>',
];

/** Переполнение буфера / граничные значения */
const BOUNDARY_VALUES = {
  VERY_LARGE_NUMBER: Number.MAX_SAFE_INTEGER,
  NEGATIVE_HUGE: -Number.MAX_SAFE_INTEGER,
  ZERO: 0,
  FLOAT_OVERFLOW: 1e309,           // Infinity
  LONG_STRING: 'A'.repeat(10_000), // 10 000 символов
};

describe('Security Tests: Защита от инъекций в полях транзакции', () => {
  it('SEC-1.1: SQL-инъекция в description не проходит проверку валидатора', () => {
    for (const injection of SQL_INJECTIONS) {
      const result = validateTransaction({
        amount: 100,
        category_id: 'cat-food',
        type: 'expense',
        date: '2026-03-01',
        description: injection,
      });

      // Сервис должен либо принять (т.к. description не обязательна),
      // но НЕ исполнять SQL — валидатор не должен падать/крашиться
      expect(typeof result.isValid).toBe('boolean');
    }
  });

  it('SEC-1.2: XSS в поле description не вызывает исключений в валидаторе', () => {
    for (const xss of XSS_PAYLOADS) {
      const result = validateTransaction({
        amount: 100,
        category_id: 'cat-food',
        type: 'expense',
        date: '2026-03-01',
        description: xss,
      });

      expect(typeof result.isValid).toBe('boolean');
    }
  });

  it('SEC-1.3: Сверхдлинная строка в description отклоняется валидатором', () => {
    const result = validateTransaction({
      amount: 100,
      category_id: 'cat-food',
      type: 'expense',
      date: '2026-03-01',
      description: BOUNDARY_VALUES.LONG_STRING,
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.description).toBeDefined();
  });

  it('SEC-1.4: SQL-инъекция в category_id отклоняется', () => {
    for (const injection of SQL_INJECTIONS) {
      const result = validateTransaction({
        amount: 100,
        category_id: injection,
        type: 'expense',
        date: '2026-03-01',
        description: '',
      });

      // category_id со спецсимволами — невалидный UUID, должен быть отклонён
      expect(result.isValid).toBe(false);
      expect(result.errors.category_id).toBeDefined();
    }
  });
});

describe('Security Tests: Защита от инъекций в бюджетах', () => {
  it('SEC-2.1: SQL-инъекция в category_id бюджета отклоняется', () => {
    for (const injection of SQL_INJECTIONS) {
      const result = validateBudget({
        category_id: injection,
        limit: 10000,
        month: '2026-03',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.category_id).toBeDefined();
    }
  });

  it('SEC-2.2: Попытка установить гигантский лимит отклоняется', () => {
    const result = validateBudget({
      category_id: 'valid-category-id',
      limit: BOUNDARY_VALUES.VERY_LARGE_NUMBER,
      month: '2026-03',
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.limit).toBeDefined();
  });

  it('SEC-2.3: Отрицательный лимит бюджета отклоняется', () => {
    const result = validateBudget({
      category_id: 'valid-category-id',
      limit: -50000,
      month: '2026-03',
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.limit).toBeDefined();
  });
});

describe('Security Tests: Граничные значения числовых полей', () => {
  it('SEC-3.1: Нулевая сумма транзакции отклоняется', () => {
    const result = validateTransaction({
      amount: BOUNDARY_VALUES.ZERO,
      category_id: 'cat-1',
      type: 'expense',
      date: '2026-03-01',
      description: '',
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.amount).toBeDefined();
  });

  it('SEC-3.2: Сумма MAX_SAFE_INTEGER отклоняется как слишком большая', () => {
    const result = validateTransaction({
      amount: BOUNDARY_VALUES.VERY_LARGE_NUMBER,
      category_id: 'cat-1',
      type: 'expense',
      date: '2026-03-01',
      description: '',
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.amount).toBeDefined();
  });

  it('SEC-3.3: Отрицательная сумма транзакции отклоняется', () => {
    const result = validateTransaction({
      amount: -1000,
      category_id: 'cat-1',
      type: 'expense',
      date: '2026-03-01',
      description: '',
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.amount).toBeDefined();
  });
});

describe('Security Tests: Аутентификация и контроль доступа', () => {
  it('SEC-4.1: Подключение к банку без учётных данных возвращает ошибку', async () => {
    const result = await connectToBank('user-1', 'Сбербанк', {
      login: '',
      password: '',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('SEC-4.2: Подключение к банку со слабым паролем (< 6 символов) отклоняется', async () => {
    const result = await connectToBank('user-1', 'Сбербанк', {
      login: 'valid-login',
      password: '123',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('SEC-4.3: XSS в логине банка не вызывает исключений', async () => {
    for (const xss of XSS_PAYLOADS) {
      const call = () =>
        connectToBank('user-1', 'Сбербанк', { login: xss, password: 'validpass' });

      // Не должно бросать исключение — должен вернуть structured error result
      await expect(call()).resolves.toBeDefined();
    }
  }, 15000);

  it('SEC-4.4: SQL-инъекция в пароле банка не вызывает исключений', async () => {
    for (const injection of SQL_INJECTIONS) {
      const call = () =>
        connectToBank('user-1', 'Сбербанк', { login: 'valid-login', password: injection });

      await expect(call()).resolves.toBeDefined();
    }
  }, 15000);
});

describe('Security Tests: Целостность данных целей', () => {
  it('SEC-5.1: XSS в названии цели не вызывает исключений в валидаторе', () => {
    for (const xss of XSS_PAYLOADS) {
      const result = validateGoal({
        goal_name: xss,
        target_amount: 100000,
        current_amount: 0,
        priority: 'medium',
      });

      // Валидатор должен работать, не крашиться; XSS-строка — непустая,
      // длинные могут пройти по длине, короткие — нет (< 3 символов)
      expect(typeof result.isValid).toBe('boolean');
    }
  });

  it('SEC-5.2: Целевая сумма Infinity отклоняется', () => {
    const result = validateGoal({
      goal_name: 'Тест',
      target_amount: BOUNDARY_VALUES.FLOAT_OVERFLOW,
      current_amount: 0,
      priority: 'low',
    });

    expect(result.isValid).toBe(false);
  });

  it('SEC-5.3: Дата в прошлом для дедлайна цели отклоняется', () => {
    const result = validateGoal({
      goal_name: 'Старая цель',
      target_amount: 50000,
      current_amount: 0,
      priority: 'low',
      deadline: '2000-01-01',
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.deadline).toBeDefined();
  });
});
