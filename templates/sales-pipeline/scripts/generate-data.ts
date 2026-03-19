/**
 * Generates synthetic sales pipeline data (~5K rows across multiple tables).
 * Run: npx tsx scripts/generate-data.ts
 */
import fs from "fs";
import path from "path";

const REPS = [
  "Alice Chen", "Bob Martinez", "Carol Johnson", "David Kim", "Emily Brown",
  "Frank Wilson", "Grace Lee", "Henry Taylor", "Iris Patel", "Jack Anderson",
];

const STAGES = ["Prospecting", "Qualification", "Proposal", "Negotiation", "Closed Won", "Closed Lost"];
const INDUSTRIES = ["SaaS", "Healthcare", "Finance", "Manufacturing", "Retail", "Education"];
const SOURCES = ["Inbound", "Outbound", "Referral", "Partner", "Conference"];
const ACTIVITY_TYPES = ["call", "email", "meeting", "demo", "proposal_sent", "follow_up"];

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomDate(start: Date, end: Date): string {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return d.toISOString().split("T")[0]!;
}

// Generate reps
const reps = REPS.map((name, i) => ({
  rep_id: i + 1,
  rep_name: name,
  region: pick(["North", "South", "East", "West"]),
  team: pick(["Enterprise", "Mid-Market", "SMB"]),
  hire_date: randomDate(new Date("2020-01-01"), new Date("2024-06-01")),
}));

// Generate deals (~1200)
const deals: Record<string, unknown>[] = [];
for (let i = 0; i < 1200; i++) {
  const rep = pick(reps);
  const stage = pick(STAGES);
  const amount = rand(5000, 250000);
  const createDate = randomDate(new Date("2024-01-01"), new Date("2025-12-31"));
  const closeDate = stage.startsWith("Closed")
    ? randomDate(new Date(createDate), new Date("2026-03-01"))
    : null;

  deals.push({
    deal_id: i + 1,
    rep_id: rep.rep_id,
    deal_name: `Deal ${i + 1} - ${pick(["Expansion", "New Business", "Renewal", "Upsell"])}`,
    amount,
    stage,
    industry: pick(INDUSTRIES),
    source: pick(SOURCES),
    create_date: createDate,
    close_date: closeDate,
    probability: stage === "Closed Won" ? 100 : stage === "Closed Lost" ? 0 : rand(10, 90),
  });
}

// Generate activities (~3K)
const activities: Record<string, unknown>[] = [];
for (let i = 0; i < 3000; i++) {
  const deal = pick(deals);
  activities.push({
    activity_id: i + 1,
    deal_id: deal.deal_id,
    rep_id: deal.rep_id,
    activity_type: pick(ACTIVITY_TYPES),
    activity_date: randomDate(new Date("2024-01-01"), new Date("2026-03-01")),
    duration_minutes: rand(5, 120),
    notes: pick(["Initial contact", "Follow-up", "Pricing discussion", "Technical review", "Contract review", "Stakeholder intro"]),
  });
}

// Write CSV files
const dataDir = path.join(import.meta.dirname, "..", "data");
fs.mkdirSync(dataDir, { recursive: true });

function writeCsv(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]!);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => {
      const v = row[h];
      if (v === null || v === undefined) return "";
      const s = String(v);
      return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(","));
  }
  fs.writeFileSync(path.join(dataDir, filename), lines.join("\n") + "\n");
  console.log(`  wrote ${filename} (${rows.length} rows)`);
}

writeCsv("reps.csv", reps);
writeCsv("deals.csv", deals);
writeCsv("activities.csv", activities);

console.log("\nDone! Data files written to data/");
