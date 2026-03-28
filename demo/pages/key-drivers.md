---
title: Key Drivers L2
description: Deep-dive on the drivers improving business outcomes
---

```sql
-- name: mrr_by_segment
WITH seg_events AS (
  SELECT
    DATE_TRUNC('month', se.event_date) AS month,
    a.segment,
    SUM(se.mrr_delta) AS mrr_delta
  FROM subscription_events se
  JOIN accounts a ON a.id = se.account_id
  GROUP BY 1, 2
),
months AS (
  SELECT UNNEST(GENERATE_SERIES(DATE '2024-01-01', DATE '2025-06-01', INTERVAL '1' MONTH)) AS month
),
segments AS (
  SELECT UNNEST(['smb', 'mid-market', 'enterprise']) AS segment
),
grid AS (
  SELECT m.month, s.segment FROM months m CROSS JOIN segments s
)
SELECT
  g.month,
  g.segment,
  COALESCE(SUM(COALESCE(se.mrr_delta, 0)) OVER (
    PARTITION BY g.segment ORDER BY g.month
  ), 0) AS cumulative_mrr
FROM grid g
LEFT JOIN seg_events se ON se.month = g.month AND se.segment = g.segment
ORDER BY g.month, g.segment
```

```sql
-- name: asp_trend
WITH months AS (
  SELECT UNNEST(GENERATE_SERIES(DATE '2024-01-01', DATE '2025-06-01', INTERVAL '1' MONTH)) AS month
),
new_subs AS (
  SELECT
    DATE_TRUNC('month', se.event_date) AS month,
    se.mrr_after AS initial_mrr
  FROM subscription_events se
  WHERE se.event_type = 'new'
)
SELECT
  m.month,
  ROUND(AVG(ns.initial_mrr)) AS asp
FROM months m
JOIN new_subs ns ON ns.month = m.month
GROUP BY m.month
ORDER BY m.month
```

```sql
-- name: churn_by_segment
WITH months AS (
  SELECT UNNEST(GENERATE_SERIES(DATE '2024-03-01', DATE '2025-06-01', INTERVAL '1' MONTH)) AS month
)
SELECT
  m.month,
  a.segment,
  ROUND(1.0 *
    COUNT(DISTINCT CASE
      WHEN a.churned_date >= m.month AND a.churned_date < m.month + INTERVAL '1' MONTH
      THEN a.id END)
    / NULLIF(COUNT(DISTINCT CASE
      WHEN a.converted_date < m.month
        AND (a.churned_date IS NULL OR a.churned_date >= m.month)
      THEN a.id END), 0), 3) AS churn_rate
FROM months m
CROSS JOIN accounts a
WHERE a.converted_date IS NOT NULL
  AND a.converted_date < m.month + INTERVAL '1' MONTH
GROUP BY m.month, a.segment
HAVING COUNT(DISTINCT CASE
  WHEN a.converted_date < m.month AND (a.churned_date IS NULL OR a.churned_date >= m.month)
  THEN a.id END) >= 5
ORDER BY m.month, a.segment
```

```sql
-- name: retention_cohort
WITH cohort_accounts AS (
  SELECT
    a.id AS account_id,
    DATE_TRUNC('quarter', a.converted_date) AS cohort_q,
    a.converted_date
  FROM accounts a
  WHERE a.converted_date IS NOT NULL
),
months AS (
  SELECT UNNEST(GENERATE_SERIES(DATE '2024-01-01', DATE '2025-06-01', INTERVAL '1' MONTH)) AS month
),
cohort_months AS (
  SELECT
    ca.account_id,
    ca.cohort_q,
    m.month,
    EXTRACT(MONTH FROM AGE(m.month, ca.cohort_q))
      + EXTRACT(YEAR FROM AGE(m.month, ca.cohort_q)) * 12 AS months_since
  FROM cohort_accounts ca
  CROSS JOIN months m
  WHERE m.month >= ca.cohort_q
),
active_check AS (
  SELECT
    cm.cohort_q,
    cm.months_since,
    cm.account_id,
    CASE WHEN EXISTS (
      SELECT 1 FROM subscriptions s
      WHERE s.account_id = cm.account_id
        AND s.start_date <= cm.month + INTERVAL '1' MONTH - INTERVAL '1' DAY
        AND (s.end_date IS NULL OR s.end_date >= cm.month)
    ) THEN 1 ELSE 0 END AS is_active
  FROM cohort_months cm
),
cohort_sizes AS (
  SELECT cohort_q, COUNT(DISTINCT account_id) AS cohort_size
  FROM cohort_accounts
  GROUP BY 1
)
SELECT
  CAST(ac.cohort_q AS VARCHAR) AS cohort,
  ac.months_since::INTEGER AS months_since,
  ROUND(SUM(ac.is_active) * 1.0 / MAX(cs.cohort_size), 3) AS retention_pct
FROM active_check ac
JOIN cohort_sizes cs ON cs.cohort_q = ac.cohort_q
WHERE ac.months_since >= 0
GROUP BY ac.cohort_q, ac.months_since
HAVING MAX(cs.cohort_size) >= 10
ORDER BY ac.cohort_q, ac.months_since
```

