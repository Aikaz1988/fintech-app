/*
  Consolidated migration:
  - recommendations cadence + anti-spam logic
  - historical recommendation dedup cleanup
  - manual recommendation RPC
  - security hardening for function search_path
*/

BEGIN;

ALTER TABLE recommendations
  ADD COLUMN IF NOT EXISTS cadence_key text;

CREATE INDEX IF NOT EXISTS idx_recommendations_user_cadence_created
  ON recommendations(user_id, cadence_key, created_at DESC);

CREATE OR REPLACE FUNCTION generate_recommendations(p_user_id uuid)
RETURNS void AS $$
DECLARE
  cadence record;
  total_expense numeric;
  top_category_name text;
  top_category_total numeric;
  top_category_share numeric;
  recommendation_text text;
  already_sent boolean;
  first_expense_date date;
  now_ts timestamptz := NOW();
BEGIN
  SELECT MIN(t.date)
  INTO first_expense_date
  FROM transactions t
  WHERE t.user_id = p_user_id
    AND t.type = 'expense';

  IF first_expense_date IS NULL THEN
    RETURN;
  END IF;

  FOR cadence IN
    SELECT *
    FROM (
      VALUES
        ('monthly', interval '1 month', 'месяц', 3),
        ('three_days', interval '3 days', '3 дня', 2),
        ('daily', interval '24 hours', 'день', 1)
    ) AS t(cadence_key, window_interval, period_label, priority_rank)
    ORDER BY priority_rank DESC
  LOOP
    IF first_expense_date > (now_ts - cadence.window_interval)::date THEN
      CONTINUE;
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM recommendations r
      WHERE r.user_id = p_user_id
        AND r.cadence_key = cadence.cadence_key
        AND r.created_at >= now_ts - cadence.window_interval
    )
    INTO already_sent;

    IF already_sent THEN
      CONTINUE;
    END IF;

    SELECT COALESCE(SUM(t.amount), 0)
    INTO total_expense
    FROM transactions t
    WHERE t.user_id = p_user_id
      AND t.type = 'expense'
      AND t.date >= (now_ts - cadence.window_interval)::date;

    IF total_expense <= 0 THEN
      CONTINUE;
    END IF;

    SELECT
      COALESCE(c.name, 'Без категории') AS category_name,
      COALESCE(SUM(t.amount), 0) AS category_total
    INTO top_category_name, top_category_total
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE t.user_id = p_user_id
      AND t.type = 'expense'
      AND t.date >= (now_ts - cadence.window_interval)::date
    GROUP BY c.name
    ORDER BY category_total DESC
    LIMIT 1;

    IF top_category_total <= 0 THEN
      CONTINUE;
    END IF;

    top_category_share := ROUND((top_category_total / total_expense) * 100, 1);

    recommendation_text := format(
      'Категория "%s" составляет %s%% ваших расходов. Рассмотрите возможность оптимизации. Период: %s.',
      top_category_name,
      top_category_share,
      cadence.period_label
    );

    INSERT INTO recommendations (user_id, recommendation_text, category, priority, is_read, cadence_key)
    VALUES (
      p_user_id,
      recommendation_text,
      top_category_name,
      CASE
        WHEN top_category_share >= 40 THEN 'high'::priority_type
        WHEN top_category_share >= 25 THEN 'medium'::priority_type
        ELSE 'low'::priority_type
      END,
      false,
      cadence.cadence_key
    );

    RETURN;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_generate_recommendations()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'expense' THEN
    PERFORM generate_recommendations(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

/* Historical cleanup from intermediate migrations */

WITH ranked_exact AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, COALESCE(category, ''), recommendation_text
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM recommendations
)
DELETE FROM recommendations r
USING ranked_exact d
WHERE r.id = d.id
  AND d.rn > 1;

WITH candidates AS (
  SELECT
    id,
    user_id,
    COALESCE(category, '') AS category_key,
    DATE_TRUNC('day', created_at) AS day_bucket,
    REGEXP_REPLACE(recommendation_text, '[0-9]+([.,][0-9]+)?', '{n}', 'g') AS template_text,
    created_at
  FROM recommendations
  WHERE cadence_key IS NULL
    AND category IS NOT NULL
    AND recommendation_text ILIKE '%составляет%'
    AND recommendation_text ILIKE '%Рассмотрите возможность оптимизации%'
),
ranked_daily AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, category_key, day_bucket, template_text
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM candidates
)
DELETE FROM recommendations r
USING ranked_daily d
WHERE r.id = d.id
  AND d.rn > 1;

