import type { QueryEngine, QueryResult } from "./query-engine";
import { WasmQueryEngine } from "./wasm-engine";

/**
 * Lazy wrapper that defers WASM initialization until the first query.
 * Pages with only pre-rendered data never pay the WASM init cost.
 */
export class LazyWasmEngine implements QueryEngine {
  private engine: WasmQueryEngine | null = null;
  private initPromise: Promise<void> | null = null;

  private async ensureInit(): Promise<WasmQueryEngine> {
    if (this.engine) return this.engine;

    if (!this.initPromise) {
      this.engine = new WasmQueryEngine();
      this.initPromise = this.engine.init();
    }

    await this.initPromise;
    return this.engine!;
  }

  async executeQuery(sql: string): Promise<QueryResult> {
    const engine = await this.ensureInit();
    return engine.executeQuery(sql);
  }

  async init(): Promise<void> {
    await this.ensureInit();
  }

  async close(): Promise<void> {
    if (this.engine) {
      await this.engine.close();
      this.engine = null;
      this.initPromise = null;
    }
  }
}
