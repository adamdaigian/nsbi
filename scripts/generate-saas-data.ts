/**
 * Generate a realistic SaaS metrics dataset with 10K+ rows.
 * Run: npx tsx scripts/generate-saas-data.ts
 * Output: demo/data/saas.db
 */

import duckdb from "duckdb";
import path from "path";
import fs from "fs";

const DB_PATH = path.resolve(import.meta.dirname, "../demo/data/saas.db");

// Remove existing db
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
      err ? reject(err) : resolve(rows),
    );
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────

const PLANS = ["free", "starter", "pro", "enterprise"];
const PLAN_MRR: Record<string, number> = { free: 0, starter: 29, pro: 79, enterprise: 249 };
const INDUSTRIES = ["Technology", "Healthcare", "Finance", "Education", "Retail", "Media", "Manufacturing", "Consulting"];
const SOURCES = ["organic", "paid_search", "paid_social", "referral", "content", "partner"];
const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"];
const FEATURES = ["dashboard", "reports", "api", "integrations", "automations", "collaboration", "analytics", "settings"];
const EVENT_TYPES = ["page_view", "feature_use", "api_call", "export", "invite_sent", "report_created", "automation_run"];
const TICKET_CATEGORIES = ["billing", "bug_report", "feature_request", "onboarding", "integration", "performance", "account"];
const PRIORITIES = ["low", "medium", "high", "critical"];

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

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0]!;
}

function formatTimestamp(d: Date): string {
  return d.toISOString().replace("T", " ").split(".")[0]!;
}

// ── Generate ─────────────────────────────────────────────────────────────

