# Executive Metrics Dashboard — Design Spec

## Overview

Redesign the demo SaaS dataset and dashboard to match the polish and complexity of the Puzzle Executive Metrics (L0) reference dashboard. The synthetic data models a post-Series A SaaS company growing from ~$2M to ~$5M ARR over 18 months, with a Stripe-like subscription data model.

**Goals:**
- Replace the existing demo dataset with a richer, more realistic data model
- Create a single dense dashboard page that showcases nsbi's visualization capabilities
- Tell a compelling post-Series A growth story through the data

**Non-goals:**
- Multi-page dashboard (single page, high density)
- Chart-type sampler (every chart earns its spot)
- Matching the Puzzle reference pixel-for-pixel

## Data Model

Three core tables modeled after Stripe-like subscription billing.

### `accounts`

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| name | VARCHAR | Generated company name |
| industry | VARCHAR | `saas`, `fintech`, `ecommerce`, `healthcare`, `education` |
| segment | VARCHAR | `smb`, `mid-market`, `enterprise` — shifts toward enterprise post-Series A |
| signup_date | DATE | When they entered the funnel |
| trial_start_date | DATE | When trial began (nullable — some are direct sales) |
| converted_date | DATE | When they became paid (nullable — not all convert) |
| churned_date | DATE | When they churned (nullable) |
| status | VARCHAR | `trial`, `active`, `churned` |
| source | VARCHAR | `organic`, `paid_search`, `paid_social`, `referral`, `outbound` |

### `subscriptions`

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| account_id | INTEGER FK | |
| plan | VARCHAR | `starter` ($500/mo), `growth` ($2,000/mo), `enterprise` ($5,000+/mo) |
| status | VARCHAR | `active`, `cancelled`, `past_due` |
| mrr | DOUBLE | Current monthly recurring revenue |
| start_date | DATE | |
| end_date | DATE | Nullable |

### `subscription_events`

The key table — every MRR change is logged here, enabling cohort analysis, waterfall charts, and ARR calculations.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| account_id | INTEGER FK | |
| subscription_id | INTEGER FK | |
| event_date | DATE | |
| event_type | VARCHAR | `new`, `expansion`, `downgrade`, `churn`, `reactivation` |
| mrr_delta | DOUBLE | Signed — positive for new/expansion, negative for downgrade/churn |
| mrr_after | DOUBLE | MRR on this subscription after the event |

## Growth Narrative

The data tells a post-Series A inflection story:

- **Months 1-3:** ~15-20 new accounts/month. Early traction, mostly SMB, ASP ~$800/mo, trial conversion ~18%, higher churn (~4%/mo)
- **Months 4-6:** ~25-35 new accounts/month. Starting to find the groove.
- **Month 7:** Series A closes.
- **Months 8-10:** ~60-80 new accounts/month. Hired AEs, ramped paid acquisition, outbound spinning up. Enterprise accounts start appearing.
- **Months 11-14:** ~100-140 new accounts/month. The machine is working.
- **Months 15-18:** ~150-200 new accounts/month. Compounding via referrals, brand, enterprise pipeline.

**Post-Series A shifts:**
- ASP climbs from ~$800/mo to ~$2,500/mo as segment mix shifts upmarket
- Trial-to-paid conversion improves from ~18% to ~25%
- Monthly churn tightens from ~4% to ~2%
- Expansion revenue kicks in as existing accounts upgrade

**Scale:** ~1,500-1,800 accounts, ~1,400+ subscriptions, ~8,000-10,000 subscription events over 18 months. ~400-500 active paid subscriptions by month 18, producing ~$5M ARR.

## Dashboard Design

**Title:** Executive Metrics
**Description:** Key SaaS metrics for board reporting and executive review
**Format:** Single dense YAML page

### KPI Cards (2 rows of 4)

**Row 1 — Account Health:**

| KPI | Value Field | Format | Comparison | isUpGood |
|---|---|---|---|---|
| Active Accounts | active_accounts | num0 | vs. prior month | true |
| Paid Accounts | paid_accounts | num0 | vs. prior month | true |
| New Accounts (30d) | new_accounts_30d | num0 | vs. prior 30d | true |
| Churned Accounts (30d) | churned_accounts_30d | num0 | vs. prior 30d | false |

**Row 2 — Revenue:**

| KPI | Value Field | Format | Comparison | isUpGood |
|---|---|---|---|---|
| ARR | arr | usd0 | vs. prior month | true |
| New ARR (This Month) | new_arr_month | usd0 | vs. prior month | true |
| Churned ARR (All Time) | churned_arr_total | usd0 | — | — |
| Churned ARR (This Month) | churned_arr_month | usd0 | vs. prior month | false |

### Charts (10 charts, 5 rows of 2)

| Row | Left Chart | Right Chart |
|---|---|---|
| 1 | **ARR Growth** — `line` preset. Cumulative ARR over time. | **Net New MRR** — `stacked-column` preset. Monthly MRR components (new, expansion, downgrade, churn). |
| 2 | **MRR Waterfall by Component** — `stacked-column` preset. New/expansion as positive, downgrade/churn as negative, stacked per month. | **MRR by Segment** — `stacked-area` preset. SMB/mid-market/enterprise breakdown over time. |
| 3 | **Trial-to-Paid Conversion Rate** — `line` preset. By monthly signup cohort, ~18%→25%. | **Retention Rate by Cohort** — `line` preset. % of each monthly signup cohort still subscribed after N months. |
| 4 | **Churn Rate by Segment** — `line` preset. SMB higher, enterprise lower, both trending down. | **ASP Trend** — `line` preset. Climbing from ~$800 to ~$2,500. |
| 5 | **Estimated Cohort LTV** — `grouped-column` preset. By quarterly signup cohort. | **Expansion Revenue %** — `line` preset. Expansion MRR as % of total, growing. |

### Tables (1 row)

| Row | Content |
|---|---|
| 6 | **Top Accounts by ARR** — DataTable with columns: account name, industry, segment, current MRR, start date. Top 20 accounts. |

## Platform Changes Required

### BigValue YAML interface extension

The `DashboardPage.tsx` YAML renderer currently only passes `data`, `value`, and `title` to BigValue. Must extend the `big-value` YAML schema to also pass:

- `format` (string) — format for the main value
- `comparison` (string) — field name for the comparison delta
- `comparisonFormat` (string) — format for the comparison value
- `isUpGood` (boolean) — color interpretation

This is a small change to the interface type and the rendering logic in `DashboardPage.tsx`.

## Files to Modify

1. **`demo/scripts/seed.ts`** — Complete rewrite with new data model and growth narrative
2. **`demo/pages/index.yaml`** — Complete rewrite with new dashboard layout
3. **`src/app/DashboardPage.tsx`** — Extend BigValue YAML interface to pass format/comparison/isUpGood

## Files to Remove

4. **`demo/pages/analysis/comparison.yaml`** — No longer relevant (single-page dashboard)
5. **`demo/pages/analysis/growth.yaml`** — No longer relevant
6. **`demo-github/`** — Per user request, drop GitHub example
7. **`demo-stackoverflow/`** — Per user request, drop Stack Overflow example

## Testing

- Run `npx tsx demo/scripts/seed.ts` and verify the DB is created with expected row counts
- Run `npm run dev` and verify all charts render with realistic data
- Verify the growth narrative is visible: ARR curve inflects, ASP climbs, churn tightens
- Verify KPI comparisons show correct deltas with appropriate coloring
