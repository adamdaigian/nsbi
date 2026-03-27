# Executive Metrics Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the demo SaaS dataset and dashboard with a richer post-Series A growth story, and extend the BigValue YAML interface to support comparison deltas.

**Architecture:** Three files are rewritten (seed.ts, index.yaml, DashboardPage.tsx), old demo pages/dirs are removed. The seed script generates three tables (accounts, subscriptions, subscription_events) modeling a Stripe-like subscription business growing from ~$2M to ~$5M ARR over 18 months. The dashboard YAML defines 8 KPI cards, 10 charts, and 1 table all powered by SQL queries against this data.

**Tech Stack:** TypeScript, DuckDB (node-duckdb), YAML dashboards, Vega-Lite charts, React (BigValue/Delta components)

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `src/app/DashboardPage.tsx` | Extend `BigValueItem` type to pass format/comparison/isUpGood through to `<BigValue>` |
| Rewrite | `demo/scripts/seed.ts` | Generate accounts, subscriptions, subscription_events tables with growth narrative |
| Rewrite | `demo/pages/index.yaml` | 8 KPI cards + 10 charts + 1 table with SQL queries |
| Delete | `demo/pages/analysis/comparison.yaml` | No longer relevant |
| Delete | `demo/pages/analysis/growth.yaml` | No longer relevant |
| Delete | `demo-github/` | Per spec, drop GitHub example |
| Delete | `scripts/generate-saas-data.ts` | Old data model, writes incompatible schema to same DB |

---

## Task 1: Extend BigValue YAML Interface

**Files:**
- Modify: `src/app/DashboardPage.tsx:14-16` (BigValueItem type) and `:173-180` (rendering)

- [ ] **Step 1: Update BigValueItem type**

In `src/app/DashboardPage.tsx`, replace the current `BigValueItem` interface (line 14-16):

```typescript
interface BigValueItem {
  'big-value': { data: string; value: string; title?: string }
}
```

with:

```typescript
interface BigValueItem {
  'big-value': {
    data: string
    value: string
    title?: string
    format?: string
    comparison?: string
    comparisonFormat?: string
    isUpGood?: boolean
  }
}
```

- [ ] **Step 2: Pass new props to BigValue component**

In the same file, replace the BigValue rendering block (lines 173-180):

```typescript
            if (isBigValue(item)) {
              const bv = item['big-value']
              const data = queryResults[bv.data] || []
              return (
                <div key={itemIdx} className="flex-1 min-w-0">
                  <BigValue data={data} value={bv.value} title={bv.title} />
                </div>
              )
            }
```

with:

```typescript
            if (isBigValue(item)) {
              const bv = item['big-value']
              const data = queryResults[bv.data] || []
              return (
                <div key={itemIdx} className="flex-1 min-w-0">
                  <BigValue
                    data={data}
                    value={bv.value}
                    title={bv.title}
                    format={bv.format}
                    comparison={bv.comparison}
                    comparisonFormat={bv.comparisonFormat}
                    isUpGood={bv.isUpGood}
                  />
                </div>
              )
            }
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors related to BigValue or DashboardPage

- [ ] **Step 4: Commit**

```bash
git add src/app/DashboardPage.tsx
git commit -m "feat: extend BigValue YAML interface with format/comparison/isUpGood"
```

---

## Task 2: Rewrite Seed Script

**Files:**
- Rewrite: `demo/scripts/seed.ts`

The seed script generates three tables modeling a post-Series A SaaS company. The growth narrative spans 18 months (Jan 2024 - Jun 2025) with an inflection around month 7 (Series A).

- [ ] **Step 1: Write the complete seed script**

Replace `demo/scripts/seed.ts` with:

```typescript
/**
 * Seed script — generates demo/data/saas.db with post-Series A SaaS data.
 *
 * Data model: accounts, subscriptions, subscription_events
 * Growth narrative: ~$2M → ~$5M ARR over 18 months
 *
 * Run: npx tsx demo/scripts/seed.ts
 */
import duckdb from "duckdb";
import path from "path";
import fs from "fs";

const DB_PATH = path.resolve(import.meta.dirname, "../data/saas.db");

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);

const db = await new Promise<duckdb.Database>((resolve, reject) => {
  const instance = new duckdb.Database(DB_PATH, (err: Error | null) => {
    if (err) return reject(err);
    resolve(instance);
  });
});
const conn = new duckdb.Connection(db);

function run(sql: string): Promise<void> {
  return new Promise((resolve, reject) => {
    conn.run(sql, (err: Error | null) => (err ? reject(err) : resolve()));
  });
}

function query(sql: string): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    conn.all(sql, (err: Error | null, rows: Record<string, unknown>[]) =>
      err ? reject(err) : resolve(rows ?? []),
    );
  });
}

// ── Configuration ──────────────────────────────────────────────────

// Monthly new account targets — tells the Series A inflection story
const MONTHLY_SIGNUPS = [
  18, 17, 20,          // months 1-3: early traction, mostly SMB
  28, 32, 35,          // months 4-6: finding the groove
  45,                   // month 7: Series A closes
  65, 72, 80,          // months 8-10: hired AEs, ramped paid, outbound spinning up
  105, 118, 132, 142,  // months 11-14: the machine is working
  158, 172, 188, 198,  // months 15-18: compounding via referrals, brand, enterprise
];

const INDUSTRIES = ["saas", "fintech", "ecommerce", "healthcare", "education"];

