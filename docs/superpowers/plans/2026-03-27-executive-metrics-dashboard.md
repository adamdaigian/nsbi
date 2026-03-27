# Executive Metrics Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a polished single-page executive metrics dashboard with 8 KPI cards, 10 charts, and 1 table, powered by the already-implemented Stripe-like subscription data model.

**Architecture:** The seed script (`demo/scripts/seed.ts`) and BigValue YAML passthrough (`src/app/DashboardPage.tsx`) are already implemented. This plan covers: verifying the seed data, writing the dashboard YAML page, and cleaning up old demo files.

**Tech Stack:** DuckDB (SQL queries), Vega-Lite (charts via presets), YAML (page config)

**Spec:** `docs/superpowers/specs/2026-03-26-executive-metrics-dashboard-design.md`

---

### Task 1: Verify Seed Data Quality

**Files:**
- Run: `demo/scripts/seed.ts`
- Verify: `demo/data/saas.db`

- [ ] **Step 1: Run the seed script**

Run: `npx tsx demo/scripts/seed.ts`
Expected: Output showing row counts — ~1,500+ accounts, ~1,400+ subscriptions, ~8,000+ subscription_events

- [ ] **Step 2: Sanity-check the data with DuckDB queries**

Run a quick validation script to check the growth narrative is present in the data. Use the project's DuckDB to query the generated DB:

```bash
npx tsx -e "
import duckdb from 'duckdb';
const db = new duckdb.Database('demo/data/saas.db');
const conn = new duckdb.Connection(db);
const q = (sql) => new Promise((res, rej) => conn.all(sql, (e, r) => e ? rej(e) : res(r)));

// Total accounts, converted, churned
const totals = await q('SELECT COUNT(*) as total, COUNT(converted_date) as converted, COUNT(churned_date) as churned FROM accounts');
console.log('Account totals:', totals[0]);

// Current ARR (sum of active subscription MRR * 12)
const arr = await q(\"SELECT ROUND(SUM(mrr) * 12) as current_arr FROM subscriptions WHERE status IN ('active', 'past_due')\");
console.log('Current ARR:', arr[0]);

// Monthly new accounts (first 3 vs last 3 to verify acceleration)
const early = await q(\"SELECT COUNT(*) as c FROM accounts WHERE signup_date BETWEEN '2024-01-01' AND '2024-03-31'\");
const late = await q(\"SELECT COUNT(*) as c FROM accounts WHERE signup_date BETWEEN '2025-04-01' AND '2025-06-30'\");
console.log('New accounts Q1-2024:', early[0], 'Q2-2025:', late[0]);

// ASP early vs late
const aspEarly = await q(\"SELECT ROUND(AVG(mrr_delta)) as asp FROM subscription_events WHERE event_type = 'new' AND event_date < '2024-07-01'\");
const aspLate = await q(\"SELECT ROUND(AVG(mrr_delta)) as asp FROM subscription_events WHERE event_type = 'new' AND event_date >= '2025-01-01'\");
console.log('ASP early:', aspEarly[0], 'ASP late:', aspLate[0]);

// Event type distribution
const types = await q('SELECT event_type, COUNT(*) as c FROM subscription_events GROUP BY event_type ORDER BY c DESC');
console.log('Event types:', types);

db.close(() => process.exit(0));
"
```

Expected:
- ~1,500-1,800 total accounts, majority converted
- Current ARR in the $4M-$6M range
- Q2-2025 new accounts >> Q1-2024 new accounts (steep acceleration)
- Late ASP > Early ASP
- Mix of new, expansion, downgrade, churn, reactivation events

If the numbers look wrong (e.g., ARR way off, no acceleration), adjust `MONTHLY_SIGNUPS` or `BASE_MRR` constants in `demo/scripts/seed.ts` and re-run.

- [ ] **Step 3: Commit verified data**

```bash
git add demo/data/saas.db
git commit -m "data: regenerate saas.db with post-Series A growth narrative"
```

---

### Task 2: Write the Executive Metrics Dashboard YAML

**Files:**
- Rewrite: `demo/pages/index.yaml`

This is the core of the project. The YAML defines queries, layout, charts, and tables. All SQL runs against the DuckDB database generated in Task 1.

