import { Router, type Request, type Response } from "express";
import { executeQuery } from "@/engine/duckdb";
import type { SchemaMetadata, TableSchema, TableColumn } from "@/types/schema";
import fs from "fs";
import path from "path";

export interface PageNode {
  name: string;
  path: string;
  children?: PageNode[];
}

import type { SemanticModel, SemanticQuery } from "@/semantic/types";
import { compile } from "@/semantic/compiler/index";
import { buildNsbiSystemPrompt } from "@/ai/prompts";
import { streamChatCompletion, type ChatMessage } from "@/ai/client";

export interface ApiRouterOptions {
  semanticModel?: SemanticModel | null;
  aiConfig?: { provider?: string; apiKey?: string; model?: string };
}

// Mutable reference so the file watcher can update it
let currentSemanticModel: SemanticModel | null = null;

export function getSemanticModel(): SemanticModel | null {
  return currentSemanticModel;
}

export function setSemanticModel(model: SemanticModel | null) {
  currentSemanticModel = model;
}

export function createApiRouter(pagesDir: string, options?: ApiRouterOptions): Router {
  const router = Router();

  // Initialize mutable semantic model reference
  if (options?.semanticModel) {
    currentSemanticModel = options.semanticModel;
  }

  /**
   * POST /api/query — Execute a SQL query via DuckDB.
   * Body: { sql: string, name?: string }
   * Returns: { rows, columns }
   */
  router.post("/api/query", async (req: Request, res: Response) => {
    try {
      const { sql } = req.body as { sql: string; name?: string };
      if (!sql) {
        res.status(400).json({ error: "Missing 'sql' in request body" });
        return;
      }
      const result = await executeQuery(sql);
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[nsbi] Query error:", message);
      res.status(500).json({ error: message });
    }
  });

  /**
   * GET /api/schema — Introspect DuckDB information_schema and return table metadata.
   */
  router.get("/api/schema", async (_req: Request, res: Response) => {
    try {
      const tablesResult = await executeQuery(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'main' ORDER BY table_name",
      );

      const tables: TableSchema[] = [];

      for (const row of tablesResult.rows) {
        const tableName = row.table_name as string;

        const colsResult = await executeQuery(
          `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'main' AND table_name = '${tableName}' ORDER BY ordinal_position`,
        );

        const columns: TableColumn[] = colsResult.rows.map((col) => ({
          name: col.column_name as string,
          type: col.data_type as string,
          nullable: (col.is_nullable as string) === "YES",
        }));

        let rowCount = 0;
        try {
          const countResult = await executeQuery(
            `SELECT COUNT(*) as cnt FROM "${tableName}"`,
          );
          if (countResult.rows[0]) {
            rowCount = Number(countResult.rows[0].cnt);
          }
        } catch {
          // ignore count errors
        }

        tables.push({ name: tableName, columns, rowCount, source: "duckdb" });
      }

      const schema: SchemaMetadata = {
        tables,
        lastRefreshed: new Date().toISOString(),
      };
      res.json(schema);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[nsbi] Schema introspection error:", message);
      res.status(500).json({ error: message });
    }
  });

  /**
   * POST /api/semantic-query — Compile a semantic query to SQL and execute it.
   */
  router.post("/api/semantic-query", async (req: Request, res: Response) => {
    try {
      const model = currentSemanticModel;
      if (!model) {
        res.status(400).json({ error: "No semantic model loaded. Create a models/ directory with YAML view files." });
        return;
      }

      const query = req.body as SemanticQuery;
      const compiled = compile(query, { model });
      const result = await executeQuery(compiled.sql);

      res.json({
        ...result,
        sql: compiled.sql,
        warnings: compiled.warnings,
        joinPath: compiled.joinPath,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[nsbi] Semantic query error:", message);
      res.status(500).json({ error: message });
    }
  });

  /**
   * GET /api/semantic-model — Return the current semantic model metadata.
   */
  router.get("/api/semantic-model", (_req: Request, res: Response) => {
    const model = currentSemanticModel;
    if (!model) {
      res.json({ views: [], relationships: [], topics: [] });
      return;
    }

    res.json({
      views: [...model.views.values()].map((v) => ({
        name: v.name,
        label: v.label,
        dimensions: v.dimensions.map((d) => ({ name: d.name, type: d.type, isTimeDimension: d.isTimeDimension })),
        measures: v.measures.map((m) => ({ name: m.name, aggregateType: m.aggregateType, format: m.format })),
      })),
      relationships: model.relationships.map((r) => ({
        name: r.name,
        from: r.fromViewId,
        to: r.toViewId,
        cardinality: r.cardinality,
      })),
      topics: [...model.topics.values()].map((t) => ({
        name: t.name,
        label: t.label,
        baseView: t.baseViewId,
        dimensions: [],
        measures: [],
      })),
    });
  });

  /**
   * GET /api/page — Read an MDX page file and return its raw content.
   * Query: ?path=index (defaults to "index")
   */
  router.get("/api/page", (req: Request, res: Response) => {
    try {
      const pagePath = (req.query.path as string) || "index";
      const filePath = path.resolve(pagesDir, `${pagePath}.mdx`);

      if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: `Page not found: ${pagePath}.mdx` });
        return;
      }

      const content = fs.readFileSync(filePath, "utf-8");
      res.json({ content });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[nsbi] Page read error:", message);
      res.status(500).json({ error: message });
    }
  });

  /**
   * POST /api/ai/generate — SSE endpoint for AI-assisted MDX generation.
   */
  router.post("/api/ai/generate", async (req: Request, res: Response) => {
    const apiKey = options?.aiConfig?.apiKey || process.env.NSBI_AI_API_KEY;
    if (!apiKey) {
      res.status(400).json({ error: "No AI API key configured. Set NSBI_AI_API_KEY or ai.apiKey in config." });
      return;
    }

    try {
      const { messages } = req.body as { messages: ChatMessage[] };

      // Build schema context for the prompt
      let schemaContext;
      try {
        const schemaResult = await executeQuery(
          "SELECT table_name FROM information_schema.tables WHERE table_schema = 'main' ORDER BY table_name",
        );
        const tables = [];
        for (const row of schemaResult.rows) {
          const tableName = row.table_name as string;
          const colsResult = await executeQuery(
            `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'main' AND table_name = '${tableName}' ORDER BY ordinal_position`,
          );
          const countResult = await executeQuery(`SELECT COUNT(*) as cnt FROM "${tableName}"`);
          tables.push({
            name: tableName,
            columns: colsResult.rows.map((c) => ({
              name: c.column_name as string,
              type: c.data_type as string,
              nullable: true,
            })),
            rowCount: Number(countResult.rows[0]?.cnt ?? 0),
            source: "duckdb",
          });
        }
        schemaContext = { tables, lastRefreshed: new Date().toISOString() };
      } catch {
        schemaContext = undefined;
      }

      // Build topics context
      const model = currentSemanticModel;
      const topics = model
        ? [...model.topics.values()].map((t) => {
            const baseView = [...model.views.values()].find((v) => v.id === t.baseViewId);
            return {
              name: t.name,
              label: t.label,
              dimensions: baseView?.dimensions.map((d) => d.name) ?? [],
              measures: baseView?.measures.map((m) => m.name) ?? [],
            };
          })
        : undefined;

      const systemPrompt = buildNsbiSystemPrompt({ schema: schemaContext, topics });

      // Set SSE headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      const config = {
        provider: options?.aiConfig?.provider || "anthropic",
        apiKey,
        model: options?.aiConfig?.model || "claude-sonnet-4-20250514",
      };

      for await (const text of streamChatCompletion(config, systemPrompt, messages)) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[nsbi] AI generation error:", message);
      // If headers not sent yet, send JSON error
      if (!res.headersSent) {
        res.status(500).json({ error: message });
      } else {
        res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
        res.end();
      }
    }
  });

  /**
   * GET /api/pages — Return the page tree (recursive scan of pages directory).
   */
  router.get("/api/pages", (_req: Request, res: Response) => {
    try {
      const pages = scanPages(pagesDir, pagesDir);
      res.json({ pages });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[nsbi] Pages scan error:", message);
      res.status(500).json({ error: message });
    }
  });

  return router;
}

/**
 * Recursively scan a directory for .mdx files and build a page tree.
 */
function scanPages(dir: string, rootDir: string): PageNode[] {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const nodes: PageNode[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name.startsWith("_")) continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const children = scanPages(fullPath, rootDir);
      if (children.length > 0) {
        nodes.push({
          name: entry.name,
          path: path.relative(rootDir, fullPath).replace(/\\/g, "/"),
          children,
        });
      }
    } else if (entry.name.endsWith(".mdx")) {
      const relativePath = path
        .relative(rootDir, fullPath)
        .replace(/\.mdx$/, "")
        .replace(/\\/g, "/");
      const name = path.basename(entry.name, ".mdx");
      nodes.push({ name, path: relativePath });
    }
  }

  // Sort: directories first, then alphabetical
  nodes.sort((a, b) => {
    const aIsDir = !!a.children;
    const bIsDir = !!b.children;
    if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return nodes;
}
