/**
 * Seed script: downloads 24 hours of GH Archive data and loads into a DuckDB database.
 * Usage: npx tsx demo-github/scripts/seed.ts
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { createGunzip } from "zlib";
import { pipeline } from "stream/promises";
import { createWriteStream, createReadStream } from "fs";
import https from "https";

const DATA_DIR = path.resolve(import.meta.dirname, "../data");
const DB_PATH = path.join(DATA_DIR, "github.db");
const TEMP_DIR = path.join(DATA_DIR, "tmp");

// Download yesterday's data (24 hourly files)
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const dateStr = yesterday.toISOString().slice(0, 10); // e.g. "2026-03-21"

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        downloadFile(response.headers.location!, dest).then(resolve, reject);
        return;
      }
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        reject(new Error(`HTTP ${response.statusCode} for ${url}`));
        return;
      }
      response.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    }).on("error", (err) => {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
  });
}

async function decompressFile(gzPath: string, outPath: string): Promise<void> {
  await pipeline(
    createReadStream(gzPath),
    createGunzip(),
    createWriteStream(outPath),
  );
}

async function main() {
  console.log(`[seed] Downloading GH Archive data for ${dateStr}`);

  // Clean up
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
  if (fs.existsSync(TEMP_DIR)) fs.rmSync(TEMP_DIR, { recursive: true });
  fs.mkdirSync(TEMP_DIR, { recursive: true });

  // Download all 24 hourly files
  const jsonFiles: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    const url = `https://data.gharchive.org/${dateStr}-${hour}.json.gz`;
    const gzFile = path.join(TEMP_DIR, `${dateStr}-${hour}.json.gz`);
    const jsonFile = path.join(TEMP_DIR, `${dateStr}-${hour}.json`);

    process.stdout.write(`[seed] Downloading hour ${hour}/23... `);
    try {
      await downloadFile(url, gzFile);
      await decompressFile(gzFile, jsonFile);
      fs.unlinkSync(gzFile); // remove .gz to save space
      const sizeMB = (fs.statSync(jsonFile).size / 1024 / 1024).toFixed(1);
      console.log(`${sizeMB}MB`);
      jsonFiles.push(jsonFile);
    } catch (err) {
      console.log(`skipped (${(err as Error).message})`);
    }
  }

  if (jsonFiles.length === 0) {
    console.error("[seed] No files downloaded. Check network/date.");
    process.exit(1);
  }

  console.log(`[seed] Downloaded ${jsonFiles.length} files. Loading into DuckDB...`);

  // Use DuckDB CLI or node binding to load
  const duckdb = await import("duckdb");
  const db = new duckdb.default.Database(DB_PATH);
  const conn = db.connect();

  const run = (sql: string): Promise<void> =>
    new Promise((resolve, reject) => {
      conn.run(sql, (err: Error | null) => (err ? reject(err) : resolve()));
    });

  const query = (sql: string): Promise<Record<string, unknown>[]> =>
    new Promise((resolve, reject) => {
      conn.all(sql, (err: Error | null, rows: Record<string, unknown>[]) =>
        err ? reject(err) : resolve(rows ?? []),
      );
    });

  // Create the flattened events table from all JSON files
  const globPattern = path.join(TEMP_DIR, `${dateStr}-*.json`);

  await run(`
    CREATE TABLE events AS
    SELECT
      id::VARCHAR as event_id,
      type as event_type,
      actor.login as actor,
      repo.name as repo,
      CASE
        WHEN POSITION('/' IN repo.name) > 0
        THEN SPLIT_PART(repo.name, '/', 1)
        ELSE repo.name
      END as org,
      created_at::TIMESTAMP as created_at,
      DATE_TRUNC('hour', created_at::TIMESTAMP) as hour
    FROM read_json_auto('${globPattern}', union_by_name=true, maximum_object_size=33554432)
  `);

  // Check row count
  const countResult = await query("SELECT COUNT(*) as cnt FROM events");
  const totalRows = Number(countResult[0]?.cnt ?? 0);
  console.log(`[seed] Loaded ${totalRows.toLocaleString()} events into github.db`);

  // Print event type breakdown
  const breakdown = await query(
    "SELECT event_type, COUNT(*) as cnt FROM events GROUP BY event_type ORDER BY cnt DESC LIMIT 15",
  );
  console.log("\n[seed] Event breakdown:");
  for (const row of breakdown) {
    console.log(`  ${row.event_type}: ${Number(row.cnt).toLocaleString()}`);
  }

  // Clean up temp files
  db.close(() => {
    fs.rmSync(TEMP_DIR, { recursive: true });
    const dbSizeMB = (fs.statSync(DB_PATH).size / 1024 / 1024).toFixed(1);
    console.log(`\n[seed] Done! github.db is ${dbSizeMB}MB`);
  });
}

main().catch((err) => {
  console.error("[seed] Fatal error:", err);
  process.exit(1);
});
