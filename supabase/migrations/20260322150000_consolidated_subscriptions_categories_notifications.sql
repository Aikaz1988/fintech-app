/*
  Consolidated migration:
  - subscription overrides persistence
  - categories dedup + uniqueness indexes
  - notification preferences + enhanced budget alerts
*/

BEGIN;

DO $$
BEGIN
  CREATE TYPE subscription_status AS ENUM ('active', 'paused', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE subscription_usage_state AS ENUM ('active', 'rarely_used', 'unused');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS subscription_state_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id text NOT NULL,
  status subscription_status NOT NULL,
  usage_state subscription_usage_state,
  next_charge_date timestamptz,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, subscription_id)
);

ALTER TABLE subscription_state_overrides ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'subscription_state_overrides'
      AND policyname = 'Users can view own subscription overrides'
  ) THEN
    CREATE POLICY "Users can view own subscription overrides"
      ON subscription_state_overrides FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'subscription_state_overrides'
      AND policyname = 'Users can create own subscription overrides'
  ) THEN
    CREATE POLICY "Users can create own subscription overrides"
      ON subscription_state_overrides FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'subscription_state_overrides'
      AND policyname = 'Users can update own subscription overrides'
  ) THEN
    CREATE POLICY "Users can update own subscription overrides"
      ON subscription_state_overrides FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'subscription_state_overrides'
      AND policyname = 'Users can delete own subscription overrides'
  ) THEN
    CREATE POLICY "Users can delete own subscription overrides"
      ON subscription_state_overrides FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_subscription_state_overrides_user
  ON subscription_state_overrides(user_id);

CREATE INDEX IF NOT EXISTS idx_subscription_state_overrides_lookup
  ON subscription_state_overrides(user_id, subscription_id);

CREATE TABLE IF NOT EXISTS subscription_usage_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id text NOT NULL,
  used_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscription_usage_marks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'subscription_usage_marks'
      AND policyname = 'Users can view own subscription usage marks'
  ) THEN
    CREATE POLICY "Users can view own subscription usage marks"
      ON subscription_usage_marks FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'subscription_usage_marks'
      AND policyname = 'Users can create own subscription usage marks'
  ) THEN
    CREATE POLICY "Users can create own subscription usage marks"
      ON subscription_usage_marks FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'subscription_usage_marks'
      AND policyname = 'Users can delete own subscription usage marks'
  ) THEN
    CREATE POLICY "Users can delete own subscription usage marks"
      ON subscription_usage_marks FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_subscription_usage_marks_user
  ON subscription_usage_marks(user_id);

CREATE INDEX IF NOT EXISTS idx_subscription_usage_marks_lookup
  ON subscription_usage_marks(user_id, subscription_id, used_at DESC);

/* Categories dedup + unique constraints */

CREATE TEMP TABLE category_dedup_map AS
WITH ranked AS (
  SELECT
    id,
    user_id,
    name,
    type,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, name, type
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS rn,
    FIRST_VALUE(id) OVER (
      PARTITION BY user_id, name, type
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS keep_id
  FROM categories
)
SELECT
  id AS duplicate_id,
  keep_id
FROM ranked
WHERE rn > 1;

UPDATE transactions t
SET category_id = m.keep_id
FROM category_dedup_map m
WHERE t.category_id = m.duplicate_id;

UPDATE budgets b
SET category_id = m.keep_id
FROM category_dedup_map m
WHERE b.category_id = m.duplicate_id;

DELETE FROM categories c
USING category_dedup_map m
WHERE c.id = m.duplicate_id;

DROP TABLE category_dedup_map;

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_user_name_type_unique
  ON categories (user_id, name, type);

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_default_name_type_unique
  ON categories (name, type)
  WHERE user_id IS NULL;

/* Notification preferences + enriched alerts */

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  warning_threshold_percent integer NOT NULL DEFAULT 80 CHECK (warning_threshold_percent >= 1 AND warning_threshold_percent < 100),
  alert_threshold_percent integer NOT NULL DEFAULT 100 CHECK (alert_threshold_percent >= 100 AND alert_threshold_percent <= 300),
  cadence_minutes integer NOT NULL DEFAULT 60 CHECK (cadence_minutes >= 1 AND cadence_minutes <= 1440),
  push_enabled boolean NOT NULL DEFAULT true,
  sound_enabled boolean NOT NULL DEFAULT false,
  vibration_enabled boolean NOT NULL DEFAULT false,
  calendar_enabled boolean NOT NULL DEFAULT true,
  notifications_paused_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notification_preferences'
      AND policyname = 'Users can view own notification preferences'
  ) THEN
    CREATE POLICY "Users can view own notification preferences"
      ON notification_preferences FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notification_preferences'
      AND policyname = 'Users can create own notification preferences'
  ) THEN
    CREATE POLICY "Users can create own notification preferences"
      ON notification_preferences FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notification_preferences'
      AND policyname = 'Users can update own notification preferences'
  ) THEN
    CREATE POLICY "Users can update own notification preferences"
      ON notification_preferences FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS threshold_percent integer,
  ADD COLUMN IF NOT EXISTS spent_amount numeric,
  ADD COLUMN IF NOT EXISTS limit_amount numeric,
  ADD COLUMN IF NOT EXISTS period_start date,
  ADD COLUMN IF NOT EXISTS period_end date,
  ADD COLUMN IF NOT EXISTS category_name text;