const SOURCES = ["organic", "paid_search", "paid_social", "referral", "outbound"];
const SOURCE_WEIGHTS_EARLY = [0.35, 0.30, 0.15, 0.15, 0.05];
const SOURCE_WEIGHTS_LATE = [0.20, 0.20, 0.15, 0.25, 0.20];

const SEGMENTS = ["smb", "mid-market", "enterprise"] as const;
const SEG_WEIGHTS_EARLY = [0.70, 0.25, 0.05];
const SEG_WEIGHTS_MID = [0.50, 0.35, 0.15];
const SEG_WEIGHTS_LATE = [0.35, 0.35, 0.30];

const PLAN_FOR_SEGMENT: Record<string, string> = {
  smb: "starter",
  "mid-market": "growth",
  enterprise: "enterprise",
};

const BASE_MRR: Record<string, number> = {
  starter: 500,
  growth: 2000,
  enterprise: 5500,
};

const PREFIXES = [
  "Apex", "Atlas", "Beacon", "Bolt", "Bright", "Cedar", "Cloud", "Core",
  "Crest", "Dash", "Edge", "Ember", "Flux", "Forge", "Grid", "Harbor",
  "Hive", "Ion", "Jade", "Key", "Layer", "Link", "Loom", "Lumen",
  "Mesa", "Mint", "Nexus", "Node", "Nova", "Oak", "Orbit", "Osprey",
  "Pave", "Peak", "Pine", "Pixel", "Plume", "Prism", "Pulse", "Quill",
  "Rally", "Ridge", "River", "Sage", "Scale", "Signal", "Slate", "Snap",
  "Solar", "Spark", "Spire", "Stack", "Stone", "Storm", "Summit", "Swift",
  "Terra", "Tide", "Trail", "True", "Vault", "Vibe", "Vista", "Wave",
  "Zen", "Zero", "Zone",
];

const SUFFIXES = [
  "AI", "App", "Base", "Bit", "Box", "Bridge", "Cast", "Cloud",
  "Co", "Craft", "Data", "Desk", "Dev", "Dock", "Flow", "Forge",
  "Gate", "Grid", "Hub", "IO", "IQ", "Kit", "Lab", "Labs",
  "Logic", "Loop", "Ly", "Mind", "Net", "Ops", "Path", "Pay",
  "Pilot", "Point", "Port", "Pro", "Pulse", "Raft", "Run", "Sail",
  "Scope", "Sense", "Ship", "Sight", "Soft", "Spark", "Spot", "Stack",
  "Stream", "Sync", "Systems", "Tech", "Track", "Up", "Vault", "Verse",
  "Ware", "Wave", "Wire", "Works", "X", "Zen",
];

// ── Helpers ─────────────────────────────────────────────────────────

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function weightedPick<T>(arr: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < arr.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return arr[i]!;
  }
  return arr[arr.length - 1]!;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86400000);
}

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function phase(m: number): "early" | "mid" | "late" {
  if (m < 6) return "early";
  if (m < 12) return "mid";
  return "late";
}

function mrrNoise(base: number): number {
  return Math.round(base * (0.85 + Math.random() * 0.30));
}

// ── Types ───────────────────────────────────────────────────────────

interface Account {
  id: number;
  name: string;
  industry: string;
  segment: string;
  signup_date: Date;
  trial_start_date: Date | null;
  converted_date: Date | null;
  churned_date: Date | null;
  status: string;
  source: string;
}

interface Subscription {
  id: number;
  account_id: number;
  plan: string;
  status: string;
  mrr: number;
  start_date: Date;
  end_date: Date | null;
}

interface SubEvent {
  id: number;
  account_id: number;
  subscription_id: number;
  event_date: Date;
  event_type: string;
  mrr_delta: number;
  mrr_after: number;
}

// ── Main ────────────────────────────────────────────────────────────