WITH candidates AS (
  SELECT
    id,
    user_id,
    COALESCE(category, '') AS category_key,
    (
      DATE_TRUNC('day', created_at)
      - ((EXTRACT(DOY FROM created_at)::int - 1) % 3) * INTERVAL '1 day'
    ) AS three_day_bucket,
    REGEXP_REPLACE(recommendation_text, '[0-9]+([.,][0-9]+)?', '{n}', 'g') AS template_text,
    created_at
  FROM recommendations
  WHERE cadence_key IS NULL
    AND category IS NOT NULL
    AND recommendation_text ILIKE '%составляет%'
    AND recommendation_text ILIKE '%Рассмотрите возможность оптимизации%'
),
ranked_three_day AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, category_key, three_day_bucket, template_text
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM candidates
)
DELETE FROM recommendations r
USING ranked_three_day d
WHERE r.id = d.id
  AND d.rn > 1;

WITH candidates AS (
  SELECT
    id,
    user_id,
    COALESCE(category, '') AS category_key,
    DATE_TRUNC('month', created_at) AS month_bucket,
    REGEXP_REPLACE(recommendation_text, '[0-9]+([.,][0-9]+)?', '{n}', 'g') AS template_text,
    created_at
  FROM recommendations
  WHERE cadence_key IS NULL
    AND category IS NOT NULL
    AND recommendation_text ILIKE '%составляет%'
    AND recommendation_text ILIKE '%Рассмотрите возможность оптимизации%'
),
ranked_monthly AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, category_key, month_bucket, template_text
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM candidates
)
DELETE FROM recommendations r
USING ranked_monthly d
WHERE r.id = d.id
  AND d.rn > 1;

WITH burst_candidates AS (
  SELECT
    id,
    user_id,
    COALESCE(category, '') AS category_key,
    DATE_TRUNC('hour', created_at) AS hour_bucket,
    REGEXP_REPLACE(recommendation_text, '[0-9]+([.,][0-9]+)?', '{n}', 'g') AS template_text,
    cadence_key,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY
        user_id,
        COALESCE(category, ''),
        DATE_TRUNC('hour', created_at),
        REGEXP_REPLACE(recommendation_text, '[0-9]+([.,][0-9]+)?', '{n}', 'g')
      ORDER BY
        CASE cadence_key
          WHEN 'monthly' THEN 3
          WHEN 'three_days' THEN 2
          WHEN 'daily' THEN 1
          ELSE 0
        END DESC,
        created_at DESC,
        id DESC
    ) AS rn
  FROM recommendations
  WHERE recommendation_text ILIKE '%составляет%'
    AND recommendation_text ILIKE '%Рассмотрите возможность оптимизации%'
)
DELETE FROM recommendations r
USING burst_candidates b
WHERE r.id = b.id
  AND b.rn > 1;

CREATE OR REPLACE FUNCTION public.generate_recommendations_manual(
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_started_at timestamptz := NOW();
  v_role text := COALESCE(current_setting('request.jwt.claim.role', true), '');
  v_auth_user uuid := auth.uid();
  v_created_count integer := 0;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'created', false,
      'error', 'User ID is required'
    );
  END IF;

  IF v_role <> 'service_role' AND (v_auth_user IS NULL OR v_auth_user <> p_user_id) THEN
    RAISE EXCEPTION 'Access denied for user %', p_user_id USING ERRCODE = '42501';
  END IF;

  PERFORM public.generate_recommendations(p_user_id);

  SELECT COUNT(*)::int
  INTO v_created_count
  FROM recommendations r
  WHERE r.user_id = p_user_id
    AND r.created_at >= v_started_at;

  IF v_created_count = 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'created', false,
      'message', 'No recommendation created (anti-spam window or insufficient period history).'
    );
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'success', true,
      'created', true,
      'message', 'Recommendation created successfully.',
      'created_count', v_created_count,
      'recommendation', jsonb_build_object(
        'id', r.id,
        'text', r.recommendation_text,
        'category', r.category,
        'priority', r.priority,
        'cadence_key', r.cadence_key,
        'created_at', r.created_at
      )
    )
    FROM recommendations r
    WHERE r.user_id = p_user_id
      AND r.created_at >= v_started_at
    ORDER BY r.created_at DESC, r.id DESC
    LIMIT 1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.generate_recommendations_manual(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_recommendations_manual(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_recommendations_manual(uuid) TO service_role;

DO $$
BEGIN
  IF to_regprocedure('public.generate_recommendations(uuid)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.generate_recommendations(uuid) SET search_path = public, pg_temp';
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regprocedure('public.get_category_expenses_for_month(uuid,uuid,date)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.get_category_expenses_for_month(uuid, uuid, date) SET search_path = public, pg_temp';
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regprocedure('public.check_budget_limit()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.check_budget_limit() SET search_path = public, pg_temp';
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regprocedure('public.trigger_generate_recommendations()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.trigger_generate_recommendations() SET search_path = public, pg_temp';
  END IF;
END
$$;

COMMIT;
