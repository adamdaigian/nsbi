/**
 * QueryEngine interface — abstracts where SQL queries execute.
 * Dev mode: server fetch. Production: DuckDB WASM in the browser.
 */
export interface QueryResult {
  rows: Record<string, unknown>[];
  columns: { name: string; type: string }[];
}

export interface QueryEngine {
  executeQuery(sql: string): Promise<QueryResult>;
  init?(): Promise<void>;
  close?(): Promise<void>;
}