async function seed() {
  console.log("Seeding executive metrics database...\n");

  // ── Create tables ─────────────────────────────────────────────

  await run(`
    CREATE TABLE accounts (
      id INTEGER PRIMARY KEY,
      name VARCHAR NOT NULL,
      industry VARCHAR NOT NULL,
      segment VARCHAR NOT NULL,
      signup_date DATE NOT NULL,
      trial_start_date DATE,
      converted_date DATE,
      churned_date DATE,
      status VARCHAR NOT NULL,
      source VARCHAR NOT NULL
    )
  `);

  await run(`
    CREATE TABLE subscriptions (
      id INTEGER PRIMARY KEY,
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      plan VARCHAR NOT NULL,
      status VARCHAR NOT NULL,
      mrr DOUBLE NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE
    )
  `);

  await run(`
    CREATE TABLE subscription_events (
      id INTEGER PRIMARY KEY,
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      subscription_id INTEGER NOT NULL REFERENCES subscriptions(id),
      event_date DATE NOT NULL,
      event_type VARCHAR NOT NULL,
      mrr_delta DOUBLE NOT NULL,
      mrr_after DOUBLE NOT NULL
    )
  `);

  // ── Generate accounts ─────────────────────────────────────────

  const usedNames = new Set<string>();
  function genName(): string {
    for (let i = 0; i < 100; i++) {
      const name = `${pick(PREFIXES)}${pick(SUFFIXES)}`;
      if (!usedNames.has(name)) {
        usedNames.add(name);
        return name;
      }
    }
    const name = `Company${usedNames.size + 1}`;
    usedNames.add(name);
    return name;
  }

  const accounts: Account[] = [];
  let nextAccountId = 0;

  for (let m = 0; m < 18; m++) {
    const count = MONTHLY_SIGNUPS[m]!;
    const p = phase(m);
    const segW = p === "early" ? SEG_WEIGHTS_EARLY : p === "mid" ? SEG_WEIGHTS_MID : SEG_WEIGHTS_LATE;
    const srcW = p === "early" ? SOURCE_WEIGHTS_EARLY : SOURCE_WEIGHTS_LATE;

    // Conversion and churn rates by phase
    const trialConvRate = p === "early" ? 0.50 : p === "mid" ? 0.58 : 0.65;
    const directConvRate = p === "early" ? 0.80 : p === "mid" ? 0.85 : 0.90;
    const baseChurn = p === "early" ? 0.04 : p === "mid" ? 0.03 : 0.02;

    for (let i = 0; i < count; i++) {
      nextAccountId++;
      const day = 1 + rand(0, 27);
      const signup_date = new Date(2024, m, day);
      const segment = weightedPick([...SEGMENTS], segW);
      const industry = pick(INDUSTRIES);
      const source = weightedPick(SOURCES, srcW);

      // Enterprise more likely direct (no trial)
      const hasTrial = segment === "enterprise" ? Math.random() < 0.35 : Math.random() < 0.75;
      const convRate = hasTrial ? trialConvRate : directConvRate;
      const converts = Math.random() < convRate;

      let trial_start_date: Date | null = null;
      let converted_date: Date | null = null;
      let churned_date: Date | null = null;
      let status: string;

      if (hasTrial) {
        trial_start_date = signup_date;
      }

      if (converts) {
        converted_date = hasTrial
          ? addDays(signup_date, rand(10, 21))
          : addDays(signup_date, rand(1, 5));

        // Determine if this account eventually churns
        const churnMult = segment === "smb" ? 1.5 : segment === "enterprise" ? 0.5 : 1.0;
        const monthsRemaining = 17 - m;
        const churnProb = 1 - Math.pow(1 - baseChurn * churnMult, Math.max(monthsRemaining, 1));

        if (Math.random() < churnProb) {
          const minChurnMonth = Math.min(m + 2, 17);
          const churnMonth = rand(minChurnMonth, 17);
          churned_date = new Date(2024, churnMonth, 1 + rand(0, 27));
          status = "churned";
        } else {
          status = "active";
        }
      } else {
        status = "trial";
      }

      accounts.push({
        id: nextAccountId, name: genName(), industry, segment,
        signup_date, trial_start_date, converted_date, churned_date,
        status, source,
      });
    }
  }

  // Insert accounts in batches
  const BATCH = 100;
  for (let i = 0; i < accounts.length; i += BATCH) {
    const vals = accounts.slice(i, i + BATCH).map(a =>
      `(${a.id}, '${a.name}', '${a.industry}', '${a.segment}', '${fmt(a.signup_date)}', ` +
      `${a.trial_start_date ? `'${fmt(a.trial_start_date)}'` : "NULL"}, ` +
      `${a.converted_date ? `'${fmt(a.converted_date)}'` : "NULL"}, ` +
      `${a.churned_date ? `'${fmt(a.churned_date)}'` : "NULL"}, ` +
      `'${a.status}', '${a.source}')`
    ).join(",\n");
    await run(`INSERT INTO accounts VALUES ${vals}`);
  }
  console.log(`  ✓ accounts (${accounts.length} rows)`);

  // ── Generate subscriptions + events ───────────────────────────

  const subscriptions: Subscription[] = [];
  const events: SubEvent[] = [];
  let nextSubId = 0;
  let nextEventId = 0;

  const converted = accounts.filter(a => a.converted_date !== null);

  for (const acct of converted) {
    nextSubId++;
    const plan = PLAN_FOR_SEGMENT[acct.segment]!;
    const mrr = mrrNoise(BASE_MRR[plan]!);

    const sub: Subscription = {
      id: nextSubId, account_id: acct.id, plan,
      status: acct.status === "churned" ? "cancelled" : "active",
      mrr, start_date: acct.converted_date!, end_date: acct.churned_date,
    };
    subscriptions.push(sub);

    // 'new' event
    nextEventId++;
    events.push({
      id: nextEventId, account_id: acct.id, subscription_id: sub.id,
      event_date: acct.converted_date!, event_type: "new",
      mrr_delta: mrr, mrr_after: mrr,
    });

    // Simulate monthly lifecycle — expansion/downgrade events
    const startM = (acct.converted_date!.getFullYear() - 2024) * 12 + acct.converted_date!.getMonth();
    const endM = acct.churned_date
      ? (acct.churned_date.getFullYear() - 2024) * 12 + acct.churned_date.getMonth()
      : 17;
    let currentMrr = mrr;

    for (let mo = startM + 1; mo <= endM; mo++) {
      const p = phase(mo);

      // Expansion: more likely in later phases (machine working)
      const expChance = p === "early" ? 0.06 : p === "mid" ? 0.10 : 0.14;
      if (Math.random() < expChance && currentMrr > 0) {
        const increase = Math.round(currentMrr * (0.08 + Math.random() * 0.22));
        currentMrr += increase;
        nextEventId++;
        events.push({
          id: nextEventId, account_id: acct.id, subscription_id: sub.id,
          event_date: new Date(2024, mo, 1 + rand(0, 27)), event_type: "expansion",
          mrr_delta: increase, mrr_after: currentMrr,
        });
      }

      // Downgrade: rare
      if (Math.random() < 0.015 && currentMrr > BASE_MRR.starter!) {
        const decrease = Math.round(currentMrr * (0.08 + Math.random() * 0.12));
        currentMrr -= decrease;
        nextEventId++;
        events.push({
          id: nextEventId, account_id: acct.id, subscription_id: sub.id,
          event_date: new Date(2024, mo, 1 + rand(0, 27)), event_type: "downgrade",
          mrr_delta: -decrease, mrr_after: currentMrr,
        });
      }
    }

    // Churn event
    if (acct.churned_date) {
      nextEventId++;
      events.push({
        id: nextEventId, account_id: acct.id, subscription_id: sub.id,
        event_date: acct.churned_date, event_type: "churn",
        mrr_delta: -currentMrr, mrr_after: 0,
      });
      currentMrr = 0;
    }

    // Update subscription final MRR
    sub.mrr = acct.status === "churned" ? 0 : currentMrr;
  }

  // Reactivations: ~8% of churned accounts come back
  const churned = accounts.filter(a => a.status === "churned" && a.churned_date);
  for (const acct of churned) {
    if (Math.random() > 0.08) continue;

    const churnM = (acct.churned_date!.getFullYear() - 2024) * 12 + acct.churned_date!.getMonth();
    const reactM = Math.min(churnM + rand(1, 3), 17);
    const reactDate = new Date(2024, reactM, 1 + rand(0, 27));

    nextSubId++;
    const plan = PLAN_FOR_SEGMENT[acct.segment]!;
    const mrr = mrrNoise(BASE_MRR[plan]!);

    subscriptions.push({
      id: nextSubId, account_id: acct.id, plan,
      status: "active", mrr, start_date: reactDate, end_date: null,
    });

    nextEventId++;
    events.push({
      id: nextEventId, account_id: acct.id, subscription_id: nextSubId,
      event_date: reactDate, event_type: "reactivation",
      mrr_delta: mrr, mrr_after: mrr,
    });

    acct.status = "active";
    acct.churned_date = null;
  }

  // Insert subscriptions
  for (let i = 0; i < subscriptions.length; i += BATCH) {
    const vals = subscriptions.slice(i, i + BATCH).map(s =>
      `(${s.id}, ${s.account_id}, '${s.plan}', '${s.status}', ${s.mrr}, ` +
      `'${fmt(s.start_date)}', ${s.end_date ? `'${fmt(s.end_date)}'` : "NULL"})`
    ).join(",\n");
    await run(`INSERT INTO subscriptions VALUES ${vals}`);
  }
  console.log(`  ✓ subscriptions (${subscriptions.length} rows)`);

  // Insert events
  for (let i = 0; i < events.length; i += BATCH) {
    const vals = events.slice(i, i + BATCH).map(e =>
      `(${e.id}, ${e.account_id}, ${e.subscription_id}, '${fmt(e.event_date)}', ` +
      `'${e.event_type}', ${e.mrr_delta}, ${e.mrr_after})`
    ).join(",\n");
    await run(`INSERT INTO subscription_events VALUES ${vals}`);
  }
  console.log(`  ✓ subscription_events (${events.length} rows)`);

  // ── Verify ────────────────────────────────────────────────────

  const tables = await query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'main' ORDER BY table_name",
  );
  const counts = await query(`
    SELECT
      (SELECT COUNT(*) FROM accounts) as accounts,
      (SELECT COUNT(*) FROM subscriptions) as subscriptions,
      (SELECT COUNT(*) FROM subscription_events) as events
  `);
  const c = counts[0]!;
  console.log(`\nDone! Tables: ${tables.map(t => t.table_name).join(", ")}`);
  console.log(`  accounts:            ${c.accounts}`);
  console.log(`  subscriptions:       ${c.subscriptions}`);
  console.log(`  subscription_events: ${c.events}`);
  console.log(`Database: ${DB_PATH}`);

  db.close(() => process.exit(0));
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Run the seed script**