CREATE INDEX IF NOT EXISTS idx_notifications_user_budget_type_created
  ON notifications(user_id, budget_id, type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user
  ON notification_preferences(user_id);

CREATE OR REPLACE FUNCTION check_budget_limit()
RETURNS TRIGGER AS $$
DECLARE
  budget_record RECORD;
  expense_amount numeric;
  alert_message text;
  percent_used numeric;
  pref_warning integer := 80;
  pref_alert integer := 100;
  pref_cadence integer := 60;
  pref_paused_until timestamptz := NULL;
  notification_type notification_type;
  recently_sent boolean;
  period_from date;
  period_to date;
BEGIN
  IF NEW.type != 'expense' THEN
    RETURN NEW;
  END IF;

  SELECT
    warning_threshold_percent,
    alert_threshold_percent,
    cadence_minutes,
    notifications_paused_until
  INTO
    pref_warning,
    pref_alert,
    pref_cadence,
    pref_paused_until
  FROM notification_preferences
  WHERE user_id = NEW.user_id;

  IF pref_paused_until IS NOT NULL AND pref_paused_until > now() THEN
    RETURN NEW;
  END IF;

  FOR budget_record IN
    SELECT b.id, b.limit_amount, b.month, c.name AS category_name
    FROM budgets b
    JOIN categories c ON b.category_id = c.id
    WHERE b.user_id = NEW.user_id
      AND b.category_id = NEW.category_id
      AND DATE_TRUNC('month', b.month) = DATE_TRUNC('month', NEW.date)
  LOOP
    SELECT COALESCE(SUM(amount), 0)
    INTO expense_amount
    FROM transactions
    WHERE user_id = NEW.user_id
      AND category_id = NEW.category_id
      AND type = 'expense'
      AND DATE_TRUNC('month', date) = DATE_TRUNC('month', NEW.date);

    IF budget_record.limit_amount IS NULL OR budget_record.limit_amount <= 0 THEN
      CONTINUE;
    END IF;

    percent_used := ROUND((expense_amount / budget_record.limit_amount) * 100, 2);
    period_from := DATE_TRUNC('month', NEW.date)::date;
    period_to := (DATE_TRUNC('month', NEW.date) + INTERVAL '1 month - 1 day')::date;
    notification_type := NULL;

    IF percent_used >= pref_alert THEN
      notification_type := 'alert';
      alert_message := format(
        'Превышение лимита по категории "%s": %s%% (%s из %s). Рекомендуем сократить необязательные траты и пересмотреть план расходов.',
        budget_record.category_name,
        percent_used,
        ROUND(expense_amount, 2),
        ROUND(budget_record.limit_amount, 2)
      );
    ELSIF percent_used >= pref_warning THEN
      notification_type := 'warning';
      alert_message := format(
        'Лимит почти исчерпан по категории "%s": %s%% (%s из %s). Проверьте запланированные покупки на текущий период.',
        budget_record.category_name,
        percent_used,
        ROUND(expense_amount, 2),
        ROUND(budget_record.limit_amount, 2)
      );
    END IF;

    IF notification_type IS NULL THEN
      CONTINUE;
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM notifications n
      WHERE n.user_id = NEW.user_id
        AND n.budget_id = budget_record.id
        AND n.type = notification_type
        AND n.created_at >= now() - make_interval(mins => pref_cadence)
    ) INTO recently_sent;

    IF recently_sent THEN
      CONTINUE;
    END IF;

    INSERT INTO notifications (
      user_id,
      budget_id,
      message,
      type,
      is_read,
      threshold_percent,
      spent_amount,
      limit_amount,
      period_start,
      period_end,
      category_name
    ) VALUES (
      NEW.user_id,
      budget_record.id,
      alert_message,
      notification_type,
      false,
      ROUND(percent_used)::integer,
      expense_amount,
      budget_record.limit_amount,
      period_from,
      period_to,
      budget_record.category_name
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF to_regprocedure('public.check_budget_limit()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.check_budget_limit() SET search_path = public, pg_temp';
  END IF;
END
$$;

COMMIT;
