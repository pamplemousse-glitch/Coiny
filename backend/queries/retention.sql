-- W4 north star and counter-metric (docs/prd.md R-2.1, R-2.2, R-24.3).
-- Run weekly by hand until it earns a dashboard:
--   psql "$DATABASE_URL" -f backend/queries/retention.sql
--
-- Definition, from prd.md section 2 and nowhere else:
--   W4 = percentage of signups who completed a foundation-ladder rung or a
--   habit-goal period within 4 weeks of signup AND had an app_open event in
--   days 21 to 27 inclusive, where day 0 is the calendar day of
--   signup_completed.
--   Counter-metric (R-2.2) = percentage of signups who completed a guardrail
--   period in week 4 with NO app_open in days 21 to 27 (the quiet-but-
--   succeeding cohort; sleep is a success state).
--
-- Interpretation choices, stated because the spec is silent:
--   * Calendar days are UTC. "Day 0" is the UTC date of the signup_completed
--     event's server_ts; day offsets are whole-date subtractions, so the
--     app_open window "days 21 to 27" spans 7 UTC calendar days.
--   * "Within 4 weeks of signup" means day offsets 0 through 27 inclusive
--     (28 calendar days, per engineering-budgets section 8).
--   * Habit-goal / guardrail period completion reads goal_periods (the
--     authoritative table) with outcome = 'passed'; a period counts against
--     the day its period_end falls on. "In week 4" = period_end on day
--     offsets 21 through 27, mirroring the app_open window.
--   * Rung completion reads the server-emitted rung_completed event, which
--     fires exactly once per rung at the transition edge.
--   * Cohorts are grouped by ISO week of the signup day. Cohorts younger than
--     28 days are excluded: their window has not closed, so any number for
--     them would be noise. Duplicated events cannot move any metric; every
--     signal below is an EXISTS.

WITH cohort AS (
  SELECT
    user_id,
    MIN((server_ts AT TIME ZONE 'UTC')::date) AS signup_day
  FROM analytics_events
  WHERE event = 'signup_completed'
  GROUP BY user_id
),

flags AS (
  SELECT
    c.user_id,
    c.signup_day,

    -- app_open in days 21 to 27 inclusive (the W4 activity signal).
    EXISTS (
      SELECT 1
      FROM analytics_events e
      WHERE e.user_id = c.user_id
        AND e.event = 'app_open'
        AND ((e.server_ts AT TIME ZONE 'UTC')::date - c.signup_day) BETWEEN 21 AND 27
    ) AS opened_week4,

    -- Completed a foundation-ladder rung within 4 weeks of signup.
    EXISTS (
      SELECT 1
      FROM analytics_events e
      WHERE e.user_id = c.user_id
        AND e.event = 'rung_completed'
        AND ((e.server_ts AT TIME ZONE 'UTC')::date - c.signup_day) BETWEEN 0 AND 27
    ) AS rung_within_4w,

    -- Completed a habit-goal (guardrail) period within 4 weeks of signup.
    EXISTS (
      SELECT 1
      FROM goal_periods gp
      WHERE gp.user_id = c.user_id
        AND gp.outcome = 'passed'
        AND (gp.period_end - c.signup_day) BETWEEN 0 AND 27
    ) AS habit_period_within_4w,

    -- Completed a guardrail period IN week 4 (days 21 to 27), for the
    -- quiet-but-succeeding counter-metric.
    EXISTS (
      SELECT 1
      FROM goal_periods gp
      WHERE gp.user_id = c.user_id
        AND gp.outcome = 'passed'
        AND (gp.period_end - c.signup_day) BETWEEN 21 AND 27
    ) AS guardrail_passed_week4

  FROM cohort c
  WHERE c.signup_day <= (now() AT TIME ZONE 'UTC')::date - 28
)

SELECT
  to_char(signup_day, 'IYYY-"W"IW') AS signup_iso_week,
  COUNT(*) AS cohort_size,

  -- W4 numerator: (rung OR habit period within 4 weeks) AND app_open in days 21 to 27.
  COUNT(*) FILTER (
    WHERE (rung_within_4w OR habit_period_within_4w) AND opened_week4
  ) AS w4_retained,

  ROUND(
    100.0 * COUNT(*) FILTER (
      WHERE (rung_within_4w OR habit_period_within_4w) AND opened_week4
    ) / COUNT(*),
    1
  ) AS w4_pct,

  -- Counter-metric (R-2.2): completed a guardrail period in week 4, no app_open
  -- in days 21 to 27. A rising number here is a product win, not churn.
  COUNT(*) FILTER (
    WHERE guardrail_passed_week4 AND NOT opened_week4
  ) AS quiet_completers,

  ROUND(
    100.0 * COUNT(*) FILTER (
      WHERE guardrail_passed_week4 AND NOT opened_week4
    ) / COUNT(*),
    1
  ) AS quiet_completers_pct

FROM flags
GROUP BY signup_iso_week
ORDER BY signup_iso_week;