Run: `npx tsx demo/scripts/seed.ts`
Expected output (approximate):
```
Seeding executive metrics database...

  ✓ accounts (~1650 rows)
  ✓ subscriptions (~1400 rows)
  ✓ subscription_events (~2000+ rows)

Done! Tables: accounts, subscription_events, subscriptions
```

- [ ] **Step 3: Verify row counts meet spec targets**

Run: `npx tsx -e "
import duckdb from 'duckdb';
const db = new duckdb.Database('demo/data/saas.db');
const conn = new duckdb.Connection(db);
conn.all(\`
  SELECT
    (SELECT COUNT(*) FROM accounts) as accounts,
    (SELECT COUNT(*) FROM accounts WHERE status = 'active') as active,
    (SELECT COUNT(*) FROM subscriptions) as subs,
    (SELECT COUNT(*) FROM subscriptions WHERE status = 'active') as active_subs,
    (SELECT COUNT(*) FROM subscription_events) as events,
    (SELECT ROUND(SUM(mrr) * 12) FROM subscriptions WHERE status = 'active') as arr
\`, (err, rows) => { console.log(rows[0]); db.close(() => {}); });
"`

Expected:
- accounts: ~1,500-1,800
- active: ~400-600
- subs: ~1,200+
- active_subs: ~400-500
- events: ~2,000+ (expansion events increase this; tune `expChance` if needed)
- arr: ~$4M-$6M range

