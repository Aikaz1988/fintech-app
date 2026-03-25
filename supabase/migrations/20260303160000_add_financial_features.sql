/*
  # Financial App Additional Features Schema
  # Университет Синергия - Финтех Приложение

  1. New Tables
    - `bank_accounts` - Банковские счета для интеграции
      - id (uuid, primary key)
      - user_id (uuid, foreign key)
      - account_name (text) - название счета
      - bank_name (text) - название банка
      - account_number (text) - номер счета
      - balance (numeric) - текущий баланс
      - currency (text) - валюта
      - is_active (boolean) - активен ли счет
      - created_at (timestamp)
    
    - `financial_goals` - Финансовые цели
      - id (uuid, primary key)
      - user_id (uuid, foreign key)
      - goal_name (text) - название цели
      - target_amount (numeric) - целевая сумма
      - current_amount (numeric) - текущая сумма
      - deadline (date) - дедлайн
      - priority (enum) - приоритет
      - is_achieved (boolean) - достигнута ли
      - created_at (timestamp)
    
    - `recommendations` - Рекомендации по оптимизации финансов
      - id (uuid, primary key)
      - user_id (uuid, foreign key)
      - recommendation_text (text) - текст рекомендации
      - category (text) - категория
      - priority (enum) - приоритет
      - is_read (boolean) - прочитана ли
      - created_at (timestamp)

  2. Updates
    - Добавление полей в transactions для импорта из банка
    - Добавление индексов для аналитики

  3. Functions and Triggers
    - Функция расчета расходов по категориям за месяц
    - Триггер проверки превышения бюджета
    - Функция генерации рекомендаций

  4. Security
    - RLS на все новые таблицы
    - Политики для доступа пользователей к своим данным
*/

-- Создаем ENUM для приоритетов
DO $$
BEGIN
  CREATE TYPE priority_type AS ENUM ('low', 'medium', 'high');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- ============================================
-- Таблица: bank_accounts (Банковские счета)
-- ============================================
CREATE TABLE IF NOT EXISTS bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_name text NOT NULL,
  bank_name text,
  account_number text,
  balance numeric DEFAULT 0 CHECK (balance >= 0),
  currency text DEFAULT 'RUB',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Пользователи могут просматривать свои счета"
  ON bank_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Пользователи могут создавать свои счета"
  ON bank_accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Пользователи могут обновлять свои счета"
  ON bank_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Пользователи могут удалять свои счета"
  ON bank_accounts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================
-- Таблица: financial_goals (Финансовые цели)
-- ============================================
CREATE TABLE IF NOT EXISTS financial_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_name text NOT NULL,
  target_amount numeric NOT NULL CHECK (target_amount > 0),
  current_amount numeric DEFAULT 0 CHECK (current_amount >= 0),
  deadline date,
  priority priority_type DEFAULT 'medium',
  is_achieved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Пользователи могут просматривать свои цели"
  ON financial_goals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Пользователи могут создавать свои цели"
  ON financial_goals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Пользователи могут обновлять свои цели"
  ON financial_goals FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Пользователи могут удалять свои цели"
  ON financial_goals FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================
-- Таблица: recommendations (Рекомендации)
-- ============================================
CREATE TABLE IF NOT EXISTS recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendation_text text NOT NULL,
  category text,
  priority priority_type DEFAULT 'medium',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Пользователи могут просматривать свои рекомендации"
  ON recommendations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Пользователи могут обновлять статус прочтения"
  ON recommendations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Пользователи могут удалять свои рекомендации"
  ON recommendations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own recommendations"
  ON recommendations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Обновление таблицы transactions
-- ============================================
-- Добавляем поля для импорта из банка
ALTER TABLE transactions 
  ADD COLUMN IF NOT EXISTS is_imported boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES bank_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS merchant text,
  ADD COLUMN IF NOT EXISTS mcc_code text;

-- ============================================
-- Индексы для улучшения производительности
-- ============================================
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_goals_user_id ON financial_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_goals_is_achieved ON financial_goals(is_achieved);
CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_is_read ON recommendations(is_read);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC);

-- ============================================
-- Функция: Расчет расходов по категориям за месяц
-- ============================================
CREATE OR REPLACE FUNCTION get_category_expenses_for_month(
  p_user_id uuid,
  p_category_id uuid,
  p_month date
)
RETURNS numeric AS $$
DECLARE
  total_expenses numeric;
