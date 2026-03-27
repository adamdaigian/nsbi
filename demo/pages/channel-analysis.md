---
title: Channel Analysis L1
description: Acquisition funnel, account segmentation, and source attribution
---

```sql
-- name: growth_kpis
WITH cur_total AS (
  SELECT COUNT(*) AS total_accounts
  FROM accounts
),
prev_total AS (
  SELECT COUNT(*) AS total_accounts
  FROM accounts
  WHERE signup_date < DATE '2025-06-01'
),
cur_trial_conv AS (
  SELECT
    COUNT(*) FILTER (WHERE trial_start_date IS NOT NULL
      AND DATE_TRUNC('month', trial_start_date) = DATE '2025-06-01') AS trials,
    COUNT(*) FILTER (WHERE trial_start_date IS NOT NULL
      AND DATE_TRUNC('month', trial_start_date) = DATE '2025-06-01'
      AND converted_date IS NOT NULL) AS converted
  FROM accounts
),
prev_trial_conv AS (
  SELECT
    COUNT(*) FILTER (WHERE trial_start_date IS NOT NULL
      AND DATE_TRUNC('month', trial_start_date) = DATE '2025-05-01') AS trials,
    COUNT(*) FILTER (WHERE trial_start_date IS NOT NULL
      AND DATE_TRUNC('month', trial_start_date) = DATE '2025-05-01'
      AND converted_date IS NOT NULL) AS converted
  FROM accounts
),
cur_days AS (
  SELECT ROUND(AVG(converted_date - trial_start_date)) AS avg_days
  FROM accounts
  WHERE converted_date IS NOT NULL
    AND DATE_TRUNC('month', converted_date) = DATE '2025-06-01'
),
prev_days AS (
  SELECT ROUND(AVG(converted_date - trial_start_date)) AS avg_days
  FROM accounts
  WHERE converted_date IS NOT NULL
    AND DATE_TRUNC('month', converted_date) = DATE '2025-05-01'
),
cur_expansion AS (
  SELECT
    COUNT(DISTINCT se.account_id) AS expanded,
    (SELECT COUNT(*) FROM accounts WHERE status = 'active') AS active_total
  FROM subscription_events se
  JOIN accounts a ON a.id = se.account_id
  WHERE se.event_type = 'expansion'
    AND DATE_TRUNC('month', se.event_date) = DATE '2025-06-01'
    AND a.status = 'active'
),
prev_expansion AS (
  SELECT
    COUNT(DISTINCT se.account_id) AS expanded,
    (SELECT COUNT(*) FROM accounts
     WHERE status IN ('active', 'churned')
       AND signup_date < DATE '2025-06-01'
       AND (churned_date IS NULL OR churned_date >= DATE '2025-05-01')) AS active_total
  FROM subscription_events se
  JOIN accounts a ON a.id = se.account_id
  WHERE se.event_type = 'expansion'
    AND DATE_TRUNC('month', se.event_date) = DATE '2025-05-01'
)
SELECT
  ct.total_accounts,
  ct.total_accounts - pt.total_accounts AS total_accounts_delta,
  ROUND(ctc.converted * 100.0 / GREATEST(ctc.trials, 1), 0) AS trial_conversion_rate,
  ROUND(ctc.converted * 100.0 / GREATEST(ctc.trials, 1), 0)
    - ROUND(ptc.converted * 100.0 / GREATEST(ptc.trials, 1), 0) AS trial_conversion_rate_delta,
  COALESCE(cd.avg_days, 0) AS avg_days_to_convert,
  COALESCE(cd.avg_days, 0) - COALESCE(pd.avg_days, 0) AS avg_days_to_convert_delta,
  ROUND(ce.expanded * 100.0 / GREATEST(ce.active_total, 1), 0) AS expansion_rate,
  ROUND(ce.expanded * 100.0 / GREATEST(ce.active_total, 1), 0)
    - ROUND(pe.expanded * 100.0 / GREATEST(pe.active_total, 1), 0) AS expansion_rate_delta
FROM cur_total ct, prev_total pt,
     cur_trial_conv ctc, prev_trial_conv ptc,
     cur_days cd, prev_days pd,
     cur_expansion ce, prev_expansion pe
```

```sql
-- name: signups_by_source
SELECT
  DATE_TRUNC('month', signup_date) AS month,
  source,
  COUNT(*) AS signups
FROM accounts
GROUP BY 1, 2
ORDER BY month, source
```

```sql
-- name: signups_by_segment
SELECT
  DATE_TRUNC('month', signup_date) AS month,
  segment,
  COUNT(*) AS signups
FROM accounts
GROUP BY 1, 2
ORDER BY month, segment
```