**Tuning note:** If subscription_events count is too low, increase the `expChance` values in the lifecycle simulation loop. If ARR is outside the $4-6M range, adjust `BASE_MRR` values or the churn probabilities.

- [ ] **Step 4: Verify the growth narrative in the data**

Run: `npx tsx -e "
import duckdb from 'duckdb';
const db = new duckdb.Database('demo/data/saas.db');
const conn = new duckdb.Connection(db);
conn.all(\`
  SELECT
    DATE_TRUNC('month', signup_date) as month,
    COUNT(*) as signups,
    COUNT(*) FILTER (WHERE segment = 'enterprise') as enterprise
  FROM accounts
  GROUP BY month ORDER BY month
\`, (err, rows) => { rows.forEach(r => console.log(r)); db.close(() => {}); });
"`

Expected: monthly signups should increase from ~15-20 to ~150-200, with enterprise accounts appearing more in later months.

- [ ] **Step 5: Commit**

```bash
git add demo/scripts/seed.ts demo/data/saas.db
git commit -m "feat: rewrite seed script with post-Series A SaaS data model"
```

---

## Task 3: Rewrite Dashboard YAML

**Files:**
- Rewrite: `demo/pages/index.yaml`

This task replaces the dashboard with 8 KPI cards (2 rows of 4), 10 charts (5 rows of 2), and 1 data table.

- [ ] **Step 1: Write the complete dashboard YAML**

Replace `demo/pages/index.yaml` with:

