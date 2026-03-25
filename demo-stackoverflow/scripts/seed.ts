/**
 * Seed script: downloads Stack Overflow Developer Survey data (2019-2025)
 * and loads normalized tables into a DuckDB database.
 *
 * Usage: npx tsx demo-stackoverflow/scripts/seed.ts
 */
import fs from "fs";
import path from "path";
import https from "https";
import { execSync } from "child_process";

const DATA_DIR = path.resolve(import.meta.dirname, "../data");
const DB_PATH = path.join(DATA_DIR, "stackoverflow.db");
const TEMP_DIR = path.join(DATA_DIR, "tmp");

const YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025];

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        downloadFile(response.headers.location!, dest).then(resolve, reject);
        return;
      }
      if (response.statusCode !== 200) {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        reject(new Error(`HTTP ${response.statusCode} for ${url}`));
        return;
      }
      response.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    }).on("error", reject);
  });
}

async function main() {
  // Clean up
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
  if (fs.existsSync(TEMP_DIR)) fs.rmSync(TEMP_DIR, { recursive: true });
  fs.mkdirSync(TEMP_DIR, { recursive: true });
  fs.mkdirSync(DATA_DIR, { recursive: true });

  // Download and unzip all years
  for (const year of YEARS) {
    const zipFile = path.join(TEMP_DIR, `so-${year}.zip`);
    const cached = path.join("/tmp/so-survey", `so-${year}.zip`);

    // Use cached download if available
    if (fs.existsSync(cached) && fs.statSync(cached).size > 0) {
      console.log(`[seed] Using cached ${year} survey...`);
      fs.copyFileSync(cached, zipFile);
    } else {
      const url = `https://survey.stackoverflow.co/datasets/stack-overflow-developer-survey-${year}.zip`;
      process.stdout.write(`[seed] Downloading ${year}... `);
      await downloadFile(url, zipFile);
      const sizeMB = (fs.statSync(zipFile).size / 1024 / 1024).toFixed(1);
      console.log(`${sizeMB}MB`);
    }

    execSync(`unzip -o -q "${zipFile}" -d "${path.join(TEMP_DIR, String(year))}"`, { stdio: "pipe" });
  }

  console.log("[seed] Loading into DuckDB...");

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

  // -- 1. Load raw responses into per-year temp tables, then union into one --

  // Column name mapping across years
  const langUsedCol: Record<number, string> = {
    2019: "LanguageWorkedWith", 2020: "LanguageWorkedWith",
    2021: "LanguageHaveWorkedWith", 2022: "LanguageHaveWorkedWith",
    2023: "LanguageHaveWorkedWith", 2024: "LanguageHaveWorkedWith",
    2025: "LanguageHaveWorkedWith",
  };
  const langWantCol: Record<number, string> = {
    2019: "LanguageDesireNextYear", 2020: "LanguageDesireNextYear",
    2021: "LanguageWantToWorkWith", 2022: "LanguageWantToWorkWith",
    2023: "LanguageWantToWorkWith", 2024: "LanguageWantToWorkWith",
    2025: "LanguageWantToWorkWith",
  };

  // -- Build respondents table --
  const respondentSelects: string[] = [];
  for (const year of YEARS) {
    const csvPath = path.join(TEMP_DIR, String(year), "survey_results_public.csv");
    if (!fs.existsSync(csvPath)) {
      console.warn(`[seed] Missing CSV for ${year}, skipping`);
      continue;
    }

    const idCol = year <= 2020 ? "Respondent" : "ResponseId";
    const remoteCol = year >= 2022 ? "RemoteWork" : "NULL";
    const aiSelectCol = year >= 2023 ? "AISelect" : "NULL";
    const aiSentCol = year >= 2023 ? "AISent" : "NULL";

    respondentSelects.push(`
      SELECT
        ${year} as survey_year,
        "${idCol}"::VARCHAR as respondent_id,
        "${langUsedCol[year]}" as languages_used,
        "${langWantCol[year]}" as languages_wanted,
        DevType as dev_type,
        Country as country,
        EdLevel as ed_level,
        Age as age,
        YearsCode as years_code,
        CompTotal::VARCHAR as comp_total,
        ${remoteCol} as remote_work,
        ${aiSelectCol} as ai_select,
        ${aiSentCol} as ai_sentiment
      FROM read_csv_auto('${csvPath}', all_varchar=true, ignore_errors=true)
    `);
  }

  await run(`CREATE TABLE respondents AS ${respondentSelects.join("\nUNION ALL\n")}`);

  const respCount = await query("SELECT survey_year, COUNT(*) as cnt FROM respondents GROUP BY survey_year ORDER BY survey_year");
  console.log("\n[seed] Respondents by year:");
  for (const r of respCount) console.log(`  ${r.survey_year}: ${Number(r.cnt).toLocaleString()}`);

  // -- 2. Explode languages into a normalized table --
  await run(`
    CREATE TABLE language_usage AS
    SELECT
      survey_year,
      respondent_id,
      TRIM(lang.unnest) as language,
      'used' as relationship
    FROM respondents, LATERAL unnest(string_split(languages_used, ';')) as lang
    WHERE languages_used IS NOT NULL AND TRIM(lang.unnest) != ''
    UNION ALL
    SELECT
      survey_year,
      respondent_id,
      TRIM(lang.unnest) as language,
      'wanted' as relationship
    FROM respondents, LATERAL unnest(string_split(languages_wanted, ';')) as lang
    WHERE languages_wanted IS NOT NULL AND TRIM(lang.unnest) != ''
  `);

  // -- 3. Language trends summary table (pre-aggregated for fast queries) --
  await run(`
    CREATE TABLE language_trends AS
    WITH totals AS (
      SELECT survey_year as yr, COUNT(DISTINCT respondent_id) as cnt FROM respondents GROUP BY survey_year
    )
    SELECT
      lu.survey_year,
      lu.language,
      lu.relationship,
      COUNT(*) as resp_count,
      ROUND(COUNT(*) * 100.0 / t.cnt, 1) as pct_of_respondents
    FROM language_usage lu
    JOIN totals t ON lu.survey_year = t.yr
    GROUP BY lu.survey_year, lu.language, lu.relationship, t.cnt
    HAVING COUNT(*) >= 50
    ORDER BY lu.survey_year, lu.relationship, resp_count DESC
  `);

  // -- 4. Dev type trends --
  await run(`
    CREATE TABLE devtype_trends AS
    WITH exploded AS (
      SELECT survey_year, respondent_id, TRIM(dt.unnest) as dev_type
      FROM respondents, LATERAL unnest(string_split(dev_type, ';')) as dt
      WHERE dev_type IS NOT NULL AND TRIM(dt.unnest) != ''
    ),
    totals AS (
      SELECT survey_year as yr, COUNT(DISTINCT respondent_id) as cnt FROM respondents GROUP BY survey_year
    )
    SELECT
      e.survey_year,
      e.dev_type,
      COUNT(*) as resp_count,
      ROUND(COUNT(*) * 100.0 / t.cnt, 1) as pct
    FROM exploded e
    JOIN totals t ON e.survey_year = t.yr
    GROUP BY e.survey_year, e.dev_type, t.cnt
    HAVING COUNT(*) >= 50
    ORDER BY e.survey_year, resp_count DESC
  `);

  // -- 5. Remote work trends (2022+) --
  await run(`
    CREATE TABLE remote_trends AS
    SELECT
      survey_year,
      remote_work,
      COUNT(*) as resp_count,
      ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY survey_year), 1) as pct
    FROM respondents
    WHERE remote_work IS NOT NULL AND survey_year >= 2022
    GROUP BY survey_year, remote_work
    ORDER BY survey_year, resp_count DESC
  `);

  // -- 6. AI adoption trends (2023+) --
  await run(`
    CREATE TABLE ai_trends AS
    SELECT
      survey_year,
      ai_select as ai_usage,
      COUNT(*) as resp_count,
      ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY survey_year), 1) as pct
    FROM respondents
    WHERE ai_select IS NOT NULL AND survey_year >= 2023
    GROUP BY survey_year, ai_select
    ORDER BY survey_year, resp_count DESC
  `);

  // -- 7. Survey participation summary --
  await run(`
    CREATE TABLE participation AS
    SELECT
      survey_year,
      COUNT(*) as total_respondents,
      COUNT(DISTINCT country) as countries
    FROM respondents
    GROUP BY survey_year
    ORDER BY survey_year
  `);

  // Print summary
  const langCount = await query("SELECT COUNT(*) as cnt FROM language_trends") as { cnt: number }[];
  const devCount = await query("SELECT COUNT(*) as cnt FROM devtype_trends") as { cnt: number }[];
  console.log(`\n[seed] Created tables:`);
  console.log(`  respondents: ${(await query("SELECT COUNT(*) as cnt FROM respondents"))[0]?.cnt} rows`);
  console.log(`  language_usage: ${(await query("SELECT COUNT(*) as cnt FROM language_usage"))[0]?.cnt} rows`);
  console.log(`  language_trends: ${langCount[0]?.cnt} rows`);
  console.log(`  devtype_trends: ${devCount[0]?.cnt} rows`);
  console.log(`  remote_trends: ${(await query("SELECT COUNT(*) as cnt FROM remote_trends"))[0]?.cnt} rows`);
  console.log(`  ai_trends: ${(await query("SELECT COUNT(*) as cnt FROM ai_trends"))[0]?.cnt} rows`);
  console.log(`  participation: ${YEARS.length} rows`);

  // Top languages 2025
  const top2025 = await query(`
    SELECT language, pct_of_respondents as pct
    FROM language_trends
    WHERE survey_year = 2025 AND relationship = 'used'
    ORDER BY resp_count DESC LIMIT 10
  `);
  console.log("\n[seed] Top languages 2025 (% used):");
  for (const r of top2025) console.log(`  ${r.language}: ${r.pct}%`);

  db.close(() => {
    fs.rmSync(TEMP_DIR, { recursive: true });
    const sizeMB = (fs.statSync(DB_PATH).size / 1024 / 1024).toFixed(1);
    console.log(`\n[seed] Done! stackoverflow.db is ${sizeMB}MB`);
  });
}

main().catch((err) => {
  console.error("[seed] Fatal:", err);
  process.exit(1);
});