**Key formatting rules** (from project feedback — intentionally overrides spec's `usd0` format):
- Use `usd_compact` for large dollar values (e.g., `$4.2M` not `$4,200,000`)
- Use `num0` for account counts
- Every KPI comparison must include a `comparisonLabel` (e.g., "vs last month")
- Charts use Vega-Lite presets with `tooltip: true` in encoding where possible

- [ ] **Step 1: Write the full YAML dashboard**

Replace `demo/pages/index.yaml` with the content below. This defines:
- 13 SQL queries
- 2 rows of KPI cards (8 total)
- 10 charts across 5 rows
- 1 table

```yaml
title: Executive Metrics
description: Key SaaS metrics for board reporting and executive review

queries:
  # ── KPI queries ────────────────────────────────────────────
  account_kpis:
    sql: |
      WITH current AS (
        SELECT
          COUNT(*) FILTER (WHERE status IN ('active', 'trial')) as active_accounts,
          COUNT(*) FILTER (WHERE status = 'active') as paid_accounts,
          COUNT(*) FILTER (WHERE signup_date >= CURRENT_DATE - INTERVAL '30 days') as new_accounts_30d,
          COUNT(*) FILTER (WHERE churned_date >= CURRENT_DATE - INTERVAL '30 days') as churned_accounts_30d
        FROM accounts
      ),
      prior AS (
        SELECT
          COUNT(*) FILTER (WHERE status IN ('active', 'trial') OR (churned_date >= CURRENT_DATE - INTERVAL '30 days')) as active_accounts_prior,
          COUNT(*) FILTER (WHERE status = 'active' OR (churned_date >= CURRENT_DATE - INTERVAL '30 days')) as paid_accounts_prior,
          COUNT(*) FILTER (WHERE signup_date >= CURRENT_DATE - INTERVAL '60 days' AND signup_date < CURRENT_DATE - INTERVAL '30 days') as new_accounts_prior,
          COUNT(*) FILTER (WHERE churned_date >= CURRENT_DATE - INTERVAL '60 days' AND churned_date < CURRENT_DATE - INTERVAL '30 days') as churned_accounts_prior
        FROM accounts
      )
      SELECT
        c.active_accounts,
        c.active_accounts - p.active_accounts_prior as active_delta,
        c.paid_accounts,
        c.paid_accounts - p.paid_accounts_prior as paid_delta,
        c.new_accounts_30d,
        c.new_accounts_30d - p.new_accounts_prior as new_delta,
        c.churned_accounts_30d,
        c.churned_accounts_30d - p.churned_accounts_prior as churned_delta
      FROM current c, prior p

  revenue_kpis:
    sql: |
      WITH current_mrr AS (
        SELECT COALESCE(SUM(mrr), 0) as total_mrr
        FROM subscriptions WHERE status IN ('active', 'past_due')
      ),
      monthly_new AS (
        SELECT COALESCE(SUM(mrr_delta), 0) as new_arr_month
        FROM subscription_events
        WHERE event_type = 'new'
          AND DATE_TRUNC('month', event_date) = DATE_TRUNC('month', (SELECT MAX(event_date) FROM subscription_events))
      ),
      prior_new AS (
        SELECT COALESCE(SUM(mrr_delta), 0) as prior_new_arr
        FROM subscription_events
        WHERE event_type = 'new'
          AND DATE_TRUNC('month', event_date) = DATE_TRUNC('month', (SELECT MAX(event_date) FROM subscription_events)) - INTERVAL '1 month'
      ),
      churn_total AS (
        SELECT COALESCE(SUM(ABS(mrr_delta)), 0) as churned_arr_total
        FROM subscription_events WHERE event_type = 'churn'
      ),
      churn_month AS (
        SELECT COALESCE(SUM(ABS(mrr_delta)), 0) as churned_arr_month
        FROM subscription_events
        WHERE event_type = 'churn'
          AND DATE_TRUNC('month', event_date) = DATE_TRUNC('month', (SELECT MAX(event_date) FROM subscription_events))
      ),
      churn_prior AS (
        SELECT COALESCE(SUM(ABS(mrr_delta)), 0) as prior_churn_arr
        FROM subscription_events
        WHERE event_type = 'churn'
          AND DATE_TRUNC('month', event_date) = DATE_TRUNC('month', (SELECT MAX(event_date) FROM subscription_events)) - INTERVAL '1 month'
      )
      SELECT
        cm.total_mrr * 12 as arr,
        (mn.new_arr_month - pn.prior_new_arr) * 12 as arr_delta,
        mn.new_arr_month * 12 as new_arr_month,
        (mn.new_arr_month - pn.prior_new_arr) * 12 as new_arr_delta,
        ct.churned_arr_total * 12 as churned_arr_total,
        chm.churned_arr_month * 12 as churned_arr_month,
        (chm.churned_arr_month - cp.prior_churn_arr) * 12 as churned_arr_delta
      FROM current_mrr cm, monthly_new mn, prior_new pn, churn_total ct, churn_month chm, churn_prior cp

  # ── Chart queries ──────────────────────────────────────────
  arr_growth:
    sql: |
      SELECT
        DATE_TRUNC('month', event_date) as month,
        SUM(SUM(mrr_delta)) OVER (ORDER BY DATE_TRUNC('month', event_date)) * 12 as cumulative_arr
      FROM subscription_events
      GROUP BY DATE_TRUNC('month', event_date)
      ORDER BY month

  net_new_mrr:
    sql: |
      SELECT
        DATE_TRUNC('month', event_date) as month,
        event_type as component,
        SUM(mrr_delta) as amount
      FROM subscription_events
      GROUP BY month, event_type
      ORDER BY month, component

  mrr_waterfall:
    sql: |
      SELECT
        DATE_TRUNC('month', event_date) as month,
        CASE
          WHEN event_type IN ('new', 'reactivation') THEN 'New'
          WHEN event_type = 'expansion' THEN 'Expansion'
          WHEN event_type = 'downgrade' THEN 'Downgrade'
          WHEN event_type = 'churn' THEN 'Churn'
        END as component,
        SUM(mrr_delta) as amount
      FROM subscription_events
      GROUP BY month, component
      ORDER BY month

  mrr_by_segment:
    sql: |
      WITH monthly_mrr AS (
        SELECT
          DATE_TRUNC('month', se.event_date) as month,
          a.segment,
          SUM(SUM(se.mrr_delta)) OVER (PARTITION BY a.segment ORDER BY DATE_TRUNC('month', se.event_date)) as cumulative_mrr
        FROM subscription_events se
        JOIN accounts a ON a.id = se.account_id
        GROUP BY DATE_TRUNC('month', se.event_date), a.segment
      )
      SELECT month, segment, cumulative_mrr
      FROM monthly_mrr
      ORDER BY month, segment

  trial_conversion:
    sql: |
      SELECT
        DATE_TRUNC('month', signup_date) as cohort,
        ROUND(
          COUNT(converted_date)::DOUBLE / NULLIF(COUNT(trial_start_date), 0),
          3
        ) as conversion_rate
      FROM accounts
      WHERE trial_start_date IS NOT NULL
      GROUP BY cohort
      HAVING COUNT(trial_start_date) >= 5
      ORDER BY cohort

  retention_by_cohort:
    sql: |
      WITH cohorts AS (
        SELECT
          a.id as account_id,
          DATE_TRUNC('quarter', a.converted_date) as cohort_quarter,
          a.converted_date,
          a.churned_date
        FROM accounts a
        WHERE a.converted_date IS NOT NULL
      ),
      months_active AS (
        SELECT
          cohort_quarter,
          DATEDIFF('month', converted_date, COALESCE(churned_date, DATE '2025-06-30')) as months_retained,
          COUNT(*) as accounts
        FROM cohorts
        GROUP BY cohort_quarter, months_retained
      )
      SELECT
        cohort_quarter as cohort,
        months_retained,
        SUM(accounts) OVER (PARTITION BY cohort_quarter ORDER BY months_retained DESC) as retained_accounts,
        (SELECT COUNT(*) FROM cohorts c2 WHERE c2.cohort_quarter = months_active.cohort_quarter) as cohort_size
      FROM months_active
      WHERE months_retained <= 12
      ORDER BY cohort, months_retained

  churn_by_segment:
    sql: |
      WITH monthly_churn AS (
        SELECT
          DATE_TRUNC('month', se.event_date) as month,
          a.segment,
          ABS(SUM(CASE WHEN se.event_type = 'churn' THEN se.mrr_delta ELSE 0 END)) as churned_mrr,
          (SELECT SUM(s2.mrr) FROM subscriptions s2
           JOIN accounts a2 ON a2.id = s2.account_id
           WHERE a2.segment = a.segment
             AND s2.start_date <= DATE_TRUNC('month', se.event_date)
             AND (s2.end_date IS NULL OR s2.end_date > DATE_TRUNC('month', se.event_date))
          ) as beginning_mrr
        FROM subscription_events se
        JOIN accounts a ON a.id = se.account_id
        WHERE se.event_type = 'churn'
        GROUP BY month, a.segment
      )
      SELECT
        month,
        segment,
        ROUND(churned_mrr / NULLIF(beginning_mrr, 0), 4) as churn_rate
      FROM monthly_churn
      WHERE beginning_mrr > 0
      ORDER BY month, segment

  asp_trend:
    sql: |
      SELECT
        DATE_TRUNC('month', event_date) as month,
        ROUND(AVG(mrr_delta)) as avg_new_mrr
      FROM subscription_events
      WHERE event_type = 'new'
      GROUP BY month
      HAVING COUNT(*) >= 3
      ORDER BY month

  cohort_ltv:
    sql: |
      WITH cohort_revenue AS (
        SELECT
          DATE_TRUNC('quarter', a.converted_date) as cohort_quarter,
          COUNT(DISTINCT a.id) as cohort_size,
          SUM(se.mrr_delta) FILTER (WHERE se.event_type != 'churn') as total_revenue
        FROM accounts a
        JOIN subscription_events se ON se.account_id = a.id
        WHERE a.converted_date IS NOT NULL
        GROUP BY cohort_quarter
      )
      SELECT
        cohort_quarter as cohort,
        ROUND(total_revenue / NULLIF(cohort_size, 0)) as estimated_ltv
      FROM cohort_revenue
      ORDER BY cohort

  expansion_pct:
    sql: |
      SELECT
        DATE_TRUNC('month', event_date) as month,
        ROUND(
          SUM(CASE WHEN event_type = 'expansion' THEN mrr_delta ELSE 0 END) /
          NULLIF(SUM(CASE WHEN event_type IN ('new', 'reactivation') THEN mrr_delta ELSE 0 END), 0),
          3
        ) as expansion_ratio
      FROM subscription_events
      WHERE mrr_delta > 0
      GROUP BY month
      ORDER BY month

  top_accounts:
    sql: |
      SELECT
        a.name as account,
        a.industry,
        a.segment,
        s.plan,
        s.mrr as current_mrr,
        a.converted_date as customer_since
      FROM accounts a
      JOIN subscriptions s ON s.account_id = a.id
      WHERE s.status IN ('active', 'past_due')
      ORDER BY s.mrr DESC
      LIMIT 20

layout:
  # ── KPI Row 1: Account Health ──────────────────────────────
  - row:
    - big-value:
        data: account_kpis
        value: active_accounts
        format: num0
        comparison: active_delta
        comparisonFormat: num0
        comparisonLabel: vs last month
        title: Active Accounts
    - big-value:
        data: account_kpis
        value: paid_accounts
        format: num0
        comparison: paid_delta
        comparisonFormat: num0
        comparisonLabel: vs last month
        title: Paid Accounts
    - big-value:
        data: account_kpis
        value: new_accounts_30d
        format: num0
        comparison: new_delta
        comparisonFormat: num0
        comparisonLabel: vs prior 30d
        title: New Accounts (30d)
    - big-value:
        data: account_kpis
        value: churned_accounts_30d
        format: num0
        comparison: churned_delta
        comparisonFormat: num0
        comparisonLabel: vs prior 30d
        isUpGood: false
        title: Churned Accounts (30d)

  # ── KPI Row 2: Revenue ─────────────────────────────────────
  - row:
    - big-value:
        data: revenue_kpis
        value: arr
        format: usd_compact
        comparison: arr_delta
        comparisonFormat: usd_compact
        comparisonLabel: vs last month
        title: ARR
    - big-value:
        data: revenue_kpis
        value: new_arr_month
        format: usd_compact
        comparison: new_arr_delta
        comparisonFormat: usd_compact
        comparisonLabel: vs last month
        title: New ARR (This Month)
    - big-value:
        data: revenue_kpis
        value: churned_arr_total
        format: usd_compact
        title: Churned ARR (All Time)
    - big-value:
        data: revenue_kpis
        value: churned_arr_month
        format: usd_compact
        comparison: churned_arr_delta
        comparisonFormat: usd_compact
        comparisonLabel: vs last month
        isUpGood: false
        title: Churned ARR (This Month)

  # ── Charts ─────────────────────────────────────────────────
  - row:
    - chart: arr_growth
    - chart: net_new_mrr
  - row:
    - chart: mrr_waterfall
    - chart: mrr_by_segment
  - row:
    - chart: trial_conversion
    - chart: retention_cohort
  - row:
    - chart: churn_segment
    - chart: asp_trend
  - row:
    - chart: cohort_ltv
    - chart: expansion_pct

  # ── Table ──────────────────────────────────────────────────
  - row:
    - table: top_accounts

charts:
  arr_growth:
    data: arr_growth
    title: ARR Growth
    preset: line
    spec:
      encoding:
        x: { field: month, type: temporal, timeUnit: yearmonth, title: null }
        y: { field: cumulative_arr, type: quantitative, title: ARR ($), axis: { format: "$,.0f" } }
        tooltip:
          - { field: month, type: temporal, timeUnit: yearmonth, title: Month }
          - { field: cumulative_arr, type: quantitative, title: ARR, format: "$,.0f" }

  net_new_mrr:
    data: net_new_mrr
    title: Net New MRR by Component
    preset: stacked-column
    spec:
      encoding:
        x: { field: month, type: temporal, timeUnit: yearmonth, title: null }
        y: { field: amount, type: quantitative, title: MRR ($), axis: { format: "$,.0f" } }
        color: { field: component, type: nominal, title: Type }
        tooltip:
          - { field: month, type: temporal, timeUnit: yearmonth, title: Month }
          - { field: component, type: nominal, title: Type }
          - { field: amount, type: quantitative, title: MRR, format: "$,.0f" }

  mrr_waterfall:
    data: mrr_waterfall
    title: MRR Waterfall
    preset: stacked-column
    spec:
      encoding:
        x: { field: month, type: temporal, timeUnit: yearmonth, title: null }
        y: { field: amount, type: quantitative, title: MRR ($), axis: { format: "$,.0f" } }
        color:
          field: component
          type: nominal
          title: Component
          scale:
            domain: [New, Expansion, Downgrade, Churn]
            range: ["#2563eb", "#22c55e", "#f97316", "#ef4444"]
        tooltip:
          - { field: month, type: temporal, timeUnit: yearmonth, title: Month }
          - { field: component, type: nominal, title: Component }
          - { field: amount, type: quantitative, title: MRR, format: "$,.0f" }

  mrr_by_segment:
    data: mrr_by_segment
    title: MRR by Segment
    preset: stacked-area
    spec:
      encoding:
        x: { field: month, type: temporal, timeUnit: yearmonth, title: null }
        y: { field: cumulative_mrr, type: quantitative, title: MRR ($), axis: { format: "$,.0f" } }
        color:
          field: segment
          type: nominal
          title: Segment
          scale:
            domain: [enterprise, mid-market, smb]
            range: ["#2563eb", "#8b5cf6", "#06b6d4"]
        tooltip:
          - { field: month, type: temporal, timeUnit: yearmonth, title: Month }
          - { field: segment, type: nominal, title: Segment }
          - { field: cumulative_mrr, type: quantitative, title: MRR, format: "$,.0f" }

  trial_conversion:
    data: trial_conversion
    title: Trial-to-Paid Conversion Rate
    preset: line
    spec:
      encoding:
        x: { field: cohort, type: temporal, timeUnit: yearmonth, title: Signup Cohort }
        y: { field: conversion_rate, type: quantitative, title: Conversion Rate, axis: { format: ".0%" } }
        tooltip:
          - { field: cohort, type: temporal, timeUnit: yearmonth, title: Cohort }
          - { field: conversion_rate, type: quantitative, title: Conv. Rate, format: ".1%" }

  retention_cohort:
    data: retention_by_cohort
    title: Retention by Cohort
    preset: line
    spec:
      encoding:
        x: { field: months_retained, type: quantitative, title: Months Since Conversion }
        y:
          field: retained_accounts
          type: quantitative
          title: Retained Accounts
        color: { field: cohort, type: temporal, timeUnit: yearquarter, title: Cohort }
        tooltip:
          - { field: cohort, type: temporal, timeUnit: yearquarter, title: Cohort }
          - { field: months_retained, type: quantitative, title: Month }
          - { field: retained_accounts, type: quantitative, title: Retained }

  churn_segment:
    data: churn_by_segment
    title: Churn Rate by Segment
    preset: line
    spec:
      encoding:
        x: { field: month, type: temporal, timeUnit: yearmonth, title: null }
        y: { field: churn_rate, type: quantitative, title: Monthly Churn Rate, axis: { format: ".1%" } }
        color:
          field: segment
          type: nominal
          title: Segment
          scale:
            domain: [enterprise, mid-market, smb]
            range: ["#2563eb", "#8b5cf6", "#06b6d4"]
        tooltip:
          - { field: month, type: temporal, timeUnit: yearmonth, title: Month }
          - { field: segment, type: nominal, title: Segment }
          - { field: churn_rate, type: quantitative, title: Churn Rate, format: ".2%" }

  asp_trend:
    data: asp_trend
    title: Average Selling Price (New Business)
    preset: line
    spec:
      encoding:
        x: { field: month, type: temporal, timeUnit: yearmonth, title: null }
        y: { field: avg_new_mrr, type: quantitative, title: Avg MRR ($), axis: { format: "$,.0f" } }
        tooltip:
          - { field: month, type: temporal, timeUnit: yearmonth, title: Month }
          - { field: avg_new_mrr, type: quantitative, title: Avg MRR, format: "$,.0f" }

  cohort_ltv:
    data: cohort_ltv
    title: Estimated Cohort LTV
    preset: grouped-column
    spec:
      encoding:
        x: { field: cohort, type: temporal, timeUnit: yearquarter, title: Signup Cohort }
        y: { field: estimated_ltv, type: quantitative, title: Est. LTV ($), axis: { format: "$,.0f" } }
        tooltip:
          - { field: cohort, type: temporal, timeUnit: yearquarter, title: Cohort }
          - { field: estimated_ltv, type: quantitative, title: Est. LTV, format: "$,.0f" }

  expansion_pct:
    data: expansion_pct
    title: Expansion Revenue Ratio
    preset: line
    spec:
      encoding:
        x: { field: month, type: temporal, timeUnit: yearmonth, title: null }
        y: { field: expansion_ratio, type: quantitative, title: Expansion / New Revenue, axis: { format: ".0%" } }
        tooltip:
          - { field: month, type: temporal, timeUnit: yearmonth, title: Month }
          - { field: expansion_ratio, type: quantitative, title: Ratio, format: ".1%" }

tables:
  top_accounts:
    data: top_accounts
    title: Top 20 Accounts by MRR
```

- [ ] **Step 2: Verify YAML is valid**

Run: `npx tsx -e "import yaml from 'js-yaml'; import fs from 'fs'; const c = yaml.load(fs.readFileSync('demo/pages/index.yaml', 'utf8')); console.log('Queries:', Object.keys(c.queries).length); console.log('Charts:', Object.keys(c.charts).length); console.log('Tables:', Object.keys(c.tables).length); console.log('Layout rows:', c.layout.length);"`

Expected:
- Queries: 13
- Charts: 10
- Tables: 1
- Layout rows: 8

- [ ] **Step 3: Commit**

```bash
git add demo/pages/index.yaml
git commit -m "feat: rewrite SaaS dashboard as executive metrics L0"
```

---

### Task 3: Remove Old Demo Files

`demo/pages/analysis/` and `demo-github/` were already removed in prior work. Only `demo-stackoverflow/` remains.

**Files:**
- Delete: `demo-stackoverflow/` (entire directory)

- [ ] **Step 1: Remove demo-stackoverflow**

```bash
rm -rf demo-stackoverflow
```

- [ ] **Step 2: Verify no broken references**

Search for any imports or references to the removed directory:

```bash
grep -r "demo-stackoverflow" src/ cli/ demo/ --include="*.ts" --include="*.tsx" --include="*.yaml" --include="*.json"
```

Expected: No matches (or only the spec doc reference, which is fine).

- [ ] **Step 3: Commit**

```bash
git add -A demo-stackoverflow
git commit -m "chore: remove demo-stackoverflow example"
```

---

### Task 4: Visual Verification

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Verify dashboard loads**

Open the dashboard in a browser. Check:
- All 8 KPI cards render with values and comparison deltas
- ARR is in the ~$4M-$6M range, displayed as compact format (e.g., "$4.8M")
- All 10 charts render with data
- ARR Growth line shows upward trajectory with inflection
- MRR Waterfall shows positive new/expansion bars and negative churn/downgrade bars
- Trial-to-Paid conversion shows improvement over time
- Churn Rate by Segment shows SMB > mid-market > enterprise
- ASP Trend shows upward climb
- Top Accounts table renders with 20 rows

- [ ] **Step 3: Fix any rendering issues**

If any queries fail or charts look wrong, debug by:
1. Checking browser console for SQL errors
2. Running the failing SQL directly against the DB
3. Adjusting the query or chart spec

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: adjust dashboard queries for correct rendering"
```
