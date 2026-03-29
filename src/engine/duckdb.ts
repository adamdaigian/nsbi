import duckdb from "duckdb";
import fs from "fs";
import path from "path";

/** Escape a SQL identifier for safe use in double-quoted contexts */
function escapeIdent(name: string): string {
  return '"' + name.replace(/"/g, '""') + '"';
}

/** Escape a string literal for safe use in single-quoted SQL contexts */
function escapeLiteral(value: string): string {
  return "'" + value.replace(/'/g, "''") + "'";
}

let db: duckdb.Database | null = null;
let conn: duckdb.Connection | null = null;

/** Helper to open a DuckDB database and wait for it to be ready. */
function openDatabase(dbPath: string): Promise<duckdb.Database> {
  return new Promise((resolve, reject) => {
    const instance = new duckdb.Database(dbPath, (err: Error | null) => {
      if (err) return reject(err);
      resolve(instance);
    });
  });
}

/**
 * Initialize DuckDB.
 * - If a .db file exists in data/, opens it directly (tables already inside).
 * - Also auto-registers any CSV/Parquet files as additional tables.
 */
export async function initDuckDB(dataDir: string): Promise<void> {
  if (!fs.existsSync(dataDir)) {
    console.warn(`[nsbi] Data directory not found: ${dataDir}`);
    db = await openDatabase(":memory:");
    conn = new duckdb.Connection(db);
    return;
  }

  const files = fs.readdirSync(dataDir);

  // Check for a .db file — use the first one found as the database
  const dbFile = files.find((f) => path.extname(f).toLowerCase() === ".db");
  if (dbFile) {
    const dbPath = path.resolve(dataDir, dbFile);
    db = await openDatabase(dbPath);
    conn = new duckdb.Connection(db);

    // List tables already in the .db file
    const tables = await queryRows("SELECT table_name FROM information_schema.tables WHERE table_schema = 'main'");
    const tableNames = tables.map((r) => r.table_name as string);
    console.log(`[nsbi] Opened ${dbFile} (tables: ${tableNames.join(", ")})`);
  } else {
    db = await openDatabase(":memory:");
    conn = new duckdb.Connection(db);
  }

  // Also register any CSV/Parquet files as tables
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const tableName = path.basename(file, ext).replace(/[^a-zA-Z0-9_]/g, "_");
    const filePath = path.resolve(dataDir, file);

    if (ext === ".csv") {
      await runQuery(
        `CREATE OR REPLACE TABLE ${escapeIdent(tableName)} AS SELECT * FROM read_csv_auto(${escapeLiteral(filePath)})`,
      );
      console.log(`[nsbi] Registered table "${tableName}" from ${file}`);
    } else if (ext === ".parquet") {
      await runQuery(
        `CREATE OR REPLACE TABLE ${escapeIdent(tableName)} AS SELECT * FROM read_parquet(${escapeLiteral(filePath)})`,
      );
      console.log(`[nsbi] Registered table "${tableName}" from ${file}`);
    }
  }
}

/** Internal helper to query rows (used during init). */
function queryRows(sql: string): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    conn!.all(sql, (err: Error | null, result: Record<string, unknown>[]) => {
      if (err) return reject(err);
      resolve(result ?? []);
    });
  });
}

/**
 * Execute a SQL query and return rows + column metadata.
 */
export async function executeQuery(
  sql: string,
): Promise<{ rows: Record<string, unknown>[]; columns: { name: string; type: string }[] }> {
  if (!conn) throw new Error("DuckDB not initialized. Call initDuckDB() first.");

  return new Promise((resolve, reject) => {
    conn!.all(sql, (err: Error | null, result: Record<string, unknown>[]) => {
      if (err) return reject(err);

      // Convert BigInt values to Number (DuckDB returns BigInt for integer types)
      const rows = (result ?? []).map((row) => {
        const converted: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(row)) {
          converted[key] = typeof val === "bigint" ? Number(val) : val;
        }
        return converted;
      });

      const columns: { name: string; type: string }[] =
        rows.length > 0
          ? Object.keys(rows[0]!).map((name) => ({
              name,
              type: typeof rows[0]![name] === "number" ? "NUMBER" : "VARCHAR",
            }))
          : [];

      resolve({ rows, columns });
    });
  });
}

/**
 * Close the DuckDB connection and database.
 */
export async function closeDuckDB(): Promise<void> {
  return new Promise((resolve) => {
    if (db) {
      db.close(() => {
        db = null;
        conn = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

/**
 * Re-register a single CSV/Parquet file as a DuckDB table.
 * Used by HMR when a data file changes on disk.
 */
export async function reRegisterTable(filePath: string): Promise<void> {
  const ext = path.extname(filePath).toLowerCase();
  const tableName = path.basename(filePath, ext).replace(/[^a-zA-Z0-9_]/g, "_");
  const resolved = path.resolve(filePath);

  if (ext === ".csv") {
    await runQuery(`DROP TABLE IF EXISTS ${escapeIdent(tableName)}`);
    await runQuery(
      `CREATE TABLE ${escapeIdent(tableName)} AS SELECT * FROM read_csv_auto(${escapeLiteral(resolved)})`,
    );
    console.log(`[nsbi] Re-registered table "${tableName}" from ${path.basename(filePath)}`);
  } else if (ext === ".parquet") {
    await runQuery(`DROP TABLE IF EXISTS ${escapeIdent(tableName)}`);
    await runQuery(
      `CREATE TABLE ${escapeIdent(tableName)} AS SELECT * FROM read_parquet(${escapeLiteral(resolved)})`,
    );
    console.log(`[nsbi] Re-registered table "${tableName}" from ${path.basename(filePath)}`);
  }
}

/** Internal helper to run a query without returning results. */
function runQuery(sql: string): Promise<void> {
  return new Promise((resolve, reject) => {
    conn!.run(sql, (err: Error | null) => {
      if (err) return reject(err);
      resolve();
    });
  });
}