```sql
-- name: net_new_mrr
SELECT
  DATE_TRUNC('month', event_date) AS month,
  CASE event_type
    WHEN 'new' THEN 'New'
    WHEN 'expansion' THEN 'Expansion'
    WHEN 'reactivation' THEN 'New'
    WHEN 'downgrade' THEN 'Downgrade'
    WHEN 'churn' THEN 'Churn'
  END AS component,
  SUM(mrr_delta) AS mrr
FROM subscription_events
GROUP BY 1, 2
ORDER BY month, component
```

```sql
-- name: expansion_pct
WITH months AS (
  SELECT UNNEST(GENERATE_SERIES(DATE '2024-01-01', DATE '2025-06-01', INTERVAL '1' MONTH)) AS month
),
monthly AS (
  SELECT
    DATE_TRUNC('month', se.event_date) AS month,
    COALESCE(SUM(se.mrr_delta) FILTER (WHERE se.event_type = 'expansion'), 0) AS expansion_mrr,
    COALESCE(SUM(se.mrr_delta) FILTER (WHERE se.event_type IN ('new', 'expansion', 'reactivation')), 0) AS positive_mrr
  FROM subscription_events se
  GROUP BY 1
)
SELECT
  m.month,
  ROUND(
    CASE WHEN mo.positive_mrr > 0
      THEN mo.expansion_mrr * 1.0 / mo.positive_mrr
      ELSE 0
    END, 3
  ) AS expansion_pct
FROM months m
JOIN monthly mo ON mo.month = m.month
ORDER BY m.month
```

# What's Working: A Deep-Dive on Growth Drivers

Since closing our Series A in July 2024, three interconnected drivers have fundamentally reshaped the trajectory of this business. We have executed a deliberate shift toward enterprise accounts that has lifted average selling prices, tightened retention to levels that compound the installed base month over month, and built a growing expansion engine that generates high-margin revenue from existing customers. This memo unpacks each driver, examines the data behind it, and explains why these forces reinforce one another in ways that are difficult for the top-line numbers alone to convey.

## 1. The Segment Shift

In the first half of 2024, we were overwhelmingly an SMB company. Enterprise accounts represented roughly 5% of new signups, and our average selling price hovered around $150 per month -- effectively the starter plan. The go-to-market motion was inbound-led, self-serve, and optimized for volume. That approach got us to product-market fit and our first $2M in ARR, but the unit economics were challenging: SMB accounts churned at elevated rates, expanded infrequently, and required meaningful support relative to their contract value.

Post-Series A, we made a conscious bet on moving upmarket. We hired a team of account executives focused on mid-market and enterprise prospects, invested in enterprise-grade features (SSO, audit logs, role-based access), and restructured our pricing to reflect the value delivered to larger organizations. The results have been striking. Enterprise accounts now represent approximately 30% of new signups, mid-market has grown proportionally, and our blended ASP has risen from roughly $150 to approximately $500 per month. Critically, these larger accounts are not just bigger at signing -- they retain better and expand more frequently, which cascades through every downstream metric.

<Grid cols={2}>
  <AreaChart data="mrr_by_segment" x="month" y="cumulative_mrr" color="segment" title="MRR by Segment" yFormat="$~s" xTimeUnit="yearmonth" />
  <LineChart data="asp_trend" x="month" y="asp" title="Average Selling Price" yFormat="$~s" xTimeUnit="yearmonth" />
</Grid>

The area chart tells the story clearly: enterprise MRR has grown from a thin sliver in early 2024 to the single largest segment by mid-2025, while SMB growth has plateaued -- not because we are losing SMB customers, but because the mix of new bookings has shifted decisively. The ASP trend line confirms the pricing power that comes with this shift. The inflection point around July-August 2024 aligns precisely with the first enterprise AE hires ramping to quota. This is not a one-time step change; the upward slope continues as enterprise deals get larger and more frequent.

## 2. Retention Is Compounding