```yaml
title: Executive Metrics
description: Key SaaS metrics for board reporting and executive review

queries:
  account_kpis:
    sql: |
      SELECT
        (SELECT COUNT(*) FROM accounts WHERE status = 'active') as active_accounts,
        (SELECT COUNT(*) FROM accounts WHERE status = 'active' AND signup_date >= DATE '2025-06-01')
        - (SELECT COUNT(*) FROM accounts WHERE churned_date >= DATE '2025-06-01' AND churned_date IS NOT NULL)
        - (
          (SELECT COUNT(*) FROM accounts WHERE status = 'active' AND signup_date >= DATE '2025-05-01' AND signup_date < DATE '2025-06-01')
          - (SELECT COUNT(*) FROM accounts WHERE churned_date >= DATE '2025-05-01' AND churned_date < DATE '2025-06-01' AND churned_date IS NOT NULL)
        ) as active_accounts_delta,

        (SELECT COUNT(*) FROM accounts WHERE converted_date IS NOT NULL AND status = 'active') as paid_accounts,
        (SELECT COUNT(*) FROM accounts WHERE converted_date >= DATE '2025-06-01')
        - (SELECT COUNT(*) FROM accounts WHERE churned_date >= DATE '2025-06-01' AND churned_date IS NOT NULL)
        - (
          (SELECT COUNT(*) FROM accounts WHERE converted_date >= DATE '2025-05-01' AND converted_date < DATE '2025-06-01')
          - (SELECT COUNT(*) FROM accounts WHERE churned_date >= DATE '2025-05-01' AND churned_date < DATE '2025-06-01' AND churned_date IS NOT NULL)
        ) as paid_accounts_delta,

        (SELECT COUNT(*) FROM accounts WHERE signup_date >= DATE '2025-06-01') as new_accounts_30d,
        (SELECT COUNT(*) FROM accounts WHERE signup_date >= DATE '2025-06-01')
        - (SELECT COUNT(*) FROM accounts WHERE signup_date >= DATE '2025-05-01' AND signup_date < DATE '2025-06-01') as new_accounts_30d_delta,

        (SELECT COUNT(*) FROM accounts WHERE churned_date >= DATE '2025-06-01' AND churned_date IS NOT NULL) as churned_accounts_30d,
        (SELECT COUNT(*) FROM accounts WHERE churned_date >= DATE '2025-06-01' AND churned_date IS NOT NULL)
        - (SELECT COUNT(*) FROM accounts WHERE churned_date >= DATE '2025-05-01' AND churned_date < DATE '2025-06-01' AND churned_date IS NOT NULL) as churned_accounts_30d_delta

  revenue_kpis:
    sql: |
      SELECT
        (SELECT ROUND(SUM(mrr) * 12) FROM subscriptions WHERE status = 'active') as arr,
        (SELECT ROUND(SUM(mrr_delta) * 12) FROM subscription_events WHERE event_date >= DATE '2025-06-01')
        - COALESCE((SELECT ROUND(SUM(mrr_delta) * 12) FROM subscription_events WHERE event_date >= DATE '2025-05-01' AND event_date < DATE '2025-06-01'), 0) as arr_delta,

        COALESCE((SELECT ROUND(SUM(mrr_delta) * 12) FROM subscription_events WHERE event_date >= DATE '2025-06-01' AND event_type = 'new'), 0) as new_arr_month,
        COALESCE((SELECT ROUND(SUM(mrr_delta) * 12) FROM subscription_events WHERE event_date >= DATE '2025-06-01' AND event_type = 'new'), 0)
        - COALESCE((SELECT ROUND(SUM(mrr_delta) * 12) FROM subscription_events WHERE event_date >= DATE '2025-05-01' AND event_date < DATE '2025-06-01' AND event_type = 'new'), 0) as new_arr_month_delta,

        (SELECT ROUND(ABS(COALESCE(SUM(mrr_delta), 0)) * 12) FROM subscription_events WHERE event_type = 'churn') as churned_arr_total,

        COALESCE((SELECT ROUND(ABS(SUM(mrr_delta)) * 12) FROM subscription_events WHERE event_date >= DATE '2025-06-01' AND event_type = 'churn'), 0) as churned_arr_month,
        COALESCE((SELECT ROUND(ABS(SUM(mrr_delta)) * 12) FROM subscription_events WHERE event_date >= DATE '2025-06-01' AND event_type = 'churn'), 0)
        - COALESCE((SELECT ROUND(ABS(SUM(mrr_delta)) * 12) FROM subscription_events WHERE event_date >= DATE '2025-05-01' AND event_date < DATE '2025-06-01' AND event_type = 'churn'), 0) as churned_arr_month_delta

  arr_growth:
    sql: |
      SELECT
        DATE_TRUNC('month', event_date) as month,
        SUM(SUM(mrr_delta)) OVER (ORDER BY DATE_TRUNC('month', event_date)) * 12 as arr
      FROM subscription_events
      GROUP BY DATE_TRUNC('month', event_date)
      ORDER BY month

  net_new_mrr:
    sql: |
      SELECT
        DATE_TRUNC('month', event_date) as month,
        event_type as component,
        SUM(mrr_delta) as mrr
      FROM subscription_events
      WHERE event_type IN ('new', 'expansion', 'downgrade', 'churn')
      GROUP BY DATE_TRUNC('month', event_date), event_type
      ORDER BY month, event_type

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
        SUM(mrr_delta) as mrr
      FROM subscription_events
      GROUP BY DATE_TRUNC('month', event_date), component
      ORDER BY month, component

  mrr_by_segment:
    sql: |
      SELECT
        DATE_TRUNC('month', se.event_date) as month,
        a.segment,
        SUM(SUM(se.mrr_delta)) OVER (
          PARTITION BY a.segment
          ORDER BY DATE_TRUNC('month', se.event_date)
        ) as mrr
      FROM subscription_events se
      JOIN accounts a ON a.id = se.account_id
      GROUP BY DATE_TRUNC('month', se.event_date), a.segment
      ORDER BY month, segment

  trial_conversion:
    sql: |
      SELECT
        DATE_TRUNC('month', signup_date) as cohort,
        ROUND(100.0 * SUM(CASE WHEN converted_date IS NOT NULL THEN 1 ELSE 0 END)
          / COUNT(*), 1) as conversion_rate
      FROM accounts
      WHERE trial_start_date IS NOT NULL
      GROUP BY DATE_TRUNC('month', signup_date)
      HAVING COUNT(*) >= 5
      ORDER BY cohort

  retention_by_cohort:
    sql: |
      WITH cohorts AS (
        SELECT
          DATE_TRUNC('quarter', converted_date) as cohort_quarter,
          id as account_id,
          converted_date,
          churned_date
        FROM accounts
        WHERE converted_date IS NOT NULL
      ),
      month_offsets AS (
        SELECT UNNEST(GENERATE_SERIES(0, 15)) as months_since
      )
      SELECT
        mo.months_since,
        CAST(YEAR(c.cohort_quarter) AS VARCHAR) || ' Q' || CAST(QUARTER(c.cohort_quarter) AS VARCHAR) as cohort,
        ROUND(100.0 * SUM(CASE
          WHEN c.churned_date IS NULL
            OR c.churned_date > c.converted_date + INTERVAL '1' MONTH * mo.months_since
          THEN 1 ELSE 0 END) / COUNT(*), 1) as retention_pct
      FROM cohorts c
      CROSS JOIN month_offsets mo
      WHERE c.converted_date + INTERVAL '1' MONTH * mo.months_since <= DATE '2025-07-01'
        AND c.cohort_quarter <= DATE '2025-01-01'
      GROUP BY mo.months_since, c.cohort_quarter
      HAVING COUNT(*) >= 10
      ORDER BY c.cohort_quarter, mo.months_since

  churn_by_segment:
    sql: |
      WITH months AS (
        SELECT UNNEST(GENERATE_SERIES(DATE '2024-02-01', DATE '2025-06-01', INTERVAL '1' MONTH)) as month
      )
      SELECT
        m.month,
        a.segment,
        ROUND(100.0 *
          COUNT(DISTINCT CASE
            WHEN a.churned_date >= m.month AND a.churned_date < m.month + INTERVAL '1' MONTH
            THEN a.id END)
          / NULLIF(COUNT(DISTINCT CASE
            WHEN a.converted_date < m.month
              AND (a.churned_date IS NULL OR a.churned_date >= m.month)
            THEN a.id END), 0), 1) as churn_rate
      FROM months m
      CROSS JOIN accounts a
      WHERE a.converted_date IS NOT NULL AND a.converted_date < m.month + INTERVAL '1' MONTH
      GROUP BY m.month, a.segment
      HAVING COUNT(DISTINCT CASE
        WHEN a.converted_date < m.month AND (a.churned_date IS NULL OR a.churned_date >= m.month)
        THEN a.id END) >= 5
      ORDER BY m.month, a.segment

  asp_trend:
    sql: |
      SELECT
        DATE_TRUNC('month', event_date) as month,
        ROUND(AVG(mrr_after)) as asp
      FROM subscription_events
      WHERE event_type = 'new'
      GROUP BY DATE_TRUNC('month', event_date)
      ORDER BY month

  cohort_ltv:
    sql: |
      WITH cohort_rev AS (
        SELECT
          DATE_TRUNC('quarter', a.converted_date) as cohort,
          a.id as account_id,
          SUM(CASE WHEN se.mrr_delta > 0 THEN se.mrr_delta ELSE 0 END) as total_revenue
        FROM accounts a
        JOIN subscription_events se ON se.account_id = a.id
        WHERE a.converted_date IS NOT NULL
        GROUP BY DATE_TRUNC('quarter', a.converted_date), a.id
      )
      SELECT
        CAST(YEAR(cohort) AS VARCHAR) || ' Q' || CAST(QUARTER(cohort) AS VARCHAR) as cohort,
        ROUND(AVG(total_revenue)) as avg_ltv
      FROM cohort_rev
      GROUP BY cohort
      ORDER BY cohort

  expansion_pct:
    sql: |
      SELECT
        DATE_TRUNC('month', event_date) as month,
        ROUND(100.0 * SUM(CASE WHEN event_type = 'expansion' THEN mrr_delta ELSE 0 END)
          / NULLIF(SUM(CASE WHEN mrr_delta > 0 THEN mrr_delta ELSE 0 END), 0), 1) as expansion_pct
      FROM subscription_events
      GROUP BY DATE_TRUNC('month', event_date)
      ORDER BY month

  top_accounts:
    sql: |
      SELECT
        a.name as account_name,
        a.industry,
        a.segment,
        s.mrr as current_mrr,
        a.converted_date as start_date
      FROM accounts a
      JOIN subscriptions s ON s.account_id = a.id AND s.status = 'active'
      ORDER BY s.mrr DESC
      LIMIT 20

layout:
  # KPI Row 1 — Account Health
  - row:
    - big-value: { data: account_kpis, value: active_accounts, title: Active Accounts, format: num0, comparison: active_accounts_delta, comparisonFormat: num0, isUpGood: true }
    - big-value: { data: account_kpis, value: paid_accounts, title: Paid Accounts, format: num0, comparison: paid_accounts_delta, comparisonFormat: num0, isUpGood: true }
    - big-value: { data: account_kpis, value: new_accounts_30d, title: "New Accounts (30d)", format: num0, comparison: new_accounts_30d_delta, comparisonFormat: num0, isUpGood: true }
    - big-value: { data: account_kpis, value: churned_accounts_30d, title: "Churned Accounts (30d)", format: num0, comparison: churned_accounts_30d_delta, comparisonFormat: num0, isUpGood: false }

  # KPI Row 2 — Revenue
  - row:
    - big-value: { data: revenue_kpis, value: arr, title: ARR, format: usd0, comparison: arr_delta, comparisonFormat: usd0, isUpGood: true }
    - big-value: { data: revenue_kpis, value: new_arr_month, title: "New ARR (This Month)", format: usd0, comparison: new_arr_month_delta, comparisonFormat: usd0, isUpGood: true }
    - big-value: { data: revenue_kpis, value: churned_arr_total, title: "Churned ARR (All Time)", format: usd0 }
    - big-value: { data: revenue_kpis, value: churned_arr_month, title: "Churned ARR (This Month)", format: usd0, comparison: churned_arr_month_delta, comparisonFormat: usd0, isUpGood: false }

  # Chart Row 1
  - row:
    - chart: arr_growth
    - chart: net_new_mrr

  # Chart Row 2
  - row:
    - chart: mrr_waterfall
    - chart: mrr_by_segment

  # Chart Row 3
  - row:
    - chart: trial_conversion
    - chart: retention_by_cohort

  # Chart Row 4
  - row:
    - chart: churn_by_segment
    - chart: asp_trend

  # Chart Row 5
  - row:
    - chart: cohort_ltv
    - chart: expansion_pct

  # Table Row
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
        y: { field: arr, type: quantitative, title: ARR ($) }

  net_new_mrr:
    data: net_new_mrr
    title: Net New MRR
    preset: stacked-column
    spec:
      encoding:
        x: { field: month, type: temporal, timeUnit: yearmonth, title: null }
        y: { field: mrr, type: quantitative, title: MRR ($) }
        color: { field: component, type: nominal, title: Component }

  mrr_waterfall:
    data: mrr_waterfall
    title: MRR Waterfall by Component
    preset: stacked-column
    spec:
      encoding:
        x: { field: month, type: temporal, timeUnit: yearmonth, title: null }
        y: { field: mrr, type: quantitative, title: MRR ($) }
        color: { field: component, type: nominal, title: Component }

  mrr_by_segment:
    data: mrr_by_segment
    title: MRR by Segment
    preset: stacked-area
    spec:
      encoding:
        x: { field: month, type: temporal, timeUnit: yearmonth, title: null }
        y: { field: mrr, type: quantitative, title: MRR ($) }
        color: { field: segment, type: nominal, title: Segment }

  trial_conversion:
    data: trial_conversion
    title: Trial-to-Paid Conversion Rate
    preset: line
    spec:
      encoding:
        x: { field: cohort, type: temporal, timeUnit: yearmonth, title: Signup Cohort }
        y: { field: conversion_rate, type: quantitative, title: "Conversion Rate (%)" }

  retention_by_cohort:
    data: retention_by_cohort
    title: Retention Rate by Cohort
    preset: line
    spec:
      encoding:
        x: { field: months_since, type: quantitative, title: Months Since Conversion }
        y: { field: retention_pct, type: quantitative, title: "Retention (%)", scale: { domain: [0, 100] } }
        color: { field: cohort, type: nominal, title: Cohort }

  churn_by_segment:
    data: churn_by_segment
    title: Churn Rate by Segment
    preset: line
    spec:
      encoding:
        x: { field: month, type: temporal, timeUnit: yearmonth, title: null }
        y: { field: churn_rate, type: quantitative, title: "Monthly Churn Rate (%)" }
        color: { field: segment, type: nominal, title: Segment }

  asp_trend:
    data: asp_trend
    title: ASP Trend
    preset: line
    spec:
      encoding:
        x: { field: month, type: temporal, timeUnit: yearmonth, title: null }
        y: { field: asp, type: quantitative, title: "Avg Selling Price ($/mo)" }

  cohort_ltv:
    data: cohort_ltv
    title: Estimated Cohort LTV
    preset: grouped-column
    spec:
      encoding:
        x: { field: cohort, type: nominal, title: Quarterly Cohort }
        y: { field: avg_ltv, type: quantitative, title: "Avg LTV ($)" }

  expansion_pct:
    data: expansion_pct
    title: Expansion Revenue %
    preset: line
    spec:
      encoding:
        x: { field: month, type: temporal, timeUnit: yearmonth, title: null }
        y: { field: expansion_pct, type: quantitative, title: "Expansion % of New MRR" }

tables:
  top_accounts:
    data: top_accounts
    title: Top Accounts by ARR
```

