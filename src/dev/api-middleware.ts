import { Router, type Request, type Response } from "express";
import { executeQuery } from "@/engine/duckdb";
import fs from "fs";
import path from "path";

export interface PageNode {
  name: string;
  path: string;
  children?: PageNode[];
}

export function createApiRouter(pagesDir: string): Router {
  const router = Router();

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