async function generate() {
  console.log("Creating tables...");

  await run(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      name VARCHAR,
      email VARCHAR,
      signup_date DATE,
      plan VARCHAR,
      status VARCHAR,
      company_size VARCHAR,
      industry VARCHAR,
      source VARCHAR,
      country VARCHAR
    )
  `);

  await run(`
    CREATE TABLE subscriptions (
      id INTEGER PRIMARY KEY,
      user_id INTEGER,
      plan VARCHAR,
      started_at DATE,
      ended_at DATE,
      mrr DECIMAL(10,2),
      status VARCHAR
    )
  `);

  await run(`
    CREATE TABLE events (
      id INTEGER PRIMARY KEY,
      user_id INTEGER,
      event_type VARCHAR,
      feature VARCHAR,
      ts TIMESTAMP,
      session_id VARCHAR
    )
  `);

  await run(`
    CREATE TABLE revenue (
      month DATE,
      plan VARCHAR,
      new_mrr DECIMAL(10,2),
      expansion_mrr DECIMAL(10,2),
      churn_mrr DECIMAL(10,2),
      net_mrr DECIMAL(10,2),
      active_subscriptions INTEGER
    )
  `);

  await run(`
    CREATE TABLE support_tickets (
      id INTEGER PRIMARY KEY,
      user_id INTEGER,
      created_at TIMESTAMP,
      resolved_at TIMESTAMP,
      category VARCHAR,
      priority VARCHAR,
      status VARCHAR,
      first_response_hours DECIMAL(6,1)
    )
  `);

  // ── Users: ~1500 over 2 years ────────────────────────────────────────

  const START = new Date("2023-01-01");
  const END = new Date("2024-12-31");
  const COUNTRIES = ["US", "US", "US", "UK", "UK", "CA", "DE", "FR", "AU", "JP", "BR", "IN"];

  console.log("Generating users...");
  const users: Array<{
    id: number; signup: Date; plan: string; status: string;
    industry: string; source: string; companySize: string;
  }> = [];

  // Growth curve: more signups over time
  for (let i = 1; i <= 1500; i++) {
    // Bias signup dates toward more recent (exponential growth)
    const t = Math.pow(Math.random(), 0.7); // skew toward later dates
    const signup = new Date(START.getTime() + t * (END.getTime() - START.getTime()));
    const plan = weightedPick(PLANS, [40, 30, 20, 10]);
    const monthsSinceSignup = (END.getTime() - signup.getTime()) / (30 * 24 * 60 * 60 * 1000);
    // Churn probability increases for free users, decreases for enterprise
    const churnProb = plan === "free" ? 0.35 : plan === "starter" ? 0.2 : plan === "pro" ? 0.1 : 0.05;
    const churned = Math.random() < churnProb && monthsSinceSignup > 2;
    const status = churned ? "churned" : "active";
    const industry = pick(INDUSTRIES);
    const source = weightedPick(SOURCES, [30, 25, 15, 15, 10, 5]);
    const companySize = weightedPick(COMPANY_SIZES, [25, 30, 25, 15, 5]);
    const country = pick(COUNTRIES);

    users.push({ id: i, signup, plan: churned ? plan : plan, status, industry, source, companySize });

    const name = `User ${i}`;
    const email = `user${i}@example.com`;
    await run(`
      INSERT INTO users VALUES (
        ${i}, '${name}', '${email}', '${formatDate(signup)}',
        '${status === "churned" ? plan : plan}', '${status}',
        '${companySize}', '${industry}', '${source}', '${country}'
      )
    `);
  }

  // ── Subscriptions: initial + upgrades/downgrades ─────────────────────

  console.log("Generating subscriptions...");
  let subId = 1;
  for (const user of users) {
    // Initial subscription
    const initialMrr = PLAN_MRR[user.plan]!;
    let endDate: string | null = null;
    let subStatus = "active";

    if (user.status === "churned") {
      const churnDate = randomDate(
        new Date(user.signup.getTime() + 60 * 24 * 60 * 60 * 1000), // at least 2 months
        END,
      );
      endDate = formatDate(churnDate);
      subStatus = "cancelled";
    }

    await run(`
      INSERT INTO subscriptions VALUES (
        ${subId++}, ${user.id}, '${user.plan}', '${formatDate(user.signup)}',
        ${endDate ? `'${endDate}'` : "NULL"}, ${initialMrr}, '${subStatus}'
      )
    `);

    // ~20% of active users upgrade
    if (user.status === "active" && Math.random() < 0.2) {
      const planIdx = PLANS.indexOf(user.plan);
      if (planIdx < 3) {
        const newPlan = PLANS[planIdx + 1]!;
        const upgradeDate = randomDate(
          new Date(user.signup.getTime() + 30 * 24 * 60 * 60 * 1000),
          END,
        );
        await run(`
          INSERT INTO subscriptions VALUES (
            ${subId++}, ${user.id}, '${newPlan}', '${formatDate(upgradeDate)}',
            NULL, ${PLAN_MRR[newPlan]}, 'active'
          )
        `);
        // Mark the old one as upgraded
        await run(`
          UPDATE subscriptions SET status = 'upgraded', ended_at = '${formatDate(upgradeDate)}'
          WHERE user_id = ${user.id} AND id = ${subId - 2}
        `);
      }
    }
  }

  // ── Events: ~6000 product usage events ───────────────────────────────

  console.log("Generating events...");
  let eventId = 1;
  const activeUsers = users.filter((u) => u.status === "active");
  const BATCH_SIZE = 200;
  let eventBatch: string[] = [];

  async function flushEvents() {
    if (eventBatch.length === 0) return;
    await run(`INSERT INTO events VALUES ${eventBatch.join(",")}`);
    eventBatch = [];
  }

  for (let i = 0; i < 6000; i++) {
    const user = pick(activeUsers);
    const eventDate = randomDate(user.signup, END);
    const eventType = weightedPick(EVENT_TYPES, [35, 25, 15, 10, 5, 5, 5]);
    const feature = pick(FEATURES);
    const sessionId = `s_${user.id}_${rand(1, 500)}`;

    eventBatch.push(`(${eventId++}, ${user.id}, '${eventType}', '${feature}', '${formatTimestamp(eventDate)}', '${sessionId}')`);
    if (eventBatch.length >= BATCH_SIZE) await flushEvents();
  }
  await flushEvents();

  // ── Revenue: monthly aggregates ──────────────────────────────────────

  console.log("Generating revenue...");
  for (let year = 2023; year <= 2024; year++) {
    for (let month = 1; month <= 12; month++) {
      const monthStr = `${year}-${String(month).padStart(2, "0")}-01`;
      for (const plan of PLANS) {
        const baseMrr = PLAN_MRR[plan]!;
        if (baseMrr === 0 && plan === "free") {
          await run(`INSERT INTO revenue VALUES ('${monthStr}', '${plan}', 0, 0, 0, 0, ${rand(100, 400)})`);
          continue;
        }
        // Growth trend: more revenue in later months
        const monthIndex = (year - 2023) * 12 + month;
        const growthFactor = 1 + monthIndex * 0.04;
        const activeSubs = Math.floor(rand(20, 80) * growthFactor);
        const newMrr = Math.floor(rand(3, 12) * baseMrr * growthFactor);
        const expansionMrr = Math.floor(rand(1, 5) * baseMrr * 0.3 * growthFactor);
        const churnMrr = Math.floor(rand(1, 4) * baseMrr * 0.2);
        const netMrr = newMrr + expansionMrr - churnMrr;

        await run(`INSERT INTO revenue VALUES ('${monthStr}', '${plan}', ${newMrr}, ${expansionMrr}, ${churnMrr}, ${netMrr}, ${activeSubs})`);
      }
    }
  }

  // ── Support tickets: ~2000 ───────────────────────────────────────────

  console.log("Generating support tickets...");
  let ticketBatch: string[] = [];

  async function flushTickets() {
    if (ticketBatch.length === 0) return;
    await run(`INSERT INTO support_tickets VALUES ${ticketBatch.join(",")}`);
    ticketBatch = [];
  }

  for (let i = 1; i <= 2000; i++) {
    const user = pick(users);
    const created = randomDate(
      new Date(Math.max(user.signup.getTime(), START.getTime())),
      END,
    );
    const category = weightedPick(TICKET_CATEGORIES, [15, 25, 20, 15, 10, 10, 5]);
    const priority = weightedPick(PRIORITIES, [30, 40, 20, 10]);
    const resolved = Math.random() < 0.85;
    const resolvedAt = resolved
      ? new Date(created.getTime() + rand(1, 72) * 60 * 60 * 1000)
      : null;
    const status = resolved ? "resolved" : Math.random() < 0.5 ? "open" : "in_progress";
    const firstResponseHours = (rand(1, 48) + Math.random()).toFixed(1);

    ticketBatch.push(
      `(${i}, ${user.id}, '${formatTimestamp(created)}', ${resolvedAt ? `'${formatTimestamp(resolvedAt)}'` : "NULL"}, '${category}', '${priority}', '${status}', ${firstResponseHours})`,
    );
    if (ticketBatch.length >= BATCH_SIZE) await flushTickets();
  }
  await flushTickets();

  // ── Summary ──────────────────────────────────────────────────────────

  const counts = await query(`
    SELECT
      (SELECT COUNT(*) FROM users) as users,
      (SELECT COUNT(*) FROM subscriptions) as subscriptions,
      (SELECT COUNT(*) FROM events) as events,
      (SELECT COUNT(*) FROM revenue) as revenue,
      (SELECT COUNT(*) FROM support_tickets) as tickets
  `);

  const c = counts[0]!;
  const total = Number(c.users) + Number(c.subscriptions) + Number(c.events) + Number(c.revenue) + Number(c.tickets);
  console.log(`\nGenerated ${total} total rows:`);
  console.log(`  users:          ${c.users}`);
  console.log(`  subscriptions:  ${c.subscriptions}`);
  console.log(`  events:         ${c.events}`);
  console.log(`  revenue:        ${c.revenue}`);
  console.log(`  tickets:        ${c.tickets}`);
  console.log(`\nSaved to: ${DB_PATH}`);

  db.close(() => process.exit(0));
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