BEGIN
  SELECT COALESCE(SUM(amount), 0)
  INTO total_expenses
  FROM transactions
  WHERE user_id = p_user_id
    AND category_id = p_category_id
    AND type = 'expense'
    AND DATE_TRUNC('month', date) = DATE_TRUNC('month', p_month);
  
  RETURN total_expenses;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- Функция: Проверка превышения бюджета
-- ============================================
CREATE OR REPLACE FUNCTION check_budget_limit()
RETURNS TRIGGER AS $$
DECLARE
  budget_record RECORD;
  expense_amount numeric;
  alert_message text;
BEGIN
  -- Если это не расход, пропускаем
  IF NEW.type != 'expense' THEN
    RETURN NEW;
  END IF;

  -- Проверяем бюджеты для этой категории
  FOR budget_record IN
    SELECT b.id, b.limit_amount, c.name as category_name
    FROM budgets b
    JOIN categories c ON b.category_id = c.id
    WHERE b.user_id = NEW.user_id
      AND b.category_id = NEW.category_id
      AND DATE_TRUNC('month', b.month) = DATE_TRUNC('month', NEW.date)
  LOOP
    -- Считаем общие расходы по категории за месяц
    SELECT COALESCE(SUM(amount), 0)
    INTO expense_amount
    FROM transactions
    WHERE user_id = NEW.user_id
      AND category_id = NEW.category_id
      AND type = 'expense'
      AND DATE_TRUNC('month', date) = DATE_TRUNC('month', NEW.date);

    -- Проверяем превышение лимита
    IF expense_amount >= budget_record.limit_amount THEN
      -- Создаем уведомление
      alert_message := format(
        '⚠️ Превышен бюджет по категории "%s"! Потрачено %s ₽ из %s ₽',
        budget_record.category_name,
        expense_amount,
        budget_record.limit_amount
      );

      INSERT INTO notifications (user_id, budget_id, message, type, is_read)
      VALUES (NEW.user_id, budget_record.id, alert_message, 'alert', false);
    ELSIF expense_amount >= budget_record.limit_amount * 0.8 THEN
      -- Предупреждение о 80%
      alert_message := format(
        '⚡ Внимание! Израсходовано 80%% бюджета по категории "%s". Потрачено %s ₽ из %s ₽',
        budget_record.category_name,
        expense_amount,
        budget_record.limit_amount
      );

      INSERT INTO notifications (user_id, budget_id, message, type, is_read)
      VALUES (NEW.user_id, budget_record.id, alert_message, 'warning', false);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE POLICY "Users can create own notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Создаем триггер для автоматической проверки бюджета
DROP TRIGGER IF EXISTS trigger_check_budget_limit ON transactions;
CREATE TRIGGER trigger_check_budget_limit
  AFTER INSERT OR UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION check_budget_limit();

-- ============================================
-- Функция: Генерация рекомендаций
-- ============================================
CREATE OR REPLACE FUNCTION generate_recommendations(p_user_id uuid)
RETURNS void AS $$
DECLARE
  current_month_total numeric;
  previous_month_total numeric;
  category_total RECORD;
  avg_monthly_expense numeric;
  recommendation_text text;