- [ ] **Step 2: Run the dev server and verify charts render**

Run: `npm run dev`

Open the dashboard in a browser. Verify:
1. All 8 KPI cards show values with proper formatting ($ for revenue, plain numbers for accounts)
2. KPI cards with comparisons show green/red deltas with arrows
3. All 10 charts render with data
4. The Top Accounts table shows 20 rows with sortable columns
5. ARR Growth line shows the inflection (hockey stick shape)
6. MRR by Segment stacked area shows enterprise growing
7. ASP Trend line climbs from ~$500 to ~$2,500+
8. Churn Rate by Segment shows SMB higher than enterprise, all trending down

- [ ] **Step 3: Commit**

```bash
git add demo/pages/index.yaml
git commit -m "feat: rewrite dashboard with executive metrics layout"
```

---

## Task 4: Remove Old Files

**Files:**
- Delete: `demo/pages/analysis/comparison.yaml`
- Delete: `demo/pages/analysis/growth.yaml`
- Delete: `demo-github/` (entire directory)
- Delete: `scripts/generate-saas-data.ts`

- [ ] **Step 1: Remove old analysis pages**

```bash
rm demo/pages/analysis/comparison.yaml demo/pages/analysis/growth.yaml
rmdir demo/pages/analysis 2>/dev/null || true
```

