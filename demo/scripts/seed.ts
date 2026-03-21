/**
 * Seed script — generates demo/data/saas.db with realistic SaaS data.
 * Run: npx tsx demo/scripts/seed.ts
 */
import duckdb from "duckdb";
import path from "path";
import fs from "fs";

const DB_PATH = path.resolve(import.meta.dirname, "../data/saas.db");

// Ensure data/ exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

// Remove old DB if present
if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);

const db = new duckdb.Database(DB_PATH);
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

async function seed() {
  console.log("Seeding demo database...");

  // ── Users ───────────────────────────────────────────────
  await run(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      signup_date DATE NOT NULL,
      status VARCHAR NOT NULL,      -- 'active' | 'churned' | 'trial'
      source VARCHAR NOT NULL,      -- 'organic' | 'paid_search' | 'paid_social' | 'referral'
      plan VARCHAR NOT NULL,        -- 'free' | 'starter' | 'pro' | 'enterprise'
      industry VARCHAR NOT NULL     -- 'saas' | 'ecommerce' | 'fintech' | 'healthcare' | 'education'
    )
  `);

  const sources = ["organic", "paid_search", "paid_social", "referral"];
  const plans = ["free", "starter", "pro", "enterprise"];
  const planWeights = [0.35, 0.30, 0.25, 0.10];
  const industries = ["saas", "ecommerce", "fintech", "healthcare", "education"];
  const statuses = ["active", "churned", "trial"];
  const statusWeights = [0.65, 0.20, 0.15];

  function weightedPick<T>(items: T[], weights: number[]): T {
    const r = Math.random();
    let cum = 0;
    for (let i = 0; i < items.length; i++) {
      cum += weights[i]!;
      if (r <= cum) return items[i]!;
    }
    return items[items.length - 1]!;
  }

  const userRows: string[] = [];
  for (let i = 1; i <= 500; i++) {
    // Spread signups over 2024-01 to 2025-06
    const monthOffset = Math.floor(Math.random() * 18); // 0-17 months
    const day = 1 + Math.floor(Math.random() * 28);
    const date = new Date(2024, monthOffset, day);
    const dateStr = date.toISOString().slice(0, 10);
    const source = sources[Math.floor(Math.random() * sources.length)]!;
    const plan = weightedPick(plans, planWeights);
    const industry = industries[Math.floor(Math.random() * industries.length)]!;
    const status = weightedPick(statuses, statusWeights);
    userRows.push(
      `(${i}, '${dateStr}', '${status}', '${source}', '${plan}', '${industry}')`,
    );
  }
  // Insert in batches
  for (let i = 0; i < userRows.length; i += 100) {
    const batch = userRows.slice(i, i + 100);
    await run(
      `INSERT INTO users (id, signup_date, status, source, plan, industry) VALUES ${batch.join(",")}`,
    );
  }
  console.log("  ✓ users (500 rows)");

  // ── Revenue ─────────────────────────────────────────────
  await run(`
    CREATE TABLE revenue (
      month DATE NOT NULL,
      plan VARCHAR NOT NULL,
      net_mrr DOUBLE NOT NULL,
      new_mrr DOUBLE NOT NULL,
      expansion_mrr DOUBLE NOT NULL,
      churn_mrr DOUBLE NOT NULL,
      active_subscriptions INTEGER NOT NULL
    )
  `);

  const revRows: string[] = [];
  for (let m = 0; m < 18; m++) {
    const month = new Date(2024, m, 1).toISOString().slice(0, 10);
    for (const plan of ["starter", "pro", "enterprise"]) {
      const base =
        plan === "starter" ? 29 : plan === "pro" ? 99 : 499;
      const subs = Math.floor(
        (plan === "starter" ? 80 : plan === "pro" ? 40 : 8) *
          (1 + m * 0.06 + Math.random() * 0.1),
      );
      const newMrr = Math.round(base * (3 + Math.random() * 4));
      const expansion = Math.round(base * (1 + Math.random() * 2));
      const churn = Math.round(base * (1 + Math.random() * 2));
      const net = newMrr + expansion - churn;
      revRows.push(
        `('${month}', '${plan}', ${net}, ${newMrr}, ${expansion}, ${churn}, ${subs})`,
      );
    }
  }
  await run(
    `INSERT INTO revenue (month, plan, net_mrr, new_mrr, expansion_mrr, churn_mrr, active_subscriptions) VALUES ${revRows.join(",")}`,
  );
  console.log(`  ✓ revenue (${revRows.length} rows)`);

  // ── Subscriptions ───────────────────────────────────────
  await run(`
    CREATE TABLE subscriptions (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      plan VARCHAR NOT NULL,
      status VARCHAR NOT NULL,      -- 'active' | 'cancelled' | 'past_due'
      start_date DATE NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  const subStatuses = ["active", "cancelled", "past_due"];
  const subStatusWeights = [0.70, 0.20, 0.10];
  const subRows: string[] = [];
  for (let i = 1; i <= 500; i++) {
    const plan = plans[1 + Math.floor(Math.random() * 3)]!; // starter/pro/enterprise
    const status = weightedPick(subStatuses, subStatusWeights);
    const monthOff = Math.floor(Math.random() * 18);
    const day = 1 + Math.floor(Math.random() * 28);
    const date = new Date(2024, monthOff, day).toISOString().slice(0, 10);
    subRows.push(`(${i}, ${i}, '${plan}', '${status}', '${date}')`);
  }
  for (let i = 0; i < subRows.length; i += 100) {
    const batch = subRows.slice(i, i + 100);
    await run(
      `INSERT INTO subscriptions (id, user_id, plan, status, start_date) VALUES ${batch.join(",")}`,
    );
  }
  console.log("  ✓ subscriptions (500 rows)");

  // ── Support Tickets ─────────────────────────────────────
  await run(`
    CREATE TABLE support_tickets (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at DATE NOT NULL,
      category VARCHAR NOT NULL,   -- 'billing' | 'bug' | 'feature_request' | 'onboarding' | 'general'
      status VARCHAR NOT NULL,     -- 'open' | 'in_progress' | 'resolved'
      first_response_hours DOUBLE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  const ticketCategories = ["billing", "bug", "feature_request", "onboarding", "general"];
  const ticketStatuses = ["open", "in_progress", "resolved"];
  const ticketStatusWeights = [0.15, 0.15, 0.70];
  const ticketRows: string[] = [];
  for (let i = 1; i <= 300; i++) {
    const userId = 1 + Math.floor(Math.random() * 500);
    const monthOff = Math.floor(Math.random() * 18);
    const day = 1 + Math.floor(Math.random() * 28);
    const date = new Date(2024, monthOff, day).toISOString().slice(0, 10);
    const cat = ticketCategories[Math.floor(Math.random() * ticketCategories.length)]!;
    const status = weightedPick(ticketStatuses, ticketStatusWeights);
    const responseHrs = Math.round((0.5 + Math.random() * 23.5) * 10) / 10;
    ticketRows.push(
      `(${i}, ${userId}, '${date}', '${cat}', '${status}', ${responseHrs})`,
    );
  }
  for (let i = 0; i < ticketRows.length; i += 100) {
    const batch = ticketRows.slice(i, i + 100);
    await run(
      `INSERT INTO support_tickets (id, user_id, created_at, category, status, first_response_hours) VALUES ${batch.join(",")}`,
    );
  }
  console.log("  ✓ support_tickets (300 rows)");

  // ── Events ──────────────────────────────────────────────
  await run(`
    CREATE TABLE events (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      session_id VARCHAR NOT NULL,
      event_type VARCHAR NOT NULL,  -- 'page_view' | 'click' | 'api_call' | 'export' | 'search'
      feature VARCHAR NOT NULL,     -- 'dashboard' | 'reports' | 'settings' | 'integrations' | 'billing'
      ts TIMESTAMP NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  const eventTypes = ["page_view", "click", "api_call", "export", "search"];
  const features = ["dashboard", "reports", "settings", "integrations", "billing"];
  const eventRows: string[] = [];
  for (let i = 1; i <= 2000; i++) {
    const userId = 1 + Math.floor(Math.random() * 500);
    const sessionId = `s_${userId}_${Math.floor(Math.random() * 100)}`;
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)]!;
    const feature = features[Math.floor(Math.random() * features.length)]!;
    const monthOff = Math.floor(Math.random() * 18);
    const day = 1 + Math.floor(Math.random() * 28);
    const hour = Math.floor(Math.random() * 24);
    const min = Math.floor(Math.random() * 60);
    const ts = new Date(2024, monthOff, day, hour, min);
    const tsStr = ts.toISOString().slice(0, 19).replace("T", " ");
    eventRows.push(
      `(${i}, ${userId}, '${sessionId}', '${eventType}', '${feature}', '${tsStr}')`,
    );
  }
  for (let i = 0; i < eventRows.length; i += 200) {
    const batch = eventRows.slice(i, i + 200);
    await run(
      `INSERT INTO events (id, user_id, session_id, event_type, feature, ts) VALUES ${batch.join(",")}`,
    );
  }
  console.log("  ✓ events (2000 rows)");

  // Verify
  const tables = await query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'main' ORDER BY table_name",
  );
  console.log(
    `\nDone! Tables: ${tables.map((t) => t.table_name).join(", ")}`,
  );
  console.log(`Database: ${DB_PATH}`);

  // Close
  db.close(() => process.exit(0));
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