BEGIN
  -- Общий расход за текущий месяц
  SELECT COALESCE(SUM(amount), 0)
  INTO current_month_total
  FROM transactions
  WHERE user_id = p_user_id
    AND type = 'expense'
    AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE);

  -- Общий расход за предыдущий месяц
  SELECT COALESCE(SUM(amount), 0)
  INTO previous_month_total
  FROM transactions
  WHERE user_id = p_user_id
    AND type = 'expense'
    AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month');

  -- Анализ роста расходов
  IF previous_month_total > 0 AND current_month_total > previous_month_total * 1.2 THEN
    recommendation_text := format(
      '📈 Ваши расходы в этом месяце выросли на %s%% по сравнению с прошлым. Рекомендуем проанализировать категории трат.',
      ROUND(((current_month_total - previous_month_total) / previous_month_total * 100))
    );
    
    INSERT INTO recommendations (user_id, recommendation_text, category, priority, is_read)
    VALUES (p_user_id, recommendation_text, 'analytics', 'medium', false)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Анализ по категориям
  FOR category_total IN
    SELECT 
      c.name as category_name,
      c.id as category_id,
      COALESCE(SUM(t.amount), 0) as total
    FROM categories c
    LEFT JOIN transactions t ON c.id = t.category_id 
      AND t.user_id = p_user_id 
      AND t.type = 'expense'
      AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', CURRENT_DATE)
    WHERE c.user_id = p_user_id OR c.user_id IS NULL
    GROUP BY c.id, c.name
    HAVING COALESCE(SUM(t.amount), 0) > 0
  LOOP
    -- Проверка на чрезмерные расходы по категории (>30% от общего)
    IF current_month_total > 0 AND category_total.total > current_month_total * 0.3 THEN
      recommendation_text := format(
        '💰 Категория "%s" составляет %s%% ваших расходов. Рассмотрите возможность оптимизации.',
        category_total.category_name,
        ROUND((category_total.total / current_month_total * 100))
      );
      
      INSERT INTO recommendations (user_id, recommendation_text, category, priority, is_read)
      VALUES (p_user_id, recommendation_text, category_total.category_name, 'high', false)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  -- Средняя monthly expense
  SELECT COALESCE(AVG(monthly_total), 0)
  INTO avg_monthly_expense
  FROM (
    SELECT DATE_TRUNC('month', date) as month, SUM(amount) as monthly_total
    FROM transactions
    WHERE user_id = p_user_id
      AND type = 'expense'
      AND date >= CURRENT_DATE - INTERVAL '6 months'
    GROUP BY DATE_TRUNC('month', date)
  ) as monthly_expenses;

  -- Рекомендация по накоплениям
  IF avg_monthly_expense > 0 THEN
    recommendation_text := format(
      '💡 Ваша средняя ежемесячная трата: %s ₽. Рекомендуется откладывать минимум 10%% дохода.',
      ROUND(avg_monthly_expense, 2)
    );
    
    INSERT INTO recommendations (user_id, recommendation_text, category, priority, is_read)
    VALUES (p_user_id, recommendation_text, 'savings', 'low', false)
    ON CONFLICT DO NOTHING;
  END IF;

END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Функция: Автоматическая генерация рекомендаций при новой транзакции
-- ============================================
CREATE OR REPLACE FUNCTION trigger_generate_recommendations()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM generate_recommendations(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_recommendations ON transactions;
CREATE TRIGGER trigger_generate_recommendations
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_generate_recommendations();

-- ============================================
-- Начальные данные: Категории по умолчанию
-- ============================================
-- Расходы
INSERT INTO categories (user_id, name, color, icon, type) VALUES
  (NULL, 'Продукты', '#10B981', 'shopping-cart', 'expense'),
  (NULL, 'Транспорт', '#3B82F6', 'car', 'expense'),
  (NULL, 'Развлечения', '#8B5CF6', 'film', 'expense'),
  (NULL, 'Рестораны', '#F59E0B', 'coffee', 'expense'),
  (NULL, 'Здоровье', '#EF4444', 'heart', 'expense'),
  (NULL, 'Одежда', '#EC4899', 'shirt', 'expense'),
  (NULL, 'Дом', '#6366F1', 'home', 'expense'),
  (NULL, 'Коммунальные услуги', '#14B8A6', 'zap', 'expense'),
  (NULL, 'Связь', '#06B6D4', 'phone', 'expense'),
  (NULL, 'Образование', '#F97316', 'book', 'expense'),
  (NULL, 'Другое', '#6B7280', 'more-horizontal', 'expense')
ON CONFLICT DO NOTHING;

-- Доходы
INSERT INTO categories (user_id, name, color, icon, type) VALUES
  (NULL, 'Зарплата', '#10B981', 'dollar-sign', 'income'),
  (NULL, 'Фриланс', '#3B82F6', 'briefcase', 'income'),
  (NULL, 'Инвестиции', '#8B5CF6', 'trending-up', 'income'),
  (NULL, 'Подарки', '#EC4899', 'gift', 'income'),
  (NULL, 'Другое', '#6B7280', 'more-horizontal', 'income')
ON CONFLICT DO NOTHING;

-- ============================================
-- Примечания
-- ============================================
/*
  Использование:
  
  1. Применение миграции:
     - Через Supabase Dashboard -> SQL Editor
     - Или через CLI: supabase db push
  
  2. Проверка работы триггеров:
     - Добавить транзакцию
     - Проверить таблицу notifications на наличие уведомлений
     - Проверить таблицу recommendations на наличие рекомендаций
  
  3. Вызов функций вручную:
     SELECT get_category_expenses_for_month('user-uuid', 'category-uuid', '2024-03-01');
     SELECT generate_recommendations('user-uuid');
*/
