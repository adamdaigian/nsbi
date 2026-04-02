import type { QueryEngine, QueryResult } from "./query-engine";
import type { SchemaMetadata, TableSchema, TableColumn } from "@/types/schema";
import * as duckdb from "@duckdb/duckdb-wasm";

interface DataManifest {
  files: { name: string; type: "db" | "csv" | "parquet" }[];
}

/** Escape a SQL identifier for safe use in double-quoted contexts */
function escapeIdent(name: string): string {
  return '"' + name.replace(/"/g, '""') + '"';
}

/** Escape a string literal for safe use in single-quoted SQL contexts */
function escapeLiteral(value: string): string {
  return "'" + value.replace(/'/g, "''") + "'";
}

/**
 * Production query engine — runs DuckDB WASM in the browser.
 * Loads data files from /_polaris_data/ based on a manifest.
 */
export class WasmQueryEngine implements QueryEngine {
  private db: duckdb.AsyncDuckDB | null = null;
  private conn: duckdb.AsyncDuckDBConnection | null = null;

  async init(): Promise<void> {
    // Select the best WASM bundle for this browser
    const DUCKDB_BUNDLES = await duckdb.selectBundle({
      mvp: {
        mainModule: new URL(
          "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm",
          import.meta.url,
        ).href,
        mainWorker: new URL(
          "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js",
          import.meta.url,
        ).href,
      },
      eh: {
        mainModule: new URL(
          "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm",
          import.meta.url,
        ).href,
        mainWorker: new URL(
          "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js",
          import.meta.url,
        ).href,
      },
    });

    const worker = new Worker(DUCKDB_BUNDLES.mainWorker!);
    const logger = new duckdb.ConsoleLogger();
    this.db = new duckdb.AsyncDuckDB(logger, worker);
    await this.db.instantiate(DUCKDB_BUNDLES.mainModule);
    this.conn = await this.db.connect();

    // Load data files from manifest
    await this.loadDataFiles();
  }

  private async loadDataFiles(): Promise<void> {
    try {
      const res = await fetch("/_polaris_data/manifest.json");
      if (!res.ok) return;
      const manifest = (await res.json()) as DataManifest;

      for (const file of manifest.files) {
        const fileUrl = `/_polaris_data/${file.name}`;
        const response = await fetch(fileUrl);
        if (!response.ok) continue;

        const buffer = new Uint8Array(await response.arrayBuffer());
        const tableName = file.name
          .replace(/\.[^.]+$/, "")
          .replace(/[^a-zA-Z0-9_]/g, "_");

        if (file.type === "db") {
          // Register the entire database file
          await this.db!.registerFileBuffer(file.name, buffer);
          await this.conn!.query(`ATTACH ${escapeLiteral(file.name)} AS attached_db`);
          // Copy tables from attached DB to main
          const tables = await this.conn!.query(
            "SELECT table_name FROM attached_db.information_schema.tables WHERE table_schema = 'main'",
          );
          for (const row of tables.toArray()) {
            const tbl = row.table_name as string;
            await this.conn!.query(
              `CREATE TABLE IF NOT EXISTS ${escapeIdent(tbl)} AS SELECT * FROM attached_db.${escapeIdent(tbl)}`,
            );
          }
          await this.conn!.query("DETACH attached_db");
        } else if (file.type === "csv") {
          await this.db!.registerFileBuffer(file.name, buffer);
          await this.conn!.query(
            `CREATE OR REPLACE TABLE ${escapeIdent(tableName)} AS SELECT * FROM read_csv_auto(${escapeLiteral(file.name)})`,
          );
        } else if (file.type === "parquet") {
          await this.db!.registerFileBuffer(file.name, buffer);
          await this.conn!.query(
            `CREATE OR REPLACE TABLE ${escapeIdent(tableName)} AS SELECT * FROM read_parquet(${escapeLiteral(file.name)})`,
          );
        }
      }
    } catch (err) {
      console.warn("[polaris] Failed to load data manifest:", err);
    }
  }

  async executeQuery(sql: string): Promise<QueryResult> {
    if (!this.conn) throw new Error("WASM DuckDB not initialized");

    const result = await this.conn.query(sql);
    const schema = result.schema;

    const columns = schema.fields.map((field) => ({
      name: field.name,
      type: field.type.toString(),
    }));

    const rows: Record<string, unknown>[] = [];
    for (const row of result.toArray()) {
      const converted: Record<string, unknown> = {};
      for (const col of columns) {
        const val = row[col.name];
        // Convert BigInt to Number (same as native DuckDB engine)
        converted[col.name] = typeof val === "bigint" ? Number(val) : val;
      }
      rows.push(converted);
    }

    return { rows, columns };
  }

  async getSchema(): Promise<SchemaMetadata> {
    if (!this.conn) throw new Error("WASM DuckDB not initialized");

    // Get all tables
    const tablesResult = await this.conn.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'main' ORDER BY table_name",
    );

    const tables: TableSchema[] = [];

    for (const row of tablesResult.toArray()) {
      const tableName = row.table_name as string;

      // Get columns
      const colsResult = await this.conn.query(
        `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'main' AND table_name = ${escapeLiteral(tableName)} ORDER BY ordinal_position`,
      );

      const columns: TableColumn[] = colsResult.toArray().map((col) => ({
        name: col.column_name as string,
        type: col.data_type as string,
        nullable: (col.is_nullable as string) === "YES",
      }));

      // Get row count
      let rowCount = 0;
      try {
        const countResult = await this.conn.query(
          `SELECT COUNT(*) as cnt FROM ${escapeIdent(tableName)}`,
        );
        const countRow = countResult.toArray()[0];
        if (countRow) {
          const val = countRow.cnt;
          rowCount = typeof val === "bigint" ? Number(val) : (val as number);
        }
      } catch {
        // ignore count errors
      }

      tables.push({ name: tableName, columns, rowCount, source: "wasm" });
    }

    return { tables, lastRefreshed: new Date().toISOString() };
  }

  async close(): Promise<void> {
    if (this.conn) {
      await this.conn.close();
      this.conn = null;
    }
    if (this.db) {
      await this.db.terminate();
      this.db = null;
    }
  }
}