```sql
-- name: accounts_by_plan
WITH months AS (
  SELECT UNNEST(GENERATE_SERIES(DATE '2024-01-01', DATE '2025-06-01', INTERVAL '1' MONTH)) AS month
),
plans AS (
  SELECT UNNEST(['starter', 'growth', 'enterprise']) AS plan
),
grid AS (
  SELECT m.month, p.plan FROM months m CROSS JOIN plans p
),
monthly_active AS (
  SELECT
    m.month,
    s.plan,
    COUNT(DISTINCT s.account_id) AS active_accounts
  FROM months m
  JOIN subscriptions s
    ON s.start_date <= m.month + INTERVAL '1' MONTH - INTERVAL '1' DAY
    AND (s.end_date IS NULL OR s.end_date >= m.month)
    AND s.status IN ('active', 'cancelled')
  GROUP BY m.month, s.plan
)
SELECT
  g.month,
  g.plan,
  COALESCE(ma.active_accounts, 0) AS active_accounts
FROM grid g
LEFT JOIN monthly_active ma ON ma.month = g.month AND ma.plan = g.plan
ORDER BY g.month, g.plan
```

```sql
-- name: revenue_by_source
SELECT
  DATE_TRUNC('month', se.event_date) AS month,
  a.source,
  ROUND(SUM(se.mrr_delta)) AS mrr
FROM subscription_events se
JOIN accounts a ON a.id = se.account_id
WHERE se.event_type = 'new'
GROUP BY 1, 2
ORDER BY month, source
```

```sql
-- name: trial_funnel
SELECT
  DATE_TRUNC('month', trial_start_date) AS month,
  'Trials Started' AS metric,
  COUNT(*) AS count
FROM accounts
WHERE trial_start_date IS NOT NULL
GROUP BY 1
UNION ALL
SELECT
  DATE_TRUNC('month', trial_start_date) AS month,
  'Converted' AS metric,
  COUNT(*) AS count
FROM accounts
WHERE trial_start_date IS NOT NULL
  AND converted_date IS NOT NULL
GROUP BY 1
ORDER BY month, metric
```

```sql
-- name: account_status
SELECT
  status,
  COUNT(*) AS count
FROM accounts
GROUP BY status
ORDER BY count DESC
```

```sql
-- name: recent_signups
SELECT
  name,
  segment,
  source,
  signup_date,
  status
FROM accounts
ORDER BY signup_date DESC
LIMIT 25
```

<Grid cols={4}>
  <KPI data="growth_kpis" value="total_accounts" title="Total Accounts" format="num0" comparison="total_accounts_delta" comparisonFormat="num0" comparisonLabel="vs last month" isUpGood={true} />
  <KPI data="growth_kpis" value="trial_conversion_rate" title="Trial Conversion Rate" format="pct0" comparison="trial_conversion_rate_delta" comparisonFormat="pct0" comparisonLabel="vs last month" isUpGood={true} />
  <KPI data="growth_kpis" value="avg_days_to_convert" title="Avg Days to Convert" format="num0" comparison="avg_days_to_convert_delta" comparisonFormat="num0" comparisonLabel="vs last month" isUpGood={false} />
  <KPI data="growth_kpis" value="expansion_rate" title="Expansion Rate" format="pct0" comparison="expansion_rate_delta" comparisonFormat="pct0" comparisonLabel="vs last month" isUpGood={true} />
</Grid>

## Acquisition Channels

<Grid cols={2}>
  <BarChart data="signups_by_source" x="month" y="signups" color="source" title="Signups by Source" xTimeUnit="yearmonth" stack />
  <BarChart data="revenue_by_source" x="month" y="mrr" color="source" title="Revenue by Source" yFormat="$~s" xTimeUnit="yearmonth" stack />
</Grid>

## Segment Mix

<Grid cols={2}>
  <BarChart data="signups_by_segment" x="month" y="signups" color="segment" title="Signups by Segment" xTimeUnit="yearmonth" stack />
  <AreaChart data="accounts_by_plan" x="month" y="active_accounts" color="plan" title="Accounts by Plan" xTimeUnit="yearmonth" />
</Grid>

## Trial Funnel

<Grid cols={2}>
  <BarChart data="trial_funnel" x="month" y="count" color="metric" title="Trial Funnel" xTimeUnit="yearmonth" />
  <BarChart data="account_status" x="status" y="count" title="Account Status Breakdown" />
</Grid>

<DataTable data="recent_signups" title="Recent Signups" />
