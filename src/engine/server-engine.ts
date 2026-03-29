import type { QueryEngine, QueryResult } from "./query-engine";
import type { SchemaMetadata } from "@/types/schema";

const QUERY_TIMEOUT_MS = 30_000;

/**
 * Dev mode query engine — wraps existing fetch("/api/query") calls.
 */
export class ServerQueryEngine implements QueryEngine {
  async executeQuery(sql: string): Promise<QueryResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errBody = (await res.json()) as { error: string };
        throw new Error(errBody.error);
      }

      return (await res.json()) as QueryResult;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error("Query timed out after 30 seconds");
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  async getSchema(): Promise<SchemaMetadata> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);

    try {
      const res = await fetch("/api/schema", {
        signal: controller.signal,
      });

      if (!res.ok) {
        const errBody = (await res.json()) as { error: string };
        throw new Error(errBody.error);
      }

      return (await res.json()) as SchemaMetadata;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error("Schema request timed out after 30 seconds");
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}
