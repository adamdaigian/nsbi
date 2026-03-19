/**
 * Generates synthetic product analytics data (~8K rows across multiple tables).
 * Run: npx tsx scripts/generate-data.ts
 */
import fs from "fs";
import path from "path";

const FEATURES = ["Dashboard", "Reports", "API", "Integrations", "Settings", "Search", "Export", "Notifications"];
const PLATFORMS = ["web", "ios", "android"];
const PLANS = ["free", "starter", "pro", "enterprise"];
const COUNTRIES = ["US", "UK", "DE", "FR", "JP", "CA", "AU", "BR", "IN", "KR"];

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

// Generate users (~2K)
const users: Record<string, unknown>[] = [];
for (let i = 0; i < 2000; i++) {
  users.push({
    user_id: i + 1,
    signup_date: randomDate(new Date("2023-01-01"), new Date("2026-03-01")),
    plan: pick(PLANS),
    country: pick(COUNTRIES),
    platform: pick(PLATFORMS),
  });
}

// Generate sessions (~4K)
const sessions: Record<string, unknown>[] = [];
for (let i = 0; i < 4000; i++) {
  const user = pick(users);
  const sessionDate = randomDate(
    new Date(user.signup_date as string),
    new Date("2026-03-15"),
  );
  sessions.push({
    session_id: i + 1,
    user_id: user.user_id,
    session_date: sessionDate,
    duration_seconds: rand(10, 3600),
    pages_viewed: rand(1, 25),
    platform: user.platform,
  });
}

// Generate events (~8K)
const events: Record<string, unknown>[] = [];
for (let i = 0; i < 8000; i++) {
  const session = pick(sessions);
  events.push({
    event_id: i + 1,
    session_id: session.session_id,
    user_id: session.user_id,
    event_date: session.session_date,
    feature: pick(FEATURES),
    action: pick(["view", "click", "create", "update", "delete", "export"]),
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

writeCsv("users.csv", users);
writeCsv("sessions.csv", sessions);
writeCsv("events.csv", events);

console.log("\nDone! Data files written to data/");
