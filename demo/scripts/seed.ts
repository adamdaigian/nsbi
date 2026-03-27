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
  starter: 75,
  growth: 200,
  enterprise: 600,
};

const END_DATE = new Date(2025, 5, 30); // June 30, 2025 — end of simulation window

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
    const trialConvRate = p === "early" ? 0.70 : p === "mid" ? 0.78 : 0.85;
    const directConvRate = p === "early" ? 0.93 : p === "mid" ? 0.96 : 0.98;
    const baseChurn = p === "early" ? 0.015 : p === "mid" ? 0.012 : 0.008;

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

        // Cap converted_date to simulation window
        if (converted_date > END_DATE) {
          converted_date = END_DATE;
        }

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
      const expChance = p === "early" ? 0.08 : p === "mid" ? 0.12 : 0.16;
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

      // Small MRR adjustments (seat changes, usage): ~95% chance per month
      if (Math.random() < 0.95 && currentMrr > 0) {
        // Small change: ±5% of current MRR
        const isIncrease = Math.random() < 0.70; // 70% positive (seat adds)
        const amount = Math.round(currentMrr * (0.02 + Math.random() * 0.06));
        if (isIncrease) {
          currentMrr += amount;
          nextEventId++;
          events.push({
            id: nextEventId, account_id: acct.id, subscription_id: sub.id,
            event_date: new Date(2024, mo, 1 + rand(0, 27)),
            event_type: "expansion",
            mrr_delta: amount, mrr_after: currentMrr,
          });
        } else if (currentMrr - amount > BASE_MRR.starter! * 0.5) {
          currentMrr -= amount;
          nextEventId++;
          events.push({
            id: nextEventId, account_id: acct.id, subscription_id: sub.id,
            event_date: new Date(2024, mo, 1 + rand(0, 27)),
            event_type: "downgrade",
            mrr_delta: -amount, mrr_after: currentMrr,
          });
        }
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
  const reactivatedIds: number[] = [];
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
    reactivatedIds.push(acct.id);
  }

  // Fix: update reactivated accounts in DB (they were inserted as 'churned')
  for (const id of reactivatedIds) {
    await run(`UPDATE accounts SET status = 'active', churned_date = NULL WHERE id = ${id}`);
  }

  // Randomly assign ~5-8% of active subscriptions as past_due
  for (const sub of subscriptions) {
    if (sub.status === "active" && Math.random() < 0.065) {
      sub.status = "past_due";
    }
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