- [ ] **Step 2: Remove demo-github directory**

```bash
rm -rf demo-github/
```

- [ ] **Step 3: Remove old data generation script**

The `scripts/generate-saas-data.ts` file uses the old data model (users, subscriptions with different schema, events, revenue, support_tickets) and writes to the same `demo/data/saas.db` path. It would produce an incompatible database if run, so remove it.

```bash
rm scripts/generate-saas-data.ts
```

- [ ] **Step 4: Verify no broken references**

Run: `grep -r "demo-github\|generate-saas-data\|comparison\.yaml\|growth\.yaml" --include="*.ts" --include="*.tsx" --include="*.yaml" --include="*.json" src/ demo/ scripts/ 2>/dev/null || echo "No stale references found"`

If any references are found, update or remove them.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove old demo pages, demo-github, and legacy data script"
```

---

## Task 5: End-to-End Verification

- [ ] **Step 1: Re-seed the database**

Run: `npx tsx demo/scripts/seed.ts`
Expected: Completes without errors, prints row counts.

- [ ] **Step 2: Start dev server and verify dashboard**

Run: `npm run dev`

Verify the complete growth narrative:
1. **ARR Growth** — Line should show hockey stick inflection around month 7-8
2. **Net New MRR** — Stacked columns should grow taller over time, with churn (negative) staying relatively small
3. **MRR by Segment** — Enterprise area should grow substantially in later months
4. **Trial-to-Paid Conversion** — Line should trend from ~50% to ~65%
5. **Retention by Cohort** — Later cohorts should retain better than earlier ones
6. **Churn Rate** — SMB line higher than enterprise, both trending down
7. **ASP Trend** — Should climb from ~$500 to ~$2,000+
8. **Expansion Revenue %** — Should increase over time
9. **Cohort LTV** — Later quarterly cohorts should show higher estimated LTV
10. **Top Accounts** — Should show enterprise accounts with highest MRR at top

- [ ] **Step 3: Verify KPI comparison deltas**

Check that:
- Active Accounts, Paid Accounts, New Accounts show green up arrows
- Churned Accounts (30d) shows correct coloring (green if churn decreased, red if increased)
- ARR and New ARR show green up arrows
- Churned ARR (All Time) has no comparison delta
- Churned ARR (This Month) shows appropriate coloring

- [ ] **Step 4: TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors.