Retention improvements rarely make headlines the way a record bookings month does, but they are arguably the most valuable thing happening in this business right now. Our blended monthly logo churn rate has fallen from roughly 2% in early 2024 to under 1% in recent months. For enterprise accounts specifically, monthly churn is approaching 0.5%. To put that in context: at 2% monthly churn, you lose roughly 22% of your customer base annually; at 0.8%, you lose fewer than 10%. The difference in terminal value of a cohort is enormous.

The compounding effect of lower churn is subtle but powerful. Every month that we retain a larger share of the installed base, the denominator for next month's expansion opportunity grows. A customer who would have churned at month six under the old regime is now reaching month twelve, precisely the point at which seat expansion and plan upgrades tend to accelerate. The retention improvement is not uniform across segments -- enterprise and mid-market have improved the most, which is consistent with the thesis that larger, better-fit customers extract more value from the product and therefore stick. But even SMB churn has come down meaningfully, suggesting that product and customer success investments (better onboarding, proactive health scoring, faster support response times) are lifting all boats.

<Grid cols={2}>
  <LineChart data="churn_by_segment" x="month" y="churn_rate" color="segment" title="Monthly Churn Rate by Segment" yFormat=".1%" xTimeUnit="yearmonth" />
  <LineChart data="retention_cohort" x="months_since" y="retention_pct" color="cohort" title="Retention by Quarterly Cohort" yFormat=".0%" />
</Grid>

The cohort retention chart is perhaps the most encouraging visual in this entire report. Later cohorts -- particularly Q3 2024 and Q4 2024 -- sit visibly higher than the early 2024 cohorts at every point along the retention curve. The Q3 2024 cohort, the first to benefit from both the enterprise GTM motion and the revamped onboarding experience, is retaining at rates roughly 10-15 percentage points higher than Q1 2024 at comparable tenure. This is not noise; it is a structural improvement in customer quality and product-market fit that will continue to pay dividends for years.

## 3. The Expansion Engine

The third driver -- and in many ways the one with the highest ceiling -- is the emergence of expansion revenue as a meaningful component of net new MRR. In the first half of 2024, expansion was negligible: most customers were on the starter plan, usage was relatively flat, and there was no systematic motion to drive upsells. Today, expansion MRR routinely accounts for 30-40% of positive net new MRR in a given month, and the trend line is still climbing.

The mechanics are straightforward. Mid-market and enterprise accounts tend to land with a departmental deployment and expand as adoption spreads across the organization. Seat-based pricing means that organic growth in usage translates directly into revenue growth -- often without any sales touch at all. We have also introduced usage-based add-ons and premium tiers that give customers a natural upgrade path as their needs mature. What makes expansion revenue so strategically valuable is its margin profile: there is no customer acquisition cost, no extended sales cycle, and minimal onboarding overhead. Every dollar of expansion MRR drops to contribution margin at a rate far above new logo revenue.

<Grid cols={2}>
  <BarChart data="net_new_mrr" x="month" y="mrr" color="component" title="Net New MRR by Component" yFormat="$~s" xTimeUnit="yearmonth" stack />
  <LineChart data="expansion_pct" x="month" y="expansion_pct" title="Expansion as % of New Revenue" yFormat=".0%" xTimeUnit="yearmonth" />
</Grid>

The stacked bar chart illustrates how the composition of net new MRR has evolved. In early 2024, almost all positive MRR came from new logos, with churn and downgrades consuming a painful share. By mid-2025, the green expansion bars have grown substantially, while churn has shrunk both in absolute terms and as a proportion of the base. These three drivers are not independent -- they form a flywheel. The segment shift toward enterprise improves unit economics and brings in customers who retain longer. Higher retention compounds the installed base, creating a larger addressable pool for expansion. And expansion revenue, earned at high margins, funds further investment in the enterprise GTM motion that started the cycle.

## What This Means

The business is in the early stages of a transition from acquisition-driven growth to expansion-driven growth -- the hallmark of a compounding SaaS company. In an acquisition-driven model, growth is linear: you spend more on sales and marketing, you acquire more customers, revenue goes up. In an expansion-driven model, growth compounds: each cohort of customers becomes more valuable over time, and the cumulative effect of retaining and expanding a growing base creates a revenue trajectory that accelerates even as acquisition spend moderates. The three drivers documented here -- the enterprise segment shift, the retention improvement, and the expansion engine -- are the mechanism by which that transition is happening. They reinforce each other: enterprise customers retain better and expand more, which generates the margin to fund more enterprise GTM, which attracts more enterprise customers. We are not yet at the point where net revenue retention alone drives the growth rate the board expects, but we are trending in that direction. If current trajectories hold, expansion and retention will account for more than half of net new ARR within two to three quarters -- a milestone that would fundamentally change the risk profile and capital efficiency of the business.
