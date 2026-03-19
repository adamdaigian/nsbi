import type { QueryEngine, QueryResult } from "./query-engine";

/**
 * Dev mode query engine — wraps existing fetch("/api/query") calls.
 */
export class ServerQueryEngine implements QueryEngine {
  async executeQuery(sql: string): Promise<QueryResult> {
    const res = await fetch("/api/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sql }),
    });

    if (!res.ok) {
      const errBody = (await res.json()) as { error: string };
      throw new Error(errBody.error);
    }

    const data = (await res.json()) as QueryResult;
    return data;
  }
}
