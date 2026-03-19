import { z } from "zod";

// ─── Document Frontmatter ────────────────────────────────────────────────────

export const documentFrontmatterSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  refreshSchedule: z.string().optional(),
});

export type DocumentFrontmatter = z.infer<typeof documentFrontmatterSchema>;

// ─── Query Blocks ────────────────────────────────────────────────────────────

export const sqlQueryBlockSchema = z.object({
  name: z.string(),
  type: z.literal("sql"),
  sql: z.string(),
  filterVariables: z.array(z.string()).optional(),
});

export type SQLQueryBlock = z.infer<typeof sqlQueryBlockSchema>;

// ─── Parsed Document ─────────────────────────────────────────────────────────

export interface ParsedDocument {
  frontmatter: DocumentFrontmatter;
  queries: SQLQueryBlock[];
  content: string; // MDX content with frontmatter and query blocks stripped
  errors: DocumentParseError[];
}

export interface DocumentParseError {
  type: "frontmatter" | "query" | "content";
  message: string;
  line?: number;
}

// ─── Chart Types ─────────────────────────────────────────────────────────────

export type FormatString =
  | "usd0"
  | "usd2"
  | "pct"
  | "pct0"
  | "num0"
  | "num2"
  | "date"
  | "datetime"
  | "string";

// ─── Query Result ────────────────────────────────────────────────────────────

export interface QueryResult {
  rows: Record<string, unknown>[];
  columns: { name: string; type: string }[];
  loading: boolean;
  error: string | null;
}
